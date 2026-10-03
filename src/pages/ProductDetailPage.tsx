import { useCatalogActivity } from '../hooks/useCatalogActivity';
import { unitPrice } from '../lib/catalogActivity';
import { useSavedProducts } from '../hooks/useSavedProducts';
import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PRODUCTS, getProductImage } from '../data/products';
import { useProductMedia, useProductMediaCover } from '../contexts/ProductMediaContext';
import { clampPhotoIndex } from '../lib/productPhotoViewer';
import ProductVideo from '../components/ProductVideo';
import { Product, CartItem } from '../types';
import ProductDetailAccordion from '../components/ProductDetailAccordion';
import SEO from '../components/SEO';
import { ShoppingBag, ShieldCheck, Check, Sparkles, ArrowRight, Truck, Award, AlertCircle, Info, Share2, Maximize2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import TrustBadges from '../components/TrustBadges';
import { useLanguage } from '../contexts/LanguageContext';
import { getLocalized } from '../utils/localize';
import PulseHeart from '../components/PulseHeart';
import { buildHumanSupportWhatsAppUrl } from '../config/contacts';

const ProductPhotoViewer = lazy(() => import('../components/ProductPhotoViewer'));

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, setIsCartOpen } = useCart();
  const { t, language } = useLanguage();
  
  const product = PRODUCTS.find((p) => p.id === id);
  const productMedia = useProductMedia(product);
  const mediaCover = useProductMediaCover();
  const [selectedWeightIndex, setSelectedWeightIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const photoViewerOpener = useRef<HTMLButtonElement | null>(null);
  const { savedIds, setSaved } = useSavedProducts();
  const { view } = useCatalogActivity();
  const isSaved = !!id && savedIds.includes(id);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const isGiftProduct = product?.category === 'hampers' || product?.category === 'deals' || product?.category === 'combos' || product?.id?.includes('hamper') || product?.id?.includes('gift') || product?.id?.includes('deal');
  const galleryImages = useMemo(() => product ? productMedia.images.map(src => ({ src, alt: t(`imageAlt.${product.id}`, getLocalized(product, 'name', language)) })) : [], [product, productMedia.images, language, t]);
  const galleryKey = productMedia.images.join('\u0000');
  const activeGalleryIndex = clampPhotoIndex(activeGalleryIdx, galleryImages.length);
  useEffect(() => { setActiveGalleryIdx(current => clampPhotoIndex(current, productMedia.images.length)); setImageError(false); }, [galleryKey, productMedia.images.length]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) view(id);
    setSelectedWeightIndex(0);
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
    const sameCategory = PRODUCTS.filter((p) => p.id !== product.id && p.category === product.category);
    const otherBestsellers = PRODUCTS.filter((p) => p.id !== product.id && p.category !== product.category);
    return [...sameCategory, ...otherBestsellers].slice(0, 4);
  }, [product]);

  if (!product) {
    return (
      <div className="w-full min-h-[70vh] bg-[var(--color-base,#F6F1EA)] flex items-center justify-center py-20 px-4 select-none">
        <div className="max-w-lg w-full bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/30 rounded-3xl p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-emerald,#042821)]/5 border border-[var(--color-gold,#C7982F)]/30 flex items-center justify-center mx-auto mb-4 text-[var(--color-gold,#C7982F)]">
            <Sparkles size={28} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-gold,#C7982F)] block mb-2">
            AllBarka Reserve
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--color-ink,#29231D)] mb-3">
            Product Not Found
          </h1>
          <p className="text-sm text-[var(--color-ink,#29231D)]/70 mb-8 leading-relaxed max-w-sm mx-auto">
            The luxury harvest lot or curio selection you are looking for has been retired or relocated to our archival cellar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/shop')}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[var(--color-emerald,#042821)] text-[var(--color-surface,#FFFCF7)] text-xs font-bold uppercase tracking-wider hover:bg-[#03201A] transition-colors border border-[var(--color-gold,#C7982F)]/40 shadow-sm"
            >
              Explore Full Shop
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-white text-[var(--color-ink,#29231D)] text-xs font-bold uppercase tracking-wider border border-[var(--color-gold,#C7982F)]/30 hover:border-[var(--color-gold,#C7982F)] transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const weights = Object.keys(product.prices);
  const selectedWeight = weights[selectedWeightIndex] || weights[0];
  const priceToUse = product.prices[selectedWeight];
  const unit = unitPrice(priceToUse, selectedWeight);

  const handleAddToCart = () => {
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
      quantity: quantity,
      wholesale: false,
    });

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      setIsCartOpen(true);
    }, 400);
  };

  const siteOrigin = typeof window === 'undefined' ? 'https://allbarka.com' : window.location.origin;

  return (
    <div dir="ltr" className="w-full bg-[var(--color-base,#F6F1EA)] pt-6 sm:pt-10 pb-24 select-none">
      <SEO
        title={getLocalized(product, 'name', language)}
        description={getLocalized(product, 'desc', language)}
        canonicalPath={`/product/${product.id}`}
        type="product"
        image={productMedia.images[0]}
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
          offers: {
            '@type': 'Offer',
            url: `${siteOrigin}/product/${product.id}`,
            priceCurrency: 'PKR',
            price: priceToUse,
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition'
          }
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          
          {/* Left: Product Visual Showcase */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-28">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/30 shadow-sm flex items-center justify-center p-6 group">
              {imageError ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#FAF9F5] to-[#EFE7D8]">
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
                  className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              )}

              {/* Reference image caption for hampers */}
              {isGiftProduct && (
                <div className="absolute bottom-4 left-4 right-4 z-10 text-center pointer-events-none">
                  <p className="text-[9px] italic text-[#635B52] dark:text-[#A8A199] bg-white/70 dark:bg-black/40 backdrop-blur-sm px-2 py-1 rounded inline-block w-auto mx-auto shadow-sm">
                    Reference image — actual packaging may vary slightly.
                  </p>
                </div>
              )}

              {/* Tag Badge */}
              {getLocalized(product, 'tag', language) && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3.5 py-1.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest bg-[var(--color-primary,#042821)] text-[var(--color-text-on-emerald,#FFFCF7)] border border-[var(--color-accent,#C7982F)]/50 shadow-md">
                    {getLocalized(product, 'tag', language)}
                  </span>
                </div>
              )}

              {/* Origin Pill */}
              {getLocalized(product, 'origin', language) && !isGiftProduct && (
                <div className="absolute bottom-4 left-4 z-10">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-[#1A201E]/90 text-[var(--color-text-primary,#29231D)] dark:text-[var(--color-text-primary,#F6F1EA)] border border-[var(--color-accent,#C7982F)]/30 backdrop-blur-xs shadow-xs">
                    {getLocalized(product, 'origin', language)}
                  </span>
                </div>
              )}
            </div>

            <button type="button" aria-haspopup="dialog" aria-expanded={photoViewerOpen} onClick={event => { photoViewerOpener.current = event.currentTarget; setPhotoViewerOpen(true); }} className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-xs font-semibold text-[var(--color-accent-text)]" dir="ltr"><Maximize2 size={16} aria-hidden="true" /><span dir="auto">{t('gallery.viewPhotos')}</span><bdi className="text-[var(--color-text-secondary)]">({galleryImages.length})</bdi></button>

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
          <div className="flex flex-col text-left">
            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)] block mb-1.5">
                Single-Origin Batch • Hand-Sorted Lahore
              </span>
              <h1 dir="auto" className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[var(--color-primary,#042821)] dark:text-[var(--color-text-primary,#F6F1EA)] leading-tight mb-2">
                {getLocalized(product, 'name', language)}
              </h1>
              <p dir="auto" className="text-sm text-[var(--color-text-secondary,#635B52)] dark:text-[var(--color-text-secondary,#B4C0BC)] font-normal leading-relaxed">
                {getLocalized(product, 'desc', language)}
              </p>

              {getLocalized(product, 'tasteProfile', language) && (
                <div className="mt-3 p-3 rounded-xl bg-[var(--color-surface,#FFFCF7)] dark:bg-[#1A201E] border border-[var(--color-accent,#C7982F)]/25 text-xs text-[var(--color-text-primary,#29231D)] dark:text-[var(--color-text-primary,#F6F1EA)]">
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
            </div>
            
            {/* Price Row */}
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 py-4 border-y border-[var(--color-accent,#C7982F)]/25 mb-6">
              <span className="text-3xl sm:text-4xl font-serif font-bold text-[var(--color-text-price,#29231D)] dark:text-[var(--color-text-price,#F6F1EA)]">
                <bdi dir="ltr">Rs. {priceToUse?.toLocaleString()}</bdi>
              </span>
              <span className="text-xs font-semibold text-[#0E7A53] dark:text-[#28A745] bg-[#0E7A53]/10 px-2.5 py-1 rounded-full">
                {t('inStock', 'In Stock')}
              </span>
            </div>

            {unit && <p className="mb-5 text-xs text-[var(--color-text-secondary)]"><bdi>Rs. {unit.amount.toLocaleString()} / {unit.unit}</bdi></p>}
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
                      onClick={() => setSelectedWeightIndex(idx)}
                      className={`min-h-[44px] min-w-[70px] px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[var(--color-primary,#042821)] border-[var(--color-primary,#042821)] text-[var(--color-text-on-emerald,#FFFCF7)] shadow-sm' 
                          : 'bg-white dark:bg-[#1C2422] border-[var(--color-accent,#C7982F)]/30 text-[var(--color-text-primary,#29231D)] dark:text-[var(--color-text-primary,#F6F1EA)] hover:border-[var(--color-accent,#C7982F)]'
                      }`}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity & Add to Cart (minimum 44px tap targets) */}
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center justify-center bg-white dark:bg-[#1C2422] border border-[var(--color-accent,#C7982F)]/35 rounded-xl h-12 px-2 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
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
                    onClick={() => setQuantity(Math.min(50, quantity + 1))}
                    className="w-11 h-11 flex items-center justify-center text-[var(--color-text-primary,#29231D)] dark:text-white hover:text-[var(--color-accent,#C7982F)] transition-colors cursor-pointer text-lg font-bold"
                    aria-label={t('cart.increase')}
                  >
                    +
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAdded}
                  className={`flex-1 min-h-[48px] rounded-xl flex items-center justify-center gap-2.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm ${
                    isAdded 
                      ? 'bg-[var(--color-accent,#C7982F)] text-[var(--color-text-on-gold,#121615)] shadow-md scale-[1.01]' 
                      : 'bg-[var(--color-primary,#042821)] text-[var(--color-text-on-emerald,#FFFCF7)] hover:bg-[#03201A] border border-[var(--color-accent,#C7982F)]/40 hover:border-[var(--color-accent,#C7982F)]'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check size={16} className="text-emerald-300" />
                      <span>{t('addedToCart')}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={16} className="text-[var(--color-accent,#C7982F)]" />
                      <span>{t('addToCartPrice', 'Add to Cart')} — <bdi dir="ltr">Rs. {(priceToUse * quantity)?.toLocaleString()}</bdi></span>
                    </>
                  )}
                </button>
              </div>
              
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
            <div className="grid grid-cols-2 gap-3 mb-8 p-3.5 rounded-2xl bg-[var(--color-surface,#FFFCF7)] dark:bg-[#1A201E] border border-[var(--color-accent,#C7982F)]/25">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary,#635B52)] dark:text-[var(--color-text-secondary,#B4C0BC)]">
                <Truck size={15} className="text-[var(--color-accent,#C7982F)] shrink-0" />
                <span>{t('boutique.delivery')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary,#635B52)] dark:text-[var(--color-text-secondary,#B4C0BC)]">
                <ShieldCheck size={15} className="text-[var(--color-accent,#C7982F)] shrink-0" />
                <span>{t('trust.fresh')}</span>
              </div>
            </div>

            {/* Accordions for Sourcing, Storage, and Packaging */}
            <div className="mb-10">
              <ProductDetailAccordion product={product} />
            </div>

            <div className="mt-8 border-t border-[var(--color-accent,#C7982F)]/20 pt-8">
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

        {/* ── RELATED HARVESTS STRIP (Discovery Continuity) ───────────────── */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 pt-12 border-t border-[var(--color-accent,#C7982F)]/25">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 text-left">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-accent-text,#806326)] dark:text-[var(--color-accent-text,#E4C783)] block mb-1">
                  Discovery Continuity
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--color-primary,#042821)] dark:text-[var(--color-text-primary,#F6F1EA)]">
                  Complementary Gourmet Selections
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
                const firstWeight = Object.keys(rel.prices)[0];
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
                        {getLocalized(rel, 'origin', language) && (
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-white/90 text-[var(--color-ink,#29231D)] border border-[var(--color-gold,#C7982F)]/30">
                            {getLocalized(rel, 'origin', language)}
                          </span>
                        )}
                      </div>
                      <h3 dir="auto" className="text-sm font-serif font-bold text-[var(--color-ink,#29231D)] group-hover:text-[var(--color-gold,#C7982F)] transition-colors line-clamp-1">
                        {getLocalized(rel, 'name', language)}
                      </h3>
                      <p dir="auto" className="text-[11px] text-[var(--color-ink,#29231D)]/60 line-clamp-1 mt-0.5">
                        {getLocalized(rel, 'desc', language)}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[var(--color-gold,#C7982F)]/15 flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--color-emerald,#042821)]">
                        Rs. {price?.toLocaleString()}
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
      {photoViewerOpen && <Suspense fallback={<span className="sr-only" role="status">{t('viewer.loading')}</span>}><ProductPhotoViewer key={product.id} images={galleryImages} productName={getLocalized(product, 'name', language)} initialIndex={activeGalleryIndex} restoreFocusTo={photoViewerOpener.current} onClose={() => setPhotoViewerOpen(false)} onIndexChange={index => { setActiveGalleryIdx(index); setImageError(false); }} /></Suspense>}
    </div>
  );
}
