import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Scale, Clock } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { getLocalized } from '../utils/localize';
import { useLanguage } from '../contexts/LanguageContext';
import { useCatalogActivity } from '../hooks/useCatalogActivity';
import { useCart } from '../contexts/CartContext';
import { unitPrice } from '../lib/catalogActivity';

export default function CatalogTools({ mode }: { mode: 'compare' | 'recent' }) {
  const { t, language } = useLanguage();
  const mediaCover = useProductMediaCover();
  const { compareIds, recentIds, toggleCompare, clearCompare, clearRecent } = useCatalogActivity();
  const { addToCart } = useCart();
  const [weights, setWeights] = useState<Record<string, string>>({});
  const products = (mode === 'compare' ? compareIds : recentIds).map(id => PRODUCTS.find(product => product.id === id && product.active !== false)).filter(product => !!product);
  if (!products.length) return null;
  return <section id={mode === 'compare' ? 'catalog-comparison' : undefined} className="my-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6" aria-label={t(mode === 'compare' ? 'shop.compare' : 'shop.recent')}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-serif text-xl">{mode === 'compare' ? <Scale size={19} /> : <Clock size={19} />}{t(mode === 'compare' ? 'shop.compare' : 'shop.recent')}</h2><button type="button" onClick={mode === 'compare' ? clearCompare : clearRecent} className="focus-ring min-h-11 rounded-full border border-[var(--color-border)] px-4 text-xs">{t(mode === 'compare' ? 'shop.clearCompare' : 'shop.clearRecent')}</button></div>
    {mode === 'recent' ? <div className="flex gap-4 overflow-x-auto pb-2" dir="ltr">{products.map(product => <Link key={product.id} to={`/product/${product.id}`} className="focus-ring flex w-32 shrink-0 flex-col gap-2 rounded-xl"><img src={mediaCover(product)} alt="" loading="lazy" className="aspect-square w-full rounded-xl object-cover" /><span dir="auto" className="text-xs leading-5">{getLocalized(product, 'name', language)}</span></Link>)}</div> : <>
      <p className="mb-4 text-xs text-[var(--color-text-secondary)]">{t('shop.compareHint')}</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[540px] border-collapse text-xs"><caption className="sr-only">{t('shop.compare')}</caption><thead><tr><th scope="col" className="w-24 p-2 text-start">{t('shop.selection')}</th>{products.map(product => <th scope="col" key={product.id} className="min-w-44 p-3 text-start"><div className="flex items-start justify-between gap-2"><Link to={`/product/${product.id}`} className="focus-ring"><img src={mediaCover(product)} alt="" loading="lazy" className="mb-3 h-20 w-20 rounded-xl object-cover" /><span dir="auto" className="font-serif text-base">{getLocalized(product, 'name', language)}</span></Link><button type="button" aria-label={`${t('shop.remove')}: ${getLocalized(product, 'name', language)}`} onClick={() => toggleCompare(product.id)} className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full"><X size={16} /></button></div></th>)}</tr></thead><tbody>
        <tr className="border-t border-[var(--color-border)]"><th scope="row" className="p-2 text-start">{t('shop.portion')}</th>{products.map(product => <td key={product.id} className="p-3">{product.quoteOnly ? <span>{t('catalog.quoteOnly')}</span> : product.isBundle ? <span>{t('catalog.bundle')}</span> : <select aria-label={`${t('shop.portion')}: ${getLocalized(product, 'name', language)}`} value={weights[product.id] || Object.keys(product.prices)[0]} onChange={event => setWeights(current => ({ ...current, [product.id]: event.target.value }))} className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base sm:text-xs">{Object.keys(product.prices).map(weight => <option key={weight}>{weight}</option>)}</select>}</td>)}</tr>
        <tr className="border-t border-[var(--color-border)]"><th scope="row" className="p-2 text-start">{t('price')}</th>{products.map(product => { const weight = weights[product.id] || Object.keys(product.prices)[0]; const unit = product.quoteOnly ? null : unitPrice(product.prices[weight], weight || ''); return <td key={product.id} className="p-3">{product.quoteOnly ? <span>{t('catalog.quoteOnly')}</span> : <><bdi className="font-serif text-xl">Rs. {product.prices[weight].toLocaleString()}</bdi>{unit && <small className="mt-1 block"><bdi>Rs. {unit.amount.toLocaleString()} / {unit.unit}</bdi></small>}</>}</td>; })}</tr>
        <tr className="border-t border-[var(--color-border)]"><th scope="row" className="p-2 text-start">{t('shop.origin')}</th>{products.map(product => <td key={product.id} className="p-3" dir="auto">{getLocalized(product, 'origin', language) || '—'}</td>)}</tr>
        <tr className="border-t border-[var(--color-border)]"><th scope="row" className="p-2 text-start">{t('tasteProfile')}</th>{products.map(product => <td key={product.id} className="p-3 leading-6" dir="auto">{getLocalized(product, 'tasteProfile', language) || '—'}</td>)}</tr>
        <tr className="border-t border-[var(--color-border)]"><th scope="row" className="p-2 text-start">{t('shop.selection')}</th>{products.map(product => <td key={product.id} className="p-3">{product.quoteOnly ? <Link to="/pages/contact" className="focus-ring flex min-h-11 w-full items-center justify-center rounded-full bg-[#1e3a2b] px-3 text-[#fff8e9]">{t('catalog.requestQuote')}</Link> : <button type="button" onClick={() => addToCart(product, weights[product.id] || Object.keys(product.prices)[0], 1)} className="focus-ring min-h-11 w-full rounded-full bg-[#1e3a2b] px-3 text-[#fff8e9]">{t('addToCart')}</button>}</td>)}</tr>
      </tbody></table></div>
    </>}
  </section>;
}
