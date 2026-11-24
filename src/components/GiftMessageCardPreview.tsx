import React from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import type { GiftCardStyle, GiftRibbon } from '../lib/giftOptions';

const RIBBON_SWATCHES: Record<GiftRibbon, { bg: string; border: string }> = {
  gold: { bg: '#C7982F', border: '#9C7320' },
  emerald: { bg: '#0B5D46', border: '#063B2C' },
  maroon: { bg: '#6E1F2A', border: '#4A131B' },
  ivory: { bg: '#EFE6D5', border: '#C7B89E' },
};

const PREVIEW_COPY: Record<
  LanguageCode,
  {
    livePreview: string;
    toLabel: string;
    emptyPlaceholder: string;
    fromHouse: string;
    charsLeft: string;
    spellingWarning: string;
    styles: Record<GiftCardStyle, string>;
    ribbons: Record<GiftRibbon, string>;
  }
> = {
  en: {
    livePreview: 'Live Gift Card Preview',
    toLabel: 'For',
    emptyPlaceholder: 'Your personal message will appear here exactly as printed on the card…',
    fromHouse: 'AllBarka · Lahore',
    charsLeft: 'characters',
    spellingWarning:
      'Please double-check spelling and names — gift messages cannot be edited after the order is placed.',
    styles: {
      celebration: 'Celebration Card',
      eid: 'Eid Mubarak Card',
      dua: 'Plain Dua / Get-Well Card',
    },
    ribbons: {
      gold: 'Gold ribbon',
      emerald: 'Emerald ribbon',
      maroon: 'Maroon ribbon',
      ivory: 'Ivory ribbon',
    },
  },
  ur: {
    livePreview: 'گفٹ کارڈ کا براہِ راست پیش نظارہ',
    toLabel: 'بنام',
    emptyPlaceholder: 'آپ کا پیغام کارڈ پر بالکل اسی طرح پرنٹ ہو کر نظر آئے گا…',
    fromHouse: 'البرکہ · لاہور',
    charsLeft: 'حروف',
    spellingWarning:
      'براہِ کرم املا اور نام اچھی طرح چیک کر لیں — آرڈر کے بعد پیغام میں تبدیلی ممکن نہیں۔',
    styles: {
      celebration: 'تقریب کارڈ',
      eid: 'عید مبارک کارڈ',
      dua: 'سادہ دعا / عیادت کارڈ',
    },
    ribbons: {
      gold: 'سنہری ربن',
      emerald: 'زمرد ربن',
      maroon: 'مرون ربن',
      ivory: 'عاجی ربن',
    },
  },
  ar: {
    livePreview: 'معاينة مباشرة لبطاقة الهدية',
    toLabel: 'إلى',
    emptyPlaceholder: 'ستظهر رسالتك الشخصية هنا تماماً كما ستُطبع على البطاقة…',
    fromHouse: 'البركة · لاهور',
    charsLeft: 'حرفاً',
    spellingWarning:
      'يرجى مراجعة الإملاء والأسماء بعناية — لا يمكن تعديل رسالة الهدية بعد تأكيد الطلب.',
    styles: {
      celebration: 'بطاقة مناسبات',
      eid: 'بطاقة عيد مبارك',
      dua: 'بطاقة دعاء / عيادة بسيطة',
    },
    ribbons: {
      gold: 'شريط ذهبي',
      emerald: 'شريط زمردي',
      maroon: 'شريط عنابي',
      ivory: 'شريط عاجي',
    },
  },
};

export interface GiftMessageCardPreviewProps {
  message: string;
  recipientName?: string;
  cardStyle?: GiftCardStyle;
  ribbon?: GiftRibbon;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}

export default function GiftMessageCardPreview({
  message,
  recipientName,
  cardStyle = 'celebration',
  ribbon = 'gold',
  maxLength = 300,
  placeholder,
  className = '',
}: GiftMessageCardPreviewProps) {
  const { language, isRtl } = useLanguage();
  const copy = PREVIEW_COPY[language] || PREVIEW_COPY.en;
  const trimmedMessage = message.trim();
  const trimmedRecipient = (recipientName || '').trim();
  const swatch = RIBBON_SWATCHES[ribbon] || RIBBON_SWATCHES.gold;
  const isPlainDua = cardStyle === 'dua';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="gift-card-live-preview"
      data-card-style={cardStyle}
      data-ribbon={ribbon}
      className={`mt-3 space-y-2.5 ${className}`.trim()}
    >
      <div
        className={`gift-card-preview relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-xs transition-colors ${
          isPlainDua
            ? 'border-[#29231D]/20 bg-[#FCFBF8] text-[#29231D] dark:border-[#F6F1EA]/20 dark:bg-[#1A201E] dark:text-[#F6F1EA]'
            : 'border-[#C7982F]/55 bg-[#FDFBF7] text-[#1E3A2B] dark:border-[#C7982F]/45 dark:bg-[#14231E] dark:text-[#F6F1EA]'
        }`}
        aria-label={copy.livePreview}
      >
        {/* Ribbon accent strip */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ backgroundColor: swatch.bg }}
        />

        {/* Card header */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-b border-[#C7982F]/25 pb-2">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#806326] dark:text-[#E4C783]">
            {!isPlainDua && <Sparkles size={12} aria-hidden="true" />}
            <span>{copy.livePreview}</span>
          </p>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#635B52] dark:text-[#B9B1A7]">
            <span>{copy.styles[cardStyle]}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full border"
                style={{ backgroundColor: swatch.bg, borderColor: swatch.border }}
              />
              {copy.ribbons[ribbon]}
            </span>
          </div>
        </div>

        {/* Optional recipient line */}
        {trimmedRecipient && (
          <h5
            dir="auto"
            className="mt-3 font-serif text-base sm:text-lg font-semibold text-[#1E3A2B] dark:text-[#F6F1EA] break-words [overflow-wrap:anywhere]"
          >
            <span className="text-xs font-sans font-medium text-[#806326] dark:text-[#E4C783] me-1.5">
              {copy.toLabel}:
            </span>
            {trimmedRecipient}
          </h5>
        )}

        {/* Live card message body */}
        <p
          dir="auto"
          aria-live="polite"
          className={`gift-card-message my-3 min-h-[3.25rem] whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-serif text-sm sm:text-base leading-relaxed ${
            trimmedMessage
              ? 'text-[#1E3A2B] dark:text-[#F6F1EA]'
              : 'italic text-[#635B52]/75 dark:text-[#A8A199]/80'
          }`}
        >
          {trimmedMessage || placeholder || copy.emptyPlaceholder}
        </p>

        {/* Footer with house signature & live character counter */}
        <div className="flex items-center justify-between gap-2 border-t border-[#C7982F]/20 pt-2 text-[10px] text-[#635B52] dark:text-[#A8A199]">
          <span className="font-serif">{copy.fromHouse}</span>
          <span dir="ltr" className="tabular-nums">
            {message.length} / {maxLength} {copy.charsLeft}
          </span>
        </div>
      </div>

      {/* Prominent trilingual spelling-lock warning */}
      <div
        role="note"
        data-testid="gift-spelling-warning"
        className="flex items-start gap-2 rounded-xl border border-amber-700/30 bg-amber-50/90 px-3 py-2.5 text-xs leading-5 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/35 dark:text-amber-100"
      >
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
        <p className="font-medium">{copy.spellingWarning}</p>
      </div>
    </div>
  );
}
