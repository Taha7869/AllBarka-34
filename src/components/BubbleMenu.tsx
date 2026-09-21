import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

interface MenuItem {
  id: string;
  label: string;
  path: string;
  dropdownItems?: { id: string; label: string; path: string }[];
}

interface BubbleMenuProps {
  items?: MenuItem[];
  activeItem?: string;
  onItemClick?: (item: { id: string; label: string; path: string }) => void;
  className?: string;
}

// Default menu items will be generated inside the component using the translation function

export default function BubbleMenu({
  items,
  activeItem = 'Home',
  onItemClick,
  className = ''
}: BubbleMenuProps) {
  const { t } = useLanguage();
  const defaultItems: MenuItem[] = [
    { id: 'Home', label: t('home', 'Home'), path: '/' },
    {
      id: 'Shop',
      label: t('shop', 'Shop'),
      path: '/shop',
      dropdownItems: [
        { id: 'all', label: t('allProducts', 'All Products'), path: '/shop' },
        { id: 'nuts', label: t('dryFruits', 'Dry Fruits & Nuts'), path: '/shop/nuts' },
        { id: 'seeds', label: t('berries', 'Seeds & Superfoods'), path: '/shop/seeds' },
        { id: 'snacks', label: t('snacks', 'Premium Snacks'), path: '/shop/snacks' },
        { id: 'oils', label: t('categoryOils', 'Cold-Pressed Oils'), path: '/shop/oils' },
        { id: 'organics', label: t('categoryEssentials', 'Pure Organic Essentials'), path: '/shop/organics' },
      ],
    },
    { id: 'Gift Boxes', label: t('giftBoxes', 'Gift Boxes'), path: '/shop/combos' },
    { id: 'Contact', label: t('contact', 'Contact'), path: '/pages/contact' },
  ];
  const menuItems = items && items.length ? items : defaultItems;

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <nav
      aria-label="Main Navigation"
      className={`rounded-full px-2 py-1 flex items-center gap-1 backdrop-blur-md transition-colors duration-300 select-none pointer-events-auto border border-[#C7982F]/25 bg-[#FFFCF7]/85 dark:bg-[#1A201E]/85 shadow-[0_2px_12px_rgba(41,35,29,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)] ${className}`}
    >
      {menuItems.map((item) => {
        const isActive = activeItem === item.id || activeItem === item.label;
        const isHovered = hoveredItem === item.id;

        return (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <button
              type="button"
              onClick={() => onItemClick && onItemClick(item)}
              className={`px-3.5 py-1.5 rounded-full text-[11.5px] font-sans font-medium tracking-[0.08em] uppercase relative z-10 transition-colors duration-200 cursor-pointer focus-ring outline-none block ${
                isActive
                  ? 'text-[#042821] dark:text-[#FFFCF7] font-semibold'
                  : 'text-[#29231D]/80 dark:text-[#F6F1EA]/75 hover:text-[#042821] dark:hover:text-[#FFFCF7]'
              }`}
            >
            {/* Hover Floating Bubble */}
            {isHovered && !isActive && (
              <motion.div
                layoutId="bubble-hover"
                className="absolute inset-0 rounded-full z-[-1] bg-[#C7982F]/10 dark:bg-[#C7982F]/15"
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 32
                }}
              />
            )}

            {/* Selected Active Indicator */}
            {isActive && (
              <motion.div
                layoutId="bubble-active"
                className="absolute inset-0 rounded-full z-[-1] bg-[#C7982F]/15 dark:bg-[#C7982F]/25 border border-[#C7982F]/40 shadow-xs"
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 28
                }}
              />
            )}

            <span>{item.label}</span>
            </button>

            {/* Dropdown Menu */}
            {item.dropdownItems && isHovered && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 py-2 min-w-[200px] bg-[#FFFCF7] dark:bg-[#1A201E] border border-[#C7982F]/25 rounded-2xl shadow-xl z-50 flex flex-col items-stretch overflow-hidden"
              >
                {item.dropdownItems.map((dropItem) => (
                  <button
                    key={dropItem.id}
                    onClick={(e) => { e.stopPropagation(); onItemClick && onItemClick(dropItem); setHoveredItem(null); }}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-[#042821] dark:text-[#FFFCF7] hover:bg-[#C7982F]/15 transition-colors cursor-pointer w-full focus-ring outline-none"
                  >
                    {dropItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
