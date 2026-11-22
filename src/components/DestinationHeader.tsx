import React from 'react';
import { Sparkles, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getSectionCover } from '../config/sectionCovers';

export interface DestinationNotice {
  id: string;
  type?: 'lead-time' | 'advisory' | 'verified';
  text: string;
}

export interface DestinationHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  coverId?: string;
  notices?: DestinationNotice[];
  children?: React.ReactNode;
}

export default function DestinationHeader({
  eyebrow,
  title,
  description,
  badge,
  coverId,
  notices = [],
  children,
}: DestinationHeaderProps) {
  const { t } = useLanguage();
  const cover = getSectionCover(coverId);

  return (
    <header className="relative w-full overflow-hidden rounded-3xl border border-[#c7982f]/30 bg-gradient-to-br from-[#0c382b] via-[#072a20] to-[#041913] p-6 text-[#f5efe2] shadow-xl sm:p-10 lg:p-12 mb-8">
      {cover && (
        <div className="pointer-events-none absolute inset-0">
          <img
            src={cover.src}
            srcSet={cover.srcSet}
            sizes="(max-width: 768px) 100vw, 48vw"
            alt={t(cover.altKey, title)}
            width={800}
            height={800}
            loading="eager"
            decoding="async"
            className="absolute inset-y-0 end-0 h-full w-full sm:w-3/5 lg:w-1/2 object-cover opacity-30 sm:opacity-45"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#072a20] via-[#072a20]/92 to-[#072a20]/45 rtl:bg-gradient-to-l" />
        </div>
      )}
      {/* Background ambient luxury glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#c7982f]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-[#1e5a44]/20 blur-3xl"
      />

      <div className="relative z-10 max-w-4xl">
        {/* Eyebrow & Badge */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c7982f]/40 bg-[#c7982f]/10 px-3 py-1 text-xs font-semibold tracking-wider text-[#e6c786] uppercase">
            <Sparkles size={12} className="text-[#e6c786]" />
            {eyebrow}
          </span>
          {badge && (
            <span className="rounded-full bg-[#c7982f] px-3 py-0.5 text-[11px] font-bold text-[#072a20]">
              {badge}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#fff8e9] sm:text-5xl lg:text-6xl leading-[1.15]">
          {title}
        </h1>

        {/* Description */}
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#d1ded5] max-w-3xl">
          {description}
        </p>

        {/* Advisory Notices (e.g. 10-day lead time, Tabarruk bottle notice, pricing integrity) */}
        {notices.length > 0 && (
          <div className="mt-6 space-y-3">
            {notices.map(notice => (
              <div
                key={notice.id}
                role="note"
                className={`flex items-start gap-3 rounded-2xl border p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed backdrop-blur-sm ${
                  notice.type === 'verified'
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-100'
                    : 'border-[#c7982f]/40 bg-[#16271f]/80 text-[#fcedc7]'
                }`}
              >
                {notice.type === 'lead-time' && (
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#e6c786]" />
                )}
                {notice.type === 'advisory' && (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#e6c786]" />
                )}
                {notice.type === 'verified' && (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                )}
                <span>{notice.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Optional header actions or child controls */}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  );
}
