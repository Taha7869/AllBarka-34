"use client";
import { useLanguage } from '../../contexts/LanguageContext';
import React, { useEffect, useState } from "react";
import { 
  Star, 
  MapPin, 
  Check, 
  ShoppingBag, 
  Quote, 
  Sparkles, 
  X, 
  BadgeCheck, 
  CheckCircle2,
  MessageCircle,
  Clock,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { buildAutomatedOrderWhatsAppUrl } from "../../config/contacts";

export interface MovingReviewItem {
  id?: string;
  quote: string;
  headline?: string;
  name: string;
  title?: string;
  location?: string;
  rating?: string | number;
  purchasedItem?: string;
  verifiedSource?: string;
  avatarInitials?: string;
  isReviewOfTheMonth?: boolean;
}

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "slow",
  pauseOnHover = true,
  className,
  onReviewSelect,
}: {
  items: MovingReviewItem[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
  onReviewSelect?: (item: MovingReviewItem) => void;
}) => {
  const { t, isRtl } = useLanguage();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  const [start, setStart] = useState(false);
  const [selectedReview, setSelectedReview] = useState<MovingReviewItem | null>(null);

  useEffect(() => {
    addAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard escape listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedReview(null);
      }
    };
    if (selectedReview) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedReview]);

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children) as HTMLElement[];

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }

  const getDirection = () => {
    if (containerRef.current) {
      if (direction === "left") {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "forwards"
        );
      } else {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "reverse"
        );
      }
    }
  };

  const getSpeed = () => {
    if (containerRef.current) {
      if (speed === "fast") {
        containerRef.current.style.setProperty("--animation-duration", "35s");
      } else if (speed === "normal") {
        containerRef.current.style.setProperty("--animation-duration", "63s");
      } else {
        containerRef.current.style.setProperty("--animation-duration", "98s");
      }
    }
  };

  // Delegated click handler so both original and cloned elements open the QuickView modal
  const handleScrollerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const card = target.closest("[data-review-index]") as HTMLElement | null;
    if (card && card.dataset.reviewIndex !== undefined) {
      const idx = parseInt(card.dataset.reviewIndex, 10);
      if (items[idx]) {
        setSelectedReview(items[idx]);
        if (onReviewSelect) {
          onReviewSelect(items[idx]);
        }
      }
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        dir="ltr"
        className={cn(
          "scroller relative z-20 w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_8%,white_92%,transparent)]",
          className
        )}
      >
        <div
          ref={scrollerRef}
          onClick={handleScrollerClick}
          className={cn(
            "flex min-w-full shrink-0 gap-6 py-6 w-max flex-nowrap",
            start && "animate-scroll",
            pauseOnHover && "hover:[animation-play-state:paused]"
          )}
        >
          {items.map((item, idx) => {
            const formattedRating =
              typeof item.rating === "number"
                ? `⭐ ${item.rating}.0 / 5.0`
                : item.rating || "⭐ 5.0 / 5.0";
            const locationDisplay = item.location || item.title || "Lahore, Pakistan";

            return (
              <div
                key={item.id || idx}
                data-review-index={idx}
                // AllBarka Signature Whitish/Cream Luxury Card with Gold Border & Rounded-3xl
                dir={isRtl ? 'rtl' : 'ltr'}
                className="w-[360px] sm:w-[420px] md:w-[460px] rounded-3xl bg-[#FAF9F5] border-2 border-[#D4AF6A]/50 p-6 md:p-8 shadow-[0_8px_25px_rgba(43,27,20,0.06),0_0_15px_rgba(212,175,106,0.12)] relative flex flex-col justify-between shrink-0 text-start select-none cursor-pointer transition-all duration-300 hover:border-[#D4AF6A] hover:scale-[1.015] hover:shadow-[0_12px_35px_rgba(43,27,20,0.12),0_0_25px_rgba(212,175,106,0.25)] group text-[#2B1B17]"
              >
                {/* Review of the Month Ribbon */}
                {item.isReviewOfTheMonth && (
                  <div className="absolute top-0 right-8 z-10 flex items-center gap-1 bg-gradient-to-r from-[#D4AF6A] via-[#F3DFA2] to-[#D4AF6A] text-[#2B1B17] text-[8.5px] font-black uppercase px-3 py-1 rounded-b-lg tracking-wider shadow-xs border-b border-x border-[#D4AF6A]/60">
                    <Sparkles size={10} className="fill-[#2B1B17]" />
                    <span>Review of the Month</span>
                  </div>
                )}

                <div>
                  {/* Top Rating & Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-[#8C6B1B] text-xs font-black px-3 py-1 rounded-full bg-[#D4AF6A]/15 border border-[#D4AF6A]/40 shadow-2xs inline-flex items-center gap-1">
                      {formattedRating}
                    </span>
                    <span className="text-[11px] font-semibold text-[#2B1B17]/70 flex items-center gap-1">
                      <MapPin size={11} className="text-[#D4AF6A] shrink-0" />
                      <span className="truncate max-w-[160px]">{locationDisplay}</span>
                    </span>
                  </div>

                  {/* Headline if available */}
                  {item.headline && (
                    <h4 className="text-sm md:text-base font-serif font-black text-[#2B1B17] tracking-wide mb-2.5 group-hover:text-[#8C6B1B] transition-colors">
                      &quot;{item.headline}&quot;
                    </h4>
                  )}

                  {/* Quote text in frosted off-white box */}
                  <div className="relative p-4 rounded-2xl bg-white border border-[#D4AF6A]/30 mb-5 pl-4.5 border-l-4 border-l-[#D4AF6A] shadow-xs">
                    <Quote
                      size={14}
                      className="text-[#D4AF6A]/40 absolute top-3 left-1.5 fill-[#D4AF6A]/10 pointer-events-none"
                    />
                    <p className="text-xs sm:text-sm leading-relaxed text-[#2B1B17]/90 font-normal line-clamp-3">
                      &quot;{item.quote}&quot;
                    </p>
                  </div>
                </div>

                {/* Author & Purchase Info Footer */}
                <div className="pt-3.5 border-t border-[#D4AF6A]/25 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.avatarInitials ? (
                        <div className="w-8 h-8 rounded-xl bg-[#2B1B17] text-[#D4AF6A] font-serif font-black text-xs flex items-center justify-center shrink-0 border border-[#D4AF6A]/40 shadow-xs">
                          {item.avatarInitials}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-[#D4AF6A]/20 text-[#8C6B1B] font-serif font-bold text-xs flex items-center justify-center shrink-0 border border-[#D4AF6A]/40">
                          {item.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-[#2B1B17] truncate font-serif group-hover:text-[#8C6B1B] transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-[#8C6B1B] font-medium truncate">
                          {locationDisplay}
                        </div>
                      </div>
                    </div>

                    {/* Verified badge */}
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF9F5] border border-[#D4AF6A]/50 text-[#2B1B17] font-bold text-[9.5px] shrink-0 shadow-2xs">
                      <Check size={10} className="stroke-[2.5] text-[#D4AF6A]" />
                      <span>{item.verifiedSource || "Verified Lahore Patron"}</span>
                    </div>
                  </div>

                  {item.purchasedItem && (
                    <div className="flex items-center justify-between text-[10.5px] text-[#2B1B17]/75 pt-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ShoppingBag size={11} className="text-[#D4AF6A] shrink-0" />
                        <span className="text-[9.5px] font-semibold text-[#2B1B17]/75 pt-1">{t('quickView')}</span>
                        <span className="font-semibold text-[#2B1B17] truncate">{item.purchasedItem}</span>
                      </div>
                      <span className="text-[9.5px] text-[#8C6B1B] group-hover:text-[#2B1B17] font-bold shrink-0 pl-2">
                        Quick View ↗
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review QuickView Modal Popup */}
      <AnimatePresence>
        {selectedReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedReview(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Dialog Card in AllBarka Cream & Gold Luxury Theme */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#FAF9F5] border-2 border-[#D4AF6A] p-6 sm:p-8 text-left shadow-[0_25px_70px_rgba(43,27,20,0.35),0_0_50px_rgba(212,175,106,0.25)] text-[#2B1B17] z-10 my-auto"
            >
              {/* Review of the Month Ribbon */}
              {selectedReview.isReviewOfTheMonth && (
                <div className="absolute top-0 left-8 z-10 flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF6A] via-[#F3DFA2] to-[#D4AF6A] text-[#2B1B17] text-[9.5px] font-black uppercase px-3.5 py-1.5 rounded-b-xl tracking-wider shadow-xs border-b border-x border-[#D4AF6A]">
                  <Sparkles size={11} className="fill-[#2B1B17]" />
                  <span>Review of the Month • Lahore Community Pick</span>
                </div>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white border border-[#D4AF6A]/40 text-[#2B1B17] hover:text-[#8C6B1B] hover:border-[#D4AF6A] flex items-center justify-center transition-colors shadow-xs focus:outline-none cursor-pointer"
                aria-label="Close review details"
              >
                <X size={18} />
              </button>

              {/* Modal Content Header */}
              <div className="pt-3 sm:pt-4 space-y-4">
                {/* Rating & Location Tag */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[#8C6B1B] text-xs font-black px-3.5 py-1.5 rounded-full bg-[#D4AF6A]/15 border border-[#D4AF6A]/40 shadow-2xs inline-flex items-center gap-1.5">
                    {typeof selectedReview.rating === "number"
                      ? `⭐ ${selectedReview.rating}.0 / 5.0 RATING`
                      : selectedReview.rating}
                  </span>

                  <span className="text-xs font-semibold text-[#2B1B17]/80 px-3 py-1.5 rounded-full bg-white border border-[#D4AF6A]/30 flex items-center gap-1.5">
                    <MapPin size={12} className="text-[#D4AF6A] shrink-0" />
                    <span>{selectedReview.location || selectedReview.title || "Lahore, Pakistan"}</span>
                  </span>
                </div>

                {/* Customer Profile Banner */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-[#D4AF6A]/35 shadow-xs">
                  {selectedReview.avatarInitials ? (
                    <div className="w-12 h-12 rounded-2xl bg-[#2B1B17] text-[#D4AF6A] font-serif font-black text-base flex items-center justify-center shrink-0 border border-[#D4AF6A]/40 shadow-xs">
                      {selectedReview.avatarInitials}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-[#D4AF6A]/25 text-[#8C6B1B] font-serif font-black text-base flex items-center justify-center shrink-0 border border-[#D4AF6A]/50">
                      {selectedReview.name.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-base sm:text-lg font-serif font-bold text-[#2B1B17] truncate">
                      {selectedReview.name}
                    </div>
                    <div className="text-xs text-[#8C6B1B] font-medium flex items-center gap-1.5 mt-0.5">
                      <BadgeCheck size={13} className="text-[#D4AF6A] shrink-0" />
                      <span>{selectedReview.verifiedSource || "Verified Lahore Resident"}</span>
                    </div>
                  </div>
                </div>

                {/* Review Headline & Full Text */}
                <div className="space-y-2.5">
                  {selectedReview.headline && (
                    <h3 className="text-base sm:text-lg font-serif font-black text-[#2B1B17] tracking-wide">
                      &quot;{selectedReview.headline}&quot;
                    </h3>
                  )}

                  <div className="relative p-5 rounded-2xl bg-white border border-[#D4AF6A]/35 pl-5 border-l-4 border-l-[#D4AF6A] shadow-xs">
                    <Quote
                      size={16}
                      className="text-[#D4AF6A]/40 absolute top-3.5 left-2 fill-[#D4AF6A]/10 pointer-events-none"
                    />
                    <p className="text-sm sm:text-[15px] leading-relaxed text-[#2B1B17] font-normal whitespace-pre-line">
                      &quot;{selectedReview.quote}&quot;
                    </p>
                  </div>
                </div>

                {/* Purchase & Dispatch Details Box */}
                {selectedReview.purchasedItem && (
                  <div className="p-4 rounded-2xl bg-white border border-[#D4AF6A]/30 space-y-2 text-xs shadow-xs">
                    <div className="flex items-center justify-between text-[#8C6B1B] font-bold pb-1.5 border-b border-[#D4AF6A]/20">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                        <ShoppingBag size={13} />
                        <span>Order Particulars</span>
                      </span>
                      <span className="text-[10px] text-[#2B1B17] font-semibold flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-[#D4AF6A]" />
                        <span>Dispatched & Verified</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[#2B1B17]/60">Items Delivered:</span>
                      <span className="font-bold text-[#2B1B17] text-right truncate max-w-[240px]">
                        {selectedReview.purchasedItem}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#2B1B17]/60">Delivery Area:</span>
                      <span className="font-medium text-[#2B1B17]/90">
                        {selectedReview.location || selectedReview.title || "Lahore"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#2B1B17]/60">Packaging Standard:</span>
                      <span className="font-medium text-[#8C6B1B]">
                        Airtight Resealable Jar (Vacuum Sealed)
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedReview(null)}
                    className="flex-1 py-3 px-4 rounded-xl bg-white border border-[#D4AF6A]/50 text-[#2B1B17] hover:border-[#D4AF6A] text-xs font-bold transition-all text-center cursor-pointer shadow-xs"
                  >
                    Close Review
                  </button>

                  <a
                    href={buildAutomatedOrderWhatsAppUrl(
                      `Assalam-o-Alaikum! I read ${selectedReview.name}'s review about ${selectedReview.purchasedItem || "AllBarka dry fruits"}. I would like to place an order.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#2B1B17] to-[#3D2721] hover:from-[#3D2721] hover:to-[#2B1B17] text-[#FFFDD0] border border-[#D4AF6A]/60 text-xs font-black transition-all text-center flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <MessageCircle size={14} className="text-[#D4AF6A]" />
                    <span>Order via WhatsApp</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InfiniteMovingCards;
