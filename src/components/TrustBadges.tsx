import React from 'react';
import { ShieldCheck, Leaf, CreditCard, Truck, Package, Star } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface TrustBadgesProps {
  className?: string;
  variant?: 'grid' | 'strip';
}

export default function TrustBadges({ className = '', variant = 'grid' }: TrustBadgesProps) {
  const { t } = useLanguage();

  // Only factual, safe badges — no "lab tested", "certified organic", or false claims
  const badges = [
    {
      id: 'halal',
      icon: <Star size={20} strokeWidth={1.5} />,
      title: t('trust.halal', 'Halal Friendly'),
      desc: t('trust.halalDesc', 'All products are halal-friendly with no prohibited ingredients'),
    },
    {
      id: 'natural',
      icon: <Leaf size={20} strokeWidth={1.5} />,
      title: t('trust.natural', 'Natural Ingredients'),
      desc: t('trust.naturalDesc', 'No artificial colors, flavors, or preservatives'),
    },
    {
      id: 'secure',
      icon: <ShieldCheck size={20} strokeWidth={1.5} />,
      title: t('trust.secureCheckout', 'Secure Checkout'),
      desc: t('trust.secureCheckoutDesc', 'Your data is safe with encrypted payment processing'),
    },
    {
      id: 'cod',
      icon: <CreditCard size={20} strokeWidth={1.5} />,
      title: t('trust.cod', 'COD Available'),
      desc: t('trust.codDesc', 'Pay on delivery — no advance payment required'),
    },
    {
      id: 'delivery',
      icon: <Truck size={20} strokeWidth={1.5} />,
      title: t('trust.delivery', 'Pakistan-Wide Delivery'),
      desc: t('trust.deliveryDesc', 'Shipped to all major cities across Pakistan'),
    },
    {
      id: 'fresh',
      icon: <Package size={20} strokeWidth={1.5} />,
      title: t('trust.fresh', 'Fresh Batch Promise'),
      desc: t('trust.freshDesc', 'Packed and dispatched fresh from our Lahore facility'),
    },
  ];

  if (variant === 'strip') {
    return (
      <div className={`w-full overflow-x-auto pb-2 [scrollbar-width:none] ${className}`}>
        <div className="flex items-center gap-6 min-w-max px-2">
          {badges.map((badge) => (
            <div key={badge.id} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-[#1E3A2B]/5 dark:bg-[#1E3A2B]/20 border border-[#C5A059]/20 flex items-center justify-center text-[#1E3A2B] dark:text-[#E4C783] group-hover:text-[#C5A059] group-hover:bg-[#C5A059]/10 transition-colors shrink-0">
                {badge.icon}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-[#29231D] dark:text-[#F6F1EA] whitespace-nowrap">{badge.title}</span>
                <span className="text-[10px] text-[#29231D]/60 dark:text-[#F6F1EA]/50 whitespace-nowrap">{badge.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${className}`}>
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="flex flex-col items-center text-center p-4 rounded-2xl bg-[#FDFBF7] dark:bg-[#1A201E] border border-[#C5A059]/15 hover:border-[#C5A059]/40 hover:shadow-xs transition-all group"
        >
          <div className="text-[#1E3A2B] dark:text-[#E4C783] mb-3 group-hover:scale-110 transition-transform">
            {badge.icon}
          </div>
          <span className="text-[11px] font-bold text-[#29231D] dark:text-[#F6F1EA] mb-1 leading-snug">{badge.title}</span>
          <span className="text-[10px] text-[#29231D]/60 dark:text-[#F6F1EA]/50 leading-snug">{badge.desc}</span>
        </div>
      ))}
    </div>
  );
}
