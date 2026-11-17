import React, { useState, useRef } from 'react';
import {
  Users,
  Upload,
  Download,
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  MAX_BULK_RECIPIENTS,
  CORPORATE_QUOTE_THRESHOLD,
  parseBulkRecipientsCsv,
  generateSampleBulkCsv,
  validateBulkRecipient,
  type BulkRecipient,
} from '../lib/bulkGifting';

interface MultiRecipientSectionProps {
  isMultiRecipient: boolean;
  onToggle: (enabled: boolean) => void;
  recipients: BulkRecipient[];
  onChangeRecipients: (recipients: BulkRecipient[]) => void;
  onRequestCorporateQuote?: () => void;
}

const COMMON_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Sialkot', 'Gujranwala', 'Quetta'];

export default function MultiRecipientSection({
  isMultiRecipient,
  onToggle,
  recipients,
  onChangeRecipients,
  onRequestCorporateQuote,
}: MultiRecipientSectionProps) {
  const { t, isRtl } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);

  const handleDownloadSample = () => {
    const csvContent = generateSampleBulkCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'allbarka_bulk_gifting_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { recipients: parsed, errors, exceedsMax } = parseBulkRecipientsCsv(text);

      if (errors.length > 0) {
        setCsvErrors(errors);
        setCsvSuccess(null);
      } else {
        setCsvErrors([]);
        onChangeRecipients(parsed);
        setCsvSuccess(
          exceedsMax
            ? `${parsed.length} pate load ho gaye (Maximum ${MAX_BULK_RECIPIENTS} ki hadh lagu hui).`
            : `${parsed.length} pate kamiyabi se load ho gaye.`
        );
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddRow = () => {
    if (recipients.length >= MAX_BULK_RECIPIENTS) return;
    const newRecipient: BulkRecipient = {
      id: `rec-${recipients.length + 1}-${Date.now().toString(36)}`,
      recipientName: '',
      phone: '',
      address: '',
      city: 'Lahore',
      giftMessage: '',
    };
    onChangeRecipients([...recipients, newRecipient]);
  };

  const handleUpdateRow = (index: number, field: keyof BulkRecipient, value: string) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    onChangeRecipients(updated);
  };

  const handleRemoveRow = (index: number) => {
    const updated = recipients.filter((_, i) => i !== index);
    onChangeRecipients(updated);
  };

  return (
    <div className="rounded-2xl border border-[var(--color-gold,#B8935F)]/30 bg-[var(--color-surface,#FDFBF7)] dark:bg-[#1A201E] p-4 sm:p-5 transition-all">
      {/* Header Toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-gold,#B8935F)]/10 text-[var(--color-gold,#B8935F)] flex items-center justify-center shrink-0 mt-0.5">
            <Users size={18} />
          </div>
          <div>
            <label className="font-serif font-black text-sm text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7] cursor-pointer flex items-center gap-2">
              <span>Kai logon ko bhejna hai? (Bulk Gifting)</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-gold,#B8935F)]/15 text-[var(--color-gold,#B8935F)]">
                Multi-Address
              </span>
            </label>
            <p className="text-xs text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/70 mt-0.5">
              Aik hi order mein alag alag paton par tohfe bhejein. Har pate ki delivery alag calculate hogi.
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input
            type="checkbox"
            checked={isMultiRecipient}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-gold,#B8935F)]" />
        </label>
      </div>

      {/* Expanded Multi-Address Interface */}
      {isMultiRecipient && (
        <div className="mt-5 pt-4 border-t border-[var(--color-gold,#B8935F)]/20 space-y-4">
          {/* CSV Tools & Stats Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-black/20 border border-[var(--color-gold,#B8935F)]/20 text-xs">
            <div className="flex items-center gap-2 font-bold text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">
              <span>Pate: {recipients.length} / {MAX_BULK_RECIPIENTS}</span>
              {recipients.length >= CORPORATE_QUOTE_THRESHOLD && (
                <span className="text-[10px] font-black text-amber-600 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  Corporate Tier
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSample}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-gold,#B8935F)]/30 hover:border-[var(--color-gold,#B8935F)] font-semibold text-[var(--color-ink,#1F120F)]/80 dark:text-[#FDFBF7]/80 hover:text-[var(--color-gold,#B8935F)] transition-colors"
              >
                <Download size={13} />
                Sample CSV
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-gold,#B8935F)] text-white font-bold hover:opacity-95 transition-opacity"
              >
                <Upload size={13} />
                CSV Upload Karein
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Feedback Messages */}
          {csvSuccess && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{csvSuccess}</span>
            </div>
          )}

          {csvErrors.length > 0 && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle size={15} className="shrink-0" />
                <span>CSV mein darj zail galtiyan hain:</span>
              </div>
              <ul className="list-disc list-inside ps-4 space-y-0.5">
                {csvErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {csvErrors.length > 5 && <li>...aur {csvErrors.length - 5} mazeed</li>}
              </ul>
            </div>
          )}

          {/* Corporate Bulk Discount Banner (20+ recipients) */}
          {recipients.length >= CORPORATE_QUOTE_THRESHOLD && (
            <div className="p-4 rounded-xl border-2 border-[var(--color-gold,#B8935F)] bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-serif font-black text-sm text-[var(--color-ink,#1F120F)] dark:text-[#FDFBF7]">
                  <Building2 size={16} className="text-[var(--color-gold,#B8935F)]" />
                  <span>Corporate & Bulk Concierge Desk</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-gold,#B8935F)] text-white">
                  20+ Addresses
                </span>
              </div>
              <p className="text-[var(--color-ink,#1F120F)]/80 dark:text-[#FDFBF7]/80">
                Aap ke pas 20 ya is se zyada pate hain. Aap chahein to corporate bulk discount, custom brand sleeves aur direct GST invoice ke liye hamari team se rabta kar sakte hain.
              </p>
              <div className="pt-1">
                <a
                  href={`https://wa.me/923001234567?text=${encodeURIComponent(
                    `Assalam-o-Alaikum AllBarka Team! Mein ${recipients.length} paton ke liye bulk order place karna chahta hoon. Kindly corporate discount quote faraham karein.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <MessageSquare size={14} />
                  Corporate Quote Request Karein (WhatsApp)
                </a>
              </div>
            </div>
          )}

          {/* Recipients Row List */}
          <div className="space-y-3">
            {recipients.map((rec, index) => (
              <div
                key={rec.id || index}
                className="p-3.5 rounded-xl border border-[var(--color-border,#e5e7eb)] dark:border-white/10 bg-white dark:bg-black/30 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--color-gold,#B8935F)] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[var(--color-gold,#B8935F)]/15 flex items-center justify-center text-[10px] font-black">
                      {index + 1}
                    </span>
                    <span>Pata #{index + 1}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Pata hatayein"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/70 mb-1">
                      Recipient Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Zainab Khan"
                      value={rec.recipientName}
                      onChange={(e) => handleUpdateRow(index, 'recipientName', e.target.value)}
                      className="w-full bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-border,#e5e7eb)] rounded-lg py-2 px-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--color-gold,#B8935F)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/70 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="e.g. 0300 1234567"
                      value={rec.phone}
                      onChange={(e) => handleUpdateRow(index, 'phone', e.target.value)}
                      className="w-full bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-border,#e5e7eb)] rounded-lg py-2 px-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--color-gold,#B8935F)]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/70 mb-1">
                      Delivery Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="House/Street, Area, Landmark"
                      value={rec.address}
                      onChange={(e) => handleUpdateRow(index, 'address', e.target.value)}
                      className="w-full bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-border,#e5e7eb)] rounded-lg py-2 px-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--color-gold,#B8935F)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/70 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      list="city-options"
                      placeholder="e.g. Lahore"
                      value={rec.city}
                      onChange={(e) => handleUpdateRow(index, 'city', e.target.value)}
                      className="w-full bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-border,#e5e7eb)] rounded-lg py-2 px-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--color-gold,#B8935F)]"
                    />
                    <datalist id="city-options">
                      {COMMON_CITIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--color-ink,#1F120F)]/70 dark:text-[#FDFBF7]/70 mb-1">
                      Gift Message (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={250}
                      placeholder="Personalized message on card"
                      value={rec.giftMessage || ''}
                      onChange={(e) => handleUpdateRow(index, 'giftMessage', e.target.value)}
                      className="w-full bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-border,#e5e7eb)] rounded-lg py-2 px-2.5 text-xs font-semibold focus:outline-none focus:border-[var(--color-gold,#B8935F)]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Row Button */}
          {recipients.length < MAX_BULK_RECIPIENTS && (
            <button
              type="button"
              onClick={handleAddRow}
              className="w-full py-2.5 rounded-xl border border-dashed border-[var(--color-gold,#B8935F)]/50 hover:border-[var(--color-gold,#B8935F)] hover:bg-[var(--color-gold,#B8935F)]/5 text-[var(--color-gold,#B8935F)] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus size={15} />
              + Naya Pata Shaamil Karein ({recipients.length + 1} of {MAX_BULK_RECIPIENTS})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
