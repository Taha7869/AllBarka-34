import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { usePublishedReviews } from '../contexts/StorefrontContentContext';
import { sanitizePublishedReviews, type PublishedPatronReview } from '../lib/publishedReviews';
import { MOTION_STAGGER, revealStyle, useRevealOnce } from '../lib/motion';

const VOICES_COPY: Record<
  LanguageCode,
  {
    eyebrow: string;
    heading: string;
    note: string;
    ourStory: string;
    faq: string;
  }
> = {
  en: {
    eyebrow: 'Patron voices',
    heading: 'Notes from households we serve.',
    note: 'Store-published patron feedback from Lahore and nationwide orders.',
    ourStory: 'Our Story',
    faq: 'Frequently Asked Questions',
  },
  ur: {
    eyebrow: 'صارفین کی آراء',
    heading: 'ہمارے معزز صارفین کے تاثرات۔',
    note: 'لاہور اور ملک بھر کے آرڈرز سے منتخب تاثرات۔',
    ourStory: 'ہماری کہانی',
    faq: 'عمومی سوالات',
  },
  ar: {
    eyebrow: 'آراء العملاء',
    heading: 'انطباعات العائلات التي نخدمها.',
    note: 'آراء مختارة من عملائنا في لاهور ومختلف مدن باكستان.',
    ourStory: 'قصتنا',
    faq: 'الأسئلة الشائعة',
  },
};

export interface PatronVoicesSectionProps {
  reviews?: PublishedPatronReview[];
}

export default function PatronVoicesSection({ reviews: propReviews }: PatronVoicesSectionProps = {}) {
  const { language, isRtl } = useLanguage();
  const publishedReviews = usePublishedReviews();
  const { ref: sectionRef, visible, reducedMotion } = useRevealOnce<HTMLElement>();
  const featuredReviews = sanitizePublishedReviews(propReviews ?? publishedReviews).slice(0, 3);

  // Never render hardcoded placeholder testimonials; omit section cleanly when no admin-published order reviews exist.
  if (featuredReviews.length === 0) {
    return null;
  }

  const copy = VOICES_COPY[language] || VOICES_COPY.en;

  return (
    <section
      ref={sectionRef}
      id="about"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-labelledby="patron-voices-heading"
      data-testid="patron-voices-section"
      className="w-full border-t border-[var(--color-border)] bg-[var(--color-base,#FDFBF7)] py-14 sm:py-20 text-[var(--color-text-primary,#29231D)]"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div
          style={revealStyle(visible, reducedMotion, 0)}
          className="mb-8 flex flex-col items-start justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end"
        >
          <div>
            <p dir="auto" className="text-xs sm:text-[13px] font-medium text-[var(--color-accent-text,#806326)]">
              {copy.eyebrow}
            </p>
            <h2
              id="patron-voices-heading"
              lang={language}
              dir="auto"
              className={`mt-2 font-serif text-2xl sm:text-4xl font-semibold text-[var(--color-text-primary,#29231D)] ${
                language === 'ur' ? 'font-urdu leading-[1.9]' : language === 'ar' ? 'font-arabic leading-[1.5]' : 'leading-[1.15] tracking-[-0.015em]'
              }`}
            >
              {copy.heading}
            </h2>
            <p dir="auto" className="mt-2 text-xs text-[var(--color-text-secondary,#635B52)]">
              {copy.note}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/story"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[var(--color-accent-text,#806326)] underline underline-offset-4 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C7982F]"
            >
              <span dir="auto">{copy.ourStory}</span>
              <ArrowRight size={14} className="rtl-flip" aria-hidden="true" />
            </Link>
            <Link
              to="/faq"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-[var(--color-accent-text,#806326)] underline underline-offset-4 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C7982F]"
            >
              <span dir="auto">{copy.faq}</span>
              <ArrowRight size={14} className="rtl-flip" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 sm:gap-6">
          {featuredReviews.map((review, idx) => {
            const displayName =
              language === 'ur' ? review.name_ur : language === 'ar' ? review.name_ar : review.name_en;
            return (
              <figure
                key={review.id}
                style={revealStyle(visible, reducedMotion, (idx + 1) * MOTION_STAGGER.cardsMs)}
                className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#FFFCF7)] p-6"
              >
                <blockquote dir="auto" className="font-serif text-base leading-relaxed text-[var(--color-text-primary,#29231D)]">
                  “{review.review}”
                </blockquote>

                <figcaption className="mt-5 border-t border-[var(--color-border)] pt-4 text-xs">
                  <span dir="auto" className="block font-semibold text-[var(--color-text-primary,#29231D)]">
                    {displayName}
                  </span>
                  {(review.location || review.purchasedItem) && (
                    <span dir="auto" className="mt-0.5 block text-[var(--color-text-secondary,#635B52)]">
                      {review.location}
                      {review.location && review.purchasedItem ? ' · ' : ''}
                      {review.purchasedItem}
                    </span>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
