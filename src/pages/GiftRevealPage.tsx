import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Gift, Heart, Sparkles, Check, Package, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { AllBarkaCrestVector } from '../components/AllBarkaLogo';

interface RevealResponse {
  senderName: string;
  recipientName: string;
  giftMessage: string;
  items: {
    productId: string;
    name_en: string;
    name_ur: string;
    name_ar: string;
    image: string;
    weight: string;
    quantity: number;
  }[];
  expiresAt: string;
}

export default function GiftRevealPage() {
  const { token } = useParams<{ token?: string }>();
  const { t, language, isRtl } = useLanguage();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [reveal, setReveal] = useState<RevealResponse | null>(null);
  const [isOpened, setIsOpened] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setError('INVALID_TOKEN');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    fetch(`/api/gift-reveal/${token}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 410) throw new Error('EXPIRED');
        if (!res.ok) throw new Error('NOT_FOUND');
        return res.json();
      })
      .then((data) => {
        setReveal(data);
        setError('');
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message === 'EXPIRED' ? 'EXPIRED' : 'NOT_FOUND');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token]);

  if (loading) {
    return (
      <main className="w-full min-h-[75vh] flex flex-col items-center justify-center p-6 bg-[#FAF9F5] dark:bg-zinc-950" aria-busy="true">
        <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin motion-reduce:animate-none mb-4" />
        <span className="text-xs uppercase tracking-widest font-bold text-[#043327] dark:text-emerald-400">
          {t('reveal.loading', 'Preparing your private gift presentation…')}
        </span>
      </main>
    );
  }

  if (error || !reveal) {
    return (
      <main className="w-full min-h-[75vh] flex items-center justify-center p-6 bg-[#FAF9F5] dark:bg-zinc-950" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-[#D4AF37]/30 rounded-3xl p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Clock size={24} />
          </div>
          <h1 className="text-xl font-serif font-bold text-[#120F17] dark:text-[#FAF9F5] mb-2">
            {error === 'EXPIRED'
              ? t('reveal.expiredTitle', 'Gift Presentation Expired')
              : t('reveal.notFoundTitle', 'Gift Link Not Found')}
          </h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
            {error === 'EXPIRED'
              ? t('reveal.expiredCopy', 'This gift reveal link was active for 30 days and has now expired. Your gift was dispatched directly to your address.')
              : t('reveal.notFoundCopy', 'This private reveal code is invalid or has already been completed.')}
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-[#043327] text-[#FAF9F5] text-xs font-semibold hover:bg-[#074b39] transition-all focus-ring"
          >
            <span>{t('admin.returnStore', 'Explore the Boutique')}</span>
            <ArrowRight size={14} className="rtl-flip" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-[85vh] py-12 px-4 bg-gradient-to-b from-[#FAF9F5] via-[#F4EFE6] to-[#FAF9F5] dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-center" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-xl w-full">
        {/* Brand Crest */}
        <div className="flex flex-col items-center mb-6">
          <AllBarkaCrestVector className="w-12 h-16 text-[#043327] dark:text-emerald-400 mb-2" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#043327] dark:text-emerald-400">
            AllBarka Luxury Gifting
          </span>
        </div>

        {/* Envelope & Reveal Card */}
        <div className="relative bg-white dark:bg-zinc-900 border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden">
          {/* Header Eyebrow */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#043327]/10 dark:bg-emerald-950/40 text-[#043327] dark:text-emerald-300 border border-[#D4AF37]/30 mb-2">
              <Sparkles size={12} />
              {t('reveal.badge', 'Special Delivery for You')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#120F17] dark:text-[#FAF9F5]">
              {reveal.recipientName}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {t('reveal.sentBy', 'Sent with heartfelt warmth by')} <strong className="text-[#043327] dark:text-emerald-400">{reveal.senderName}</strong>
            </p>
          </div>

          {!isOpened ? (
            /* Sealed Envelope State */
            <div className="flex flex-col items-center py-8 border-y border-[#D4AF37]/20 my-4 bg-[#FAF9F5] dark:bg-zinc-800/40 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#043327] text-[#D4AF37] flex items-center justify-center shadow-lg mb-4 border-2 border-[#D4AF37]">
                <Heart size={28} />
              </div>
              <p className="text-sm font-serif italic text-neutral-700 dark:text-neutral-200 max-w-sm mb-6">
                “{t('reveal.envelopePrompt', 'A personalized greeting card and curated artisan harvest selections await inside.')}”
              </p>
              <button
                type="button"
                onClick={() => setIsOpened(true)}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#043327] hover:bg-[#074b39] text-[#FAF9F5] font-semibold text-sm transition-all motion-reduce:transition-none shadow-md focus-ring"
              >
                <Sparkles size={16} />
                <span>{t('reveal.openButton', 'Break Wax Seal & Open Gift Card')}</span>
              </button>
            </div>
          ) : (
            /* Opened Card & Contents View */
            <div className="space-y-6 pt-2">
              {/* Calligraphy Gift Card */}
              {reveal.giftMessage && (
                <div className="p-6 rounded-2xl bg-[#FAF9F5] dark:bg-zinc-800 border-2 border-[#D4AF37]/30 relative shadow-inner">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#043327] dark:text-emerald-400 block mb-2">
                    {t('reveal.messageHeading', 'Personal Greeting')}
                  </span>
                  <p className="text-base font-serif italic text-neutral-800 dark:text-neutral-100 leading-relaxed whitespace-pre-line">
                    “{reveal.giftMessage}”
                  </p>
                  <p className="text-xs font-semibold text-neutral-500 text-right mt-3">
                    — {reveal.senderName}
                  </p>
                </div>
              )}

              {/* Curated Contents (ZERO PRICES) */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-3 flex items-center gap-2">
                  <Package size={14} className="text-[#043327] dark:text-emerald-400" />
                  <span>{t('reveal.contentsHeading', 'Handcrafted Selections Included in Your Hamper')}</span>
                </h3>
                <div className="space-y-2.5">
                  {reveal.items.map((item, idx) => {
                    const itemName = language === 'ur' && item.name_ur ? item.name_ur : language === 'ar' && item.name_ar ? item.name_ar : item.name_en;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-zinc-800/80 border border-[#D4AF37]/20 gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                            <img
                              src={item.image}
                              alt={itemName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/product-placeholder.svg';
                              }}
                            />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#120F17] dark:text-[#FAF9F5]">
                              {itemName}
                            </h4>
                            <p className="text-xs text-neutral-500">
                              {item.quantity} × {item.weight}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-[#043327] dark:text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                          {t('giftItem', 'Artisan Gift')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Authenticity Guarantee */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF9F5] dark:bg-zinc-800 border border-[#D4AF37]/20 text-[11px] text-neutral-600 dark:text-neutral-300">
                <ShieldCheck size={16} className="text-[#D4AF37] shrink-0" />
                <span>{t('reveal.footerGuarantee', 'Packed with food-grade barrier seals for crisp orchard freshness.')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
