import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Gift, Sparkles, ShoppingBag, MessageSquareQuote, Eye, Check } from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useCart } from '../contexts/CartContext';
import { Product } from '../types';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { openCustomQuoteModal } from './CustomQuoteModal';

interface BidBoxesSectionProps {
  onQuickView?: (product: Product) => void;
  compact?: boolean;
}

export default function BidBoxesSection({ onQuickView, compact = false }: BidBoxesSectionProps) {
  const products = useCatalogProducts();
  const { addToCart, setIsCartOpen } = useCart();
  const mediaCover = useProductMediaCover();

  const bidBoxes = useMemo(
    () => products.filter(product => product.isBidBox && product.active !== false),
    [products]
  );

  // Global default mode toggle ("empty" vs "filled"), plus per-card overrides
  const [globalMode, setGlobalMode] = useState<'empty' | 'filled'>('filled');
  const [cardModes, setCardModes] = useState<Record<string, 'empty' | 'filled'>>({});
  const [selectedEmptyTierIdx, setSelectedEmptyTierIdx] = useState<Record<string, number>>({});
  const [selectedFilledIdx, setSelectedFilledIdx] = useState<Record<string, number>>({});
  const [addedId, setAddedId] = useState<string | null>(null);

  if (bidBoxes.length === 0) return null;

  const getMode = (id: string): 'empty' | 'filled' => cardModes[id] ?? globalMode;

  const handleGlobalModeChange = (nextMode: 'empty' | 'filled') => {
    setGlobalMode(nextMode);
    setCardModes({});
  };

  const handleAddBidBox = (product: Product) => {
    const cfg = product.bidBoxConfig;
    const mode = getMode(product.id);
    let variantKey = Object.keys(product.prices)[0] || 'Empty Box (1 pc)';
    let unitPrice = product.prices[variantKey] || 0;

    if (cfg) {
      if (mode === 'empty') {
        const tierIndex = selectedEmptyTierIdx[product.id] ?? 0;
        const tier = cfg.emptyTiers[tierIndex] || cfg.emptyTiers[0];
        if (tier) {
          variantKey = tier.variantKey;
          unitPrice = product.prices[variantKey] ?? tier.packPrice;
        }
      } else {
        const filledIndex = selectedFilledIdx[product.id] ?? 0;
        const filledOpt = cfg.filledOptions[filledIndex] || cfg.filledOptions[0];
        if (filledOpt) {
          variantKey = filledOpt.variantKey;
          unitPrice = product.prices[variantKey] ?? filledOpt.price;
        }
      }
    }

    addToCart(product, variantKey, 1);

    setAddedId(product.id);
    setTimeout(() => setAddedId(prev => (prev === product.id ? null : prev)), 1600);
    setIsCartOpen(true);
  };

  return (
    <section
      id="bespoke-bid-boxes"
      aria-labelledby="bespoke-bid-boxes-heading"
      className={`w-full ${compact ? 'py-10' : 'py-16 sm:py-24'} bg-gradient-to-b from-[#FAF6EE] via-[#F5EFE2] to-[#FAF6EE] border-y border-[#D4AF6A]/25`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#072A20] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#E6C786] mb-3 shadow-sm">
              <Sparkles size={13} /> Shadi, Nikkah, Umrah & Celebration Favors
            </div>
            <h2
              id="bespoke-bid-boxes-heading"
              className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#072A20] leading-tight"
            >
              Bespoke Bid Boxes &amp; Celebration Favors
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#3E564D] leading-relaxed">
              Order <strong>Empty Packaging Boxes</strong> with automatic wholesale quantity discounts (50+ &amp; 100+ pcs), or choose <strong>Filled with AllBarka Dry Fruits</strong> freshly sealed with custom family name tags. Need 100–500+ boxes? Pitch your target budget and bargain directly with our concierge.
            </p>
          </div>

          {/* Global Mode Switcher + Direct Bargain CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div
              className="inline-flex rounded-2xl border border-[#D4AF6A]/50 bg-white p-1 shadow-sm"
              role="group"
              aria-label="Global Bid Box Mode Switcher"
            >
              <button
                type="button"
                onClick={() => handleGlobalModeChange('empty')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  globalMode === 'empty'
                    ? 'bg-[#072A20] text-[#F7F1E3] shadow-sm'
                    : 'text-[#072A20] hover:bg-[#072A20]/5'
                }`}
              >
                <Package size={14} className={globalMode === 'empty' ? 'text-[#E6C786]' : 'text-[#8C6B1B]'} />
                Empty Boxes (Bulk Tiers)
              </button>
              <button
                type="button"
                onClick={() => handleGlobalModeChange('filled')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  globalMode === 'filled'
                    ? 'bg-[#072A20] text-[#F7F1E3] shadow-sm'
                    : 'text-[#072A20] hover:bg-[#072A20]/5'
                }`}
              >
                <Gift size={14} className={globalMode === 'filled' ? 'text-[#E6C786]' : 'text-[#8C6B1B]'} />
                Filled with Dry Fruits
              </button>
            </div>

            <button
              type="button"
              onClick={() => openCustomQuoteModal({ mode: globalMode, quantity: 100 })}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8C6B1B] hover:bg-[#735613] text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md transition-all"
            >
              <MessageSquareQuote size={15} />
              Bargain Bulk Quote
            </button>
          </div>
        </div>

        {/* 8 Bid Boxes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bidBoxes.map(product => {
            const cfg = product.bidBoxConfig;
            if (!cfg) return null;
            const mode = getMode(product.id);
            const emptyTierIdx = selectedEmptyTierIdx[product.id] ?? 2; // Default highlight 50 pcs (-10%) in empty mode
            const activeEmptyTier = cfg.emptyTiers[emptyTierIdx] || cfg.emptyTiers[0];
            const filledIdx = selectedFilledIdx[product.id] ?? 0;
            const activeFilledOpt = cfg.filledOptions[filledIdx] || cfg.filledOptions[0];

            const cover = mediaCover(product) || product.image || '/images/generated/gift-box-1.webp';

            return (
              <article
                key={product.id}
                className="group relative flex flex-col rounded-3xl border border-[#D4AF6A]/35 bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Image Header */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4EFE4]">
                  <Link to={`/product/${product.id}`} className="block w-full h-full">
                    <img
                      src={cover}
                      alt={product.name_en}
                      loading="lazy"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#072A20]/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#E6C786]">
                      {cfg.occasionTag}
                    </span>
                  </div>
                  {onQuickView && (
                    <button
                      type="button"
                      onClick={() => onQuickView(product)}
                      aria-label={`Quick view ${product.name_en}`}
                      className="absolute top-3 right-3 rounded-full bg-white/90 hover:bg-white p-2 text-[#072A20] shadow-md transition-all"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                  {/* Bottom Dual Rate Summary Pill */}
                  <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl bg-[#072A20]/92 backdrop-blur-md px-3 py-1.5 text-[11px] text-[#F7F1E3] flex items-center justify-between border border-[#D4AF6A]/30">
                    <span>Empty: <strong className="text-[#E6C786]">Rs. {cfg.emptyUnitStarting}</strong> <span className="opacity-75">(100+: Rs. {cfg.emptyBulk100Unit})</span></span>
                    <span className="text-[#D4AF6A]">|</span>
                    <span>Filled: <strong className="text-[#E6C786]">Rs. {cfg.filledMin.toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-3.5">
                  <div>
                    <Link
                      to={`/product/${product.id}`}
                      className="font-serif text-lg font-bold text-[#072A20] hover:text-[#8C6B1B] transition-colors line-clamp-1"
                    >
                      {product.name_en}
                    </Link>
                    <p className="text-xs font-urdu text-[#8C6B1B] mt-0.5" dir="rtl">
                      {product.name_ur}
                    </p>
                  </div>

                  {/* Per-Card Empty vs Filled Mode Selector */}
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#FAF6EE] p-1 border border-[#D4AF6A]/30">
                    <button
                      type="button"
                      onClick={() => setCardModes(prev => ({ ...prev, [product.id]: 'empty' }))}
                      className={`rounded-lg py-1.5 px-2 text-[11px] font-bold transition-all ${
                        mode === 'empty'
                          ? 'bg-[#072A20] text-[#F7F1E3] shadow-xs'
                          : 'text-[#3E564D] hover:text-[#072A20]'
                      }`}
                    >
                      Box Only (Empty)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardModes(prev => ({ ...prev, [product.id]: 'filled' }))}
                      className={`rounded-lg py-1.5 px-2 text-[11px] font-bold transition-all ${
                        mode === 'filled'
                          ? 'bg-[#072A20] text-[#F7F1E3] shadow-xs'
                          : 'text-[#3E564D] hover:text-[#072A20]'
                      }`}
                    >
                      Filled Dry Fruits
                    </button>
                  </div>

                  {/* Interactive Tier / Assortment Selector */}
                  {mode === 'empty' ? (
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#566B63]">Select Bulk Quantity Tier:</span>
                        <span className="font-bold text-[#127A4D]">
                          Rs. {activeEmptyTier.unitPrice}/box
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {cfg.emptyTiers.map((tier, idx) => (
                          <button
                            key={tier.variantKey}
                            type="button"
                            onClick={() => setSelectedEmptyTierIdx(prev => ({ ...prev, [product.id]: idx }))}
                            className={`rounded-lg border px-2 py-1.5 text-left transition-all ${
                              emptyTierIdx === idx
                                ? 'border-[#072A20] bg-[#072A20]/5 text-[#072A20]'
                                : 'border-[#D4AF6A]/30 bg-white text-[#566B63] hover:border-[#072A20]/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold">{tier.qty === 100 ? '100+ pcs' : `${tier.qty} pcs`}</span>
                              {tier.discountBadge && (
                                <span className="rounded bg-[#127A4D]/15 px-1 py-0.2 text-[9px] font-extrabold text-[#127A4D]">
                                  {tier.discountBadge}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-semibold text-[#8C6B1B]">
                              Rs. {tier.unitPrice}/pc • Pack Rs. {tier.packPrice.toLocaleString()}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#566B63]">Filled Assortment:</span>
                        <span className="font-bold text-[#072A20]">
                          Rs. {activeFilledOpt.price.toLocaleString()}/box
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {cfg.filledOptions.map((opt, idx) => (
                          <button
                            key={opt.variantKey}
                            type="button"
                            onClick={() => setSelectedFilledIdx(prev => ({ ...prev, [product.id]: idx }))}
                            className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-all flex items-center justify-between gap-2 ${
                              filledIdx === idx
                                ? 'border-[#072A20] bg-[#072A20]/5 text-[#072A20]'
                                : 'border-[#D4AF6A]/30 bg-white text-[#566B63] hover:border-[#072A20]/40'
                            }`}
                          >
                            <span className="text-[11px] font-bold truncate">{opt.label}</span>
                            <span className="text-xs font-extrabold text-[#8C6B1B] shrink-0">
                              Rs. {opt.price.toLocaleString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions: Add to Cart + Request Custom Quote / Bargain */}
                  <div className="pt-2 space-y-2 border-t border-[#D4AF6A]/20">
                    <button
                      type="button"
                      onClick={() => handleAddBidBox(product)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#072A20] hover:bg-[#0D3F30] text-[#F7F1E3] py-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                    >
                      {addedId === product.id ? (
                        <>
                          <Check size={15} className="text-[#E6C786]" /> Added to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={14} className="text-[#E6C786]" />
                          {mode === 'empty'
                            ? `Add ${activeEmptyTier.qty} Empty Boxes (Rs. ${activeEmptyTier.packPrice.toLocaleString()})`
                            : `Add Filled Box (Rs. ${activeFilledOpt.price.toLocaleString()})`}
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openCustomQuoteModal({
                          productId: product.id,
                          mode,
                          quantity: mode === 'empty' ? activeEmptyTier.qty : 50,
                          targetUnitPrice: mode === 'empty'
                            ? activeEmptyTier.unitPrice * activeEmptyTier.qty
                            : activeFilledOpt.price * 50,
                        })
                      }
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#8C6B1B]/50 bg-[#FAF6EE] hover:bg-[#8C6B1B] text-[#8C6B1B] hover:text-white py-2 px-3 text-[11px] font-bold uppercase tracking-wider transition-all"
                    >
                      <MessageSquareQuote size={13} />
                      Request Custom Quote / Offer Price
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
