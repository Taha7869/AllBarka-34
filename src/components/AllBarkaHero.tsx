import { searchCatalog, startingPrice } from '../lib/catalogDiscovery';
import React, { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Languages, ArrowRight, Compass, ArrowDown } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { AllBarkaFullLogo } from './AllBarkaLogo';
import CategoryQuickPills from './CategoryQuickPills';
import GradientText from './GradientText';
import PlaceholdersAndVanishInput from './ui/placeholders-and-vanish-input';
import { PRODUCTS } from '../data/products';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { getLocalized } from '../utils/localize';
import './AllBarkaHero.css';

const SelectionGuide = lazy(() => import('./SelectionGuide'));

interface AllBarkaHeroProps {
  onOpenCart?: () => void;
  onSearch?: (query: string) => void;
  onSelectCategory?: (category: string, query?: string) => void;
}

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'اردو' },
  { code: 'ar', label: 'العربية' },
];

export function AllBarkaHero({ onSearch, onSelectCategory }: AllBarkaHeroProps = {}) {
  const { t, language, isRtl, setLanguage } = useLanguage();
  const mediaCover = useProductMediaCover();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState('all');
  const [guideOpen, setGuideOpen] = useState(false);
  const guideOpener = useRef<HTMLButtonElement>(null);
  const suggestions = useMemo(() => query.trim() ? searchCatalog(PRODUCTS, query).slice(0, 5) : [], [query]);

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
    <section className="heritage-hero" dir={isRtl ? 'rtl' : 'ltr'} aria-label="AllBarka boutique">
      <picture className="heritage-hero-background" aria-hidden="true">
        <source media="(max-width: 767px)" srcSet="/images/generated/hero-dry-fruits-mobile-v1.webp" type="image/webp" />
        <img src="/images/generated/hero-dry-fruits-wide-v1.webp" width={1920} height={1080} alt="" fetchPriority="high" />
      </picture>
      <div className="heritage-hero-wash" aria-hidden="true" />

      <div className="heritage-hero-language" role="group" aria-label={t('nav.language')}>
        <Languages size={15} aria-hidden="true" />
        {LANGUAGES.map(item => (
          <button
            key={item.code}
            type="button"
            lang={item.code}
            dir={item.code === 'en' ? 'ltr' : 'rtl'}
            aria-pressed={language === item.code}
            onClick={() => setLanguage(item.code)}
            className="heritage-hero-language-button focus-ring"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="heritage-hero-content">
        <AllBarkaFullLogo size="md" variant="light" as="span" className="heritage-hero-brand" />
        <h1 className="heritage-hero-title">
          {t('heroHeadlinePart1')}{' '}
          <em><GradientText colors={['#e4c783', '#fff0bd', '#d7b263', '#fff0bd', '#e4c783']} animationSpeed={12}>{t('heroHeadlinePart2')}</GradientText></em>
        </h1>
        <p className="heritage-hero-description">{t('heroSubtitle')}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/shop" className="focus-ring inline-flex min-h-12 items-center gap-3 rounded-full bg-[#e4c783] px-7 text-xs font-semibold text-[#092e23] transition-colors hover:bg-[#f1dca9]">{t('boutique.shop')}<ArrowRight size={16} /></Link>
          <Link to="/gifting" className="focus-ring inline-flex min-h-12 items-center gap-3 rounded-full border border-[#e4c783]/50 px-6 text-xs font-semibold text-[#fff8e9] transition-colors hover:bg-white/10">{t('boutique.gifting')}</Link>
        </div>

        <div
          className="heritage-hero-search-wrap"
          onFocusCapture={() => setSearchOpen(true)}
          onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false);
          }}
          onKeyDownCapture={event => {
            if (event.key === 'Escape') setSearchOpen(false);
            if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
              const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('.boutique-suggestion'));
              const index = links.indexOf(event.target as HTMLAnchorElement);
              event.preventDefault();
              if (event.key === 'ArrowUp' && index === 0) event.currentTarget.querySelector('input')?.focus();
              else links[(index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus();
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
                  <bdi dir="ltr">Rs. {startingPrice(product).toLocaleString()}</bdi>
                </Link>
              )) : <p className="boutique-search-empty">{t('boutique.noResults')}</p>}
              <button type="button" className="boutique-search-all" onClick={() => onSearch?.(query.trim())}>
                {t('boutique.allResults')} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <div className="heritage-hero-pills">
          <CategoryQuickPills selectedId={selected} onSelectCategory={item => {
            setSelected(item.id);
            if (item.categoryFilter) onSelectCategory?.(item.categoryFilter, item.searchTerm);
          }} />
        </div>
        <button ref={guideOpener} type="button" className="heritage-hero-guide focus-ring" onClick={() => setGuideOpen(true)} aria-haspopup="dialog"><Compass size={15} aria-hidden="true" />{t('guide.launch')}<ArrowRight size={14} aria-hidden="true" /></button>
        <a href="#allbarka-pantry" className="heritage-hero-scroll focus-ring" aria-label={t('home.scroll')}><ArrowDown size={18} aria-hidden="true" /></a>
      </div>
      {guideOpen && <Suspense fallback={<p className="heritage-hero-guide-loading" role="status">{t('guide.loading')}</p>}><SelectionGuide opener={guideOpener.current} onClose={() => setGuideOpen(false)} /></Suspense>}
    </section>
  );
}

export default AllBarkaHero;
