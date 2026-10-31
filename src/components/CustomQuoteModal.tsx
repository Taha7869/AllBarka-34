import React, { useEffect, useMemo, useState } from 'react';
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
  MANDATORY_LEAD_TIME_NOTICE,
  NON_CATALOG_FILLINGS_DISCLAIMER,
  TABARRUK_EMPTY_DEFAULT_NOTICE,
  formatFillingsLabel,
} from '../lib/inquiryWhatsApp';
import { submitCustomQuoteInquiry } from '../lib/storefrontSubmissions';

export type { CustomQuoteModalInit };

export function openCustomQuoteModal(detail: CustomQuoteModalInit = {}): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<CustomQuoteModalInit>('open-custom-quote-modal', { detail }));
  }
}

const EVENT_TYPES = [
  'Nikkah',
  'Baat Pakki',
  'Umrah / Hajj Tabarruk',
  'Birth Announcement',
  'Corporate & Bulk Gifting',
  'Walima / Barat',
  'Eid / Festive Gifting',
  'Other Celebration',
] as const;

const FILLING_OPTIONS = [
  { id: 'dry_fruits', label: 'AllBarka Luxury Dry Fruits & Roasted Nuts (Almonds, Pistachios, Cashews)' },
  { id: 'dates', label: 'Verified Catalog Dates (Madina Ajwa, Medjool, Panjgur Amber)' },
  { id: 'chocolates', label: 'Chocolates & Artisan Truffles (Custom-sourced on request)' },
  { id: 'candies', label: 'Celebration Candies & Confections (Custom-sourced on request)' },
  { id: 'other', label: 'Special Custom Fillings / Panjeeri / Tea (Sourcing-dependent request)' },
] as const;

const QUANTITY_PRESETS = [25, 50, 100, 200, 300, 500] as const;

export default function CustomQuoteModal() {
  const products = useCatalogProducts();
  const hamperBoxes = useCatalogHamperBoxes();
  const [isOpen, setIsOpen] = useState(false);

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      const initialId = detail.productId || (eligibleProducts[0]?.id ?? '');
      setSelectedProductId(initialId);

      // 3. Reset product-specific variant, occasion, fillings, design text, event date and budget
      // Contact details (customerName, customerPhone, customerEmail, city) remain preserved
      setSelectedVariantLabel(detail.variantLabel || detail.portion || '');
      setMode(detail.mode || 'empty');
      setQuantity(detail.quantity && detail.quantity > 0 ? Math.round(detail.quantity) : 50);
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
        if (fromLabel) initialNetGrams = fromLabel;
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
  }, [eligibleProducts]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        return {
          standardPrice: resolved.unitPrice,
          perPiecePrice: resolved.unitPrice,
          requiresTeamQuote: false,
          isEstimate: true,
          estimatedTotalPkr: resolved.estimatedTotalPkr ?? (resolved.unitPrice * quantity),
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

  const toggleFilling = (fillingId: string) => {
    setPreferredFillings(prev =>
      prev.includes(fillingId) ? prev.filter(f => f !== fillingId) : [...prev, fillingId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMsg('Please enter your name so our concierge can prepare your quote.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      setErrorMsg('Please enter a valid WhatsApp / mobile number (e.g. 03160666083).');
      return;
    }

    if (mode !== 'empty' && isCustomWeight && customWeightInput.trim() !== '') {
      if (netFillingGrams === null || !isValidNetFillingGrams(netFillingGrams)) {
        setErrorMsg('Please enter a valid custom net filling weight between 50g and 5,000g (e.g. 750).');
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
        hamperConfiguration: hamperConfiguration || undefined,
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
    } catch (err: any) {
      // PRESERVE FORM INPUTS and existing submissionKey! Do not generate fake quote ID
      if (err?.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH' || err?.status === 409) {
        setErrorMsg('An inquiry was already recorded with this key under different details. You can start a fresh inquiry or keep your changes.');
      } else {
        setErrorMsg(
          err?.message ||
            'We could not save your inquiry right now due to a temporary storage issue. Your entered details have been preserved below.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[19000] flex items-center justify-center bg-[#042821]/75 p-3 sm:p-5 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-quote-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-[#D4AF6A]/40 bg-[#FAF6EE] text-[#0D2B22] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Luxury Emerald Header */}
        <div className="bg-gradient-to-r from-[#072A20] via-[#0B3B2D] to-[#072A20] px-6 py-5 text-[#F7F1E3] border-b border-[#D4AF6A]/30 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AF6A]/20 border border-[#D4AF6A]/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E6C786] mb-2">
              <Sparkles size={12} /> Bespoke Event & Wholesale Concierge
            </div>
            <h2 id="custom-quote-modal-title" className="font-serif text-xl sm:text-2xl font-bold text-white">
              Request Custom Quote / Bargain Your Price
            </h2>
            <p className="text-xs sm:text-sm text-[#E5DEC9]/85 mt-1">
              Ordering for Nikkah, Baat Pakki, Umrah Tabarruk, or Corporate Events? Specify your configuration & get custom wholesale rates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close Custom Quote Modal"
            className="rounded-full p-2 text-[#E6C786] hover:bg-white/10 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {submittedQuote ? (
            /* SUCCESS CONFIRMATION STATE (Durable persistence confirmed) */
            <div className="rounded-2xl border border-[#1B5E43]/30 bg-white p-6 text-center space-y-4 shadow-sm">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#0B3B2D]/10 text-[#0B3B2D] flex items-center justify-center">
                <CheckCircle2 size={30} className="text-[#127A4D]" />
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#8C6B1B]">
                  Quote Saved & Logged • Ref #{submittedQuote.quoteId}
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#072A20]">
                  Your Custom Request Is Saved!
                </h3>
                <p className="text-sm text-[#3E564D] max-w-lg mx-auto">
                  We have durably logged your inquiry for{' '}
                  <strong>
                    {quantity} × {selectedProduct?.name_en}
                  </strong>{' '}
                  ({mode === 'empty' ? 'Box Only' : mode === 'custom' ? 'Custom Set' : 'Filled with AllBarka Dry Fruits'}). Tap below to continue on WhatsApp with our concierge to finalize your rate and design approvals.
                </p>
              </div>

              {/* Summary Review Card */}
              <div className="rounded-xl bg-[#FAF6EE] border border-[#D4AF6A]/40 p-4 text-left text-xs sm:text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#566B63]">Box / Selection:</span>
                  <span className="font-semibold text-[#072A20]">
                    {selectedProduct?.name_en || (selectedProductId === 'custom' ? 'Custom Packaging Request' : resolution.productName)}
                    {selectedVariantLabel ? ` (${selectedVariantLabel})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#566B63]">Configuration:</span>
                  <span className="font-semibold text-[#072A20]">
                    {mode === 'empty'
                      ? 'Box Only (Empty Packaging)'
                      : mode === 'custom'
                      ? 'Custom Packaging & Sourced Fillings'
                      : 'Filled with AllBarka Dry Fruits'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#566B63]">Quantity & Event:</span>
                  <span className="font-semibold text-[#072A20]">
                    {quantity} pcs • {eventType}
                  </span>
                </div>
                {targetEventDate && (
                  <div className="flex justify-between">
                    <span className="text-[#566B63]">Target Event Date:</span>
                    <span className="font-semibold text-[#072A20]">{targetEventDate}</span>
                  </div>
                )}
                {preferredFillings.length > 0 && mode !== 'empty' && (
                  <div className="flex justify-between">
                    <span className="text-[#566B63]">Fillings Selected:</span>
                    <span className="font-semibold text-[#072A20]">{formatFillingsLabel(preferredFillings)}</span>
                  </div>
                )}
                {monogramText && (
                  <div className="flex justify-between">
                    <span className="text-[#566B63]">Monogram / Tag:</span>
                    <span className="font-semibold text-[#072A20]">{monogramText}</span>
                  </div>
                )}
                {targetPricePkr && (
                  <div className="flex justify-between text-[#8C6B1B] border-t border-[#D4AF6A]/30 pt-1.5">
                    <span className="font-medium">Target Offer / Budget:</span>
                    <span className="font-bold">
                      Rs. {Number(targetPricePkr).toLocaleString()} PKR ({budgetType === 'per_piece' ? 'per piece' : 'total budget'})
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
                  Continue on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setSubmittedQuote(null)}
                  className="rounded-xl border border-[#072A20]/20 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#072A20] hover:bg-[#072A20]/5"
                >
                  Edit Details
                </button>
              </div>

              <p className="text-[11px] text-[#566B63]">
                Note: Opening WhatsApp pre-fills your inquiry message; send it in WhatsApp to connect with our senior pricing concierge.
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
                      <strong className="block font-semibold">Persistence Notice:</strong>
                      <span>{errorMsg}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-200">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-900"
                    >
                      <RefreshCw size={13} className={submitting ? 'animate-spin' : ''} />
                      Retry Saving Quote
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
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white text-amber-900 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100"
                    >
                      Start Fresh Inquiry
                    </button>
                    <a
                      href={liveUnsavedWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#128C7E] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#0E7266]"
                    >
                      <MessageCircle size={13} />
                      Message Concierge on WhatsApp (Unsaved Draft)
                    </a>
                  </div>
                </div>
              )}

              {/* Tabarruk Default Empty Mode Notice */}
              {isTabarruk && (
                <div className="rounded-2xl border border-[#D4AF6A]/60 bg-[#FAF6EE] p-3.5 text-xs text-[#072A20] flex items-start gap-2.5 shadow-xs">
                  <Info size={17} className="text-[#8C6B1B] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-[#8C6B1B] uppercase tracking-wider text-[11px]">
                      Tabarruk Packaging Notice
                    </strong>
                    <span className="text-[12px] leading-relaxed text-[#3E564D]">
                      {TABARRUK_EMPTY_DEFAULT_NOTICE}
                    </span>
                  </div>
                </div>
              )}

              {/* 1. Product & Variant Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="quote-product-select" className="block text-xs font-bold uppercase tracking-wider text-[#072A20] mb-1.5">
                    1. Select Packaging, Gift Box or Deal
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
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3.5 py-2.5 text-sm font-medium text-[#072A20] focus:border-[#072A20] focus:outline-none"
                  >
                    {!eligibleProducts.some(p => p.id === selectedProductId) && (
                      <option value={selectedProductId}>
                        {selectedProductId === 'custom' ? 'Custom Packaging Request' : `Custom Request / Unlisted Product (${selectedProductId})`}
                      </option>
                    )}
                    <optgroup label="Bespoke Celebration Boxes & Packaging">
                      {eligibleProducts
                        .filter(p => p.isBidBox || p.category === 'celebration-boxes')
                        .map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name_en}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Gifts, Deals & Curated Hampers">
                      {eligibleProducts
                        .filter(p => !p.isBidBox && p.category !== 'celebration-boxes')
                        .map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name_en}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label htmlFor="quote-variant-select" className="block text-xs font-bold uppercase tracking-wider text-[#072A20] mb-1.5">
                    Size / Variant
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
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3 py-2.5 text-sm font-medium text-[#072A20] focus:border-[#072A20] focus:outline-none"
                  >
                    <option value="">Default Size / Pack</option>
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
                <span className="block text-xs font-bold uppercase tracking-wider text-[#072A20] mb-1.5">
                  2. Packaging Mode
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('empty')}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      mode === 'empty'
                        ? 'border-[#072A20] bg-[#072A20] text-white shadow-sm'
                        : 'border-[#D4AF6A]/40 bg-white text-[#072A20] hover:border-[#072A20]/50'
                    }`}
                  >
                    <Package size={17} className={mode === 'empty' ? 'text-[#E6C786]' : 'text-[#8C6B1B]'} />
                    <div>
                      <div className="text-xs font-bold">Box Only</div>
                      <div className={`text-[10px] ${mode === 'empty' ? 'text-[#E5DEC9]' : 'text-[#566B63]'}`}>
                        Empty packaging wholesale
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('filled')}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      mode === 'filled'
                        ? 'border-[#072A20] bg-[#072A20] text-white shadow-sm'
                        : 'border-[#D4AF6A]/40 bg-white text-[#072A20] hover:border-[#072A20]/50'
                    }`}
                  >
                    <Gift size={17} className={mode === 'filled' ? 'text-[#E6C786]' : 'text-[#8C6B1B]'} />
                    <div>
                      <div className="text-xs font-bold">Filled with AllBarka</div>
                      <div className={`text-[10px] ${mode === 'filled' ? 'text-[#E5DEC9]' : 'text-[#566B63]'}`}>
                        Fresh nuts &amp; royal dates
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('custom')}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      mode === 'custom'
                        ? 'border-[#072A20] bg-[#072A20] text-white shadow-sm'
                        : 'border-[#D4AF6A]/40 bg-white text-[#072A20] hover:border-[#072A20]/50'
                    }`}
                  >
                    <Sparkles size={17} className={mode === 'custom' ? 'text-[#E6C786]' : 'text-[#8C6B1B]'} />
                    <div>
                      <div className="text-xs font-bold">Custom Sourced</div>
                      <div className={`text-[10px] ${mode === 'custom' ? 'text-[#E5DEC9]' : 'text-[#566B63]'}`}>
                        Chocolates, confections, tea
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2b. Net Filling Weight per Box */}
              {(mode === 'filled' || mode === 'custom') && (
                <div className="rounded-2xl border border-[#D4AF6A]/40 bg-white/80 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#072A20]">
                      Net Filling Weight per Box
                    </label>
                    <span className="text-[11px] text-[#566B63]">
                      Excludes packaging mass
                    </span>
                  </div>
                  <p className="text-[11px] text-[#566B63] leading-relaxed">
                    Select the combined net ingredient weight for one box. Mixed ingredients together equal this total.
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
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-[#072A20] text-white shadow-sm ring-2 ring-[#D4AF6A]/50'
                              : 'bg-white border border-[#D4AF6A]/40 text-[#072A20] hover:bg-[#D4AF6A]/15'
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
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        isCustomWeight
                          ? 'bg-[#072A20] text-white shadow-sm ring-2 ring-[#D4AF6A]/50'
                          : 'bg-white border border-[#D4AF6A]/40 text-[#072A20] hover:bg-[#D4AF6A]/15'
                      }`}
                    >
                      Custom Weight
                    </button>
                  </div>

                  {isCustomWeight && (
                    <div className="pt-2 border-t border-[#D4AF6A]/20">
                      <div className="flex items-center gap-2">
                        <input
                          id="quote-custom-net-weight"
                          type="number"
                          inputMode="decimal"
                          min={50}
                          max={5000}
                          step={50}
                          placeholder="e.g. 750"
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
                          className="w-36 rounded-xl border border-[#D4AF6A]/60 bg-white px-3 py-2 text-sm font-semibold text-[#072A20] focus:border-[#072A20] focus:outline-none"
                          dir="ltr"
                        />
                        <span className="text-xs font-bold text-[#072A20]">grams / box</span>
                      </div>
                      <p className="text-[10px] text-[#566B63] mt-1.5">
                        Enter requested ingredient grams per box (50g – 5,000g). Box quantity is multiplied separately.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Quantity & Authoritative MOQ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quote-quantity-input" className="block text-xs font-bold uppercase tracking-wider text-[#072A20] mb-1.5">
                    <Layers size={13} className="inline mr-1 text-[#8C6B1B]" />
                    3. Quantity ({resolution.quantityUnit === 'packs' ? `Packs — ${resolution.piecesPerPack} pcs/pack` : resolution.quantityUnit === 'sets' ? 'Sets' : 'Boxes / Pieces'})
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
                              : 'bg-white border border-[#D4AF6A]/40 text-[#072A20] hover:bg-[#D4AF6A]/15'
                          }`}
                        >
                          {preset} {preset === 1 ? 'pack' : 'packs'} ({preset * resolution.piecesPerPack} pcs)
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
                              : 'bg-white border border-[#D4AF6A]/40 text-[#072A20] hover:bg-[#D4AF6A]/15'
                          }`}
                        >
                          {preset === 500 ? '500+' : `${preset} ${resolution.quantityUnit === 'sets' ? 'sets' : 'pcs'}`}
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
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3.5 py-2 text-sm font-semibold text-[#072A20]"
                  />

                  {/* MOQ Indicator */}
                  <div className="mt-1.5 text-[11px]">
                    {resolution.requiresTeamQuote && !resolution.standardPrice ? (
                      <span className="text-[#8C6B1B] font-medium">
                        • Pricing &amp; minimums subject to concierge review (Custom / unpriced configuration)
                      </span>
                    ) : resolution.moqRequired != null ? (
                      <div>
                        <span className="text-[#566B63]">
                          • Authoritative Minimum: <strong>{resolution.moqRequired} pcs</strong>
                          {resolution.minPacksRequired ? ` (${resolution.minPacksRequired} pack${resolution.minPacksRequired > 1 ? 's' : ''})` : ''}
                        </span>
                        {resolution.belowMoq && (
                          <span className="block text-amber-800 font-medium mt-0.5">
                            Order is below standard minimum ({resolution.moqRequired} pcs). Small-batch review requested.
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 4. Event / Occasion Type & Target Event Date */}
                <div className="space-y-3">
                  <div>
                    <label htmlFor="quote-event-type" className="block text-xs font-bold uppercase tracking-wider text-[#072A20] mb-1.5">
                      <Calendar size={13} className="inline mr-1 text-[#8C6B1B]" />
                      4. Event / Occasion
                    </label>
                    <select
                      id="quote-event-type"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3.5 py-2 text-sm font-medium text-[#072A20]"
                    >
                      {EVENT_TYPES.map(ev => (
                        <option key={ev} value={ev}>
                          {ev}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quote-event-date" className="block text-xs font-bold uppercase tracking-wider text-[#072A20] mb-1">
                      <Clock size={13} className="inline mr-1 text-[#8C6B1B]" />
                      Target Event Date (Optional)
                    </label>
                    <input
                      id="quote-event-date"
                      type="date"
                      value={targetEventDate}
                      onChange={(e) => setTargetEventDate(e.target.value)}
                      className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3 py-1.5 text-xs text-[#072A20]"
                    />
                  </div>
                </div>
              </div>

              {/* 10-Calendar-Day Preparation Notice */}
              <div className="rounded-xl border border-[#D4AF6A]/50 bg-[#FAF6EE] p-3 text-xs text-[#072A20] space-y-1.5">
                <div className="flex items-start gap-2">
                  <Clock size={15} className="text-[#8C6B1B] shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">
                    <strong>Lead Time Notice:</strong> {MANDATORY_LEAD_TIME_NOTICE}
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1 text-[11px] font-medium text-[#566B63]">
                  <input
                    type="checkbox"
                    checked={leadTimeAcknowledged}
                    onChange={(e) => setLeadTimeAcknowledged(e.target.checked)}
                    className="rounded border-[#D4AF6A] text-[#072A20] focus:ring-0"
                  />
                  <span>I acknowledge the required 10-calendar-day preparation lead time</span>
                </label>
              </div>

              {/* 5. Preferred Fillings Selection (when mode !== 'empty') */}
              {mode !== 'empty' && (
                <div className="rounded-2xl border border-[#D4AF6A]/50 bg-white p-3.5 space-y-2.5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#072A20]">
                    5. Preferred Fillings &amp; Inclusions
                  </span>
                  <div className="space-y-1.5">
                    {FILLING_OPTIONS.map(opt => (
                      <label key={opt.id} className="flex items-center gap-2 text-xs text-[#072A20] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferredFillings.includes(opt.id)}
                          onChange={() => toggleFilling(opt.id)}
                          className="rounded border-[#D4AF6A] text-[#072A20] focus:ring-0"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Sourced Fillings Disclaimer */}
                  <div className="rounded-lg bg-[#FAF6EE] p-2.5 text-[11px] text-[#566B63] border border-[#D4AF6A]/30">
                    <Info size={13} className="inline mr-1 text-[#8C6B1B]" />
                    {NON_CATALOG_FILLINGS_DISCLAIMER}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Special fillings notes (e.g. 50g Ajwa + 50g Irani Pistachio per box)..."
                      value={customFillingsNotes}
                      onChange={(e) => setCustomFillingsNotes(e.target.value)}
                      className="w-full rounded-xl border border-[#D4AF6A]/40 bg-[#FAF6EE]/50 px-3 py-1.5 text-xs text-[#072A20]"
                    />
                  </div>
                </div>
              )}

              {/* 6. Custom Branding, Monogram & Card Message */}
              <div className="rounded-2xl border border-[#D4AF6A]/50 bg-white p-3.5 space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-[#072A20]">
                  6. Monogram, Name Tag &amp; Custom Message
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="quote-monogram-text" className="block text-[11px] font-semibold text-[#566B63] mb-1">
                      Couple / Baby / Corporate Name Tag
                    </label>
                    <input
                      id="quote-monogram-text"
                      type="text"
                      placeholder="e.g. Ahmed &amp; Ayesha"
                      value={monogramText}
                      onChange={(e) => setMonogramText(e.target.value)}
                      className="w-full rounded-xl border border-[#D4AF6A]/40 px-3 py-1.5 text-xs text-[#072A20]"
                    />
                  </div>
                  <div>
                    <label htmlFor="quote-card-message" className="block text-[11px] font-semibold text-[#566B63] mb-1">
                      Ribbon or Card Greeting Message
                    </label>
                    <input
                      id="quote-card-message"
                      type="text"
                      placeholder="e.g. JazakAllah Khair for celebrating with us"
                      value={cardMessage}
                      onChange={(e) => setCardMessage(e.target.value)}
                      className="w-full rounded-xl border border-[#D4AF6A]/40 px-3 py-1.5 text-xs text-[#072A20]"
                    />
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="Additional design preferences (e.g. Emerald ribbon, gold foil calligraphy, specific box colors)..."
                    value={customPrinting}
                    onChange={(e) => setCustomPrinting(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/40 px-3 py-2 text-xs text-[#072A20]"
                  />
                </div>

                {/* Artwork Sharing Notice */}
                <div className="flex items-start gap-2 text-[11px] text-[#566B63] bg-[#FAF6EE] p-2.5 rounded-lg border border-[#D4AF6A]/30">
                  <FileText size={14} className="text-[#8C6B1B] shrink-0 mt-0.5" />
                  <span>
                    Need custom logo or monogram printing? Share your high-resolution artwork or vector file directly with our concierge on WhatsApp after submitting.
                  </span>
                </div>
              </div>

              {/* 7. Target Budget / Offer Price (Bargain Desk) */}
              <div className="rounded-2xl border border-[#D4AF6A]/60 bg-white p-3.5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="quote-target-budget" className="text-xs font-bold uppercase tracking-wider text-[#8C6B1B]">
                    <Tag size={13} className="inline mr-1" />
                    7. Your Target Budget / Offer Price (PKR)
                  </label>
                  <div className="inline-flex rounded-lg border border-[#D4AF6A]/40 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setBudgetType('total')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        budgetType === 'total' ? 'bg-[#8C6B1B] text-white' : 'text-[#566B63]'
                      }`}
                    >
                      Total Budget
                    </button>
                    <button
                      type="button"
                      onClick={() => setBudgetType('per_piece')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        budgetType === 'per_piece' ? 'bg-[#8C6B1B] text-white' : 'text-[#566B63]'
                      }`}
                    >
                      Per Piece
                    </button>
                  </div>
                </div>
                {mode === 'filled' && filledEstimate?.ingredientsAvailable && (
                  <div className="rounded-xl bg-[#FAF6EE] border border-[#D4AF6A]/40 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-[#072A20]">
                      <span>Recipe Estimate ({quantity} boxes):</span>
                      <span>
                        {filledEstimate.estimatedTotalPkr != null
                          ? `Rs. ${filledEstimate.estimatedTotalPkr.toLocaleString()}`
                          : 'Packaging Quote Required'}
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px] text-[#566B63] border-t border-[#D4AF6A]/20 pt-1.5">
                      {filledEstimate.ingredientLines.map(line => (
                        <div key={line.productId} className="flex justify-between">
                          <span>{line.name_en} ({line.gramsPerBox}g/box):</span>
                          <span className="font-semibold text-[#072A20]">Rs. {line.estimatePkr.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold text-[#072A20] border-t border-[#D4AF6A]/20 pt-1">
                        <span>Ingredients Subtotal:</span>
                        <span>Rs. {filledEstimate.ingredientsSubtotalPkr?.toLocaleString()}</span>
                      </div>
                      {filledEstimate.packagingTotalPkr != null && (
                        <div className="flex justify-between font-semibold text-[#072A20]">
                          <span>Packaging Total:</span>
                          <span>Rs. {filledEstimate.packagingTotalPkr.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 py-1 text-xs">
                  <span className="text-[#566B63]">Catalog Reference Rate:</span>
                  {effectiveReferenceRate.requiresTeamQuote || !effectiveReferenceRate.standardPrice ? (
                    <span className="font-semibold text-[#8C6B1B]">Custom Quote on Request (Team Review)</span>
                  ) : effectiveReferenceRate.isEstimate ? (
                    <span className="font-bold text-[#072A20]">
                      Rs. {Number(effectiveReferenceRate.standardPrice).toLocaleString()} / box
                      {quantity > 1 && (
                        <span className="text-[11px] font-normal text-[#566B63] ml-1">
                          (Est. Rs. {Number(effectiveReferenceRate.estimatedTotalPkr).toLocaleString()} total)
                        </span>
                      )}
                    </span>
                  ) : resolution.quantityUnit === 'packs' ? (
                    <span className="font-bold text-[#072A20]">
                      Rs. {Number(resolution.standardPrice).toLocaleString()} / pack
                      {resolution.perPiecePrice ? (
                        <span className="text-[11px] font-normal text-[#566B63] ml-1">
                          (Rs. {resolution.perPiecePrice} / pc)
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="font-bold text-[#072A20]">
                      Rs. {Number(resolution.standardPrice).toLocaleString()} / {resolution.quantityUnit === 'sets' ? 'set' : 'pc'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#566B63]">
                  Pitch your target budget in PKR. Our senior concierge actively reviews and accommodates reasonable bulk offers for family and corporate events.
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8C6B1B]">PKR</span>
                  <input
                    id="quote-target-budget"
                    type="number"
                    min={1}
                    placeholder={
                      effectiveReferenceRate.standardPrice
                        ? budgetType === 'total'
                          ? `e.g. ${Math.round(effectiveReferenceRate.standardPrice * quantity * 0.9)} (Target total PKR)`
                          : `e.g. ${Math.round(effectiveReferenceRate.standardPrice * 0.9)} (Target ${effectiveReferenceRate.isEstimate ? 'per box' : resolution.quantityUnit === 'packs' ? 'per pack' : 'per piece'} PKR)`
                        : `Target offer in PKR`
                    }
                    value={targetPricePkr}
                    onChange={(e) => setTargetPricePkr(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-[#FAF6EE]/60 pl-12 pr-4 py-2 text-sm font-semibold text-[#072A20] focus:border-[#8C6B1B] focus:outline-none"
                  />
                </div>
              </div>

              {/* 8. Patron Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="quote-customer-name" className="block text-[11px] font-bold uppercase tracking-wider text-[#072A20] mb-1">
                    Your Name *
                  </label>
                  <input
                    id="quote-customer-name"
                    type="text"
                    required
                    placeholder="Full Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3 py-2 text-sm text-[#072A20]"
                  />
                </div>
                <div>
                  <label htmlFor="quote-customer-phone" className="block text-[11px] font-bold uppercase tracking-wider text-[#072A20] mb-1">
                    WhatsApp / Phone *
                  </label>
                  <input
                    id="quote-customer-phone"
                    type="tel"
                    required
                    placeholder="03160666083"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3 py-2 text-sm text-[#072A20]"
                  />
                </div>
                <div>
                  <label htmlFor="quote-customer-city" className="block text-[11px] font-bold uppercase tracking-wider text-[#072A20] mb-1">
                    Delivery City
                  </label>
                  <input
                    id="quote-customer-city"
                    type="text"
                    placeholder="Lahore, Islamabad..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3 py-2 text-sm text-[#072A20]"
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
                  {submitting ? 'Saving Custom Quote...' : 'Submit & Save Custom Quote'}
                </button>
                <a
                  href={liveUnsavedWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#128C7E] hover:bg-[#0E7266] text-white font-semibold py-3.5 px-5 shadow-md transition-all text-sm"
                >
                  <MessageCircle size={18} />
                  Bargain on WhatsApp
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
