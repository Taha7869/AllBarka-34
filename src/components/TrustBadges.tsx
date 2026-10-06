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
      desc: t('trust.authenticDesc', 'Ethically sourced single-origin harvests')
    },
    {
      icon: Lock,
      title: t('trust.secureCheckout', 'Secure Checkout'),
      desc: t('trust.secureCheckoutDesc', 'Encrypted payment processing for your safety')
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
    <div className="w-full bg-[var(--color-surface)] py-12 md:py-16 border-t border-[var(--color-border)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {badges.map((badge, idx) => (
            <ScrollReveal key={idx} index={idx} className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-[var(--color-base)] border border-[var(--color-accent)]/30 text-[var(--color-accent)] flex items-center justify-center mb-4 shadow-[var(--shadow-card)]">
                <badge.icon size={24} />
              </div>
              <h4 className="font-serif font-bold text-sm text-[var(--color-ink)] tracking-wide mb-1.5">
                {badge.title}
              </h4>
              <p className="text-xs text-[var(--color-ink)]/70 max-w-[200px] leading-relaxed">
                {badge.desc}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
