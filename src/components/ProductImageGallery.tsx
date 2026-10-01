import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { Product } from '../types';
import { getProductImages } from '../data/productImages';
import { getLocalized } from '../utils/localize';
import { useLanguage } from '../contexts/LanguageContext';

/** Native scrolling keeps image swipes independent of the surrounding product row. */
export default function ProductImageGallery({ product }: { product: Product }) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const images = getProductImages(product);
  const goTo = (index: number) => {
    const next = (index + images.length) % images.length;
    setActive(next);
    viewport.current?.scrollTo({ left: next * viewport.current.clientWidth, behavior: reduceMotion ? 'instant' : 'smooth' });
  };
  return (
    <div className="product-gallery" role="group" aria-label={`${getLocalized(product, 'name', language)} — ${t('gallery.photos')}`}
      onMouseDown={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()}>
      <div ref={viewport} className="product-gallery-track" dir="ltr"
        onScroll={event => setActive(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}>
        {images.map((src, index) => (
          <Link key={src} to={`/product/${product.id}`} className="product-gallery-slide focus-ring" tabIndex={active === index ? 0 : -1}
            aria-label={`${getLocalized(product, 'name', language)} — ${index + 1}/${images.length}`}>
            <img src={src} width={960} height={960} alt={`${t(`imageAlt.${product.id}`, getLocalized(product, 'name', language))} — ${index + 1}`}
              loading="lazy" decoding="async" draggable={false}
              onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/product-placeholder.svg'; }} />
          </Link>
        ))}
      </div>
      {images.length > 1 && <>
        <button type="button" className="product-gallery-arrow product-gallery-prev focus-ring" onClick={() => goTo(active - 1)} aria-label={t('gallery.previous')}><ChevronLeft size={17} /></button>
        <button type="button" className="product-gallery-arrow product-gallery-next focus-ring" onClick={() => goTo(active + 1)} aria-label={t('gallery.next')}><ChevronRight size={17} /></button>
        <div className="product-gallery-dots" dir="ltr">
          {images.map((src, index) => <button key={src} type="button" className="focus-ring" aria-label={`${t('gallery.photo')} ${index + 1}`} aria-pressed={active === index} onClick={() => goTo(index)}><span /></button>)}
        </div>
      </>}
    </div>
  );
}
