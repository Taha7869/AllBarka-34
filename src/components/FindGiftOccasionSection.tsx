import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Heart, Moon, Compass, Baby, Building2, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface OccasionDestination {
  id: string;
  titleKey: string;
  defaultTitle: string;
  subtitleKey: string;
  defaultSubtitle: string;
  path: string;
  badgeKey?: string;
  defaultBadge?: string;
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

export const OCCASION_DESTINATIONS: OccasionDestination[] = [
  {
    id: 'wedding',
    titleKey: 'occasion.weddingTitle',
    defaultTitle: 'Wedding & Nikkah',
    subtitleKey: 'occasion.weddingSub',
    defaultSubtitle: 'Bespoke bid boxes & wedding favors',
    path: '/shop/celebration-boxes?occasion=wedding',
    badgeKey: 'occasion.badgeFestive',
    defaultBadge: 'Nikkah Favors',
    icon: Heart,
  },
  {
    id: 'umrah',
    titleKey: 'occasion.umrahTitle',
    defaultTitle: 'Umrah & Hajj',
    subtitleKey: 'occasion.umrahSub',
    defaultSubtitle: 'Tabarruk box sets & date assortments',
    path: '/shop/celebration-boxes?occasion=umrah',
    badgeKey: 'occasion.badgeSpiritual',
    defaultBadge: 'Tabarruk',
    icon: Compass,
  },
  {
    id: 'ramadan',
    titleKey: 'occasion.ramadanTitle',
    defaultTitle: 'Ramadan & Eid',
    subtitleKey: 'occasion.ramadanSub',
    defaultSubtitle: 'Iftar boxes & festive gift hampers',
    path: '/shop?occasion=ramadan',
    badgeKey: 'occasion.badgeSeasonal',
    defaultBadge: 'Festive',
    icon: Moon,
  },
  {
    id: 'birth',
    titleKey: 'occasion.birthTitle',
    defaultTitle: 'Birth & Aqeeqah',
    subtitleKey: 'occasion.birthSub',
    defaultSubtitle: 'Baby arrival & announcement boxes',
    path: '/shop/celebration-boxes?occasion=birth',
    badgeKey: 'occasion.badgeCelebration',
    defaultBadge: 'Aqeeqah',
    icon: Baby,
  },
  {
    id: 'corporate',
    titleKey: 'occasion.corporateTitle',
    defaultTitle: 'Corporate Gifting',
    subtitleKey: 'occasion.corporateSub',
    defaultSubtitle: 'Executive tiers & custom branding',
    path: '/wholesale',
    badgeKey: 'occasion.badgeExecutive',
    defaultBadge: 'Bulk Tiers',
    icon: Building2,
  },
];

export default function FindGiftOccasionSection() {
  const { t, isRtl } = useLanguage();

  return (
    <section
      id="gift-for-occasion"
      aria-label={t('home.occasionTitle', 'Find a Gift for Your Occasion')}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="find-gift-occasion w-full border-y border-[var(--color-border)] bg-[var(--color-base)] py-12 sm:py-16 text-[var(--color-ink)]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8 max-w-2xl text-left">
          <div className="mb-2.5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C7982F]">
            <Sparkles size={13} aria-hidden="true" />
            <span>{t('home.occasionEyebrow', 'Thoughtful Milestones')}</span>
          </div>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-[var(--color-ink)] sm:text-4xl leading-tight">
            {t('home.occasionTitle', 'Find a Gift for Your Occasion')}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {t(
              'home.occasionSubtitle',
              'Bespoke dry fruit favors and celebration boxes tailored for life’s blessed occasions.'
            )}
          </p>
        </div>

        {/* Compact Destination Links Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {OCCASION_DESTINATIONS.map(({ id, titleKey, defaultTitle, subtitleKey, defaultSubtitle, path, badgeKey, defaultBadge, icon: Icon }) => (
            <Link
              key={id}
              to={path}
              className="focus-ring group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#C7982F]/70 hover:shadow-sm"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C7982F]/30 bg-[#C7982F]/10 text-[#C7982F] transition-colors group-hover:border-[#C7982F] group-hover:bg-[#C7982F] group-hover:text-[#042821]">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  {badgeKey && (
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {t(badgeKey, defaultBadge)}
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-lg font-semibold leading-snug text-[var(--color-ink)] group-hover:text-[#C7982F] transition-colors">
                  {t(titleKey, defaultTitle)}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {t(subtitleKey, defaultSubtitle)}
                </p>
              </div>

              <div className="mt-5 flex items-center gap-1.5 text-[11px] font-semibold text-[#C7982F]">
                <span>{t('occasion.exploreDest', 'Explore favors')}</span>
                <ArrowUpRight
                  size={14}
                  className={`transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                    isRtl ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
