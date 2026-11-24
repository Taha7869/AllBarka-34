import React, { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Sparkles, ShoppingBag, Check, Eye, Search, AlertCircle, ArrowRight } from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { getLocalized } from '../utils/localize';
import VoiceInputButton from './VoiceInputButton';
import {
  searchGiftFinder,
  getProductStartingPrice,
  getDefaultProductPortion,
  type GiftFinderResult,
} from '../lib/giftFinderService';
import type { Product } from '../types';

interface GiftFinderProps {
  className?: string;
  onProductView?: (product: Product) => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export default function GiftFinder({
  className = '',
  onProductView,
  title,
  subtitle,
  compact = false,
}: GiftFinderProps) {
  const { t, language, isRtl } = useLanguage();
  const catalog = useCatalogProducts();
  const { addToCart } = useCart();
  const mediaCover = useProductMediaCover();
  const navigate = useNavigate();
  const inputId = useId();

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GiftFinderResult | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  const presets = [
    t('giftFinder.preset1', 'Walid ke liye, Eid par, 5000'),
    t('giftFinder.preset2', 'Wedding favor gift, budget 8000'),
    t('giftFinder.preset3', 'Umrah Tabarruk dates, budget 4000'),
  ];

  const handleSearch = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsLoading(true);
    try {
      const searchRes = await searchGiftFinder(q, language, catalog);
      setResult(searchRes);
    } catch {
      // Fail gracefully
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleVoiceInput = (transcript: string) => {
    setQuery(transcript);
    handleSearch(transcript);
  };

  const handleAddToCart = (product: Product, e?: React.MouseEvent<HTMLButtonElement>) => {
    const defaultPortion = getDefaultProductPortion(product);
    if (!defaultPortion) return;

    addToCart(product, defaultPortion.weight, 1, undefined, {
      silent: true,
      openCart: false,
      sourceElement: e?.currentTarget || null,
      image: mediaCover(product),
    });
    setAddedId(product.id);
    setTimeout(() => {
      setAddedId((curr) => (curr === product.id ? null : curr));
    }, 2500);
  };

  const handleView = (product: Product) => {
    if (onProductView) {
      onProductView(product);
    } else {
      navigate(`/product/${encodeURIComponent(product.id)}`);
    }
  };

  return (
    <section
      data-testid="ai-gift-finder"
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`gift-finder-container relative overflow-hidden rounded-3xl border border-[#D4AF37]/35 bg-gradient-to-br from-[#FFFCF7] via-[#F6F1EA] to-[#ECE5DC] dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-800 p-5 sm:p-8 shadow-xl ${className}`}
    >
      {/* Decorative Gold Accent Header */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full bg-[#042821]/10 dark:bg-emerald-950/60 text-[#042821] dark:text-[#E4C783] flex items-center justify-center border border-[#D4AF37]/40">
          <Gift size={16} />
        </div>
        <span className="text-[11px] font-bold text-[#042821] dark:text-[#E4C783]">
          {t('giftFinder.eyebrow', 'AI Gift Concierge')}
        </span>
      </div>

      <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-[#042821] dark:text-[#FAF9F5] leading-snug max-w-2xl">
        {title || t('giftFinder.title', 'Who is it for, what occasion, and what budget?')}
      </h2>
      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-2xl">
        {subtitle || t('giftFinder.subtitle', 'State your recipient, celebration, and budget to find three perfect boutique gift selections.')}
      </p>

      {/* Input Search Form */}
      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <div className="relative flex items-center bg-white dark:bg-zinc-800 rounded-2xl border border-[#D4AF37]/40 shadow-xs focus-within:border-[#042821] dark:focus-within:border-[#E4C783] focus-within:ring-2 focus-within:ring-[#042821]/10 transition-all p-1.5 sm:p-2">
          <Search size={18} className="ms-2 text-neutral-400 shrink-0" />
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('giftFinder.placeholder', 'E.g. For Father, Eid gift, budget 5000')}
            className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none min-h-[44px]"
            aria-label={t('giftFinder.title', 'Who is it for, what occasion, and what budget?')}
          />
          <div className="flex items-center gap-1.5 shrink-0 me-1">
            <VoiceInputButton
              placement="above"
              disabled={isLoading}
              onTranscript={handleVoiceInput}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              aria-label={isLoading ? t('giftFinder.searching', 'Searching...') : t('giftFinder.findButton', 'Find Gifts')}
              className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold bg-[#042821] text-[#FAF9F5] hover:bg-[#074b39] transition-colors focus-ring min-h-[44px] cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} className="text-[#D4AF37]" />
              <span className="hidden sm:inline">{isLoading ? t('giftFinder.searching', 'Searching...') : t('giftFinder.findButton', 'Find Gifts')}</span>
            </button>
          </div>
        </div>

        {/* Quick Inspiration Preset Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold text-neutral-400 me-1">
            {t('inspiration', 'Try')}:
          </span>
          {presets.map((preset) => (
            <button
              type="button"
              key={preset}
              onClick={() => {
                setQuery(preset);
                handleSearch(preset);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/70 dark:bg-zinc-800/80 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/25 text-[#042821] dark:text-neutral-200 transition-colors focus-ring cursor-pointer min-h-[32px]"
            >
              {preset}
            </button>
          ))}
        </div>
      </form>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="mt-8 p-6 rounded-2xl bg-white/60 dark:bg-zinc-800/60 border border-[#D4AF37]/20 text-center space-y-2 animate-pulse">
          <Sparkles size={24} className="mx-auto text-[#D4AF37] animate-spin" />
          <p className="text-xs font-semibold text-[#042821] dark:text-[#E4C783]">
            {t('giftFinder.searching', 'Finding tailored gifts...')}
          </p>
        </div>
      )}

      {/* Results Section */}
      {!isLoading && result && (
        <div className="mt-8 space-y-4 pt-4 border-t border-[#D4AF37]/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h3 className="text-sm font-bold text-[#042821] dark:text-[#FAF9F5]">
                {t('giftFinder.resultsTitle', 'Top 3 Curated Gift Recommendations')}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {result.source === 'ai'
                  ? t('giftFinder.aiNotice', 'Tailored by AllBarka AI Concierge based on your celebration.')
                  : t('giftFinder.curatedNotice', 'Handpicked boutique gifts fitting your budget and occasion.')}
              </p>
            </div>
            {result.parsedQuery.budget && (
              <span className="text-xs font-semibold text-[#806326] dark:text-[#E4C783] bg-[#D4AF37]/10 px-2.5 py-1 rounded-lg border border-[#D4AF37]/30 self-start sm:self-auto">
                Max Rs. {result.parsedQuery.budget.toLocaleString()}
              </span>
            )}
          </div>

          {result.suggestions.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-800 text-center space-y-2 border border-neutral-200 dark:border-zinc-700">
              <AlertCircle size={22} className="mx-auto text-amber-500" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t('giftFinder.noResults', 'No items currently match this criteria. Showing our top gift hampers.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.suggestions.map((product) => {
                const startPrice = getProductStartingPrice(product);
                const defaultPortion = getDefaultProductPortion(product);
                const isAdded = addedId === product.id;

                return (
                  <div
                    key={product.id}
                    data-testid={`gift-suggestion-${product.id}`}
                    className="flex flex-col justify-between bg-white dark:bg-zinc-800/90 rounded-2xl p-4 border border-[#D4AF37]/25 shadow-xs hover:shadow-md transition-shadow"
                  >
                    <div>
                      {/* Image Thumbnail */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 dark:bg-zinc-700 mb-3 border border-neutral-200 dark:border-zinc-600">
                        <img
                          src={mediaCover(product)}
                          alt={getLocalized(product, 'name', language)}
                          width={300}
                          height={300}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/product-placeholder.svg';
                          }}
                        />
                        <div className="absolute top-2 start-2 bg-[#042821]/80 backdrop-blur-xs text-[#FAF9F5] text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {product.category || 'Gifting'}
                        </div>
                      </div>

                      {/* Product Name & Description */}
                      <h4 className="text-sm font-bold text-[#120F17] dark:text-[#FAF9F5] line-clamp-1">
                        {getLocalized(product, 'name', language)}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1">
                        {getLocalized(product, 'description', language)}
                      </p>
                    </div>

                    {/* Price & Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-zinc-700/60 space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-neutral-400">
                          {defaultPortion ? defaultPortion.weight : ''}
                        </span>
                        <span className="text-sm font-bold text-[#042821] dark:text-[#E4C783]">
                          Rs. {startPrice ? startPrice.toLocaleString() : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => handleView(product)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[#D4AF37]/40 bg-neutral-50 dark:bg-zinc-700 text-[#042821] dark:text-neutral-200 hover:bg-[#D4AF37]/10 transition-colors focus-ring min-h-[44px] cursor-pointer"
                        >
                          <Eye size={14} className="text-[#C7982F]" />
                          <span>{t('giftFinder.view', 'View')}</span>
                        </button>

                        {/* Add to Bag Button */}
                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(product, e)}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all focus-ring min-h-[44px] cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#042821] text-[#FAF9F5] hover:bg-[#074b39]'
                          }`}
                        >
                          {isAdded ? <Check size={14} /> : <ShoppingBag size={14} />}
                          <span>{isAdded ? t('giftFinder.added', 'Added!') : t('giftFinder.addToBag', 'Add to Bag')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
