import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, List, ChevronDown, Check, ArrowUpDown, SlidersHorizontal } from 'lucide-react';

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'popular';

export interface ShopControlsProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  totalProducts: number;
}

const SORT_OPTIONS: { id: SortOption; label: string; shortLabel: string }[] = [
  { id: 'featured', label: 'Featured & Curated', shortLabel: 'Featured' },
  { id: 'popular', label: 'Most Popular & Best Sellers', shortLabel: 'Popular' },
  { id: 'price-asc', label: 'Price: Low to High', shortLabel: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low', shortLabel: 'Price: High to Low' },
  { id: 'name-asc', label: 'Alphabetical: A to Z', shortLabel: 'Name: A to Z' }
];

export default function ShopControls({
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalProducts
}: ShopControlsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = SORT_OPTIONS.find((opt) => opt.id === sortBy) || SORT_OPTIONS[0];

  return (
    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 pb-6 mb-8 border-b border-[var(--color-gold,#B8935F)]/25 select-none">
      
      {/* Left: Product Count / Status Tag */}
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[var(--color-ink-muted,#5A5A5A)]">
          Showing <span className="text-[var(--color-ink,#1A1A1A)] font-mono font-black">{totalProducts}</span> Gourmet Items
        </span>
        <span className="h-3.5 w-px bg-[var(--color-gold,#B8935F)]/40 hidden sm:block" />
        <span className="text-[10px] font-bold text-[var(--color-ink,#1A1A1A)] bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/35 px-2 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold,#B8935F)] animate-pulse" />
          Fresh Lahore Dispatch
        </span>
      </div>

      {/* Right Controls: Sort Dropdown & View Mode Toggle */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5">
        
        {/* Custom Luxury Sort Dropdown */}
        <div className="relative flex-1 sm:flex-initial" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            className={`w-full sm:w-auto min-h-[40px] px-3.5 py-2 rounded-xl flex items-center justify-between sm:justify-start gap-2.5 text-xs font-bold transition-all duration-200 border cursor-pointer ${
              dropdownOpen
                ? 'bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] border-[var(--color-gold,#B8935F)] shadow-sm ring-1 ring-[var(--color-gold,#B8935F)]/40'
                : 'bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] border-[var(--color-gold,#B8935F)]/35 hover:border-[var(--color-gold,#B8935F)] hover:bg-[var(--color-cream,#FAF9F5)] shadow-xs'
            }`}
          >
            <div className="flex items-center gap-2">
              <ArrowUpDown size={13} className="text-[var(--color-gold,#B8935F)]" />
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted,#5A5A5A)] font-extrabold hidden sm:inline">Sort:</span>
              <span className="truncate max-w-[130px] sm:max-w-[160px] text-[11px] sm:text-xs">
                {selectedOption.shortLabel}
              </span>
            </div>
            
            <ChevronDown 
              size={14} 
              className={`transition-transform duration-200 shrink-0 ${
                dropdownOpen ? 'rotate-180 text-[var(--color-gold,#B8935F)]' : 'text-[var(--color-ink-muted,#5A5A5A)]'
              }`} 
            />
          </button>

          {/* Luxury Dropdown Menu */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute right-0 top-full mt-1.5 z-40 w-56 sm:w-64 bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/45 rounded-2xl shadow-lg overflow-hidden p-1.5 space-y-1 backdrop-blur-md"
              >
                <div className="px-3 py-1.5 text-[9.5px] font-black uppercase tracking-widest text-[var(--color-ink-muted,#5A5A5A)] border-b border-[var(--color-gold,#B8935F)]/20 flex items-center justify-between">
                  <span>Sort Collection By</span>
                  <SlidersHorizontal size={10} className="text-[var(--color-gold,#B8935F)]" />
                </div>

                {SORT_OPTIONS.map((option) => {
                  const isSelected = sortBy === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onSortChange(option.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--color-cream,#FAF9F5)] text-[var(--color-gold,#B8935F)] font-bold shadow-xs border border-[var(--color-gold,#B8935F)]/30'
                          : 'text-[var(--color-ink,#1A1A1A)] hover:bg-[var(--color-cream,#FAF9F5)] hover:text-[var(--color-gold,#B8935F)]'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && (
                        <Check size={13} className="text-[var(--color-gold,#B8935F)] shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Minimalist Grid / List View Toggle */}
        <div className="flex items-center p-1 bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/35 rounded-xl shadow-xs shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            title="Grid View"
            aria-label="Grid View"
            className={`min-h-[32px] min-w-[34px] px-2 py-1.5 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-[var(--color-gold,#B8935F)] text-white shadow-xs'
                : 'text-[var(--color-ink-muted,#5A5A5A)] hover:text-[var(--color-ink,#1A1A1A)] hover:bg-[var(--color-cream,#FAF9F5)]'
            }`}
          >
            <LayoutGrid size={15} strokeWidth={viewMode === 'grid' ? 2.2 : 1.8} />
          </button>
          
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            title="List View"
            aria-label="List View"
            className={`min-h-[32px] min-w-[34px] px-2 py-1.5 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[var(--color-gold,#B8935F)] text-white shadow-xs'
                : 'text-[var(--color-ink-muted,#5A5A5A)] hover:text-[var(--color-ink,#1A1A1A)] hover:bg-[var(--color-cream,#FAF9F5)]'
            }`}
          >
            <List size={16} strokeWidth={viewMode === 'list' ? 2.2 : 1.8} />
          </button>
        </div>

      </div>

    </div>
  );
}
