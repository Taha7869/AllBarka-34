import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePrefersReducedMotion as useReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import {
  IOS_A2HS_DISMISSED_KEY,
  PWA_DISMISSED_KEY,
  isIosSafari,
  isStandaloneDisplayMode,
} from '../lib/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const IOS_COPY: Record<
  LanguageCode,
  { title: string; step1: string; step2: string; gotIt: string; close: string }
> = {
  en: {
    title: 'Add AllBarka to your Home Screen',
    step1: 'Tap the Share button in Safari',
    step2: 'Choose "Add to Home Screen"',
    gotIt: 'Got it',
    close: 'Dismiss install guide',
  },
  ur: {
    title: 'آل برکہ کو ہوم اسکرین پر لگائیں',
    step1: 'سفاری میں نیچے Share بٹن دبائیں',
    step2: '"Add to Home Screen" منتخب کریں',
    gotIt: 'سمجھ گیا',
    close: 'رہنمائی بند کریں',
  },
  ar: {
    title: 'أضف ألبركة إلى الشاشة الرئيسية',
    step1: 'اضغط على زر المشاركة في سفاري',
    step2: 'اختر «إضافة إلى الشاشة الرئيسية»',
    gotIt: 'حسنًا',
    close: 'إغلاق الدليل',
  },
};

export interface PwaInstallBannerProps {
  hidden?: boolean;
  /** Optional override for deterministic testing of iOS Safari guidance. */
  forceIosSafari?: boolean;
}

export default function PwaInstallBanner({ hidden = false, forceIosSafari }: PwaInstallBannerProps) {
  const { t, isRtl, language } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<'none' | 'prompt' | 'ios'>('none');

  useEffect(() => {
    // Never show when already installed in standalone mode
    if (isStandaloneDisplayMode()) {
      return;
    }

    // 1. iOS Safari one-time guide (strictly Safari on iOS, never Chrome/Firefox/Android)
    const iosDetected = forceIosSafari !== undefined ? forceIosSafari : isIosSafari();
    if (iosDetected) {
      try {
        if (localStorage.getItem(IOS_A2HS_DISMISSED_KEY) === '1') return;
      } catch {
        return;
      }
      setMode('ios');
      return;
    }

    // 2. Standard beforeinstallprompt flow (Android / Desktop Chromium)
    try {
      if (localStorage.getItem(PWA_DISMISSED_KEY) === '1') {
        return;
      }
    } catch {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode('prompt');
    };

    const handleAppInstalled = () => {
      try {
        localStorage.setItem(PWA_DISMISSED_KEY, '1');
      } catch {
        // Storage disabled
      }
      setMode('none');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [forceIosSafari]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(mode === 'ios' ? IOS_A2HS_DISMISSED_KEY : PWA_DISMISSED_KEY, '1');
    } catch {
      // Storage disabled
    }
    setMode('none');
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          try {
            localStorage.setItem(PWA_DISMISSED_KEY, '1');
          } catch {
            // Storage disabled
          }
        }
      } catch {
        // Prompt error
      }
      setDeferredPrompt(null);
    }
    handleDismiss();
  };

  if (mode === 'none' || hidden) {
    return null;
  }

  const iosWords = IOS_COPY[language] || IOS_COPY.en;
  const motionClass = prefersReducedMotion ? '' : 'transition-all duration-300';

  if (mode === 'ios') {
    return (
      <aside
        role="region"
        aria-label={iosWords.title}
        data-ios-a2hs-banner
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] inset-x-3 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-sm z-40 rounded-2xl border border-[#C7982F]/40 bg-[var(--color-surface,#FFFCF7)] p-4 text-start shadow-[0_12px_40px_rgba(4,40,33,0.18)] dark:bg-[#1A2220] ${motionClass}`}
      >
        <div className="flex items-start gap-3">
          <img
            src="/icon-192.png"
            alt="AllBarka"
            className="h-11 w-11 shrink-0 rounded-xl border border-[#C7982F]/30 object-cover"
            width="44"
            height="44"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-serif text-sm font-bold text-[#042821] dark:text-[#FAF9F5]">
                {iosWords.title}
              </h3>
              <button
                type="button"
                data-ios-a2hs-dismiss
                onClick={handleDismiss}
                aria-label={iosWords.close}
                className="flex min-h-[36px] min-w-[36px] -mt-1.5 -me-1.5 items-center justify-center rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white focus-ring cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <ol className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-200">
              <li className="flex items-center gap-2">
                <Share size={14} className="shrink-0 text-[#806326] dark:text-[#D8B25C]" aria-hidden="true" />
                <span>{iosWords.step1}</span>
              </li>
              <li className="flex items-center gap-2">
                <PlusSquare size={14} className="shrink-0 text-[#806326] dark:text-[#D8B25C]" aria-hidden="true" />
                <span>{iosWords.step2}</span>
              </li>
            </ol>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="min-h-[44px] rounded-full bg-[#1E3A2B] px-4 py-2 text-xs font-bold text-[#FAF9F5] transition-colors hover:bg-[#152B1F] dark:bg-[#C7982F] dark:text-[#111917] focus-ring cursor-pointer"
              >
                {iosWords.gotIt}
              </button>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      role="banner"
      aria-label={t('pwa.installTitle', 'Home Screen par lagayein')}
      data-pwa-install-banner
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] inset-x-3 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-md z-40 bg-[var(--color-surface,#FFFCF7)] dark:bg-[#1A2220] border border-[#C7982F]/40 rounded-2xl p-4 shadow-[0_12px_40px_rgba(4,40,33,0.18)] ${motionClass}`}
    >
      <div className="flex items-start gap-3.5">
        {/* App Logo */}
        <img
          src="/icon-192.png"
          alt="AllBarka Seal"
          className="w-12 h-12 rounded-xl border border-[#C7982F]/30 object-cover shadow-xs shrink-0"
          width="48"
          height="48"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold font-serif text-[#042821] dark:text-[#FAF9F5] truncate">
              {t('pwa.installTitle', 'Home Screen par lagayein')}
            </h3>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={t('pwa.dismissButton', 'Baad mein')}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 -m-1 rounded-full focus-ring cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {t('pwa.installDesc', 'Boutique dates, dry fruits & live order tracking at your fingertips.')}
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="focus-ring inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#042821] hover:bg-[#073d32] dark:bg-[#C7982F] dark:hover:bg-[#d8a83d] text-[#FAF9F5] dark:text-[#042821] text-xs font-bold transition-colors min-h-[44px] cursor-pointer"
            >
              <Download size={13} />
              <span>{t('pwa.installButton', 'Install App')}</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="focus-ring px-3 py-2 rounded-full text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors min-h-[44px] cursor-pointer"
            >
              {t('pwa.dismissButton', 'Baad mein')}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
