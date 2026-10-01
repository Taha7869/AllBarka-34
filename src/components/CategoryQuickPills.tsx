import React from 'react';
import { motion } from 'motion/react';
import { useDragScroll } from '../hooks/useDragScroll';
import { useLanguage } from '../contexts/LanguageContext';

export interface CategoryPillItem {
  id: string;
  label: string;
  emoji: string;
  categoryFilter?: string;
  searchTerm?: string;
}

export const CATEGORY_PILLS: CategoryPillItem[] = [
  {
    id: 'all',
    label: 'All Items',
    emoji: '✨',
    categoryFilter: 'all',
    searchTerm: ''
  },
  {
    id: 'pistachios',
    label: 'Premium Pistachios',
    emoji: '🌰',
    categoryFilter: 'nuts',
    searchTerm: 'pistachio'
  },
  {
    id: 'walnuts',
    label: 'Handpicked Walnuts',
    emoji: '🥜',
    categoryFilter: 'nuts',
    searchTerm: 'walnut'
  },
  {
    id: 'oils',
    label: 'Cold-Pressed Oils',
    emoji: '🫒',
    categoryFilter: 'oils',
    searchTerm: ''
  },
  {
    id: 'gift-boxes',
    label: 'Gift Boxes & Deals',
    emoji: '🎁',
    categoryFilter: 'combos',
    searchTerm: ''
  },
  {
    id: 'seeds',
    label: 'Superfood Seeds',
    emoji: '🌱',
    categoryFilter: 'seeds',
    searchTerm: ''
  }
];

interface CategoryQuickPillsProps {
  selectedId?: string;
  onSelectCategory?: (item: CategoryPillItem) => void;
  className?: string;
}

export default function CategoryQuickPills({
  selectedId = 'all',
  onSelectCategory,
  className = ''
}: CategoryQuickPillsProps) {
  const { t } = useLanguage();
  const scrollContainerRef = useDragScroll<HTMLDivElement>();

  const handlePillClick = (item: CategoryPillItem) => {
    if (onSelectCategory) {
      onSelectCategory(item);
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 sm:px-6 relative select-none ${className}`}>
      {/* Luxury Emerald & Gold Translucent Carousel Track */}
      <div className="relative rounded-2xl p-1 sm:p-1.5 bg-[#031d18]/70 backdrop-blur-xl border border-[#C7982F]/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        
        {/* Soft edge gradient indicators for horizontal scroll on mobile */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#031d18]/90 to-transparent pointer-events-none rounded-l-2xl z-10 sm:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#031d18]/90 to-transparent pointer-events-none rounded-r-2xl z-10 sm:hidden" />

        {/* Scrollable Track - native touch momentum without pan-x restriction */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto py-1.5 px-2.5 scroll-smooth no-scrollbar cursor-grab active:cursor-grabbing select-none"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {CATEGORY_PILLS.map((item) => {
            const isSelected = selectedId === item.id;

            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => handlePillClick(item)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                aria-pressed={isSelected}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-full text-xs sm:text-[13px] font-sans whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 shadow-sm ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#C7982F] via-[#E4C783] to-[#C7982F] text-[#042821] border border-[#E4C783] font-bold shadow-[0_4px_16px_rgba(199,152,47,0.45)]'
                    : 'bg-[#FFFCF7]/10 hover:bg-[#FFFCF7]/20 text-[#FFFCF7] border border-[#C7982F]/30 hover:border-[#C7982F] font-medium'
                }`}
              >
                <span className="text-sm sm:text-base leading-none drop-shadow-xs">{item.emoji}</span>
                <span className="tracking-wide">{t(`boutique.pill.${item.id}`, item.label)}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

