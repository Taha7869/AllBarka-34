import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X, Gift, Check, ArrowRight, ShoppingBag } from 'lucide-react';
import { PRODUCTS, getProductImage } from '../data/products';
import { useLanguage } from '../contexts/LanguageContext';
import { getLocalized } from '../utils/localize';
import { acquireScrollLock } from '../utils/scrollLock';
import { CUSTOM_HAMPER_PRODUCT_ID, HAMPER_BOXES, HAMPER_SELECTION_IDS, HAMPER_PORTION_GRAMS, hamperCartKey, hamperSelectionPrice, resolveHamper, type HamperConfiguration } from '../lib/hamperCatalog';

export interface CustomHamperCartInput {
  id: string;
  productId: typeof CUSTOM_HAMPER_PRODUCT_ID;
  slug: string;
  name_en: string;
  name_ur: string;
  name_ar: string;
  selectedWeight: string;
  unitPrice: number;
  price: number;
  image: string;
  quantity: number;
  hamperConfiguration: HamperConfiguration;
}

interface CustomHamperBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CustomHamperCartInput) => void;
}

const copy = [
  ['title', 'Custom Luxury Hamper', 'اپنی مرضی کا خصوصی گفٹ ہیمپر', 'صندوق هدايا فاخر حسب الطلب'],
  ['intro', 'Choose a coffer, select your favourites and add a personal message.', 'ڈبہ منتخب کریں، پسندیدہ میوہ جات چنیں اور اپنا پیغام لکھیں۔', 'اختر الصندوق ومنتجاتك المفضلة وأضف رسالة شخصية.'],
  ['close', 'Close hamper builder', 'ہیمپر بنانے کا صفحہ بند کریں', 'إغلاق تصميم صندوق الهدايا'],
  ['packaging', 'Choose coffer', 'ڈبہ منتخب کریں', 'اختر الصندوق'],
  ['harvests', 'Select harvests', 'میوہ جات منتخب کریں', 'اختر المحاصيل'],
  ['card', 'Personal card', 'ذاتی پیغام', 'البطاقة الشخصية'],
  ['packagingTitle', 'The presentation is yours to choose.', 'پیشکش کا انداز آپ منتخب کریں۔', 'اختر طريقة تقديم هديتك.'],
  ['packagingNote', 'The coffer price is included in your hamper total.', 'ڈبے کی قیمت ہیمپر کی مجموعی قیمت میں شامل ہے۔', 'سعر الصندوق مشمول في إجمالي الهدية.'],
  ['capacity', '{min}–{max} selections', '{min} تا {max} انتخاب', 'من {min} إلى {max} اختيارات'],
  ['reference', 'Reference image; actual packaging may vary.', 'نمونہ تصویر؛ اصل پیکنگ میں معمولی فرق ہو سکتا ہے۔', 'صورة مرجعية؛ قد تختلف العبوة الفعلية.'],
  ['selectionTitle', 'Choose your favourites.', 'اپنی پسند کے میوہ جات چنیں۔', 'اختر منتجاتك المفضلة.'],
  ['selectionNote', 'Each selection contains 200g of the named product.', 'ہر انتخاب میں منتخب مصنوعات کی 200 گرام مقدار شامل ہے۔', 'كل اختيار يحتوي على 200 غرام من المنتج المحدد.'],
  ['selected', '{count} selected', '{count} منتخب', '{count} مختار'],
  ['selectionInvalid', 'Choose {min}–{max} different products for this coffer.', 'اس ڈبے کے لیے {min} تا {max} مختلف مصنوعات چنیں۔', 'اختر من {min} إلى {max} منتجات مختلفة لهذا الصندوق.'],
  ['cardTitle', 'A note to make it personal.', 'ایک پیغام جو تحفے کو خاص بنا دے۔', 'رسالة تجعل الهدية شخصية.'],
  ['recipient', 'Recipient name (optional)', 'وصول کنندہ کا نام (اختیاری)', 'اسم المستلم (اختياري)'],
  ['recipientPlaceholder', 'Who is this gift for?', 'یہ تحفہ کس کے لیے ہے؟', 'لمن هذه الهدية؟'],
  ['message', 'Gift message (optional)', 'تحفے کا پیغام (اختیاری)', 'رسالة الهدية (اختياري)'],
  ['messagePlaceholder', 'Write your wishes here…', 'اپنی نیک خواہشات یہاں لکھیں…', 'اكتب أمنياتك هنا…'],
  ['summary', 'Your hamper', 'آپ کا ہیمپر', 'صندوق هديتك'],
  ['contents', 'Contents', 'مشمولات', 'المحتويات'],
  ['netWeight', 'Product net weight', 'مصنوعات کا خالص وزن', 'الوزن الصافي للمنتجات'],
  ['total', 'Hamper total', 'ہیمپر کی مجموعی قیمت', 'إجمالي الصندوق'],
  ['back', 'Back', 'واپس', 'السابق'],
  ['continue', 'Continue', 'آگے بڑھیں', 'متابعة'],
  ['add', 'Add hamper to bag', 'ہیمپر شاپنگ بیگ میں شامل کریں', 'أضف الصندوق إلى الحقيبة'],
] as const;
const translations = {
  en: Object.fromEntries(copy.map(([key, en]) => [key, en])),
  ur: Object.fromEntries(copy.map(([key, , ur]) => [key, ur])),
  ar: Object.fromEntries(copy.map(([key, , , ar]) => [key, ar])),
};

export default function CustomHamperBuilderModal({ isOpen, onClose, onAddToCart }: CustomHamperBuilderModalProps) {
  const { language, isRtl, t: storefrontTranslation } = useLanguage();
  const t = (key: string) => translations[language][key] || storefrontTranslation(key);
  const reducedMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [boxId, setBoxId] = useState<HamperConfiguration['boxId']>('box-wood');
  const [selectedItems, setSelectedItems] = useState<string[]>(['pista', 'kaju', 'badam', 'akhroot']);
  const [recipientName, setRecipientName] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const box = HAMPER_BOXES.find(option => option.id === boxId)!;
  const candidates = HAMPER_SELECTION_IDS.flatMap(id => {
    const product = PRODUCTS.find(candidate => candidate.id === id);
    return product && hamperSelectionPrice(product) !== null ? [product] : [];
  });
  const configuration: HamperConfiguration = { version: 1, boxId, selections: selectedItems, recipientName, giftMessage };
  const resolved = resolveHamper(configuration);
  const selectionValid = selectedItems.length >= box.minSelections && selectedItems.length <= box.maxSelections;
  const totalPrice = box.price + selectedItems.reduce((sum, id) => {
    const product = candidates.find(candidate => candidate.id === id);
    return sum + (product ? hamperSelectionPrice(product) || 0 : 0);
  }, 0);
  const capacity = t('capacity').replace('{min}', String(box.minSelections)).replace('{max}', String(box.maxSelections));
  const invalidMessage = t('selectionInvalid').replace('{min}', String(box.minSelections)).replace('{max}', String(box.maxSelections));
  const nameTypography = language === 'ur' ? 'font-urdu' : language === 'ar' ? 'font-arabic' : 'font-serif';

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const release = acquireScrollLock();
    dialogRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || []);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); dialogRef.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); release(); if (previous?.isConnected) previous.focus(); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const toggleItem = (id: string) => setSelectedItems(previous => previous.includes(id) ? previous.filter(value => value !== id) : previous.length < box.maxSelections ? [...previous, id] : previous);
  const finish = () => {
    if (!resolved) return;
    onAddToCart({ id: hamperCartKey(resolved.configuration), productId: CUSTOM_HAMPER_PRODUCT_ID, slug: CUSTOM_HAMPER_PRODUCT_ID,
      name_en: resolved.name_en, name_ur: resolved.name_ur, name_ar: resolved.name_ar, selectedWeight: resolved.portion,
      unitPrice: resolved.unitPrice, price: resolved.unitPrice, image: resolved.image, quantity: 1, hamperConfiguration: resolved.configuration });
    onClose();
  };

  return <div className="fixed inset-0 z-[10005] flex items-center justify-center p-3 sm:p-4" dir="ltr">
    <motion.div aria-hidden="true" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : .2 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="hamper-builder-title" tabIndex={-1}
      initial={reducedMotion ? false : { opacity: 0, scale: .97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : .2 }}
      className="relative z-10 flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-[var(--color-border-accent)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-2xl">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-base)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3"><Gift size={22} className="shrink-0 text-[var(--color-accent-text)]"/><div dir="auto"><h3 id="hamper-builder-title" className="font-serif text-lg leading-snug">{t('title')}</h3><p className="mt-1 text-[11px] leading-5 text-[var(--color-text-secondary)]">{t('intro')}</p></div></div>
        <button type="button" onClick={onClose} aria-label={t('close')} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--color-border)]"><X size={18}/></button>
      </div>
      <div className="grid shrink-0 grid-cols-3 border-b border-[var(--color-border)]">{([1, 2, 3] as const).map(value => <button type="button" key={value} aria-current={step === value ? 'step' : undefined} disabled={value === 3 && !selectionValid} onClick={() => setStep(value)} className={`focus-ring min-h-12 border-b-2 px-2 py-3 text-[11px] font-medium disabled:opacity-40 ${step === value ? 'border-[var(--color-gold)] bg-[#c7982f]/5 text-[var(--color-accent-text)]' : 'border-transparent text-[var(--color-text-secondary)]'}`}><span dir="auto">{value}. {t(value === 1 ? 'packaging' : value === 2 ? 'harvests' : 'card')}</span></button>)}</div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {step === 1 && <div><h4 dir="auto" className="font-serif text-xl">{t('packagingTitle')}</h4><p dir="auto" className="mb-5 mt-2 text-xs leading-6 text-[var(--color-text-secondary)]">{t('packagingNote')}</p><div className="grid gap-4 sm:grid-cols-3">{HAMPER_BOXES.map(option => <button type="button" key={option.id} aria-pressed={boxId === option.id} onClick={() => setBoxId(option.id)} className={`focus-ring flex flex-col rounded-2xl border p-3.5 text-start transition-colors motion-reduce:transition-none ${boxId === option.id ? 'border-[var(--color-gold)] bg-[#c7982f]/10' : 'border-[var(--color-border)] hover:border-[var(--color-gold)]'}`}>
          <img src={option.image} alt={getLocalized(option, 'name', language)} width={640} height={360} loading="lazy" className="mb-3 aspect-video w-full rounded-xl object-cover"/><span dir="auto" className={`text-sm ${nameTypography}`}>{getLocalized(option, 'name', language)}</span><span dir="auto" className="mt-2 text-[10px] leading-5 text-[var(--color-text-secondary)]">{t('capacity').replace('{min}', String(option.minSelections)).replace('{max}', String(option.maxSelections))}</span><span className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-accent-text)]"><bdi>Rs. {option.price.toLocaleString()}</bdi>{boxId === option.id && <Check size={17}/>}</span>
        </button>)}</div><p dir="auto" className="mt-4 text-[10px] leading-5 text-[var(--color-text-secondary)]">{t('reference')}</p></div>}
        {step === 2 && <div><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div dir="auto"><h4 className="font-serif text-xl">{t('selectionTitle')}</h4><p className="mt-2 text-xs leading-6 text-[var(--color-text-secondary)]">{t('selectionNote')}</p><p className="text-xs leading-6 text-[var(--color-accent-text)]">{capacity}</p></div><span dir="auto" className="rounded-full bg-[#1e3a2b] px-3 py-2 text-xs text-[#fff8e9]">{t('selected').replace('{count}', String(selectedItems.length))}</span></div><div className="grid gap-3 sm:grid-cols-2">{candidates.map(product => {
          const selected = selectedItems.includes(product.id);
          return <button type="button" key={product.id} aria-pressed={selected} disabled={!selected && selectedItems.length >= box.maxSelections} onClick={() => toggleItem(product.id)} className={`focus-ring flex min-h-24 items-center gap-3 rounded-2xl border p-3 text-start disabled:opacity-40 ${selected ? 'border-[var(--color-gold)] bg-[#c7982f]/10' : 'border-[var(--color-border)]'}`}><img src={getProductImage(product)} alt="" width={64} height={64} loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover"/><span className="min-w-0 flex-1"><span dir="auto" className={`block whitespace-normal break-words text-sm ${nameTypography}`}>{getLocalized(product, 'name', language)}</span><span className="mt-1 block text-[11px] text-[var(--color-accent-text)]"><bdi>200g · Rs. {hamperSelectionPrice(product)?.toLocaleString()}</bdi></span></span><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${selected ? 'border-[#1e3a2b] bg-[#1e3a2b] text-[#e4c783]' : 'border-[var(--color-border)]'}`}>{selected && <Check size={14}/>}</span></button>;
        })}</div>{!selectionValid && <p role="status" dir="auto" className="mt-4 text-xs leading-6 text-[var(--color-accent-text)]">{invalidMessage}</p>}</div>}
        {step === 3 && <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5"><h4 className="font-serif text-xl">{t('cardTitle')}</h4><div><label htmlFor="hamper-recipient" className="mb-2 block text-xs font-medium">{t('recipient')}</label><input id="hamper-recipient" type="text" value={recipientName} maxLength={100} autoComplete="off" onChange={event => setRecipientName(event.target.value)} placeholder={t('recipientPlaceholder')} className="min-h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-4 text-base focus-visible:outline-[var(--color-gold)]"/></div><div><label htmlFor="hamper-message" className="mb-2 block text-xs font-medium">{t('message')}</label><textarea id="hamper-message" value={giftMessage} maxLength={500} rows={3} onChange={event => setGiftMessage(event.target.value)} placeholder={t('messagePlaceholder')} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-4 text-base focus-visible:outline-[var(--color-gold)]"/></div><div className="rounded-2xl border border-[#c7982f]/40 bg-[#12382a] p-5 text-[#fff8e9]"><h5 className="font-serif text-lg text-[#e4c783]">{t('summary')}</h5><p className="mt-3 text-sm">{getLocalized(box, 'name', language)}</p><p className="mt-3 text-xs leading-6"><strong>{t('contents')}: </strong>{selectedItems.map(id => getLocalized(PRODUCTS.find(product => product.id === id), 'name', language)).join('، ')}</p><p className="mt-3 text-xs">{t('netWeight')}: <bdi>{selectedItems.length * HAMPER_PORTION_GRAMS}g</bdi></p></div></div>}
      </div>
      <div className="flex shrink-0 flex-col gap-4 border-t border-[var(--color-border)] bg-[var(--color-base)] p-4 sm:flex-row sm:items-center sm:justify-between"><div dir="auto"><span className="block text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">{t('total')}</span><strong className="font-serif text-2xl text-[var(--color-accent-text)]"><bdi>Rs. {totalPrice.toLocaleString()}</bdi></strong></div><div className="flex gap-3">{step > 1 && <button type="button" onClick={() => setStep(step === 3 ? 2 : 1)} className="focus-ring min-h-12 rounded-full border border-[var(--color-border)] px-5 text-xs font-medium">{t('back')}</button>}<button type="button" disabled={step === 2 ? !selectionValid : step === 3 ? !resolved : false} onClick={step === 3 ? finish : () => setStep(step === 1 ? 2 : 3)} className="focus-ring flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-[#c7982f]/40 bg-[#1e3a2b] px-6 text-xs font-semibold text-[#fff8e9] disabled:opacity-40">{step === 3 ? <ShoppingBag size={16}/> : null}<span dir="auto">{t(step === 3 ? 'add' : 'continue')}</span>{step < 3 && <ArrowRight size={16} className="text-[#e4c783]"/>}</button></div></div>
    </motion.div>
  </div>;
}
