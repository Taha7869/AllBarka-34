import { createPortal } from 'react-dom';
import { acquireScrollLock } from '../utils/scrollLock';
import { GIFT_RECIPIENTS, isGiftRecipient, type GiftRecipient } from '../lib/giftRecipient';
import { quoteCopy, quoteEventLabels, type QuoteCopyKey } from '../contexts/customQuoteTranslations';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Sparkles,
  Package,
  Gift,
  MessageCircle,
  CheckCircle2,
  Tag,
  Calendar,
  Layers,
  ShieldCheck,
  AlertCircle,
  Info,
  Clock,
  HeartHandshake,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useCatalogProducts, useCatalogHamperBoxes } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Product, CustomQuoteModalInit } from '../types';
import { resolveInquiryProductVariant } from '../lib/inquiryResolution';
import {
  calculateFilledGiftEstimate,
  resolveFilledRecipe,
  resolveEmptyPackagingUnitPrice,
  normalizeNetFillingGrams,
  isValidNetFillingGrams,
  NET_FILLING_PRESETS,
} from '../lib/filledGiftPricing';
import { resolveHamper, type HamperConfiguration } from '../lib/hamperCatalog';
import {
  buildCustomerInquiryWhatsAppUrl,
} from '../lib/inquiryWhatsApp';
import { submitCustomQuoteInquiry } from '../lib/storefrontSubmissions';

export type { CustomQuoteModalInit };

export function openCustomQuoteModal(detail: CustomQuoteModalInit = {}): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<CustomQuoteModalInit>('open-custom-quote-modal', { detail }));
  }
}

const EVENT_TYPES = Object.keys(quoteEventLabels);
const FILLING_OPTIONS = ['dry_fruits', 'dates', 'chocolates', 'candies', 'other'] as const;

const quoteErrorKeys: Readonly<Record<string, QuoteCopyKey>> = {
  MISSING_NAME: 'invalidName',
  MISSING_PHONE: 'invalidPhone',
  INVALID_QUANTITY: 'invalidQuantity',
  INVALID_BUDGET: 'invalidBudget',
  INVALID_GIFT_RECIPIENT: 'invalidRecipient',
  CATALOG_UNAVAILABLE: 'catalogUnavailable',
};

const QUANTITY_PRESETS = [25, 50, 100, 200, 300, 500] as const;

export default function CustomQuoteModal() {
  const products = useCatalogProducts();
  const hamperBoxes = useCatalogHamperBoxes();
  const { t, language, isRtl } = useLanguage();
  const localeIndex = language === 'ur' ? 1 : language === 'ar' ? 2 : 0;
  const q = (key: QuoteCopyKey, values: Record<string, string | number> = {}) =>
    quoteCopy[key][localeIndex].replace(/\{(\w+)\}/g, (token, name) => String(values[name] ?? token));
  const eventLabel = (value: string) => quoteEventLabels[value]?.[localeIndex] ?? value;
  const catalogName = (product: Product) => product[`name_${language}`]?.trim() || product.name_en;
  const ingredientName = (id: string, fallback: string) => {
    const product = products.find(item => item.id === id);
    return product ? catalogName(product) : fallback;
  };
  const money = (value: number) => q('money', { amount: value.toLocaleString() });
  const packCount = (count: number) => q(count === 1 ? 'onePack' : 'packCount', { count });
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const eligibleProducts = useMemo(() => {
    const bidBoxes = products.filter(p => (p.isBidBox || p.category === 'celebration-boxes') && p.active !== false);
    const dealsAndBundles = products.filter(
      p =>
        !p.isBidBox &&
        p.category !== 'celebration-boxes' &&
        p.active !== false &&
        (p.category === 'gift-boxes' || p.category === 'bundles' || p.isBundle || p.quoteOnly || p.orderMode === 'inquiry_quote' || p.orderMode === 'both')
    );
    return [...bidBoxes, ...dealsAndBundles];
  }, [products]);

  // Stable Submission Key across retries of the same inquiry
  const [submissionKey, setSubmissionKey] = useState<string>('');

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('bid-box-umrah-tabarruk');
  const [hamperConfiguration, setHamperConfiguration] = useState<HamperConfiguration | null>(null);
  const [selectedVariantLabel, setSelectedVariantLabel] = useState<string>('');
  const [mode, setMode] = useState<'empty' | 'filled' | 'custom'>('empty');
  const [quantity, setQuantity] = useState<number>(50);
  const [giftRecipient, setGiftRecipient] = useState<GiftRecipient | ''>('');
  const [eventType, setEventType] = useState<string>('Nikkah');
  const [targetEventDate, setTargetEventDate] = useState<string>('');
  const [leadTimeAcknowledged, setLeadTimeAcknowledged] = useState<boolean>(false);
  const [netFillingGrams, setNetFillingGrams] = useState<number | null>(null);
  const [isCustomWeight, setIsCustomWeight] = useState<boolean>(false);
  const [customWeightInput, setCustomWeightInput] = useState<string>('');

  // Fillings & Personalization
  const [preferredFillings, setPreferredFillings] = useState<string[]>([]);
  const [customFillingsNotes, setCustomFillingsNotes] = useState<string>('');
  const [monogramText, setMonogramText] = useState<string>('');
  const [cardMessage, setCardMessage] = useState<string>('');
  const [customPrinting, setCustomPrinting] = useState<string>('');

  // Budget
  const [budgetType, setBudgetType] = useState<'per_piece' | 'total'>('total');
  const [targetPricePkr, setTargetPricePkr] = useState<string>('');

  // Contact Info (persisted in component state across opens)
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [city, setCity] = useState<string>('Lahore');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submittedQuote, setSubmittedQuote] = useState<{
    quoteId: string;
    whatsappUrl: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<QuoteCopyKey | 'quote.customWeightRequired' | 'quote.invalidNetFillingWeight' | null>(null);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const custom = event as CustomEvent<CustomQuoteModalInit>;
      const detail = custom.detail || {};

      // 1. Generate fresh submission key for each new inquiry
      const newKey = globalThis.crypto?.randomUUID
        ? crypto.randomUUID()
        : 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      setSubmissionKey(newKey);
      setHamperConfiguration(detail.hamperConfiguration || null);

      // 2. Set product identity without silent fallback to unrelated first item
      const initialId = detail.productId ?? (eligibleProducts[0]?.id ?? '');
      setSelectedProductId(initialId);

      // 3. Reset product-specific variant, occasion, fillings, design text, event date and budget
      // Contact details (customerName, customerPhone, customerEmail, city) remain preserved
      setSelectedVariantLabel(detail.variantLabel || detail.portion || '');
      setMode(detail.mode || 'empty');
      setQuantity(detail.quantity && detail.quantity > 0 ? Math.round(detail.quantity) : 50);
      setGiftRecipient(isGiftRecipient(detail.giftRecipient) ? detail.giftRecipient : '');
      setEventType(detail.eventType || detail.occasion || 'Nikkah');
      setTargetEventDate(detail.targetEventDate ? String(detail.targetEventDate).trim() : '');
      setLeadTimeAcknowledged(false);
      setPreferredFillings(Array.isArray(detail.preferredFillings) ? detail.preferredFillings : []);
      setCustomFillingsNotes(detail.customFillingsNotes ? String(detail.customFillingsNotes).trim() : '');
      setMonogramText(detail.monogramText ? String(detail.monogramText).trim() : '');
      setCardMessage(detail.cardMessage ? String(detail.cardMessage).trim() : '');
      const printNote = (detail.customPrintText ?? detail.customPrinting ?? detail.notes ?? '').trim();
      setCustomPrinting(printNote);
      if (detail.city) {
        setCity(String(detail.city).trim());
      }

      let initialNetGrams: number | null = null;
      if (detail.netFillingGrams != null && Number.isFinite(detail.netFillingGrams) && detail.netFillingGrams > 0) {
        initialNetGrams = detail.netFillingGrams;
      } else if (detail.hamperConfiguration?.netFillingGrams) {
        initialNetGrams = detail.hamperConfiguration.netFillingGrams;
      } else {
        const fromLabel = normalizeNetFillingGrams(detail.variantLabel || detail.portion || '');
        if (fromLabel) {
          initialNetGrams = fromLabel;
        } else {
          const targetProd = products.find(p => p.id === initialId) || eligibleProducts.find(p => p.id === initialId);
          if (targetProd) {
            const recipe = resolveFilledRecipe(targetProd, detail.variantLabel || detail.portion || '');
            if (recipe && recipe.length > 0) {
              const sum = recipe.reduce((acc, it) => acc + (Number(it.grams) || 0), 0);
              if (sum > 0) initialNetGrams = sum;
            }
          }
        }
      }
      setNetFillingGrams(initialNetGrams);
      if (initialNetGrams != null) {
        if ([250, 500, 1000].includes(initialNetGrams)) {
          setIsCustomWeight(false);
          setCustomWeightInput(String(initialNetGrams));
        } else {
          setIsCustomWeight(true);
          setCustomWeightInput(String(initialNetGrams));
        }
      } else {
        setIsCustomWeight(false);
        setCustomWeightInput('');
      }

      if (detail.targetPricePkr != null && String(detail.targetPricePkr).trim() !== '') {
        setTargetPricePkr(String(detail.targetPricePkr).trim());
        setBudgetType(detail.budgetType === 'per_piece' ? 'per_piece' : 'total');
      } else if (detail.targetUnitPrice && Number.isFinite(detail.targetUnitPrice) && detail.targetUnitPrice > 0) {
        setTargetPricePkr(String(detail.targetUnitPrice));
        setBudgetType('per_piece');
      } else {
        setTargetPricePkr('');
        setBudgetType(detail.budgetType || 'total');
      }

      setSubmittedQuote(null);
      setErrorMsg(null);
      setIsOpen(true);
    };

    window.addEventListener('open-custom-quote-modal', handleOpen);
    return () => window.removeEventListener('open-custom-quote-modal', handleOpen);
  }, [eligibleProducts, products]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const wasInert = root?.inert ?? false;
    const release = acquireScrollLock();
    if (root) root.inert = true;
    const frame = requestAnimationFrame(() => {
      if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setIsOpen(false); return; }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []).filter(element => element.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame); document.removeEventListener('keydown', handleKeyDown); release();
      if (root) root.inert = wasInert;
      if (previous?.isConnected && previous.getClientRects().length && !previous.closest('[inert]')) previous.focus({ preventScroll: true });
    };
  }, [isOpen]);

  // Product resolution without silent fallback to unrelated first item
  const selectedProduct: Product | undefined = useMemo(() => {
    if (!selectedProductId) return undefined;
    return products.find(p => p.id === selectedProductId) || eligibleProducts.find(p => p.id === selectedProductId);
  }, [products, eligibleProducts, selectedProductId]);

  // Available variants for the selected product
  const availableVariants = useMemo(() => {
    if (!selectedProduct) return [];
    if (Array.isArray(selectedProduct.variants) && selectedProduct.variants.length > 0) {
      return selectedProduct.variants.map(v => v.label);
    }
    const priceKeys = Object.keys(selectedProduct.prices || {});
    return priceKeys;
  }, [selectedProduct]);

  // Authoritative Resolution via shared browser-safe resolver
  const resolution = useMemo(() => {
    return resolveInquiryProductVariant({
      catalog: products,
      hamperBoxes,
      productId: selectedProduct?.id || selectedProductId,
      requestedVariantLabel: selectedVariantLabel || null,
      boxMode: mode,
      quantity,
      hamperConfiguration: hamperConfiguration || undefined,
      netFillingGrams: mode === 'empty' ? null : netFillingGrams,
    });
  }, [products, hamperBoxes, selectedProduct, selectedProductId, selectedVariantLabel, mode, quantity, hamperConfiguration, netFillingGrams]);

  const isTabarruk = resolution.isTabarruk;
  const referenceUnitPrice = resolution.standardPrice ?? 0;

  const filledRecipe = useMemo(() => {
    return resolveFilledRecipe(selectedProduct, selectedVariantLabel, mode === 'empty' ? null : netFillingGrams);
  }, [selectedProduct, selectedVariantLabel, mode, netFillingGrams]);

  const emptyPackagingUnitPrice = useMemo(() => {
    if (mode !== 'filled' || !selectedProduct) return null;
    return resolveEmptyPackagingUnitPrice(selectedProduct, quantity);
  }, [mode, selectedProduct, quantity]);

  const filledEstimate = useMemo(() => {
    if (mode !== 'filled' || !selectedProduct) return null;
    return calculateFilledGiftEstimate({
      packagingProduct: selectedProduct,
      packagingUnitPrice: emptyPackagingUnitPrice ?? undefined,
      recipe: filledRecipe || undefined,
      catalogProducts: products,
      requestedBoxes: quantity,
      expectedNetFillingGrams: netFillingGrams,
    });
  }, [mode, selectedProduct, emptyPackagingUnitPrice, filledRecipe, products, quantity, netFillingGrams]);

  const effectiveReferenceRate = useMemo(() => {
    if (selectedProductId === 'custom-hamper' && hamperConfiguration) {
      const configWithWeight = {
        ...hamperConfiguration,
        ...(netFillingGrams ? { netFillingGrams } : {}),
      };
      const resolved = resolveHamper(configWithWeight, products, hamperBoxes, quantity);
      if (resolved) {
        const isCompleteEstimate = resolved.estimatedTotalPkr != null;
        return {
          standardPrice: isCompleteEstimate ? resolved.unitPrice : null,
          perPiecePrice: isCompleteEstimate ? resolved.unitPrice : null,
          packagingPrice: resolved.packagingPrice ?? resolved.unitPrice,
          requiresTeamQuote: !isCompleteEstimate,
          isEstimate: isCompleteEstimate,
          estimatedTotalPkr: isCompleteEstimate ? resolved.estimatedTotalPkr : null,
        };
      }
    }
    if (mode === 'filled') {
      if (filledEstimate?.isAvailable && filledEstimate.estimatedTotalPkr != null) {
        const perBox = Math.round(filledEstimate.estimatedTotalPkr / quantity);
        return {
          standardPrice: perBox,
          perPiecePrice: perBox,
          requiresTeamQuote: false,
          isEstimate: true,
          estimatedTotalPkr: filledEstimate.estimatedTotalPkr,
        };
      }
      return {
        standardPrice: null,
        perPiecePrice: null,
        requiresTeamQuote: true,
        isEstimate: false,
        estimatedTotalPkr: null,
      };
    }
    return {
      standardPrice: resolution.standardPrice,
      perPiecePrice: resolution.perPiecePrice,
      requiresTeamQuote: resolution.requiresTeamQuote,
      isEstimate: false,
      estimatedTotalPkr: null,
    };
  }, [mode, filledEstimate, quantity, resolution, selectedProductId, hamperConfiguration, products, hamperBoxes, netFillingGrams]);

  if (!isOpen) return null;

  // Live Unsaved Draft WhatsApp URL for direct messaging
  const liveUnsavedWhatsAppUrl = buildCustomerInquiryWhatsAppUrl({
    quoteId: null,
    isUnsavedDraft: true,
    productName: resolution.productName,
    productId: selectedProduct?.id || selectedProductId,
    packagingVariant: resolution.packagingVariant,
    mode,
    quantity,
    quantityUnit: resolution.quantityUnit,
    piecesPerPack: resolution.piecesPerPack,
    eventType,
    giftRecipient: giftRecipient || undefined,
    targetEventDate: targetEventDate || null,
    preferredFillings,
    customFillingsNotes,
    monogramText,
    cardMessage,
    customPrinting,
    customPrintText: customPrinting,
    budgetType,
    targetPricePkr,
    referenceUnitPrice: effectiveReferenceRate.standardPrice,
    perPiecePrice: effectiveReferenceRate.perPiecePrice,
    estimatedTotalPkr: effectiveReferenceRate.estimatedTotalPkr,
    requiresTeamQuote: effectiveReferenceRate.requiresTeamQuote,
    belowMoq: resolution.belowMoq,
    moqRequired: resolution.moqRequired,
    customerName,
    customerPhone,
    city,
    isTabarruk: resolution.isTabarruk,
    leadTimeNoticeAcknowledged: leadTimeAcknowledged,
    hamperConfiguration: hamperConfiguration
      ? {
          ...hamperConfiguration,
          ...(netFillingGrams != null && mode !== 'empty' ? { netFillingGrams } : {}),
        }
      : undefined,
    netFillingGrams: mode === 'empty' ? null : netFillingGrams,
  });

  const toggleFilling = (fillingId: string) => {
    setPreferredFillings(prev =>
      prev.includes(fillingId) ? prev.filter(f => f !== fillingId) : [...prev, fillingId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMsg('invalidName');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      setErrorMsg('invalidPhone');
      return;
    }

    if (mode === 'filled' || mode === 'custom') {
      if (isCustomWeight) {
        if (!customWeightInput.trim()) {
          setErrorMsg('quote.customWeightRequired');
          return;
        }
        if (netFillingGrams === null || !isValidNetFillingGrams(netFillingGrams)) {
          setErrorMsg('quote.invalidNetFillingWeight');
          return;
        }
      } else if (netFillingGrams !== null && !isValidNetFillingGrams(netFillingGrams)) {
        setErrorMsg('quote.invalidNetFillingWeight');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await submitCustomQuoteInquiry({
        submissionKey: submissionKey || undefined,
        productId: selectedProduct?.id || selectedProductId,
        productName: resolution.productName,
        packagingVariant: resolution.packagingVariant || undefined,
        boxMode: mode,
        quantity,
        eventType,
        giftRecipient: giftRecipient || undefined,
        targetEventDate: targetEventDate || undefined,
        preferredFillings: preferredFillings.length > 0 ? preferredFillings : undefined,
        customFillingsNotes: customFillingsNotes.trim() || undefined,
        monogramText: monogramText.trim() || undefined,
        cardMessage: cardMessage.trim() || undefined,
        customPrinting: customPrinting.trim() || undefined,
        customPrintText: customPrinting.trim() || undefined,
        budgetType,
        targetPricePkr: targetPricePkr ? Number(targetPricePkr) : null,
        referenceUnitPrice: effectiveReferenceRate.standardPrice,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        email: customerEmail.trim() || undefined,
        city: city.trim() || 'Lahore',
        leadTimeNoticeAcknowledged: leadTimeAcknowledged,
        hamperConfiguration: hamperConfiguration
          ? {
              ...hamperConfiguration,
              ...(netFillingGrams != null && mode !== 'empty' ? { netFillingGrams } : {}),
            }
          : undefined,
        netFillingGrams: mode === 'empty' ? null : netFillingGrams,
      });

      const quoteId = res.quoteId;
      const whatsappUrl =
        res.whatsappUrl ||
        buildCustomerInquiryWhatsAppUrl({
          quoteId,
          productName: resolution.productName,
          productId: selectedProduct?.id || selectedProductId,
          packagingVariant: resolution.packagingVariant,
          mode,
          quantity,
          quantityUnit: resolution.quantityUnit,
          piecesPerPack: resolution.piecesPerPack,
          eventType,
          giftRecipient: giftRecipient || undefined,
          targetEventDate: targetEventDate || null,
          preferredFillings,
          customFillingsNotes,
          monogramText,
          cardMessage,
          customPrinting,
          customPrintText: customPrinting,
          budgetType,
          targetPricePkr,
          referenceUnitPrice: effectiveReferenceRate.standardPrice,
          perPiecePrice: effectiveReferenceRate.perPiecePrice,
          estimatedTotalPkr: effectiveReferenceRate.estimatedTotalPkr,
          requiresTeamQuote: effectiveReferenceRate.requiresTeamQuote,
          belowMoq: resolution.belowMoq,
          moqRequired: resolution.moqRequired,
          customerName,
          customerPhone,
          city,
          isTabarruk: resolution.isTabarruk,
          leadTimeNoticeAcknowledged: leadTimeAcknowledged,
          hamperConfiguration: hamperConfiguration || undefined,
          netFillingGrams: mode === 'empty' ? null : netFillingGrams,
        });

      setSubmittedQuote({ quoteId, whatsappUrl });
    } catch (err) {
      const failure = err as { code?: string; status?: number } | null;
      const code = failure?.code;
      if (code === 'IDEMPOTENCY_PAYLOAD_MISMATCH' || failure?.status === 409) {
        setErrorMsg('conflict');
      } else if (code === 'INVALID_NET_FILLING_WEIGHT' || code === 'CONFLICTING_NET_FILLING_WEIGHT') {
        setErrorMsg('quote.invalidNetFillingWeight');
      } else if (failure?.status === 429) {
        setErrorMsg('rateLimited');
      } else {
        setErrorMsg((code && Object.hasOwn(quoteErrorKeys, code) ? quoteErrorKeys[code] : undefined) ?? 'saveFailed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      ref={dialogRef}
      className="custom-quote-dialog fixed inset-0 z-[19000] flex items-center justify-center bg-[#042821]/75 p-3 sm:p-5 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-quote-modal-title"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="custom-quote-panel relative w-full max-w-2xl rounded-3xl border border-[#D4AF6A]/40 bg-[var(--color-base)] text-[var(--color-text-primary)] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Luxury Emerald Header */}
        <div className="custom-quote-header bg-gradient-to-r from-[#072A20] via-[#0B3B2D] to-[#072A20] px-6 py-5 text-[#F7F1E3] border-b border-[#D4AF6A]/30 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AF6A]/20 border border-[#D4AF6A]/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E6C786] mb-2">
              <Sparkles size={12} /> {q('eyebrow')}
            </div>
            <h2 id="custom-quote-modal-title" className="font-serif text-xl sm:text-2xl font-bold text-white">
              {q('title')}
            </h2>
            <p className="text-xs sm:text-sm text-[#E5DEC9]/85 mt-1">
              {q('intro')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={q('close')}
            className="rounded-full p-2 text-[#E6C786] hover:bg-[var(--color-surface)]/10 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="custom-quote-body p-5 sm:p-6 overflow-y-auto space-y-5">
          {submittedQuote ? (
            /* SUCCESS CONFIRMATION STATE (Durable persistence confirmed) */
            <div className="rounded-2xl border border-[#1B5E43]/30 bg-[var(--color-surface)] p-6 text-center space-y-4 shadow-sm">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#0B3B2D]/10 text-[#0B3B2D] flex items-center justify-center">
                <CheckCircle2 size={30} className="text-[#127A4D]" />
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-[var(--color-accent-text)]">
                  {q('savedRef', { id: submittedQuote.quoteId })}
                </span>
                <h3 className="font-serif text-2xl font-bold text-[var(--color-text-primary)]">
                  {q('savedTitle')}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] max-w-lg mx-auto">
                  {q('savedBody')}
                </p>
              </div>

              {/* Summary Review Card */}
              <div className="rounded-xl bg-[var(--color-base)] border border-[#D4AF6A]/40 p-4 text-start text-xs sm:text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">{q('selection')}</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {selectedProduct ? catalogName(selectedProduct) : hamperConfiguration ? q('customHamper') : q('customRequest')}
                    {selectedVariantLabel ? ` (${selectedVariantLabel})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">{q('configuration')}</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {q(mode)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">{q('quantityEvent')}</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {resolution.quantityUnit === 'packs' ? packCount(quantity) : q(resolution.quantityUnit === 'sets' ? 'setCount' : 'pieceCount', { count: quantity })} • {eventLabel(eventType)}
                  </span>
                </div>
                {giftRecipient && <p className="gift-recipient-summary" data-gift-recipient={giftRecipient}>{t('gift.recipientLabel')}: {t(`gift.recipient.${giftRecipient}`)}</p>}
                {targetEventDate && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">{q('eventDate')}</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{targetEventDate}</span>
                  </div>
                )}
                {preferredFillings.length > 0 && mode !== 'empty' && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">{q('selectedFillings')}</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{FILLING_OPTIONS.filter(id => preferredFillings.includes(id)).map(id => q(id)).join(language === 'en' ? ', ' : '، ')}</span>
                  </div>
                )}
                {monogramText && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">{q('monogramSummary')}</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{monogramText}</span>
                  </div>
                )}
                {targetPricePkr && (
                  <div className="flex justify-between text-[var(--color-accent-text)] border-t border-[#D4AF6A]/30 pt-1.5">
                    <span className="font-medium">{q('budgetSummary')}</span>
                    <span className="font-bold">
                      <bdi>{money(Number(targetPricePkr))}</bdi> ({q(budgetType === 'per_piece' ? 'perPiece' : 'totalBudget')})
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={submittedQuote.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#128C7E] hover:bg-[#0E7266] text-white font-semibold py-3.5 px-6 shadow-lg transition-all text-sm sm:text-base"
                >
                  <MessageCircle size={19} />
                  {q('continueWhatsApp')}
                </a>
                <button
                  type="button"
                  onClick={() => setSubmittedQuote(null)}
                  className="rounded-xl border border-[#072A20]/20 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)] hover:bg-[#072A20]/5"
                >
                  {q('edit')}
                </button>
              </div>

              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {q('whatsappNote')}
              </p>
            </div>
          ) : (
            /* FORM STATE */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Banner with Honest Unsaved Fallback */}
              {errorMsg && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">{q('saveNotice')}</strong>
                      <span role="alert">{errorMsg === 'quote.customWeightRequired' || errorMsg === 'quote.invalidNetFillingWeight' ? t(errorMsg) : q(errorMsg)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-200">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-900"
                    >
                      <RefreshCw size={13} className={submitting ? 'animate-spin' : ''} />
                      {q('retry')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const freshKey = globalThis.crypto?.randomUUID
                          ? crypto.randomUUID()
                          : 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2);
                        setSubmissionKey(freshKey);
                        setErrorMsg(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-[var(--color-surface)] text-amber-900 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100"
                    >
                      {q('fresh')}
                    </button>
                    <a
                      href={liveUnsavedWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#128C7E] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#0E7266]"
                    >
                      <MessageCircle size={13} />
                      {q('unsavedWhatsApp')}
                    </a>
                  </div>
                </div>
              )}

              {/* Tabarruk Default Empty Mode Notice */}
              {isTabarruk && (
                <div className="rounded-2xl border border-[#D4AF6A]/60 bg-[var(--color-base)] p-3.5 text-xs text-[var(--color-text-primary)] flex items-start gap-2.5 shadow-xs">
                  <Info size={17} className="text-[var(--color-accent-text)] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-[var(--color-accent-text)] uppercase tracking-wider text-[11px]">
                      {q('tabarrukTitle')}
                    </strong>
                    <span className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                      {q('tabarrukNotice')}
                    </span>
                  </div>
                </div>
              )}

              {/* 1. Product & Variant Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="quote-product-select" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-1.5">
                    {q('product')}
                  </label>
                  <select
                    id="quote-product-select"
                    value={selectedProductId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedProductId(newId);
                      const newProd = products.find(p => p.id === newId) || eligibleProducts.find(p => p.id === newId);
                      if (newProd) {
                        let firstVar = '';
                        if (Array.isArray(newProd.variants) && newProd.variants.length > 0) {
                          firstVar = newProd.variants[0].label;
                        } else if (newProd.prices && Object.keys(newProd.prices).length > 0) {
                          firstVar = Object.keys(newProd.prices)[0];
                        }
                        setSelectedVariantLabel(firstVar);
                      } else {
                        setSelectedVariantLabel('');
                      }
                    }}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-[var(--color-surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--color-text-primary)] focus:border-[#072A20] focus:outline-none"
                  >
                    {!eligibleProducts.some(p => p.id === selectedProductId) && (
                      <option value={selectedProductId}>
                        {hamperConfiguration ? q('customHamper') : !selectedProductId || selectedProductId === 'custom' ? q('customRequest') : q('unlisted', { id: selectedProductId })}
                      </option>
                    )}
                    <optgroup label={q('celebrationGroup')}>
                      {eligibleProducts
                        .filter(p => p.isBidBox || p.category === 'celebration-boxes')
                        .map(product => (
                          <option key={product.id} value={product.id}>
                            {catalogName(product)}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label={q('giftGroup')}>
                      {eligibleProducts
                        .filter(p => !p.isBidBox && p.category !== 'celebration-boxes')
                        .map(product => (
                          <option key={product.id} value={product.id}>
                            {catalogName(product)}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label htmlFor="quote-variant-select" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-1.5">
                    {q('variant')}
                  </label>
                  <select
                    id="quote-variant-select"
                    value={selectedVariantLabel}
                    onChange={(e) => {
                      const newVar = e.target.value;
                      setSelectedVariantLabel(newVar);
                      const normalized = normalizeNetFillingGrams(newVar);
                      if (normalized) {
                        setNetFillingGrams(normalized);
                        if ([250, 500, 1000].includes(normalized)) {
                          setIsCustomWeight(false);
                          setCustomWeightInput(String(normalized));
                        } else {
                          setIsCustomWeight(true);
                          setCustomWeightInput(String(normalized));
                        }
                      }
                    }}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-[var(--color-surface)] px-3 py-2.5 text-sm font-medium text-[var(--color-text-primary)] focus:border-[#072A20] focus:outline-none"
                  >
                    <option value="">{q('defaultVariant')}</option>
                    {selectedVariantLabel && !availableVariants.includes(selectedVariantLabel) && (
                      <option value={selectedVariantLabel}>{selectedVariantLabel}</option>
                    )}
                    {availableVariants.map(v => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Packaging Mode Selection */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-1.5">
                  {q('packagingMode')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('empty')}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-start transition-all ${
                      mode === 'empty'
                        ? 'border-[#072A20] bg-[#072A20] text-white shadow-sm'
                        : 'border-[#D4AF6A]/40 bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[#072A20]/50'
                    }`}
                  >
                    <Package size={17} className={mode === 'empty' ? 'text-[#E6C786]' : 'text-[var(--color-accent-text)]'} />
                    <div>
                      <div className="text-xs font-bold">{q('empty')}</div>
                      <div className={`text-[10px] ${mode === 'empty' ? 'text-[#E5DEC9]' : 'text-[var(--color-text-secondary)]'}`}>
                        {q('emptyDescription')}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('filled')}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-start transition-all ${
                      mode === 'filled'
                        ? 'border-[#072A20] bg-[#072A20] text-white shadow-sm'
                        : 'border-[#D4AF6A]/40 bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[#072A20]/50'
                    }`}
                  >
                    <Gift size={17} className={mode === 'filled' ? 'text-[#E6C786]' : 'text-[var(--color-accent-text)]'} />
                    <div>
                      <div className="text-xs font-bold">{q('filled')}</div>
                      <div className={`text-[10px] ${mode === 'filled' ? 'text-[#E5DEC9]' : 'text-[var(--color-text-secondary)]'}`}>
                        {q('filledDescription')}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('custom')}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-start transition-all ${
                      mode === 'custom'
                        ? 'border-[#072A20] bg-[#072A20] text-white shadow-sm'
                        : 'border-[#D4AF6A]/40 bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[#072A20]/50'
                    }`}
                  >
                    <Sparkles size={17} className={mode === 'custom' ? 'text-[#E6C786]' : 'text-[var(--color-accent-text)]'} />
                    <div>
                      <div className="text-xs font-bold">{q('custom')}</div>
                      <div className={`text-[10px] ${mode === 'custom' ? 'text-[#E5DEC9]' : 'text-[var(--color-text-secondary)]'}`}>
                        {q('customDescription')}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2b. Net Filling Weight per Box */}
              {(mode === 'filled' || mode === 'custom') && (
                <div className="rounded-2xl border border-[#D4AF6A]/40 bg-[var(--color-surface)]/80 dark:bg-[#192720]/80 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] dark:text-[#E6C786]">
                      {t('quote.netFillingWeight', 'Net Filling Weight per Box')}
                    </label>
                    <span className="text-[11px] text-[var(--color-text-secondary)] dark:text-[#a3b8af]">
                      {t('quote.netFillingExcludesPackaging', 'Excludes packaging mass')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-text-secondary)] dark:text-[#a3b8af] leading-relaxed">
                    {t('quote.netFillingHint', 'Select the combined net ingredient weight for one box. Mixed ingredients together equal this total.')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {NET_FILLING_PRESETS.map((preset) => {
                      const label = preset >= 1000 ? `${preset / 1000}kg` : `${preset}g`;
                      const isSelected = !isCustomWeight && netFillingGrams === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setIsCustomWeight(false);
                            setNetFillingGrams(preset);
                            setCustomWeightInput(String(preset));
                          }}
                          className={`min-h-11 rounded-xl px-4 py-2 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-[#072A20] focus:outline-none ${
                            isSelected
                              ? 'bg-[#072A20] text-white shadow-sm ring-2 ring-[#D4AF6A]/50 dark:bg-[#E6C786] dark:text-[var(--color-text-primary)]'
                              : 'bg-[var(--color-surface)] dark:bg-[#1f3128] border border-[#D4AF6A]/40 text-[var(--color-text-primary)] dark:text-[#f4edd9] hover:bg-[#D4AF6A]/15'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomWeight(true);
                        const parsed = normalizeNetFillingGrams(customWeightInput);
                        if (parsed && isValidNetFillingGrams(parsed)) {
                          setNetFillingGrams(parsed);
                        } else {
                          setNetFillingGrams(null);
                        }
                      }}
                      className={`min-h-11 rounded-xl px-4 py-2 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-[#072A20] focus:outline-none ${
                        isCustomWeight
                          ? 'bg-[#072A20] text-white shadow-sm ring-2 ring-[#D4AF6A]/50 dark:bg-[#E6C786] dark:text-[var(--color-text-primary)]'
                          : 'bg-[var(--color-surface)] dark:bg-[#1f3128] border border-[#D4AF6A]/40 text-[var(--color-text-primary)] dark:text-[#f4edd9] hover:bg-[#D4AF6A]/15'
                      }`}
                    >
                      {t('quote.customWeight', 'Custom Weight')}
                    </button>
                  </div>

                  {isCustomWeight && (
                    <div className="pt-2 border-t border-[#D4AF6A]/20">
                      <div className="flex items-center gap-2">
                        <label htmlFor="quote-custom-net-weight" className="sr-only">
                          {t('quote.customWeight', 'Custom Weight')}
                        </label>
                        <input
                          id="quote-custom-net-weight"
                          type="number"
                          inputMode="decimal"
                          min={1}
                          max={10000}
                          step="any"
                          placeholder={q('weightPlaceholder')}
                          value={customWeightInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomWeightInput(val);
                            const parsed = normalizeNetFillingGrams(val);
                            if (parsed && isValidNetFillingGrams(parsed)) {
                              setNetFillingGrams(parsed);
                            } else {
                              setNetFillingGrams(null);
                            }
                          }}
                          className="min-h-11 w-36 rounded-xl border border-[#D4AF6A]/60 bg-[var(--color-surface)] dark:bg-[#1f3128] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] dark:text-[#f4edd9] focus:border-[#072A20] dark:focus:border-[#E6C786] focus:outline-none"
                          dir="ltr"
                        />
                        <span className="text-xs font-bold text-[var(--color-text-primary)] dark:text-[#E6C786]">
                          {t('quote.customWeightGrams', 'grams (g)')}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-secondary)] dark:text-[#a3b8af] mt-1.5">
                        {t('quote.customWeightHint', 'Enter requested ingredient grams per box (e.g. 750g or 775g). Box quantity is multiplied separately.')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Quantity & Authoritative MOQ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quote-quantity-input" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-1.5">
                    <Layers size={13} className="inline mr-1 text-[var(--color-accent-text)]" />
                    {q('quantity', { unit: resolution.quantityUnit === 'packs' ? q('packUnit', { count: resolution.piecesPerPack }) : q(resolution.quantityUnit === 'sets' ? 'sets' : 'pieces') })}
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {resolution.quantityUnit === 'packs' ? (
                      [1, 2, 4, 10, 20].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuantity(preset)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                            quantity === preset
                              ? 'bg-[#8C6B1B] text-white'
                              : 'bg-[var(--color-surface)] border border-[#D4AF6A]/40 text-[var(--color-text-primary)] hover:bg-[#D4AF6A]/15'
                          }`}
                        >
                          {q('packPreset', { packs: packCount(preset), pieces: q('pieceCount', { count: preset * resolution.piecesPerPack }) })}
                        </button>
                      ))
                    ) : (
                      QUANTITY_PRESETS.map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuantity(preset)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                            quantity === preset
                              ? 'bg-[#8C6B1B] text-white'
                              : 'bg-[var(--color-surface)] border border-[#D4AF6A]/40 text-[var(--color-text-primary)] hover:bg-[#D4AF6A]/15'
                          }`}
                        >
                          {preset === 500 ? '500+' : q(resolution.quantityUnit === 'sets' ? 'setCount' : 'pieceCount', { count: preset })}
                        </button>
                      ))
                    )}
                  </div>
                  <input
                    id="quote-quantity-input"
                    type="number"
                    min={1}
                    max={10000}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-[var(--color-surface)] px-3.5 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
                  />

                  {/* MOQ Indicator */}
                  <div className="mt-1.5 text-[11px]">
                    {resolution.requiresTeamQuote && !resolution.standardPrice ? (
                      <span className="text-[var(--color-accent-text)] font-medium">
                        {q('reviewMinimum')}
                      </span>
                    ) : resolution.moqRequired != null ? (
                      <div>
                        <span className="text-[var(--color-text-secondary)]">
                          {q('minimum')} <strong>{q('pieceCount', { count: resolution.moqRequired })}</strong>
                          {resolution.minPacksRequired ? ` (${packCount(resolution.minPacksRequired)})` : ''}
                        </span>
                        {resolution.belowMoq && (
                          <span className="block text-amber-800 font-medium mt-0.5">
                            {q('belowMinimum', { count: resolution.moqRequired })}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 4. Event / Occasion Type & Target Event Date */}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="quote-event-type" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-1.5">
                      <Calendar size={13} className="inline mr-1 text-[var(--color-accent-text)]" />
                      {q('event')}
                    </label>
                    <select
                      id="quote-event-type"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full rounded-xl border border-[#D4AF6A]/50 bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text-primary)]"
                    >
                      {eventType && !EVENT_TYPES.some(value => value === eventType) && <option value={eventType}>{eventType}</option>}
                      {EVENT_TYPES.map(ev => (
                        <option key={ev} value={ev}>
                          {eventLabel(ev)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quote-event-date" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                      <Clock size={13} className="inline mr-1 text-[var(--color-accent-text)]" />
                      {q('optionalDate')}
                    </label>
                    <input
                      id="quote-event-date"
                      type="date"
                      value={targetEventDate}
                      onChange={(e) => setTargetEventDate(e.target.value)}
                      className="w-full rounded-xl border border-[#D4AF6A]/50 bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="gift-recipient-field">
                <label htmlFor="quote-gift-recipient">{t('gift.recipientOptional')}</label>
                <select id="quote-gift-recipient" value={giftRecipient} onChange={event => setGiftRecipient(isGiftRecipient(event.target.value) ? event.target.value : '')}>
                  <option value="">{t('gift.recipientAny')}</option>
                  {GIFT_RECIPIENTS.map(value => <option key={value} value={value}>{t(`gift.recipient.${value}`)}</option>)}
                </select>
                <p>{t('gift.recipientNote')}</p>
              </div>

              {/* 10-Calendar-Day Preparation Notice */}
              <div className="rounded-xl border border-[#D4AF6A]/50 bg-[var(--color-base)] p-3 text-xs text-[var(--color-text-primary)] space-y-1.5">
                <div className="flex items-start gap-2">
                  <Clock size={15} className="text-[var(--color-accent-text)] shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">
                    <strong>{q('leadTitle')}</strong> {q('leadNotice')}
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={leadTimeAcknowledged}
                    onChange={(e) => setLeadTimeAcknowledged(e.target.checked)}
                    className="rounded border-[#D4AF6A] text-[var(--color-text-primary)] focus:ring-0"
                  />
                  <span>{q('acknowledge')}</span>
                </label>
              </div>

              {/* 5. Preferred Fillings Selection (when mode !== 'empty') */}
              {mode !== 'empty' && (
                <div className="rounded-2xl border border-[#D4AF6A]/50 bg-[var(--color-surface)] p-3.5 space-y-2.5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                    {q('fillings')}
                  </span>
                  <div className="space-y-1.5">
                    {FILLING_OPTIONS.map(id => (
                      <label key={id} className="flex items-center gap-2 text-xs text-[var(--color-text-primary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferredFillings.includes(id)}
                          onChange={() => toggleFilling(id)}
                          className="rounded border-[#D4AF6A] text-[var(--color-text-primary)] focus:ring-0"
                        />
                        <span>{q(id)}</span>
                      </label>
                    ))}
                  </div>

                  {/* Sourced Fillings Disclaimer */}
                  <div className="rounded-lg bg-[var(--color-base)] p-2.5 text-[11px] text-[var(--color-text-secondary)] border border-[#D4AF6A]/30">
                    <Info size={13} className="inline mr-1 text-[var(--color-accent-text)]" />
                    {q('fillingsNotice')}
                  </div>

                  <div>
                    <label htmlFor="quote-fillings-notes" className="sr-only">{q('fillingsPlaceholder')}</label>
                    <input
                      id="quote-fillings-notes"
                      type="text"
                      placeholder={q('fillingsPlaceholder')}
                      value={customFillingsNotes}
                      onChange={(e) => setCustomFillingsNotes(e.target.value)}
                      className="w-full rounded-xl border border-[#D4AF6A]/40 bg-[var(--color-base)]/50 px-3 py-1.5 text-xs text-[var(--color-text-primary)]"
                    />
                  </div>
                </div>
              )}

              {/* 6. Custom Branding, Monogram & Card Message */}
              <div className="rounded-2xl border border-[#D4AF6A]/50 bg-[var(--color-surface)] p-3.5 space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                  {q('personalization')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="quote-monogram-text" className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1">
                      {q('monogram')}
                    </label>
                    <input
                      id="quote-monogram-text"
                      type="text"
                      placeholder={q('monogramPlaceholder')}
                      value={monogramText}
                      onChange={(e) => setMonogramText(e.target.value)}
                      className="w-full rounded-xl border border-[#D4AF6A]/40 px-3 py-1.5 text-xs text-[var(--color-text-primary)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="quote-card-message" className="block text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1">
                      {q('card')}
                    </label>
                    <input
                      id="quote-card-message"
                      type="text"
                      placeholder={q('cardPlaceholder')}
                      value={cardMessage}
                      onChange={(e) => setCardMessage(e.target.value)}
                      className="w-full rounded-xl border border-[#D4AF6A]/40 px-3 py-1.5 text-xs text-[var(--color-text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="quote-printing-notes" className="sr-only">{q('printingPlaceholder')}</label>
                  <textarea
                    id="quote-printing-notes"
                    rows={2}
                    placeholder={q('printingPlaceholder')}
                    value={customPrinting}
                    onChange={(e) => setCustomPrinting(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/40 px-3 py-2 text-xs text-[var(--color-text-primary)]"
                  />
                </div>

                {/* Artwork Sharing Notice */}
                <div className="flex items-start gap-2 text-[11px] text-[var(--color-text-secondary)] bg-[var(--color-base)] p-2.5 rounded-lg border border-[#D4AF6A]/30">
                  <FileText size={14} className="text-[var(--color-accent-text)] shrink-0 mt-0.5" />
                  <span>
                    {q('artwork')}
                  </span>
                </div>
              </div>

              {/* 7. Target Budget / Offer Price (Bargain Desk) */}
              <div className="rounded-2xl border border-[#D4AF6A]/60 bg-[var(--color-surface)] p-3.5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="quote-target-budget" className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-text)]">
                    <Tag size={13} className="inline mr-1" />
                    {q('targetBudget')}
                  </label>
                  <div className="inline-flex rounded-lg border border-[#D4AF6A]/40 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setBudgetType('total')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        budgetType === 'total' ? 'bg-[#8C6B1B] text-white' : 'text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {q('totalBudget')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBudgetType('per_piece')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        budgetType === 'per_piece' ? 'bg-[#8C6B1B] text-white' : 'text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {q('perPiece')}
                    </button>
                  </div>
                </div>
                {mode === 'filled' && filledEstimate?.ingredientsAvailable && (
                  <div className="rounded-xl bg-[var(--color-base)] border border-[#D4AF6A]/40 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-[var(--color-text-primary)]">
                      <span>{q('recipeEstimate', { count: quantity })}</span>
                      <span>
                        {filledEstimate.estimatedTotalPkr != null
                          ? money(filledEstimate.estimatedTotalPkr)
                          : q('packagingRequired')}
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px] text-[var(--color-text-secondary)] border-t border-[#D4AF6A]/20 pt-1.5">
                      {filledEstimate.ingredientLines.map(line => (
                        <div key={line.productId} className="flex justify-between">
                          <span>{ingredientName(line.productId, line.name_en)} ({q('gramsPerBox', { grams: line.gramsPerBox })}):</span>
                          <span className="font-semibold text-[var(--color-text-primary)]"><bdi>{money(line.estimatePkr)}</bdi></span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold text-[var(--color-text-primary)] border-t border-[#D4AF6A]/20 pt-1">
                        <span>{q('ingredientsSubtotal')}</span>
                        <span><bdi>{filledEstimate.ingredientsSubtotalPkr == null ? '—' : money(filledEstimate.ingredientsSubtotalPkr)}</bdi></span>
                      </div>
                      {filledEstimate.packagingTotalPkr != null && (
                        <div className="flex justify-between font-semibold text-[var(--color-text-primary)]">
                          <span>{q('packagingTotal')}</span>
                          <span><bdi>{money(filledEstimate.packagingTotalPkr)}</bdi></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 py-1 text-xs">
                  <span className="text-[var(--color-text-secondary)]">{q('reference')}</span>
                  {effectiveReferenceRate.requiresTeamQuote || !effectiveReferenceRate.standardPrice ? (
                    <span className="font-semibold text-[var(--color-accent-text)]">{q('teamQuote')}</span>
                  ) : effectiveReferenceRate.isEstimate ? (
                    <span className="font-bold text-[var(--color-text-primary)]">
                      <bdi>{money(Number(effectiveReferenceRate.standardPrice))}</bdi> {q('perBox')}
                      {quantity > 1 && (
                        <span className="text-[11px] font-normal text-[var(--color-text-secondary)] ml-1">
                          {q('estimatedTotal', { amount: money(Number(effectiveReferenceRate.estimatedTotalPkr)) })}
                        </span>
                      )}
                    </span>
                  ) : resolution.quantityUnit === 'packs' ? (
                    <span className="font-bold text-[var(--color-text-primary)]">
                      <bdi>{money(Number(resolution.standardPrice))}</bdi> {q('perPack')}
                      {resolution.perPiecePrice ? (
                        <span className="text-[11px] font-normal text-[var(--color-text-secondary)] ml-1">
                          (<bdi>{money(resolution.perPiecePrice)}</bdi> {q('perPc')})
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="font-bold text-[var(--color-text-primary)]">
                      <bdi>{money(Number(resolution.standardPrice))}</bdi> {q(resolution.quantityUnit === 'sets' ? 'perSet' : 'perPc')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  {q('budgetHint')}
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-accent-text)]">PKR</span>
                  <input
                    id="quote-target-budget"
                    type="number"
                    min={1}
                    placeholder={q('budgetPlaceholder')}
                    value={targetPricePkr}
                    onChange={(e) => setTargetPricePkr(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-[var(--color-base)] pl-12 pr-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] focus:border-[#8C6B1B] focus:outline-none"
                  />
                </div>
              </div>

              {/* 8. Patron Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="quote-customer-name" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                    {q('name')}
                  </label>
                  <input
                    id="quote-customer-name"
                    type="text"
                    required
                    placeholder={q('namePlaceholder')}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label htmlFor="quote-customer-phone" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                    {q('phone')}
                  </label>
                  <input
                    id="quote-customer-phone"
                    type="tel"
                    required
                    placeholder="03160666083"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label htmlFor="quote-customer-city" className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-primary)] mb-1">
                    {q('city')}
                  </label>
                  <input
                    id="quote-customer-city"
                    type="text"
                    placeholder={q('cityPlaceholder')}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#072A20] hover:bg-[#0D3F30] text-[#F7F1E3] font-semibold py-3.5 px-5 shadow-md transition-all text-sm disabled:opacity-60"
                >
                  <ShieldCheck size={18} className="text-[#E6C786]" />
                  {q(submitting ? 'saving' : 'submit')}
                </button>
                <a
                  href={liveUnsavedWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#128C7E] hover:bg-[#0E7266] text-white font-semibold py-3.5 px-5 shadow-md transition-all text-sm"
                >
                  <MessageCircle size={18} />
                  {q('bargain')}
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>, document.body
  );
}
