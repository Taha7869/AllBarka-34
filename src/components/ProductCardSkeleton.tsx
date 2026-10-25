import React from 'react';
import { motion } from 'motion/react';

interface ProductCardSkeletonProps {
  key?: React.Key;
  viewMode?: 'grid' | 'list';
}

export function ProductCardSkeleton({ viewMode = 'grid' }: ProductCardSkeletonProps) {
  if (viewMode === 'list') {
    return (
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden p-3.5 sm:p-4 bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/30 shadow-xs relative animate-shimmer select-none">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Image Placeholder */}
          <div className="w-full sm:w-44 md:w-52 h-44 sm:h-36 rounded-xl bg-[var(--color-cream,#FAF9F5)] shrink-0 border border-[var(--color-gold,#B8935F)]/15 relative overflow-hidden" />

          {/* Details Placeholder */}
          <div className="flex-1 flex flex-col justify-between py-1 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-[var(--color-gold,#B8935F)]/25 rounded-full" />
                <div className="h-4 w-16 bg-[var(--color-gold,#B8935F)]/15 rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-[var(--color-ink,#1A1A1A)]/10 rounded-md" />
              <div className="h-3 w-full bg-[var(--color-ink,#1A1A1A)]/5 rounded" />
              <div className="h-3 w-4/5 bg-[var(--color-ink,#1A1A1A)]/5 rounded" />
            </div>

            {/* Micro badges placeholder */}
            <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-gold,#B8935F)]/15">
              <div className="h-2.5 w-16 bg-[var(--color-gold,#B8935F)]/15 rounded" />
              <div className="h-2.5 w-16 bg-[var(--color-gold,#B8935F)]/15 rounded" />
              <div className="h-2.5 w-16 bg-[var(--color-gold,#B8935F)]/15 rounded" />
            </div>

            {/* Bottom Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5">
                <div className="h-7 w-14 bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/20 rounded-xl" />
                <div className="h-7 w-14 bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/20 rounded-xl" />
                <div className="h-7 w-14 bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/20 rounded-xl" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-20 bg-[var(--color-ink,#1A1A1A)]/15 rounded" />
                <div className="h-8 w-28 bg-[var(--color-gold,#B8935F)]/30 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Standard 4-Column Grid View Skeleton ──
  return (
    <div className="rounded-[26px] sm:rounded-[28px] overflow-hidden flex flex-col h-full bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/30 shadow-xs relative animate-shimmer select-none">
      {/* Top Floating Badge Skeleton */}
      <div className="absolute top-3 left-3 z-20 h-5 w-20 bg-white/90 backdrop-blur-md rounded-full border border-[var(--color-gold,#B8935F)]/25" />

      {/* Image Skeleton */}
      <div className="relative aspect-[4/3] sm:aspect-[16/11] bg-[var(--color-cream,#FAF9F5)] shrink-0 border-b border-[var(--color-gold,#B8935F)]/15 overflow-hidden" />

      {/* Body Content Skeleton */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3 bg-[var(--color-surface,#FFFFFF)]">
        <div className="space-y-2">
          {/* Health benefit tag */}
          <div className="h-2.5 w-24 bg-[var(--color-gold,#B8935F)]/30 rounded-full" />
          
          {/* Title line */}
          <div className="h-4.5 w-3/4 bg-[var(--color-ink,#1A1A1A)]/10 rounded-md" />
          
          {/* Description lines */}
          <div className="space-y-1.5 pt-1">
            <div className="h-2.5 w-full bg-[var(--color-ink,#1A1A1A)]/5 rounded" />
            <div className="h-2.5 w-5/6 bg-[var(--color-ink,#1A1A1A)]/5 rounded" />
          </div>
        </div>

        {/* Micro Trust Strip Skeleton */}
        <div className="flex items-center justify-between py-1.5 border-t border-b border-[var(--color-gold,#B8935F)]/15">
          <div className="h-2 w-14 bg-[var(--color-gold,#B8935F)]/15 rounded" />
          <div className="h-2 w-14 bg-[var(--color-gold,#B8935F)]/15 rounded" />
          <div className="h-2 w-14 bg-[var(--color-gold,#B8935F)]/15 rounded" />
        </div>

        {/* Weights and Price Skeleton */}
        <div className="space-y-2.5 pt-1">
          {/* 3 Weight Pill buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="h-7 bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/20 rounded-xl" />
            <div className="h-7 bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/20 rounded-xl" />
            <div className="h-7 bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/20 rounded-xl" />
          </div>

          {/* Price and Add Button */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="space-y-1">
              <div className="h-2 w-8 bg-[var(--color-ink,#1A1A1A)]/15 rounded" />
              <div className="h-5 w-20 bg-[var(--color-ink,#1A1A1A)]/20 rounded" />
            </div>
            <div className="h-8 w-28 bg-[var(--color-gold,#B8935F)]/35 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProductGridSkeletonProps {
  count?: number;
  viewMode?: 'grid' | 'list';
}

export default function ProductGridSkeleton({ count = 8, viewMode = 'grid' }: ProductGridSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6'
          : 'flex flex-col gap-4 sm:gap-5 max-w-5xl mx-auto'
      }
    >
      {items.map((key) => (
        <ProductCardSkeleton key={key} viewMode={viewMode} />
      ))}
    </motion.div>
  );
}
