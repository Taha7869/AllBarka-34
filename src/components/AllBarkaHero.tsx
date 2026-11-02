import {useStorefrontContent} from '../contexts/StorefrontContentContext';
import {contentText} from '../lib/storefrontContent';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { searchCatalog, startingPrice } from '../lib/catalogDiscovery';
import React, { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { AllBarkaCrestVector } from './AllBarkaLogo';
import CategoryQuickPills from './CategoryQuickPills';
import PlaceholdersAndVanishInput from './ui/placeholders-and-vanish-input';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { getLocalized } from '../utils/localize';
import { openMehmaanPlannerModal } from './MehmaanTablePlannerModal';
import { openShopTheTableModal } from './ShopTheTableModal';
import { Sparkles, Eye } from 'lucide-react';
const SelectionGuide = lazy(() => import('./SelectionGuide'));

interface AllBarkaHeroProps {
  onOpenCart?: () => void;
  onSearch?: (query: string) => void;
  onSelectCategory?: (category: string, query?: string) => void;
}

export function AllBarkaHero({ onSearch, onSelectCategory }: AllBarkaHeroProps = {}) {
  const PRODUCTS = useCatalogProducts();
  const {hero}=useStorefrontContent();
  const { t, language, isRtl } = useLanguage();
  const mediaCover = useProductMediaCover();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState('all');
  const [guideOpen, setGuideOpen] = useState(false);
  const guideOpener = useRef<HTMLButtonElement>(null);
  const suggestions = useMemo(() => query.trim() ? searchCatalog(PRODUCTS, query).slice(0, 5) : [], [query, PRODUCTS]);

  const placeholders = [
    t('searchPlaceholder1'),
    t('searchPlaceholder2'),
    t('searchPlaceholder3'),
    t('searchPlaceholder4'),
  ];

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim()) onSearch?.(query.trim());
  };

  return (
    <>
    <section className="heritage-hero" dir={isRtl ? 'rtl' : 'ltr'} aria-labelledby="table-hero-title">
      <div className="heritage-hero-content">
        <p className="table-eyebrow"><span aria-hidden="true">✦</span>{t('table.eyebrow')}</p>
        <h1 id="table-hero-title" className="heritage-hero-title" dir="auto">
          {hero.enabled ? contentText(hero.heading, language) : t('table.heading')}{' '}
          <em>{hero.enabled ? contentText(hero.accent, language) : t('table.accent')}</em>
        </h1>
        <p className="heritage-hero-description" dir="auto">{hero.enabled ? contentText(hero.description, language) : t('table.description')}</p>
        <div className="table-hero-actions">
          <Link to={hero.enabled ? hero.primaryPath : '/shop/dry-fruits'} className="table-hero-primary focus-ring">
            {hero.enabled ? contentText(hero.primaryLabel, language) : t('hero.shopDryFruits')}
            <ArrowRight size={16} className="rtl-flip" aria-hidden="true" />
          </Link>
          <Link to={hero.enabled ? hero.secondaryPath : '/gifting'} className="table-hero-secondary focus-ring">
            {hero.enabled ? contentText(hero.secondaryLabel, language) : t('hero.exploreGifts')}
            <ArrowRight size={16} className="rtl-flip" aria-hidden="true" />
          </Link>
        </div>
        <p className="table-hero-note">{t('table.note')}</p>
      </div>
      <div className={`table-hero-art${hero.enabled ? ' table-hero-art-custom' : ''}`}>
        {!hero.enabled && <div className="table-hero-crest" aria-hidden="true"><AllBarkaCrestVector /></div>}
        <figure className="table-pantry-figure">
          <div className="table-photo-frame">
            <span className="table-photo-fallback" aria-hidden="true">{t('table.eyebrow')}</span>
            <picture className="heritage-hero-background" key={`${hero.enabled}-${hero.image}-${hero.mobileImage}`}>
              <source media="(max-width: 767px)" srcSet={hero.enabled ? hero.mobileImage : '/images/dryfruit_flatlay_hero_mobile.webp'} />
              <img src={hero.enabled ? hero.image : '/images/dryfruit_flatlay_hero.webp'} width={1400} height={781} alt="" fetchPriority="high" onLoad={event => { event.currentTarget.style.visibility = 'visible'; }} onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
            </picture>
          </div>
          {!hero.enabled && <figcaption>{t('table.pantryCaption')}</figcaption>}
        </figure>
        {!hero.enabled && <figure className="table-gift-figure">
          <div className="table-photo-frame">
            <img src="/images/generated/gift-box-1.webp" width={640} height={640} alt="" decoding="async" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
          </div>
          <figcaption>{t('table.giftCaption')}</figcaption>
        </figure>}
      </div>
    </section>
    <section className="table-discovery" dir={isRtl ? 'rtl' : 'ltr'} aria-labelledby="table-discovery-title">
      <div className="table-discovery-top">
        <h2 id="table-discovery-title">{t('table.discovery')}</h2>
        <div
          className="heritage-hero-search-wrap"
          onFocusCapture={() => setSearchOpen(true)}
          onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false);
          }}
          onKeyDownCapture={event => {
            if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.querySelector('input')?.focus(); setSearchOpen(false); }
            if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
              if (!searchOpen) { setSearchOpen(true); event.preventDefault(); return; }
              const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('.boutique-suggestion'));
              const index = links.indexOf(event.target as HTMLAnchorElement);
              event.preventDefault();
              if (event.key === 'ArrowUp' && index === 0) event.currentTarget.querySelector('input')?.focus();
              else links[index === -1 ? (event.key === 'ArrowDown' ? 0 : links.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus();
            }
          }}
        >
          <PlaceholdersAndVanishInput
            id="hero-search-input"
            label={t('heroSearchLabel')}
            placeholder={t('heroSearchLabel')}
            placeholders={placeholders}
            value={query}
            onChange={event => { setQuery(event.target.value); setSearchOpen(true); }}
            onSubmit={submitSearch}
            suggestionsId="hero-search-suggestions"
            suggestionsOpen={searchOpen && !!query.trim()}
          />
          {searchOpen && query.trim() && (
            <div id="hero-search-suggestions" className="boutique-search-suggestions heritage-hero-suggestions" role="listbox" aria-label={t('boutique.suggestions')}>
              {suggestions.length ? suggestions.map(product => (
                <Link
                  key={product.id}
                  role="option"
                  aria-selected={false}
                  to={`/product/${product.id}`}
                  className="boutique-suggestion"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => setSearchOpen(false)}
                >
                  <img src={mediaCover(product)} alt="" loading="lazy" />
                  <span><strong>{getLocalized(product, 'name', language)}</strong><small>{getLocalized(product, 'category', language)}</small></span>
                  {product.quoteOnly ? <span>{t('catalog.requestQuote')}</span> : <bdi dir="ltr">Rs. {startingPrice(product).toLocaleString()}</bdi>}
                </Link>
              )) : <p className="boutique-search-empty">{t('boutique.noResults')}</p>}
              <button type="button" className="boutique-search-all" onClick={() => onSearch?.(query.trim())}>
                {t('boutique.allResults')} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button ref={guideOpener} type="button" className="heritage-hero-guide focus-ring" onClick={() => setGuideOpen(true)} aria-haspopup="dialog"><Compass size={18} aria-hidden="true" />{t('guide.launch')}<ArrowRight size={14} className="rtl-flip" aria-hidden="true" /></button>
          <button type="button" className="heritage-hero-mehmaan focus-ring inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#FAF9F5]/90 dark:bg-zinc-800/90 text-[#043327] dark:text-emerald-300 border border-[#D4AF37]/40 hover:bg-[#FAF9F5] transition-all shadow-xs" onClick={() => openMehmaanPlannerModal()} aria-haspopup="dialog"><Sparkles size={14} aria-hidden="true" />{t('mehmaan.cta', 'Plan Mehmaan Table')}</button>
          <button type="button" className="heritage-hero-table-scene focus-ring inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#FAF9F5]/90 dark:bg-zinc-800/90 text-[#043327] dark:text-emerald-300 border border-[#D4AF37]/40 hover:bg-[#FAF9F5] transition-all shadow-xs" onClick={() => openShopTheTableModal()} aria-haspopup="dialog"><Eye size={14} aria-hidden="true" />{t('table.cta', 'Shop Table Scene')}</button>
        </div>
      </div>
        <div className="heritage-hero-pills">
          <CategoryQuickPills variant="editorial" selectedId={selected} onSelectCategory={item => {
            setSelected(item.id);
            if (item.categoryFilter) onSelectCategory?.(item.categoryFilter, item.searchTerm);
          }} />
        </div>
      {guideOpen && <Suspense fallback={<p className="heritage-hero-guide-loading" role="status">{t('guide.loading')}</p>}><SelectionGuide opener={guideOpener.current} onClose={() => setGuideOpen(false)} /></Suspense>}
    </section>
    </>
  );
}

export default AllBarkaHero;
