import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { RefreshCw, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { adminRequest, AdminRequestError } from '../lib/adminClient';
import { catalogStore } from '../lib/catalogClient';
import { CatalogPricingError, MAX_CATALOG_PRICE, validateBoxPricing, validateProductPricing,
  type ProductPricing, type BoxPricing, type CatalogPriceRecord, type CatalogPriceAudit } from '../lib/catalogPricing';
import type { Product } from '../types';
import type { HamperBox } from '../lib/hamperCatalog';
import { MIN_CUSTOM_WEIGHT_G, MAX_CUSTOM_WEIGHT_G, CUSTOM_WEIGHT_STEP_G } from '../lib/productVariants';
import { getLocalized } from '../utils/localize';

export default function AdminPriceEditor({ kind, target, onClose }: { kind: 'products' | 'boxes'; target: Product | HamperBox; onClose: () => void }) {
  const { currentUser } = useAuth();
  const { language, isRtl, t } = useLanguage();
  const [record, setRecord] = useState<CatalogPriceRecord | null>(null);
  const [draft, setDraft] = useState<ProductPricing | BoxPricing | null>(null);
  const [history, setHistory] = useState<CatalogPriceAudit[]>([]);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const sessionUid = useRef(currentUser?.uid);
  sessionUid.current = currentUser?.uid;
  const title = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const path = `/api/admin/catalog-prices/${kind}/${encodeURIComponent(target.id)}`;
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(''); setSaved(false); setHistoryFailed(false);
    const uid = currentUser?.uid;
    try {
      if (!currentUser) throw new AdminRequestError('AUTHENTICATION_REQUIRED', 401);
      const [result, changes] = await Promise.all([
        adminRequest<{ record: CatalogPriceRecord }>(() => currentUser.getIdToken(), path, { signal: controller.signal }),
        adminRequest<{ entries: CatalogPriceAudit[] }>(() => currentUser.getIdToken(), `${path}/history`, { signal: controller.signal }),
      ]);
      if (!mounted.current || controller.signal.aborted || sessionUid.current !== uid) return;
      setRecord(result.record); setDraft(structuredClone(result.record.pricing)); setHistory(changes.entries); setReason('');
    } catch (caught) {
      if (mounted.current && !controller.signal.aborted && sessionUid.current === uid) setError(caught instanceof AdminRequestError ? caught.code : 'REQUEST_FAILED');
    } finally { if (mounted.current && request.current === controller) { request.current = null; setLoading(false); } }
  }, [currentUser, path]);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    mounted.current = true; setRecord(null); setDraft(null); setHistory([]); setSaving(false);
    void load(); const frame = requestAnimationFrame(() => title.current?.focus());
    return () => { mounted.current = false; request.current?.abort(); cancelAnimationFrame(frame); opener?.focus(); };
  }, [load]);
  let valid = false;
  if (draft) {
    try { kind === 'products' ? validateProductPricing(target as Product, draft, true) : validateBoxPricing(draft, true); valid = true; } catch { /* Field-level native validity and translated form feedback. */ }
  }
  const dirty = !!record && !!draft && (!record.initialized || JSON.stringify(record.pricing) !== JSON.stringify(draft));
  const busy = loading || saving;
  const edit = (values: Partial<ProductPricing & BoxPricing>) => { setDraft(current => current ? { ...current, ...values } : null); setSaved(false); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !record || !draft || busy || !dirty || !valid || reason.trim().length < 3) return;
    const controller = new AbortController(); request.current = controller;
    const uid = currentUser.uid; setSaving(true); setError(''); setSaved(false);
    try {
      const result = await adminRequest<{ record: CatalogPriceRecord }>(() => currentUser.getIdToken(), path, {
        signal: controller.signal, body: { expectedVersion: record.version, pricing: draft, reason: reason.trim() },
      });
      if (!mounted.current || controller.signal.aborted || sessionUid.current !== uid) return;
      setRecord(result.record); setDraft(structuredClone(result.record.pricing)); setSaved(true);
      void catalogStore.refresh();
      try {
        const updated = await adminRequest<{ entries: CatalogPriceAudit[] }>(() => currentUser.getIdToken(), `${path}/history`, { signal: controller.signal });
        if (mounted.current && !controller.signal.aborted && sessionUid.current === uid) { setHistory(updated.entries); setHistoryFailed(false); }
      } catch {
        if (mounted.current && !controller.signal.aborted && sessionUid.current === uid) setHistoryFailed(true);
      }
    } catch (caught) {
      if (mounted.current && !controller.signal.aborted && sessionUid.current === uid) setError(caught instanceof AdminRequestError || caught instanceof CatalogPricingError ? caught.code : 'REQUEST_FAILED');
    } finally { if (mounted.current && request.current === controller) { request.current = null; setSaving(false); } }
  };
  const errorKey = error === 'PRICE_VERSION_CONFLICT' ? 'pricing.conflict' : ['UNAUTHORIZED', 'AUTHENTICATION_REQUIRED', 'FORBIDDEN_ADMIN'].includes(error) ? 'pricing.auth'
    : error.startsWith('INVALID_') ? 'pricing.invalid' : 'pricing.failed';
  const inputClass = 'focus-ring min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base sm:text-sm';
  const numeric = (key: string, label: string, value: number, onChange: (value: number) => void, min = 1, max = MAX_CATALOG_PRICE, step = 1) => <label key={key} htmlFor={`${id}-${key}`} className="block text-xs"><span className="mb-2 block" dir="auto">{label}</span><input id={`${id}-${key}`} type="number" inputMode="numeric" min={min} max={max} step={step} required disabled={busy} value={Number.isFinite(value) ? value : ''} onChange={event => onChange(event.target.value === '' ? NaN : Number(event.target.value))} className={inputClass} dir="ltr" /></label>;
  const productDraft = draft && 'prices' in draft ? draft : null;
  const flag = (value: boolean) => t(value ? 'pricing.enabled' : 'pricing.disabled');
  const displayPricing = (value: ProductPricing | BoxPricing | null) => !value ? '—' : 'prices' in value
    ? [...Object.entries(value.prices).map(([portion, price]) => `${portion}: Rs. ${price.toLocaleString('en-PK')}`),
      `${t('pricing.wholesale')}: Rs. ${value.wholesale.toLocaleString('en-PK')}`, `${t('pricing.active')}: ${flag(value.active)}`,
      `${t('pricing.custom')}: ${flag(value.allowCustomWeight)}`, `${t('pricing.rate')}: ${value.pricePer100g}`, `${value.minCustomWeightG}–${value.maxCustomWeightG}g`].join(' · ')
    : `Rs. ${value.price.toLocaleString('en-PK')} · ${t('pricing.active')}: ${flag(value.active)}`;
  return <section className="rounded-2xl border border-[var(--color-border-accent)] bg-[var(--color-surface)] p-4 sm:p-6" dir={isRtl ? 'rtl' : 'ltr'} aria-labelledby={`${id}-title`}>
    <div className="flex items-start justify-between gap-3"><div><h3 id={`${id}-title`} ref={title} tabIndex={-1} className="font-serif text-xl">{t('pricing.title')} — {getLocalized(target, 'name', language)}</h3><p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--color-text-secondary)]">{t('pricing.note')}</p></div><button type="button" onClick={onClose} aria-label={t('pricing.close')} className="focus-ring flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl"><X size={18} aria-hidden="true" /></button></div>
    {loading && <p role="status" className="mt-5 text-sm">{t('pricing.loading')}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/40 p-3 text-sm leading-6 text-red-800 dark:text-red-200">{t(errorKey)}</p>}
    {saved && <p role="status" className="mt-4 text-sm text-emerald-800 dark:text-emerald-200">{t('pricing.saved')}</p>}
    {historyFailed && <p role="status" className="mt-3 text-xs leading-6 text-[var(--color-text-secondary)]">{t('pricing.historyFailed')}</p>}
    {record && draft && <form onSubmit={event => void save(event)} className="mt-5 space-y-5">
      {!record.initialized && <p className="text-xs text-[var(--color-accent-text)]">{t('pricing.missing')}</p>}
      <p className="text-xs text-[var(--color-text-secondary)]">{t('pricing.version')}: <bdi>{record.revision}</bdi></p>
      {productDraft ? <><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-3"><legend className="mb-3 text-sm font-semibold">{t('pricing.fixed')}</legend>{Object.entries(productDraft.prices).map(([portion, price]) => numeric(`portion-${portion}`, portion, price, value => edit({ prices: { ...productDraft.prices, [portion]: value } })))}{numeric('wholesale', t('pricing.wholesale'), productDraft.wholesale, value => edit({ wholesale: value }), 0)}</fieldset>
        {!(target as Product).isBundle && !(target as Product).quoteOnly && (target as Product).category !== 'oils' && <><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={productDraft.allowCustomWeight} disabled={busy} onChange={event => edit({ allowCustomWeight: event.target.checked })} className="h-5 w-5 accent-emerald-800" />{t('pricing.custom')}</label><div className="grid gap-3 sm:grid-cols-3">{numeric('rate', t('pricing.rate'), productDraft.pricePer100g, value => edit({ pricePer100g: value }), productDraft.allowCustomWeight ? 1 : 0)}{numeric('minimum', t('pricing.minimum'), productDraft.minCustomWeightG, value => edit({ minCustomWeightG: value }), MIN_CUSTOM_WEIGHT_G, MAX_CUSTOM_WEIGHT_G, CUSTOM_WEIGHT_STEP_G)}{numeric('maximum', t('pricing.maximum'), productDraft.maxCustomWeightG, value => edit({ maxCustomWeightG: value }), MIN_CUSTOM_WEIGHT_G, MAX_CUSTOM_WEIGHT_G, CUSTOM_WEIGHT_STEP_G)}</div></>}
      </> : numeric('box-price', t('pricing.boxPrice'), (draft as BoxPricing).price, value => edit({ price: value }))}
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.active} disabled={busy} onChange={event => edit({ active: event.target.checked })} className="h-5 w-5 accent-emerald-800" />{t('pricing.active')}</label>
      <label htmlFor={`${id}-reason`} className="block text-xs"><span className="mb-2 block">{t('pricing.reason')}</span><textarea id={`${id}-reason`} value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={300} required disabled={busy} rows={2} className={`${inputClass} py-3`} dir="auto" /></label>
      {!valid && <p role="status" className="text-xs text-red-800 dark:text-red-200">{t('pricing.invalid')}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !dirty || !valid || reason.trim().length < 3 || error === 'PRICE_VERSION_CONFLICT'} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1e3a2b] px-5 text-sm font-semibold text-[#fff8e9] disabled:opacity-50"><Save size={16} aria-hidden="true" />{t(saving ? 'pricing.saving' : 'pricing.save')}</button><button type="button" disabled={busy} onClick={() => void load()} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 text-sm"><RefreshCw size={15} aria-hidden="true" />{t('pricing.reload')}</button></div>
    </form>}
    {!loading && !record && <button type="button" onClick={() => void load()} className="focus-ring mt-4 min-h-11 rounded-xl border border-[var(--color-border)] px-4 text-sm">{t('pricing.reload')}</button>}
    {record && <details className="mt-6 border-t border-[var(--color-border)] pt-3"><summary className="focus-ring min-h-11 cursor-pointer text-sm font-semibold">{t('pricing.history')}</summary><p className="my-3 text-xs leading-6 text-[var(--color-text-secondary)]">{t('pricing.historyNote')}</p>{history.length ? <ol className="space-y-4">{history.map(entry => <li key={`${entry.revision}-${entry.updatedAt}`} className="rounded-xl border border-[var(--color-border)] p-3 text-xs leading-6"><time dateTime={entry.updatedAt}>{new Date(entry.updatedAt).toLocaleString(language === 'ur' ? 'ur-PK' : language === 'ar' ? 'ar-PK' : 'en-PK')}</time><p dir="auto">{entry.reason}</p><p><span>{t('pricing.before')}: </span><bdi>{displayPricing(entry.previousPricing)}</bdi></p><p><span>{t('pricing.after')}: </span><bdi>{displayPricing(entry.pricing)}</bdi></p></li>)}</ol> : <p className="text-xs">{t('pricing.noHistory')}</p>}</details>}
  </section>;
}
