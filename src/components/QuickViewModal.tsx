import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { X, ShoppingBag, Minus, Plus, ArrowUpRight } from 'lucide-react';
import type { Product } from '../types';
import ProductDetailAccordion from './ProductDetailAccordion';
import ProductImageGallery from './ProductImageGallery';
import PulseHeart from './PulseHeart';
import { useCart } from '../contexts/CartContext';
import { useSavedProducts } from '../hooks/useSavedProducts';
import { acquireScrollLock } from '../utils/scrollLock';
import { useLanguage } from '../contexts/LanguageContext';
import { getLocalized } from '../utils/localize';
import { useProductMedia } from '../contexts/ProductMediaContext';
import ProductVideo from './ProductVideo';

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart?: (productId: string, weight: string, quantity?: number) => void;
}

export default function QuickViewModal({ isOpen, onClose, product, onAddToCart }: QuickViewModalProps) {
  const { addToCart } = useCart();
  const { t, language, isRtl } = useLanguage();
  const { savedIds, setSaved } = useSavedProducts();
  const reduceMotion = useReducedMotion();
  const [selectedWeight, setSelectedWeight] = useState('');
  const [quantity, setQuantity] = useState(1);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const productId = product?.id;
  const productMedia = useProductMedia(product);

  useEffect(() => {
    if (!isOpen || !productId) return;
    setSelectedWeight('');
    setQuantity(1);
    const previousFocus = document.activeElement as HTMLElement | null;
    const releaseLock = acquireScrollLock();
    const frame = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]') || []);
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', handleKey); releaseLock(); previousFocus?.focus(); };
  }, [isOpen, productId]);

  if (!isOpen || !product || product.active === false) return null;
  const weights = Object.keys(product.prices).filter(weight => product.prices[weight] > 0);
  const weight = weights.includes(selectedWeight) ? selectedWeight : weights[0];
  const price = product.prices[weight] || 0;
  const add = () => {
    if (product.quoteOnly || !weight || !price) return;
    if (onAddToCart) onAddToCart(product.id, weight, quantity);
    else addToCart(product, weight, quantity);
    onClose();
  };

  return <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6" dir="ltr">
    <motion.div aria-hidden="true" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : .2 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="quickview-product-name" id="quickview-modal-container"
      initial={reduceMotion ? false : { opacity: 0, y: 15, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0 : .2 }}
      className="relative z-10 grid max-h-[90svh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-2xl md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <button type="button" id="quickview-close-btn" onClick={onClose} aria-label={t('close')} className="focus-ring absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"><X size={18} /></button>
      <div className="relative min-w-0 border-b border-[var(--color-border)] bg-[var(--color-base)] p-4 pt-16 md:border-b-0 md:border-r md:p-5 md:pt-8">
        <div className="mx-auto w-full max-w-[240px] md:sticky md:top-8 md:max-w-none"><ProductImageGallery key={product.id} product={product} linkToDetails={false} />
          <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-text)]" dir="auto">{getLocalized(product, 'origin', language)}</p>
          <ProductVideo videoUrl={productMedia.videoUrl} poster={productMedia.videoPoster || productMedia.images[0]} productName={getLocalized(product, 'name', language)} className="mt-4" />
        </div>
      </div>
      <div className="min-w-0 p-5 sm:p-7 md:pt-16" dir={isRtl ? 'rtl' : 'ltr'}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent-text)]" dir="auto">{getLocalized(product, 'health', language)}</p>
        <h2 id="quickview-product-name" lang={language} className={`max-w-full whitespace-normal break-words [overflow-wrap:anywhere] ${language === 'ur' ? 'font-urdu text-[27px]' : language === 'ar' ? 'font-arabic text-3xl' : 'font-serif text-3xl leading-tight'}`} dir="auto">{getLocalized(product, 'name', language)}</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]" dir="auto">{getLocalized(product, 'desc', language)}</p>
        {getLocalized(product, 'tasteProfile', language) && <div className="mt-4 rounded-xl border border-[var(--color-border)] p-3 text-xs leading-6"><strong className="block text-[var(--color-accent-text)]">{t('tasteProfile')}</strong><span dir="auto">{getLocalized(product, 'tasteProfile', language)}</span></div>}
        {getLocalized(product, 'contents', language) && <div className="mt-3 rounded-xl border border-[var(--color-border)] p-3 text-xs leading-6"><strong className="block text-[var(--color-accent-text)]">{t('packContents')}</strong><span dir="auto">{getLocalized(product, 'contents', language)}</span></div>}
        {product.quoteOnly ? <><p className="mt-5 text-sm leading-7 text-[var(--color-text-secondary)]">{t('catalog.quoteDescription')}</p><Link to="/pages/contact" onClick={onClose} className="focus-ring mt-4 flex min-h-12 items-center justify-center rounded-full bg-[#1e3a2b] px-4 text-sm font-semibold text-[#fff8e9]">{t('catalog.requestQuote')}</Link></> : <>
        <div className="mt-5 flex items-center justify-between gap-3"><p className="font-serif text-3xl"><bdi>Rs. {price.toLocaleString()}</bdi></p><span className="rounded-full bg-[#0e7a53]/10 px-3 py-1.5 text-xs text-[#0e7a53] dark:text-[#8cd7b1]">{t('inStock')}</span></div>
        <fieldset className="mt-5"><legend className="mb-3 text-xs font-semibold uppercase tracking-wider">{t('selectWeight')}</legend><div className="flex flex-wrap gap-2" dir="ltr">{weights.map(size => <button type="button" key={size} aria-pressed={weight === size} onClick={() => setSelectedWeight(size)} className={`focus-ring min-h-11 rounded-full border px-5 text-xs font-semibold ${weight === size ? 'border-[#1e3a2b] bg-[#1e3a2b] text-[#fff8e9]' : 'border-[var(--color-border)] hover:border-[#c7982f]'}`}>{size}</button>)}</div></fieldset>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex min-h-12 items-center rounded-full border border-[var(--color-border)]" dir="ltr">
          <button type="button" aria-label={t('cart.decrease')} disabled={quantity <= 1} onClick={() => setQuantity(q => Math.max(1, q - 1))} className="focus-ring flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-30"><Minus size={16} /></button>
          <output aria-label={t('quantity')} className="min-w-8 text-center text-sm">{quantity}</output>
          <button type="button" aria-label={t('cart.increase')} disabled={quantity >= 50} onClick={() => setQuantity(q => Math.min(50, q + 1))} className="focus-ring flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-30"><Plus size={16} /></button>
        </div><PulseHeart liked={savedIds.includes(product.id)} onChange={next => setSaved(product.id, next)} label={t('shop.save')} savedLabel={t('shop.unsave')} /></div>
        <button type="button" onClick={add} id="quickview-add-to-cart-btn" disabled={!price || !weight} className="focus-ring mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1e3a2b] px-4 text-sm font-semibold text-[#fff8e9] hover:bg-[#092e23] disabled:opacity-40"><ShoppingBag size={17} />{t('addToCart')}<bdi>— Rs. {(price * quantity).toLocaleString()}</bdi></button>
        </>}
        <Link to={`/product/${product.id}`} onClick={onClose} className="focus-ring mt-2 flex min-h-11 items-center justify-center gap-2 rounded-full text-xs font-semibold text-[var(--color-accent-text)]">{t('viewFullDetails')}<ArrowUpRight size={16} /></Link>
        <div className="mt-5"><ProductDetailAccordion key={product.id} product={product} defaultOpenKey="" /></div>
      </div>
    </motion.div>
  </div>;
}
