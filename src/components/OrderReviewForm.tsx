import React, { useState } from 'react';
import { Camera, CheckCircle2, AlertCircle, Star, X } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { apiUrl } from '../lib/apiUrl';
import { prepareReviewPhoto } from '../utils/prepareReviewPhoto';

const COPY: Record<
  LanguageCode,
  {
    eyebrow: string;
    heading: string;
    subtitle: string;
    ratingLabel: string;
    nameLabel: string;
    namePlaceholder: string;
    areaLabel: string;
    areaPlaceholder: string;
    areaHint: string;
    itemLabel: string;
    itemPlaceholder: string;
    reviewLabel: string;
    reviewPlaceholder: string;
    photoLabel: string;
    photoHint: string;
    removePhoto: string;
    submit: string;
    submitting: string;
    submittedTitle: string;
    submittedBody: string;
    alreadySubmitted: string;
    validationError: string;
    submitError: string;
    photoError: string;
  }
> = {
  en: {
    eyebrow: 'Verified order feedback',
    heading: 'Leave a review',
    subtitle: 'Share how your order arrived. Reviews are saved as drafts and published after AllBarka verification.',
    ratingLabel: 'Your rating',
    nameLabel: 'Your name',
    namePlaceholder: 'e.g. Ayesha S.',
    areaLabel: 'Area & city',
    areaPlaceholder: 'e.g. DHA Phase 6, Lahore',
    areaHint: 'Area and city only — never your street address.',
    itemLabel: 'Item ordered',
    itemPlaceholder: 'e.g. Ajwa Dates or Dry Fruit Hamper',
    reviewLabel: 'Your review',
    reviewPlaceholder: 'How were the taste, freshness, and packaging?',
    photoLabel: 'Optional photo (1 max)',
    photoHint: 'Resized to 1200px WebP with location/EXIF stripped automatically.',
    removePhoto: 'Remove photo',
    submit: 'Submit review',
    submitting: 'Submitting…',
    submittedTitle: 'Thank you for your feedback',
    submittedBody: 'Your review has been saved as a draft and will appear on the storefront once verified by AllBarka.',
    alreadySubmitted: 'A review has already been submitted for this order.',
    validationError: 'Please fill in your name, area, item, rating, and at least 10 characters of feedback.',
    submitError: 'Could not submit your review right now. Please try again shortly.',
    photoError: 'Please choose a valid JPG, PNG, or WebP photo.',
  },
  ur: {
    eyebrow: 'تصدیق شدہ آرڈر تاثرات',
    heading: 'ریویو دیں',
    subtitle: 'اپنا تجربہ شیئر کریں۔ ریویو پہلے ڈرافٹ کے طور پر محفوظ ہوتا ہے اور آل برکہ کی تصدیق کے بعد شائع کیا جاتا ہے۔',
    ratingLabel: 'آپ کی درجہ بندی',
    nameLabel: 'آپ کا نام',
    namePlaceholder: 'مثلاً عائشہ س.',
    areaLabel: 'علاقہ اور شہر',
    areaPlaceholder: 'مثلاً ڈی ایچ اے فیز 6، لاہور',
    areaHint: 'صرف علاقہ اور شہر لکھیں — مکمل گلی یا گھر کا پتہ نہیں۔',
    itemLabel: 'منگوائی گئی چیز',
    itemPlaceholder: 'مثلاً عجوہ کھجور یا ڈرائی فروٹ ہیمپر',
    reviewLabel: 'آپ کا تبصرہ',
    reviewPlaceholder: 'ذائقہ، تازگی اور پیکنگ کیسی رہی؟',
    photoLabel: 'اختیاری تصویر (زیادہ سے زیادہ 1)',
    photoHint: 'تصویر خودکار طور پر 1200px WebP میں تبدیل ہوتی ہے اور لوکیشن/EXIF ہٹا دیا جاتا ہے۔',
    removePhoto: 'تصویر ہٹائیں',
    submit: 'ریویو جمع کریں',
    submitting: 'جمع ہو رہا ہے…',
    submittedTitle: 'آپ کے قیمتی تاثرات کا شکریہ',
    submittedBody: 'آپ کا ریویو ڈرافٹ کے طور پر محفوظ کر لیا گیا ہے اور آل برکہ کی تصدیق کے بعد ویب سائٹ پر ظاہر ہوگا۔',
    alreadySubmitted: 'اس آرڈر کے لیے ریویو پہلے ہی جمع کرایا جا چکا ہے۔',
    validationError: 'براہِ کرم نام، علاقہ، آئٹم، ریٹنگ اور کم از کم 10 حروف کا تبصرہ درج کریں۔',
    submitError: 'اس وقت ریویو جمع نہیں ہو سکا۔ براہِ کرم تھوڑی دیر بعد کوشش کریں۔',
    photoError: 'براہِ کرم درست JPG، PNG یا WebP تصویر منتخب کریں۔',
  },
  ar: {
    eyebrow: 'تقييم طلب موثق',
    heading: 'اترك تقييمًا',
    subtitle: 'شاركنا رأيك في طلبك. يُحفظ التقييم كمسودة أولًا ثم يُنشر بعد مراجعة ألبركة.',
    ratingLabel: 'تقييمك',
    nameLabel: 'الاسم',
    namePlaceholder: 'مثال: عائشة س.',
    areaLabel: 'المنطقة والمدينة',
    areaPlaceholder: 'مثال: لاهور',
    areaHint: 'المنطقة والمدينة فقط — دون كتابة عنوان الشارع.',
    itemLabel: 'المنتج المطلوب',
    itemPlaceholder: 'مثال: تمر عجوة أو صندوق هدايا',
    reviewLabel: 'ملاحظاتك',
    reviewPlaceholder: 'كيف كان الطعم والجودة والتغليف؟',
    photoLabel: 'صورة اختيارية (صورة واحدة)',
    photoHint: 'يتم تصغير الصورة إلى 1200px WebP وإزالة بيانات الموقع تلقائيًا.',
    removePhoto: 'إزالة الصورة',
    submit: 'إرسال التقييم',
    submitting: 'جارٍ الإرسال…',
    submittedTitle: 'شكرًا لمشاركة تجربتك',
    submittedBody: 'تم حفظ تقييمك كمسودة وسيظهر في المتجر بعد مراجعته واعتماده من فريق ألبركة.',
    alreadySubmitted: 'تم إرسال تقييم لهذا الطلب مسبقًا.',
    validationError: 'يرجى إدخال الاسم والمنطقة والمنتج والتقييم وكتابة 10 أحرف على الأقل.',
    submitError: 'تعذر إرسال التقييم حاليًا. يرجى المحاولة لاحقًا.',
    photoError: 'يرجى اختيار صورة صالحة بصيغة JPG أو PNG أو WebP.',
  },
};

export interface OrderReviewFormProps {
  orderId: string;
  phoneLast4: string;
  defaultArea?: string;
  defaultItem?: string;
}

export default function OrderReviewForm({
  orderId,
  phoneLast4,
  defaultArea = '',
  defaultItem = '',
}: OrderReviewFormProps) {
  const { language, isRtl } = useLanguage();
  const copy = COPY[language] || COPY.en;

  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [area, setArea] = useState(defaultArea);
  const [item, setItem] = useState(defaultItem);
  const [review, setReview] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoPayload, setPhotoPayload] = useState<{ base64: string; mime: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const prepared = await prepareReviewPhoto(file);
      setPhotoPayload({ base64: prepared.base64, mime: prepared.mime });
      setPhotoPreview(`data:${prepared.mime};base64,${prepared.base64}`);
    } catch {
      setError(copy.photoError);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 2 || area.trim().length < 2 || item.trim().length < 2 || review.trim().length < 10) {
      setError(copy.validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/reviews/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          orderId,
          phoneLast4,
          name: name.trim(),
          area: area.trim(),
          item: item.trim(),
          rating,
          review: review.trim(),
          ...(photoPayload ? { photoBase64: photoPayload.base64, photoMime: photoPayload.mime } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 && data.success) {
        setSubmitted(true);
        return;
      }
      if (res.status === 409 || data.code === 'REVIEW_ALREADY_SUBMITTED') {
        setError(copy.alreadySubmitted);
        return;
      }
      setError(copy.submitError);
    } catch {
      setError(copy.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section
        dir={isRtl ? 'rtl' : 'ltr'}
        data-testid="order-review-submitted"
        className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800 space-y-1.5"
        role="status"
      >
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 size={18} aria-hidden="true" />
          <h4 className="text-sm font-bold">{copy.submittedTitle}</h4>
        </div>
        <p className="text-xs leading-relaxed text-emerald-800/90 dark:text-emerald-200/90">
          {copy.submittedBody}
        </p>
      </section>
    );
  }

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="order-review-form"
      aria-labelledby="order-review-heading"
      className="p-5 sm:p-6 rounded-2xl bg-[var(--color-base,#FDFBF7)] dark:bg-zinc-900/70 border border-[#C7982F]/30 space-y-4"
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#806326] dark:text-[#E4C783]">{copy.eyebrow}</p>
        <h4 id="order-review-heading" className="font-serif text-lg font-bold text-[#042821] dark:text-[#FAF9F5]">
          {copy.heading}
        </h4>
        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">{copy.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <span className="block text-xs font-semibold text-[#042821] dark:text-[#E4C783]">
            {copy.ratingLabel}
          </span>
          <div className="flex items-center gap-1" role="radiogroup" aria-label={copy.ratingLabel}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} / 5`}
                onClick={() => setRating(value)}
                className="focus-ring inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#C7982F]/25 bg-[var(--color-surface,#FFFCF7)] dark:bg-zinc-800 cursor-pointer"
              >
                <Star
                  size={18}
                  aria-hidden="true"
                  className={value <= rating ? 'fill-[#C7982F] text-[#C7982F]' : 'text-neutral-400'}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label htmlFor="track-review-name" className="block text-xs font-semibold text-[#042821] dark:text-[#FAF9F5]">
              {copy.nameLabel} *
            </label>
            <input
              id="track-review-name"
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.namePlaceholder}
              className="w-full min-h-[44px] rounded-xl border border-[#C7982F]/35 bg-[var(--color-surface,#FFFCF7)] dark:bg-zinc-800 px-3.5 text-sm text-[#29231D] dark:text-[#FAF9F5] focus:outline-none focus:ring-2 focus:ring-[#C7982F]/40"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="track-review-area" className="block text-xs font-semibold text-[#042821] dark:text-[#FAF9F5]">
              {copy.areaLabel} *
            </label>
            <input
              id="track-review-area"
              type="text"
              required
              maxLength={120}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder={copy.areaPlaceholder}
              className="w-full min-h-[44px] rounded-xl border border-[#C7982F]/35 bg-[var(--color-surface,#FFFCF7)] dark:bg-zinc-800 px-3.5 text-sm text-[#29231D] dark:text-[#FAF9F5] focus:outline-none focus:ring-2 focus:ring-[#C7982F]/40"
            />
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{copy.areaHint}</p>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="track-review-item" className="block text-xs font-semibold text-[#042821] dark:text-[#FAF9F5]">
            {copy.itemLabel} *
          </label>
          <input
            id="track-review-item"
            type="text"
            required
            maxLength={160}
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder={copy.itemPlaceholder}
            className="w-full min-h-[44px] rounded-xl border border-[#C7982F]/35 bg-[var(--color-surface,#FFFCF7)] dark:bg-zinc-800 px-3.5 text-sm text-[#29231D] dark:text-[#FAF9F5] focus:outline-none focus:ring-2 focus:ring-[#C7982F]/40"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="track-review-text" className="block text-xs font-semibold text-[#042821] dark:text-[#FAF9F5]">
            {copy.reviewLabel} *
          </label>
          <textarea
            id="track-review-text"
            required
            rows={3}
            minLength={10}
            maxLength={1200}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={copy.reviewPlaceholder}
            className="w-full rounded-xl border border-[#C7982F]/35 bg-[var(--color-surface,#FFFCF7)] dark:bg-zinc-800 p-3.5 text-sm text-[#29231D] dark:text-[#FAF9F5] focus:outline-none focus:ring-2 focus:ring-[#C7982F]/40"
          />
        </div>

        <div className="space-y-2">
          <label className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#C7982F]/35 bg-[var(--color-surface,#FFFCF7)] dark:bg-zinc-800 px-3.5 text-xs font-semibold text-[#042821] dark:text-[#FAF9F5] cursor-pointer">
            <Camera size={15} className="text-[#C7982F]" aria-hidden="true" />
            <span>{copy.photoLabel}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="sr-only"
            />
          </label>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{copy.photoHint}</p>

          {photoPreview && (
            <div className="relative inline-block">
              <img
                src={photoPreview}
                alt=""
                className="h-24 w-32 rounded-xl border border-[#C7982F]/30 object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setPhotoPreview(null);
                  setPhotoPayload(null);
                }}
                aria-label={copy.removePhoto}
                className="absolute -top-2 -end-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#042821] text-white shadow cursor-pointer"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#042821] px-6 py-2.5 text-xs font-bold text-[#FAF9F5] transition-colors hover:bg-[#073d32] dark:bg-[#C7982F] dark:text-[#042821] disabled:opacity-50 cursor-pointer"
        >
          {submitting ? copy.submitting : copy.submit}
        </button>
      </form>
    </section>
  );
}
