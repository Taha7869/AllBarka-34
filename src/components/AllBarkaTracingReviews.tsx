"use client";
import React from "react";
import { TracingBeam } from "./ui/tracing-beam";
import { Star } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { usePublishedReviews } from "../contexts/StorefrontContentContext";
import { sanitizePublishedReviews, type PublishedPatronReview } from "../lib/publishedReviews";

export interface AllBarkaTracingReviewsProps {
  reviews?: PublishedPatronReview[];
}

export function AllBarkaTracingReviews({ reviews: propReviews }: AllBarkaTracingReviewsProps = {}) {
  const { language, t, isRtl } = useLanguage();
  const publishedReviews = usePublishedReviews();
  const items = sanitizePublishedReviews(propReviews ?? publishedReviews);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      data-testid="tracing-reviews"
      className="bg-[var(--color-base,#FDFBF7)] w-full rounded-3xl p-4 md:p-8 select-none"
    >
      <TracingBeam className="px-4 md:px-6 space-y-12">
        <div className="max-w-3xl mx-auto antialiased pt-4 relative">
          {items.map((item) => {
            const displayName =
              language === "ur" ? item.name_ur : language === "ar" ? item.name_ar : item.name_en;
            return (
              <div key={item.id} className="mb-14 last:mb-8">
                <span className="inline-block bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/40 text-[var(--color-accent-text,#806326)] font-semibold rounded-full text-[11px] px-4 py-1.5 mb-4 shadow-xs">
                  {t("verifiedReviews", "Store-published feedback")}
                </span>

                <h3
                  dir="auto"
                  className="text-xl md:text-2xl font-serif font-semibold text-[var(--color-ink,#29231D)] mb-3"
                >
                  {displayName}
                  {item.location ? ` — ${item.location}` : ""}
                </h3>

                <div className="p-6 md:p-7 rounded-3xl bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/35 shadow-sm relative overflow-hidden text-start">
                  <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-cream,#F2ECE2)]/70 dark:bg-[#1E2523] border border-[var(--color-gold,#C7982F)]/20 relative ps-4 sm:ps-5 border-s-4 border-s-[var(--color-gold,#C7982F)] space-y-2.5">
                    <p className="font-semibold text-[var(--color-accent-text,#806326)] text-xs flex items-center gap-1.5">
                      <Star size={12} className="fill-[#C7982F] text-[#C7982F]" aria-hidden="true" />
                      <span>{item.rating.toFixed(1)} / 5.0</span>
                      {item.purchasedItem ? <span>· {item.purchasedItem}</span> : null}
                    </p>
                    <p dir="auto" className="text-xs sm:text-sm text-[var(--color-ink,#29231D)] leading-relaxed font-normal">
                      “{item.review}”
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </TracingBeam>
    </div>
  );
}

export default AllBarkaTracingReviews;
