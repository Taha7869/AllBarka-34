import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Image, Layers3, PackageSearch, Search, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { useAdminLanguage } from '../hooks/useAdminLanguage';
import { getLocalized } from '../utils/localize';
import { checkCatalogAssets, filterAdminCatalog, getAdminCatalogSnapshot, type CatalogAssetResult, type CatalogIssue } from '../lib/adminCatalog';
import AdminProductMediaEditor from './AdminProductMediaEditor';
import { useProductMediaLanguage } from '../hooks/useProductMediaLanguage';

const issueKeys: Record<CatalogIssue, string> = {
  id: 'admin.catalog.issueId', name: 'admin.catalog.issueName', portion: 'admin.catalog.issuePortion', image: 'admin.catalog.issueImage',
};
const resultKeys: Record<CatalogAssetResult['result'], string> = {
  ok: 'admin.catalog.assetOk', http: 'admin.catalog.assetHttp', type: 'admin.catalog.assetType',
  network: 'admin.catalog.assetNetwork', timeout: 'admin.catalog.assetTimeout', unsafe: 'admin.catalog.assetUnsafe',
};

export default function AdminCatalogPanel() {
  const { language, t } = useAdminLanguage();
  const { t: mediaTranslation } = useProductMediaLanguage();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<Record<string, CatalogAssetResult>>({});
  const [checking, setChecking] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const request = useRef<AbortController | null>(null);
  const ids = useId();
  const snapshot = useMemo(() => getAdminCatalogSnapshot(PRODUCTS), []);
  const rows = useMemo(() => filterAdminCatalog(snapshot.rows, query, category), [snapshot.rows, query, category]);
  const assetsToCheck = useMemo(() => snapshot.assets.slice(0, 256), [snapshot.assets]);
  const checked = Object.keys(results).length;
  const passed = Object.values(results).filter(result => result.result === 'ok').length;
  const failed = checked - passed;
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);

  const checkImages = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setChecking(true);
    setCancelled(false);
    setResults({});
    try {
      await checkCatalogAssets(assetsToCheck, {
        signal: controller.signal,
        onResult: result => {
          if (request.current === controller && !controller.signal.aborted) {
            setResults(current => ({ ...current, [result.path]: result }));
          }
        },
      });
    } finally {
      if (request.current === controller) {
        request.current = null;
        setChecking(false);
      }
    }
  };
  const cancelCheck = () => { request.current?.abort(); setCancelled(true); };
  const resultText = (result: CatalogAssetResult | undefined) => result
    ? t(resultKeys[result.result]).replace('{status}', String(result.status || '—'))
    : t('admin.catalog.assetUnchecked');

  return <section aria-labelledby={`${ids}-heading`} dir="ltr" className="space-y-6 text-[var(--color-text-primary)]">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-xl" dir="auto">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[var(--color-accent-text)]">{t('admin.catalog.source')}</p>
        <h2 id={`${ids}-heading`} className="font-serif text-3xl">{t('admin.catalog.title')}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{t('admin.catalog.subtitle')}</p>
      </div>
      {snapshot.issueCount > 0 && <span className="inline-flex items-center gap-2 rounded-full border border-amber-700/25 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" dir="auto"><TriangleAlert size={15} aria-hidden="true" />{t('admin.catalog.issues').replace('{count}', String(snapshot.issueCount))}</span>}
    </header>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        { key: 'products', count: snapshot.productCount, Icon: PackageSearch },
        { key: 'images', count: snapshot.imageCount, Icon: Image },
        { key: 'portions', count: snapshot.portionCount, Icon: Layers3 },
        { key: 'galleries', count: snapshot.galleryCount, Icon: ShieldCheck },
      ].map(({ key, count, Icon }) => <div key={key} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><span className="text-xs leading-5 text-[var(--color-text-secondary)]" dir="auto">{t(`admin.catalog.${key}`)}</span><Icon className="shrink-0 text-[var(--color-accent-text)]" size={18} aria-hidden="true" /></div>
        <p className="font-serif text-3xl tabular-nums"><bdi>{count}</bdi></p>
      </div>)}
    </div>

    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5" aria-label={t('admin.catalog.assetDetails')}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1" dir="auto">
          <p className="text-sm font-medium">{checking || checked > 0 ? t('admin.catalog.progress').replace('{checked}', String(checked)).replace('{total}', String(assetsToCheck.length)) : t('admin.catalog.notChecked')}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{t('admin.catalog.hint')}</p>
        </div>
        {checking ? <button type="button" onClick={cancelCheck} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 text-xs font-semibold"><X size={16} aria-hidden="true" /><span dir="auto">{t('admin.catalog.cancel')}</span></button>
          : <button type="button" onClick={checkImages} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-semibold text-[var(--color-primary-fg)]"><ShieldCheck size={17} aria-hidden="true" /><span dir="auto">{t('admin.catalog.check')}</span></button>}
      </div>
      {checking && <progress className="mt-4 h-2 w-full accent-[var(--color-accent)]" value={checked} max={Math.max(1, assetsToCheck.length)} aria-label={t('admin.catalog.checking')} />}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{checking ? t('admin.catalog.checking') : cancelled ? t('admin.catalog.cancelled') : checked > 0 ? `${t('admin.catalog.passed').replace('{count}', String(passed))}. ${t('admin.catalog.failed').replace('{count}', String(failed))}` : ''}</p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {passed > 0 && <span className="inline-flex items-center gap-2 text-emerald-800 dark:text-emerald-300" dir="auto"><CheckCircle2 size={14} aria-hidden="true" />{t('admin.catalog.passed').replace('{count}', String(passed))}</span>}
        {failed > 0 && <span className="inline-flex items-center gap-2 text-red-800 dark:text-red-300" dir="auto"><TriangleAlert size={14} aria-hidden="true" />{t('admin.catalog.failed').replace('{count}', String(failed))}</span>}
        {cancelled && <span dir="auto" className="text-[var(--color-text-secondary)]">{t('admin.catalog.cancelled')} {t('admin.catalog.stopNote')}</span>}
      </div>
    </section>

    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-end sm:p-5">
        <label htmlFor={`${ids}-search`} className="block min-w-0 flex-1"><span className="mb-2 block text-xs font-medium" dir="auto">{t('admin.catalog.search')}</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" size={17} aria-hidden="true" /><input id={`${ids}-search`} value={query} onChange={event => setQuery(event.target.value)} maxLength={100} type="search" dir="auto" className="focus-ring min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] py-2 pl-10 pr-3 text-base sm:text-sm" /></span></label>
        <label htmlFor={`${ids}-category`} className="block sm:w-60"><span className="mb-2 block text-xs font-medium" dir="auto">{t('admin.catalog.category')}</span><select id={`${ids}-category`} value={category} onChange={event => setCategory(event.target.value)} className="focus-ring min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base sm:text-sm" dir="auto"><option value="">{t('admin.catalog.all')}</option>{snapshot.categories.map(value => <option key={value} value={value}>{t(`shop.${value}`)}</option>)}</select></label>
      </div>
      <p className="px-4 py-3 text-xs text-[var(--color-text-secondary)] sm:px-5" dir="auto" role="status">{t('admin.catalog.showing').replace('{count}', String(rows.length)).replace('{total}', String(snapshot.productCount))}</p>
      <ul className="divide-y divide-[var(--color-border)]">
        {rows.map((row, index) => {
          const productResults = row.images.map(path => results[path]);
          const assetErrors = productResults.filter(result => result && result.result !== 'ok');
          return <li key={`${row.product.id}-${index}`} className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,.8fr)] xl:items-start">
            <div className="flex min-w-0 gap-3">
              <Link to={`/product/${encodeURIComponent(row.product.id)}`} aria-label={`${t('admin.catalog.open')}: ${getLocalized(row.product, 'name', language)}`} className="focus-ring shrink-0 rounded-xl">{row.images[0] ? <img src={row.images[0]} alt="" loading="lazy" width={64} height={64} className="h-16 w-16 rounded-xl bg-[var(--color-base)] object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#c7982f]/30 bg-[#f3efe5] font-serif text-lg text-[#1e3a2b]">AB</span>}</Link>
              <div className="min-w-0"><Link to={`/product/${encodeURIComponent(row.product.id)}`} className="focus-ring inline-flex min-h-11 items-center rounded font-serif text-lg leading-6" dir="auto">{getLocalized(row.product, 'name', language)}</Link><p className="mt-1 break-all font-mono text-[11px] text-[var(--color-text-secondary)]">{row.product.id}</p><p className="mt-1 text-xs text-[var(--color-accent-text)]" dir="auto">{t(`shop.${row.product.category}`)}</p></div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--color-text-secondary)]" dir="auto">{t('admin.catalog.prices')}</p>
              <div className="flex flex-wrap gap-2">{row.portions.map(([portion, price]) => <span key={portion} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-xs"><bdi className="text-[var(--color-text-secondary)]">{portion}</bdi><span aria-hidden="true" className="mx-2 text-[var(--color-border)]">|</span><bdi className="font-medium">Rs. {Number.isFinite(price) ? price.toLocaleString('en-PK') : '—'}</bdi></span>)}</div>
            </div>
            <div className="min-w-0">
              <div className={`flex items-start gap-2 text-xs leading-5 ${row.issues.length || assetErrors.length ? 'text-amber-900 dark:text-amber-200' : 'text-emerald-800 dark:text-emerald-300'}`}>
                {row.issues.length || assetErrors.length ? <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden="true" />}
                <span dir="auto">{row.issues.length ? row.issues.map(issue => t(issueKeys[issue])).join(' · ') : t('admin.catalog.healthy')}</span>
              </div>
              {assetErrors.length > 0 && <p className="mt-1 text-xs text-red-800 dark:text-red-300" dir="auto">{t('admin.catalog.failed').replace('{count}', String(assetErrors.length))}</p>}
              <details className="mt-2 rounded-xl border border-[var(--color-border)]">
                <summary className="focus-ring min-h-11 cursor-pointer rounded-xl px-3 py-3 text-xs text-[var(--color-text-secondary)]"><span dir="auto">{t('admin.catalog.gallery')}</span><bdi className="ml-2">({row.images.length})</bdi>{assetErrors.length > 0 && <TriangleAlert size={13} className="ml-2 inline text-red-700 dark:text-red-300" aria-hidden="true" />}</summary>
                <ul className="space-y-3 border-t border-[var(--color-border)] p-3">{row.images.map(path => <li key={path} className="flex min-w-0 items-start gap-3"><img src={path} alt="" loading="lazy" width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg object-cover" /><div className="min-w-0"><p className="break-all font-mono text-[10px] leading-4 text-[var(--color-text-secondary)]">{path}</p><p dir="auto" className={`mt-1 text-[11px] leading-4 ${results[path]?.result && results[path]?.result !== 'ok' ? 'text-red-800 dark:text-red-300' : 'text-[var(--color-text-secondary)]'}`}>{resultText(results[path])}</p></div></li>)}</ul>
              </details>
              <Link to={`/product/${encodeURIComponent(row.product.id)}`} className="focus-ring mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--color-accent-text)]"><span dir="auto">{t('admin.catalog.open')}</span><ArrowUpRight size={14} aria-hidden="true" /></Link>
              <button type="button" className="focus-ring mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 text-xs font-semibold" onClick={() => setEditingProductId(current => current === row.product.id ? null : row.product.id)} aria-expanded={editingProductId === row.product.id} aria-controls={`${ids}-editor-${row.product.id}`}><Image size={15} aria-hidden="true" /><span dir="auto">{mediaTranslation('media.edit')}</span></button>
            </div>
            {editingProductId === row.product.id && <div id={`${ids}-editor-${row.product.id}`} className="min-w-0 xl:col-span-3"><AdminProductMediaEditor key={row.product.id} product={row.product} onClose={() => setEditingProductId(null)} /></div>}
          </li>;
        })}
      </ul>
      {rows.length === 0 && <p className="px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]" dir="auto">{t('admin.catalog.noResults')}</p>}
    </div>
  </section>;
}
