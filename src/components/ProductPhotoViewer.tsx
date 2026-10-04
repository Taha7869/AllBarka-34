import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, ImageOff, LoaderCircle, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { acquireScrollLock } from '../utils/scrollLock';
import { changePhotoZoom, clampPhotoIndex, nextPhotoIndex, photoSwipeStep, prepareProductPhotos, type ProductPhoto } from '../lib/productPhotoViewer';
import '../styles/product-photo-viewer.css';

interface ProductPhotoViewerProps {
  images: ProductPhoto[];
  productName: string;
  initialIndex?: number;
  restoreFocusTo?: HTMLElement | null;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  hideSingleImageCounter?: boolean;
}

export default function ProductPhotoViewer({ images, productName, initialIndex = 0, restoreFocusTo, onClose, onIndexChange, hideSingleImageCounter = false }: ProductPhotoViewerProps) {
  const { t } = useLanguage();
  const photos = useMemo(() => prepareProductPhotos(images, { src: '/images/product-placeholder.svg', alt: productName }), [images, productName]);
  const [index, setIndex] = useState(() => clampPhotoIndex(initialIndex, photos.length));
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [retries, setRetries] = useState<Record<string, number>>({});
  const [dragging, setDragging] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const thumbButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const touch = useRef<{ x: number; y: number; time: number } | null>(null);
  const pan = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(null);
  const closeRef = useRef(onClose);
  const changeRef = useRef(onIndexChange);
  closeRef.current = onClose;
  changeRef.current = onIndexChange;
  const titleId = useId();
  const hintId = useId();
  const active = clampPhotoIndex(index, photos.length);
  const photo = photos[active];
  const isFailed = Boolean(failed[photo.src]);
  const retry = retries[photo.src] || 0;
  const imageSrc = retry ? `${photo.src}${photo.src.includes('?') ? '&' : '?'}viewer-retry=${retry}` : photo.src;

  const goTo = useCallback((next: number) => {
    setIndex(clampPhotoIndex(next, photos.length));
    setZoom(1);
    setDragging(false);
    pan.current = null;
    touch.current = null;
  }, [photos.length]);
  const move = useCallback((step: number) => { if (photos.length <= 1) return; setIndex(current => nextPhotoIndex(current, step, photos.length)); setZoom(1); pan.current = null; touch.current = null; setDragging(false); }, [photos.length]);
  const moveRef = useRef(move);
  moveRef.current = move;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const previousFocus = restoreFocusTo || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const root = document.getElementById('root');
    const previousInert = root?.inert || false;
    const previousHidden = root?.getAttribute('aria-hidden');
    closeButton.current?.focus({ preventScroll: true });
    if (root) { root.inert = true; root.setAttribute('aria-hidden', 'true'); }
    const releaseLock = acquireScrollLock();
    const frame = requestAnimationFrame(() => closeButton.current?.focus({ preventScroll: true }));
    const focusable = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]') || []).filter(element => !element.hidden && element.getClientRects().length > 0);
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); return; }
      if (event.key === 'Tab') {
        const controls = focusable();
        const first = controls[0]; const last = controls[controls.length - 1];
        if (!controls.length) { event.preventDefault(); dialog.current?.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (document.activeElement === stage.current && zoomRef.current > 1 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault(); stage.current?.scrollBy({ left: event.key === 'ArrowLeft' ? -80 : 80, behavior: 'instant' }); return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); moveRef.current(event.key === 'ArrowLeft' ? -1 : 1); }
    };
    const focusIn = (event: FocusEvent) => { if (event.target instanceof Node && !dialog.current?.contains(event.target)) closeButton.current?.focus({ preventScroll: true }); };
    document.addEventListener('keydown', keyDown, true);
    document.addEventListener('focusin', focusIn);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keyDown, true);
      document.removeEventListener('focusin', focusIn);
      if (root) {
        root.inert = previousInert;
        if (previousHidden === null || previousHidden === undefined) root.removeAttribute('aria-hidden'); else root.setAttribute('aria-hidden', previousHidden);
      }
      releaseLock();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [restoreFocusTo]);

  useEffect(() => {
    changeRef.current?.(active);
    const button = thumbButtons.current[active];
    if (button) button.parentElement?.scrollTo({ left: Math.max(0, button.offsetLeft - button.parentElement.clientWidth / 2 + button.offsetWidth / 2), behavior: 'instant' });
  }, [active]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!stage.current) return;
      stage.current.scrollTo({ left: Math.max(0, (stage.current.scrollWidth - stage.current.clientWidth) / 2), top: Math.max(0, (stage.current.scrollHeight - stage.current.clientHeight) / 2), behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [zoom, active]);

  const retryPhoto = () => {
    setFailed(current => ({ ...current, [photo.src]: false }));
    setLoaded(current => ({ ...current, [photo.src]: false }));
    setRetries(current => ({ ...current, [photo.src]: (current[photo.src] || 0) + 1 }));
  };
  const zoomLabel = t('viewer.zoomLevel').replace('{percent}', String(Math.round(zoom * 100)));
  const photoCount = t('viewer.photoOf').replace('{current}', String(active + 1)).replace('{total}', String(photos.length));
  const photoAlt = photo.alt ? `${photo.alt} — ${active + 1}` : t('viewer.photoAlt').replace('{name}', productName).replace('{number}', String(active + 1));
  const singleIllustration = hideSingleImageCounter && photos.length === 1;
  const showHint = !singleIllustration || zoom > 1;
  if (typeof document === 'undefined') return null;

  return createPortal(<div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={showHint ? hintId : undefined} tabIndex={-1} dir="ltr" className="product-photo-viewer">
    <header className="photo-viewer-header">
      <div className="photo-viewer-title"><span className="photo-viewer-eyebrow" dir="auto">{t('viewer.title')}</span><h2 id={titleId} dir="auto">{productName}</h2></div>
      <button ref={closeButton} type="button" onClick={() => closeRef.current()} className="photo-viewer-control focus-ring" aria-label={t('viewer.close')}><X size={21} aria-hidden="true" /></button>
    </header>
    <div className="photo-viewer-main">
      <div ref={stage} role="group" className={`photo-viewer-stage ${zoom > 1 ? 'is-zoomed' : ''} ${dragging ? 'is-dragging' : ''}`} style={{ touchAction: zoom > 1 ? 'pan-x pan-y pinch-zoom' : 'pan-y pinch-zoom' }} tabIndex={zoom > 1 ? 0 : undefined} aria-label={`${photoAlt} — ${zoomLabel}`}
        onTouchStart={event => { touch.current = event.touches.length === 1 && zoom === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY, time: performance.now() } : null; }}
        onTouchMove={event => {
          if (!touch.current) return;
          if (event.touches.length !== 1) { touch.current = null; return; }
          const dx = event.touches[0].clientX - touch.current.x; const dy = event.touches[0].clientY - touch.current.y;
          if (Math.abs(dy) > 15 && Math.abs(dy) > Math.abs(dx)) touch.current = null;
        }}
        onTouchEnd={event => {
          const start = touch.current; touch.current = null;
          if (!start || event.touches.length || event.changedTouches.length !== 1) return;
          const step = photoSwipeStep(start, { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY, time: performance.now() }, 1, zoom);
          if (step) move(step);
        }} onTouchCancel={() => { touch.current = null; }}
        onPointerDown={event => {
          if (zoom <= 1 || event.pointerType !== 'mouse' || event.button !== 0 || isFailed) return;
          event.preventDefault();
          pan.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
          event.currentTarget.setPointerCapture(event.pointerId); setDragging(true);
        }}
        onPointerMove={event => { const drag = pan.current; if (!drag || drag.pointer !== event.pointerId) return; event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x); event.currentTarget.scrollTop = drag.top - (event.clientY - drag.y); }}
        onPointerUp={event => { if (pan.current?.pointer !== event.pointerId) return; pan.current = null; setDragging(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={() => { pan.current = null; setDragging(false); }} onLostPointerCapture={() => { pan.current = null; setDragging(false); }}>
        {isFailed ? <div className="photo-viewer-error"><ImageOff size={34} aria-hidden="true" /><p dir="auto">{t('viewer.imageError')}</p><button type="button" onClick={retryPhoto} className="photo-viewer-text-control focus-ring">{t('viewer.retry')}</button></div>
          : <div className="photo-viewer-canvas" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
            {!loaded[photo.src] && <span className="photo-viewer-loading" role="status"><LoaderCircle size={27} className="motion-safe:animate-spin" aria-hidden="true" /><span className="sr-only">{t('viewer.loading')}</span></span>}
            <img key={imageSrc} src={imageSrc} alt={photoAlt} width={960} height={960} draggable={false} decoding="async" className="photo-viewer-image" onLoad={() => { setLoaded(current => ({ ...current, [photo.src]: true })); setFailed(current => ({ ...current, [photo.src]: false })); }} onError={() => setFailed(current => ({ ...current, [photo.src]: true }))} />
          </div>}
      </div>
      {photos.length > 1 && <><button type="button" onClick={() => move(-1)} className="photo-viewer-control photo-viewer-previous focus-ring" aria-label={t('gallery.previous')}><ArrowLeft size={20} aria-hidden="true" /></button><button type="button" onClick={() => move(1)} className="photo-viewer-control photo-viewer-next focus-ring" aria-label={t('gallery.next')}><ArrowRight size={20} aria-hidden="true" /></button></>}
    </div>
    <footer className="photo-viewer-footer">
      <div className="photo-viewer-tools">{!singleIllustration && <span className="photo-viewer-counter" role="status" aria-live="polite" aria-atomic="true" dir="auto">{photoCount}</span>}<div className="photo-viewer-zoom-tools">
        <button type="button" onClick={() => setZoom(current => changePhotoZoom(current, -1))} disabled={zoom <= 1 || isFailed} className="photo-viewer-control focus-ring" aria-label={t('viewer.zoomOut')}><ZoomOut size={19} aria-hidden="true" /></button>
        <output className="photo-viewer-zoom-level" aria-label={zoomLabel}>{Math.round(zoom * 100)}%</output>
        <button type="button" onClick={() => setZoom(current => changePhotoZoom(current, 1))} disabled={zoom >= 2 || isFailed} className="photo-viewer-control focus-ring" aria-label={t('viewer.zoomIn')}><ZoomIn size={19} aria-hidden="true" /></button>
        <button type="button" onClick={() => setZoom(1)} disabled={zoom === 1} className="photo-viewer-control focus-ring" aria-label={t('viewer.reset')}><RotateCcw size={17} aria-hidden="true" /></button>
      </div></div>
      {photos.length > 1 && <div className="photo-viewer-thumbnails" role="group" aria-label={t('gallery.photos')}>{photos.map((image, photoIndex) => <button key={image.src} ref={element => { thumbButtons.current[photoIndex] = element; }} type="button" onClick={() => goTo(photoIndex)} aria-pressed={active === photoIndex} aria-label={t('viewer.select').replace('{number}', String(photoIndex + 1))} className="photo-viewer-thumbnail focus-ring">{failed[image.src] ? <ImageOff size={19} aria-hidden="true" /> : <img src={retries[image.src] ? `${image.src}${image.src.includes('?') ? '&' : '?'}viewer-retry=${retries[image.src]}` : image.src} alt="" width={64} height={64} loading="lazy" draggable={false} onError={() => setFailed(current => ({ ...current, [image.src]: true }))} />}</button>)}</div>}
      {showHint && <p id={hintId} className="photo-viewer-hint" dir="auto">{t(zoom > 1 ? 'viewer.zoomHint' : 'viewer.swipeHint')}</p>}
    </footer>
  </div>, document.body);
}
