import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive, Download, Share2, Trash2, Plus } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { PRODUCTS } from '../data/products';
import { getLocalized } from '../utils/localize';
import { cartLines, downloadText, readSharedCart, savedBoxes, SAVED_BOXES_KEY, type CartLine } from '../lib/savedCarts';
import { shareOrCopy } from '../lib/catalogLinks';

export default function CartTools() {
  const { cartItems, subtotal, addToCart } = useCart();
  const { t, language } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [boxes, setBoxes] = useState(() => { try { return savedBoxes(JSON.parse(localStorage.getItem(SAVED_BOXES_KEY) || '[]'), PRODUCTS); } catch { return []; } });
  const [name, setName] = useState(''); const [status, setStatus] = useState(''); const [manualLink, setManualLink] = useState('');
  const shared = useMemo(() => readSharedCart(params.get('items'), PRODUCTS), [params]);
  const lines = cartLines(cartItems, PRODUCTS);
  const persist = (next: typeof boxes) => { try { localStorage.setItem(SAVED_BOXES_KEY, JSON.stringify(next)); setBoxes(next); return true; } catch { setStatus(t('checkout.storageUnavailable')); return false; } };
  const add = (entries: CartLine[]) => { entries.forEach(line => { const product = PRODUCTS.find(item => item.id === line.productId); if (product) addToCart(product, line.weight, line.quantity, undefined, { silent: true, openCart: false }); }); setStatus(t('cart.boxAdded')); };
  const share = async () => {
    const url = new URL('/cart', window.location.origin); url.searchParams.set('items', JSON.stringify(lines));
    const result = await shareOrCopy(t('cart.sharedBox'), url.toString());
    setStatus(result === 'copied' ? t('shareCopied') : ''); setManualLink(result === 'manual' ? url.toString() : '');
  };
  const download = () => {
    const contents = ['AllBarka — ' + t('cart.summary'), ...cartItems.map(item => `${getLocalized(item, 'name', language)} (${item.selectedWeight}) × ${item.quantity}: Rs. ${(item.unitPrice * item.quantity).toLocaleString()}`), `${t('subtotal')}: Rs. ${subtotal.toLocaleString()}`, t('cart.summaryNote')].join('\n');
    downloadText('AllBarka-box-summary.txt', contents);
  };
  return <section className="my-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-text-primary)] sm:p-5" aria-label={t('cart.boxTools')}>
    {params.has('items') && <div className="mb-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-4"><h2 className="font-serif text-xl">{t('cart.sharedBox')}</h2>{shared.length ? <><p className="my-3 text-xs leading-6">{t('cart.sharedHint')}</p><ul className="space-y-2 text-xs">{shared.map(line => <li key={`${line.productId}-${line.weight}`} dir="auto">{getLocalized(PRODUCTS.find(product => product.id === line.productId)!, 'name', language)} <bdi>({line.weight}) × {line.quantity}</bdi></li>)}</ul><button type="button" onClick={() => { add(shared); const next = new URLSearchParams(params); next.delete('items'); setParams(next, { replace: true }); }} className="focus-ring mt-4 min-h-11 rounded-full bg-[#1e3a2b] px-5 text-xs text-[#fff8e9]">{t('cart.importBox')}</button></> : <p role="status" className="mt-3 text-xs">{t('cart.invalidShared')}</p>}</div>}
    <div className="flex flex-wrap gap-2"><button type="button" disabled={!lines.length} onClick={() => void share()} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-xs disabled:opacity-40"><Share2 size={15} />{t('cart.shareBox')}</button><button type="button" disabled={!cartItems.length} onClick={download} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-xs disabled:opacity-40"><Download size={15} />{t('cart.download')}</button></div>
    {lines.length < cartItems.length && <p className="mt-3 text-xs leading-6">{t('cart.customExcluded')}</p>}
    {status && <p role="status" className="mt-3 text-xs">{status}</p>}
    {manualLink && <label className="mt-3 block text-xs">{t('shop.copyLink')}<input value={manualLink} readOnly dir="ltr" onFocus={event => event.target.select()} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base sm:text-xs" /></label>}
    <details className="mt-4 border-t border-[var(--color-border)] pt-3"><summary className="focus-ring flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold"><Archive size={16} />{t('cart.savedBoxes')} ({boxes.length}/3)</summary><p className="my-3 text-xs leading-6 text-[var(--color-text-secondary)]">{t('cart.savedHint')}</p>
      {boxes.map(box => <div key={box.id} className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--color-border)] p-2"><span className="min-w-0 flex-1 truncate text-xs" dir="auto" title={box.name}>{box.name} ({box.lines.length})</span><button type="button" onClick={() => add(box.lines)} className="focus-ring inline-flex min-h-11 shrink-0 items-center gap-1 px-2 text-xs"><Plus size={14} />{t('cart.restoreBox')}</button><button type="button" aria-label={`${t('cart.deleteBox')}: ${box.name}`} onClick={() => persist(boxes.filter(item => item.id !== box.id))} className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full"><Trash2 size={15} /></button></div>)}
      <label className="block text-xs">{t('cart.boxName')}<input value={name} onChange={event => setName(event.target.value)} maxLength={60} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base" /></label><button type="button" disabled={!lines.length || !name.trim()} onClick={() => { const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `box-${Date.now()}`; if (persist([{ id, name: name.trim(), lines }, ...boxes].slice(0, 3))) { setName(''); setStatus(t('cart.boxSaved')); } }} className="focus-ring mt-3 min-h-11 rounded-full border border-[var(--color-border)] px-5 text-xs disabled:opacity-40">{t('cart.saveBox')}</button>
    </details>
  </section>;
}
