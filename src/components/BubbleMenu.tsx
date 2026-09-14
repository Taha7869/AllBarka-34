import React, { useState } from 'react';
import { motion } from 'motion/react';

interface BubbleMenuProps {
  items?: { id: string; label: string; path: string }[];
  activeItem?: string;
  onItemClick?: (item: { id: string; label: string; path: string }) => void;
  className?: string;
}

const DEFAULT_ITEMS = [
  { id: 'Home', label: 'Home', path: '/' },
  { id: 'Shop', label: 'Shop', path: '/shop' },
  { id: 'Gift Boxes', label: 'Gift Boxes', path: '/shop/combos' },
  { id: 'Contact', label: 'Contact', path: '/pages/contact' }
];

export default function BubbleMenu({
  items = DEFAULT_ITEMS,
  activeItem = 'Home',
  onItemClick,
  className = ''
}: BubbleMenuProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <nav
      aria-label="Main Navigation"
      className={`rounded-full px-2 py-1 flex items-center gap-1 backdrop-blur-md transition-colors duration-300 select-none pointer-events-auto border border-[#C7982F]/25 bg-[#FFFCF7]/85 dark:bg-[#1A201E]/85 shadow-[0_2px_12px_rgba(41,35,29,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)] ${className}`}
    >
      {items.map((item) => {
        const isActive = activeItem === item.id || activeItem === item.label;
        const isHovered = hoveredItem === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick && onItemClick(item)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            className={`px-3.5 py-1.5 rounded-full text-[11.5px] font-sans font-medium tracking-[0.08em] uppercase relative z-10 transition-colors duration-200 cursor-pointer focus-ring outline-none ${
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
        );
      })}
    </nav>
  );
}
