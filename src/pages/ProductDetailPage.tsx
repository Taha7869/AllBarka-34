import CartAddButton from '../components/CartAddButton';
import { productSeo } from '../lib/productSeo';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useCatalogActivity } from '../hooks/useCatalogActivity';
import { unitPrice } from '../lib/catalogActivity';
import { useSavedProducts } from '../hooks/useSavedProducts';
import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PRODUCTS, getProductImage } from '../data/products';
import { isSingleImageCatalogProduct } from '../data/productImages';
import { useProductMedia, useProductMediaCover } from '../contexts/ProductMediaContext';
import { clampPhotoIndex } from '../lib/productPhotoViewer';
import ProductVideo from '../components/ProductVideo';
import { Product, CartItem } from '../types';
import ProductDetailAccordion from '../components/ProductDetailAccordion';
import SEO from '../components/SEO';
import { ShieldCheck, Sparkles, ArrowRight, Truck, Award, AlertCircle, Info, Share2, Maximize2, MessageSquareQuote, Package, Gift } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import TrustBadges from '../components/TrustBadges';
import { useLanguage } from '../contexts/LanguageContext';
import { getLocalized } from '../utils/localize';
import PulseHeart from '../components/PulseHeart';
import { buildHumanSupportWhatsAppUrl } from '../config/contacts';
import CustomWeightInput from '../components/CustomWeightInput';
import { resolveCustomWeight, supportsCustomWeight } from '../lib/productVariants';
import { displayProductPrice } from '../lib/productSelection';
import { openCustomQuoteModal } from '../components/CustomQuoteModal';
import ProductPhotoViewer from '../components/ProductPhotoViewer';
import { isPackagingProduct, getPackagingMoqDisplay } from '../lib/packagingMoq';
import { isFilledPackagingVariant } from '../lib/filledGiftPricing';
import { resolveBidBoxConfig } from '../lib/bidBoxPricing';

export default function ProductDetailPage() {
  const PRODUCTS = useCatalogProducts();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { t, language } = useLanguage();
  
  const product = PRODUCTS.find((p) => p.id === id && p.active !== false);
  const productMedia = useProductMedia(product);
  const mediaCover = useProductMediaCover();
  const [selectedWeightIndex, setSelectedWeightIndex] = useState(0);
  const [customWeightSelected, setCustomWeightSelected] = useState(false);
  const [customGrams, setCustomGrams] = useState('100');
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);

  const isPackaging = Boolean(product && isPackagingProduct(product));
  const bidBoxConfig = useMemo(() => product ? resolveBidBoxConfig(product) : null, [product]);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const photoViewerOpener = useRef<HTMLButtonElement | null>(null);
  const { savedIds, setSaved } = useSavedProducts();
  const { view } = useCatalogActivity();
  const isSaved = !!id && savedIds.includes(id);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const isGiftProduct = product?.category === 'hampers' || product?.category === 'deals' || product?.category === 'combos' || product?.id?.includes('hamper') || product?.id?.includes('gift') || product?.id?.includes('deal');
  const galleryImages = useMemo(() => product ? productMedia.images.map(src => ({ src, alt: product.seo?productSeo(product,language).imageAlt:t(`imageAlt.${product.id}`, getLocalized(product, 'name', language)) })) : [], [product, productMedia.images, language, t]);
  const galleryKey = productMedia.images.join('\u0000');
  const activeGalleryIndex = clampPhotoIndex(activeGalleryIdx, galleryImages.length);
  useEffect(() => { setActiveGalleryIdx(current => clampPhotoIndex(current, productMedia.images.length)); setImageError(false); }, [galleryKey, productMedia.images.length]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) view(id);
    setSelectedWeightIndex(0);
    setCustomWeightSelected(false);
    setCustomGrams('100');
    setQuantity(1);
    setImageError(false);
    setActiveGalleryIdx(0);
    setPhotoViewerOpen(false);
    setShareStatus('idle');
  }, [id, view]);

  const handleSave = (next: boolean) => { if (id) setSaved(id, next); };

  const handleShare = async () => {
    if (!product) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: getLocalized(product, 'name', language), url });
        setShareStatus('idle');
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus('copied');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('failed');
    }
  };

  // Related selections from the current catalogue
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const sameCategory = PRODUCTS.filter((p) => p.active !== false && p.id !== product.id && p.category === product.category);
    const otherBestsellers = PRODUCTS.filter((p) => p.active !== false && p.id !== product.id && p.category !== product.category);
    return [...sameCategory, ...otherBestsellers].slice(0, 4);
  }, [product, PRODUCTS]);

  const disabledLabels = useMemo(
    () =>
      new Set(
        Array.isArray(product?.variants)
          ? product.variants.filter(v => v && v.available === false).map(v => v.label)
          : []
      ),
    [product?.variants]
  );

  const weights = useMemo(
    () =>
      product
        ? Object.keys(product.prices || {}).filter(
            w => !disabledLabels.has(w) && Number.isFinite(product.prices[w]) && product.prices[w] > 0
          )
        : [],
    [product, disabledLabels]
  );

  useEffect(()=>{if(product?.commerce?.custom){setCustomGrams(String(product.commerce.custom.min));setCustomWeightSelected(product.commerce.quantityMode==='custom');}},[product?.commerce,product?.id]);

  const hasCustomPriceOption = Boolean(
    product && supportsCustomWeight(product)
  );
  const isQuoteOnly = Boolean(
    product && (product.quoteOnly || product.orderMode === 'inquiry_quote' || (weights.length === 0 && !hasCustomPriceOption))
  );
  const isFilledPackaging = Boolean(isPackaging && isFilledPackagingVariant(selectedWeight));
  const requiresInquiry = isQuoteOnly || isFilledPackaging;

  let customSelection: ReturnType<typeof resolveCustomWeight> | null = null;
  if (product && customWeightSelected) {
    try {
      customSelection = resolveCustomWeight(product, customGrams);
    } catch {
      /* Input shows the reason. */
    }
  }
  const selectedWeight = customWeightSelected ? customSelection?.label || '' : weights[selectedWeightIndex] || weights[0] || '';
  const candidatePrice = customWeightSelected ? customSelection?.price : (selectedWeight ? product?.prices?.[selectedWeight] : undefined);
  const priceToUse = typeof candidatePrice === 'number' && Number.isFinite(candidatePrice) && candidatePrice > 0 ? candidatePrice : null;
  const unit = !isQuoteOnly && priceToUse ? unitPrice(priceToUse, selectedWeight) : null;

  const { moqPieces, minUnits: resolvedMinUnits, displayText: moqDisplayText } = useMemo(() => {
    if (!product) return { moqPieces: 1 as number | null, minUnits: 1 as number | null, displayText: null as string | null };
    return getPackagingMoqDisplay(product, selectedWeight || undefined);
  }, [product, selectedWeight]);

  const minUnits = resolvedMinUnits ?? 1;
  const maxUnits = isPackaging ? 10000 : 50;

  useEffect(() => {
    setQuantity(prev => Math.max(minUnits, Math.min(maxUnits, prev)));
  }, [minUnits, maxUnits]);

  if (!product) {
    return (
      <div className="pdp-empty w-full min-h-[70vh] bg-[var(--color-base,#F6F1EA)] flex items-center justify-center py-20 px-4 select-none">
        <div className="max-w-lg w-full bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/30 rounded-3xl p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-emerald,#042821)]/5 border border-[var(--color-gold,#C7982F)]/30 flex items-center justify-center mx-auto mb-4 text-[var(--color-gold,#C7982F)]">
            <Sparkles size={28} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-gold,#C7982F)] block mb-2">
            AllBarka Reserve
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--color-ink,#29231D)] mb-3">
            {t('pdp.notFound')}
          </h1>
          <p className="text-sm text-[var(--color-ink,#29231D)]/70 mb-8 leading-relaxed max-w-sm mx-auto">
            {t('pdp.notFoundCopy')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/shop')}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[var(--color-emerald,#042821)] text-[var(--color-surface,#FFFCF7)] text-xs font-bold uppercase tracking-wider hover:bg-[#03201A] transition-colors border border-[var(--color-gold,#C7982F)]/40 shadow-sm"
            >
              {t('shop')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-white text-[var(--color-ink,#29231D)] text-xs font-bold uppercase tracking-wider border border-[var(--color-gold,#C7982F)]/30 hover:border-[var(--color-gold,#C7982F)] transition-colors"
            >
              {t('home')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (isQuoteOnly || !selectedWeight || !priceToUse) return;
    if (isPackaging && isFilledPackagingVariant(selectedWeight)) {
      openCustomQuoteModal({ productId: product.id, variantLabel: selectedWeight, mode: 'filled', quantity });
      return;
    }
    const finalQuantity = Math.max(minUnits, Math.min(maxUnits, quantity));
    addToCart({
      id: `${product.id}-${selectedWeight}`,
      productId: product.id,
      name_en: product.name_en,
      name_ur: product.name_ur,
      name_ar: product.name_ar,
      slug: product.id,
      image: getProductImage(product),
      selectedWeight: selectedWeight,
      unitPrice: priceToUse,
      price: priceToUse,
      quantity: finalQuantity,
      wholesale: false,
    });


  };

  const siteOrigin = typeof window === 'undefined' ? 'https://allbarka.com' : window.location.origin;

  return (
    <div dir={language === 'en' ? 'ltr' : 'rtl'} data-product-kind={isPackaging ? 'packaging' : 'food'} className="pdp-editorial w-full bg-[var(--color-base,#F6F1EA)] pt-6 sm:pt-10 pb-24">
      <SEO
        title={productSeo(product,language).title}
        description={productSeo(product,language).description}
        canonicalPath={`/product/${product.id}`}
        type="product"
        image={productSeo(product,language).image||productMedia.images[0]}
        keywords={productSeo(product,language).keywords}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: getLocalized(product, 'name', language),
          image: productMedia.images.map(src => new URL(src, siteOrigin).href),
          description: getLocalized(product, 'desc', language),
          sku: product.id,
          brand: {
            '@type': 'Brand',
            name: 'AllBarka'
          },
          ...(!isQuoteOnly && priceToUse ? { offers: {
            '@type': 'Offer',
            url: `${siteOrigin}/product/${product.id}`,
            priceCurrency: 'PKR',
            price: priceToUse,
            itemCondition: 'https://schema.org/NewCondition'
          } } : {})
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="pdp-composition grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          
          {/* Left: Product Visual Showcase */}
          <div className="pdp-gallery flex flex-col gap-3 lg:sticky lg:top-28">
            <div className="pdp-main-photo relative aspect-square rounded-3xl overflow-hidden bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/30 shadow-sm flex items-center justify-center p-6 group">
              {imageError || (product.image === null && productMedia.images.length === 0) ? (
                <div className="pdp-photo-fallback w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--color-gold,#C7982F)]/20 border border-[var(--color-gold,#C7982F)]/40 flex items-center justify-center text-[var(--color-gold,#C7982F)] mb-4">
                    <Sparkles size={28} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold,#C7982F)]">AllBarka Reserve Lot</span>
                  <span className="text-lg font-serif font-bold text-[var(--color-ink,#29231D)] mt-1">{getLocalized(product, 'name', language)}</span>
                </div>
              ) : (
                <img
                  src={galleryImages[activeGalleryIndex]?.src || productMedia.images[0]}
                  alt={galleryImages[activeGalleryIndex]?.alt || t(`imageAlt.${product.id}`, getLocalized(product, 'name', language))}
                  width={960}
                  height={960}
                  referrerPolicy="no-referrer"
                  decoding="async"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-contain rounded-2xl"
                />
              )}
            </div>

            {/* Clean metadata strip BELOW the image frame (no text overlays on the photo) */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex flex-wrap items-center gap-2">
                {getLocalized(product, 'tag', language) && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest bg-[var(--color-primary,#042821)] text-[var(--color-text-on-emerald,#FFFCF7)] border border-[var(--color-accent,#C7982F)]/50 shadow-xs">
                    {getLocalized(product, 'tag', language)}
                  </span>
                )}
                {product.badge && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest bg-[#C7982F]/20 text-[#806326] dark:text-[#E4C783] border border-[#C7982F]/40">
                    {product.badge}
                  </span>
                )}
                {getLocalized(product, 'origin', language) && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-[#1A201E] text-[var(--color-text-primary,#29231D)] dark:text-[var(--color-text-primary,#F6F1EA)] border border-[var(--color-accent,#C7982F)]/30">
                    {getLocalized(product, 'origin', language)}
                  </span>
                )}
              </div>
              {isGiftProduct && (
                <p className="text-[10px] italic text-[#635B52] dark:text-[#A8A199]">
                  {t('pdp.presentationNote')}
                </p>
              )}
            </div>

            <button type="button" aria-haspopup="dialog" aria-expanded={photoViewerOpen} onClick={event => { photoViewerOpener.current = event.currentTarget; setPhotoViewerOpen(true); }} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-xs font-semibold text-[var(--color-accent-text)]" dir="ltr"><Maximize2 size={16} aria-hidden="true" /><span dir="auto">{t('gallery.viewPhotos')}</span>{!isSingleImageCatalogProduct(product) && <bdi className="text-[var(--color-text-secondary)]">({galleryImages.length})</bdi>}</button>

            {/* Gift image gallery thumbnails */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1" dir="ltr" role="group" aria-label={t('gallery.photos')}>
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setImageError(false); setActiveGalleryIdx(idx); }}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      activeGalleryIndex === idx
                        ? 'border-[#C7982F] shadow-sm'
                        : 'border-[var(--color-border)] opacity-60 hover:opacity-100 hover:border-[#C7982F]/50'
                    }`}
                    aria-label={t('viewer.select').replace('{number}', String(idx + 1))}
                    aria-pressed={activeGalleryIndex === idx}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <ProductVideo videoUrl={productMedia.videoUrl} poster={productMedia.videoPoster || productMedia.images[0]} productName={getLocalized(product, 'name', language)} />
          </div>

          {/* Right: Product Purchase Details */}
          <div className="pdp-purchase flex flex-col text-start">
            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)] block mb-1.5">
                {t(isPackaging ? 'pdp.packagingEyebrow' : 'pdp.foodEyebrow')}
              </span>
              <h1 dir="auto" className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[var(--color-primary,#042821)] dark:text-[var(--color-text-primary,#F6F1EA)] leading-tight mb-2">
                {getLocalized(product, 'name', language)}
              </h1>
              <p dir="auto" className="text-sm text-[var(--color-text-secondary,#635B52)] dark:text-[var(--color-text-secondary,#B4C0BC)] font-normal leading-relaxed">
                {getLocalized(product, 'desc', language)}
              </p>

              {!isPackaging && getLocalized(product, 'tasteProfile', language) && (
                <div className="pdp-food-notes mt-3 p-3 rounded-xl bg-[var(--color-surface,#FFFCF7)] dark:bg-[#1A201E] border border-[var(--color-accent,#C7982F)]/25 text-xs text-[var(--color-text-primary,#29231D)] dark:text-[var(--color-text-primary,#F6F1EA)]">
                  <span className="font-bold text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)] uppercase tracking-wider text-[10px] block mb-0.5">
                    {t('tasteProfile')}
                  </span>
                  <span dir="auto">{getLocalized(product, 'tasteProfile', language)}</span>
                </div>
              )}

              {getLocalized(product, 'contents', language) && (
                <div className="mt-2.5 p-3 rounded-xl bg-[var(--color-surface,#FFFCF7)] dark:bg-[#1A201E] border border-[var(--color-accent,#C7982F)]/25 text-xs text-[var(--color-text-primary,#29231D)] dark:text-[var(--color-text-primary,#F6F1EA)]">
                  <span className="font-bold text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)] uppercase tracking-wider text-[10px] block mb-0.5">
                    {t('packContents')}
                  </span>
                  <span dir="auto">{getLocalized(product, 'contents', language)}</span>
                </div>
              )}

              {product.isBidBox && bidBoxConfig && (
                <div className="mt-3 grid grid-cols-1 gap-2.5 rounded-2xl bg-[#FAF6EE] dark:bg-[#1A201E] border border-[#C7982F]/35 p-3.5 text-xs text-[var(--color-text-primary,#29231D)] dark:text-[var(--color-text-primary,#F6F1EA)]">
                  {bidBoxConfig.dimensionsAndCapacity && (
                    <div>
                      <strong className="uppercase tracking-wider text-[10px] text-[#8C6B1B] dark:text-[#E4C783] block">
                        {t('pdp.dimensions')}
                      </strong>
                      <span>{bidBoxConfig.dimensionsAndCapacity}</span>
                    </div>
                  )}
                  {bidBoxConfig.emptyOptionDetails && (
                    <div className="border-t border-[#C7982F]/20 pt-2">
                      <strong className="uppercase tracking-wider text-[10px] text-[#8C6B1B] dark:text-[#E4C783] block">
                        {t('pdp.emptyOption')}
                      </strong>
                      <span>{bidBoxConfig.emptyOptionDetails}</span>
                    </div>
                  )}
                  {bidBoxConfig.filledOptionDetails && (
                    <div className="border-t border-[#C7982F]/20 pt-2">
                      <strong className="uppercase tracking-wider text-[10px] text-[#8C6B1B] dark:text-[#E4C783] block">
                        {t('pdp.filledOption')}
                      </strong>
                      <span>{bidBoxConfig.filledOptionDetails}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Price Row */}
            {isQuoteOnly ? <div className="my-5 rounded-xl border border-[var(--color-border-accent)] p-5 text-sm leading-7 text-[var(--color-text-secondary)]">{t('catalog.quoteDescription')}</div> : <>
            <div className="pdp-price-row flex flex-wrap items-baseline gap-x-4 gap-y-2 py-4 border-y border-[var(--color-accent,#C7982F)]/25 mb-6">
              <span className="text-3xl sm:text-4xl font-serif font-bold text-[var(--color-text-price,#29231D)] dark:text-[var(--color-text-price,#F6F1EA)]">
                <bdi dir="ltr">{displayProductPrice(priceToUse)}</bdi>
              </span>
              <span className="text-xs font-semibold text-[#0E7A53] dark:text-[#28A745] bg-[#0E7A53]/10 px-2.5 py-1 rounded-full">
                {priceToUse && selectedWeight ? t('inStock', 'In Stock') : t('pdp.chooseValid')}
              </span>
              {isPackaging && moqPieces !== null && (
                <span className="text-xs font-semibold text-[#8C6B1B] bg-[#8C6B1B]/10 px-2.5 py-1 rounded-full border border-[#8C6B1B]/20">
                  {moqDisplayText || `MOQ: ${moqPieces} pcs (${minUnits} ${minUnits === 1 ? 'pack' : 'units'})`}
                </span>
              )}
            </div>

            {unit && <p className="mb-5 text-xs text-[var(--color-text-secondary)]"><bdi>Rs. {unit.amount.toLocaleString()} / {unit.unit}</bdi></p>}

            {/* Interactive Bid Box Empty vs Filled + Saved Pack Tiers */}
            {product.isBidBox && bidBoxConfig && (() => {
              const emptyTiers = bidBoxConfig.emptyTiers || [];
              const filledOptions = bidBoxConfig.filledOptions || [];
              const hasEmptyOptions = typeof bidBoxConfig.emptyUnitStarting === 'number' && bidBoxConfig.emptyUnitStarting > 0;
              const hasFilledOptions = filledOptions.length > 0 && typeof bidBoxConfig.filledMin === 'number' && typeof bidBoxConfig.filledMax === 'number';
              const hasEmptyTiers = emptyTiers.length > 0;
              const hasBulkSavings = emptyTiers.some(t => Boolean(t.discountBadge));
              const isSelectedEmpty = /^empty\b/i.test(selectedWeight.trim());

              if (!(hasEmptyOptions && hasFilledOptions) && !hasEmptyTiers) {
                return null;
              }

              return (
                <div className="mb-6 rounded-2xl border border-[#C7982F]/40 bg-white dark:bg-[#1A201E] p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary,#042821)] dark:text-[#E4C783]">
                      {hasEmptyOptions && hasFilledOptions
                        ? t('pdp.boxMode')
                        : t('pdp.savedPacks')}
                    </span>
                    {hasBulkSavings && (
                      <span className="text-[11px] font-semibold text-[#8C6B1B]">
                        {t('pdp.bulkSavings')}
                      </span>
                    )}
                  </div>
                  {hasEmptyOptions && hasFilledOptions && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const firstEmptyWeight =
                            weights.find(w => /^empty\b/i.test(w.trim())) ||
                            emptyTiers[0]?.variantKey ||
                            weights[0] ||
                            '';
                          const idx = weights.indexOf(firstEmptyWeight);
                          setSelectedWeightIndex(idx >= 0 ? idx : 0);
                          setCustomWeightSelected(false);
                        }}
                        className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                          isSelectedEmpty
                            ? 'border-[#042821] bg-[#042821] text-white'
                            : 'border-[#C7982F]/35 bg-[#FAF6EE] text-[#042821]'
                        }`}
                      >
                        <Package size={16} className="text-[#E6C786] shrink-0" />
                        <div>
                          <div className="text-xs font-bold">{t('pdp.boxOnly')}</div>
                          <div className="text-[10px] opacity-80">
                            From Rs. {bidBoxConfig.emptyUnitStarting}/pc
                            {bidBoxConfig.emptyBulk100Unit
                              ? ` • 100+ pcs: Rs. ${bidBoxConfig.emptyBulk100Unit}/pc`
                              : ''}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const idx = weights.indexOf(filledOptions[0]?.variantKey || '');
                          setSelectedWeightIndex(idx >= 0 ? idx : 0);
                          setCustomWeightSelected(false);
                        }}
                        className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                          !isSelectedEmpty
                            ? 'border-[#04282F] bg-[#042821] text-white'
                            : 'border-[#C7982F]/35 bg-[#FAF6EE] text-[#042821]'
                        }`}
                      >
                        <Gift size={16} className="text-[#E6C786] shrink-0" />
                        <div>
                          <div className="text-xs font-bold">{t('pdp.filled')}</div>
                          <div className="text-[10px] opacity-80">
                            {bidBoxConfig.filledMin === bidBoxConfig.filledMax
                              ? `Rs. ${bidBoxConfig.filledMin?.toLocaleString()}`
                              : `Rs. ${bidBoxConfig.filledMin?.toLocaleString()} – Rs. ${bidBoxConfig.filledMax?.toLocaleString()}`}{' '}
                            ({bidBoxConfig.filledSummary})
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {isSelectedEmpty && hasEmptyTiers && (
                    <div className="pt-1">
                      <div className="text-[11px] font-semibold text-[#566B63] mb-1.5">
                        {hasBulkSavings
                          ? 'Saved Empty Box Pack Tiers (Per-Piece Rate by Pack Size):'
                          : 'Saved Empty Box Pack Sizes:'}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {emptyTiers.map(tier => {
                          const idx = weights.indexOf(tier.variantKey);
                          const active = selectedWeight === tier.variantKey;
                          return (
                            <button
                              key={tier.variantKey}
                              type="button"
                              onClick={() => {
                                if (idx >= 0) setSelectedWeightIndex(idx);
                                setCustomWeightSelected(false);
                              }}
                              className={`rounded-xl border p-2 text-left transition-all ${
                                active
                                  ? 'border-[#042821] bg-[#042821]/10 text-[#042821]'
                                  : 'border-[#C7982F]/30 bg-white text-[#566B63]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{tier.qty >= 100 ? `${tier.qty}+ pcs` : `${tier.qty} pcs`}</span>
                                {tier.discountBadge && (
                                  <span className="rounded bg-emerald-700/15 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800">
                                    {tier.discountBadge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-bold text-[#8C6B1B] mt-0.5">
                                Rs. {tier.unitPrice}/box
                              </div>
                              <div className="text-[10px] opacity-75">
                                Pack: Rs. {tier.packPrice.toLocaleString()}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Weight Selector */}
            <div className="mb-6">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <span className="text-xs font-bold text-[var(--color-text-primary,#29231D)] dark:text-[var(--color-text-primary,#F6F1EA)] uppercase tracking-widest">
                  {t('weightSelector', 'Select Weight / Portion')}
                </span>
                {product.wholesale > 0 && <a href={buildHumanSupportWhatsAppUrl(`Wholesale enquiry: ${product.name_en}`)} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-11 items-center text-xs font-semibold text-[var(--color-accent-text)] underline underline-offset-4">{t('shop.wholesaleEnquiry')}</a>}
              </div>

              <div className="flex flex-wrap gap-2.5">
                {weights.map((w, idx) => {
                  const isSelected = selectedWeightIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      aria-pressed={isSelected && !customWeightSelected}
                      onClick={() => { setSelectedWeightIndex(idx); setCustomWeightSelected(false); }}
                      className={`min-h-[44px] min-w-[70px] px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        isSelected && !customWeightSelected
                          ? 'bg-[var(--color-primary,#042821)] border-[var(--color-primary,#042821)] text-[var(--color-text-on-emerald,#FFFCF7)] shadow-sm' 
                          : 'bg-white dark:bg-[#1C2422] border-[var(--color-accent,#C7982F)]/30 text-[var(--color-text-primary,#29231D)] dark:text-[var(--color-text-primary,#F6F1EA)] hover:border-[var(--color-accent,#C7982F)]'
                      }`}
                    >
                      {w === 'Bundle' ? t('weight.bundle') : w}
                    </button>
                  );
                })}
              </div>
              <CustomWeightInput product={product} selected={customWeightSelected} grams={customGrams} onSelect={() => setCustomWeightSelected(true)} onChange={setCustomGrams} />
            </div>
            </>}

            {!isQuoteOnly && <dl className="pdp-selection-summary" aria-label={t('pdp.selection')}>
              <div><dt>{t('shop.portion')}</dt><dd dir="auto">{selectedWeight || t('pdp.chooseValid')}</dd></div>
              <div><dt>{t('pdp.quantity')}</dt><dd><bdi>{quantity}</bdi></dd></div>
              <div><dt>{t('pdp.selectionTotal')}</dt><dd aria-live="polite"><bdi dir="ltr">{displayProductPrice(priceToUse, quantity)}</bdi></dd></div>
            </dl>}

            {/* Quantity & Add to Cart (minimum 44px tap targets) */}
            <div className="flex flex-col gap-3 mb-8">
              {requiresInquiry ? <button type="button" onClick={() => openCustomQuoteModal({ productId: product.id, variantLabel: selectedWeight, mode: selectedWeight?.startsWith('Empty') ? 'empty' : 'filled', quantity: quantity })} className="focus-ring flex min-h-12 items-center justify-center rounded-xl border border-[#c7982f]/40 bg-[#1e3a2b] px-5 text-sm font-semibold text-[#fff8e9]">{t('catalog.requestQuote')}</button> : <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center justify-center bg-white dark:bg-[#1C2422] border border-[var(--color-accent,#C7982F)]/35 rounded-xl h-12 px-2 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setQuantity(Math.max(minUnits, quantity - 1))}
                    className="w-11 h-11 flex items-center justify-center text-[var(--color-text-primary,#29231D)] dark:text-white hover:text-[var(--color-accent,#C7982F)] transition-colors cursor-pointer text-lg font-bold"
                    aria-label={t('cart.decrease')}
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-[var(--color-text-primary,#29231D)] dark:text-white">
                    {quantity}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setQuantity(Math.min(maxUnits, quantity + 1))}
                    className="w-11 h-11 flex items-center justify-center text-[var(--color-text-primary,#29231D)] dark:text-white hover:text-[var(--color-accent,#C7982F)] transition-colors cursor-pointer text-lg font-bold"
                    aria-label={t('cart.increase')}
                  >
                    +
                  </button>
                </div>

                <CartAddButton
                  productId={product.id}
                  portion={selectedWeight}
                  onAdd={handleAddToCart}
                  disabled={!priceToUse || !selectedWeight}
                  className="focus-ring flex-1 min-h-[48px] rounded-xl flex items-center justify-center gap-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer shadow-sm bg-[var(--color-primary,#042821)] text-[var(--color-text-on-emerald,#FFFCF7)] border border-[var(--color-accent,#C7982F)]/40 hover:border-[var(--color-accent,#C7982F)]"
                >
                  {t('addToCartPrice', 'Add to Cart')} — <bdi dir="ltr">{displayProductPrice(priceToUse, quantity)}</bdi>
                </CartAddButton>
              </div>}

              {(product.isBidBox || product.category === 'gift-boxes' || product.category === 'bundles' || product.isBundle) && (
                <button
                  type="button"
                  onClick={() =>
                    openCustomQuoteModal({
                      productId: product.id,
                      variantLabel: selectedWeight,
                      mode: selectedWeight?.startsWith('Empty') ? 'empty' : 'filled',
                      quantity: quantity,
                    })
                  }
                  className="w-full min-h-[46px] rounded-xl border border-[#8C6B1B] bg-[#FAF6EE] hover:bg-[#8C6B1B] text-[#8C6B1B] hover:text-white flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
                >
                  <MessageSquareQuote size={16} />
                  {t('pdp.quoteAction')}
                </button>
              )}
              
              {/* Internal Actions: Wishlist & Share */}
              <div className="flex flex-col min-[390px]:flex-row items-stretch gap-3">
                <PulseHeart liked={isSaved} onChange={handleSave} label={t('wishlist', 'Wishlist')} savedLabel={t('savedProduct', 'Saved')} className="flex-1" />
                <button 
                  type="button" 
                  onClick={handleShare}
                  className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-[#29231D]/20 dark:border-[#F6F1EA]/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#635B52] dark:text-[#A8A199] hover:text-[#1E3A2B] dark:hover:text-[#FDFBF7] hover:border-[#1E3A2B] dark:hover:border-[#FDFBF7] transition-colors shadow-sm focus-ring cursor-pointer"
                >
                  <Share2 size={15} />
                  <span>{shareStatus === 'copied' ? t('shareCopied', 'Link copied') : shareStatus === 'failed' ? t('shareFailed', 'Could not share') : t('shareItem', 'Share Item')}</span>
                </button>
              </div>
            </div>

            {/* Quick Guarantees Strip */}
            <div className="pdp-service-links grid grid-cols-2 gap-3 mb-8 p-3.5 rounded-2xl bg-[var(--color-surface,#FFFCF7)] dark:bg-[#1A201E] border border-[var(--color-accent,#C7982F)]/25">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary,#635B52)] dark:text-[var(--color-text-secondary,#B4C0BC)]">
                <Truck size={15} className="text-[var(--color-accent,#C7982F)] shrink-0" />
                <Link to="/policies" className="focus-ring">{t('pdp.deliveryDetails')}</Link>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary,#635B52)] dark:text-[var(--color-text-secondary,#B4C0BC)]">
                <ShieldCheck size={15} className="text-[var(--color-accent,#C7982F)] shrink-0" />
                <a href="#pdp-product-details" className="focus-ring">{t('care.title')}</a>
              </div>
            </div>

            {/* Accordions for Sourcing, Storage, and Packaging */}
            <div id="pdp-product-details" className="mb-10">
              <ProductDetailAccordion product={product} defaultOpenKey={isPackaging ? 'packaging' : 'storage'} />
            </div>

            <div className="pdp-guarantee mt-8 border-t border-[var(--color-accent,#C7982F)]/20 pt-8" hidden={isPackaging}>
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={20} className="text-[#C5A059]" />
                <h3 className="font-serif font-bold text-lg text-[var(--color-ink,#29231D)] dark:text-[#FFFCF7]">
                  {t('freshGuarantee', 'The AllBarka Guarantee')}
                </h3>
              </div>
              <TrustBadges />
            </div>

          </div>
        </div>

        {/* ── RELATED HARVESTS STRIP ({t('pdp.relatedEyebrow')}) ───────────────── */}
        {relatedProducts.length > 0 && (
          <section className="pdp-related mt-20 pt-12 border-t border-[var(--color-accent,#C7982F)]/25">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 text-left">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)] block mb-1">
                  {t('pdp.relatedEyebrow')}
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--color-primary,#042821)] dark:text-[var(--color-text-primary,#F6F1EA)]">
                  {t('pdp.relatedTitle')}
                </h2>
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)] hover:text-[var(--color-accent,#C7982F)] transition-colors"
              >
                <span>{t('viewFullHarvest')}</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {relatedProducts.map((rel) => {
                const firstWeight = Object.keys(rel.prices).find(label => rel.prices[label] > 0 && !rel.variants?.some(variant => variant.label === label && variant.available === false)) || '';
                const price = rel.prices[firstWeight];
                return (
                  <Link
                    key={rel.id}
                    to={`/product/${rel.id}`}
                    className="group bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/25 hover:border-[var(--color-gold,#C7982F)] rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-md cursor-pointer text-left"
                  >
                    <div>
                      <div className="w-full aspect-square rounded-xl bg-[#FAF9F5] border border-[var(--color-gold,#C7982F)]/15 overflow-hidden flex items-center justify-center p-3 mb-3 relative">
                        <img
                          src={mediaCover(rel)}
                          alt={t(`imageAlt.${rel.id}`, getLocalized(rel, 'name', language))}
                          width={960}
                          height={960}
                          className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/product-placeholder.svg'; }}
                        />
                      </div>
                      {getLocalized(rel, 'origin', language) && (
                        <span className="inline-block mb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent-text,#806326)]">
                          {getLocalized(rel, 'origin', language)}
                        </span>
                      )}
                      <h3 dir="auto" className="text-sm font-serif font-bold text-[var(--color-text-primary)] transition-colors">
                        {getLocalized(rel, 'name', language)}
                      </h3>
                      <p dir="auto" className="text-[11px] text-[var(--color-ink,#29231D)]/60 line-clamp-1 mt-0.5">
                        {getLocalized(rel, 'desc', language)}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[var(--color-gold,#C7982F)]/15 flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-emerald,#042821)]">
                        {rel.quoteOnly || rel.orderMode === 'inquiry_quote' || !price ? t('catalog.requestQuote') : `Rs. ${price?.toLocaleString()}`}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold,#C7982F)] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        {t('viewDetails')}
                        <ArrowRight size={11} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

      </div>
      {photoViewerOpen && <Suspense fallback={<span className="sr-only" role="status">{t('viewer.loading')}</span>}><ProductPhotoViewer key={product.id} images={galleryImages} productName={getLocalized(product, 'name', language)} hideSingleImageCounter={isSingleImageCatalogProduct(product)} initialIndex={activeGalleryIndex} restoreFocusTo={photoViewerOpener.current} onClose={() => setPhotoViewerOpen(false)} onIndexChange={index => { setActiveGalleryIdx(index); setImageError(false); }} /></Suspense>}
    </div>
  );
}
