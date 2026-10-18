import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'motion/react';
import { 
  X, 
  ShoppingBag, 
  Crown,
  Bell,
  Sparkles, 
  BookOpen, 
  MessageCircle, 
  Instagram, 
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { AllBarkaCrestVector } from './AllBarkaLogo';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { acquireScrollLock } from '../utils/scrollLock';
import { buildHumanSupportWhatsAppUrl } from '../config/contacts';
import { CANONICAL_CATEGORIES } from '../config/categories';
import { MAIN_NAV_ITEMS, COMPACT_FOOD_NAV_ITEMS } from '../config/navigation';
import { openCustomQuoteModal } from './CustomQuoteModal';
import { catalogTranslations } from '../contexts/catalogTranslations';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  cartCount?: number;
  onOpenCart?: () => void;
  onNavItemClick?: (item: string) => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function MobileMenu({ 
  isOpen, 
  onClose, 
  cartCount = 0, 
  onOpenCart, 
  onNavItemClick,
  triggerRef
}: MobileMenuProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, isRtl, t } = useLanguage();
  const { currentUser, patronProfile, logout } = useAuth();
  const reduceMotion = useReducedMotion();
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    shop: false,
    gifting: false,
    'celebration-boxes': false,
    occasions: false,
    deals: false,
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus management & Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef?.current?.focus();
      } else if (e.key === 'Tab') {
        const controls = containerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || !containerRef.current?.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !containerRef.current?.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  // Reference-counted background scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const releaseLock = acquireScrollLock();
    return () => {
      releaseLock();
    };
  }, [isOpen]);

  const handleDestination = (path: string, itemLabel?: string) => {
    onClose();
    if (itemLabel && onNavItemClick) onNavItemClick(itemLabel);
    navigate(path);
    triggerRef?.current?.focus();
  };

  const handleAuthAction = () => {
    onClose();
    if (currentUser) {
      window.dispatchEvent(new CustomEvent('open-patron-lounge'));
    } else {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
    }
  };

  const handleCartAction = () => {
    onClose();
    if (onOpenCart) {
      onOpenCart();
    } else {
      navigate('/cart');
    }
    triggerRef?.current?.focus();
  };

  const backdropVariants: Variants = {
    closed: { opacity: 0, transition: { duration: reduceMotion ? 0 : 0.25 } },
    open: { opacity: 1, transition: { duration: reduceMotion ? 0 : 0.25 } }
  };

  const drawerVariants: Variants = {
    closed: { 
      x: reduceMotion ? 0 : isRtl ? '100%' : '-100%',
      transition: { duration: reduceMotion ? 0 : 0.3, ease: [0.32, 0.72, 0, 1] }
    },
    open: { 
      x: 0, 
      transition: { duration: reduceMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          id="mobile-navigation-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.main')}
          className="fixed inset-0 z-[120] flex xl:hidden"
        >
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
            className="fixed inset-0 bg-[#042821]/60 dark:bg-black/75 backdrop-blur-xs"
          />

          {/* Slide-out Drawer Panel */}
          <motion.div
            ref={containerRef}
            variants={drawerVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="relative w-[85vw] max-w-[340px] h-full bg-[#FFFCF7] dark:bg-[#1A201E] border-r border-[#C7982F]/25 dark:border-[#C7982F]/20 shadow-2xl flex flex-col z-10 overflow-hidden text-[#29231D] dark:text-[#F6F1EA]"
          >
            {/* Header / Brand in Drawer */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#29231D]/10 dark:border-[#F6F1EA]/10 bg-[#F6F1EA]/70 dark:bg-[#121615]/70 shrink-0">
              <div 
                onClick={() => handleDestination('/', 'Home')}
                className="flex items-center gap-2 cursor-pointer focus-ring rounded-lg p-1 -m-1"
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <AllBarkaCrestVector />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-serif font-bold text-[#042821] dark:text-[#FFFCF7] leading-none">
                    AllBarka
                  </span>
                  <span className="text-[7px] font-sans font-semibold uppercase tracking-[0.2em] text-[#806326] dark:text-[#C7982F] leading-none mt-0.5">
                    BOUTIQUE
                  </span>
                </div>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="w-11 h-11 rounded-full flex items-center justify-center text-[#29231D] dark:text-[#F6F1EA] hover:bg-[#C7982F]/15 border border-[#29231D]/10 dark:border-[#F6F1EA]/12 transition-colors focus-ring cursor-pointer"
                aria-label={t('nav.closeMenu')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Scrollable Content Body - STRICT ORDER FROM MASTER PROMPT:
                1. Account / Login (or signed-in customer profile)
                2. Cart with live item count & link to cart drawer/page
                3. Language selector: English, اردو, العربية
                4. Theme selector: Light, Dark, Auto
                5. Our Collections links
                6. Social buttons: WhatsApp and Instagram
            */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 overscroll-contain">
              
              {/* 1. Account / Login (or signed-in patron profile) */}
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-[#806326] dark:text-[#C7982F] block mb-2 px-1">
                  {currentUser ? t('patronProfile', 'Patron Profile') : t('patronLounge', 'Patron Lounge')}
                </span>
                <button
                  type="button"
                  onClick={handleAuthAction}
                  className="w-full min-h-[48px] flex items-center justify-between p-3 rounded-xl bg-[#F6F1EA] dark:bg-[#222A28] border border-[#C7982F]/35 hover:border-[#C7982F] transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-[#C7982F]/20 flex items-center justify-center shrink-0">
                      <Crown size={15} className="text-[#C7982F]" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#042821] dark:text-[#FFFCF7] truncate">
                        {currentUser ? (patronProfile?.name || t('patronAccount', 'Patron Account')) : t('vipLogin', 'Patron VIP Lounge')}
                      </div>
                      <div className="text-[10px] text-[#806326] dark:text-[#C7982F] truncate">
                        {currentUser ? t('loyaltyPerks', 'View loyalty perks & tier') : t('signInPrompt', 'Sign in for faster checkout')}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-[#C7982F] shrink-0 rtl:rotate-180" />
                </button>
                <button type="button" onClick={() => { onClose(); requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('open-store-updates'))); }} className="focus-ring mt-2 flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-[#C7982F]/25 px-4 py-3 text-left text-xs font-semibold">
                  <Bell size={16} className="text-[#C7982F]" aria-hidden="true" /><span dir="auto">{t('updates.open')}</span>
                </button>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                        logout();
                        onClose();
                    }}
                    className="w-full mt-2 min-h-[44px] flex items-center justify-center p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 font-bold transition-all text-left cursor-pointer text-xs"
                  >
                    {t('sign_out', 'Sign Out')}
                  </button>
                )}
              </div>

              {/* 2. Cart with live item count & working link */}
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-[#806326] dark:text-[#C7982F] block mb-2 px-1">
                  {t('shoppingBag', 'Shopping Bag')}
                </span>
                <button
                  type="button"
                  onClick={handleCartAction}
                  className="w-full min-h-[48px] flex items-center justify-between px-4 py-3 rounded-xl border border-[#29231D]/15 dark:border-[#F6F1EA]/15 bg-[#FFFCF7] dark:bg-[#1A201E] hover:bg-[#C7982F]/10 transition-colors text-left cursor-pointer shadow-xs"
                >
                  <span className="flex items-center gap-2.5 text-xs font-bold text-[#042821] dark:text-[#FFFCF7]">
                    <ShoppingBag size={16} className="text-[#C7982F]" />
                    {t('reviewCart', 'Review Cart & Checkout')}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#C7982F] text-[#042821]">
                    {cartCount}
                  </span>
                </button>
              </div>

              {/* 3. Language selector: English, اردو, العربية */}
              <div className="border-t border-[#29231D]/8 dark:border-[#F6F1EA]/8 pt-4">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-[#806326] dark:text-[#C7982F] block mb-2 px-1">
                  {t('languageSelector', 'Language / زبان / اللغة')}
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#F6F1EA] dark:bg-[#222A28] border border-[#29231D]/8 dark:border-[#F6F1EA]/10">
                  {(['en', 'ur', 'ar'] as LanguageCode[]).map((lang) => {
                    const isSelected = language === lang;
                    const labels: Record<LanguageCode, string> = {
                      en: 'English',
                      ur: 'اردو',
                      ar: 'العربية'
                    };
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setLanguage(lang)}
                        lang={lang}
                        dir={lang === 'en' ? 'ltr' : 'rtl'}
                        aria-pressed={isSelected}
                        className={`min-h-[44px] py-2 px-2 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#042821] text-[#FFFCF7] dark:bg-[#C7982F] dark:text-[#042821] shadow-xs'
                            : 'text-[#29231D]/70 dark:text-[#F6F1EA]/70 hover:text-[#042821] dark:hover:text-[#FFFCF7]'
                        }`}
                      >
                        {labels[lang]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Theme selector: Light, Dark, Auto */}
              <div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-[#806326] dark:text-[#C7982F] block mb-2 px-1">
                  {t('appearanceMode', 'Appearance Mode')}
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#F6F1EA] dark:bg-[#222A28] border border-[#29231D]/8 dark:border-[#F6F1EA]/10">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    aria-pressed={theme === 'light'}
                    className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-[#FFFCF7] text-[#042821] border border-[#C7982F]/40 shadow-xs'
                        : 'text-[#29231D]/70 dark:text-[#F6F1EA]/70 hover:text-[#042821] dark:hover:text-[#FFFCF7]'
                    }`}
                  >
                    <Sun size={14} className="text-[#C7982F]" />
                    <span>{t('nav.light')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    aria-pressed={theme === 'dark'}
                    className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#121615] text-[#FFFCF7] border border-[#C7982F]/40 shadow-xs'
                        : 'text-[#29231D]/70 dark:text-[#F6F1EA]/70 hover:text-[#042821] dark:hover:text-[#FFFCF7]'
                    }`}
                  >
                    <Moon size={14} className="text-[#C7982F]" />
                    <span>{t('nav.dark')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    aria-pressed={theme === 'system'}
                    className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      theme === 'system'
                        ? 'bg-[#042821] text-[#FFFCF7] dark:bg-[#C7982F] dark:text-[#042821] shadow-xs'
                        : 'text-[#29231D]/70 dark:text-[#F6F1EA]/70 hover:text-[#042821] dark:hover:text-[#FFFCF7]'
                    }`}
                  >
                    <Laptop size={14} />
                    <span>{t('nav.auto')}</span>
                  </button>
                </div>
              </div>

              {/* 5. Navigation Accordion & Compact Food Row */}
              <div className="border-t border-[#29231D]/8 dark:border-[#F6F1EA]/8 pt-4">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-[#806326] dark:text-[#C7982F] block mb-2 px-1">
                  {t('ourCollections', 'Our Collections')}
                </span>

                {/* Accessible Accordion for Main Navigation */}
                <div className="space-y-1">
                  {MAIN_NAV_ITEMS.map((item) => {
                    const isExpanded = !!expandedSections[item.id];

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#29231D]/8 dark:border-[#F6F1EA]/10 overflow-hidden bg-[#FFFCF7] dark:bg-[#1A201E]"
                      >
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`mobile-nav-panel-${item.id}`}
                          onClick={() => toggleSection(item.id)}
                          className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-[#042821] dark:text-[#FFFCF7] hover:bg-[#C7982F]/10 transition-colors text-start cursor-pointer"
                        >
                          <span className="uppercase tracking-wider">{t(item.labelKey, item.defaultLabel)}</span>
                          <ChevronDown
                            size={14}
                            className={`text-[#C7982F] transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        <div
                          id={`mobile-nav-panel-${item.id}`}
                          role="region"
                          hidden={!isExpanded}
                          className={`px-2 pb-2.5 pt-1 space-y-0.5 bg-[#F6F1EA]/40 dark:bg-[#121615]/50 border-t border-[#29231D]/6 dark:border-[#F6F1EA]/6 ${
                            isExpanded ? 'block' : 'hidden'
                          }`}
                        >
                          {item.dropdownItems?.map((drop) => {
                            // Ensure backwards-compatible label matching for test suites
                            const labelText =
                              drop.id === 'herbs-spices'
                                ? catalogTranslations[language]?.['shop.herbs-spices'] || t('shop.herbs-spices', drop.defaultLabel)
                                : drop.id === 'curated-bundles'
                                ? catalogTranslations[language]?.['shop.bundles'] || t('shop.bundles', drop.defaultLabel)
                                : t(drop.labelKey, drop.defaultLabel);

                            return drop.action ? (
                              <button
                                key={drop.id}
                                type="button"
                                data-nav-path={drop.path}
                                onClick={() => {
                                  onClose();
                                  if (drop.action === 'open-hamper-builder') {
                                    window.dispatchEvent(new CustomEvent('open-hamper-builder'));
                                  } else if (drop.action === 'open-custom-quote') {
                                    openCustomQuoteModal({ mode: 'filled', quantity: 50 });
                                  }
                                }}
                                className="w-full min-h-[38px] flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-[#29231D]/85 dark:text-[#F6F1EA]/85 hover:bg-[#C7982F]/15 hover:text-[#042821] dark:hover:text-[#FFFCF7] transition-colors text-start cursor-pointer"
                              >
                                <span className="truncate">{labelText}</span>
                                {drop.badge ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#C7982F]/20 text-[#806326] dark:text-[#E4C783]">
                                    {drop.badge}
                                  </span>
                                ) : (
                                  <ChevronRight size={12} className="text-[#C7982F]/50 shrink-0 rtl:rotate-180" />
                                )}
                              </button>
                            ) : (
                              <Link
                                key={drop.id}
                                to={drop.path}
                                data-nav-path={drop.path}
                                onClick={() => {
                                  onClose();
                                  if (onNavItemClick) onNavItemClick(labelText);
                                }}
                                className="w-full min-h-[38px] flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-[#29231D]/85 dark:text-[#F6F1EA]/85 hover:bg-[#C7982F]/15 hover:text-[#042821] dark:hover:text-[#FFFCF7] transition-colors text-start cursor-pointer"
                              >
                                <span className="truncate">{labelText}</span>
                                {drop.badge ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#C7982F]/20 text-[#806326] dark:text-[#E4C783]">
                                    {drop.badge}
                                  </span>
                                ) : (
                                  <ChevronRight size={12} className="text-[#C7982F]/50 shrink-0 rtl:rotate-180" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Compact Food Categories Quick Navigation */}
                <div className="mt-4 pt-3 border-t border-[#29231D]/8 dark:border-[#F6F1EA]/8">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-[#806326] dark:text-[#C7982F] block mb-2 px-1">
                    {t('nav.foodRow', 'Compact Food Categories')}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {COMPACT_FOOD_NAV_ITEMS.map((food) => {
                      const foodLabel =
                        food.id === 'herbs-spices'
                          ? catalogTranslations[language]?.['shop.herbs-spices'] || t('shop.herbs-spices', food.defaultLabel)
                          : t(food.labelKey, food.defaultLabel);

                      return (
                        <Link
                          key={food.id}
                          to={food.path}
                          data-nav-path={food.path}
                          onClick={() => {
                            onClose();
                            if (onNavItemClick) onNavItemClick(foodLabel);
                          }}
                          className="min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl bg-[#F6F1EA]/70 dark:bg-[#222A28]/70 border border-[#C7982F]/20 hover:border-[#C7982F] text-xs font-semibold text-[#042821] dark:text-[#FFFCF7] text-start transition-all cursor-pointer"
                        >
                          <span className="truncate">{foodLabel}</span>
                          <ChevronRight size={11} className="text-[#C7982F] shrink-0 rtl:rotate-180" />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Boutique Pages */}
                <div className="mt-4 space-y-1">
                  <Link
                    to="/journal"
                    onClick={() => onClose()}
                    className="w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#29231D]/85 dark:text-[#F6F1EA]/85 hover:bg-[#C7982F]/10 transition-colors text-start cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <BookOpen size={13} className="text-[#C7982F]" />
                      {t('journal', 'The Harvest Chronicle')}
                    </span>
                    <ChevronRight size={13} className="text-[#C7982F]/50 rtl:rotate-180" />
                  </Link>
                </div>
              </div>

              {/* 6. Social buttons: WhatsApp and Instagram */}
              <div className="border-t border-[#29231D]/8 dark:border-[#F6F1EA]/8 pt-4 pb-4">
                <span className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-[#806326] dark:text-[#C7982F] block mb-2 px-1">
                  {t('connectWithUs', 'Connect With Us')}
                </span>
                <div className="flex gap-2">
                  <a
                    href={buildHumanSupportWhatsAppUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#29231D]/12 dark:border-[#F6F1EA]/15 bg-[#F6F1EA] dark:bg-[#222A28] text-xs font-bold text-[#042821] dark:text-[#FFFCF7] hover:bg-[#FFFCF7] transition-all"
                  >
                    <MessageCircle size={16} className="text-[#25D366]" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href="https://www.instagram.com/allbarka.pk"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#29231D]/12 dark:border-[#F6F1EA]/15 bg-[#F6F1EA] dark:bg-[#222A28] text-xs font-bold text-[#042821] dark:text-[#FFFCF7] hover:bg-[#FFFCF7] transition-all"
                  >
                    <Instagram size={16} className="text-[#E4405F]" />
                    <span>Instagram</span>
                  </a>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
