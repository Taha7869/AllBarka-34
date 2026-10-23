import { isProductMediaId } from '../lib/productMedia';
import { useCatalogProducts, useCatalogRefresh } from '../contexts/CatalogContext';
import type { Product } from '../types';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  Image,
  Layers3,
  PackageSearch,
  Search,
  ShieldCheck,
  TriangleAlert,
  X,
  Plus,
  Sparkles,
  Copy,
  Archive,
  Check,
  Loader2,
  Edit,
  RefreshCw
} from 'lucide-react';
import { useAdminLanguage } from '../hooks/useAdminLanguage';
import { getLocalized } from '../utils/localize';
import { checkCatalogAssets, filterAdminCatalog, getAdminCatalogSnapshot, type CatalogAssetResult, type CatalogIssue } from '../lib/adminCatalog';
import AdminProductMediaEditor from './AdminProductMediaEditor';
import { useProductMediaLanguage } from '../hooks/useProductMediaLanguage';
import AdminCatalogPricingEditor, { useCatalogPricingLanguage } from './AdminCatalogPricingEditor';
import AdminProductCreateModal from './AdminProductCreateModal';
import AdminProductEditModal from './AdminProductEditModal';
import AdminMerchandisingPanel from './AdminMerchandisingPanel';
import { useAuth } from '../contexts/AuthContext';
import { adminRequest } from '../lib/adminClient';

const issueKeys: Record<CatalogIssue, string> = {
  id: 'admin.catalog.issueId', name: 'admin.catalog.issueName', portion: 'admin.catalog.issuePortion', image: 'admin.catalog.issueImage',
};
const resultKeys: Record<CatalogAssetResult['result'], string> = {
  ok: 'admin.catalog.assetOk', http: 'admin.catalog.assetHttp', type: 'admin.catalog.assetType',
  network: 'admin.catalog.assetNetwork', timeout: 'admin.catalog.assetTimeout', unsafe: 'admin.catalog.assetUnsafe',
};

export default function AdminCatalogPanel() {
  const publicProducts = useCatalogProducts();
  const refreshCatalog = useCatalogRefresh();
  const { currentUser } = useAuth();
  const { language, t } = useAdminLanguage();
  const { t: mediaTranslation } = useProductMediaLanguage();
  const { t: pricingTranslation } = useCatalogPricingLanguage();

  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  const [pricingProductId, setPricingProductId] = useState<string | null>(null);
  const [editingMediaProductId, setEditingMediaProductId] = useState<string | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMerchandisingOpen, setIsMerchandisingOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<Record<string, CatalogAssetResult>>({});
  const [checking, setChecking] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const request = useRef<AbortController | null>(null);
  const ids = useId();

  // Load authoritative admin products list
  const loadAdminCatalog = useCallback(async () => {
    if (!currentUser) return;
    setLoadingAdmin(true);
    try {
      const res = await adminRequest<{ products: Product[] }>(
        () => currentUser.getIdToken(),
        '/api/admin/catalog/products'
      );
      if (Array.isArray(res.products)) {
        setAdminProducts(res.products);
      }
    } catch (err: any) {
      console.error('Failed to load admin catalog:', err);
      // Fallback to public products if unauthenticated or offline
      setAdminProducts(publicProducts);
    } finally {
      setLoadingAdmin(false);
    }
  }, [currentUser, publicProducts]);

  useEffect(() => {
    loadAdminCatalog();
  }, [loadAdminCatalog]);

  const effectiveProducts = adminProducts.length > 0 ? adminProducts : publicProducts;
  const snapshot = useMemo(() => getAdminCatalogSnapshot(effectiveProducts), [effectiveProducts]);

  const rows = useMemo(() => {
    let baseRows = filterAdminCatalog(snapshot.rows, query, category);
    if (statusFilter !== 'all') {
      baseRows = baseRows.filter(row => {
        const isArchived = row.product.status === 'archived' || row.product.active === false;
        const isDraft = row.product.status === 'draft';
        const isPublished = !isArchived && !isDraft;
        if (statusFilter === 'published') return isPublished;
        if (statusFilter === 'draft') return isDraft;
        if (statusFilter === 'archived') return isArchived;
        return true;
      });
    }
    return baseRows;
  }, [snapshot.rows, query, category, statusFilter]);

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

  const handleDuplicateProduct = async (product: Product) => {
    if (!currentUser) return;
    setActionLoadingId(`dup-${product.id}`);
    setActionFeedback(null);
    try {
      await adminRequest(
        () => currentUser.getIdToken(),
        `/api/admin/catalog/products/${encodeURIComponent(product.id)}/duplicate`,
        { method: 'POST', body: {} }
      );
      setActionFeedback(`Duplicated ${product.id} as new draft.`);
      await Promise.all([loadAdminCatalog(), refreshCatalog()]);
    } catch (err: any) {
      setActionFeedback(`Failed to duplicate: ${err.message || err.code}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePublishProduct = async (product: Product) => {
    if (!currentUser) return;
    setActionLoadingId(`pub-${product.id}`);
    setActionFeedback(null);
    try {
      await adminRequest(
        () => currentUser.getIdToken(),
        `/api/admin/catalog/products/${encodeURIComponent(product.id)}/publish`,
        {
          method: 'POST',
          body: { expectedRevision: product.adminRevision ?? product.revision ?? 0 },
        }
      );
      setActionFeedback(`Published ${product.id} live.`);
      await Promise.all([loadAdminCatalog(), refreshCatalog()]);
    } catch (err: any) {
      setActionFeedback(`Failed to publish: ${err.message || err.code}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchiveProduct = async (product: Product) => {
    if (!currentUser) return;
    if (!window.confirm(`Archive product "${product.name_en}"? It will become unavailable for purchase on the storefront.`)) return;
    setActionLoadingId(`arc-${product.id}`);
    setActionFeedback(null);
    try {
      await adminRequest(
        () => currentUser.getIdToken(),
        `/api/admin/catalog/products/${encodeURIComponent(product.id)}/archive`,
        {
          method: 'POST',
          body: { expectedRevision: product.adminRevision ?? product.revision ?? 0 },
        }
      );
      setActionFeedback(`Archived ${product.id}.`);
      await Promise.all([loadAdminCatalog(), refreshCatalog()]);
    } catch (err: any) {
      setActionFeedback(`Failed to archive: ${err.message || err.code}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return <section aria-labelledby={`${ids}-heading`} dir="ltr" className="space-y-6 text-[var(--color-text-primary)]">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-xl" dir="auto">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[var(--color-accent-text)]">{t('admin.catalog.source')}</p>
        <h2 id={`${ids}-heading`} className="font-serif text-3xl">{t('admin.catalog.title')}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{t('admin.catalog.subtitle')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {snapshot.issueCount > 0 && <span className="inline-flex items-center gap-2 rounded-full border border-amber-700/25 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" dir="auto"><TriangleAlert size={15} aria-hidden="true" />{t('admin.catalog.issues').replace('{count}', String(snapshot.issueCount))}</span>}
        <button
          type="button"
          onClick={() => loadAdminCatalog()}
          disabled={loadingAdmin}
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold hover:border-[#c7982f]"
          title="Refresh authoritative catalog from Firestore"
        >
          <RefreshCw size={15} className={loadingAdmin ? 'animate-spin' : ''} />
          <span>Sync</span>
        </button>
        <button
          type="button"
          onClick={() => setIsMerchandisingOpen(true)}
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-xs font-semibold hover:border-[#c7982f]"
        >
          <Sparkles size={16} className="text-[#c7982f]" />
          <span>Merchandising</span>
        </button>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1e3a2b] text-[#fff8e9] dark:bg-[#c7982f] dark:text-[#1e3a2b] px-4 text-xs font-semibold hover:opacity-90 shadow-sm"
        >
          <Plus size={16} />
          <span>{t('item.add')}</span>
        </button>
      </div>
    </header>

    {actionFeedback && (
      <div className="flex items-center justify-between rounded-xl bg-[var(--color-base)] border border-[var(--color-border)] px-4 py-2.5 text-xs">
        <span>{actionFeedback}</span>
        <button type="button" onClick={() => setActionFeedback(null)} className="text-[var(--color-text-secondary)] hover:text-inherit">
          <X size={14} />
        </button>
      </div>
    )}

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
        
        {/* Status filter pills */}
        <div>
          <span className="mb-2 block text-xs font-medium" dir="auto">Status Filter</span>
          <div className="flex items-center gap-1 p-1 bg-[var(--color-base)] rounded-xl border border-[var(--color-border)] text-xs">
            {(['all', 'published', 'draft', 'archived'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-[#1e3a2b] text-[#fff8e9] dark:bg-[#c7982f] dark:text-[#1e3a2b]'
                    : 'text-[var(--color-text-secondary)] hover:text-inherit'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <label htmlFor={`${ids}-category`} className="block sm:w-60"><span className="mb-2 block text-xs font-medium" dir="auto">{t('admin.catalog.category')}</span><select id={`${ids}-category`} value={category} onChange={event => setCategory(event.target.value)} className="focus-ring min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base sm:text-sm" dir="auto"><option value="">{t('admin.catalog.all')}</option>{snapshot.categories.map(value => <option key={value} value={value}>{t(`shop.${value}`)}</option>)}</select></label>
      </div>
      <p className="px-4 py-3 text-xs text-[var(--color-text-secondary)] sm:px-5" dir="auto" role="status">{t('admin.catalog.showing').replace('{count}', String(rows.length)).replace('{total}', String(snapshot.productCount))}</p>
      <ul className="divide-y divide-[var(--color-border)]">
        {rows.map((row, index) => {
          const productResults = row.images.map(path => results[path]);
          const assetErrors = productResults.filter(result => result && result.result !== 'ok');
          const isArchived = row.product.status === 'archived' || row.product.active === false;
          const isDraft = row.product.status === 'draft';
          const isPublished = !isArchived && !isDraft;

          return <li key={`${row.product.id}-${index}`} className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,.9fr)] xl:items-start">
            <div className="flex min-w-0 gap-3">
              <Link to={`/product/${encodeURIComponent(row.product.id)}`} aria-label={`${t('admin.catalog.open')}: ${getLocalized(row.product, 'name', language)}`} className="focus-ring shrink-0 rounded-xl">{row.images[0] ? <img src={row.images[0]} alt="" loading="lazy" width={64} height={64} className="h-16 w-16 rounded-xl bg-[var(--color-base)] object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#c7982f]/30 bg-[#f3efe5] font-serif text-lg text-[#1e3a2b]">AB</span>}</Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/product/${encodeURIComponent(row.product.id)}`} className="focus-ring inline-flex min-h-11 items-center rounded font-serif text-lg leading-6" dir="auto">{getLocalized(row.product, 'name', language)}</Link>
                  {isDraft && <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">Draft</span>}
                  {isPublished && <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Published</span>}
                  {isArchived && <span className="rounded-full bg-zinc-500/10 border border-zinc-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">Archived</span>}
                </div>
                <p className="mt-1 break-all font-mono text-[11px] text-[var(--color-text-secondary)]">{row.product.id}</p>
                <p className="mt-1 text-xs text-[var(--color-accent-text)]" dir="auto">{t(`shop.${row.product.category}`)}</p>
              </div>
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
              
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Link to={`/product/${encodeURIComponent(row.product.id)}`} className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-accent-text)]"><span dir="auto">{t('admin.catalog.open')}</span><ArrowUpRight size={13} aria-hidden="true" /></Link>
                <button type="button" className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-semibold" onClick={() => row.product.commerce || !isProductMediaId(row.product.id) ? setProductToEdit(row.product) : setEditingMediaProductId(current => current === row.product.id ? null : row.product.id)} aria-expanded={editingMediaProductId === row.product.id} aria-controls={`${ids}-editor-${row.product.id}`}><Image size={14} aria-hidden="true" /><span dir="auto">{mediaTranslation('media.edit')}</span></button>
                <button type="button" className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-semibold" onClick={() => row.product.commerce ? setProductToEdit(row.product) : setPricingProductId(current => current === row.product.id ? null : row.product.id)} aria-expanded={pricingProductId === row.product.id} aria-controls={`${ids}-pricing-${row.product.id}`}><span dir="auto">{pricingTranslation('editButton')}</span></button>
                
                {/* Full Details Edit */}
                <button
                  type="button"
                  title={t('item.edit')}
                  onClick={() => setProductToEdit(row.product)}
                  className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#c7982f]/60 bg-[#c7982f]/10 text-[#c7982f] px-2.5 text-xs font-semibold hover:bg-[#c7982f]/20"
                >
                  <Edit size={13} />
                  <span>{t('item.edit')}</span>
                </button>

                {/* Lifecycle CRUD actions */}
                <button
                  type="button"
                  title="Duplicate Product as Draft"
                  disabled={actionLoadingId === `dup-${row.product.id}`}
                  onClick={() => handleDuplicateProduct(row.product)}
                  className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 text-xs font-semibold hover:border-[#c7982f] disabled:opacity-50"
                >
                  {actionLoadingId === `dup-${row.product.id}` ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                  <span>Duplicate</span>
                </button>

                {!isPublished && (
                  <button
                    type="button"
                    title="Publish Product to Storefront"
                    disabled={actionLoadingId === `pub-${row.product.id}`}
                    onClick={() => handlePublishProduct(row.product)}
                    className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-2 text-xs font-semibold hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    {actionLoadingId === `pub-${row.product.id}` ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Publish</span>
                  </button>
                )}

                {!isArchived && (
                  <button
                    type="button"
                    title="Archive Product"
                    disabled={actionLoadingId === `arc-${row.product.id}`}
                    onClick={() => handleArchiveProduct(row.product)}
                    className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg border border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 px-2 text-xs font-semibold hover:bg-zinc-500/20 disabled:opacity-50"
                  >
                    {actionLoadingId === `arc-${row.product.id}` ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}
                    <span>Archive</span>
                  </button>
                )}
              </div>
            </div>
            {editingMediaProductId === row.product.id && <div id={`${ids}-editor-${row.product.id}`} className="min-w-0 xl:col-span-3"><AdminProductMediaEditor key={row.product.id} product={row.product} onClose={() => setEditingMediaProductId(null)} /></div>}
            {pricingProductId === row.product.id && <div id={`${ids}-pricing-${row.product.id}`} className="min-w-0 xl:col-span-3"><AdminCatalogPricingEditor key={row.product.id} product={row.product} onClose={() => setPricingProductId(null)} /></div>}
          </li>;
        })}
      </ul>
      {rows.length === 0 && <p className="px-6 py-12 text-center text-sm text-[var(--color-text-secondary)]" dir="auto">{t('admin.catalog.noResults')}</p>}
    </div>

    <AdminProductCreateModal
      isOpen={isCreateOpen}
      initialCategory={category || undefined}
      onClose={() => setIsCreateOpen(false)}
      onCreated={async () => {
        setActionFeedback('New product created successfully!');
        await Promise.all([loadAdminCatalog(), refreshCatalog()]);
      }}
    />

    <AdminProductEditModal
      isOpen={!!productToEdit}
      product={productToEdit}
      onClose={() => setProductToEdit(null)}
      onSaved={async () => {
        setActionFeedback('Product details saved successfully!');
        await Promise.all([loadAdminCatalog(), refreshCatalog()]);
      }}
    />

    <AdminMerchandisingPanel
      isOpen={isMerchandisingOpen}
      onClose={() => setIsMerchandisingOpen(false)}
    />
  </section>;
}
