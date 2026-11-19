import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldCheck, SlidersHorizontal, X, Lock, BarChart3, Megaphone } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useConsent } from '../contexts/ConsentContext';
import { acquireScrollLock } from '../utils/scrollLock';

interface ConsentCopy {
  bannerAria: string;
  bannerTitle: string;
  bannerBody: string;
  cookiePolicy: string;
  acceptAll: string;
  rejectAll: string;
  choosePreferences: string;
  savePreferences: string;
  gpcBadge: string;
  gpcModalNote: string;
  modalTitle: string;
  modalSubtitle: string;
  closeLabel: string;
  alwaysOn: string;
  policyVersionLabel: string;
  essentialTitle: string;
  essentialDesc: string;
  analyticsTitle: string;
  analyticsDesc: string;
  marketingTitle: string;
  marketingDesc: string;
}

const COPY: Record<LanguageCode, ConsentCopy> = {
  en: {
    bannerAria: 'Cookie and privacy preferences',
    bannerTitle: 'Your privacy preferences',
    bannerBody:
      'We use essential storage for your bag, language, theme, and checkout. Optional analytics and marketing scripts only load if you allow them.',
    cookiePolicy: 'Cookie policy',
    acceptAll: 'Accept all',
    rejectAll: 'Reject all',
    choosePreferences: 'Choose preferences',
    savePreferences: 'Save choices',
    gpcBadge: 'GPC signal detected — optional tracking off',
    gpcModalNote:
      'Your browser sent a Global Privacy Control (GPC) signal. Analytics and Marketing default to off unless you explicitly enable them.',
    modalTitle: 'Cookie & Privacy Settings',
    modalSubtitle: 'Choose which optional categories AllBarka may use on this browser.',
    closeLabel: 'Close privacy settings',
    alwaysOn: 'Always on',
    policyVersionLabel: 'Policy version',
    essentialTitle: 'Essential',
    essentialDesc:
      'Required for your shopping bag, checkout, delivery city, currency display, language, dark mode, and secure sign-in. Cannot be turned off.',
    analyticsTitle: 'Analytics',
    analyticsDesc:
      'Helps us understand popular collections and improve store speed using anonymous usage measurements. Off until you allow it.',
    marketingTitle: 'Marketing',
    marketingDesc:
      'Used only if seasonal campaign measurement (such as Meta Pixel) is enabled to understand which gifting offers interest visitors. Off until you allow it.',
  },
  ur: {
    bannerAria: 'کوکی اور رازداری کی ترجیحات',
    bannerTitle: 'آپ کی رازداری کی ترجیحات',
    bannerBody:
      'ہم آپ کے بیگ، زبان، تھیم اور چیک آؤٹ کے لیے ضروری اسٹوریج استعمال کرتے ہیں۔ اختیاری تجزیات اور مارکیٹنگ اسکرپٹس صرف آپ کی اجازت سے لوڈ ہوتے ہیں۔',
    cookiePolicy: 'کوکی پالیسی',
    acceptAll: 'سب قبول کریں',
    rejectAll: 'سب رد کریں',
    choosePreferences: 'پسند چنیں',
    savePreferences: 'پسند محفوظ کریں',
    gpcBadge: 'GPC سگنل فعال — اختیاری ٹریکنگ بند',
    gpcModalNote:
      'آپ کے براؤزر نے Global Privacy Control (GPC) سگنل بھیجا ہے۔ تجزیات اور مارکیٹنگ بائی ڈیفالٹ بند ہیں جب تک آپ خود اجازت نہ دیں۔',
    modalTitle: 'کوکی اور رازداری سیٹنگز',
    modalSubtitle: 'منتخب کریں کہ آل برکہ اس براؤزر پر کون سی اختیاری کیٹیگریز استعمال کر سکتا ہے۔',
    closeLabel: 'رازداری سیٹنگز بند کریں',
    alwaysOn: 'ہمیشہ آن',
    policyVersionLabel: 'پالیسی ورژن',
    essentialTitle: 'ضروری (Essential)',
    essentialDesc:
      'آپ کے شاپنگ بیگ، چیک آؤٹ، شہر، کرنسی، زبان، ڈارک موڈ اور محفوظ سائن اِن کے لیے لازمی۔ اسے بند نہیں کیا جا سکتا۔',
    analyticsTitle: 'تجزیات (Analytics)',
    analyticsDesc:
      'بے نام استعمال کے اعداد و شمار سے اسٹور کی رفتار اور مقبول مصنوعات بہتر بنانے میں مدد ملتی ہے۔ اجازت کے بغیر بند رہتا ہے۔',
    marketingTitle: 'مارکیٹنگ (Marketing)',
    marketingDesc:
      'صرف اس صورت میں استعمال ہوتا ہے جب موسمی آفرز یا کیمپین کی پیمائش (جیسے Meta Pixel) فعال کی جائے۔ اجازت کے بغیر بند رہتا ہے۔',
  },
  ar: {
    bannerAria: 'تفضيلات ملفات الارتباط والخصوصية',
    bannerTitle: 'تفضيلات الخصوصية الخاصة بك',
    bannerBody:
      'نستخدم التخزين الضروري لحقيبة التسوق واللغة والمظهر وإتمام الطلب. لا يتم تحميل نصوص التحليلات أو التسويق الاختيارية إلا بعد موافقتك.',
    cookiePolicy: 'سياسة ملفات الارتباط',
    acceptAll: 'قبول الكل',
    rejectAll: 'رفض الكل',
    choosePreferences: 'تخصيص الخيارات',
    savePreferences: 'حفظ التفضيلات',
    gpcBadge: 'تم رصد إشارة GPC — التتبع الاختياري متوقف',
    gpcModalNote:
      'أرسل متصفحك إشارة التحكم العالمي في الخصوصية (GPC). التحليلات والتسويق متوقفة افتراضيًا ما لم تقم بتفعيلها صراحةً.',
    modalTitle: 'إعدادات ملفات الارتباط والخصوصية',
    modalSubtitle: 'اختر الفئات الاختيارية التي تسمح لألبركة باستخدامها على هذا المتصفح.',
    closeLabel: 'إغلاق إعدادات الخصوصية',
    alwaysOn: 'مفعّلة دائمًا',
    policyVersionLabel: 'إصدار السياسة',
    essentialTitle: 'الضرورية (Essential)',
    essentialDesc:
      'لازمة لعمل حقيبة التسوق وإتمام الطلب ومدينة التوصيل والعملة واللغة والمظهر الداكن وتسجيل الدخول الآمن. لا يمكن إيقافها.',
    analyticsTitle: 'التحليلات (Analytics)',
    analyticsDesc:
      'تساعدنا في فهم المجموعات الأكثر طلبًا وتحسين سرعة المتجر عبر قياسات مجهولة. متوقفة حتى تمنح الموافقة.',
    marketingTitle: 'التسويق (Marketing)',
    marketingDesc:
      'تُستخدم فقط عند تفعيل قياس الحملات الموسمية (مثل Meta Pixel) لمعرفة العروض المناسبة للزوار. متوقفة حتى تمنح الموافقة.',
  },
};

export interface CookieNoticeProps {
  /** Hides the unsolicited bottom banner while checkout, cart bar, or other drawers are active. Never hides the user-opened preferences modal. */
  hidden?: boolean;
  /** Shifts the banner higher when the standalone PWA bottom tab bar is active. */
  hasTabBar?: boolean;
}

/**
 * Full AllBarka Consent Manager replacing the legacy one-button notice.
 * - Equal-size Accept all / Reject all / Choose preferences buttons
 * - Trilingual (EN / UR / AR) preference panel with Essential (locked), Analytics, and Marketing
 * - Respects GPC defaults, policy-version re-consent, reduced motion, dark mode, and mobile safe clearances
 */
export default function CookieNotice({ hidden = false, hasTabBar = false }: CookieNoticeProps) {
  const { language, isRtl } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const {
    categories,
    needsPrompt,
    gpcEnabled,
    policyVersion,
    isPreferencesOpen,
    openPreferences,
    closePreferences,
    acceptAll,
    rejectAll,
    savePreferences,
  } = useConsent();

  const [draftAnalytics, setDraftAnalytics] = useState(categories.analytics);
  const [draftMarketing, setDraftMarketing] = useState(categories.marketing);

  // Sync draft switches whenever the preference modal opens
  useEffect(() => {
    if (isPreferencesOpen) {
      setDraftAnalytics(gpcEnabled && needsPrompt ? false : categories.analytics);
      setDraftMarketing(gpcEnabled && needsPrompt ? false : categories.marketing);
    }
  }, [isPreferencesOpen, categories.analytics, categories.marketing, gpcEnabled, needsPrompt]);

  // Lock background scroll & handle Escape when preferences modal is open
  useEffect(() => {
    if (!isPreferencesOpen) return;
    const release = acquireScrollLock();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePreferences();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      release();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isPreferencesOpen, closePreferences]);

  const words = COPY[language] || COPY.en;
  const dir = isRtl ? 'rtl' : 'ltr';
  const showBanner = needsPrompt && !isPreferencesOpen && !hidden;

  return (
    <>
      {/* 1. Compact Consent Banner — cleared above mobile AI chat button, opposite it on desktop */}
      {showBanner && (
        <motion.aside
          role="region"
          aria-label={words.bannerAria}
          data-consent-banner
          data-storage-notice
          dir={dir}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
          className={`fixed inset-x-3 z-40 sm:inset-x-auto sm:left-5 sm:right-auto sm:w-[29rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[#C7982F]/40 bg-[var(--color-surface,#FFFCF7)] p-4 text-start shadow-[0_14px_40px_rgba(4,40,33,0.18)] dark:bg-[#161D1B] dark:border-[#C7982F]/35 ${
            hasTabBar
              ? 'bottom-[calc(9.25rem+env(safe-area-inset-bottom))] sm:bottom-20'
              : 'bottom-[calc(5.25rem+env(safe-area-inset-bottom))] sm:bottom-5'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E3A2B]/10 text-[#1E3A2B] dark:bg-[#C7982F]/15 dark:text-[#D8B25C]" aria-hidden="true">
              <ShieldCheck size={17} />
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <h2 className="font-serif text-sm font-bold text-[#1E3A2B] dark:text-[#FAF9F5]">
                {words.bannerTitle}
              </h2>
              <p className="text-xs leading-5 text-[#29231D]/85 dark:text-[#E5E0D5]">
                {words.bannerBody}{' '}
                <Link
                  to="/policies/cookies"
                  className="font-semibold text-[#806326] underline underline-offset-2 hover:text-[#1E3A2B] dark:text-[#D8B25C] dark:hover:text-[#FAF9F5] focus-ring"
                >
                  {words.cookiePolicy}
                </Link>
              </p>
              {gpcEnabled && (
                <p
                  data-gpc-indicator
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#1E3A2B]/20 bg-[#1E3A2B]/8 px-2.5 py-0.5 text-[11px] font-medium text-[#1E3A2B] dark:border-[#D8B25C]/30 dark:bg-[#D8B25C]/10 dark:text-[#E6C97F]"
                >
                  <ShieldCheck size={12} aria-hidden="true" />
                  <span>{words.gpcBadge}</span>
                </p>
              )}
            </div>
          </div>

          {/* 3 Equal-Size Choice Buttons (Zero Dark Patterns, >=44px touch targets) */}
          <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              data-consent-action="accept-all"
              onClick={acceptAll}
              className="min-h-[44px] w-full rounded-xl border border-[#1E3A2B] bg-[#1E3A2B] px-3 py-2 text-xs font-semibold text-[#FAF9F5] transition-colors hover:bg-[#152B1F] dark:border-[#C7982F] dark:bg-[#C7982F] dark:text-[#111917] dark:hover:bg-[#D6A942] focus-ring cursor-pointer"
            >
              {words.acceptAll}
            </button>
            <button
              type="button"
              data-consent-action="reject-all"
              onClick={rejectAll}
              className="min-h-[44px] w-full rounded-xl border border-[#1E3A2B] bg-[var(--color-surface,#FFFCF7)] px-3 py-2 text-xs font-semibold text-[#1E3A2B] transition-colors hover:bg-[#F6F1EA] dark:border-[#C7982F]/60 dark:bg-[#1E2724] dark:text-[#FAF9F5] dark:hover:bg-[#27332F] focus-ring cursor-pointer"
            >
              {words.rejectAll}
            </button>
            <button
              type="button"
              data-consent-action="choose-preferences"
              onClick={openPreferences}
              className="min-h-[44px] w-full rounded-xl border border-[#1E3A2B]/40 bg-[#F6F1EA] px-3 py-2 text-xs font-semibold text-[#29231D] transition-colors hover:bg-[#ECE4D6] dark:border-[#C7982F]/40 dark:bg-[#222B28] dark:text-[#FAF9F5] dark:hover:bg-[#2D3834] focus-ring cursor-pointer"
            >
              {words.choosePreferences}
            </button>
          </div>
        </motion.aside>
      )}

      {/* 2. Preference Panel Modal — openable from Banner, Footer "Cookie settings", or /policies/cookies */}
      {isPreferencesOpen && (
        <div
          className="fixed inset-0 z-[12100] flex items-end sm:items-center justify-center p-3 sm:p-5"
          dir={dir}
        >
          <div
            onClick={closePreferences}
            aria-hidden="true"
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-modal-title"
            data-consent-modal
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[#C7982F]/40 bg-[var(--color-surface,#FFFCF7)] text-start text-[#29231D] shadow-2xl dark:bg-[#141B19] dark:border-[#C7982F]/35 dark:text-[#FAF9F5]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#C7982F]/25 bg-[#F6F1EA] px-5 py-4 dark:bg-[#1A2220]">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#806326] dark:text-[#D8B25C]">
                  <SlidersHorizontal size={13} aria-hidden="true" />
                  <span>AllBarka Privacy</span>
                </div>
                <h2
                  id="consent-modal-title"
                  className="font-serif text-xl font-bold text-[#1E3A2B] dark:text-[#FAF9F5]"
                >
                  {words.modalTitle}
                </h2>
                <p className="text-xs text-[#29231D]/80 dark:text-[#D4CEC2]">{words.modalSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={closePreferences}
                aria-label={words.closeLabel}
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-[#C7982F]/35 bg-[var(--color-surface,#FFFCF7)] text-[#29231D] transition-colors hover:bg-[#ECE4D6] dark:bg-[#212B28] dark:text-[#FAF9F5] dark:hover:bg-[#2C3834] focus-ring cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
              {gpcEnabled && (
                <div
                  data-gpc-modal-note
                  className="flex items-start gap-2.5 rounded-2xl border border-[#1E3A2B]/25 bg-[#1E3A2B]/8 p-3 text-xs leading-5 text-[#1E3A2B] dark:border-[#D8B25C]/35 dark:bg-[#D8B25C]/10 dark:text-[#E6C97F]"
                >
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{words.gpcModalNote}</span>
                </div>
              )}

              {/* Category 1: Essential (Always On) */}
              <div className="rounded-2xl border border-[#C7982F]/25 bg-[#F6F1EA]/70 p-4 dark:bg-[#1B2421]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-[#1E3A2B] dark:text-[#D8B25C]" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-[#1E3A2B] dark:text-[#FAF9F5]">
                      {words.essentialTitle}
                    </h3>
                  </div>
                  <span
                    data-consent-essential-badge
                    className="inline-flex min-h-[28px] items-center rounded-full bg-[#1E3A2B]/12 px-3 py-1 text-[11px] font-bold text-[#1E3A2B] dark:bg-[#C7982F]/20 dark:text-[#E6C97F]"
                  >
                    {words.alwaysOn}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#29231D]/85 dark:text-[#D4CEC2]">
                  {words.essentialDesc}
                </p>
              </div>

              {/* Category 2: Analytics */}
              <div className="rounded-2xl border border-[#C7982F]/25 bg-[var(--color-surface,#FFFCF7)] p-4 dark:bg-[#18201E]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#806326] dark:text-[#D8B25C]" aria-hidden="true" />
                    <label
                      htmlFor="consent-toggle-analytics"
                      className="text-sm font-bold text-[#1E3A2B] dark:text-[#FAF9F5] cursor-pointer"
                    >
                      {words.analyticsTitle}
                    </label>
                  </div>
                  <button
                    id="consent-toggle-analytics"
                    type="button"
                    role="switch"
                    aria-checked={draftAnalytics}
                    aria-label={words.analyticsTitle}
                    data-consent-toggle="analytics"
                    onClick={() => setDraftAnalytics((v) => !v)}
                    className="relative inline-flex min-h-[44px] min-w-[56px] items-center justify-center rounded-full px-1 transition-colors focus-ring cursor-pointer"
                  >
                    <span
                      className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                        draftAnalytics
                          ? 'bg-[#1E3A2B] dark:bg-[#C7982F]'
                          : 'bg-[#CFC8BC] dark:bg-[#3A4541]'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                          draftAnalytics
                            ? isRtl
                              ? '-translate-x-5'
                              : 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </span>
                  </button>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-[#29231D]/85 dark:text-[#D4CEC2]">
                  {words.analyticsDesc}
                </p>
              </div>

              {/* Category 3: Marketing */}
              <div className="rounded-2xl border border-[#C7982F]/25 bg-[var(--color-surface,#FFFCF7)] p-4 dark:bg-[#18201E]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Megaphone size={16} className="text-[#806326] dark:text-[#D8B25C]" aria-hidden="true" />
                    <label
                      htmlFor="consent-toggle-marketing"
                      className="text-sm font-bold text-[#1E3A2B] dark:text-[#FAF9F5] cursor-pointer"
                    >
                      {words.marketingTitle}
                    </label>
                  </div>
                  <button
                    id="consent-toggle-marketing"
                    type="button"
                    role="switch"
                    aria-checked={draftMarketing}
                    aria-label={words.marketingTitle}
                    data-consent-toggle="marketing"
                    onClick={() => setDraftMarketing((v) => !v)}
                    className="relative inline-flex min-h-[44px] min-w-[56px] items-center justify-center rounded-full px-1 transition-colors focus-ring cursor-pointer"
                  >
                    <span
                      className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                        draftMarketing
                          ? 'bg-[#1E3A2B] dark:bg-[#C7982F]'
                          : 'bg-[#CFC8BC] dark:bg-[#3A4541]'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                          draftMarketing
                            ? isRtl
                              ? '-translate-x-5'
                              : 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </span>
                  </button>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-[#29231D]/85 dark:text-[#D4CEC2]">
                  {words.marketingDesc}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#5C554C] dark:text-[#AFA89C]">
                <span>
                  {words.policyVersionLabel}: <code className="font-mono font-semibold">{policyVersion}</code>
                </span>
                <Link
                  to="/policies/cookies"
                  onClick={closePreferences}
                  className="font-semibold text-[#806326] underline underline-offset-2 hover:text-[#1E3A2B] dark:text-[#D8B25C] dark:hover:text-[#FAF9F5] focus-ring"
                >
                  {words.cookiePolicy}
                </Link>
              </div>
            </div>

            {/* Footer: 3 Equal-Size Buttons */}
            <div className="grid grid-cols-1 gap-2 border-t border-[#C7982F]/25 bg-[#F6F1EA] px-5 py-4 sm:grid-cols-3 dark:bg-[#1A2220]">
              <button
                type="button"
                data-consent-modal-action="reject-all"
                onClick={rejectAll}
                className="min-h-[44px] w-full rounded-xl border border-[#1E3A2B] bg-[var(--color-surface,#FFFCF7)] px-3 py-2 text-xs font-semibold text-[#1E3A2B] transition-colors hover:bg-[#ECE4D6] dark:border-[#C7982F]/60 dark:bg-[#1E2724] dark:text-[#FAF9F5] dark:hover:bg-[#27332F] focus-ring cursor-pointer"
              >
                {words.rejectAll}
              </button>
              <button
                type="button"
                data-consent-modal-action="save-preferences"
                onClick={() => savePreferences({ analytics: draftAnalytics, marketing: draftMarketing })}
                className="min-h-[44px] w-full rounded-xl border border-[#1E3A2B]/40 bg-[#EFE8DC] px-3 py-2 text-xs font-semibold text-[#29231D] transition-colors hover:bg-[#E4DAC8] dark:border-[#C7982F]/45 dark:bg-[#26312D] dark:text-[#FAF9F5] dark:hover:bg-[#313F3A] focus-ring cursor-pointer"
              >
                {words.savePreferences}
              </button>
              <button
                type="button"
                data-consent-modal-action="accept-all"
                onClick={acceptAll}
                className="min-h-[44px] w-full rounded-xl border border-[#1E3A2B] bg-[#1E3A2B] px-3 py-2 text-xs font-semibold text-[#FAF9F5] transition-colors hover:bg-[#152B1F] dark:border-[#C7982F] dark:bg-[#C7982F] dark:text-[#111917] dark:hover:bg-[#D6A942] focus-ring cursor-pointer"
              >
                {words.acceptAll}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
