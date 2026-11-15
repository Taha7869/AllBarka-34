import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const KEY = 'allbarka_storage_notice';
const copy = {
  en: { text: 'We use only essential browser storage: your bag, language, theme and sign-in. No tracking or advertising cookies.', more: 'Privacy', ok: 'OK' },
  ur: { text: 'ہم صرف ضروری براؤزر اسٹوریج استعمال کرتے ہیں: آپ کا بیگ، زبان، تھیم اور سائن اِن۔ کوئی ٹریکنگ یا اشتہاری کوکیز نہیں۔', more: 'رازداری', ok: 'ٹھیک ہے' },
  ar: { text: 'نستخدم فقط التخزين الأساسي في المتصفح: سلتك ولغتك والمظهر وتسجيل الدخول. لا ملفات تتبع أو إعلانات.', more: 'الخصوصية', ok: 'حسنًا' },
};

/**
 * One quiet, one-time notice. The store sets no tracking or advertising cookies, so there is nothing to
 * accept or refuse: it states what is stored and goes away for good once dismissed. If analytics is
 * added later, this becomes a real consent choice before any analytics script loads.
 */
export default function CookieNotice({ hidden = false }: { hidden?: boolean }) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem(KEY) === '1'; } catch { seen = true; }
    if (seen) return;
    const timer = window.setTimeout(() => setOpen(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);
  if (!open || hidden) return null;
  const close = () => { try { localStorage.setItem(KEY, '1'); } catch { /* storage blocked: just close */ } setOpen(false); };
  const words = copy[language];
  return <div role="region" aria-label={words.more} data-storage-notice dir={language === 'en' ? 'ltr' : 'rtl'}
    className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-[84px] z-40 max-w-md rounded-2xl border border-[#C7982F]/30 bg-[var(--color-surface,#FFFCF7)] p-3 text-start shadow-lg dark:bg-[#1A201E] sm:right-auto sm:bottom-5 sm:left-5">
    <p className="text-xs leading-5 text-[var(--color-text-secondary)]">{words.text} <Link to="/policies/privacy" className="font-semibold text-[var(--color-accent-text,#806326)] underline focus-ring">{words.more}</Link></p>
    <div className="mt-2 flex justify-end">
      <button type="button" onClick={close} className="min-h-9 rounded-full bg-[var(--color-primary,#042821)] px-4 text-xs font-bold text-white focus-ring">{words.ok}</button>
    </div>
  </div>;
}
