"use client";

import React from "react";
import { CheckCircle2, Star, ShieldCheck, CircleCheck } from "lucide-react";
import { InfiniteMovingCards, MovingReviewItem } from "./ui/infinite-moving-cards";
import { REVIEWS } from "../data/products";

export function AllBarkaMovingReviews() {
  // Map authentic Lahore reviews into MovingReviewItem format
  const marqueeItems: MovingReviewItem[] = REVIEWS.map((rev) => ({
    id: rev.id,
    quote: rev.review,
    headline: rev.headline,
    name: rev.name,
    title: rev.location,
    location: rev.location,
    rating: `⭐ ${rev.rating}.0 / 5.0`,
    purchasedItem: rev.purchasedItem,
    verifiedSource: rev.verifiedSource,
    avatarInitials: rev.avatarInitials,
    isReviewOfTheMonth: rev.isReviewOfTheMonth,
  }));

  return (
    <section id="about" className="py-20 sm:py-24 bg-[var(--color-base)] text-[var(--color-ink)] relative overflow-hidden select-none border-t border-[var(--color-border)]">
      {/* Soft subtle ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[var(--color-gold)]/[0.08] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10 sm:space-y-12">
        {/* Header & Honest Trust Metrics */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-gold)]/50 text-[var(--color-gold)] text-[11px] font-black tracking-wider uppercase shadow-xs">
            <CheckCircle2 size={12} className="text-[var(--color-gold)]" />
            <span>Verified Lahore Patron Feedback</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight text-[var(--color-ink)]">
            What Our Customers Say
          </h2>

          <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] leading-relaxed font-medium">
            Continuous feedback from WhatsApp orders and deliveries across Lahore. Hover over any card to pause and read.
          </p>

          {/* Grounded Trust Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink)] shadow-xs">
              <div className="flex gap-0.5 text-[var(--color-gold)]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={11} fill="currentColor" className="text-[var(--color-gold)]" />
                ))}
              </div>
              <span className="font-bold text-[var(--color-ink)] pl-0.5">4.9 / 5.0</span>
              <span className="text-[var(--color-ink-muted)] text-[11px] font-semibold">• 100+ Lahore Reviews</span>
            </div>

            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-muted)] text-[11px] font-semibold shadow-xs">
              <ShieldCheck size={12} className="text-[var(--color-gold)]" />
              <span>Airtight Resealable Jars</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-muted)] text-[11px] font-semibold shadow-xs">
              <CircleCheck size={12} className="text-[var(--color-gold)]" />
              <span>Cash on Delivery across Lahore</span>
            </div>
          </div>
        </div>

        {/* Continuous Horizontal Scrolling Marquee Track */}
        <div className="w-full relative overflow-hidden py-2">
          <InfiniteMovingCards items={marqueeItems} direction="left" speed="slow" pauseOnHover={true} />
        </div>

        {/* Freshness & Quality Guarantee */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-gold)]/60 text-center relative max-w-2xl mx-auto space-y-4 shadow-md">
          <div className="w-11 h-11 rounded-2xl bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/40 flex items-center justify-center mx-auto text-[var(--color-gold)] shadow-xs">
            <ShieldCheck size={22} className="text-[var(--color-gold)]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-serif font-black text-[var(--color-ink)]">
              Our Freshness & Purity Promise
            </h3>
            <p className="text-xs sm:text-[13px] text-[var(--color-ink-muted)] leading-relaxed max-w-lg mx-auto font-medium">
              Every batch is sorted, checked for natural oil freshness, and sealed in airtight packaging before courier dispatch. If any item does not meet your expectations, we offer instant replacement or support.
            </p>
          </div>

          <div className="pt-1 flex flex-wrap gap-2 justify-center text-[10.5px] text-[var(--color-ink)] font-bold">
            <span className="px-3 py-1 rounded-full bg-[var(--color-base)] border border-[var(--color-border)] shadow-xs">✓ Clean Sorting</span>
            <span className="px-3 py-1 rounded-full bg-[var(--color-base)] border border-[var(--color-border)] shadow-xs">✓ Resealable Freshness Jars</span>
            <span className="px-3 py-1 rounded-full bg-[var(--color-base)] border border-[var(--color-border)] shadow-xs">✓ Direct WhatsApp Dispatch</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AllBarkaMovingReviews;
