import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Compass, ShoppingBag, X } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { selectionMatches, selectionResultsPath } from '../lib/selectionGuide';
import { getLocalized } from '../utils/localize';
import { acquireScrollLock } from '../utils/scrollLock';
import '../styles/selection-guide.css';

interface SelectionGuideProps { onClose: () => void; opener: HTMLElement | null }

export default function SelectionGuide({ onClose, opener }: SelectionGuideProps) {
  const { t, language, isRtl } = useLanguage();
  const { addToCart } = useCart();
  const mediaCover = useProductMediaCover();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  const [category, setCategory] = useState('all');
  const [budget, setBudget] = useState<number | null>(null);
  const [addedId, setAddedId] = useState('');
  const preferences = useMemo(() => ({ category, budget }), [category, budget]);
  const matches = useMemo(() => selectionMatches(PRODUCTS, preferences), [preferences]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const release = acquireScrollLock();
    return () => {
      dialog.close();
      release();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [opener]);

  return createPortal(<dialog ref={dialogRef} className="selection-guide" aria-labelledby={titleId} dir={isRtl ? 'rtl' : 'ltr'}
    onCancel={event => { event.preventDefault(); closeRef.current(); }} onClose={() => { if (!dialogRef.current?.open) closeRef.current(); }}>
    <header className="selection-guide-header">
      <div><p className="selection-guide-eyebrow"><Compass size={14} aria-hidden="true" />{t('guide.eyebrow')}</p><h2 id={titleId}>{t('guide.title')}</h2><p>{t('guide.copy')}</p></div>
      <button type="button" autoFocus onClick={onClose} aria-label={t('close')} className="focus-ring selection-guide-close"><X size={20} /></button>
    </header>
    <div className="selection-guide-body">
      <div className="selection-guide-controls">
        <fieldset><legend>{t('guide.collection')}</legend><div className="selection-guide-choices">{['all', 'nuts', 'snacks-seeds', 'gift-boxes', 'oils', 'essentials'].map(id => <button type="button" key={id} aria-pressed={category === id} onClick={() => { setCategory(id); setAddedId(''); }} className="focus-ring">{t(`shop.${id}`)}</button>)}</div></fieldset>
        <label className="selection-guide-budget"><span>{t('guide.budget')}</span><select value={budget ?? 'any'} onChange={event => { setBudget(event.target.value === 'any' ? null : Number(event.target.value)); setAddedId(''); }}>
          <option value="any">{t('guide.anyBudget')}</option>{[500, 1000, 1500, 2500, 5000].map(amount => <option key={amount} value={amount}>{t('guide.upTo')} Rs. {amount.toLocaleString()}</option>)}
        </select><small>{t('guide.priceNote')}</small></label>
      </div>
      <div className="selection-guide-results-heading"><h3>{t(matches.length ? 'guide.matches' : 'guide.empty')}</h3><span role="status" aria-live="polite">{matches.length} {t('shop.results')}</span></div>
      {matches.length ? <div className="selection-guide-results">{matches.slice(0, 4).map(({ product, weight, price }) => <article key={product.id}>
        <Link to={`/product/${product.id}`} onClick={onClose} className="focus-ring selection-guide-product-image"><img src={mediaCover(product)} alt={getLocalized(product, 'name', language)} width={240} height={240} loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/product-placeholder.svg'; }} /></Link>
        <div><p className="selection-guide-origin" dir="auto">{getLocalized(product, 'origin', language)}</p><Link to={`/product/${product.id}`} onClick={onClose} className="focus-ring selection-guide-product-name" dir="auto">{getLocalized(product, 'name', language)}</Link><p className="selection-guide-price"><bdi>Rs. {price.toLocaleString()}</bdi><bdi>{weight}</bdi></p>
          <button type="button" className="focus-ring selection-guide-add" onClick={() => { addToCart(product, weight, 1, undefined, { silent: true, openCart: false }); setAddedId(product.id); }}>{addedId === product.id ? <Check size={16} /> : <ShoppingBag size={16} />}{t(addedId === product.id ? 'guide.addAnother' : 'addToCart')}</button>
        </div>
      </article>)}</div> : <p className="selection-guide-empty">{t('guide.emptyCopy')}</p>}
      <p className="selection-guide-added" role="status">{addedId ? t('guide.added') : ''}</p>
    </div>
    <footer><span>{t('guide.local')}</span><Link to={selectionResultsPath(preferences)} onClick={onClose} className="focus-ring">{t('guide.viewMatches')}<ArrowUpRight size={16} /></Link></footer>
  </dialog>, document.body);
}
