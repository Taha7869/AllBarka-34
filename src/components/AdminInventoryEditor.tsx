import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { adminRequest, AdminRequestError } from '../lib/adminClient';
import { DEFAULT_UNLIMITED_STOCK, MAX_INVENTORY_UNITS, validateInventory, type InventoryRecord, type InventoryPricing } from '../lib/inventory';
import { catalogStore } from '../lib/catalogClient';
import type { Product } from '../types';
import type { HamperBox } from '../lib/hamperCatalog';
import { getLocalized } from '../utils/localize';

export default function AdminInventoryEditor({ target, onClose }: { target: Product | HamperBox; onClose: () => void }) {
  const { currentUser } = useAuth(); const { t, language, isRtl } = useLanguage(); const id = useId();
  const [record, setRecord] = useState<InventoryRecord | null>(null); const [draft, setDraft] = useState<InventoryPricing | null>(null);
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  const controller = useRef<AbortController | null>(null); const mounted = useRef(false); const uid = useRef(currentUser?.uid); uid.current = currentUser?.uid;
  const heading = useRef<HTMLHeadingElement>(null); const path = `/api/admin/inventory/${encodeURIComponent(target.id)}`;
  const load = useCallback(async () => {
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    const session = currentUser?.uid; setBusy(true); setError(''); setSaved(false);
    try {
      if (!currentUser) throw new AdminRequestError('UNAUTHORIZED');
      const data = await adminRequest<{ record: InventoryRecord }>(() => currentUser.getIdToken(), path, { signal: request.signal });
      if (mounted.current && !request.signal.aborted && uid.current === session) { setRecord(data.record); setDraft({ mode: data.record.mode, available: data.record.available }); setReason(''); }
    } catch (failure) { if (mounted.current && !request.signal.aborted && uid.current === session) setError(failure instanceof AdminRequestError ? failure.code : 'REQUEST_FAILED'); }
    finally { if (mounted.current && controller.current === request) { controller.current = null; setBusy(false); } }
  }, [currentUser, path]);
  useEffect(() => {
    mounted.current = true; setRecord(null); setDraft(null); const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    void load(); const frame = requestAnimationFrame(() => heading.current?.focus());
    return () => { mounted.current = false; controller.current?.abort(); cancelAnimationFrame(frame); opener?.focus(); };
  }, [load]);
  let valid = false; try { if (draft) { validateInventory(draft, true); valid = true; } } catch { /* translated validation below */ }
  const dirty = record && draft && (record.mode !== draft.mode || record.available !== draft.available);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!currentUser || !record || !draft || !valid || !dirty || busy || reason.trim().length < 3) return;
    const request = new AbortController(); controller.current = request; const session = currentUser.uid; setBusy(true); setError(''); setSaved(false);
    try {
      const data = await adminRequest<{ record: InventoryRecord }>(() => currentUser.getIdToken(), path, { signal: request.signal,
        body: { expectedVersion: record.version, inventory: draft, reason: reason.trim() } });
      if (mounted.current && !request.signal.aborted && uid.current === session) { setRecord(data.record); setDraft({ mode: data.record.mode, available: data.record.available }); setSaved(true); void catalogStore.refresh(); }
    } catch (failure) { if (mounted.current && !request.signal.aborted && uid.current === session) setError(failure instanceof AdminRequestError ? failure.code : 'REQUEST_FAILED'); }
    finally { if (mounted.current && controller.current === request) { controller.current = null; setBusy(false); } }
  };
  const fieldClass = 'focus-ring min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base sm:text-sm';
  return <section dir={isRtl ? 'rtl' : 'ltr'} aria-labelledby={`${id}-title`} className="rounded-2xl border border-[var(--color-border-accent)] bg-[var(--color-surface)] p-4 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><h3 id={`${id}-title`} ref={heading} tabIndex={-1} className="font-serif text-xl">{t('commerce.inventory.title')} — {getLocalized(target, 'name', language)}</h3><p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--color-text-secondary)]">{t('commerce.inventory.note')}</p></div><button type="button" onClick={onClose} className="focus-ring min-h-11 rounded-xl border border-[var(--color-border)] px-4 text-xs">{t('close')}</button></div>
    {error && <p role="alert" className="mt-4 text-sm text-red-800 dark:text-red-200">{t(error === 'INVENTORY_CONFLICT' ? 'commerce.inventory.conflict' : error === 'INVALID_INVENTORY' ? 'commerce.inventory.invalid' : 'commerce.inventory.unavailable')}</p>}
    {saved && <p role="status" className="mt-4 text-sm text-emerald-800 dark:text-emerald-200">{t('commerce.inventory.saved')}</p>}
    {!draft && busy && <p role="status" className="mt-4 text-sm">{t('loyalty.loading')}</p>}
    {draft && record && <form onSubmit={event => void save(event)} className="mt-5 space-y-4">
      <label htmlFor={`${id}-mode`} className="block text-xs"><span className="mb-2 block">{t('commerce.inventory.mode')}</span><select id={`${id}-mode`} disabled={busy} value={draft.mode} onChange={event => { const mode = event.target.value as InventoryPricing['mode']; setDraft({ mode, available: mode === 'unlimited' ? DEFAULT_UNLIMITED_STOCK : 0 }); setSaved(false); }} className={fieldClass}><option value="unlimited">{t('commerce.inventory.unlimited')}</option><option value="tracked">{t('commerce.inventory.tracked')}</option></select></label>
      <label htmlFor={`${id}-available`} className="block text-xs"><span className="mb-2 block">{t('commerce.inventory.available')} — {t(`commerce.inventory.${record.unit}`)}</span><input id={`${id}-available`} type="number" inputMode="numeric" min={0} max={MAX_INVENTORY_UNITS} step={1} required disabled={busy || draft.mode === 'unlimited'} value={Number.isFinite(draft.available) ? draft.available : ''} onChange={event => { setDraft({ ...draft, available: event.target.value === '' ? NaN : Number(event.target.value) }); setSaved(false); }} dir="ltr" className={fieldClass} /></label>
      <label htmlFor={`${id}-reason`} className="block text-xs"><span className="mb-2 block">{t('commerce.inventory.reason')}</span><input id={`${id}-reason`} value={reason} minLength={3} maxLength={300} required disabled={busy} onChange={event => setReason(event.target.value)} dir="auto" className={fieldClass} /></label>
      {!valid && <p role="status" className="text-xs text-red-800 dark:text-red-200">{t('commerce.inventory.invalid')}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !dirty || !valid || reason.trim().length < 3 || error === 'INVENTORY_CONFLICT'} className="focus-ring min-h-11 rounded-xl bg-[#1e3a2b] px-5 text-sm text-[#fff8e9] disabled:opacity-50">{t(busy ? 'pricing.saving' : 'commerce.inventory.save')}</button><button type="button" disabled={busy} onClick={() => void load()} className="focus-ring min-h-11 rounded-xl border border-[var(--color-border)] px-4 text-sm">{t('pricing.reload')}</button></div>
    </form>}
    {!busy && !draft && <button type="button" onClick={() => void load()} className="focus-ring mt-4 min-h-11 rounded-xl border border-[var(--color-border)] px-4 text-sm">{t('pricing.reload')}</button>}
  </section>;
}
