import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Gift, MessageCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MAIN_NAV_ITEMS, COMPACT_FOOD_NAV_ITEMS, NavItem, NavSubItem, FoodCategoryItem } from '../config/navigation';
import { openCustomQuoteModal } from './CustomQuoteModal';

export interface BubbleMenuItem {
  id: string;
  label: string;
  path: string;
  dropdownItems?: { id: string; label: string; path: string }[];
}

export interface BubbleMenuProps {
  items?: BubbleMenuItem[];
  activeItem?: string;
  onItemClick?: (item: { id: string; label: string; path: string }) => void;
  className?: string;
  showFoodRow?: boolean;
}

export default function BubbleMenu({
  items,
  activeItem,
  onItemClick,
  className = '',
  showFoodRow = true,
}: BubbleMenuProps) {
  const { t, isRtl } = useLanguage();
  const location = useLocation();

  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navContainerRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Cancel any pending close timer
  const cancelCloseDelay = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Grace period before closing: prevents premature dismissal during slow or diagonal mouse movement
  const scheduleCloseDelay = useCallback((delayMs = 220) => {
    cancelCloseDelay();
    closeTimeoutRef.current = setTimeout(() => {
      setOpenId(null);
    }, delayMs);
  }, [cancelCloseDelay]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      cancelCloseDelay();
    };
  }, [cancelCloseDelay]);

  // Outside pointer click dismisses open dropdown
  useEffect(() => {
    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(event.target as Node)) {
        cancelCloseDelay();
        setOpenId(null);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
    };
  }, [cancelCloseDelay]);

  // Focus-out dismisses dropdown when focus leaves entire navigation container
  const handleContainerBlur = (event: React.FocusEvent) => {
    if (!navContainerRef.current?.contains(event.relatedTarget as Node)) {
      cancelCloseDelay();
      setOpenId(null);
    }
  };

  // Keyboard navigation & Escape focus restoration
  const handleKeyDown = (event: React.KeyboardEvent, itemId: string) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelCloseDelay();
      setOpenId(null);
      triggerRefs.current[itemId]?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      cancelCloseDelay();
      setOpenId((prev) => (prev === itemId ? null : itemId));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      cancelCloseDelay();
      setOpenId(itemId);
      // Defer focus to first menu item in dropdown
      requestAnimationFrame(() => {
        const panel = document.getElementById(`nav-dropdown-panel-${itemId}`);
        const firstLink = panel?.querySelector<HTMLElement>('a, button');
        firstLink?.focus();
      });
    }
  };

  // Resolve active path / item
  const currentPath = location.pathname;

  const isMainItemActive = (item: NavItem): boolean => {
    if (activeItem && (activeItem.toLowerCase() === item.id.toLowerCase() || activeItem === item.defaultLabel)) {
      return true;
    }
    if (item.path === '/shop' && currentPath === '/shop') return true;
    if (item.path !== '/shop' && currentPath.startsWith(item.path)) return true;
    if (item.dropdownItems?.some((sub) => sub.path.split('?')[0] === currentPath)) return true;
    return false;
  };

  const isFoodItemActive = (item: FoodCategoryItem): boolean => {
    return currentPath === item.path || currentPath === `/category/${item.slug}`;
  };

  // Execute sub-item custom action if defined
  const handleSubItemClick = (subItem: NavSubItem) => {
    cancelCloseDelay();
    setOpenId(null);
    if (subItem.action === 'open-hamper-builder') {
      window.dispatchEvent(new CustomEvent('open-hamper-builder'));
    } else if (subItem.action === 'open-custom-quote') {
      openCustomQuoteModal({ mode: 'filled', quantity: 50 });
    }
    onItemClick?.({ id: subItem.id, label: t(subItem.labelKey, subItem.defaultLabel), path: subItem.path });
  };

  // Build items list (either from props or canonical configuration)
  const mainNavItems: NavItem[] = items && items.length > 0
    ? items.map((it) => ({
        id: it.id,
        labelKey: `nav.${it.id.toLowerCase()}`,
        defaultLabel: it.label,
        path: it.path,
        hasDropdown: !!(it.dropdownItems && it.dropdownItems.length > 0),
        dropdownItems: it.dropdownItems?.map((drop) => ({
          id: drop.id,
          labelKey: `nav.${drop.id}`,
          defaultLabel: drop.label,
          path: drop.path,
        })),
      }))
    : MAIN_NAV_ITEMS;

  return (
    <nav
      ref={navContainerRef}
      aria-label={t('nav.main', 'Main navigation')}
      onBlur={handleContainerBlur}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`pointer-events-auto flex flex-col items-center gap-1.5 transition-colors duration-300 ${className}`}
    >
      {/* LEVEL 1: Main Navigation Row */}
      <div className="flex items-center gap-1 rounded-full border border-[#C7982F]/25 bg-[#FFFCF7]/90 px-3 py-1 shadow-[0_2px_12px_rgba(41,35,29,0.04)] backdrop-blur-md dark:bg-[#1A201E]/90 dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
        {mainNavItems.map((item) => {
          const isOpen = openId === item.id;
          const isActive = isMainItemActive(item);

          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => {
                cancelCloseDelay();
                setOpenId(item.id);
              }}
              onMouseLeave={() => {
                scheduleCloseDelay(220);
              }}
            >
              {item.hasDropdown ? (
                <button
                  ref={(el) => { triggerRefs.current[item.id] = el; }}
                  id={`nav-trigger-${item.id}`}
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  aria-controls={`nav-dropdown-panel-${item.id}`}
                  data-nav-path={item.path}
                  onClick={() => {
                    cancelCloseDelay();
                    setOpenId((prev) => (prev === item.id ? null : item.id));
                  }}
                  onKeyDown={(e) => handleKeyDown(e, item.id)}
                  className={`focus-ring group relative z-10 flex cursor-pointer items-center gap-1 rounded-full px-3.5 py-1.5 font-sans text-[11px] font-semibold tracking-[0.06em] outline-none transition-all duration-200 ${
                    isActive
                      ? 'border border-[#C7982F]/40 bg-[#C7982F]/15 text-[#042821] shadow-xs dark:bg-[#C7982F]/25 dark:text-[#FFFCF7]'
                      : 'text-[#29231D]/80 hover:bg-[#C7982F]/10 hover:text-[#042821] dark:text-[#F6F1EA]/80 dark:hover:bg-[#C7982F]/15 dark:hover:text-[#FFFCF7]'
                  }`}
                >
                  <span className="uppercase">{t(item.labelKey, item.defaultLabel)}</span>
                  <ChevronDown
                    size={12}
                    className={`text-[#C7982F] transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <Link
                  to={item.path}
                  data-nav-path={item.path}
                  onClick={() => {
                    cancelCloseDelay();
                    setOpenId(null);
                    onItemClick?.({ id: item.id, label: t(item.labelKey, item.defaultLabel), path: item.path });
                  }}
                  className={`focus-ring relative z-10 block cursor-pointer rounded-full px-3.5 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.06em] outline-none transition-all duration-200 ${
                    isActive
                      ? 'border border-[#C7982F]/40 bg-[#C7982F]/15 text-[#042821] shadow-xs dark:bg-[#C7982F]/25 dark:text-[#FFFCF7]'
                      : 'text-[#29231D]/80 hover:bg-[#C7982F]/10 hover:text-[#042821] dark:text-[#F6F1EA]/80 dark:hover:bg-[#C7982F]/15 dark:hover:text-[#FFFCF7]'
                  }`}
                >
                  <span>{t(item.labelKey, item.defaultLabel)}</span>
                </Link>
              )}

              {/* DROPDOWN PANEL with Continuous Pointer Bridge & Focus Restoration */}
              {item.hasDropdown && isOpen && (
                <div
                  id={`nav-dropdown-panel-${item.id}`}
                  role="menu"
                  aria-labelledby={`nav-trigger-${item.id}`}
                  onMouseEnter={cancelCloseDelay}
                  onMouseLeave={() => scheduleCloseDelay(220)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelCloseDelay();
                      setOpenId(null);
                      triggerRefs.current[item.id]?.focus();
                    }
                  }}
                  className="absolute left-1/2 top-full z-[150] mt-1.5 w-64 -translate-x-1/2 rounded-2xl border border-[#C7982F]/25 bg-[#FFFCF7] p-2 shadow-2xl backdrop-blur-xl dark:border-[#C7982F]/20 dark:bg-[#1A201E]"
                >
                  {/* Invisible pointer bridge connecting trigger and panel */}
                  <div
                    className="absolute -top-3 inset-x-0 h-4 bg-transparent pointer-events-auto"
                    aria-hidden="true"
                  />

                  {/* Header / Eyebrow */}
                  <div className="px-3 py-1.5 border-b border-[#29231D]/10 dark:border-[#F6F1EA]/10 mb-1">
                    <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#806326] dark:text-[#C7982F]">
                      {t(item.labelKey, item.defaultLabel)}
                    </span>
                  </div>

                  {/* Dropdown Items (semantic links/buttons) */}
                  <div className="flex flex-col space-y-0.5">
                    {item.dropdownItems?.map((dropItem) => (
                      <Link
                        key={dropItem.id}
                        to={dropItem.path}
                        role="menuitem"
                        data-nav-path={dropItem.path}
                        onClick={() => handleSubItemClick(dropItem)}
                        className="focus-ring flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-[#042821] transition-colors hover:bg-[#C7982F]/15 dark:text-[#FFFCF7] dark:hover:bg-[#C7982F]/20"
                      >
                        <span className="truncate">{t(dropItem.labelKey, dropItem.defaultLabel)}</span>
                        {dropItem.badge && (
                          <span className="rounded-full bg-[#C7982F]/20 px-2 py-0.5 text-[9px] font-bold text-[#806326] dark:text-[#E4C783]">
                            {dropItem.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* LEVEL 2: Compact Food Row (Desktop only) */}
      {showFoodRow && (
        <div
          role="navigation"
          aria-label={t('nav.foodRow', 'Compact food categories')}
          className="hidden lg:flex items-center gap-4 px-2 py-0.5 text-[11px] font-medium tracking-wide"
        >
          {COMPACT_FOOD_NAV_ITEMS.map((food, index) => {
            const isFoodActive = isFoodItemActive(food);

            return (
              <React.Fragment key={food.id}>
                {index > 0 && (
                  <span className="text-[#C7982F]/40 select-none text-[9px]" aria-hidden="true">
                    •
                  </span>
                )}
                <Link
                  to={food.path}
                  data-nav-path={food.path}
                  className={`focus-ring transition-colors duration-150 py-0.5 cursor-pointer ${
                    isFoodActive
                      ? 'border-b-2 border-[#C7982F] font-bold text-[#806326] dark:text-[#E4C783]'
                      : 'text-[#29231D]/75 hover:text-[#042821] dark:text-[#F6F1EA]/75 dark:hover:text-[#FFFCF7]'
                  }`}
                >
                  {food.id === 'herbs-spices'
                    ? t('catalog.navHerbs', t(food.labelKey, food.defaultLabel))
                    : t(food.labelKey, food.defaultLabel)}
                </Link>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </nav>
  );
}
