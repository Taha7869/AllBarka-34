import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { ShieldCheck, Lock, Truck, RefreshCcw } from 'lucide-react';
import ScrollReveal from './motion/ScrollReveal';

export default function TrustBadges() {
  const { t, isRtl } = useLanguage();

  const badges = [
    {
      icon: ShieldCheck,
      title: t('trust.authentic', '100% Authentic'),
      desc: t('trust.authenticDesc', 'Hand-graded and packed in Lahore')
    },
    {
      icon: Lock,
      title: t('trust.secureCheckout', 'Secure Checkout'),
      desc: t('trust.secureCheckoutDesc', 'Cash on delivery or bank transfer; account details confirmed by our team')
    },
    {
      icon: Truck,
      title: t('trust.fastDelivery', 'Fast Delivery'),
      desc: t('trust.fastDeliveryDesc', 'Same-day in Lahore, fast nationwide')
    },
    {
      icon: RefreshCcw,
      title: t('trust.easyReturns', 'Easy Returns'),
      desc: t('trust.easyReturnsDesc', 'Hassle-free replacement guarantee')
    }
  ];

  return (
    <div className="w-full bg-[var(--color-surface)] py-5 sm:py-10 md:py-14 border-t border-[var(--color-border)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          {badges.map((badge, idx) => (
            <ScrollReveal key={idx} index={idx} className="flex flex-col items-center text-center rounded-xl border border-[var(--color-border)]/70 sm:border-0 bg-[var(--color-base)]/40 sm:bg-transparent p-3 sm:p-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[var(--color-base)] border border-[var(--color-accent)]/30 text-[var(--color-accent)] flex items-center justify-center mb-2 sm:mb-4 shadow-[var(--shadow-card)]">
                <badge.icon size={18} className="sm:hidden" aria-hidden="true" />
                <badge.icon size={24} className="hidden sm:block" aria-hidden="true" />
              </div>
              <h3 className="font-serif font-bold text-xs sm:text-sm text-[var(--color-ink)] mb-1 sm:mb-1.5">
                {badge.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-[var(--color-ink)]/70 max-w-[200px] leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                {badge.desc}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
