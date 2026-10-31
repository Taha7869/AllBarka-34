import { Router, type RequestHandler } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import type { InquiryRecord, InquiryStatus, InquiryType, Product } from '../types';
import { PRODUCTS } from '../data/products';
import type { HamperBox } from './hamperCatalog';
import { loadAuthoritativeCatalog, mergeAuthoritativeCatalog } from './catalogStore';
import { normalizeNetFillingGrams, isValidNetFillingGrams } from './filledGiftPricing';
import {
  isValidPhone,
  isValidQuantity,
  isValidBudget,
  sanitizePublicInquiryInput,
  resolveInquiryProductVariant,
  computeInquiryPayloadHash,
  generateInquiryReferenceId,
  buildAdminWhatsAppPitchUrl,
  persistInquiryAtomically,
  updateAdminInquiryAtomically,
  IdempotencyConflictError,
  PersistenceUnavailableError,
  VALID_INQUIRY_STATUSES,
  VALID_INQUIRY_TYPES,
} from './inquiryService';
import { buildCustomerInquiryWhatsAppUrl } from './inquiryWhatsApp';

export interface InquiriesRouterOptions {
  getDb: () => Firestore | null;
  getCatalog?: () => Product[] | Promise<Product[]>;
  getHamperBoxes?: () => HamperBox[] | Promise<HamperBox[]>;
  getSnapshot?: () => Promise<{ products: Product[]; hamperBoxes: HamperBox[] }>;
  requireAdmin?: RequestHandler;
  inMemoryStore?: Map<string, InquiryRecord>;
  inquiryLimiter?: RequestHandler;
}

export function createInquiriesRouter(options: InquiriesRouterOptions) {
  const router = Router();
  const inMemory = options.inMemoryStore || new Map<string, InquiryRecord>();
  const adminGuard = options.requireAdmin || ((_req, _res, next) => next());
  const limiter = options.inquiryLimiter || ((_req, _res, next) => next());

  // Asynchronous authoritative catalog and hamper box resolver
  // Never falls back to compiled selling prices or default hamper boxes if authoritative resolution fails
  const resolveCatalogAndBoxes = async (): Promise<{ catalog: Product[]; hamperBoxes: HamperBox[] }> => {
    if (options.getSnapshot) {
      const snap = await options.getSnapshot();
      return {
        catalog: snap.products,
        hamperBoxes: snap.hamperBoxes,
      };
    }
    const db = options.getDb();
    if (db) {
      const snapshot = await loadAuthoritativeCatalog(db, { fresh: true });
      const catalog = options.getCatalog
        ? await options.getCatalog()
        : mergeAuthoritativeCatalog(PRODUCTS, snapshot.products);
      const hamperBoxes = options.getHamperBoxes
        ? await options.getHamperBoxes()
        : snapshot.hamperBoxes;
      return { catalog, hamperBoxes };
    }
    if (options.getCatalog) {
      const catalog = await options.getCatalog();
      const hamperBoxes = options.getHamperBoxes
        ? await options.getHamperBoxes()
        : [];
      return { catalog, hamperBoxes };
    }
    throw new Error('CATALOG_STORE_UNAVAILABLE');
  };

  // Retain resolveCatalog for backward compatibility if needed internally
  const resolveCatalog = async (): Promise<Product[]> => (await resolveCatalogAndBoxes()).catalog;

  // 1. Boutique / Contact API
  router.post('/api/contact', limiter, async (req, res) => {
    try {
      const db = options.getDb();
      if (!db) {
        return res.status(503).json({
          ok: false,
          success: false,
          error: 'PERSISTENCE_UNAVAILABLE',
          code: 'PERSISTENCE_UNAVAILABLE',
          message: 'Inquiry storage is temporarily unavailable. Your inquiry has not been registered.',
        });
      }

      const raw = sanitizePublicInquiryInput(req.body || {});
      const name = String(raw.customerName ?? raw.name ?? '').trim();
      const contact = String(raw.contact ?? raw.customerPhone ?? raw.phone ?? raw.email ?? '').trim();
      const message = String(raw.notes ?? raw.message ?? raw.customPrintText ?? raw.customPrinting ?? '').trim();
      const topic = String(raw.topic ?? raw.eventType ?? raw.occasion ?? 'general').trim();

      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ error: 'Please provide your full name (at least 2 characters).', code: 'MISSING_NAME' });
      }
      if (!contact || contact.length > 200) {
        return res.status(400).json({ error: 'Please provide a contact phone number or email address.', code: 'MISSING_CONTACT' });
      }
      if (message.length < 5 || message.length > 4000) {
        return res.status(400).json({ error: 'Please enter your message (at least 5 characters).', code: 'MESSAGE_TOO_SHORT' });
      }

      const type: InquiryType = topic === 'wholesale' ? 'wholesale' : topic === 'wedding-favors' ? 'bid_box_quote' : 'general';
      const isEmail = contact.includes('@');
      const phone = !isEmail && isValidPhone(contact) ? contact : '';
      const email = isEmail ? contact : '';

      const ticketId = generateInquiryReferenceId(type);
      const record: InquiryRecord = {
        id: ticketId,
        ticketId,
        quoteId: ticketId,
        type,
        customerName: name,
        phone,
        email,
        city: String(raw.city ?? raw.deliveryCity ?? 'Lahore').trim().slice(0, 80),
        productId: topic,
        productName: topic === 'wholesale' ? 'Wholesale & Bulk Inquiry (10kg+)' : `Concierge Inquiry (${topic})`,
        packagingVariant: null,
        boxMode: 'filled',
        quantity: 1,
        quantityUnit: 'pieces',
        piecesPerPack: 1,
        eventType: topic,
        targetEventDate: null,
        budgetType: null,
        preferredFillings: [],
        customFillingsNotes: '',
        monogramText: '',
        cardMessage: '',
        customPrintText: '',
        standardPrice: null,
        packPrice: null,
        perPiecePrice: null,
        offeredPrice: null,
        finalAgreedPrice: null,
        notes: message,
        adminNotes: '',
        status: 'NEW',
        whatsappUrl: `https://wa.me/923160666083?text=${encodeURIComponent(`Assalam-o-Alaikum AllBarka! Inquiry Ref #${ticketId} — ${name}`)}`,
        whatsappReplyUrl: '',
        assignedTo: null,
        followUpDate: null,
        leadTimeNoticeAcknowledged: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      record.whatsappReplyUrl = buildAdminWhatsAppPitchUrl(record);

      await persistInquiryAtomically(db, record);
      inMemory.set(record.id, record);

      return res.json({
        ok: true,
        success: true,
        ticketId,
        id: ticketId,
        inquiry: record,
        message: 'Inquiry received. Our boutique concierge will review your message.',
      });
    } catch (err: any) {
      if (err instanceof PersistenceUnavailableError) {
        return res.status(503).json({ ok: false, success: false, error: err.code, code: err.code, message: err.message });
      }
      return res.status(500).json({ ok: false, success: false, error: err.message || 'Failed to submit inquiry.', code: 'SERVER_ERROR' });
    }
  });

  // 2. Unified Public Inquiries Endpoint
  router.post('/api/inquiries', limiter, async (req, res) => {
    try {
      const db = options.getDb();
      if (!db) {
        return res.status(503).json({
          ok: false,
          success: false,
          error: 'PERSISTENCE_UNAVAILABLE',
          code: 'PERSISTENCE_UNAVAILABLE',
          message: 'Inquiry storage is temporarily unavailable. Your inquiry has not been registered.',
        });
      }

      // Normalize all aliases once
      const body = sanitizePublicInquiryInput(req.body || {});
      const customerName = String(body.customerName ?? body.name ?? '').trim();
      const phone = String(body.phone ?? body.customerPhone ?? body.contact ?? '').trim();
      const email = String(body.email ?? (phone.includes('@') ? phone : '') ?? '').trim();
      const rawQuantity = body.quantity ?? body.estimatedQuantity;
      const customPrintText = String(body.customPrintText ?? body.customPrinting ?? '').trim();
      const requestedVariant = body.packagingVariant ?? body.variantLabel ?? body.portion ?? null;
      const city = String(body.city ?? body.deliveryCity ?? 'Lahore').trim();
      const rawEventType = String(body.eventType ?? body.occasion ?? body.topic ?? 'General').trim();
      const budgetVal = body.targetPricePkr ?? body.offeredPrice ?? body.customerOfferedRate ?? null;
      const notes = String(body.notes ?? body.message ?? body.customHamperNotes ?? '').trim();
      const submissionKey = String(req.headers['idempotency-key'] ?? body.submissionKey ?? body.idempotencyKey ?? '').trim() || undefined;

      if (customerName.length < 2 || customerName.length > 100) {
        return res.status(400).json({ error: 'Please provide your name (at least 2 characters).', code: 'MISSING_NAME' });
      }

      const isEmailOnly = Boolean(email && !phone);
      if (!isEmailOnly && !isValidPhone(phone)) {
        return res.status(400).json({ error: 'Please provide a valid phone number (at least 10 digits).', code: 'MISSING_PHONE' });
      }

      if (!isValidQuantity(rawQuantity)) {
        return res.status(400).json({ error: 'Quantity must be a positive integer between 1 and 50,000.', code: 'INVALID_QUANTITY' });
      }

      if (budgetVal != null && !isValidBudget(budgetVal)) {
        return res.status(400).json({ error: 'Target budget must be a positive number.', code: 'INVALID_BUDGET' });
      }

      const rawNetFilling = body.netFillingGrams ?? body.netWeightGrams ?? body.fillingWeightGrams ?? body.netWeight;
      let netFillingGrams: number | null = null;
      if (rawNetFilling !== undefined && rawNetFilling !== null && rawNetFilling !== '') {
        const normalized = normalizeNetFillingGrams(rawNetFilling);
        if (normalized === null || !isValidNetFillingGrams(normalized)) {
          return res.status(400).json({ error: 'Please provide a valid net filling weight per box (e.g. 250g, 500g, 1kg or custom weight).', code: 'INVALID_NET_FILLING_WEIGHT' });
        }
        netFillingGrams = normalized;
      }

      if (body.hamperConfiguration?.netFillingGrams !== undefined && body.hamperConfiguration.netFillingGrams !== null && body.hamperConfiguration.netFillingGrams !== '') {
        const normalized = normalizeNetFillingGrams(body.hamperConfiguration.netFillingGrams);
        if (normalized === null || !isValidNetFillingGrams(normalized)) {
          return res.status(400).json({ error: 'Please provide a valid net filling weight per box (e.g. 250g, 500g, 1kg or custom weight).', code: 'INVALID_NET_FILLING_WEIGHT' });
        }
        body.hamperConfiguration.netFillingGrams = normalized;
        if (netFillingGrams === null) {
          netFillingGrams = normalized;
        }
      }

      const rawType = String(body.type || 'general');
      const type: InquiryType = VALID_INQUIRY_TYPES.includes(rawType as InquiryType) ? (rawType as InquiryType) : 'general';

      const rawMode = String(body.boxMode ?? body.mode ?? '').toLowerCase();
      const boxMode: 'empty' | 'filled' | 'custom' =
        rawMode === 'empty' ? 'empty' : rawMode === 'custom' ? 'custom' : 'filled';

      let catalog: Product[];
      let hamperBoxes: HamperBox[];
      try {
        const resolved = await resolveCatalogAndBoxes();
        catalog = resolved.catalog;
        hamperBoxes = resolved.hamperBoxes;
      } catch (catErr: any) {
        console.warn('Authoritative catalog resolution error:', catErr);
        return res.status(503).json({
          ok: false,
          success: false,
          error: 'CATALOG_UNAVAILABLE',
          code: 'CATALOG_UNAVAILABLE',
          message: 'Authoritative catalog pricing is temporarily unavailable. Please retry shortly or message our concierge on WhatsApp.',
        });
      }

      const productId = String(body.productId ?? body.boxId ?? (type === 'custom_hamper' ? 'custom-hamper' : 'general')).trim();
      const resolution = resolveInquiryProductVariant({
        catalog,
        hamperBoxes,
        productId,
        requestedVariantLabel: requestedVariant,
        boxMode,
        quantity: rawQuantity,
        hamperConfiguration: body.hamperConfiguration,
        netFillingGrams,
      });

      const effectiveNetFilling = resolution.netFillingGrams ?? netFillingGrams;
      const offPrice = budgetVal != null ? Number(budgetVal) : null;
      const eventType = rawEventType || (type === 'bid_box_quote' ? 'Nikkah' : 'General');

      const payloadHash = submissionKey
        ? computeInquiryPayloadHash({
            customerName,
            phone,
            city,
            productId,
            packagingVariant: resolution.packagingVariant,
            boxMode,
            quantity: rawQuantity,
            eventType,
            targetEventDate: body.targetEventDate ? String(body.targetEventDate).slice(0, 30) : null,
            preferredFillings: Array.isArray(body.preferredFillings) ? body.preferredFillings : [],
            customFillingsNotes: body.customFillingsNotes || '',
            monogramText: body.monogramText || '',
            cardMessage: body.cardMessage || '',
            customPrintText,
            budgetType: body.budgetType || null,
            targetPricePkr: offPrice,
            leadTimeNoticeAcknowledged: Boolean(body.leadTimeNoticeAcknowledged),
            netFillingGrams: effectiveNetFilling,
          })
        : undefined;

      const id = generateInquiryReferenceId(type);
      const whatsappUrl = buildCustomerInquiryWhatsAppUrl({
        quoteId: id,
        productName: resolution.productName,
        productId,
        packagingVariant: resolution.packagingVariant,
        mode: boxMode,
        quantity: rawQuantity,
        quantityUnit: resolution.quantityUnit,
        piecesPerPack: resolution.piecesPerPack,
        eventType: eventType.slice(0, 80),
        targetEventDate: body.targetEventDate ? String(body.targetEventDate).slice(0, 30) : null,
        preferredFillings: Array.isArray(body.preferredFillings) ? body.preferredFillings : [],
        customFillingsNotes: body.customFillingsNotes ? String(body.customFillingsNotes).slice(0, 500) : '',
        monogramText: body.monogramText ? String(body.monogramText).slice(0, 200) : '',
        cardMessage: body.cardMessage ? String(body.cardMessage).slice(0, 500) : '',
        customPrintText,
        budgetType: body.budgetType === 'per_piece' || body.budgetType === 'total' ? body.budgetType : null,
        targetPricePkr: offPrice,
        referenceUnitPrice: resolution.standardPrice,
        perPiecePrice: resolution.perPiecePrice,
        estimatedTotalPkr: resolution.estimatedTotalPkr ?? (resolution.standardPrice != null ? resolution.standardPrice * rawQuantity : null),
        requiresTeamQuote: resolution.requiresTeamQuote,
        belowMoq: resolution.belowMoq,
        moqRequired: resolution.moqRequired,
        leadTimeNoticeAcknowledged: Boolean(body.leadTimeNoticeAcknowledged),
        customerName: customerName.slice(0, 100),
        customerPhone: isEmailOnly ? '' : phone.slice(0, 40),
        city: city.slice(0, 80),
        isTabarruk: resolution.isTabarruk,
        hamperConfiguration: resolution.hamperConfiguration || body.hamperConfiguration,
        netFillingGrams: effectiveNetFilling,
      });

      const record: InquiryRecord = {
        id,
        ticketId: id,
        quoteId: id,
        type,
        customerName: customerName.slice(0, 100),
        phone: isEmailOnly ? '' : phone.slice(0, 40),
        email: email.slice(0, 120),
        city: city.slice(0, 80),
        productId,
        productName: resolution.productName,
        packagingVariant: resolution.packagingVariant,
        boxMode,
        quantity: rawQuantity,
        quantityUnit: resolution.quantityUnit,
        piecesPerPack: resolution.piecesPerPack,
        eventType: eventType.slice(0, 80),
        targetEventDate: body.targetEventDate ? String(body.targetEventDate).trim().slice(0, 30) : null,
        budgetType: body.budgetType === 'per_piece' || body.budgetType === 'total' ? body.budgetType : null,
        preferredFillings: Array.isArray(body.preferredFillings) ? body.preferredFillings.slice(0, 10) : [],
        customFillingsNotes: body.customFillingsNotes ? String(body.customFillingsNotes).trim().slice(0, 500) : '',
        monogramText: body.monogramText ? String(body.monogramText).trim().slice(0, 200) : '',
        cardMessage: body.cardMessage ? String(body.cardMessage).trim().slice(0, 500) : '',
        customPrintText,
        standardPrice: resolution.standardPrice,
        estimatedTotalPkr: resolution.estimatedTotalPkr ?? (resolution.standardPrice != null ? resolution.standardPrice * rawQuantity : null),
        packPrice: resolution.packPrice,
        perPiecePrice: resolution.perPiecePrice,
        requiresTeamQuote: resolution.requiresTeamQuote,
        unresolvedVariant: resolution.unresolvedVariant,
        belowMoq: resolution.belowMoq,
        moqRequired: resolution.moqRequired,
        minPacksRequired: resolution.minPacksRequired,
        isVerifiedCatalogProduct: resolution.isVerifiedCatalogProduct,
        submissionKey: submissionKey || null,
        offeredPrice: offPrice,
        finalAgreedPrice: null,
        notes: (notes || customPrintText).slice(0, 1000),
        adminNotes: '',
        status: 'NEW',
        whatsappUrl,
        whatsappReplyUrl: '',
        assignedTo: null,
        followUpDate: null,
        leadTimeNoticeAcknowledged: Boolean(body.leadTimeNoticeAcknowledged),
        hamperConfiguration: resolution.hamperConfiguration || undefined,
        netFillingGrams: effectiveNetFilling,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      record.whatsappReplyUrl = buildAdminWhatsAppPitchUrl(record);

      const result = await persistInquiryAtomically(db, record, submissionKey, payloadHash);
      inMemory.set(result.inquiry.id, result.inquiry);

      return res.json({
        ok: true,
        success: true,
        id: result.inquiry.id,
        ticketId: result.inquiry.id,
        quoteId: result.inquiry.id,
        inquiry: result.inquiry,
        whatsappUrl: result.inquiry.whatsappUrl,
        message: 'Your inquiry has been logged with the AllBarka Concierge.',
      });
    } catch (err: any) {
      if (err instanceof IdempotencyConflictError) {
        return res.status(err.httpStatus).json({ ok: false, success: false, error: err.code, code: err.code, message: err.message });
      }
      if (err instanceof PersistenceUnavailableError) {
        return res.status(err.httpStatus).json({ ok: false, success: false, error: err.code, code: err.code, message: err.message });
      }
      console.error('Inquiries persistence error:', err);
      return res.status(503).json({
        ok: false,
        success: false,
        error: 'INQUIRY_PERSISTENCE_FAILED',
        code: 'INQUIRY_PERSISTENCE_FAILED',
        message: 'Failed to record inquiry in persistent store. Please retry or message our concierge on WhatsApp.',
      });
    }
  });

  // 3. Custom Quote / Bargain Concierge API
  router.post('/api/quotes', limiter, async (req, res) => {
    try {
      const db = options.getDb();
      if (!db) {
        return res.status(503).json({
          ok: false,
          success: false,
          error: 'PERSISTENCE_UNAVAILABLE',
          code: 'PERSISTENCE_UNAVAILABLE',
          message: 'Inquiry storage is temporarily unavailable. Your inquiry has not been registered.',
        });
      }

      // Normalize all aliases once
      const raw = sanitizePublicInquiryInput(req.body || {});
      const resolvedName = String(raw.customerName ?? raw.name ?? '').trim();
      const resolvedPhone = String(raw.phone ?? raw.customerPhone ?? raw.contact ?? '').trim();
      const email = String(raw.email ?? (resolvedPhone.includes('@') ? resolvedPhone : '') ?? '').trim();
      const rawQuantity = raw.quantity ?? raw.estimatedQuantity;
      const customPrintText = String(raw.customPrintText ?? raw.customPrinting ?? '').trim();
      const requestedVariant = raw.packagingVariant ?? raw.variantLabel ?? raw.portion ?? null;
      const city = String(raw.city ?? raw.deliveryCity ?? 'Lahore').trim();
      const rawEventType = String(raw.eventType ?? raw.occasion ?? raw.topic ?? 'Nikkah').trim();
      const budgetVal = raw.targetPricePkr ?? raw.offeredPrice ?? raw.customerOfferedRate ?? null;
      const notes = String(raw.notes ?? raw.message ?? raw.customHamperNotes ?? '').trim();
      const submissionKey = String(req.headers['idempotency-key'] ?? raw.submissionKey ?? raw.idempotencyKey ?? '').trim() || undefined;

      if (resolvedName.length < 2 || resolvedName.length > 100) {
        return res.status(400).json({ error: 'Please provide your name (at least 2 characters).', code: 'MISSING_NAME' });
      }
      if (!isValidPhone(resolvedPhone)) {
        return res.status(400).json({ error: 'Please provide a valid phone number (at least 10 digits).', code: 'MISSING_PHONE' });
      }

      if (!isValidQuantity(rawQuantity)) {
        return res.status(400).json({ error: 'Quantity must be a positive integer between 1 and 50,000.', code: 'INVALID_QUANTITY' });
      }

      if (budgetVal != null && !isValidBudget(budgetVal)) {
        return res.status(400).json({ error: 'Target budget must be a positive number.', code: 'INVALID_BUDGET' });
      }

      const rawNetFilling = raw.netFillingGrams ?? raw.netWeightGrams ?? raw.fillingWeightGrams ?? raw.netWeight;
      let netFillingGrams: number | null = null;
      if (rawNetFilling !== undefined && rawNetFilling !== null && rawNetFilling !== '') {
        const normalized = normalizeNetFillingGrams(rawNetFilling);
        if (normalized === null || !isValidNetFillingGrams(normalized)) {
          return res.status(400).json({ error: 'Please provide a valid net filling weight per box (e.g. 250g, 500g, 1kg or custom weight).', code: 'INVALID_NET_FILLING_WEIGHT' });
        }
        netFillingGrams = normalized;
      }

      if (raw.hamperConfiguration?.netFillingGrams !== undefined && raw.hamperConfiguration.netFillingGrams !== null && raw.hamperConfiguration.netFillingGrams !== '') {
        const normalized = normalizeNetFillingGrams(raw.hamperConfiguration.netFillingGrams);
        if (normalized === null || !isValidNetFillingGrams(normalized)) {
          return res.status(400).json({ error: 'Please provide a valid net filling weight per box (e.g. 250g, 500g, 1kg or custom weight).', code: 'INVALID_NET_FILLING_WEIGHT' });
        }
        raw.hamperConfiguration.netFillingGrams = normalized;
        if (netFillingGrams === null) {
          netFillingGrams = normalized;
        }
      }

      const rawMode = String(raw.boxMode ?? raw.mode ?? '').toLowerCase();
      const safeMode: 'empty' | 'filled' | 'custom' =
        rawMode === 'empty' ? 'empty' : rawMode === 'custom' ? 'custom' : 'filled';

      let catalog: Product[];
      let hamperBoxes: HamperBox[];
      try {
        const resolved = await resolveCatalogAndBoxes();
        catalog = resolved.catalog;
        hamperBoxes = resolved.hamperBoxes;
      } catch (catErr: any) {
        console.warn('Authoritative catalog resolution error:', catErr);
        return res.status(503).json({
          ok: false,
          success: false,
          error: 'CATALOG_UNAVAILABLE',
          code: 'CATALOG_UNAVAILABLE',
          message: 'Authoritative catalog pricing is temporarily unavailable. Please retry shortly or message our concierge on WhatsApp.',
        });
      }

      const productId = String(raw.productId || 'custom').trim();
      const resolution = resolveInquiryProductVariant({
        catalog,
        hamperBoxes,
        productId,
        requestedVariantLabel: requestedVariant,
        boxMode: safeMode,
        quantity: rawQuantity,
        hamperConfiguration: raw.hamperConfiguration,
        netFillingGrams,
      });

      const effectiveNetFilling = resolution.netFillingGrams ?? netFillingGrams;
      const offPrice = budgetVal != null ? Number(budgetVal) : null;
      const eventType = rawEventType || 'Nikkah';

      const payloadHash = submissionKey
        ? computeInquiryPayloadHash({
            customerName: resolvedName,
            phone: resolvedPhone,
            city,
            productId,
            packagingVariant: resolution.packagingVariant,
            boxMode: safeMode,
            quantity: rawQuantity,
            eventType,
            targetEventDate: raw.targetEventDate ? String(raw.targetEventDate).slice(0, 30) : null,
            preferredFillings: Array.isArray(raw.preferredFillings) ? raw.preferredFillings : [],
            customFillingsNotes: raw.customFillingsNotes || '',
            monogramText: raw.monogramText || '',
            cardMessage: raw.cardMessage || '',
            customPrintText,
            budgetType: raw.budgetType || null,
            targetPricePkr: offPrice,
            leadTimeNoticeAcknowledged: Boolean(raw.leadTimeNoticeAcknowledged),
            netFillingGrams: effectiveNetFilling,
          })
        : undefined;

      const quoteId = generateInquiryReferenceId('bid_box_quote');
      const whatsappUrl = buildCustomerInquiryWhatsAppUrl({
        quoteId,
        productName: resolution.productName,
        productId,
        packagingVariant: resolution.packagingVariant,
        mode: safeMode,
        quantity: rawQuantity,
        quantityUnit: resolution.quantityUnit,
        piecesPerPack: resolution.piecesPerPack,
        eventType: eventType.slice(0, 80),
        targetEventDate: raw.targetEventDate ? String(raw.targetEventDate).slice(0, 30) : null,
        preferredFillings: Array.isArray(raw.preferredFillings) ? raw.preferredFillings : [],
        customFillingsNotes: raw.customFillingsNotes ? String(raw.customFillingsNotes).slice(0, 500) : '',
        monogramText: raw.monogramText ? String(raw.monogramText).slice(0, 200) : '',
        cardMessage: raw.cardMessage ? String(raw.cardMessage).slice(0, 500) : '',
        customPrintText,
        budgetType: raw.budgetType === 'per_piece' || raw.budgetType === 'total' ? raw.budgetType : null,
        targetPricePkr: offPrice,
        referenceUnitPrice: resolution.standardPrice,
        perPiecePrice: resolution.perPiecePrice,
        estimatedTotalPkr: resolution.estimatedTotalPkr ?? (resolution.standardPrice != null ? resolution.standardPrice * rawQuantity : null),
        requiresTeamQuote: resolution.requiresTeamQuote,
        belowMoq: resolution.belowMoq,
        moqRequired: resolution.moqRequired,
        leadTimeNoticeAcknowledged: Boolean(raw.leadTimeNoticeAcknowledged),
        customerName: resolvedName.slice(0, 100),
        customerPhone: resolvedPhone.slice(0, 40),
        city: city.slice(0, 80),
        isTabarruk: resolution.isTabarruk,
        hamperConfiguration: resolution.hamperConfiguration || raw.hamperConfiguration,
        netFillingGrams: effectiveNetFilling,
      });

      const record: InquiryRecord = {
        id: quoteId,
        quoteId,
        ticketId: quoteId,
        type: 'bid_box_quote',
        customerName: resolvedName.slice(0, 100),
        phone: resolvedPhone.slice(0, 40),
        email: email.slice(0, 120),
        city: city.slice(0, 80),
        productId,
        productName: resolution.productName,
        packagingVariant: resolution.packagingVariant,
        boxMode: safeMode,
        quantity: rawQuantity,
        quantityUnit: resolution.quantityUnit,
        piecesPerPack: resolution.piecesPerPack,
        eventType: eventType.slice(0, 80),
        targetEventDate: raw.targetEventDate ? String(raw.targetEventDate).trim().slice(0, 30) : null,
        budgetType: raw.budgetType === 'per_piece' || raw.budgetType === 'total' ? raw.budgetType : null,
        preferredFillings: Array.isArray(raw.preferredFillings) ? raw.preferredFillings.slice(0, 10) : [],
        customFillingsNotes: raw.customFillingsNotes ? String(raw.customFillingsNotes).trim().slice(0, 500) : '',
        monogramText: raw.monogramText ? String(raw.monogramText).trim().slice(0, 200) : '',
        cardMessage: raw.cardMessage ? String(raw.cardMessage).trim().slice(0, 500) : '',
        customPrintText,
        standardPrice: resolution.standardPrice,
        estimatedTotalPkr: resolution.estimatedTotalPkr ?? (resolution.standardPrice != null ? resolution.standardPrice * rawQuantity : null),
        packPrice: resolution.packPrice,
        perPiecePrice: resolution.perPiecePrice,
        requiresTeamQuote: resolution.requiresTeamQuote,
        unresolvedVariant: resolution.unresolvedVariant,
        belowMoq: resolution.belowMoq,
        moqRequired: resolution.moqRequired,
        minPacksRequired: resolution.minPacksRequired,
        isVerifiedCatalogProduct: resolution.isVerifiedCatalogProduct,
        submissionKey: submissionKey || null,
        offeredPrice: offPrice,
        finalAgreedPrice: null,
        notes: (notes || customPrintText).slice(0, 1000),
        adminNotes: '',
        status: 'NEW',
        whatsappUrl,
        whatsappReplyUrl: '',
        assignedTo: null,
        followUpDate: null,
        leadTimeNoticeAcknowledged: Boolean(raw.leadTimeNoticeAcknowledged),
        hamperConfiguration: resolution.hamperConfiguration || undefined,
        netFillingGrams: effectiveNetFilling,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      record.whatsappReplyUrl = buildAdminWhatsAppPitchUrl(record);

      const result = await persistInquiryAtomically(db, record, submissionKey, payloadHash);
      inMemory.set(result.inquiry.id, result.inquiry);

      return res.json({
        ok: true,
        success: true,
        id: result.inquiry.id,
        quoteId: result.inquiry.id,
        ticketId: result.inquiry.id,
        inquiry: result.inquiry,
        whatsappUrl: result.inquiry.whatsappUrl,
        message: 'Custom quote logged. Connect on WhatsApp to discuss your order and customization details.',
      });
    } catch (err: any) {
      if (err instanceof IdempotencyConflictError) {
        return res.status(err.httpStatus).json({ ok: false, success: false, error: err.code, code: err.code, message: err.message });
      }
      if (err instanceof PersistenceUnavailableError) {
        return res.status(err.httpStatus).json({ ok: false, success: false, error: err.code, code: err.code, message: err.message });
      }
      console.error('Quote persistence error:', err);
      return res.status(503).json({
        ok: false,
        success: false,
        error: 'INQUIRY_PERSISTENCE_FAILED',
        code: 'INQUIRY_PERSISTENCE_FAILED',
        message: 'Failed to record inquiry in persistent store. Please retry or message our concierge on WhatsApp.',
      });
    }
  });

  // 4. Admin-only: List all inquiries & quotes
  router.get('/api/admin/inquiries', adminGuard, async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const db = options.getDb();
      const merged = new Map<string, InquiryRecord>();

      if (db) {
        try {
          const [inqSnap, quoteSnap] = await Promise.all([
            db.collection('inquiries').limit(250).get(),
            db.collection('quotes').limit(250).get(),
          ]);
          for (const doc of quoteSnap.docs) {
            const data = doc.data() as InquiryRecord;
            merged.set(doc.id, { ...data, id: doc.id });
          }
          for (const doc of inqSnap.docs) {
            const data = doc.data() as InquiryRecord;
            merged.set(doc.id, { ...data, id: doc.id });
          }
        } catch (dbErr) {
          console.warn('Admin inquiries Firestore read warning:', dbErr);
        }
      }

      for (const [id, item] of inMemory.entries()) {
        if (!merged.has(id)) {
          merged.set(id, item);
        }
      }

      const inquiries = Array.from(merged.values()).sort(
        (a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '')
      );

      return res.json({
        ok: true,
        success: true,
        inquiries,
        totalCount: inquiries.length,
        asOf: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to load inquiries.', code: 'SERVER_ERROR' });
    }
  });

  // 5. Admin-only: Update inquiry/quote status, admin notes, agreed price, assignedTo, followUpDate & generate 1-click WhatsApp pitch link
  const handleAdminUpdate: RequestHandler = async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      if (!id || id.length > 120) {
        return res.status(400).json({ error: 'Invalid inquiry ID.', code: 'INVALID_ID' });
      }

      const db = options.getDb();
      if (!db) {
        return res.status(503).json({
          ok: false,
          error: 'PERSISTENCE_UNAVAILABLE',
          code: 'PERSISTENCE_UNAVAILABLE',
          message: 'Database is currently unavailable for admin updates.',
        });
      }

      let existing: InquiryRecord | undefined;
      const inqDoc = await db.collection('inquiries').doc(id).get();
      if (inqDoc.exists) {
        existing = inqDoc.data() as InquiryRecord;
      } else {
        const quoteDoc = await db.collection('quotes').doc(id).get();
        if (quoteDoc.exists) {
          existing = quoteDoc.data() as InquiryRecord;
        }
      }

      if (!existing) {
        existing = inMemory.get(id);
      }

      if (!existing) {
        return res.status(404).json({ error: 'Inquiry or quote not found.', code: 'NOT_FOUND' });
      }

      const { status, adminNotes, finalAgreedPrice, assignedTo, followUpDate } = req.body || {};
      const nextStatus: InquiryStatus = status && VALID_INQUIRY_STATUSES.includes(String(status).toUpperCase() as InquiryStatus)
        ? (String(status).toUpperCase() as InquiryStatus)
        : existing.status;
      const nextAdminNotes = typeof adminNotes === 'string' ? adminNotes.trim().slice(0, 1000) : existing.adminNotes;
      const nextAgreedPrice = finalAgreedPrice === null || finalAgreedPrice === ''
        ? null
        : finalAgreedPrice !== undefined && Number.isFinite(Number(finalAgreedPrice))
          ? Math.max(0, Number(finalAgreedPrice))
          : existing.finalAgreedPrice;
      const nextAssignedTo = assignedTo !== undefined
        ? (assignedTo ? String(assignedTo).trim().slice(0, 100) : null)
        : existing.assignedTo;
      const nextFollowUpDate = followUpDate !== undefined
        ? (followUpDate ? String(followUpDate).trim().slice(0, 30) : null)
        : existing.followUpDate;

      const updated: InquiryRecord = {
        ...existing,
        id,
        status: nextStatus,
        adminNotes: nextAdminNotes,
        finalAgreedPrice: nextAgreedPrice,
        assignedTo: nextAssignedTo,
        followUpDate: nextFollowUpDate,
        updatedAt: new Date().toISOString(),
      };
      updated.whatsappReplyUrl = buildAdminWhatsAppPitchUrl(updated);

      await updateAdminInquiryAtomically(db, updated);
      inMemory.set(updated.id, updated);

      return res.json({
        ok: true,
        success: true,
        inquiry: updated,
        whatsappReplyUrl: updated.whatsappReplyUrl,
      });
    } catch (err: any) {
      if (err instanceof PersistenceUnavailableError) {
        return res.status(err.httpStatus).json({ ok: false, error: err.code, code: err.code, message: err.message });
      }
      return res.status(500).json({ error: err.message || 'Failed to update inquiry.', code: 'SERVER_ERROR' });
    }
  };

  router.patch('/api/admin/inquiries/:id', adminGuard, handleAdminUpdate);
  router.post('/api/admin/inquiries/:id', adminGuard, handleAdminUpdate);

  return router;
}
