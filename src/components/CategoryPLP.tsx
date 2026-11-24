import VoiceInputButton from './VoiceInputButton';
import BundleContentsSummary from './BundleContentsSummary';
import { initialCardPortion, readBundleFormat } from '../lib/merchandisingPresentation';
import { usePrefersReducedMotion as useReducedMotion } from '../hooks/usePrefersReducedMotion';
import CartAddButton from './CartAddButton';
import { useCatalogProducts, useCatalogTaxonomy, useCatalogHiddenTaxonomy, useCatalogLoading } from '../contexts/CatalogContext';
import { ShopCategorySkeleton } from './StorefrontSkeletons';
import React, { useEffect, useId, useMemo, useState, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams, useNavigationType } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
import { CANONICAL_CATEGORIES, CUSTOMER_FACING_CATEGORIES, resolveCategorySlug, OCCASION_TAGS, getCategoryMeta } from '../config/categories';
import { getSectionCover } from '../config/sectionCovers';
import { CATALOG_SORTS, readCatalogFilters, searchCatalog, startingPrice, type CatalogSort } from '../lib/catalogDiscovery';
import { ALLERGEN_FILTER_KEYS, type AllergenFilterKey } from '../lib/allergenFilter';
import { AllBarkaCrestVector } from './AllBarkaLogo';
import { applyCatalogFilterDraft, beginCatalogFilterDraft, filterCatalogSelection, type CatalogFilterDraft } from '../lib/catalogFilterDraft';
import { openCustomQuoteModal } from '../lib/customQuoteEvent';

export interface CategoryPLPProps {
  searchFilter?: string; initialCategory?: string;
  onAddToCart?: (productId: string, weight: string) => void;
  onQuickView?: (product: Product) => void;
  isWholesale?: boolean; isModal?: boolean; onClose?: () => void;
}
// Session-only, bounded history of catalogue depth; no customer/catalog data is persisted.
const browsingPositions = new Map<string, { y: number; count: number }>();
export type SortOption = CatalogSort;
export function CategoryPLPSkeleton() {
  return <ShopCategorySkeleton gridOnly />;
}
export default function CategoryPLP({ searchFilter: initialSearch, initialCategory = 'all', onAddToCart, onQuickView, isWholesale = false, isModal = false, onClose }: CategoryPLPProps) {
  const PRODUCTS = useCatalogProducts();
  const catalogLoading = useCatalogLoading();
  const taxonomy=useCatalogTaxonomy();const hiddenTaxonomy=useCatalogHiddenTaxonomy();
  const { t, language } = useCatalogFilterLanguage();
  const categoryLabel = (id: string) => {
    const entry = taxonomy.find(item => item.id === id && item.type !== 'occasion');
    return entry?.[`name_${language}`] || t(`shop.${id}`, entry?.name_en || getCategoryMeta(id).name);
  };
  const mediaCover = useProductMediaCover();
  const { addToCart } = useCart();
  const { savedIds, setSaved } = useSavedProducts();
  const { compareIds, toggleCompare } = useCatalogActivity();
  const [compareMessage, setCompareMessage] = useState('');
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
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
  const occasion = activeParams.get('occasion');
  const sharedIds = useMemo(() => readSharedSelections(activeParams.get('shared'), PRODUCTS), [activeParams, PRODUCTS]);
  const listView = activeParams.get('view') === 'list';
  const [visibleCount, setVisibleCount] = useState(() => !isModal && navigationType === 'POP' ? browsingPositions.get(location.key)?.count || 12 : 12);
  const visibleCountRef = useRef(visibleCount);
  visibleCountRef.current = visibleCount;
  const [shareStatus, setShareStatus] = useState('');
  const [manualLink, setManualLink] = useState('');
  const suggestions = useMemo(() => filters.query.trim() ? searchCatalog(PRODUCTS, filters.query).slice(0, 5) : [], [filters.query, PRODUCTS]);
  const category = resolveCategorySlug(isModal ? modalCategory : initialCategory) || (isModal ? modalCategory : initialCategory);
  const sectionCover = getSectionCover(category) || getSectionCover('all');
  const filterSignature = activeParams.toString();
  useEffect(() => { setVisibleCount(!isModal && navigationType === 'POP' ? browsingPositions.get(location.key)?.count || 12 : 12); }, [category, filters.query, filters.origin, filters.budget, filters.sort, filters.saved, filters.special, occasion, isModal, location.key, navigationType]);
  // Browser navigation or a new collection cancels the draft instead of committing stale choices.
  useEffect(() => { setFilterDraft(null); }, [filterSignature, category, location.key]);
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
  useEffect(() => {
    if (isModal) return;
    const key = location.key;
    const saved = navigationType === 'POP' ? browsingPositions.get(key) : undefined;
    let frame = 0;
    let restoring = !!saved;
    if (saved) frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => { window.scrollTo({ top: saved.y, behavior: 'instant' }); restoring = false; });
    });
    const remember = () => {
      if (restoring) return;
      browsingPositions.set(key, { y: window.scrollY, count: visibleCountRef.current });
      if (browsingPositions.size > 40) browsingPositions.delete(browsingPositions.keys().next().value!);
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', remember); const last = browsingPositions.get(key); if (last) last.count = visibleCountRef.current; };
  }, [isModal, location.key, navigationType]);
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
  const clear = () => update({ search: null, budget: null, origin: null, special: null, saved: null, sort: null, shared: null, occasion: null, avoid: null });
  const toggleAllergen = (key: AllergenFilterKey) => {
    const next = filters.excludeAllergens.includes(key)
      ? filters.excludeAllergens.filter(item => item !== key)
      : [...filters.excludeAllergens, key];
    update({ avoid: next.length ? next.join(',') : null });
  };
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
  const origins = useMemo(() => [...new Map(PRODUCTS.filter(p => p.active !== false && p.origin_en).map(p => [p.origin_en, getLocalized(p, 'origin', language)])).entries()], [language, PRODUCTS]);
  const products = useMemo(() => {
    const found = filterCatalogSelection(PRODUCTS, { query: filters.query, origin: filters.origin, budget: filters.budget, special: filters.special, saved: filters.saved, excludeAllergens: filters.excludeAllergens, sort: filters.sort, occasion }, { category, isWholesale, savedIds, sharedIds });
    if (category === 'all' && filters.sort === 'featured') {
      const order = Object.keys(CANONICAL_CATEGORIES);
      return found.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
    }
    return found.sort((a, b) => (filters.sort === 'price-asc' || filters.sort === 'price-desc') && !!a.quoteOnly !== !!b.quoteOnly ? Number(!!a.quoteOnly) - Number(!!b.quoteOnly)
      : filters.sort === 'price-asc' ? startingPrice(a) - startingPrice(b)
      : filters.sort === 'price-desc' ? startingPrice(b) - startingPrice(a)
      : filters.sort === 'name-asc' ? getLocalized(a, 'name', language).localeCompare(getLocalized(b, 'name', language), language) : 0);
  }, [category, filters.query, filters.origin, filters.special, filters.saved, filters.excludeAllergens, filters.budget, filters.sort, occasion, isWholesale, savedIds, language, sharedIds, PRODUCTS]);
  const previewCount = (draft: CatalogFilterDraft) => filterCatalogSelection(PRODUCTS, draft, { category, isWholesale, savedIds, sharedIds: readSharedSelections(draft.shared, PRODUCTS) }).length;
  const draftOrigins = filterDraft ? [['all', t('shop.anyOrigin')], ...origins].map(([id, label]) => ({ id, label, count: previewCount({ ...filterDraft, origin: id }) })) : [];
  const occasionTitle = OCCASION_TAGS.find(o => o.id === occasion)?.name || occasion;
  const chips: Array<{ key: string; label: string; onRemove?: () => void }> = [
    ...(sharedIds !== null ? [{ key: 'shared', label: t('shop.sharedSelections') }] : []),
    ...(filters.query ? [{ key: 'search', label: filters.query }] : []),
    ...(occasion && occasion !== 'all' ? [{ key: 'occasion', label: `${t('nav.occasions', 'Occasion')}: ${occasionTitle}` }] : []),
    ...(filters.origin !== 'all' ? [{ key: 'origin', label: origins.find(([id]) => id === filters.origin)?.[1] || filters.origin }] : []),
    ...(filters.budget < 10000 ? [{ key: 'budget', label: `≤ Rs. ${filters.budget.toLocaleString()}` }] : []),
    ...(filters.special ? [{ key: 'special', label: t('shop.special') }] : []),
    ...(filters.saved ? [{ key: 'saved', label: t('shop.saved') }] : []),
    ...filters.excludeAllergens.map(allergen => ({
      key: `avoid:${allergen}`,
      label: t('filters.avoidChip').replace('{label}', t(`allergen.${allergen}`)),
      onRemove: () => toggleAllergen(allergen),
    })),
    ...(filters.sort !== 'featured' ? [{ key: 'sort', label: t(`shop.${filters.sort}`) }] : []),
  ];
  return <section id="category-plp-container" className="w-full pb-12 text-[var(--color-text-primary)]" style={{ '--catalog-header-clearance': `${headerClearance}px` } as React.CSSProperties}>
    {filterDraft && <CatalogFilterSheet id={sheetFilterId} draft={filterDraft} categoryLabel={categoryLabel(category)} results={previewCount(filterDraft)} origins={draftOrigins} savedCount={savedIds.length} onChange={setFilterDraft} onApply={applyDraft} onCancel={() => setFilterDraft(null)} />}
    {isModal && <button type="button" onClick={onClose} aria-label={t('close')} className="ms-auto flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)]"><X size={20} /></button>}
    <header className="table-catalog-header relative mb-7 overflow-hidden rounded-[22px] border border-[#C7982F]/35 bg-[#042821] px-6 py-9 text-[#FDFBF7] sm:px-10 sm:py-14">
      {sectionCover && (
        <div className="pointer-events-none absolute inset-0">
          <img
            src={sectionCover.src}
            srcSet={sectionCover.srcSet}
            sizes="(max-width: 768px) 100vw, 48vw"
            alt={t(sectionCover.altKey, category === 'all' ? t('shop.title') : categoryLabel(category))}
            width={800}
            height={800}
            loading="eager"
            decoding="async"
            className="absolute inset-y-0 end-0 h-full w-full sm:w-3/5 lg:w-1/2 object-cover opacity-30 sm:opacity-45"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#042821] via-[#042821]/92 to-[#042821]/45 rtl:bg-gradient-to-l" />
        </div>
      )}
      <p className="relative z-10 mb-3 text-xs sm:text-[13px] font-medium text-[#E4C783]">{t('shop.eyebrow')}</p>
      <h1 className="relative z-10 max-w-3xl font-serif text-3xl sm:text-5xl font-medium leading-[1.12] tracking-[-0.02em] text-[#FDFBF7]">{category === 'all' ? t('shop.title') : categoryLabel(category)}</h1>
      <div className="relative z-10 mt-5 flex flex-wrap items-end justify-between gap-5"><p className="max-w-lg text-sm leading-7 text-[#F2ECE2]/85">{t('shop.copy')}</p><span className="text-xs font-medium text-[#E4C783]">{PRODUCTS.length} / {t('shop.results')}</span></div>
    </header>
    {isWholesale && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] p-4"><p className="max-w-lg text-sm leading-6">{t('shop.wholesaleCopy')}</p><a href={buildHumanSupportWhatsAppUrl('I would like to enquire about wholesale products.')} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-11 items-center rounded-full bg-[#1e3a2b] px-5 text-xs text-[#fff8e9]">{t('shop.wholesaleEnquiry')}</a></div>}
    <nav aria-label={t('category')} className="catalog-category-nav mb-6 flex gap-2 overflow-x-auto pb-2">
      {['all', ...new Set([...CUSTOMER_FACING_CATEGORIES.filter(id=>!hiddenTaxonomy.includes(id)),...taxonomy.filter(x=>x.type!=='occasion').map(x=>x.id)])].map(id => {
        const isActive = category === id || (category === 'nuts' && id === 'dry-fruits') || (category === 'snacks-seeds' && id === 'seeds-snacks') || (category === 'combos' && id === 'gift-boxes');
        return (
          <button
            key={id}
            type="button"
            onClick={() => selectCategory(id)}
            aria-pressed={isActive}
            className={`min-h-11 shrink-0 rounded-full border px-5 text-xs font-semibold transition-colors ${isActive ? 'border-[#1e3a2b] bg-[#1e3a2b] text-[#fff8e9]' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[#c7982f]'}`}
          >
            {categoryLabel(id)}
          </button>
        );
      })}
      <button type="button" onClick={() => openCustomQuoteModal({ mode: 'filled', quantity: 50 })} className="min-h-11 shrink-0 rounded-full border border-[#8C6B1B] bg-[#FAF6EE] px-5 text-xs font-bold text-[#8C6B1B] transition-colors hover:bg-[#8C6B1B] hover:text-white">Bid Boxes &amp; Custom Quote</button>
    </nav>
    {taxonomy.some(x=>x.type==='occasion')&&<nav className="catalog-category-nav mb-5 flex gap-2 overflow-x-auto" aria-label={t('item.occasions')}>{taxonomy.filter(x=>x.type==='occasion').map(x=><button key={x.id} type="button" className="min-h-11 shrink-0 rounded-full border border-[var(--color-border)] px-4 text-xs" aria-pressed={occasion===x.id} onClick={()=>update({occasion:occasion===x.id?null:x.id})}>{x[`name_${language}`]||x.name_en}</button>)}</nav>}
    <div className={`catalog-quick-controls mb-5 flex flex-col gap-3 lg:flex-row ${isModal ? 'catalog-quick-controls-modal' : ''}`}>
      <div className="relative flex-1" onFocusCapture={() => setSearchOpen(true)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false); }}
        onKeyDownCapture={event => {
          if ((event.target as HTMLElement).closest('[data-voice-control]')) return;
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
        <VoiceInputButton onTranscript={text => { update({ search: text }); setSearchOpen(true); }} />
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
      <div className="flex flex-wrap gap-2">
        <button data-catalog-filter-trigger="" type="button" onClick={openFilters} aria-haspopup={mobileControls ? 'dialog' : undefined} aria-expanded={mobileControls ? !!filterDraft : showFilters} aria-controls={mobileControls ? sheetFilterId : desktopFilterId} className="focus-ring flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-xs font-semibold"><SlidersHorizontal size={17} aria-hidden="true" /><span dir="auto">{t(mobileControls ? 'filters.title' : 'shop.filters')}</span>{chips.length > 0 && <span aria-label={t('filters.applied').replace('{count}', String(chips.length))} className="rounded-full bg-[#c7982f]/15 px-2 py-1">{chips.length}</span>}</button>
        <button type="button" aria-pressed={filters.saved} onClick={() => update({ saved: filters.saved ? null : '1' })} className={`flex min-h-12 min-w-0 flex-1 basis-40 items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-semibold ${filters.saved ? 'border-[#c7982f] bg-[#c7982f]/10' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}><Heart size={17} className="shrink-0" fill={filters.saved ? 'currentColor' : 'none'} /><span className="min-w-0 [overflow-wrap:anywhere]">{t('shop.saved')}</span><span className="shrink-0">{savedIds.length}</span></button>
      </div>
    </div>
    <AnimatePresence initial={false}>{showFilters && <motion.div id={desktopFilterId} initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={reduceMotion ? undefined : { opacity: 0, height: 0 }} transition={{ duration: reduceMotion ? 0 : .2 }} className="hidden overflow-hidden lg:block">
      <div className="mb-5 grid gap-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-3 text-xs font-semibold"><span className="flex justify-between gap-2">{t('shop.budget')}<bdi>Rs. {filters.budget.toLocaleString()}{filters.budget === 10000 ? '+' : ''}</bdi></span><input type="range" min={300} max={10000} step={100} value={filters.budget} onChange={e => update({ budget: e.target.value === '10000' ? null : e.target.value })} className="h-11 w-full accent-[#c7982f]" /></label>
        <label className="space-y-3 text-xs font-semibold"><span className="block">{t('shop.origin')}</span><select value={filters.origin} onChange={e => update({ origin: e.target.value === 'all' ? null : e.target.value })} className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base sm:text-xs"><option value="all">{t('shop.anyOrigin')}</option>{origins.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <div className="flex flex-col justify-center gap-3"><label className="flex min-h-11 items-center gap-3 text-xs font-semibold"><input type="checkbox" checked={filters.special} onChange={e => update({ special: e.target.checked ? '1' : null })} className="h-5 w-5 accent-[#c7982f]" />{t('shop.special')}</label><button type="button" onClick={() => setShowFilters(false)} className="min-h-11 rounded-xl bg-[#1e3a2b] px-4 text-xs font-semibold text-white">{t('shop.apply')} ({products.length})</button></div>
        <fieldset className="col-span-full border-t border-[var(--color-border)] pt-4">
          <legend className="mb-2.5 text-xs font-semibold text-[var(--color-text-primary)]" dir="auto">{t('filters.avoidAllergens')}</legend>
          <div className="flex flex-wrap gap-2">
            {ALLERGEN_FILTER_KEYS.map(key => {
              const active = filters.excludeAllergens.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleAllergen(key)}
                  className={`focus-ring min-h-[44px] min-w-[44px] rounded-full border px-4 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-[#1e3a2b] bg-[#1e3a2b] text-[#fff8e9] dark:border-[#c7982f] dark:bg-[#c7982f] dark:text-[#042821]'
                      : 'border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-text-primary)] hover:border-[#c7982f]'
                  }`}
                >
                  <span dir="auto">{t(`allergen.${key}`)}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-secondary)]" dir="auto">{t('filters.allergenNote')}</p>
        </fieldset>
      </div>
    </motion.div>}</AnimatePresence>
    {chips.length > 0 && <div className="mb-5 flex flex-wrap items-center gap-2">{chips.map(chip => <button key={chip.key} type="button" onClick={() => chip.onRemove ? chip.onRemove() : update({ [chip.key]: null })} aria-label={`${t('shop.remove')}: ${chip.label}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-[var(--color-border)] px-3 text-xs"><span className="truncate" dir="auto">{chip.label}</span><X size={13} className="shrink-0" /></button>)}<button type="button" onClick={clear} className="min-h-11 px-3 text-xs underline underline-offset-4">{t('shop.clear')}</button></div>}
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
    {catalogLoading && products.length === 0 && !filters.query ? <ShopCategorySkeleton gridOnly count={8} /> : products.length ? <div id="plp-products-grid" className={listView ? 'grid grid-cols-1 gap-4 md:grid-cols-2' : 'grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4'}>{products.slice(0, visibleCount).map((product, index) => {
      const disabled = new Set(product.variants?.filter(variant => variant.available === false).map(variant => variant.label) || []);
      const weights = Object.keys(product.prices).filter(weight => !disabled.has(weight) && Number.isFinite(product.prices[weight]) && product.prices[weight] > 0);
      const weight = weights.includes(sizes[product.id]) ? sizes[product.id] : initialCardPortion(product, weights);
      const saved = savedIds.includes(product.id);
      const unit = product.quoteOnly ? null : unitPrice(product.prices[weight], weight || '');
      const supportsBargain = product.isBidBox || product.category === 'gift-boxes' || product.category === 'bundles' || product.isBundle;
      return <React.Fragment key={product.id}>{category === 'all' && filters.sort === 'featured' && (index === 0 || products[index - 1].category !== product.category) && <h2 className="col-span-full mt-4 border-b border-[var(--color-border)] pb-3 font-serif text-xl sm:text-2xl text-[var(--color-text-primary)]">{categoryLabel(product.category)}</h2>}<article data-product-id={product.id} className={`table-catalog-card group relative flex min-w-0 cursor-pointer flex-col rounded-[16px] sm:rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface,#FFFCF7)] p-2.5 shadow-[0_4px_20px_-8px_rgba(4,40,33,0.08)] transition-colors duration-200 hover:border-[#C7982F]/55 motion-reduce:transition-none sm:p-4 ${listView ? "catalog-list-card" : ""}`} onClick={event => { if (!(event.target as HTMLElement).closest('a,button,input,select,textarea,[role="button"]')) navigate(`/product/${product.id}`); }}>
        <ProductImageGallery product={product} />
        <div className="flex items-center justify-between gap-1 pt-2 sm:pt-3"><span className="min-w-0 truncate text-[9px] font-medium uppercase tracking-[.1em] text-[var(--color-accent-text)]" dir="auto">{getLocalized(product, 'origin', language)}</span><button type="button" onClick={e => { e.stopPropagation(); setSaved(product.id, !saved); }} aria-label={saved ? t('shop.unsave') : t('shop.save')} aria-pressed={saved} className="flex h-11 w-11 -me-1.5 shrink-0 items-center justify-center rounded-full text-[var(--color-accent-text)] hover:bg-[#c7982f]/10"><Heart size={16} fill={saved ? 'currentColor' : 'none'} /></button></div>
        <Link to={`/product/${product.id}`} lang={language} dir="auto" className={`focus-ring mb-1.5 block min-w-0 max-w-full line-clamp-2 whitespace-normal break-words [overflow-wrap:anywhere] text-start font-medium ${language === 'ur' ? 'font-urdu text-[15px] sm:text-[20px] leading-[1.65]' : language === 'ar' ? 'font-arabic text-[16px] sm:text-[22px] leading-[1.45]' : 'font-serif text-[14px] sm:text-[20px] leading-[1.25]'}`}><span>{getLocalized(product, 'name', language)}</span></Link>
        <div className="mb-2 hidden sm:block"><Link to={`/product/${product.id}`} className="focus-ring inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent-text)] hover:underline"><span>{t('dest.common.viewDetails', 'View Details')}</span></Link></div>
        <div className="mt-auto">{product.quoteOnly ? <><p className="mb-2 sm:mb-4 line-clamp-2 text-[11px] sm:text-xs leading-5 sm:leading-6 text-[var(--color-text-secondary)]">{t('catalog.quoteCopy')}</p><button type="button" onClick={e => { e.stopPropagation(); openCustomQuoteModal({ productId: product.id, variantLabel: weight, mode: 'filled', quantity: 50 }); }} className="focus-ring flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1e3a2b] px-2 text-[11px] sm:text-xs font-semibold text-[#fff8e9] transition-colors hover:bg-[#092e23]">{t('catalog.requestQuote')}<ArrowUpRight size={14} /></button></> : <>{product.isBundle ? <div className="mb-2 sm:mb-3"><span className="inline-flex rounded-full border border-[var(--color-border-accent)] px-2 py-0.5 text-[9px] font-semibold text-[var(--color-accent-text)]">{t('catalog.bundle')}</span><p className="mt-1 hidden sm:block text-xs leading-6 text-[var(--color-text-secondary)]" dir="auto">{!readBundleFormat(product) && getLocalized(product, 'contents', language)}</p><div className="hidden sm:block"><BundleContentsSummary product={product} /></div></div> : <><label className="sr-only" htmlFor={`size-${product.id}`}>{t('shop.portion')}</label><select id={`size-${product.id}`} value={weight} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); setSizes(prev => ({ ...prev, [product.id]: e.target.value })); }} className="mb-2 sm:mb-3 min-h-[44px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 sm:px-3 text-xs">{weights.map(size => <option key={size} value={size}>{size}</option>)}</select></>}
          <div className="flex items-center justify-between gap-1.5 sm:block">
            <p className="min-w-0 sm:mb-3 font-serif text-sm sm:text-xl font-semibold leading-tight"><bdi className="block truncate">{weight ? `Rs. ${product.prices[weight].toLocaleString()}` : t('outOfStock')}</bdi>{unit && <small className="mt-0.5 hidden sm:block font-sans text-[10px] font-normal text-[var(--color-text-secondary)]"><bdi>Rs. {unit.amount.toLocaleString()} / {unit.unit}</bdi></small>}</p>
            <CartAddButton disabled={!weight} productId={product.id} portion={weight || ''} onAdd={() => { onAddToCart ? onAddToCart(product.id, weight) : addToCart(product, weight, 1); }} className="focus-ring flex min-h-11 min-w-11 shrink-0 sm:w-full items-center justify-center gap-1 sm:gap-2 rounded-xl bg-[#1e3a2b] px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold text-[#fff8e9] transition-colors hover:bg-[#092e23]">
              <span className="sm:hidden">{language === 'ur' ? 'شامل' : language === 'ar' ? 'أضف' : 'Add'}</span>
              <span className="hidden sm:inline">{t('addToCart')}</span>
            </CartAddButton>
          </div>
          {supportsBargain && <button type="button" onClick={e => { e.stopPropagation(); openCustomQuoteModal({ productId: product.id, variantLabel: weight, mode: weight?.startsWith('Empty') ? 'empty' : 'filled', quantity: 50 }); }} className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#c7982f]/50 bg-[#c7982f]/10 px-2 text-[11px] font-bold text-[var(--color-accent-text)] transition-colors hover:bg-[#c7982f]/20"><span className="sm:hidden">{t('catalog.requestQuote', 'Quote')}</span><span className="hidden sm:inline">Request Custom Quote / Bargain</span></button>}</>}
          <div className="mt-1.5 sm:mt-2 grid grid-cols-2 gap-1 sm:gap-2"><button type="button" aria-pressed={compareIds.includes(product.id)} aria-label={`${t(compareIds.includes(product.id) ? 'shop.compared' : 'shop.compareAdd')} (${compareIds.length}/3)`} onClick={e => { e.stopPropagation(); const added = toggleCompare(product.id); setCompareMessage(added ? t('shop.compareUpdated') : t('shop.compareFull')); }} className="focus-ring flex min-h-11 min-w-11 w-full items-center justify-center gap-1.5 rounded-xl text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-base)]"><Scale size={15} aria-hidden="true" /><span className="hidden sm:inline">{t(compareIds.includes(product.id) ? 'shop.compared' : 'shop.compareAdd')} ({compareIds.length}/3)</span></button>
          {onQuickView && <button type="button" aria-label={t('shop.quick')} onClick={e => { e.stopPropagation(); onQuickView(product); }} className="focus-ring flex min-h-11 min-w-11 w-full items-center justify-center gap-1.5 rounded-xl text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-base)] hover:text-[var(--color-accent-text)]"><Eye size={15} aria-hidden="true" /><span className="hidden sm:inline">{t('shop.quick')}</span></button>}</div>
        </div>
      </article></React.Fragment>;
    })}</div> : <div className="rounded-[22px] border border-[#C7982F]/35 bg-[var(--color-surface,#FFFCF7)] px-6 py-16 text-center shadow-[0_6px_24px_-10px_rgba(4,40,33,0.08)]"><div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#C7982F] bg-[#042821] p-3.5 shadow-[0_10px_26px_-10px_rgba(4,40,33,0.45)]"><AllBarkaCrestVector /></div><h2 className="font-serif text-3xl font-medium text-[var(--color-primary,#042821)] dark:text-[#FDFBF7]">{t('shop.empty')}</h2><p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-[var(--color-text-secondary)]">{occasion && occasion !== 'all' ? `No products currently match "${occasionTitle}" in this view. Browse all items or discover our signature collections.` : t('shop.emptyCopy')}</p><button type="button" onClick={() => { clear(); if (isModal) setModalCategory('all'); }} className="focus-ring mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#C7982F]/45 bg-[#042821] px-7 text-xs font-semibold text-[#FDFBF7] transition-colors hover:bg-[#08352B] cursor-pointer">{t('shop.clear')}<ArrowUpRight size={15} className="text-[#E4C783]" /></button></div>}
    {products.length > visibleCount && <div className="mt-8 text-center"><button type="button" onClick={() => setVisibleCount(count => count + 12)} className="focus-ring min-h-12 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-7 text-sm font-semibold">{t('shop.loadMore')} ({products.length - visibleCount})</button><p className="mt-3 text-xs text-[var(--color-text-secondary)]">{visibleCount} / {products.length}</p></div>}
    <CatalogTools mode="recent" />
  </section>;
}
