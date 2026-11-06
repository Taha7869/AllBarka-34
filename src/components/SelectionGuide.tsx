import { useCatalogProducts } from '../contexts/CatalogContext';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Compass, ShoppingBag, Sparkles, X } from 'lucide-react';
import { CUSTOMER_FACING_CATEGORIES, getCategoryMeta } from '../config/categories';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { selectionMatches, selectionResultsPath } from '../lib/selectionGuide';
import { getLocalized } from '../utils/localize';
import { acquireScrollLock } from '../utils/scrollLock';

interface SelectionGuideProps { onClose: () => void; opener: HTMLElement | null }

export default function SelectionGuide({ onClose, opener }: SelectionGuideProps) {
  const PRODUCTS = useCatalogProducts();
  const { t, language, isRtl } = useLanguage();
  const { addToCart } = useCart();
  const mediaCover = useProductMediaCover();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  const [category, setCategory] = useState('all');
  const [budget, setBudget] = useState<number | null>(null);
  const [taste, setTaste] = useState('any');
  const [texture, setTexture] = useState('any');
  const [addedId, setAddedId] = useState('');

  const preferences = useMemo(() => ({ category, budget, taste, texture }), [category, budget, taste, texture]);
  const matches = useMemo(() => selectionMatches(PRODUCTS, preferences), [preferences, PRODUCTS]);

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

  return createPortal(
    <dialog
      ref={dialogRef}
      className="selection-guide"
      aria-labelledby={titleId}
      dir={isRtl ? 'rtl' : 'ltr'}
      onCancel={event => { event.preventDefault(); closeRef.current(); }}
      onClose={() => { if (!dialogRef.current?.open) closeRef.current(); }}
    >
      <header className="selection-guide-header">
        <div>
          <p className="selection-guide-eyebrow"><Compass size={14} aria-hidden="true" />{t('guide.eyebrow')}</p>
          <h2 id={titleId}>{t('guide.title')}</h2>
          <p>{t('guide.copy')}</p>
        </div>
        <button type="button" autoFocus onClick={onClose} aria-label={t('close')} className="focus-ring selection-guide-close">
          <X size={20} />
        </button>
      </header>
      <div className="selection-guide-body">
        <div className="selection-guide-controls">
          <fieldset>
            <legend>{t('guide.collection')}</legend>
            <div className="selection-guide-choices">
              {['all', ...CUSTOMER_FACING_CATEGORIES].map(id => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={category === id || (category === 'nuts' && id === 'dry-fruits') || (category === 'snacks-seeds' && id === 'seeds-snacks') || (category === 'combos' && id === 'gift-boxes')}
                  onClick={() => { setCategory(id); setAddedId(''); }}
                  className="focus-ring"
                >
                  {id === 'all' ? t('shop.all', 'All selections') : t(`shop.${id}`, getCategoryMeta(id)?.name || id)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>{t('guide.taste')}</legend>
            <div className="selection-guide-choices">
              {[
                { id: 'any', label: t('guide.anyTaste') },
                { id: 'sweet', label: t('guide.tasteSweet') },
                { id: 'savory', label: t('guide.tasteSavory') },
                { id: 'salted', label: t('guide.tasteSalted') },
                { id: 'rich', label: t('guide.tasteRich') },
              ].map(({ id, label }) => (
                <button
                  type="button"
                  key={id}
                  data-guide-taste={id}
                  aria-pressed={taste === id}
                  onClick={() => { setTaste(id); setAddedId(''); }}
                  className="focus-ring"
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>{t('guide.texture')}</legend>
            <div className="selection-guide-choices">
              {[
                { id: 'any', label: t('guide.anyTexture') },
                { id: 'crunchy', label: t('guide.textureCrunchy') },
                { id: 'chewy', label: t('guide.textureChewy') },
                { id: 'buttery', label: t('guide.textureButtery') },
              ].map(({ id, label }) => (
                <button
                  type="button"
                  key={id}
                  data-guide-texture={id}
                  aria-pressed={texture === id}
                  onClick={() => { setTexture(id); setAddedId(''); }}
                  className="focus-ring"
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="selection-guide-budget">
            <span>{t('guide.budget')}</span>
            <select
              value={budget ?? 'any'}
              onChange={event => { setBudget(event.target.value === 'any' ? null : Number(event.target.value)); setAddedId(''); }}
            >
              <option value="any">{t('guide.anyBudget')}</option>
              {[500, 1000, 1500, 2500, 5000].map(amount => (
                <option key={amount} value={amount}>{t('guide.upTo')} Rs. {amount.toLocaleString()}</option>
              ))}
            </select>
            <small>{t('guide.priceNote')}</small>
          </label>
        </div>

        <div className="selection-guide-results-heading">
          <h3>{t(matches.length ? 'guide.matches' : 'guide.empty')}</h3>
          <span role="status" aria-live="polite">{matches.length} {t('shop.results')}</span>
        </div>

        {matches.length ? (
          <div className="selection-guide-results">
            {matches.slice(0, 4).map(({ product, weight, price, matchedAttributes }) => (
              <article key={product.id}>
                <Link to={`/product/${product.id}`} onClick={onClose} className="focus-ring selection-guide-product-image">
                  <img
                    src={mediaCover(product)}
                    alt={getLocalized(product, 'name', language)}
                    width={240}
                    height={240}
                    loading="lazy"
                    onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/product-placeholder.svg'; }}
                  />
                </Link>
                <div>
                  <p className="selection-guide-origin" dir="auto">{getLocalized(product, 'origin', language)}</p>
                  <Link to={`/product/${product.id}`} onClick={onClose} className="focus-ring selection-guide-product-name" dir="auto">
                    {getLocalized(product, 'name', language)}
                  </Link>
                  <p className="selection-guide-price"><bdi>Rs. {price.toLocaleString()}</bdi><bdi>{weight}</bdi></p>
                  {matchedAttributes && matchedAttributes.length > 0 && (
                    <div className="selection-guide-tags flex flex-wrap gap-1 my-1">
                      {matchedAttributes.map(attr => (
                        <span key={attr} data-match-attr={attr} className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                          <Sparkles size={10} /> {attr}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="focus-ring selection-guide-add"
                    onClick={() => { addToCart(product, weight, 1, undefined, { silent: true, openCart: false }); setAddedId(product.id); }}
                  >
                    {addedId === product.id ? <Check size={16} /> : <ShoppingBag size={16} />}
                    {t(addedId === product.id ? 'guide.addAnother' : 'addToCart')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="selection-guide-empty">{t('guide.emptyCopy')}</p>
        )}
        <p className="selection-guide-added" role="status">{addedId ? t('guide.added') : ''}</p>
      </div>
      <footer>
        <span>{t('guide.local')}</span>
        <Link to={selectionResultsPath(preferences)} onClick={onClose} className="focus-ring">
          {t('guide.viewMatches')}<ArrowUpRight size={16} />
        </Link>
      </footer>
    </dialog>,
    document.body
  );
}
