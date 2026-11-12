import React, { useState, useId, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MapPin, Package, HeartHandshake, MessageCircle, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { acquireScrollLock } from '../utils/scrollLock';
import { withApiDeadline } from '../lib/apiDeadline';
import { apiUrl } from '../lib/apiUrl';
import {
  type EventType,
  type DeliveryCity,
  type PackagingPreference,
  EVENT_OPTIONS,
  CITY_OPTIONS,
  PACKAGING_OPTIONS,
  checkEventLeadTime,
  buildOccasionWhatsAppUrl,
  type OccasionInquiryPayload,
} from '../lib/occasionPlanning';

interface OccasionInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOccasion?: EventType;
  /** Optional context from the page that opened the form, such as a chosen design. */
  prefill?: OccasionInquiryPrefill;
}

export interface OccasionInquiryPrefill { notes?: string; quantity?: number; }

export function openOccasionInquiryModal(defaultOccasion: EventType = 'wedding', prefill?: OccasionInquiryPrefill): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-occasion-inquiry', { detail: { defaultOccasion, prefill } }));
  }
}

export default function OccasionInquiryModal({ isOpen, onClose, defaultOccasion = 'wedding', prefill }: OccasionInquiryModalProps) {
  const { t, language, isRtl } = useLanguage();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [eventType, setEventType] = useState<EventType>(defaultOccasion);
  const [city, setCity] = useState<DeliveryCity>('lahore');
  const [packagingPreference, setPackagingPreference] = useState<PackagingPreference>('luxury_tin');
  const [quantity, setQuantity] = useState<number>(50);
  const [requestedDate, setRequestedDate] = useState<string>('');
  const [includeCard, setIncludeCard] = useState<boolean>(true);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [ticketId, setTicketId] = useState<string>('');
  const [formError, setFormError] = useState('');
  const idempotencyKeyRef = useRef<string>('');
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      idempotencyKeyRef.current = `occ-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setSubmitted(false);
      setTicketId('');
      setFormError('');
      setIsSubmitting(false);
      if (prefill?.notes) setNotes(prefill.notes.slice(0, 600));
      if (prefill?.quantity && Number.isSafeInteger(prefill.quantity) && prefill.quantity > 0) setQuantity(prefill.quantity);
    }
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [isOpen, prefill]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    try {
      if (!dialog.open) dialog.showModal();
    } catch {
      // ignore
    }
    const release = acquireScrollLock();
    return () => {
      try {
        if (dialog.open) dialog.close();
      } catch {
        // ignore
      }
      release();
    };
  }, [isOpen]);

  const leadTime = checkEventLeadTime(city, packagingPreference, requestedDate || null);

  const currentPayload: OccasionInquiryPayload = {
    name: name.trim(),
    phone: phone.trim(),
    city,
    eventType,
    requestedDate,
    quantity,
    packagingPreference,
    includeCard,
    notes,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestRef.current) return;
    if (name.trim().length < 2 || name.trim().length > 100) {
      setFormError('occasion.errorName');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setFormError('occasion.errorPhone');
      return;
    }
    const request = new AbortController();
    requestRef.current = request;
    setFormError('');
    setIsSubmitting(true);

    const packagingLabel = PACKAGING_OPTIONS.find(p => p.id === packagingPreference)?.label_en || packagingPreference;
    const combinedNotes = `[Packaging: ${packagingLabel}] [Greeting Card: ${includeCard ? 'Yes, personalized' : 'Standard'}] ${notes.trim()}`.trim();

    try {
      const { ok, result } = await withApiDeadline(async signal => {
        const res = await fetch(apiUrl('/api/inquiries'), {
          signal,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKeyRef.current,
          },
          body: JSON.stringify({
            customerName: name.trim(),
            phone: phone.trim(),
            city,
            type: 'general',
            eventType,
            targetEventDate: requestedDate || null,
            quantity: Math.max(1, Math.min(50000, Math.floor(quantity) || 1)),
            notes: combinedNotes,
            idempotencyKey: idempotencyKeyRef.current,
          }),
        });

        return { ok: res.ok, result: await res.json().catch(() => null) };
      }, 12000, request.signal);
      if (request.signal.aborted) return;

      const id = result?.ticketId ?? result?.id;
      if (!ok || (result?.ok !== true && result?.success !== true) ||
          typeof id !== 'string' || !id.trim() || id.length > 100) {
        if (result?.code === 'MISSING_NAME') setFormError('occasion.errorName');
        else if (result?.code === 'MISSING_PHONE') setFormError('occasion.errorPhone');
        else setFormError('occasion.errorSave');
        return;
      }
      setTicketId(id.trim());
      setSubmitted(true);
    } catch {
      if (!request.signal.aborted) setFormError('occasion.errorSave');
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="occasion-inquiry-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs w-full h-full border-none m-0 max-w-none max-h-none"
      aria-labelledby={titleId}
      dir={isRtl ? 'rtl' : 'ltr'}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] rounded-3xl bg-[#FAF9F5] dark:bg-zinc-900 border border-[#D4AF37]/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#D4AF37]/20 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#043327]/10 dark:bg-emerald-950/40 text-[#043327] dark:text-emerald-400 flex items-center justify-center border border-[#D4AF37]/30">
              <HeartHandshake size={20} />
            </div>
            <div>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[#043327] dark:text-emerald-400">
                {t('occasion.eyebrow', 'Celebrations & Corporate Gifting')}
              </span>
              <h2 id={titleId} className="text-xl font-serif font-bold text-[#120F17] dark:text-[#FAF9F5]">
                {t('occasion.title', 'Event & Occasion Inquiry Kit')}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close', 'Close')}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors focus-ring"
          >
            <X size={20} />
          </button>
        </header>

        {submitted ? (
          /* Submission Success State */
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto border border-emerald-300">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#120F17] dark:text-[#FAF9F5]">
              {t('occasion.successTitle')}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 max-w-md mx-auto leading-relaxed">
              {t('occasion.successMessage')}{' '}
              {ticketId && (
                <span className="block mt-2 font-mono font-bold text-[#043327] dark:text-emerald-400 text-sm">
                  {t('occasion.reference')} <bdi>#{ticketId}</bdi>
                </span>
              )}
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={buildOccasionWhatsAppUrl({
                  ...currentPayload,
                  notes: `[Inquiry Ref: #${ticketId}] ${notes.trim()}`.trim(),
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#043327] hover:bg-[#074b39] text-[#FAF9F5] text-xs font-semibold shadow-md transition-all focus-ring"
              >
                <MessageCircle size={16} />
                <span>{t('occasion.openWhatsAppWithRef')}</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all focus-ring"
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {formError && (
              <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <span>{t(formError)}</span>
                </div>
                <div className="pt-1">
                  <a
                    href={buildOccasionWhatsAppUrl(currentPayload)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold underline hover:opacity-80"
                  >
                    <MessageCircle size={14} />
                    <span>{t('occasion.fallbackWhatsApp')}</span>
                  </a>
                </div>
              </div>
            )}

            {/* Event Type & Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="occasion-type" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                  {t('occasion.eventType', 'Occasion / Event Type')}
                </label>
                <select
                  id="occasion-type"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4AF37]/30 bg-white dark:bg-zinc-800 text-sm text-[#120F17] dark:text-[#FAF9F5] focus-ring"
                >
                  {EVENT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {language === 'ur' ? opt.label_ur : language === 'ar' ? opt.label_ar : opt.label_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="occasion-city" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                  {t('occasion.city', 'Delivery Destination')}
                </label>
                <select
                  id="occasion-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value as DeliveryCity)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4AF37]/30 bg-white dark:bg-zinc-800 text-sm text-[#120F17] dark:text-[#FAF9F5] focus-ring"
                >
                  {CITY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c[`label_${language}`]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Event Date & Lead Time Notice */}
            <div>
              <label htmlFor="occasion-date" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                {t('occasion.date')}
              </label>
              <div className="relative">
                <input
                  id="occasion-date"
                  type="date"
                  value={requestedDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4AF37]/30 bg-white dark:bg-zinc-800 text-sm text-[#120F17] dark:text-[#FAF9F5] focus-ring"
                />
              </div>
            </div>

            {/* Transparent Lead Time Banner */}
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 ${
                leadTime.status === 'urgent'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                  : leadTime.status === 'tight'
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              {leadTime.status === 'urgent' ? (
                <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-600" />
              ) : (
                <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
              )}
              <div>
                <p className="font-semibold">
                  {leadTime.status === 'urgent'
                    ? t('occasion.leadUrgent')
                    : leadTime.status === 'tight'
                    ? t('occasion.leadTight')
                    : t('occasion.leadSafe')}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {t('occasion.preparation').replace('{days}', String(leadTime.prepDays))}
                </p>
              </div>
            </div>

            {/* Packaging Style & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="occasion-packaging" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                  {t('occasion.packaging', 'Favor & Packaging Style')}
                </label>
                <select
                  id="occasion-packaging"
                  value={packagingPreference}
                  onChange={(e) => setPackagingPreference(e.target.value as PackagingPreference)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4AF37]/30 bg-white dark:bg-zinc-800 text-sm text-[#120F17] dark:text-[#FAF9F5] focus-ring"
                >
                  {PACKAGING_OPTIONS.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {language === 'ur' ? pkg.label_ur : language === 'ar' ? pkg.label_ar : pkg.label_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="occasion-quantity" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                  {t('occasion.quantity', 'Estimated Units / Favors')}
                </label>
                <input
                  id="occasion-quantity"
                  type="number"
                  min={1}
                  max={50000}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4AF37]/30 bg-white dark:bg-zinc-800 text-sm text-[#120F17] dark:text-[#FAF9F5] focus-ring"
                />
              </div>
            </div>

            {/* Custom Greeting Card Checkbox */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-zinc-800 border border-[#D4AF37]/20">
              <input
                id="occasion-card"
                type="checkbox"
                checked={includeCard}
                onChange={(e) => setIncludeCard(e.target.checked)}
                className="w-4 h-4 rounded text-[#043327] accent-[#043327] cursor-pointer"
              />
              <label htmlFor="occasion-card" className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                {t('occasion.card')}
              </label>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="occasion-name" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">
                  {t('occasion.name', 'Your Full Name')} *
                </label>
                <input
                  id="occasion-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  dir="auto"
                  maxLength={100}
                  placeholder={t('occasion.name')}
                  className="w-full px-3 py-2 rounded-xl border border-[#D4AF37]/30 bg-white dark:bg-zinc-800 text-sm text-[#120F17] dark:text-[#FAF9F5] focus-ring"
                />
              </div>

              <div>
                <label htmlFor="occasion-phone" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">
                  {t('occasion.phone', 'WhatsApp Contact Number')} *
                </label>
                <input
                  id="occasion-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="0300 1234567"
                  className="w-full px-3 py-2 rounded-xl border border-[#D4AF37]/30 bg-white dark:bg-zinc-800 text-sm text-[#120F17] dark:text-[#FAF9F5] focus-ring"
                />
              </div>
            </div>

            <div>
              <label htmlFor="occasion-notes" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1">
                {t('occasion.notes', 'Special Instructions or Color Theme')}
              </label>
              <textarea
                id="occasion-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                dir="auto"
                placeholder={t('occasion.notesExample')}
                className="w-full px-3 py-2 rounded-xl border border-[#D4AF37]/30 bg-white dark:bg-zinc-800 text-sm text-[#120F17] dark:text-[#FAF9F5] focus-ring"
              />
            </div>

            {/* Disclaimer */}
            <p className="text-[11px] text-neutral-400 italic px-1">
              {t(
                'occasion.disclaimer',
                'A quotation request is an inquiry and estimate, not an accepted order or guaranteed delivery promise.'
              )}
            </p>

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#043327] hover:bg-[#074b39] text-[#FAF9F5] font-semibold text-sm transition-all focus-ring shadow-md disabled:opacity-50"
              >
                <MessageCircle size={18} />
                <span>
                  {isSubmitting
                    ? t('loading', 'Submitting...')
                    : t('occasion.submit')}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>,
    document.body
  );
}
