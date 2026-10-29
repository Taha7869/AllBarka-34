import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Heart, SlidersHorizontal, X } from 'lucide-react';
import { useCatalogFilterLanguage } from '../hooks/useCatalogFilterLanguage';
import { CATALOG_SORTS, type CatalogSort } from '../lib/catalogDiscovery';
import { resetCatalogFilterDraft, type CatalogFilterDraft } from '../lib/catalogFilterDraft';
import { acquireScrollLock } from '../utils/scrollLock';

interface CatalogFilterSheetProps {
  id: string;
  draft: CatalogFilterDraft;
  categoryLabel: string;
  results: number;
  origins: { id: string; label: string; count: number }[];
  savedCount: number;
  onChange: (draft: CatalogFilterDraft) => void;
  onApply: () => void;
  onCancel: () => void;
}

/** A temporary editing layer; only its explicit Apply action changes the catalogue. */
export default function CatalogFilterSheet({ id, draft, categoryLabel, results, origins, savedCount, onChange, onApply, onCancel }: CatalogFilterSheetProps) {
  const { t } = useCatalogFilterLanguage();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  const titleId = useId();
  const hintId = useId();
  const patch = (changes: Partial<CatalogFilterDraft>) => onChange({ ...draft, ...changes });

  useEffect(() => {
    const initialPath = window.location.pathname;
    const activeAtOpen = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;
    const previous = activeAtOpen || document.querySelector<HTMLElement>('.catalog-quick-controls button[aria-controls]');
    const root = document.getElementById('root');
    const previousInert = root?.inert ?? false;
    if (root) root.inert = true;
    const release = acquireScrollLock();
    const dialog = panel.current;
    const ensureVisible = (element: HTMLElement | null) => {
      if (!element || !dialog?.contains(element)) return;
      const target = element.closest<HTMLElement>('.catalog-filter-toggles label') || element;
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    const frame = requestAnimationFrame(() => {
      if (!dialog?.contains(document.activeElement)) close.current?.focus();
    });
    const focusIn = (event: FocusEvent) => {
      ensureVisible(event.target instanceof HTMLElement ? event.target : null);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel.current(); return; }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]') || []).filter(control => control.getClientRects().length);
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); ensureVisible(last || null); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); ensureVisible(first || null); }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const resized = () => { if (desktop.matches) cancel.current(); };
    resized();
    dialog?.addEventListener('focusin', focusIn);
    desktop.addEventListener('change', resized);
    document.addEventListener('keydown', keydown, true);
    return () => {
      cancelAnimationFrame(frame); dialog?.removeEventListener('focusin', focusIn); desktop.removeEventListener('change', resized); document.removeEventListener('keydown', keydown, true);
      release(); if (root) root.inert = previousInert;
      if (window.location.pathname !== initialPath) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && !dialog?.contains(active)) return;
      const fallback = document.querySelector<HTMLElement>('.catalog-quick-controls button[aria-controls], .catalog-quick-controls input[type="search"], header a[href], header button');
      const target = previous?.isConnected && previous.getClientRects().length && !previous.closest('[inert]')
        ? previous
        : fallback && fallback.getClientRects().length && !fallback.closest('[inert]')
          ? fallback
          : null;
      target?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(<div className="catalog-filter-backdrop" dir="ltr" onClick={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <div ref={panel} id={id} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={hintId} className="catalog-filter-sheet">
      <header className="catalog-filter-heading">
        <div><p className="catalog-filter-eyebrow"><SlidersHorizontal size={14} aria-hidden="true" /><span dir="auto">{t('filters.collection')}: {categoryLabel}</span></p><h2 id={titleId} dir="auto">{t('filters.title')}</h2></div>
        <button ref={close} type="button" className="catalog-filter-icon" onClick={onCancel} aria-label={t('filters.close')}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="catalog-filter-scroll">
        <p id={hintId} className="catalog-filter-copy" dir="auto">{t('filters.hint')}</p>
        <div className="catalog-filter-current">
          {(draft.query || draft.shared !== null) && <div className="catalog-filter-current-chips">
            {draft.query && <button type="button" onClick={() => patch({ query: '' })} aria-label={`${t('shop.remove')}: ${draft.query}`}><span dir="auto">{draft.query}</span><X size={14} aria-hidden="true" /></button>}
            {draft.shared !== null && <button type="button" onClick={() => patch({ shared: null })} aria-label={`${t('shop.remove')}: ${t('shop.sharedSelections')}`}><span dir="auto">{t('shop.sharedSelections')}</span><X size={14} aria-hidden="true" /></button>}
          </div>}
          <button type="button" className="catalog-filter-reset" onClick={() => onChange(resetCatalogFilterDraft())}><span dir="auto">{t('filters.reset')}</span></button>
        </div>
        <fieldset className="catalog-filter-group">
          <legend dir="auto">{t('shop.budget')}</legend>
          <div className="catalog-filter-group-top"><bdi>Rs. {draft.budget.toLocaleString('en-PK')}{draft.budget === 10000 ? '+' : ''}</bdi><button type="button" onClick={() => patch({ budget: 10000 })}><span dir="auto">{t('filters.resetGroup')}</span></button></div>
          <label><span className="sr-only">{t('shop.budget')}</span><input type="range" min={300} max={10000} step={100} value={draft.budget} onChange={event => patch({ budget: Number(event.target.value) })} aria-valuetext={`Rs. ${draft.budget.toLocaleString('en-PK')}${draft.budget === 10000 ? '+' : ''}`} /></label>
          <p className="catalog-filter-copy" dir="auto">{t('filters.budgetHint')}</p>
        </fieldset>
        <fieldset className="catalog-filter-group">
          <legend dir="auto">{t('shop.origin')}</legend>
          <label><span className="sr-only">{t('shop.origin')}</span><select value={draft.origin} dir="auto" onChange={event => patch({ origin: event.target.value })}>{origins.map(origin => <option value={origin.id} key={origin.id}>{origin.label} ({origin.count})</option>)}</select></label>
        </fieldset>
        <fieldset className="catalog-filter-group">
          <legend dir="auto">{t('shop.sort')}</legend>
          <label><span className="sr-only">{t('shop.sort')}</span><select value={draft.sort} dir="auto" onChange={event => patch({ sort: event.target.value as CatalogSort })}>{CATALOG_SORTS.map(sort => <option value={sort} key={sort}>{t(`shop.${sort}`)}</option>)}</select></label>
        </fieldset>
        <div className="catalog-filter-toggles">
          <label><input type="checkbox" checked={draft.special} onChange={event => patch({ special: event.target.checked })} /><span dir="auto">{t('shop.special')}</span></label>
          <label><input type="checkbox" checked={draft.saved} onChange={event => patch({ saved: event.target.checked })} /><span><span className="catalog-filter-saved-label" dir="auto"><Heart size={15} aria-hidden="true" /><span>{t('shop.saved')}</span> <bdi>({savedCount})</bdi></span><small dir="auto">{t('filters.savedHint')}</small></span></label>
        </div>
      </div>
      <footer className="catalog-filter-actions">
        <p role="status" aria-live="polite" aria-atomic="true" dir="auto" className={results ? '' : 'catalog-filter-no-results'}>{t(results ? 'filters.previewCount' : 'filters.zero').replace('{count}', String(results))}</p>
        <div><button type="button" className="catalog-filter-cancel" onClick={onCancel}><span dir="auto">{t('filters.cancel')}</span></button><button type="button" className="catalog-filter-apply" onClick={onApply}><span dir="auto">{t('filters.showResults').replace('{count}', String(results))}</span></button></div>
      </footer>
    </div>
  </div>, document.body);
}
