import React, { useEffect, useId, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Search, SlidersHorizontal, X, Heart, ArrowUpRight, ShoppingBag, Eye, Share2, Scale } from 'lucide-react';
import CatalogTools from './CatalogTools';
import SquishSwitch from './SquishSwitch';
import CatalogFilterSheet from './CatalogFilterSheet';
import { useCatalogFilterLanguage } from '../hooks/useCatalogFilterLanguage';
import { useCatalogActivity } from '../hooks/useCatalogActivity';
import { unitPrice } from '../lib/catalogActivity';
import ProductImageGallery from './ProductImageGallery';
import { PRODUCTS } from '../data/products';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { readSharedSelections, selectionLink, shareOrCopy } from '../lib/catalogLinks';
import { buildHumanSupportWhatsAppUrl } from '../config/contacts';
import type { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { useSavedProducts } from '../hooks/useSavedProducts';
import { getLocalized } from '../utils/localize';
import { CANONICAL_CATEGORIES, resolveCategorySlug } from '../config/categories';
import { CATALOG_SORTS, readCatalogFilters, searchCatalog, startingPrice, type CatalogSort } from '../lib/catalogDiscovery';
import { applyCatalogFilterDraft, beginCatalogFilterDraft, filterCatalogSelection, type CatalogFilterDraft } from '../lib/catalogFilterDraft';

export interface CategoryPLPProps {
  searchFilter?: string; initialCategory?: string;
  onAddToCart?: (productId: string, weight: string) => void;
  onQuickView?: (product: Product) => void;
  isWholesale?: boolean; isModal?: boolean; onClose?: () => void;
}
export type SortOption = CatalogSort;
export function CategoryPLPSkeleton() {
  return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[3/5] rounded-2xl bg-[var(--color-border)] motion-safe:animate-pulse" />)}</div>;
}
export default function CategoryPLP({ searchFilter: initialSearch, initialCategory = 'all', onAddToCart, onQuickView, isWholesale = false, isModal = false, onClose }: CategoryPLPProps) {
  const { t, language } = useCatalogFilterLanguage();
  const mediaCover = useProductMediaCover();
  const { addToCart } = useCart();
  const { savedIds, setSaved } = useSavedProducts();
  const { compareIds, toggleCompare } = useCatalogActivity();
  const [compareMessage, setCompareMessage] = useState('');
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [localParams, setLocalParams] = useState(() => new URLSearchParams({ search: initialSearch || '' }));
  const [modalCategory, setModalCategory] = useState(initialCategory);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDraft, setFilterDraft] = useState<CatalogFilterDraft | null>(null);
  const [mobileControls, setMobileControls] = useState(false);
  const [headerClearance, setHeaderClearance] = useState(0);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const suggestionId = useId();
  const desktopFilterId = useId();
  const sheetFilterId = useId();
  const activeParams = isModal ? localParams : params;
  const filters = readCatalogFilters(activeParams);
  const sharedIds = useMemo(() => readSharedSelections(activeParams.get('shared'), PRODUCTS), [activeParams]);
  const listView = activeParams.get('view') === 'list';
  const [visibleCount, setVisibleCount] = useState(12);
  const [shareStatus, setShareStatus] = useState('');
  const [manualLink, setManualLink] = useState('');
  const suggestions = useMemo(() => filters.query.trim() ? searchCatalog(PRODUCTS, filters.query).slice(0, 5) : [], [filters.query]);
  const category = resolveCategorySlug(isModal ? modalCategory : initialCategory) || 'all';
  const filterSignature = activeParams.toString();
  useEffect(() => { setVisibleCount(12); }, [category, filters.query, filters.origin, filters.budget, filters.sort, filters.saved, filters.special]);
  // Browser navigation or a new collection cancels the draft instead of committing stale choices.
  useEffect(() => { setFilterDraft(null); }, [filterSignature, category]);
  useEffect(() => {
    const viewport = window.matchMedia('(max-width: 1023px)');
    const changed = () => setMobileControls(viewport.matches);
    changed(); viewport.addEventListener('change', changed);
    const header = isModal ? null : document.getElementById('main-navigation-header');
    const measure = () => setHeaderClearance(header ? Math.ceil(header.getBoundingClientRect().height) : 0);
    measure();
    const observer = header && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (header) observer?.observe(header);
    window.addEventListener('resize', measure);
    if (!observer) window.addEventListener('scroll', measure, { passive: true });
    return () => {
      viewport.removeEventListener('change', changed); observer?.disconnect();
      window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure);
    };
  }, [isModal]);
  const share = async (saved = false) => {
    const url = saved ? selectionLink(window.location.origin, savedIds, PRODUCTS) : new URL(`${location.pathname}?${activeParams}`, window.location.origin).toString();
    const result = await shareOrCopy(t(saved ? 'shop.shareSaved' : 'shop.shareCollection'), url);
    setShareStatus(result === 'copied' ? t('shareCopied') : ''); setManualLink(result === 'manual' ? url : '');
  };
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(isModal ? localParams : params);
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    if (isModal) setLocalParams(next); else setParams(next, { replace: true, preventScrollReset: true });
  };
  const selectCategory = (id: string) => {
    if (isModal) { setModalCategory(id); return; }
    const next = new URLSearchParams(params); next.delete('category');
    navigate({ pathname: id === 'all' ? '/shop' : `/shop/${id}`, search: next.toString() }, { preventScrollReset: true });
  };
  const clear = () => update({ search: null, budget: null, origin: null, special: null, saved: null, sort: null, shared: null });
  const openFilters = () => {
    setSearchOpen(false);
    if (window.matchMedia('(max-width: 1023px)').matches) setFilterDraft(beginCatalogFilterDraft(activeParams));
    else setShowFilters(previous => !previous);
  };
  const applyDraft = () => {
    if (!filterDraft) return;
    const next = applyCatalogFilterDraft(activeParams, filterDraft);
    if (isModal) setLocalParams(next); else setParams(next, { replace: true, preventScrollReset: true });
    setFilterDraft(null);
  };
  const origins = useMemo(() => [...new Map(PRODUCTS.filter(p => p.active !== false && p.origin_en).map(p => [p.origin_en, getLocalized(p, 'origin', language)])).entries()], [language]);
  const products = useMemo(() => {
    const found = filterCatalogSelection(PRODUCTS, { query: filters.query, origin: filters.origin, budget: filters.budget, special: filters.special, saved: filters.saved, sort: filters.sort }, { category, isWholesale, savedIds, sharedIds });
    if (category === 'all' && filters.sort === 'featured') {
      const order = Object.keys(CANONICAL_CATEGORIES);
      return found.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
    }
    return found.sort((a, b) => (filters.sort === 'price-asc' || filters.sort === 'price-desc') && !!a.quoteOnly !== !!b.quoteOnly ? Number(!!a.quoteOnly) - Number(!!b.quoteOnly)
      : filters.sort === 'price-asc' ? startingPrice(a) - startingPrice(b)
      : filters.sort === 'price-desc' ? startingPrice(b) - startingPrice(a)
      : filters.sort === 'name-asc' ? getLocalized(a, 'name', language).localeCompare(getLocalized(b, 'name', language), language) : 0);
  }, [category, filters.query, filters.origin, filters.special, filters.saved, filters.budget, filters.sort, isWholesale, savedIds, language, sharedIds]);
  const previewCount = (draft: CatalogFilterDraft) => filterCatalogSelection(PRODUCTS, draft, { category, isWholesale, savedIds, sharedIds: readSharedSelections(draft.shared, PRODUCTS) }).length;
  const draftOrigins = filterDraft ? [['all', t('shop.anyOrigin')], ...origins].map(([id, label]) => ({ id, label, count: previewCount({ ...filterDraft, origin: id }) })) : [];
  const chips = [
    ...(sharedIds !== null ? [{ key: 'shared', label: t('shop.sharedSelections') }] : []),
    ...(filters.query ? [{ key: 'search', label: filters.query }] : []),
    ...(filters.origin !== 'all' ? [{ key: 'origin', label: origins.find(([id]) => id === filters.origin)?.[1] || filters.origin }] : []),
    ...(filters.budget < 10000 ? [{ key: 'budget', label: `≤ Rs. ${filters.budget.toLocaleString()}` }] : []),
    ...(filters.special ? [{ key: 'special', label: t('shop.special') }] : []),
    ...(filters.saved ? [{ key: 'saved', label: t('shop.saved') }] : []),
    ...(filters.sort !== 'featured' ? [{ key: 'sort', label: t(`shop.${filters.sort}`) }] : []),
  ];
  return <section id="category-plp-container" className="w-full pb-12 text-[var(--color-text-primary)]" style={{ '--catalog-header-clearance': `${headerClearance}px` } as React.CSSProperties}>
    {filterDraft && <CatalogFilterSheet id={sheetFilterId} draft={filterDraft} categoryLabel={t(`shop.${category}`)} results={previewCount(filterDraft)} origins={draftOrigins} savedCount={savedIds.length} onChange={setFilterDraft} onApply={applyDraft} onCancel={() => setFilterDraft(null)} />}
    {isModal && <button type="button" onClick={onClose} aria-label={t('close')} className="ms-auto flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)]"><X size={20} /></button>}
    <header className="relative mb-7 overflow-hidden rounded-[28px] border border-[#c7982f]/25 bg-[#092e23] px-6 py-9 text-[#fff8e9] sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute -end-12 -top-12 h-72 w-72 rounded-full border border-[#d5b876]/15" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-36 end-6 h-80 w-80 rounded-full border border-[#d5b876]/15" aria-hidden="true" />
      <p className="relative mb-4 text-[10px] font-semibold tracking-[.25em] text-[#e4c783]">{t('shop.eyebrow')}</p>
      <h1 className="relative max-w-3xl font-serif text-4xl leading-[1.12] sm:text-6xl">{category === 'all' ? t('shop.title') : t(`shop.${category}`)}</h1>
      <div className="relative mt-5 flex flex-wrap items-end justify-between gap-5"><p className="max-w-lg text-sm leading-7 text-[#d1ded5]">{t('shop.copy')}</p><span className="text-xs text-[#e4c783]">{PRODUCTS.length} / {t('shop.results')}</span></div>
    </header>
    {isWholesale && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] p-4"><p className="max-w-lg text-sm leading-6">{t('shop.wholesaleCopy')}</p><a href={buildHumanSupportWhatsAppUrl('I would like to enquire about wholesale products.')} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-11 items-center rounded-full bg-[#1e3a2b] px-5 text-xs text-[#fff8e9]">{t('shop.wholesaleEnquiry')}</a></div>}
    <nav aria-label={t('category')} className="catalog-category-nav mb-6 flex gap-2 overflow-x-auto pb-2">
      {['all', ...Object.keys(CANONICAL_CATEGORIES)].map(id => <button key={id} type="button" onClick={() => selectCategory(id)} aria-pressed={category === id} className={`min-h-11 shrink-0 rounded-full border px-5 text-xs font-semibold transition-colors ${category === id ? 'border-[#1e3a2b] bg-[#1e3a2b] text-[#fff8e9]' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[#c7982f]'}`}>{t(`shop.${id}`)}</button>)}
    </nav>
    <div className={`catalog-quick-controls mb-5 flex flex-col gap-3 lg:flex-row ${isModal ? 'catalog-quick-controls-modal' : ''}`}>
      <div className="relative flex-1" onFocusCapture={() => setSearchOpen(true)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false); }}
        onKeyDownCapture={event => {
          if (event.key === 'Escape') { event.preventDefault(); setSearchOpen(false); event.currentTarget.querySelector('input')?.focus(); }
          if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
            event.preventDefault(); setSearchOpen(true);
            const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('[role="option"]'));
            const index = links.indexOf(event.target as HTMLAnchorElement);
            if (index < 0) links[event.key === 'ArrowDown' ? 0 : links.length - 1]?.focus();
            else if (event.key === 'ArrowUp' && index === 0) event.currentTarget.querySelector('input')?.focus();
            else links[(index + (event.key === 'ArrowDown' ? 1 : -1)) % links.length]?.focus();
          }
          if (event.key === 'Enter' && event.target instanceof HTMLInputElement) setSearchOpen(false);
        }}>
      <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 focus-within:border-[#c7982f] focus-within:ring-2 focus-within:ring-[#c7982f]/15 lg:min-h-14">
        <Search size={19} className="shrink-0 text-[var(--color-accent-text)]" />
        <input type="search" role="combobox" aria-autocomplete="list" aria-controls={suggestionId} aria-expanded={searchOpen && !!filters.query.trim()} dir="auto" aria-label={t('shop.search')} placeholder={t('shop.hint')} value={filters.query} onChange={e => { update({ search: e.target.value || null }); setSearchOpen(true); }} className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none" />
        {filters.query && <button type="button" aria-label={t('shop.clear')} onClick={() => update({ search: null })} className="flex h-11 w-11 items-center justify-center"><X size={17} /></button>}
      </div>
      {searchOpen && filters.query.trim() && <div className="boutique-search-suggestions z-30">
        <div id={suggestionId} role="listbox" aria-label={t('boutique.suggestions')}>
          {suggestions.length ? suggestions.map(product => <Link key={product.id} to={`/product/${product.id}`} role="option" aria-selected={false} className="boutique-suggestion" onClick={() => { setSearchOpen(false); onClose?.(); }}>
            <img src={mediaCover(product)} alt="" loading="lazy" /><span dir="auto"><strong>{getLocalized(product, 'name', language)}</strong><small>{getLocalized(product, 'category', language)}</small></span>{product.quoteOnly ? <span>{t('catalog.requestQuote')}</span> : <bdi>Rs. {startingPrice(product).toLocaleString()}</bdi>}
          </Link>) : <p className="boutique-search-empty">{t('boutique.noResults')}</p>}
        </div>
        <button type="button" className="boutique-search-all" onClick={() => setSearchOpen(false)}>{t('boutique.allResults')} <ArrowUpRight size={16} /></button>
      </div>}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={openFilters} aria-haspopup={mobileControls ? 'dialog' : undefined} aria-expanded={mobileControls ? !!filterDraft : showFilters} aria-controls={mobileControls ? sheetFilterId : desktopFilterId} className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-xs font-semibold"><SlidersHorizontal size={17} aria-hidden="true" /><span dir="auto">{t(mobileControls ? 'filters.title' : 'shop.filters')}</span>{chips.length > 0 && <span aria-label={t('filters.applied').replace('{count}', String(chips.length))} className="rounded-full bg-[#c7982f]/15 px-2 py-1">{chips.length}</span>}</button>
        <button type="button" aria-pressed={filters.saved} onClick={() => update({ saved: filters.saved ? null : '1' })} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-semibold ${filters.saved ? 'border-[#c7982f] bg-[#c7982f]/10' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}><Heart size={17} fill={filters.saved ? 'currentColor' : 'none'} />{t('shop.saved')} <span>{savedIds.length}</span></button>
      </div>
    </div>
    <AnimatePresence initial={false}>{showFilters && <motion.div id={desktopFilterId} initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={reduceMotion ? undefined : { opacity: 0, height: 0 }} transition={{ duration: reduceMotion ? 0 : .2 }} className="hidden overflow-hidden lg:block">
      <div className="mb-5 grid gap-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-3 text-xs font-semibold"><span className="flex justify-between gap-2">{t('shop.budget')}<bdi>Rs. {filters.budget.toLocaleString()}{filters.budget === 10000 ? '+' : ''}</bdi></span><input type="range" min={300} max={10000} step={100} value={filters.budget} onChange={e => update({ budget: e.target.value === '10000' ? null : e.target.value })} className="h-11 w-full accent-[#c7982f]" /></label>
        <label className="space-y-3 text-xs font-semibold"><span className="block">{t('shop.origin')}</span><select value={filters.origin} onChange={e => update({ origin: e.target.value === 'all' ? null : e.target.value })} className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base sm:text-xs"><option value="all">{t('shop.anyOrigin')}</option>{origins.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <div className="flex flex-col justify-center gap-3"><label className="flex min-h-11 items-center gap-3 text-xs font-semibold"><input type="checkbox" checked={filters.special} onChange={e => update({ special: e.target.checked ? '1' : null })} className="h-5 w-5 accent-[#c7982f]" />{t('shop.special')}</label><button type="button" onClick={() => setShowFilters(false)} className="min-h-11 rounded-xl bg-[#1e3a2b] px-4 text-xs font-semibold text-white">{t('shop.apply')} ({products.length})</button></div>
      </div>
    </motion.div>}</AnimatePresence>
    {chips.length > 0 && <div className="mb-5 flex flex-wrap items-center gap-2">{chips.map(chip => <button key={chip.key} type="button" onClick={() => update({ [chip.key]: null })} aria-label={`${t('shop.remove')}: ${chip.label}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-[var(--color-border)] px-3 text-xs"><span className="truncate" dir="auto">{chip.label}</span><X size={13} className="shrink-0" /></button>)}<button type="button" onClick={clear} className="min-h-11 px-3 text-xs underline underline-offset-4">{t('shop.clear')}</button></div>}
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void share()} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-xs"><Share2 size={15} />{t('shop.shareCollection')}</button><button type="button" disabled={!savedIds.length} onClick={() => void share(true)} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-xs disabled:opacity-40"><Heart size={15} />{t('shop.shareSaved')}</button></div>
      <SquishSwitch checked={listView} onChange={checked => update({ view: checked ? 'list' : null })} label={t('shop.list')} />
    </div>
    {shareStatus && <p role="status" className="mb-4 text-xs text-[var(--color-accent-text)]">{shareStatus}</p>}
    {manualLink && <label className="mb-4 block text-xs">{t('shop.copyLink')}<input readOnly value={manualLink} dir="ltr" onFocus={event => event.target.select()} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base sm:text-xs" /></label>}
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
      <p role="status" aria-live="polite" className="text-xs text-[var(--color-text-secondary)]"><strong className="text-[var(--color-text-primary)]">{products.length}</strong> {t('shop.results')}</p>
      <label className="hidden items-center gap-2 text-xs lg:flex"><span dir="auto">{t('shop.sort')}</span><select value={filters.sort} dir="auto" onChange={e => update({ sort: e.target.value === 'featured' ? null : e.target.value })} className="min-h-11 max-w-[190px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base sm:text-xs">{CATALOG_SORTS.map(sort => <option key={sort} value={sort}>{t(`shop.${sort}`)}</option>)}</select></label>
    </div>
    <CatalogTools mode="compare" />
    {compareMessage && <p role="status" className="mb-4 text-xs">{compareMessage}</p>}
    {products.length ? <div id="plp-products-grid" className={listView ? 'grid grid-cols-1 gap-4 md:grid-cols-2' : 'grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6'}>{products.slice(0, visibleCount).map((product, index) => {
      const weights = Object.keys(product.prices).filter(weight => Number.isFinite(product.prices[weight]) && product.prices[weight] > 0);
      const weight = sizes[product.id] || weights[0];
      const saved = savedIds.includes(product.id);
      const unit = product.quoteOnly ? null : unitPrice(product.prices[weight], weight || '');
      return <React.Fragment key={product.id}>{category === 'all' && filters.sort === 'featured' && (index === 0 || products[index - 1].category !== product.category) && <h2 className="col-span-full mt-4 border-b border-[var(--color-border)] pb-3 font-serif text-2xl text-[var(--color-text-primary)]">{t(`shop.${product.category}`)}</h2>}<article className={`group relative flex min-w-0 cursor-pointer flex-col rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-[border-color,box-shadow] duration-300 hover:border-[var(--color-border-accent)] hover:shadow-md motion-reduce:transition-none sm:p-4 ${listView ? "catalog-list-card" : ""}`} onClick={event => { if (!(event.target as HTMLElement).closest('a,button,input,select')) navigate(`/product/${product.id}`); }}>
        <ProductImageGallery product={product} />
        <div className="flex items-center justify-between gap-2 pt-3"><span className="truncate text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--color-accent-text)]" dir="auto">{getLocalized(product, 'origin', language)}</span><button type="button" onClick={() => setSaved(product.id, !saved)} aria-label={saved ? t('shop.unsave') : t('shop.save')} aria-pressed={saved} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-accent-text)] hover:bg-[#c7982f]/10"><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button></div>
        <Link to={`/product/${product.id}`} lang={language} dir="auto" className={`focus-ring mb-3 block min-h-12 min-w-0 max-w-full whitespace-normal break-words [overflow-wrap:anywhere] text-start font-medium ${language === 'ur' ? 'font-urdu text-[20px]' : language === 'ar' ? 'font-arabic text-[23px]' : 'font-serif text-[21px] leading-[1.25]'}`}><span>{getLocalized(product, 'name', language)}</span></Link>
        <div className="mt-auto">{product.quoteOnly ? <><p className="mb-4 text-xs leading-6 text-[var(--color-text-secondary)]">{t('catalog.quoteCopy')}</p><Link to="/pages/contact" className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a2b] px-2 text-xs font-semibold text-[#fff8e9] transition-colors hover:bg-[#092e23]">{t('catalog.requestQuote')}<ArrowUpRight size={15} /></Link></> : <>{product.isBundle ? <div className="mb-3"><span className="inline-flex rounded-full border border-[var(--color-border-accent)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-accent-text)]">{t('catalog.bundle')}</span><p className="mt-2 text-xs leading-6 text-[var(--color-text-secondary)]" dir="auto">{getLocalized(product, 'contents', language)}</p></div> : <><label className="sr-only" htmlFor={`size-${product.id}`}>{t('shop.portion')}</label><select id={`size-${product.id}`} value={weight} onChange={e => setSizes(prev => ({ ...prev, [product.id]: e.target.value }))} className="mb-3 min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base sm:text-xs">{weights.map(size => <option key={size} value={size}>{size}</option>)}</select></>}
          <p className="mb-4 font-serif text-xl font-semibold"><bdi>Rs. {(product.prices[weight] || 0).toLocaleString()}</bdi>{unit && <small className="mt-1 block font-sans text-[10px] font-normal text-[var(--color-text-secondary)]"><bdi>Rs. {unit.amount.toLocaleString()} / {unit.unit}</bdi></small>}</p>
          <button type="button" onClick={() => onAddToCart ? onAddToCart(product.id, weight) : addToCart(product, weight, 1)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1e3a2b] px-2 text-xs font-semibold text-[#fff8e9] transition-colors hover:bg-[#092e23]"><ShoppingBag size={15} />{t('addToCart')}</button></>}
          <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" aria-pressed={compareIds.includes(product.id)} onClick={() => { const added = toggleCompare(product.id); setCompareMessage(added ? t('shop.compareUpdated') : t('shop.compareFull')); }} className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-base)]"><Scale size={15} />{t(compareIds.includes(product.id) ? 'shop.compared' : 'shop.compareAdd')} ({compareIds.length}/3)</button>
          {onQuickView && <button type="button" onClick={() => onQuickView(product)} className="focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-base)] hover:text-[var(--color-accent-text)]"><Eye size={15} />{t('shop.quick')}</button>}</div>
        </div>
      </article></React.Fragment>;
    })}</div> : <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-16 text-center"><Search size={30} className="mx-auto mb-5 text-[var(--color-accent-text)]" /><h2 className="font-serif text-3xl">{t('shop.empty')}</h2><p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[var(--color-text-secondary)]">{t('shop.emptyCopy')}</p><button type="button" onClick={clear} className="mt-6 min-h-12 rounded-full bg-[#1e3a2b] px-6 text-sm text-white">{t('shop.clear')}</button><Link to="/shop" className="mx-auto mt-2 flex min-h-11 w-fit items-center gap-2 text-xs" onClick={() => { if (isModal) { clear(); setModalCategory('all'); } }}>{t('shop.all')}<ArrowUpRight size={15} /></Link></div>}
    {products.length > visibleCount && <div className="mt-8 text-center"><button type="button" onClick={() => setVisibleCount(count => count + 12)} className="focus-ring min-h-12 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-7 text-sm font-semibold">{t('shop.loadMore')} ({products.length - visibleCount})</button><p className="mt-3 text-xs text-[var(--color-text-secondary)]">{visibleCount} / {products.length}</p></div>}
    <CatalogTools mode="recent" />
  </section>;
}
