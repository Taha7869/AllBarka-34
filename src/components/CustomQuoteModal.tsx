import React, { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Package, Gift, MessageCircle, CheckCircle2, Tag, Calendar, Layers, ShieldCheck } from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { Product } from '../types';

export interface CustomQuoteModalInit {
  productId?: string;
  mode?: 'empty' | 'filled';
  quantity?: number;
  eventType?: string;
  targetUnitPrice?: number;
}

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
  'Corporate',
  'Walima / Barat',
  'Eid / Festive Gifting',
] as const;

const QUANTITY_PRESETS = [25, 50, 100, 200, 300, 500] as const;

function buildWhatsAppQuoteUrl(params: {
  quoteId?: string;
  productName: string;
  productId: string;
  mode: 'empty' | 'filled';
  quantity: number;
  eventType: string;
  targetPricePkr: string;
  referenceUnitPrice: number;
  customPrinting: string;
  customerName: string;
  customerPhone: string;
  city: string;
}): string {
  const modeLabel = params.mode === 'empty'
    ? 'Box Only (Empty Packaging)'
    : 'Filled with AllBarka Dry Fruits';
  const lines = [
    `*Assalam-o-Alaikum AllBarka Concierge!*`,
    `I would like a *Custom Quote / Bargain Rate* for my event:`,
    params.quoteId ? `• *Quote Ref:* ${params.quoteId}` : '',
    `• *Selected Box / Deal:* ${params.productName} (${params.productId})`,
    `• *Box Mode:* ${modeLabel}`,
    `• *Quantity:* ${params.quantity} boxes`,
    `• *Event Type:* ${params.eventType}`,
    `• *Standard Rate Ref:* Rs. ${params.referenceUnitPrice.toLocaleString()}/box`,
    params.targetPricePkr ? `• *My Target Offer / Budget:* Rs. ${Number(params.targetPricePkr).toLocaleString()} PKR` : '',
    params.customPrinting ? `• *Custom Printing / Name Tag / Notes:* ${params.customPrinting}` : '',
    params.customerName ? `• *Name:* ${params.customerName}` : '',
    params.customerPhone ? `• *Phone:* ${params.customerPhone}` : '',
    params.city ? `• *City:* ${params.city}` : '',
    ``,
    `Please share your best final rate and customization options.`,
  ].filter(Boolean);

  return `https://wa.me/923160666083?text=${encodeURIComponent(lines.join('\n'))}`;
}

export default function CustomQuoteModal() {
  const products = useCatalogProducts();
  const [isOpen, setIsOpen] = useState(false);

  const eligibleProducts = useMemo(() => {
    const bidBoxes = products.filter(p => p.isBidBox);
    const dealsAndBundles = products.filter(
      p => !p.isBidBox && (p.category === 'gift-boxes' || p.category === 'bundles' || p.isBundle)
    );
    return [...bidBoxes, ...dealsAndBundles];
  }, [products]);

  const [selectedProductId, setSelectedProductId] = useState<string>('bid-box-umrah-tabarruk');
  const [mode, setMode] = useState<'empty' | 'filled'>('Filled'.toLowerCase() as 'empty' | 'filled');
  const [quantity, setQuantity] = useState<number>(50);
  const [eventType, setEventType] = useState<string>('Nikkah');
  const [customPrinting, setCustomPrinting] = useState<string>('');
  const [targetPricePkr, setTargetPricePkr] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [city, setCity] = useState<string>('Lahore');

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
      const defaultId = detail.productId && eligibleProducts.some(p => p.id === detail.productId)
        ? detail.productId
        : eligibleProducts[0]?.id || 'bid-box-umrah-tabarruk';
      setSelectedProductId(defaultId);
      setMode(detail.mode || 'empty');
      setQuantity(detail.quantity && detail.quantity > 0 ? detail.quantity : 50);
      if (detail.eventType) setEventType(detail.eventType);
      if (detail.targetUnitPrice) setTargetPricePkr(String(detail.targetUnitPrice));
      setSubmittedQuote(null);
      setErrorMsg(null);
      setIsOpen(true);
    };

    window.addEventListener('open-custom-quote-modal', handleOpen);
    return () => window.removeEventListener('open-custom-quote-modal', handleOpen);
  }, [eligibleProducts]);

  const selectedProduct: Product | undefined = useMemo(
    () => eligibleProducts.find(p => p.id === selectedProductId) || eligibleProducts[0],
    [eligibleProducts, selectedProductId]
  );

  const referenceUnitPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    const cfg = selectedProduct.bidBoxConfig;
    if (cfg) {
      if (mode === 'empty') {
        if (quantity >= 100) return cfg.emptyBulk100Unit;
        if (quantity >= 50) return cfg.emptyBulk50Unit;
        if (quantity >= 25) return cfg.emptyTiers.find(t => t.qty === 25)?.unitPrice || cfg.emptyUnitStarting;
        return cfg.emptyUnitStarting;
      }
      return cfg.filledMin;
    }
    const firstPrice = Object.values(selectedProduct.prices || {})[0];
    return typeof firstPrice === 'number' ? firstPrice : 1500;
  }, [selectedProduct, mode, quantity]);

  if (!isOpen) return null;

  const liveWhatsAppUrl = buildWhatsAppQuoteUrl({
    quoteId: submittedQuote?.quoteId,
    productName: selectedProduct?.name_en || 'Custom Bid Box / Gift Selection',
    productId: selectedProduct?.id || selectedProductId,
    mode,
    quantity,
    eventType,
    targetPricePkr,
    referenceUnitPrice,
    customPrinting,
    customerName,
    customerPhone,
    city,
  });

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

    setSubmitting(true);
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct?.id || selectedProductId,
          productName: selectedProduct?.name_en || 'Custom Bid Box',
          mode,
          quantity,
          eventType,
          customPrinting: customPrinting.trim(),
          targetPricePkr: targetPricePkr ? Number(targetPricePkr) : null,
          referenceUnitPrice,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          city: city.trim() || 'Lahore',
        }),
      });
      const data = await response.json().catch(() => null);
      const quoteId = data?.quoteId || `ABQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const whatsappUrl = data?.whatsappUrl || buildWhatsAppQuoteUrl({
        quoteId,
        productName: selectedProduct?.name_en || 'Custom Bid Box',
        productId: selectedProduct?.id || selectedProductId,
        mode,
        quantity,
        eventType,
        targetPricePkr,
        referenceUnitPrice,
        customPrinting,
        customerName,
        customerPhone,
        city,
      });
      setSubmittedQuote({ quoteId, whatsappUrl });
    } catch {
      const fallbackId = `ABQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      setSubmittedQuote({
        quoteId: fallbackId,
        whatsappUrl: buildWhatsAppQuoteUrl({
          quoteId: fallbackId,
          productName: selectedProduct?.name_en || 'Custom Bid Box',
          productId: selectedProduct?.id || selectedProductId,
          mode,
          quantity,
          eventType,
          targetPricePkr,
          referenceUnitPrice,
          customPrinting,
          customerName,
          customerPhone,
          city,
        }),
      });
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
              Ordering for Nikkah, Baat Pakki, Umrah Tabarruk, or Corporate Events? Pitch your target budget & get custom wholesale rates.
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
            <div className="rounded-2xl border border-[#1B5E43]/30 bg-white p-6 text-center space-y-4 shadow-sm">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#0B3B2D]/10 text-[#0B3B2D] flex items-center justify-center">
                <CheckCircle2 size={30} className="text-[#127A4D]" />
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#8C6B1B]">
                  Quote Logged • Ref #{submittedQuote.quoteId}
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#072A20]">
                  Your Custom Offer Is Ready for Instant WhatsApp Review!
                </h3>
                <p className="text-sm text-[#3E564D] max-w-lg mx-auto">
                  We have saved your request for <strong>{quantity} × {selectedProduct?.name_en}</strong> ({mode === 'empty' ? 'Empty Boxes' : 'Filled with AllBarka Dry Fruits'}). Tap below to send directly to our senior pricing desk on WhatsApp for immediate bargain confirmation.
                </p>
              </div>

              <div className="rounded-xl bg-[#FAF6EE] border border-[#D4AF6A]/40 p-4 text-left text-xs sm:text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#566B63]">Box / Package:</span>
                  <span className="font-semibold text-[#072A20]">{selectedProduct?.name_en}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#566B63]">Configuration:</span>
                  <span className="font-semibold text-[#072A20]">{mode === 'empty' ? 'Box Only (Empty Packaging)' : 'Filled with AllBarka Dry Fruits'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#566B63]">Quantity & Event:</span>
                  <span className="font-semibold text-[#072A20]">{quantity} pcs • {eventType}</span>
                </div>
                {targetPricePkr && (
                  <div className="flex justify-between text-[#8C6B1B]">
                    <span className="font-medium">Your Target Budget / Offer:</span>
                    <span className="font-bold">Rs. {Number(targetPricePkr).toLocaleString()} PKR</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={submittedQuote.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#128C7E] hover:bg-[#0E7266] text-white font-semibold py-3.5 px-6 shadow-lg transition-all text-sm sm:text-base"
                >
                  <MessageCircle size={19} />
                  Send Quote Request on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setSubmittedQuote(null)}
                  className="rounded-xl border border-[#072A20]/20 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#072A20] hover:bg-[#072A20]/5"
                >
                  Edit Details
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
                  {errorMsg}
                </div>
              )}

              {/* 1. Select Box or Deal */}
              <div>
                <label htmlFor="quote-product-select" className="block text-xs font-bold uppercase tracking-wider text-[#072A20] mb-1.5">
                  1. Select Bid Box, Gift Box or Value Deal
                </label>
                <select
                  id="quote-product-select"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3.5 py-2.5 text-sm font-medium text-[#072A20] focus:border-[#072A20] focus:outline-none"
                >
                  <optgroup label="Bespoke Bid Boxes & Celebration Favors">
                    {eligibleProducts.filter(p => p.isBidBox).map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name_en} — Empty from Rs. {product.bidBoxConfig?.emptyUnitStarting} | Filled from Rs. {product.bidBoxConfig?.filledMin}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Deals, Hampers & Value Packages">
                    {eligibleProducts.filter(p => !p.isBidBox).map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name_en}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* 2. Mode Toggle: Empty vs Filled */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-[#072A20] mb-1.5">
                  2. Packaging Mode
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMode('empty')}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      mode === 'empty'
                        ? 'border-[#072A20] bg-[#072A20] text-white shadow-sm'
                        : 'border-[#D4AF6A]/40 bg-white text-[#072A20] hover:border-[#072A20]/50'
                    }`}
                  >
                    <Package size={18} className={mode === 'empty' ? 'text-[#E6C786]' : 'text-[#8C6B1B]'} />
                    <div>
                      <div className="text-xs font-bold">Box Only (Empty Packaging)</div>
                      <div className={`text-[11px] ${mode === 'empty' ? 'text-[#E5DEC9]' : 'text-[#566B63]'}`}>
                        Wholesale empty boxes with tiered discounts
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('filled')}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      mode === 'filled'
                        ? 'border-[#072A20] bg-[#072A20] text-white shadow-sm'
                        : 'border-[#D4AF6A]/40 bg-white text-[#072A20] hover:border-[#072A20]/50'
                    }`}
                  >
                    <Gift size={18} className={mode === 'filled' ? 'text-[#E6C786]' : 'text-[#8C6B1B]'} />
                    <div>
                      <div className="text-xs font-bold">Filled with AllBarka Dry Fruits</div>
                      <div className={`text-[11px] ${mode === 'filled' ? 'text-[#E5DEC9]' : 'text-[#566B63]'}`}>
                        Freshly packed nuts, dates, chocolates & Zamzam
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. Quantity & Event Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quote-quantity-input" className="block text-xs font-bold uppercase tracking-wider text-[#072A20] mb-1.5">
                    <Layers size={13} className="inline mr-1 text-[#8C6B1B]" />
                    3. Quantity (Boxes / Packs)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {QUANTITY_PRESETS.map(preset => (
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
                        {preset === 500 ? '500+' : `${preset} pcs`}
                      </button>
                    ))}
                  </div>
                  <input
                    id="quote-quantity-input"
                    type="number"
                    min={5}
                    max={10000}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 10))}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3.5 py-2 text-sm font-semibold text-[#072A20]"
                  />
                </div>

                <div>
                  <label htmlFor="quote-event-type" className="block text-xs font-bold uppercase tracking-wider text-[#072A20] mb-1.5">
                    <Calendar size={13} className="inline mr-1 text-[#8C6B1B]" />
                    4. Event / Occasion Type
                  </label>
                  <select
                    id="quote-event-type"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3.5 py-2.5 text-sm font-medium text-[#072A20]"
                  >
                    {EVENT_TYPES.map(ev => (
                      <option key={ev} value={ev}>{ev}</option>
                    ))}
                  </select>
                  <div className="mt-2 rounded-lg bg-[#072A20]/5 border border-[#D4AF6A]/30 px-3 py-2 text-xs text-[#072A20]">
                    Standard Tier Rate: <strong>Rs. {referenceUnitPrice.toLocaleString()}/box</strong>
                    <span className="block text-[11px] text-[#566B63]">
                      Est. Standard Total ({quantity} pcs): Rs. {(referenceUnitPrice * quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Target Budget / Offer Price (Bargain) */}
              <div className="rounded-2xl border border-[#D4AF6A]/60 bg-white p-3.5 shadow-sm">
                <label htmlFor="quote-target-budget" className="block text-xs font-bold uppercase tracking-wider text-[#8C6B1B] mb-1">
                  <Tag size={13} className="inline mr-1" />
                  5. Your Target Budget / Offer Price (PKR) — Bargain With Us
                </label>
                <p className="text-[11px] text-[#566B63] mb-2">
                  Enter your target total budget or target offer in PKR. Our team actively matches reasonable bulk offers for weddings & family events.
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8C6B1B]">PKR</span>
                  <input
                    id="quote-target-budget"
                    type="number"
                    min={100}
                    placeholder={`e.g. ${Math.round(referenceUnitPrice * quantity * 0.9)} (Total target budget in PKR)`}
                    value={targetPricePkr}
                    onChange={(e) => setTargetPricePkr(e.target.value)}
                    className="w-full rounded-xl border border-[#D4AF6A]/50 bg-[#FAF6EE]/60 pl-12 pr-4 py-2.5 text-sm font-semibold text-[#072A20] focus:border-[#8C6B1B] focus:outline-none"
                  />
                </div>
              </div>

              {/* 6. Custom Printing / Name Tags */}
              <div>
                <label htmlFor="quote-custom-printing" className="block text-xs font-bold uppercase tracking-wider text-[#072A20] mb-1">
                  6. Custom Printing, Couple Name Tag or Dry Fruit Preferences (Optional)
                </label>
                <textarea
                  id="quote-custom-printing"
                  rows={2}
                  placeholder="e.g. Gold foil tag 'Ahmed & Ayesha Nikkah', Baby Boy blue ribbon, or 250g Pista + Badam + Ajwa mix..."
                  value={customPrinting}
                  onChange={(e) => setCustomPrinting(e.target.value)}
                  className="w-full rounded-xl border border-[#D4AF6A]/50 bg-white px-3.5 py-2 text-sm text-[#072A20] focus:border-[#072A20] focus:outline-none"
                />
              </div>

              {/* 7. Customer Contact Info */}
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
                    placeholder="Lahore, Islamabad, Karachi..."
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
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#072A20] hover:bg-[#0D3F30] text-[#F7F1E3] font-semibold py-3.5 px-5 shadow-md transition-all text-sm"
                >
                  <ShieldCheck size={18} className="text-[#E6C786]" />
                  {submitting ? 'Saving Quote Request...' : 'Submit & Lock Custom Quote'}
                </button>
                <a
                  href={liveWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#128C7E] hover:bg-[#0E7266] text-white font-semibold py-3.5 px-5 shadow-md transition-all text-sm"
                >
                  <MessageCircle size={18} />
                  Bargain Directly on WhatsApp
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
