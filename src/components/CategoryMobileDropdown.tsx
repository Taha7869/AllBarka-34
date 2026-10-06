import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Filter } from 'lucide-react';

export interface CategoryItem {
  id: string;
  label: string;
}

interface CategoryMobileDropdownProps {
  categories: CategoryItem[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  className?: string;
}

export default function CategoryMobileDropdown({
  categories,
  activeCategoryId,
  onSelectCategory,
  className = ''
}: CategoryMobileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || categories[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative w-full mb-6 select-none md:hidden ${className}`}>
      {/* 1. Mobile Trigger Button (Luxury Royal Green #0F3524 / #0A2F1D with Gold & Crisp White Text) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Filter products by category"
        id="mobile-category-dropdown-btn"
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 rounded-2xl bg-[#0F3524] text-[#D4AF6A] border border-[#D4AF6A]/50 shadow-[0_4px_18px_rgba(184,147,95,0.35)] transition-all duration-200 active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-6 h-6 rounded-lg bg-[#D4AF6A]/20 border border-[#D4AF6A]/40 flex items-center justify-center text-[#D4AF6A] shrink-0">
            <Filter size={12} className="text-[#D4AF6A]" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-[#D4AF6A] flex items-center truncate">
            Filter By: <span className="text-white font-serif normal-case font-bold text-sm ml-1.5 truncate">{activeCategory?.label}</span>
          </span>
        </div>

        <ChevronDown
          size={18}
          className={`text-[#D4AF6A] transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* 2. Dropdown Drawer (Light Cream #F7F1E4 Box) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-2 z-40 bg-[#F7F1E4] border border-[#D4AF6A]/45 rounded-2xl shadow-[0_16px_36px_rgba(184,147,95,0.25)] overflow-hidden p-1.5 space-y-1 backdrop-blur-md"
            id="mobile-category-dropdown-menu"
          >
            <div className="px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-[#0F3524]/70 border-b border-[#D4AF6A]/25 flex items-center justify-between">
              <span>Select Collection</span>
              <span className="text-[9px] font-bold text-[#ab841e]">{categories.length} Categories</span>
            </div>

            <div className="py-1 flex flex-col gap-1 max-h-72 overflow-y-auto">
              {categories.map((cat) => {
                const isSelected = activeCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-[#0F3524] text-[#D4AF6A] font-bold shadow-xs'
                        : 'text-[#1F120F] hover:bg-[#D4AF6A]/15 hover:text-[#0F3524]'
                    }`}
                  >
                    <span className="truncate">{cat.label}</span>
                    {isSelected && (
                      <Check size={14} className="text-[#D4AF6A] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
