import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import { searchCatalog, startingPrice } from '../lib/catalogDiscovery';
import { getLocalized } from '../utils/localize';
import VoiceInputButton from './VoiceInputButton';

interface HeaderSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  restoreFocusTo?: HTMLElement | null;
}

export default function HeaderSearchPanel({
  isOpen,
  onClose,
  restoreFocusTo,
}: HeaderSearchPanelProps) {
  const products = useCatalogProducts();
  const { t, language, isRtl } = useLanguage();
  const mediaCover = useProductMediaCover();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [listOpen, setListOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingFocusDirRef = useRef<'first' | 'last' | null>(null);

  const suggestions = useMemo(
    () => (query.trim() ? searchCatalog(products, query).slice(0, 6) : []),
    [products, query],
  );

  const showDropdown = Boolean(query.trim()) && listOpen;

  useLayoutEffect(() => {
    if (!showDropdown || !pendingFocusDirRef.current) return;
    const dir = pendingFocusDirRef.current;
    pendingFocusDirRef.current = null;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('.boutique-suggestion') || []);
    if (items.length > 0) {
      (dir === 'first' ? items[0] : items[items.length - 1]).focus();
    }
  }, [showDropdown]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (showDropdown) {
          setListOpen(false);
          inputRef.current?.focus();
          return;
        }
        onClose();
        restoreFocusTo?.focus();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!query.trim()) return;
        const container = panelRef.current;
        if (!container) return;
        if (!listOpen) {
          event.preventDefault();
          pendingFocusDirRef.current = event.key === 'ArrowDown' ? 'first' : 'last';
          setListOpen(true);
          return;
        }
        pendingFocusDirRef.current = null;
        const items = Array.from(container.querySelectorAll<HTMLElement>('.boutique-suggestion'));
        if (items.length === 0) return;
        event.preventDefault();
        const activeIndex = items.indexOf(document.activeElement as HTMLElement);
        if (event.key === 'ArrowDown') {
          items[activeIndex === -1 ? 0 : (activeIndex + 1) % items.length].focus();
        } else {
          items[activeIndex <= 0 ? items.length - 1 : activeIndex - 1].focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, listOpen, onClose, query, restoreFocusTo, showDropdown]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    onClose();
    navigate(trimmed ? `/shop?search=${encodeURIComponent(trimmed)}` : '/shop');
  };

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label={t('nav.search', 'Search catalogue')}
      data-testid="header-search-panel"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="border-b border-[#C7982F]/25 bg-[#FFFCF7] dark:bg-[#121615] shadow-md"
    >
      <div className="mx-auto max-w-4xl px-4 py-3.5 sm:px-6">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex min-w-0 flex-1 items-center">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute start-3.5 text-[#806326] dark:text-[#E4C783]"
            />
            <label htmlFor="header-search-input" className="sr-only">
              {t('heroSearchLabel', 'Search dry fruits, dates, saffron or gifts')}
            </label>
            <input
              ref={inputRef}
              id="header-search-input"
              type="search"
              value={query}
              aria-expanded={showDropdown}
              aria-autocomplete="list"
              onChange={(event) => {
                setQuery(event.target.value);
                setListOpen(true);
              }}
              placeholder={t('heroSearchLabel', 'Search badam, khajoor, pista, saffron or gift boxes…')}
              dir="auto"
              className="min-h-[44px] w-full rounded-full border border-[var(--color-border)] bg-[var(--color-base)] ps-10 pe-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[#C7982F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7982F]/40"
            />
          </div>

          <VoiceInputButton
            onTranscript={(text) => {
              setQuery(text);
              setListOpen(true);
              inputRef.current?.focus();
            }}
          />

          <button
            type="submit"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-[#1E3A2B] px-4 text-xs font-semibold text-[#FDFBF7] transition-colors hover:bg-[#042821] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F]"
          >
            <span className="hidden sm:inline">{t('shop.search', 'Search')}</span>
            <ArrowRight size={15} className="rtl-flip sm:ms-1" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              restoreFocusTo?.focus();
            }}
            aria-label={t('close', 'Close search')}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-[#C7982F] hover:text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7982F]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </form>

        {showDropdown && (
          <div
            role="listbox"
            aria-label={t('boutique.suggestions', 'Suggestions')}
            className="mt-3 divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            {suggestions.length > 0 ? (
              <>
                {suggestions.map((product) => {
                  const name = getLocalized(product, 'name', language);
                  const price = startingPrice(product);
                  return (
                    <Link
                      key={product.id}
                      role="option"
                      aria-selected={false}
                      to={`/product/${product.id}`}
                      onClick={onClose}
                      className="boutique-suggestion flex min-h-[52px] items-center gap-3 px-3.5 py-2 transition-colors hover:bg-[var(--color-base)] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#C7982F]"
                    >
                      <img
                        src={mediaCover(product)}
                        alt=""
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="h-10 w-10 shrink-0 rounded-lg object-cover bg-[#F2ECE2]"
                      />
                      <span className="min-w-0 flex-1">
                        <strong dir="auto" className="block truncate text-sm font-medium text-[var(--color-text-primary)]">
                          {name}
                        </strong>
                        <small dir="auto" className="block text-[11px] text-[var(--color-text-secondary)]">
                          {getLocalized(product, 'origin', language)}
                        </small>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-[var(--color-text-primary)]">
                        {product.quoteOnly ? (
                          t('catalog.requestQuote', 'Quote')
                        ) : (
                          <bdi dir="ltr">Rs. {price.toLocaleString()}</bdi>
                        )}
                      </span>
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = query.trim();
                    onClose();
                    navigate(`/shop?search=${encodeURIComponent(trimmed)}`);
                  }}
                  className="flex min-h-[44px] w-full items-center justify-center gap-1.5 bg-[var(--color-base)] px-4 text-xs font-semibold text-[var(--color-accent-text)] hover:underline"
                >
                  <span>{t('boutique.allResults', 'View all results')}</span>
                  <ArrowRight size={14} className="rtl-flip" aria-hidden="true" />
                </button>
              </>
            ) : (
              <p className="boutique-search-empty px-4 py-4 text-center text-xs text-[var(--color-text-secondary)]">
                {t('boutique.noResults', 'No matching products found.')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
