import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LOADING_COPY = {
  en: { shop: 'Loading collection…', product: 'Loading product details…', page: 'Loading AllBarka…' },
  ur: { shop: 'مجموعہ لوڈ ہو رہا ہے…', product: 'مصنوعات کی تفصیل لوڈ ہو رہی ہے…', page: 'البرکہ لوڈ ہو رہا ہے…' },
  ar: { shop: 'جاري تحميل التشكيلة…', product: 'جاري تحميل تفاصيل المنتج…', page: 'جاري تحميل البركة…' },
} as const;

function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="h-5 w-20 rounded-full bg-[var(--color-border)]/70 motion-safe:animate-pulse" />
        <div className="h-9 w-9 rounded-full bg-[var(--color-border)]/60 motion-safe:animate-pulse" />
      </div>
      <div className="mb-4 aspect-square w-full rounded-2xl bg-[var(--color-border)]/60 motion-safe:animate-pulse" />
      <div className="mb-2 h-5 w-4/5 rounded-md bg-[var(--color-border)]/75 motion-safe:animate-pulse" />
      <div className="mb-4 h-3.5 w-3/5 rounded-md bg-[var(--color-border)]/55 motion-safe:animate-pulse" />
      <div className="mb-4 flex gap-2">
        <div className="h-9 w-16 rounded-full bg-[var(--color-border)]/60 motion-safe:animate-pulse" />
        <div className="h-9 w-16 rounded-full bg-[var(--color-border)]/50 motion-safe:animate-pulse" />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
        <div className="h-6 w-24 rounded-md bg-[var(--color-border)]/75 motion-safe:animate-pulse" />
        <div className="h-11 w-28 rounded-xl bg-[var(--color-border)]/70 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

export function ShopCategorySkeleton({ gridOnly = false, count = 8 }: { gridOnly?: boolean; count?: number }) {
  const { language, isRtl } = useLanguage();
  const label = LOADING_COPY[language]?.shop || LOADING_COPY.en.shop;

  const grid = (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6">
      {Array.from({ length: count }, (_, idx) => (
        <ProductCardSkeleton key={idx} />
      ))}
    </div>
  );

  if (gridOnly) {
    return (
      <div role="status" aria-busy="true" aria-live="polite" dir={isRtl ? 'rtl' : 'ltr'} data-skeleton="shop-grid" className="w-full">
        <span className="sr-only">{label}</span>
        {grid}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      dir={isRtl ? 'rtl' : 'ltr'}
      data-skeleton="shop-page"
      className="min-h-screen w-full bg-[var(--color-base,#F6F1EA)] pt-6 pb-20"
    >
      <span className="sr-only">{label}</span>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div
          aria-hidden="true"
          className="h-48 sm:h-60 w-full rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-10 flex flex-col justify-end gap-3"
        >
          <div className="h-3 w-32 rounded-full bg-[var(--color-border)]/70 motion-safe:animate-pulse" />
          <div className="h-9 sm:h-12 w-2/3 max-w-md rounded-xl bg-[var(--color-border)]/80 motion-safe:animate-pulse" />
          <div className="h-4 w-3/4 max-w-lg rounded-md bg-[var(--color-border)]/55 motion-safe:animate-pulse" />
        </div>
        <div aria-hidden="true" className="flex gap-2 overflow-hidden pb-1">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-11 w-28 shrink-0 rounded-full bg-[var(--color-border)]/65 motion-safe:animate-pulse" />
          ))}
        </div>
        {grid}
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  const { language, isRtl } = useLanguage();
  const label = LOADING_COPY[language]?.product || LOADING_COPY.en.product;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      dir={isRtl ? 'rtl' : 'ltr'}
      data-skeleton="product-detail"
      className="min-h-screen w-full bg-[var(--color-base,#F6F1EA)] pt-6 sm:pt-10 pb-24"
    >
      <span className="sr-only">{label}</span>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div aria-hidden="true" className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14 items-start">
          <div className="flex flex-col gap-3">
            <div className="aspect-square w-full rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] motion-safe:animate-pulse" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }, (_, idx) => (
                <div key={idx} className="h-16 w-16 rounded-xl bg-[var(--color-border)]/65 motion-safe:animate-pulse" />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4 pt-2">
            <div className="h-4 w-36 rounded-full bg-[var(--color-border)]/70 motion-safe:animate-pulse" />
            <div className="h-10 w-4/5 rounded-xl bg-[var(--color-border)]/80 motion-safe:animate-pulse" />
            <div className="h-4 w-full rounded-md bg-[var(--color-border)]/55 motion-safe:animate-pulse" />
            <div className="h-4 w-5/6 rounded-md bg-[var(--color-border)]/55 motion-safe:animate-pulse" />
            <div className="mt-2 h-8 w-40 rounded-lg bg-[var(--color-border)]/75 motion-safe:animate-pulse" />
            <div className="flex flex-wrap gap-2 pt-2">
              {Array.from({ length: 4 }, (_, idx) => (
                <div key={idx} className="h-11 w-24 rounded-xl bg-[var(--color-border)]/65 motion-safe:animate-pulse" />
              ))}
            </div>
            <div className="mt-4 h-14 w-full rounded-2xl bg-[var(--color-border)]/80 motion-safe:animate-pulse" />
            <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-6">
              <div className="h-12 w-full rounded-xl bg-[var(--color-border)]/55 motion-safe:animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-[var(--color-border)]/50 motion-safe:animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RouteLoadingSkeleton({ pathname }: { pathname: string }) {
  const { language, isRtl } = useLanguage();
  const normalized = (pathname || '/').toLowerCase();

  if (
    normalized === '/shop' ||
    normalized.startsWith('/shop/') ||
    normalized.startsWith('/category/') ||
    normalized.startsWith('/gifting') ||
    normalized.startsWith('/wholesale')
  ) {
    return <ShopCategorySkeleton />;
  }

  if (normalized.startsWith('/product/')) {
    return <ProductDetailSkeleton />;
  }

  const label = LOADING_COPY[language]?.page || LOADING_COPY.en.page;
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      dir={isRtl ? 'rtl' : 'ltr'}
      data-skeleton="route-page"
      className="min-h-screen w-full bg-[var(--color-base,#F6F1EA)] py-10"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="h-10 w-2/3 max-w-md rounded-xl bg-[var(--color-border)]/75 motion-safe:animate-pulse" />
        <div className="h-44 w-full rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] motion-safe:animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-32 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] motion-safe:animate-pulse" />
          <div className="h-32 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}
