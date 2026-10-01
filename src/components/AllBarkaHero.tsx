import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Languages, ArrowRight } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { AllBarkaFullLogo } from './AllBarkaLogo';
import CategoryQuickPills from './CategoryQuickPills';
import PlaceholdersAndVanishInput from './ui/placeholders-and-vanish-input';
import { PRODUCTS, getProductImage } from '../data/products';
import { getLocalized } from '../utils/localize';
import './AllBarkaHero.css';

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
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState('all');
  const suggestions = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return PRODUCTS.filter(product =>
      [product.name_en, product.name_ur, product.name_ar, product.category, ...product.keywords]
        .some(value => value?.toLocaleLowerCase().includes(term))
    ).slice(0, 5);
  }, [query]);

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
          <em>{t('heroHeadlinePart2')}</em>
        </h1>
        <p className="heritage-hero-description">{t('heroSubtitle')}</p>

        <div
          className="heritage-hero-search-wrap"
          onFocusCapture={() => setSearchOpen(true)}
          onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSearchOpen(false);
          }}
          onKeyDownCapture={event => {
            if (event.key === 'Escape') setSearchOpen(false);
            if (event.key === 'ArrowDown' && suggestions.length && event.target instanceof HTMLInputElement) {
              event.preventDefault();
              event.currentTarget.querySelector<HTMLAnchorElement>('.boutique-suggestion')?.focus();
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
                  <img src={getProductImage(product)} alt="" loading="lazy" />
                  <span><strong>{getLocalized(product, 'name', language)}</strong><small>{getLocalized(product, 'category', language)}</small></span>
                  <bdi dir="ltr">Rs. {Object.values(product.prices)[0]?.toLocaleString()}</bdi>
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
      </div>
    </section>
  );
}

export default AllBarkaHero;
