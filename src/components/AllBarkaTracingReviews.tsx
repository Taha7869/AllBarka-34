"use client";
import React from "react";
import { TracingBeam } from "./ui/tracing-beam";
import { Star } from "lucide-react";

export function AllBarkaTracingReviews() {
  return (
    <div className="bg-[var(--color-base,#FDFCFA)] w-full rounded-3xl p-4 md:p-8 select-none">
      <TracingBeam className="px-4 md:px-6 space-y-12">
        <div className="max-w-3xl mx-auto antialiased pt-4 relative">
          {allBarkaCustomerStories.map((item, index) => (
            <div key={`story-${index}`} className="mb-14 last:mb-8">
              {/* Category Badge matching Product Card pill tags */}
              <span className="inline-block bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/40 text-[var(--color-gold,#B8935F)] font-black rounded-full text-[10px] tracking-wider uppercase px-4 py-1.5 mb-4 shadow-xs">
                {item.badge}
              </span>

              {/* Customer Title */}
              <h3 className="text-xl md:text-2xl font-serif font-black text-[var(--color-ink,#1A1A1A)] mb-3 tracking-wide">
                {item.title}
              </h3>

              {/* Review Card Box */}
              <div className="p-6 md:p-7 rounded-3xl bg-[var(--color-surface,#FFFFFF)] border-2 border-[var(--color-gold,#B8935F)]/35 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden text-left">
                
                {/* Subtle gold ambient glow */}
                <div className="absolute -right-16 -top-16 w-36 h-36 bg-[var(--color-gold,#B8935F)]/10 rounded-full blur-2xl pointer-events-none" />

                {item?.image && (
                  <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--color-gold,#B8935F)]/25 shadow-xs">
                    <img
                      src={item.image}
                      alt="Customer Delivery"
                      height="600"
                      width="800"
                      referrerPolicy="no-referrer"
                      className="w-full h-52 md:h-64 object-cover hover:scale-105 transition-transform duration-700 ease-in-out"
                    />
                  </div>
                )}

                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/20 relative pl-4 sm:pl-5 border-l-4 border-l-[var(--color-gold,#B8935F)] space-y-2.5">
                  {item.description}
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
    title: "Usman Tariq — DHA Phase 6, Lahore",
    description: (
      <>
        <p className="font-bold text-[var(--color-gold,#B8935F)] text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
          <Star size={12} className="fill-[var(--color-gold,#B8935F)]" />
          4.9 / 5.0 — Verified Lahore Patron
        </p>
        <p className="text-xs sm:text-sm text-[var(--color-ink,#1A1A1A)] leading-relaxed font-normal">
          &quot;Kaju ki quality buhat zabardast thi, bilkul fresh aur crispy. Delivery time Lahore mein kafi fast tha—ordered at 2 PM aur parcel 5 baje tak mil gaya. Proper roasted crunch, buhat umdah.&quot;
        </p>
      </>
    ),
    badge: "DHA & CANTT DELIVERY",
    image: "https://images.unsplash.com/photo-1508061253366-f7da15bbf6e4?w=800&q=80",
  },
  {
    title: "Zainab Malik — Gulberg III, Lahore",
    description: (
      <>
        <p className="font-bold text-[var(--color-gold,#B8935F)] text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
          <Star size={12} className="fill-[var(--color-gold,#B8935F)]" />
          5.0 / 5.0 — Gourmet Gift Combo Buyer
        </p>
        <p className="text-xs sm:text-sm text-[var(--color-ink,#1A1A1A)] leading-relaxed font-normal">
          &quot;AllBarka ki airtight packaging ne dry fruits ki freshness bilkul qaim rakhi. Pistachios aur walnuts buhat tasty the. Lahore mein fast aur reliable delivery ke liye highly recommended.&quot;
        </p>
      </>
    ),
    badge: "GULBERG & MODEL TOWN",
    image: "https://images.unsplash.com/photo-1574577457861-1e9a263c9b11?w=800&q=80",
  },
  {
    title: "Hamza Chaudhry — Johar Town, Lahore",
    description: (
      <>
        <p className="font-bold text-[var(--color-gold,#B8935F)] text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
          <Star size={12} className="fill-[var(--color-gold,#B8935F)]" />
          4.8 / 5.0 — Bulk / Wholesale Order
        </p>
        <p className="text-xs sm:text-sm text-[var(--color-ink,#1A1A1A)] leading-relaxed font-normal">
          &quot;Pichle kai mahino se AllBarka se premium almonds aur cashews le raha hoon family events ke liye. Consistency aur quality lajawab hai. Direct Lahore HQ dispatch makes it easy.&quot;
        </p>
      </>
    ),
    badge: "JOHAR TOWN DISPATCH",
    image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&q=80",
  },
];

export default AllBarkaTracingReviews;
