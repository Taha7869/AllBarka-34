import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Save, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCatalogRefresh } from '../contexts/CatalogContext';
import { adminRequest, AdminRequestError } from '../lib/adminClient';
import { validateCatalogPricing, type CatalogPricing, type CatalogRecord } from '../lib/catalogSchema';
import { getLocalized } from '../utils/localize';
import type { Product } from '../types';

const copy = {
  en: { edit: 'Edit prices & availability', title: 'Merchant pricing', active: 'Available to purchase', quote: 'Quote only', price: 'Price (PKR)', available: 'Available', weight: 'Shipping grams', moq: 'MOQ override (pcs)', productMoq: 'Product MOQ override (pcs, blank = formula)', clearMoq: 'Clear MOQ', custom: 'Allow custom weight', rate: 'Custom price per 100g (PKR)', min: 'Minimum custom grams', max: 'Maximum custom grams', packed: 'Packed bundle grams', wholesale: 'Wholesale price (PKR, 0 = disabled)', save: 'Save pricing', reload: 'Reload latest', close: 'Close pricing editor', loading: 'Loading current pricing…', saved: 'Pricing saved. Active storefronts refresh within 45 seconds.', conflict: 'Another edit changed this product. Reload latest pricing before saving.', unavailable: 'The catalogue is unavailable. Your changes are preserved; retry shortly.', auth: 'An authenticated administrator account is required.', invalid: 'Enter positive whole PKR prices, valid weights, and whole-number MOQ overrides (1–10000). Custom portions use 50g increments, from 100g to 5000g.', failed: 'Pricing could not be saved. Retry or reload latest.', hint: 'Fixed portion prices and the custom price per 100g are independent. Earlier order receipts stay unchanged. Changes are audited.', revision: 'Revision', editButton: 'Prices & availability' },
  ur: { edit: 'قیمت اور دستیابی میں ترمیم', title: 'مرچنٹ قیمتیں', active: 'خریداری کے لیے دستیاب', quote: 'صرف کوٹیشن', price: 'قیمت (روپے)', available: 'دستیاب', weight: 'ترسیلی وزن گرام', moq: 'کم از کم مقدار (عدد)', productMoq: 'پروڈکٹ کم از کم مقدار (عدد)', clearMoq: 'صاف کریں', custom: 'حسبِ ضرورت وزن کی اجازت', rate: 'حسبِ ضرورت فی ۱۰۰ گرام قیمت', min: 'کم از کم گرام', max: 'زیادہ سے زیادہ گرام', packed: 'بند بنڈل کا وزن گرام', wholesale: 'تھوک قیمت (صفر = بند)', save: 'قیمت محفوظ کریں', reload: 'تازہ قیمت لوڈ کریں', close: 'قیمت ایڈیٹر بند کریں', loading: 'موجودہ قیمت لوڈ ہو رہی ہے…', saved: 'قیمت محفوظ ہو گئی۔ فعال دکان ۴۵ سیکنڈ میں تازہ ہوگی۔', conflict: 'کسی اور ترمیم سے یہ آئٹم بدل گیا ہے۔ تازہ قیمت دوبارہ لوڈ کریں۔', unavailable: 'کیٹلاگ دستیاب نہیں۔ آپ کی تبدیلیاں محفوظ ہیں؛ دوبارہ کوشش کریں۔', auth: 'تصدیق شدہ منتظم اکاؤنٹ درکار ہے۔', invalid: 'درست مثبت مکمل قیمت، وزن اور کم از کم مقدار (۱ تا ۱۰۰۰۰) درج کریں۔ حسبِ ضرورت وزن ۱۰۰ تا ۵۰۰۰ گرام، ۵۰ گرام کے وقفے سے ہے۔', failed: 'قیمت محفوظ نہیں ہوئی۔ دوبارہ کوشش کریں۔', hint: 'مقررہ وزن اور فی ۱۰۰ گرام حسبِ ضرورت قیمت الگ ہیں۔ سابقہ رسیدیں برقرار رہیں گی۔ تبدیلی کا ریکارڈ رکھا جاتا ہے۔', revision: 'ترمیم', editButton: 'قیمت اور دستیابی' },
  ar: { edit: 'تعديل الأسعار والتوفر', title: 'أسعار التاجر', active: 'متاح للشراء', quote: 'عرض سعر فقط', price: 'السعر (روبية)', available: 'متاح', weight: 'وزن الشحن بالغرام', moq: 'الحد الأدنى للطلب (قطعة)', productMoq: 'الحد الأدنى للمنتج (قطعة)', clearMoq: 'مسح', custom: 'السماح بالوزن المخصص', rate: 'سعر الوزن المخصص لكل ١٠٠ غرام', min: 'الحد الأدنى بالغرام', max: 'الحد الأقصى بالغرام', packed: 'وزن الحزمة المعبأة بالغرام', wholesale: 'سعر الجملة (صفر = معطل)', save: 'حفظ الأسعار', reload: 'تحميل أحدث الأسعار', close: 'إغلاق محرر الأسعار', loading: 'جارٍ تحميل الأسعار الحالية…', saved: 'تم الحفظ. تتحدث المتاجر النشطة خلال ٤٥ ثانية.', conflict: 'عدّل مستخدم آخر هذا المنتج. أعد تحميل أحدث الأسعار.', unavailable: 'الكتالوج غير متاح. تم الاحتفاظ بتغييراتك؛ حاول لاحقًا.', auth: 'يلزم حساب مسؤول موثق.', invalid: 'أدخل أسعارًا صحيحة موجبة وأوزانًا صالحة وحدًا أدنى للطلب (١–١٠٠٠٠). الوزن المخصص بين ١٠٠ و٥٠٠٠ غرام بخطوات ٥٠ غرام.', failed: 'تعذر حفظ الأسعار. حاول أو أعد التحميل.', hint: 'أسعار الحصص وسعر كل ١٠٠ غرام مستقلة. تبقى الإيصالات السابقة دون تغيير. يتم تسجيل التعديلات.', revision: 'المراجعة', editButton: 'الأسعار والتوفر' },
};
export function useCatalogPricingLanguage() {
  const { language, isRtl } = useLanguage();
  return { language, isRtl, t: (key: keyof typeof copy.en) => copy[language][key] || copy.en[key] };
}

export default function AdminCatalogPricingEditor({ product, onClose }: { product: Product; onClose: () => void }) {
  const { currentUser } = useAuth();
  const { language, isRtl, t } = useCatalogPricingLanguage();
  const refresh = useCatalogRefresh();
  const [record, setRecord] = useState<CatalogRecord | null>(null);
  const [draft, setDraft] = useState<CatalogPricing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const request = useRef<AbortController | null>(null);
  const id = useId();
  const codeText = (code: string) => t(code === 'CATALOG_REVISION_CONFLICT' ? 'conflict' : code.includes('UNAVAILABLE') ? 'unavailable'
    : ['UNAUTHORIZED', 'FORBIDDEN_ADMIN', 'AUTHENTICATION_REQUIRED'].includes(code) ? 'auth' : code.startsWith('INVALID_') ? 'invalid' : 'failed');
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setSaved(false);
    try {
      if (!currentUser) throw new AdminRequestError('AUTHENTICATION_REQUIRED');
      const result = await adminRequest<{ record: CatalogRecord }>(() => currentUser.getIdToken(), `/api/admin/catalog/${encodeURIComponent(product.id)}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setRecord(result.record); setDraft(structuredClone(result.record.pricing));
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof AdminRequestError ? caught.code : 'REQUEST_FAILED'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }, [currentUser, product.id]);
  useEffect(() => { setRecord(null); setDraft(null); void load(); return () => request.current?.abort(); }, [load]);
  const edit = (patch: Partial<CatalogPricing>) => { if (draft) setDraft({ ...draft, ...patch }); setSaved(false); setError(''); };
  let valid = false;
  try { if (draft) { validateCatalogPricing(draft, product); valid = true; } } catch { /* Invalid fields are explained inline before submission. */ }
  const dirty = !!record && JSON.stringify(record.pricing) !== JSON.stringify(draft);
  const save = async () => {
    if (!draft || !record || !currentUser || busy || !valid || !dirty) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError(''); setSaved(false);
    try {
      const result = await adminRequest<{ record: CatalogRecord }>(() => currentUser.getIdToken(), `/api/admin/catalog/${encodeURIComponent(product.id)}`,
        { signal: controller.signal, body: { expectedRevision: record.pricing.revision, expectedVersion: record.version, pricing: draft } });
      if (controller.signal.aborted) return;
      setRecord(result.record); setDraft(structuredClone(result.record.pricing)); setSaved(true); await refresh();
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof AdminRequestError ? caught.code : 'REQUEST_FAILED'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const field = (key: 'wholesale' | 'pricePer100g' | 'minCustomWeightG' | 'maxCustomWeightG' | 'shippingWeightG', label: keyof typeof copy.en) => <label className="block text-xs" htmlFor={`${id}-${key}`}><span className="mb-2 block">{t(label)}</span><input id={`${id}-${key}`} type="number" inputMode="numeric" min={0} step={1} value={draft?.[key] ?? ''} disabled={busy} onChange={event => edit({ [key]: key === 'shippingWeightG' && !event.target.value ? null : Number(event.target.value) })} className="focus-ring min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base" /></label>;
  return <section dir={isRtl ? 'rtl' : 'ltr'} aria-labelledby={`${id}-heading`} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6">
    <header className="flex items-start justify-between gap-3"><div><h3 id={`${id}-heading`} className="font-serif text-xl">{t('title')} — {getLocalized(product, 'name', language)}</h3><p className="mt-2 max-w-3xl text-xs leading-6 text-[var(--color-text-secondary)]">{t('hint')}</p></div><button type="button" onClick={onClose} aria-label={t('close')} className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-lg"><X size={18} /></button></header>
    {busy && !draft && <p role="status" className="my-4 text-sm">{t('loading')}</p>}
    {draft && <div className="mt-5 space-y-5"><div className="flex flex-wrap gap-6">{(['active', 'quoteOnly', 'allowCustomWeight'] as const).map(key => <label key={key} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={draft[key]} disabled={busy} onChange={event => edit({ [key]: event.target.checked })} className="h-5 w-5 accent-[var(--color-primary)]" />{t(key === 'quoteOnly' ? 'quote' : key === 'allowCustomWeight' ? 'custom' : 'active')}</label>)}</div>
      <div className="space-y-3">{draft.variants.map((variant, index) => <div key={variant.id} className="grid items-end gap-3 rounded-xl border border-[var(--color-border)] p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"><p className="py-3 text-sm font-semibold"><bdi>{variant.label}</bdi></p><label className="text-xs" htmlFor={`${id}-price-${index}`}><span className="mb-2 block">{t('price')}</span><input id={`${id}-price-${index}`} type="number" min={1} step={1} inputMode="numeric" value={variant.price} disabled={busy} onChange={event => edit({ variants: draft.variants.map((current, idx) => idx === index ? { ...current, price: Number(event.target.value) } : current) })} className="focus-ring min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base" /></label><label className="text-xs" htmlFor={`${id}-grams-${index}`}><span className="mb-2 block">{t('weight')}</span><input id={`${id}-grams-${index}`} type="number" min={1} step={1} value={variant.weightGrams ?? ''} disabled={busy} onChange={event => edit({ variants: draft.variants.map((current, idx) => idx === index ? { ...current, weightGrams: event.target.value ? Number(event.target.value) : null } : current) })} className="focus-ring min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base" /></label><div className="text-xs"><label className="mb-2 flex items-center justify-between gap-2" htmlFor={`${id}-moq-${index}`}><span>{t('moq')}</span>{variant.moqOverride != null && <button type="button" disabled={busy} onClick={() => edit({ variants: draft.variants.map((current, idx) => idx === index ? { ...current, moqOverride: null } : current) })} className="text-[11px] font-semibold text-red-700 hover:underline">{t('clearMoq')}</button>}</label><input id={`${id}-moq-${index}`} type="number" min={1} max={10000} step={1} placeholder="Auto" value={variant.moqOverride ?? ''} disabled={busy} onChange={event => edit({ variants: draft.variants.map((current, idx) => idx === index ? { ...current, moqOverride: event.target.value ? Number(event.target.value) : null } : current) })} className="focus-ring min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base" /></div><label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={variant.available} disabled={busy} onChange={event => edit({ variants: draft.variants.map((current, idx) => idx === index ? { ...current, available: event.target.checked } : current) })} className="h-5 w-5" />{t('available')}</label></div>)}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{field('pricePer100g', 'rate')}{field('minCustomWeightG', 'min')}{field('maxCustomWeightG', 'max')}{field('wholesale', 'wholesale')}{(product.isBundle || ['bundles', 'gift-boxes'].includes(product.category)) && field('shippingWeightG', 'packed')}<div className="block text-xs"><label className="mb-2 flex items-center justify-between gap-2" htmlFor={`${id}-productMoq`}><span>{t('productMoq')}</span>{draft.moqOverride != null && <button type="button" disabled={busy} onClick={() => edit({ moqOverride: null })} className="text-[11px] font-semibold text-red-700 hover:underline">{t('clearMoq')}</button>}</label><input id={`${id}-productMoq`} type="number" inputMode="numeric" min={1} max={10000} step={1} placeholder="Auto formula" value={draft.moqOverride ?? ''} disabled={busy} onChange={event => edit({ moqOverride: event.target.value ? Number(event.target.value) : null })} className="focus-ring min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-base" /></div></div>
      {!valid && <p role="status" className="text-xs text-red-800 dark:text-red-300">{t('invalid')}</p>}<p className="text-xs text-[var(--color-text-secondary)]">{t('revision')}: <bdi>{record?.pricing.revision}</bdi></p>
    </div>}
    {error && <p role="alert" className="mt-4 text-sm text-red-800 dark:text-red-300">{codeText(error)}</p>}{saved && <p role="status" className="mt-4 text-sm text-emerald-800 dark:text-emerald-300">{t('saved')}</p>}
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={save} disabled={busy || !valid || !dirty} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"><Save size={16} />{t('save')}</button><button type="button" onClick={() => void load()} disabled={busy} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 text-xs font-semibold disabled:opacity-50"><RefreshCw size={16} />{t('reload')}</button></div>
  </section>;
}
