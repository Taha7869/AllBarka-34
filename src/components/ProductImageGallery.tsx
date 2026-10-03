import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { Product } from '../types';
import { useProductMedia } from '../contexts/ProductMediaContext';
import { clampPhotoIndex } from '../lib/productPhotoViewer';
import { getLocalized } from '../utils/localize';
import { useLanguage } from '../contexts/LanguageContext';

/** Native scrolling keeps image swipes independent of the surrounding product row. */
export default function ProductImageGallery({ product, linkToDetails = true }: { product: Product; linkToDetails?: boolean }) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const { images } = useProductMedia(product);
  const active = clampPhotoIndex(selected, images.length);
  const activeIndex = useRef(active);
  activeIndex.current = active;
  const galleryKey = images.join('\u0000');
  useEffect(() => {
    setSelected(current => clampPhotoIndex(current, images.length));
    const track = viewport.current;
    if (track) track.scrollTo({ left: activeIndex.current * track.clientWidth, behavior: 'instant' });
  }, [galleryKey, images.length]);
  const goTo = (index: number) => {
    const next = (index + images.length) % images.length;
    setSelected(next);
    viewport.current?.scrollTo({ left: next * viewport.current.clientWidth, behavior: reduceMotion ? 'instant' : 'smooth' });
  };
  return (
    <div className="product-gallery" role="group" aria-label={`${getLocalized(product, 'name', language)} — ${t('gallery.photos')}`}
      onMouseDown={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()}>
      <div ref={viewport} className="product-gallery-track" dir="ltr"
        onScroll={event => { const width = event.currentTarget.clientWidth; if (width > 0) setSelected(Math.max(0, Math.min(images.length - 1, Math.round(event.currentTarget.scrollLeft / width)))); }}>
        {images.map((src, index) => {
          const photo = <img src={src} width={960} height={960} alt={`${t(`imageAlt.${product.id}`, getLocalized(product, 'name', language))} — ${index + 1}`}
              loading="lazy" decoding="async" draggable={false}
              onError={event => { if (!event.currentTarget.src.endsWith('/images/product-placeholder.svg')) event.currentTarget.src = '/images/product-placeholder.svg'; }} />;
          return linkToDetails ? <Link key={src} to={`/product/${product.id}`} className="product-gallery-slide focus-ring" tabIndex={active === index ? 0 : -1}
            aria-label={`${getLocalized(product, 'name', language)} — ${index + 1}/${images.length}`}>{photo}</Link>
            : <div key={src} className="product-gallery-slide">{photo}</div>;
        })}
      </div>
      {images.length > 1 && <>
        <button type="button" className="product-gallery-arrow product-gallery-prev focus-ring" onClick={() => goTo(active - 1)} aria-label={t('gallery.previous')}><ChevronLeft size={17} /></button>
        <button type="button" className="product-gallery-arrow product-gallery-next focus-ring" onClick={() => goTo(active + 1)} aria-label={t('gallery.next')}><ChevronRight size={17} /></button>
        <span className="product-gallery-counter" dir="ltr" role="status" aria-live="off" aria-label={`${t('gallery.photo')} ${active + 1}/${images.length}`}>
          <span aria-hidden="true">{String(active + 1).padStart(2, '0')}<span className="product-gallery-counter__divider">/</span>{String(images.length).padStart(2, '0')}</span>
        </span>
      </>}
    </div>
  );
}
