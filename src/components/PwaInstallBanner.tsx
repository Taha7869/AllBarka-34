import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const PWA_DISMISSED_KEY = 'allbarka_pwa_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallBanner({ hidden = false }: { hidden?: boolean }) {
  const { t, isRtl, language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Check if already dismissed
    try {
      if (localStorage.getItem(PWA_DISMISSED_KEY) === '1') {
        return;
      }
    } catch {
      // Storage unavailable
      return;
    }

    // 2. Check if already running as installed standalone PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      return;
    }

    // 3. Listen to beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      try {
        localStorage.setItem(PWA_DISMISSED_KEY, '1');
      } catch {
        // Storage disabled
      }
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, '1');
    } catch {
      // Storage disabled
    }
    setIsVisible(false);
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

  if (!isVisible || hidden) {
    return null;
  }

  return (
    <aside
      role="banner"
      aria-label={t('pwa.installTitle', 'Home Screen par lagayein')}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed bottom-4 start-4 end-4 sm:start-auto sm:end-6 sm:max-w-md z-45 bg-[var(--color-surface,#FFFCF7)] dark:bg-[#1A2220] border border-[#C7982F]/40 rounded-2xl p-4 shadow-[0_12px_40px_rgba(4,40,33,0.18)] transition-all animate-in fade-in slide-in-from-bottom-3 duration-300"
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
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 -m-1 rounded-full focus-ring"
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
              className="focus-ring inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#042821] hover:bg-[#073d32] dark:bg-[#C7982F] dark:hover:bg-[#d8a83d] text-[#FAF9F5] dark:text-[#042821] text-xs font-bold transition-colors min-h-9"
            >
              <Download size={13} />
              <span>{t('pwa.installButton', 'Install App')}</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="focus-ring px-3 py-2 rounded-full text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors min-h-9"
            >
              {t('pwa.dismissButton', 'Baad mein')}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
