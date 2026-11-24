import React from 'react';
import { Cookie, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useConsent } from '../contexts/ConsentContext';
import {
  CONSENT_POLICY_VERSION,
  STORAGE_INVENTORY,
  type ConsentCategory,
  type StorageInventoryEntry,
} from '../lib/consent';

interface CookiePolicyCopy {
  eyebrow: string;
  heading: string;
  intro: string;
  gpcNote: string;
  policyVersionLabel: string;
  manageButton: string;
  colName: string;
  colType: string;
  colCategory: string;
  colPurpose: string;
  colDuration: string;
  categories: Record<ConsentCategory, string>;
  storageTypes: Record<StorageInventoryEntry['storageType'], string>;
}

const COPY: Record<LanguageCode, CookiePolicyCopy> = {
  en: {
    eyebrow: 'Transparency & Browser Storage',
    heading: 'Cookies & Browser Storage Policy',
    intro:
      'This inventory is generated directly from AllBarka’s application code. Essential storage keeps your bag, language, theme, and checkout working. Optional analytics and marketing scripts remain off until you explicitly grant consent.',
    gpcNote:
      'Global Privacy Control (GPC): When your browser sends a GPC signal, Analytics and Marketing default to off automatically.',
    policyVersionLabel: 'Active policy version',
    manageButton: 'Manage cookie settings',
    colName: 'Key / Cookie Name',
    colType: 'Storage',
    colCategory: 'Category',
    colPurpose: 'Purpose',
    colDuration: 'Duration',
    categories: {
      necessary: 'Essential',
      analytics: 'Analytics',
      marketing: 'Marketing',
    },
    storageTypes: {
      cookie: 'HTTP Cookie',
      localStorage: 'localStorage',
      sessionStorage: 'sessionStorage',
      script: 'Gated Script',
    },
  },
  ur: {
    eyebrow: 'شفافیت اور براؤزر اسٹوریج',
    heading: 'کوکیز اور براؤزر اسٹوریج پالیسی',
    intro:
      'یہ فہرست براہِ راست آل برکہ کے کوڈ سے تیار کی گئی ہے۔ ضروری اسٹوریج آپ کا بیگ، زبان، تھیم اور چیک آؤٹ چلاتی ہے۔ اختیاری تجزیات اور مارکیٹنگ اسکرپٹس آپ کی واضح اجازت کے بغیر بند رہتے ہیں۔',
    gpcNote:
      'Global Privacy Control (GPC): اگر آپ کا براؤزر GPC سگنل بھیجے تو تجزیات اور مارکیٹنگ خودکار طور پر بند رہتے ہیں۔',
    policyVersionLabel: 'فعال پالیسی ورژن',
    manageButton: 'کوکی سیٹنگز تبدیل کریں',
    colName: 'کی / کوکی کا نام',
    colType: 'اسٹوریج',
    colCategory: 'کیٹیگری',
    colPurpose: 'مقصد',
    colDuration: 'مدت',
    categories: {
      necessary: 'ضروری',
      analytics: 'تجزیات',
      marketing: 'مارکیٹنگ',
    },
    storageTypes: {
      cookie: 'HTTP کوکی',
      localStorage: 'localStorage',
      sessionStorage: 'sessionStorage',
      script: 'اجازت یافتہ اسکرپٹ',
    },
  },
  ar: {
    eyebrow: 'الشفافية وتخزين المتصفح',
    heading: 'سياسة ملفات الارتباط وتخزين المتصفح',
    intro:
      'تم إنشاء هذه القائمة مباشرة من كود متجر ألبركة. يضمن التخزين الضروري عمل حقيبة التسوق واللغة والمظهر وإتمام الطلب. وتبقى نصوص التحليلات والتسويق الاختيارية متوقفة حتى تمنح موافقتك الصريحة.',
    gpcNote:
      'التحكم العالمي في الخصوصية (GPC): عندما يرسل متصفحك إشارة GPC، تتوقف التحليلات والتسويق افتراضيًا.',
    policyVersionLabel: 'إصدار السياسة النشط',
    manageButton: 'إدارة إعدادات ملفات الارتباط',
    colName: 'اسم المفتاح / الملف',
    colType: 'نوع التخزين',
    colCategory: 'الفئة',
    colPurpose: 'الغرض',
    colDuration: 'المدة',
    categories: {
      necessary: 'ضرورية',
      analytics: 'التحليلات',
      marketing: 'التسويق',
    },
    storageTypes: {
      cookie: 'ملف تعريف HTTP',
      localStorage: 'localStorage',
      sessionStorage: 'sessionStorage',
      script: 'نص برمجي مقيد',
    },
  },
};

export default function CookiePolicySection() {
  const { language, isRtl } = useLanguage();
  const { openPreferences, gpcEnabled } = useConsent();
  const words = COPY[language] || COPY.en;
  const dir = isRtl ? 'rtl' : 'ltr';

  return (
    <div dir={dir} data-cookies-policy-section className="space-y-6 text-start">
      <div className="space-y-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#806326] dark:text-[#D8B25C]">
          <Cookie size={14} aria-hidden="true" />
          <span>{words.eyebrow}</span>
        </span>
        <h2 className="font-serif text-xl font-black text-[#1E3A2B] sm:text-2xl dark:text-[#FAF9F5]">
          {words.heading}
        </h2>
        <p className="text-sm leading-relaxed text-[#29231D] sm:text-base dark:text-[#E5E0D5]">
          {words.intro}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#C7982F]/30 bg-[#F6F1EA] p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-[#1A2220]">
        <div className="space-y-1 text-xs leading-5 text-[#29231D] dark:text-[#D4CEC2]">
          <p className="flex items-start gap-2 font-medium text-[#1E3A2B] dark:text-[#E6C97F]">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {words.gpcNote}
              {gpcEnabled ? ' (GPC ON)' : ''}
            </span>
          </p>
          <p className="text-[11px] text-[#5C554C] dark:text-[#AFA89C]">
            {words.policyVersionLabel}: <code className="font-mono font-bold">{CONSENT_POLICY_VERSION}</code>
          </p>
        </div>
        <button
          type="button"
          data-policy-open-cookie-settings
          onClick={openPreferences}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full border border-[#1E3A2B] bg-[#1E3A2B] px-5 py-2.5 text-xs font-bold text-[#FAF9F5] transition-colors hover:bg-[#152B1F] dark:border-[#C7982F] dark:bg-[#C7982F] dark:text-[#111917] dark:hover:bg-[#D6A942] focus-ring cursor-pointer"
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          <span>{words.manageButton}</span>
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-[#C7982F]/30 md:block">
        <table className="w-full border-collapse text-start text-xs">
          <thead>
            <tr className="border-b border-[#C7982F]/25 bg-[#F6F1EA] text-[#1E3A2B] dark:bg-[#1A2220] dark:text-[#E6C97F]">
              <th className="px-4 py-3 font-bold">{words.colName}</th>
              <th className="px-3 py-3 font-bold">{words.colType}</th>
              <th className="px-3 py-3 font-bold">{words.colCategory}</th>
              <th className="px-4 py-3 font-bold">{words.colPurpose}</th>
              <th className="px-4 py-3 font-bold">{words.colDuration}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#C7982F]/20 bg-[var(--color-surface,#FFFCF7)] dark:bg-[#141B19]">
            {STORAGE_INVENTORY.map((entry) => (
              <tr key={entry.key} data-storage-inventory-row={entry.key}>
                <td className="px-4 py-3 align-top font-mono text-[11px] font-semibold text-[#1E3A2B] dark:text-[#FAF9F5]">
                  {entry.key}
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-[#5C554C] dark:text-[#CFC8BC]">
                  {words.storageTypes[entry.storageType]}
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top">
                  <span className="inline-flex rounded-full border border-[#C7982F]/35 bg-[#F6F1EA] px-2.5 py-0.5 text-[11px] font-semibold text-[#1E3A2B] dark:bg-[#202A27] dark:text-[#E6C97F]">
                    {words.categories[entry.category]}
                  </span>
                </td>
                <td className="px-4 py-3 align-top leading-5 text-[#29231D] dark:text-[#E5E0D5]">
                  {entry.purpose[language] || entry.purpose.en}
                </td>
                <td className="px-4 py-3 align-top leading-5 text-[#5C554C] dark:text-[#CFC8BC]">
                  {entry.duration[language] || entry.duration.en}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {STORAGE_INVENTORY.map((entry) => (
          <div
            key={entry.key}
            className="space-y-2 rounded-2xl border border-[#C7982F]/25 bg-[var(--color-surface,#FFFCF7)] p-4 text-xs dark:bg-[#18201E]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <code className="break-all font-mono text-[11px] font-bold text-[#1E3A2B] dark:text-[#FAF9F5]">
                {entry.key}
              </code>
              <span className="inline-flex rounded-full border border-[#C7982F]/35 bg-[#F6F1EA] px-2.5 py-0.5 text-[11px] font-semibold text-[#1E3A2B] dark:bg-[#222D29] dark:text-[#E6C97F]">
                {words.categories[entry.category]} · {words.storageTypes[entry.storageType]}
              </span>
            </div>
            <p className="leading-5 text-[#29231D] dark:text-[#E5E0D5]">
              {entry.purpose[language] || entry.purpose.en}
            </p>
            <p className="text-[11px] text-[#5C554C] dark:text-[#AFA89C]">
              <strong>{words.colDuration}:</strong> {entry.duration[language] || entry.duration.en}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
