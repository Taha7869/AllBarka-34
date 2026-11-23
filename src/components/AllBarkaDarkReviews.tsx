"use client";
import React from "react";
import { TracingBeam } from "./ui/tracing-beam";
import { Star, Package } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { usePublishedReviews } from "../contexts/StorefrontContentContext";
import { sanitizePublishedReviews, type PublishedPatronReview } from "../lib/publishedReviews";

export interface AllBarkaDarkReviewsProps {
  reviews?: PublishedPatronReview[];
}

export function AllBarkaDarkReviews({ reviews: propReviews }: AllBarkaDarkReviewsProps = {}) {
  const { language, t, isRtl } = useLanguage();
  const publishedReviews = usePublishedReviews();
  const items = sanitizePublishedReviews(propReviews ?? publishedReviews);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      data-testid="dark-reviews"
      className="bg-[var(--color-surface,#FFFCF7)] w-full rounded-3xl p-6 md:p-12 my-12 border border-[var(--color-gold,#C7982F)]/35 shadow-sm text-start select-none"
    >
      <div className="text-center mb-12">
        <span className="bg-[var(--color-cream,#F2ECE2)] dark:bg-[#1E2523] border border-[var(--color-gold,#C7982F)]/40 text-[var(--color-accent-text,#806326)] text-xs font-semibold px-4 py-1.5 rounded-full inline-block">
          {t("verifiedReviews", "Store-published feedback")}
        </span>
        <h2 className="text-2xl md:text-4xl font-semibold text-[var(--color-ink,#29231D)] mt-3 font-serif">
          {t("whatCustomersSay", "Notes from households we serve")}
        </h2>
        <p className="text-[var(--color-ink-muted,#635B52)] text-sm mt-2">
          {t("reviewsDesc", "Store-published patron feedback from Lahore and nationwide orders.")}
        </p>
      </div>

      <TracingBeam className="px-4 md:px-6">
        <div className="max-w-3xl mx-auto antialiased pt-4 relative">
          {items.map((item) => {
            const displayName =
              language === "ur" ? item.name_ur : language === "ar" ? item.name_ar : item.name_en;
            return (
              <div key={item.id} className="mb-14 last:mb-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="bg-[var(--color-cream,#F2ECE2)] dark:bg-[#1E2523] text-[var(--color-ink,#29231D)] text-xs font-semibold px-3 py-1 rounded-full border border-[var(--color-gold,#C7982F)]/40 flex items-center gap-1">
                    <Star size={12} className="text-[#C7982F] fill-[#C7982F]" aria-hidden="true" />
                    {item.rating.toFixed(1)} / 5.0
                  </span>
                </div>

                <div className="p-6 md:p-8 rounded-2xl bg-[var(--color-base,#FDFBF7)] border border-[var(--color-gold,#C7982F)]/35 relative overflow-hidden">
                  <h3 dir="auto" className="text-xl md:text-2xl font-semibold text-[var(--color-ink,#29231D)] mb-1 font-serif">
                    {displayName}
                  </h3>

                  {item.location && (
                    <p dir="auto" className="text-xs font-medium text-[var(--color-accent-text,#806326)] mb-4">
                      {item.location}
                    </p>
                  )}

                  <div dir="auto" className="text-sm leading-relaxed text-[var(--color-ink,#29231D)] mb-6 bg-[var(--color-surface,#FFFCF7)] p-4 rounded-xl border border-[var(--color-gold,#C7982F)]/20">
                    “{item.review}”
                  </div>

                  {item.purchasedItem && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[var(--color-gold,#C7982F)]/20 text-xs font-medium text-[var(--color-ink-muted,#635B52)]">
                      <span className="flex items-center gap-1.5">
                        <Package size={13} className="text-[#C7982F]" aria-hidden="true" />
                        <span dir="auto">{item.purchasedItem}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </TracingBeam>
    </div>
  );
}

export default AllBarkaDarkReviews;
