import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { CANONICAL_CATEGORIES } from '../config/categories';

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
        ...Object.keys(CANONICAL_CATEGORIES).map(id => ({ id, label: t(`shop.${id}`), path: `/shop/${id}` })),
      ],
    },
    { id: 'Herbs & Spices', label: t('catalog.navHerbs'), path: '/shop/herbs-spices' },
    { id: 'Gift Boxes', label: t('giftBoxes', 'Gifting'), path: '/gifting' },
    { id: 'Journal', label: t('journal', 'Journal'), path: '/journal' },
    { id: 'Contact', label: t('contact', 'Contact'), path: '/pages/contact' },
  ];
  const menuItems = items && items.length ? items : defaultItems;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <nav
      aria-label={t('nav.main')}
      className={'pointer-events-auto flex items-center gap-1 rounded-full border border-[#C7982F]/25 bg-[#FFFCF7]/85 px-2 py-1 shadow-[0_2px_12px_rgba(41,35,29,0.04)] backdrop-blur-md transition-colors duration-300 dark:bg-[#1A201E]/85 dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)] ' + className}
    >
      {menuItems.map((item) => {
        const isActive = activeItem === item.id || activeItem === item.label;
        const isHovered = hoveredItem === item.id;
        const itemClass = isActive
          ? 'font-semibold text-[#042821] dark:text-[#FFFCF7]'
          : 'text-[#29231D]/80 hover:text-[#042821] dark:text-[#F6F1EA]/75 dark:hover:text-[#FFFCF7]';

        return (
          <div key={item.id} className="relative" onMouseEnter={() => setHoveredItem(item.id)} onMouseLeave={() => setHoveredItem(null)}>
            <button
              type="button"
              data-nav-path={item.path}
              onClick={() => onItemClick?.(item)}
              className={'focus-ring relative z-10 block cursor-pointer rounded-full px-3 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.07em] outline-none transition-colors duration-200 ' + itemClass}
            >
              {isHovered && !isActive && (
                <motion.div layoutId="bubble-hover" className="absolute inset-0 z-[-1] rounded-full bg-[#C7982F]/10 dark:bg-[#C7982F]/15" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
              )}
              {isActive && (
                <motion.div layoutId="bubble-active" className="absolute inset-0 z-[-1] rounded-full border border-[#C7982F]/40 bg-[#C7982F]/15 shadow-xs dark:bg-[#C7982F]/25" transition={{ type: 'spring', stiffness: 350, damping: 28 }} />
              )}
              <span>{item.label}</span>
            </button>

            {item.dropdownItems && isHovered && (
              <div className="absolute left-1/2 top-full z-50 mt-2 flex min-w-[220px] -translate-x-1/2 flex-col items-stretch overflow-hidden rounded-2xl border border-[#C7982F]/25 bg-[#FFFCF7] py-2 shadow-xl dark:bg-[#1A201E]">
                <span className="px-4 pb-2 pt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#806326] dark:text-[#E4C783]">{t('nav.browse')}</span>
                {item.dropdownItems.map((dropItem) => (
                  <button
                    key={dropItem.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onItemClick?.(dropItem);
                      setHoveredItem(null);
                    }}
                    className="focus-ring w-full cursor-pointer px-4 py-2.5 text-left text-xs font-semibold text-[#042821] outline-none transition-colors hover:bg-[#C7982F]/15 dark:text-[#FFFCF7]"
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
