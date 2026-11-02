import React, { useState, useId, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MapPin, Package, HeartHandshake, MessageCircle, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { acquireScrollLock } from '../utils/scrollLock';
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
}

export function openOccasionInquiryModal(defaultOccasion: EventType = 'wedding'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-occasion-inquiry', { detail: { defaultOccasion } }));
  }
}

export default function OccasionInquiryModal({ isOpen, onClose, defaultOccasion = 'wedding' }: OccasionInquiryModalProps) {
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
  const [formError, setFormError] = useState<string>('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(t('nameRequired', 'Please enter your full name'));
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setFormError(t('phoneRequired', 'Please enter a valid WhatsApp contact number'));
      return;
    }
    setFormError('');
    setIsSubmitting(true);

    const payload: OccasionInquiryPayload = {
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

    try {
      // Submit to backend inquiries endpoint (fails gracefully if offline or mock)
      await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryType: 'corporate_event',
          topic: eventType,
          eventType,
          city,
          requestedDate,
          quantity,
          packaging: packagingPreference,
          recipientName: name.trim(),
          recipientPhone: phone.trim(),
          notes: notes.trim(),
        }),
      }).catch(() => {
        // network or server unavailable; WhatsApp remains direct backup
      });
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
      const url = buildOccasionWhatsAppUrl(payload);
      window.open(url, '_blank', 'noopener,noreferrer');
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
              <Calendar size={20} />
            </div>
            <div>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[#043327] dark:text-emerald-400">
                {t('occasion.eyebrow', 'Celebrations, Nikkah Favors & Corporate Gifting')}
              </span>
              <h2 id={titleId} className="text-xl font-serif font-bold text-[#120F17] dark:text-[#FAF9F5]">
                {t('occasion.title', 'Bespoke Occasion & Event Planner')}
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {formError && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Event Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
              {t('occasion.eventType', 'Event or Occasion')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EVENT_OPTIONS.map((opt) => {
                const isSelected = eventType === opt.id;
                const label = language === 'ur' ? opt.label_ur : language === 'ar' ? opt.label_ar : opt.label_en;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setEventType(opt.id)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-left focus-ring ${
                      isSelected
                        ? 'border-[#043327] dark:border-emerald-500 bg-[#043327]/5 dark:bg-emerald-950/30 text-[#043327] dark:text-emerald-300 shadow-xs'
                        : 'border-[#D4AF37]/20 bg-white dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 hover:border-[#D4AF37]/40'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Delivery City & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="occasion-city" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                {t('occasion.city', 'Delivery Destination')}
              </label>
              <div className="relative">
                <select
                  id="occasion-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value as DeliveryCity)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D4AF37]/30 bg-white dark:bg-zinc-800 text-sm text-[#120F17] dark:text-[#FAF9F5] focus-ring"
                >
                  {CITY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {language === 'ur' ? c.label_ur : language === 'ar' ? c.label_ar : c.label_en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Requested Date */}
            <div>
              <label htmlFor="occasion-date" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                {t('occasion.date', 'Requested Event Date')}
              </label>
              <input
                id="occasion-date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D4AF37]/30 bg-white dark:bg-zinc-800 text-sm text-[#120F17] dark:text-[#FAF9F5] focus-ring"
              />
            </div>
          </div>

          {/* Lead-Time Turnaround Guidance Banner */}
          <div
            className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
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
                  ? t('occasion.leadUrgent', 'Urgent timeline: rush preparation required. We will prioritize your inquiry via WhatsApp.')
                  : leadTime.status === 'tight'
                  ? t('occasion.leadTight', 'Tight turnaround: we recommend confirming your selection promptly.')
                  : t('occasion.leadSafe', 'Standard lead time is sufficient for handcrafted preparation and express delivery.')}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                Earliest standard delivery: <strong>{leadTime.earliestDeliveryDate}</strong> ({leadTime.prepDays} days craft + {leadTime.transitDays} days transit).
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
                className="w-full px-3 py-2.5 rounded-xl border border-[#D4AF37]/30 bg-white dark:bg-zinc-800 text-sm text-[#120F17] dark:text-[#FAF9F5] focus-ring"
              >
                {PACKAGING_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {language === 'ur' ? p.label_ur : language === 'ar' ? p.label_ar : p.label_en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="occasion-quantity" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                {t('occasion.quantity', 'Estimated Favor Quantity (Units)')}: <strong>{quantity}</strong>
              </label>
              <div className="flex items-center gap-2">
                {[25, 50, 100, 250].map((q) => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors focus-ring ${
                      quantity === q
                        ? 'bg-[#043327] text-white border-[#043327]'
                        : 'bg-white dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 border-[#D4AF37]/20 hover:bg-neutral-100'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-2xl border border-[#D4AF37]/20 bg-white dark:bg-zinc-800 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCard}
              onChange={(e) => setIncludeCard(e.target.checked)}
              className="w-4 h-4 rounded text-[#043327] accent-[#043327] focus-ring"
            />
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              {t('occasion.card', 'Include Personalized Calligraphy Card & Satin Ribbons')}
            </span>
          </label>

          {/* Client Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
                placeholder="e.g. Usman Malik"
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
              placeholder="e.g. Emerald green theme with golden calligraphy, delivery directly to venue."
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
                  ? t('loading', 'Loading...')
                  : t('occasion.submit', 'Request Event Quote & Consult on WhatsApp')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </dialog>,
    document.body
  );
}
