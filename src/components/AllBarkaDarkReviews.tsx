"use client";
import React from "react";
import { TracingBeam } from "./ui/tracing-beam";
import { Star, CheckCircle2, Package } from 'lucide-react';

export function AllBarkaDarkReviews() {
  return (
    /* Section Wrapper - Whitish / Gold Palette */
    <div className="bg-[var(--color-surface,#FFFFFF)] w-full rounded-3xl p-6 md:p-12 my-12 border-2 border-[var(--color-gold,#B8935F)]/35 shadow-lg text-left select-none">
      
      {/* Section Title */}
      <div className="text-center mb-12">
        <span className="bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/40 text-[var(--color-gold,#B8935F)] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xs inline-block">
          Verified Patron Feedback
        </span>
        <h2 className="text-2xl md:text-4xl font-bold text-[var(--color-ink,#1A1A1A)] mt-3 tracking-wide font-serif">
          What Our Customers Say
        </h2>
        <p className="text-[var(--color-ink-muted,#5A5A5A)] text-sm mt-2">
          Direct experiences from Lahore households and wholesale partners.
        </p>
      </div>

      <TracingBeam className="px-4 md:px-6">
        <div className="max-w-3xl mx-auto antialiased pt-4 relative">
          {allBarkaCustomerStories.map((item, index) => (
            <div key={`story-${index}`} className="mb-14 last:mb-6">
              
              {/* Category Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-[var(--color-cream,#FAF9F5)] text-[var(--color-ink,#1A1A1A)] text-xs font-semibold px-3 py-1 rounded-full border border-[var(--color-gold,#B8935F)]/40 flex items-center gap-1">
                  <Star size={12} className="text-[var(--color-gold,#B8935F)] fill-[var(--color-gold,#B8935F)]" />
                  {item.topBadge}
                </span>
                <span className="bg-[var(--color-gold,#B8935F)]/10 text-[var(--color-gold,#B8935F)] text-xs font-bold px-3 py-1 rounded-full border border-[var(--color-gold,#B8935F)]/30">
                  {item.subBadge}
                </span>
              </div>

              {/* Review Card */}
              <div className="p-6 md:p-8 rounded-2xl bg-[var(--color-base,#FDFCFA)] border border-[var(--color-gold,#B8935F)]/35 shadow-xs relative overflow-hidden">
                
                {/* Customer Title / Location */}
                <h3 className="text-xl md:text-2xl font-bold text-[var(--color-ink,#1A1A1A)] mb-1 tracking-wide font-serif">
                  {item.title}
                </h3>
                
                <p className="text-xs font-semibold text-[var(--color-gold,#B8935F)] tracking-wider uppercase mb-4">
                  {item.location}
                </p>

                {/* Optional Image */}
                {item?.image && (
                  <div className="mb-6 overflow-hidden rounded-xl border border-[var(--color-gold,#B8935F)]/25 shadow-inner">
                    <img
                      src={item.image}
                      alt="Customer Delivery"
                      referrerPolicy="no-referrer"
                      className="w-full h-48 md:h-60 object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                {/* Review Description */}
                <div className="text-sm leading-relaxed text-[var(--color-ink,#1A1A1A)] mb-6 bg-[var(--color-surface,#FFFFFF)] p-4 rounded-xl border border-[var(--color-gold,#B8935F)]/20 shadow-xs">
                  {item.description}
                </div>

                {/* Bottom Footer Info */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[var(--color-gold,#B8935F)]/20 text-xs font-medium text-[var(--color-ink-muted,#5A5A5A)]">
                  <span className="flex items-center gap-1.5">
                    <Package size={13} className="text-[var(--color-gold,#B8935F)]" />
                    {item.purchaseInfo}
                  </span>
                  <span className="text-[var(--color-gold,#B8935F)] font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    Verified Lahore Dispatch
                  </span>
                </div>

              </div>
            </div>
          ))}
        </div>
      </TracingBeam>
    </div>
  );
}

const allBarkaCustomerStories = [
  {
    title: "Usman Tariq",
    location: "DHA Phase 6, Lahore",
    topBadge: "4.9 / 5.0 RATING",
    subBadge: "WHATSAPP DIRECT ORDER",
    description: (
      <p>
        &quot;Kaju ki quality buhat zabardast thi, bilkul fresh aur crispy. Delivery time Lahore mein kafi fast tha—ordered at 2 PM aur parcel 5 baje tak deliver ho gaya. Proper roasted crunch!&quot;
      </p>
    ),
    purchaseInfo: "Purchased: Roasted Pistachios & Salted Kaju (500g)",
    image: "https://images.unsplash.com/photo-1508061253366-f7da15bbf6e4?w=800&q=80",
  },
  {
    title: "Zainab Malik",
    location: "Gulberg III, Lahore",
    topBadge: "5.0 / 5.0 RATING",
    subBadge: "GIFT COMBO BUYER",
    description: (
      <p>
        &quot;Packaging buhat pyari thi! Airtight jar ki wajah se dry fruits ki freshness bilkul barqarar rahi. Work-day fuel pack office snacking ke liye absolute best hai.&quot;
      </p>
    ),
    purchaseInfo: "Purchased: The Classics Combo",
    image: "https://images.unsplash.com/photo-1574577457861-1e9a263c9b11?w=800&q=80",
  },
];

export default AllBarkaDarkReviews;
