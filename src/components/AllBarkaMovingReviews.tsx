"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, CircleCheck } from "lucide-react";
import PeekRating from './PeekRating';
import { InfiniteMovingCards, MovingReviewItem } from "./ui/infinite-moving-cards";
import { useLanguage } from "../contexts/LanguageContext";
import { usePublishedReviews } from "../contexts/StorefrontContentContext";
import { sanitizePublishedReviews, type PublishedPatronReview } from "../lib/publishedReviews";

export interface AllBarkaMovingReviewsProps {
  reviews?: PublishedPatronReview[];
}

export function AllBarkaMovingReviews({ reviews: propReviews }: AllBarkaMovingReviewsProps = {}) {
  const { t, language } = useLanguage();
  const publishedReviews = usePublishedReviews();
  const items = sanitizePublishedReviews(propReviews ?? publishedReviews);

  // Never render hardcoded testimonials; return null until real order reviews are published by admin.
  if (items.length === 0) {
    return null;
  }

  const average = items.reduce((sum, review) => sum + review.rating, 0) / items.length;

  const marqueeItems: MovingReviewItem[] = items.map((rev) => ({
    id: rev.id,
    quote: rev.review,
    headline: rev.headline,
    name: language === 'ur' ? rev.name_ur : language === 'ar' ? rev.name_ar : rev.name_en,
    title: rev.location,
    location: rev.location,
    rating: rev.rating,
    purchasedItem: rev.purchasedItem,
    avatarInitials: rev.avatarInitials,
  }));

  return (
    <section id="about" className="w-full max-w-full min-w-0 py-20 sm:py-24 bg-[var(--color-base)] text-[var(--color-ink)] relative overflow-hidden select-none border-t border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10 sm:space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-gold)]/50 text-[var(--color-accent-text,#806326)] text-[11px] font-semibold">
            <CheckCircle2 size={12} className="text-[#C7982F]" aria-hidden="true" />
            <span>{t('verifiedReviews', 'Store-published feedback')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-semibold tracking-tight text-[var(--color-ink)]">
            {t('whatCustomersSay', 'What Our Customers Say')}
          </h2>

          <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] leading-relaxed font-medium">
            {t('reviewsDesc')}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink)]">
              <PeekRating value={average} size={12} className="text-[#C7982F]" />
              <span className="text-[var(--color-ink-muted)] text-[11px] font-semibold">• {items.length} {t('shop.reviewCount', 'published reviews')}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-muted)] text-[11px] font-semibold">
              <ShieldCheck size={12} className="text-[#C7982F]" aria-hidden="true" />
              <span>{t('airtightJars')}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-muted)] text-[11px] font-semibold">
              <CircleCheck size={12} className="text-[#C7982F]" aria-hidden="true" />
              <span>{t('codLahore', 'Cash on Delivery across Lahore')}</span>
            </div>
          </div>
        </div>

        <div className="w-full relative overflow-hidden py-2">
          <InfiniteMovingCards items={marqueeItems} direction="left" speed="slow" pauseOnHover={true} />
        </div>
      </div>
    </section>
  );
}

export default AllBarkaMovingReviews;
