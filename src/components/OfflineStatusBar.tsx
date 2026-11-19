import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const COPY: Record<LanguageCode, { msg: string; action: string }> = {
  en: { msg: 'You are offline.', action: 'View recently viewed products' },
  ur: { msg: 'انٹرنیٹ بند ہے۔', action: 'پچھلی دیکھی گئی مصنوعات دیکھیں' },
  ar: { msg: 'أنت غير متصل بالإنترنت.', action: 'عرض المنتجات المشاهدة مؤخرًا' },
};

export default function OfflineStatusBar() {
  const online = useOnlineStatus();
  const { language, isRtl } = useLanguage();
  const location = useLocation();

  if (online || location.pathname === '/offline') return null;

  const words = COPY[language] || COPY.en;

  return (
    <div
      role="status"
      aria-live="polite"
      data-offline-status-bar
      dir={isRtl ? 'rtl' : 'ltr'}
      className="w-full border-b border-[#C7982F]/40 bg-[#1E3A2B] px-4 py-2 text-center text-xs text-[#FAF9F5]"
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-2">
        <WifiOff size={14} className="text-[#D8B25C]" aria-hidden="true" />
        <span className="font-semibold">{words.msg}</span>
        <Link
          to="/offline"
          className="font-bold text-[#E6C97F] underline underline-offset-2 hover:text-white focus-ring"
        >
          {words.action}
        </Link>
      </span>
    </div>
  );
}
