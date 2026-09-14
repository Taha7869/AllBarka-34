import { STORE_CONFIG } from '../config/store';
"use client";

import React from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "./ui/animated-modal";
import { LiquidMetalWrapper } from "./ui/liquid-metal-button";
import { motion } from "motion/react";
import { 
  Sparkles, 
  Truck, 
  ShieldCheck, 
  Package, 
  MessageCircle, 
  Clock, 
  Gift, 
  Percent 
} from "lucide-react";
import { cn } from "../lib/utils";

interface AnimatedModalDemoProps {
  triggerVariant?: "hero" | "header" | "banner" | "custom";
  triggerText?: string;
  className?: string;
  children?: React.ReactNode;
}

export function AnimatedModalDemo({
  triggerVariant = "hero",
  triggerText,
  className,
  children,
}: AnimatedModalDemoProps) {
  const images = [
    {
      src: "https://images.unsplash.com/photo-1508061253366-f7da15bbf6e4?w=400&q=80",
      alt: "Premium Mountain Almonds",
      tag: "Mountain Badam",
      rotation: "-rotate-6",
    },
    {
      src: "https://images.unsplash.com/photo-1574577457861-1e9a263c9b11?w=400&q=80",
      alt: "Chilean Walnuts",
      tag: "Chilean Akhroot",
      rotation: "rotate-6",
    },
    {
      src: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=80",
      alt: "Special Mystery Gift Box Hamper",
      tag: "Mystery Gift Box",
      rotation: "-rotate-3",
    },
  ];

  const perksList = [
    {
      icon: <Truck size={15} className="text-[var(--color-gold,#B8935F)] shrink-0" />,
      title: "Lahore Same-Day Express Slots",
      desc: "Order before 4 PM for guaranteed same-day delivery across DHA, Gulberg, Model Town, and Bahria.",
    },
    {
      icon: <ShieldCheck size={15} className="text-[var(--color-gold,#B8935F)] shrink-0" />,
      title: "100% Purity & High-Oil Guarantee",
      desc: "Authentic, pesticide-free harvest handpicked for maximum crunch and natural nutrient profile.",
    },
    {
      icon: <Package size={15} className="text-[var(--color-gold,#B8935F)] shrink-0" />,
      title: "Airtight Nitrogen Vacuum Packing",
      desc: "Locks out humidity to preserve crisp farm freshness for 12+ months.",
    },
    {
      icon: <Percent size={15} className="text-[var(--color-gold,#B8935F)] shrink-0" />,
      title: "Wholesale & Bulk Savings Tier",
      desc: "Instant 20%+ discount auto-applied on orders exceeding 2kg.",
    },
  ];

  return (
    <Modal>
      {/* ── Trigger Selection based on Variant ────────────────────────── */}
      {children ? (
        <ModalTrigger className={className}>{children}</ModalTrigger>
      ) : triggerVariant === "hero" ? (
        <LiquidMetalWrapper className="rounded-full">
          <ModalTrigger
            className={cn(
              "px-6 sm:px-7 py-3 rounded-full bg-[var(--color-emerald)] text-[var(--color-base)] font-semibold text-xs sm:text-sm tracking-wide shadow-sm hover:bg-[var(--color-emerald-dark)] transition-all duration-300 hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2 group w-full h-full",
              className
            )}
          >
            <Sparkles size={15} className="text-[var(--color-base)] group-hover:rotate-12 transition-transform" />
            <span>{triggerText || "View AllBarka Perks"}</span>
          </ModalTrigger>
        </LiquidMetalWrapper>
      ) : triggerVariant === "header" ? (
        <ModalTrigger
          className={cn(
            "px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-[var(--color-cream,#FAF9F5)] text-[var(--color-gold,#B8935F)] border border-[var(--color-gold,#B8935F)]/40 rounded-full font-bold text-[9px] sm:text-[10px] tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1 sm:gap-1.5 shadow-xs hover:border-[var(--color-gold,#B8935F)] whitespace-nowrap shrink-0",
            className
          )}
        >
          <Sparkles size={11} className="text-[var(--color-gold,#B8935F)] shrink-0" />
          <span className="whitespace-nowrap">{triggerText || "Perks"}</span>
        </ModalTrigger>
      ) : (
        <ModalTrigger
          className={cn(
            "px-6 sm:px-8 py-3.5 rounded-full bg-[var(--color-gold,#B8935F)] text-white font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-sm hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2",
            className
          )}
        >
          <Gift size={16} />
          <span>{triggerText || "Unlock Exclusive Perks"}</span>
        </ModalTrigger>
      )}

      {/* ── AllBarka Uniform Whitish / Gold Modal Body ─────────────── */}
      <ModalBody className="max-w-2xl bg-[var(--color-base,#FAF9F5)] border-2 border-[var(--color-gold,#B8935F)]/35 rounded-3xl p-6 sm:p-8 text-left shadow-2xl text-[var(--color-ink,#1A1A1A)]">
        <ModalContent>
          {/* Header Banner */}
          <div className="text-center space-y-2 mb-6 select-none pr-8">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/40 text-[var(--color-gold,#B8935F)] text-[10.5px] font-black uppercase tracking-widest shadow-xs">
              <Sparkles size={12} />
              <span>AllBarka Patron Privileges</span>
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-serif font-black text-[var(--color-ink,#1A1A1A)] tracking-tight">
              Boutique Benefits & Express Delivery
            </h3>
            <p className="text-xs sm:text-sm text-[var(--color-ink-muted,#5A5A5A)] max-w-md mx-auto leading-relaxed">
              Every package is freshly vacuum-sealed and inspected to meet Lahore&apos;s highest standards for gourmet dry fruits and spices.
            </p>
          </div>

          {/* Floating Luxury Images Strip with Motion Rotation */}
          <div className="flex justify-center items-center gap-2.5 sm:gap-3.5 py-3 overflow-hidden select-none">
            {images.map((image, idx) => (
              <motion.div
                key={idx}
                style={{
                  rotate: Math.random() * 12 - 6,
                }}
                whileHover={{
                  scale: 1.12,
                  rotate: 0,
                  zIndex: 20,
                }}
                whileTap={{
                  scale: 1.08,
                  rotate: 0,
                  zIndex: 20,
                }}
                className={cn(
                  "rounded-2xl -mr-3 sm:-mr-2.5 p-1 bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/40 shrink-0 shadow-xs relative group transition-all duration-200 cursor-pointer",
                  image.rotation
                )}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  referrerPolicy="no-referrer"
                  className="rounded-xl h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 object-cover border border-[var(--color-gold,#B8935F)]/20 group-hover:border-[var(--color-gold,#B8935F)] transition-colors"
                />
                <div className="absolute inset-x-1 bottom-1 bg-[var(--color-base,#FAF9F5)]/90 backdrop-blur-xs rounded-b-xl py-0.5 px-1 text-[8.5px] font-bold text-[var(--color-gold,#B8935F)] text-center truncate border-t border-[var(--color-gold,#B8935F)]/20">
                  {image.tag}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Grid of Key Privileges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5 mt-2 select-none">
            {perksList.map((perk, i) => (
              <div
                key={i}
                className="p-3 sm:p-3.5 rounded-2xl bg-[var(--color-base,#FDFCFA)] border border-[var(--color-gold,#B8935F)]/25 flex items-start gap-3 hover:border-[var(--color-gold,#B8935F)] transition-colors"
              >
                <div className="p-2 rounded-xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 shrink-0 mt-0.5">
                  {perk.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-serif font-bold text-[var(--color-ink,#1A1A1A)] leading-snug">
                    {perk.title}
                  </h4>
                  <p className="text-[11px] text-[var(--color-ink-muted,#5A5A5A)] leading-relaxed mt-1">
                    {perk.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Slot Booking Badge */}
          <div className="mt-4 p-3 rounded-2xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[var(--color-gold,#B8935F)] font-semibold text-[11px] sm:text-xs">
              <Clock size={14} className="text-[var(--color-gold,#B8935F)] shrink-0" />
              <span>Next Dispatch Wave: Today at 5:00 PM (Lahore Hub)</span>
            </div>
            <div className="text-[10px] text-[var(--color-gold,#B8935F)] font-bold uppercase tracking-wider shrink-0 hidden sm:block">
              Free Over Rs. 3,000
            </div>
          </div>
        </ModalContent>

        {/* Footer Actions */}
        <ModalFooter className="border-[var(--color-gold,#B8935F)]/20 pt-4 mt-2">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-[var(--color-ink-muted,#5A5A5A)] text-center sm:text-left">
              ✦ Questions? Dedicated Lahore Concierge on stand-by.
            </div>

            <LiquidMetalWrapper className="w-full sm:w-auto rounded-xl">
              <a
                href={`https://wa.me/${STORE_CONFIG.whatsappBusinessNumber}?text=Assalam-o-Alaikum!%20I%20would%20like%20to%20inquire%20about%20AllBarka%20boutique%20perks%20and%20book%20a%20same-day%20delivery%20slot%20in%20Lahore.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-5 py-2.5 rounded-xl bg-[var(--color-emerald)] text-[var(--color-base)] text-xs font-black shadow-xs hover:bg-[var(--color-emerald-dark)] active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle size={14} />
                <span>Reserve Slot via WhatsApp</span>
              </a>
            </LiquidMetalWrapper>
          </div>
        </ModalFooter>
      </ModalBody>
    </Modal>
  );
}

export default AnimatedModalDemo;
