import React, { useEffect, useRef, useState } from 'react';
import { Building2, Check, Copy, Smartphone } from 'lucide-react';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { usePaymentDetails } from '../hooks/usePaymentDetails';
import type { PublicPaymentDetails } from '../lib/paymentDetails';

const CARD_COPY: Record<
  LanguageCode,
  {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban: string;
    raastId: string;
    walletsHeading: string;
    copy: string;
    copied: string;
    copyAria: string;
    referenceWithOrder: string;
    referenceBeforeOrder: string;
    orderIdLabel: string;
    loading: string;
  }
> = {
  en: {
    bankName: 'Bank',
    accountTitle: 'Account title',
    accountNumber: 'Account number',
    iban: 'IBAN',
    raastId: 'Raast ID',
    walletsHeading: 'Mobile wallets',
    copy: 'Copy',
    copied: 'Copied',
    copyAria: 'Copy {label}',
    referenceWithOrder: 'Write your Order ID in the payment reference:',
    referenceBeforeOrder: 'Write your Order ID in the payment reference (shown right after placing your order).',
    orderIdLabel: 'Order ID',
    loading: 'Loading transfer details…',
  },
  ur: {
    bankName: 'بینک',
    accountTitle: 'اکاؤنٹ ٹائٹل',
    accountNumber: 'اکاؤنٹ نمبر',
    iban: 'IBAN',
    raastId: 'راست آئی ڈی (Raast)',
    walletsHeading: 'موبائل والٹس',
    copy: 'کاپی',
    copied: 'کاپی ہو گیا',
    copyAria: '{label} کاپی کریں',
    referenceWithOrder: 'پیمنٹ ریفرنس میں اپنا آرڈر آئی ڈی لکھیں:',
    referenceBeforeOrder: 'پیمنٹ ریفرنس میں اپنا آرڈر آئی ڈی لکھیں (آرڈر کے فوراً بعد ظاہر ہوگا)۔',
    orderIdLabel: 'آرڈر آئی ڈی',
    loading: 'بینک تفصیلات لوڈ ہو رہی ہیں…',
  },
  ar: {
    bankName: 'البنك',
    accountTitle: 'اسم الحساب',
    accountNumber: 'رقم الحساب',
    iban: 'رقم الآيبان (IBAN)',
    raastId: 'معرّف Raast',
    walletsHeading: 'المحافظ الإلكترونية',
    copy: 'نسخ',
    copied: 'تم النسخ',
    copyAria: 'نسخ {label}',
    referenceWithOrder: 'اكتب رقم طلبك في مرجع الدفع:',
    referenceBeforeOrder: 'اكتب رقم طلبك في مرجع الدفع (يظهر مباشرة بعد تأكيد الطلب).',
    orderIdLabel: 'رقم الطلب',
    loading: 'جارٍ تحميل بيانات التحويل…',
  },
};

async function copyTextToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* Fall back to textarea copy below. */
  }
  if (typeof document === 'undefined') return false;
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export interface BankTransferDetailsCardProps {
  orderId?: string;
  /** Optional override for tests or preloaded views. */
  initialDetails?: PublicPaymentDetails | null;
  className?: string;
}

interface CopyRow {
  key: string;
  label: string;
  value: string;
  mono?: boolean;
}

export default function BankTransferDetailsCard({
  orderId,
  initialDetails,
  className = '',
}: BankTransferDetailsCardProps) {
  const { t, language, isRtl } = useLanguage();
  const copy = CARD_COPY[language] || CARD_COPY.en;
  const { details, loading } = usePaymentDetails(initialDetails);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState('');
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleCopy = async (key: string, label: string, value: string) => {
    const ok = await copyTextToClipboard(value);
    if (!ok) return;
    setCopiedKey(key);
    setLiveStatus(`${label}: ${copy.copied}`);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 2000);
  };

  const bankRows: CopyRow[] = [];
  if (details) {
    if (details.bankName) {
      bankRows.push({ key: 'bankName', label: copy.bankName, value: details.bankName });
    }
    if (details.accountTitle) {
      bankRows.push({ key: 'accountTitle', label: copy.accountTitle, value: details.accountTitle });
    }
    if (details.accountNumber) {
      bankRows.push({ key: 'accountNumber', label: copy.accountNumber, value: details.accountNumber, mono: true });
    }
    if (details.iban) {
      bankRows.push({ key: 'iban', label: copy.iban, value: details.iban, mono: true });
    }
    if (details.raastId) {
      bankRows.push({ key: 'raastId', label: copy.raastId, value: details.raastId, mono: true });
    }
  }

  const wallets = details?.wallets ?? [];

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="bank-transfer-details-card"
      aria-label={t('payment.transferDetails')}
      className={`rounded-2xl border border-[#C7982F]/45 bg-[#FAF6EE] dark:bg-[#14201C] dark:border-[#D4A843]/40 p-4 sm:p-5 text-start text-xs text-[#29231D] dark:text-[#F6F1EA] shadow-2xs space-y-3 ${className}`}
    >
      <div className="flex items-center gap-2 text-[#806326] dark:text-[#E8C97A] font-bold text-xs sm:text-sm">
        <Building2 size={15} aria-hidden="true" className="shrink-0" />
        <span>{t('payment.transferDetails')}</span>
      </div>

      {loading ? (
        <p role="status" className="text-xs text-[#595148] dark:text-[#C8D3CF]">
          {copy.loading}
        </p>
      ) : details ? (
        <div className="space-y-3">
          {bankRows.length > 0 && (
            <dl className="space-y-2">
              {bankRows.map((row) => {
                const isCopied = copiedKey === row.key;
                return (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-2.5 rounded-xl border border-[#C7982F]/25 bg-[#FFFCF7] dark:bg-[#1C2A25] dark:border-[#D4A843]/25 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <dt className="text-[11px] font-medium text-[#595148] dark:text-[#C4CFCB]">
                        {row.label}
                      </dt>
                      <dd
                        className={`mt-0.5 font-semibold text-[#1B1713] dark:text-[#FAF7F0] break-all ${
                          row.mono ? 'font-mono text-[11px] sm:text-[13px]' : 'text-xs sm:text-[13px]'
                        }`}
                      >
                        <bdi dir={row.mono ? 'ltr' : 'auto'}>{row.value}</bdi>
                      </dd>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopy(row.key, row.label, row.value)}
                      aria-label={copy.copyAria.replace('{label}', row.label)}
                      className="focus-ring inline-flex min-h-[44px] sm:min-h-[36px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#042821]/25 bg-[#042821] px-2.5 py-1.5 text-[11px] font-semibold text-[#FDFBF7] transition-colors hover:bg-[#0B3B31] dark:border-[#D4A843]/40 dark:bg-[#D4A843] dark:text-[#121615] dark:hover:bg-[#E2BA5A] cursor-pointer"
                    >
                      {isCopied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                      <span>{isCopied ? copy.copied : copy.copy}</span>
                    </button>
                  </div>
                );
              })}
            </dl>
          )}

          {wallets.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#806326] dark:text-[#E8C97A]">
                <Smartphone size={13} aria-hidden="true" />
                <span>{copy.walletsHeading}</span>
              </div>
              <dl className="space-y-2">
                {wallets.map((wallet, idx) => {
                  const rowKey = `wallet-${idx}`;
                  const isCopied = copiedKey === rowKey;
                  return (
                    <div
                      key={`${wallet.label}-${idx}`}
                      className="flex items-center justify-between gap-2.5 rounded-xl border border-[#C7982F]/25 bg-[#FFFCF7] dark:bg-[#1C2A25] dark:border-[#D4A843]/25 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <dt className="text-[11px] font-medium text-[#595148] dark:text-[#C4CFCB]">
                          {wallet.label}
                        </dt>
                        <dd className="mt-0.5 font-mono text-xs sm:text-[13px] font-semibold text-[#1B1713] dark:text-[#FAF7F0] break-all">
                          <bdi dir="ltr">{wallet.number}</bdi>
                        </dd>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCopy(rowKey, wallet.label, wallet.number)}
                        aria-label={copy.copyAria.replace('{label}', wallet.label)}
                        className="focus-ring inline-flex min-h-[44px] sm:min-h-[36px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#042821]/25 bg-[#042821] px-2.5 py-1.5 text-[11px] font-semibold text-[#FDFBF7] transition-colors hover:bg-[#0B3B31] dark:border-[#D4A843]/40 dark:bg-[#D4A843] dark:text-[#121615] dark:hover:bg-[#E2BA5A] cursor-pointer"
                      >
                        {isCopied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                        <span>{isCopied ? copy.copied : copy.copy}</span>
                      </button>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}

          {/* Payment reference instruction */}
          <div className="rounded-xl border border-[#042821]/20 bg-[#042821]/6 dark:border-[#E8C97A]/35 dark:bg-[#0B352A] px-3.5 py-2.5">
            {orderId ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-[#042821] dark:text-[#FAF7F0] leading-relaxed">
                  <span>{copy.referenceWithOrder} </span>
                  <bdi dir="ltr" className="font-mono font-bold text-[#042821] dark:text-[#E8C97A]">
                    {orderId}
                  </bdi>
                </p>
                <button
                  type="button"
                  onClick={() => void handleCopy('orderId', copy.orderIdLabel, orderId)}
                  aria-label={copy.copyAria.replace('{label}', copy.orderIdLabel)}
                  className="focus-ring inline-flex min-h-[44px] sm:min-h-[34px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-lg border border-[#042821]/30 bg-[#FFFCF7] px-2.5 py-1 text-[11px] font-semibold text-[#042821] hover:bg-[#F2ECE2] dark:border-[#E8C97A]/40 dark:bg-[#14201C] dark:text-[#FAF7F0] dark:hover:bg-[#1C2E28] cursor-pointer"
                >
                  {copiedKey === 'orderId' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                  <span>{copiedKey === 'orderId' ? copy.copied : copy.copy}</span>
                </button>
              </div>
            ) : (
              <p className="text-xs font-medium text-[#042821] dark:text-[#FAF7F0] leading-relaxed">
                {copy.referenceBeforeOrder}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p data-testid="bank-transfer-fallback" className="text-xs leading-relaxed text-[#3F3831] dark:text-[#D9E1DE]">
          {t('payment.confirmInstructions')}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-[#595148] dark:text-[#C8D3CF] pt-0.5">
        {t('payment.shareReceipt')}
      </p>

      <span className="sr-only" role="status" aria-live="polite">
        {liveStatus}
      </span>
    </section>
  );
}
