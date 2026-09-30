"use client";

import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, type Variants } from 'motion/react';
import { AllBarkaFullLogo } from './AllBarkaLogo';
import CategoryQuickPills, { CategoryPillItem } from './CategoryQuickPills';
import PlaceholdersAndVanishInput from './ui/placeholders-and-vanish-input';
import { useLanguage } from '../contexts/LanguageContext';
import { BorderBeam } from './ui/border-beam';
import RotatingText from './motion/RotatingText';
import SplitText from './motion/SplitText';
import ShinyText from './motion/ShinyText';
import MagneticButton from './motion/MagneticButton';
import './AllBarkaHero.css';

interface AllBarkaHeroProps {
  onOpenCart?: () => void;
  onSearch?: (query: string) => void;
  onSelectCategory?: (category: string, query?: string) => void;
}

// Gold dust particle configuration — seeded with deterministic positions so SSR
// and client render agree. All randomness is via CSS custom properties.
const DUST_PARTICLES = [
  { left: '8%',   top: '18%', size: 3, duration: 7.2, delay: 0.0,  drift:  8, opacity: 0.5 },
  { left: '15%',  top: '65%', size: 4, duration: 5.8, delay: 1.2,  drift: -6, opacity: 0.45 },
  { left: '22%',  top: '40%', size: 3, duration: 8.1, delay: 2.5,  drift: 10, opacity: 0.55 },
  { left: '31%',  top: '78%', size: 5, duration: 6.4, delay: 0.7,  drift: -9, opacity: 0.4 },
  { left: '42%',  top: '22%', size: 3, duration: 9.0, delay: 3.1,  drift:  7, opacity: 0.5 },
  { left: '55%',  top: '55%', size: 4, duration: 6.9, delay: 1.8,  drift: -5, opacity: 0.45 },
  { left: '63%',  top: '30%', size: 3, duration: 7.5, delay: 0.3,  drift: 11, opacity: 0.6 },
  { left: '70%',  top: '72%', size: 5, duration: 5.9, delay: 2.0,  drift: -7, opacity: 0.4 },
  { left: '78%',  top: '15%', size: 3, duration: 8.4, delay: 4.0,  drift:  6, opacity: 0.5 },
  { left: '83%',  top: '48%', size: 4, duration: 6.2, delay: 1.5,  drift: -8, opacity: 0.45 },
  { left: '88%',  top: '82%', size: 3, duration: 7.8, delay: 2.8,  drift:  9, opacity: 0.55 },
  { left: '92%',  top: '35%', size: 5, duration: 5.5, delay: 3.5,  drift: -6, opacity: 0.4 },
  { left: '5%',   top: '88%', size: 3, duration: 8.7, delay: 0.9,  drift: 12, opacity: 0.5 },
  { left: '96%',  top: '60%', size: 4, duration: 6.6, delay: 2.3,  drift: -4, opacity: 0.45 },
];

export function AllBarkaHero({ onSearch, onSelectCategory }: AllBarkaHeroProps = {}) {
  const { t, isRtl } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPillId, setSelectedPillId] = useState<string>('all');

  // ── Smooth Parallax Depth Tracking ─────────────────────────────────────────
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 28, stiffness: 90, mass: 0.6 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const bgTranslateX = useTransform(smoothMouseX, [-1, 1], shouldReduceMotion ? [0, 0] : [-12, 12]);
  const bgTranslateY = useTransform(smoothMouseY, [-1, 1], shouldReduceMotion ? [0, 0] : [-10, 10]);
  const foregroundTranslateX = useTransform(smoothMouseX, [-1, 1], shouldReduceMotion ? [0, 0] : [6, -6]);
  const foregroundTranslateY = useTransform(smoothMouseY, [-1, 1], shouldReduceMotion ? [0, 0] : [5, -5]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  const heroPlaceholders = [
    t('searchPlaceholder1', 'Search Iranian Pistachios, Pine Nuts (Chilgoza)...'),
    t('searchPlaceholder2', 'Search Chilean Walnuts & Royal Almonds...'),
    t('searchPlaceholder3', 'Search Bespoke Gift Boxes & Deals...'),
    t('searchPlaceholder4', 'Search Kashmiri Saffron & Medjool Dates...'),
  ];

  const handlePillSelect = (item: CategoryPillItem) => {
    setSelectedPillId(item.id);
    if (onSelectCategory && item.categoryFilter) {
      onSelectCategory(item.categoryFilter, item.searchTerm);
    }
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onSearch && searchQuery.trim()) onSearch(searchQuery.trim());
  };

  // Rotating words from translations
  const rotatingWords = [
    t('hero.rotating.1', 'Royal'),
    t('hero.rotating.2', 'Pure'),
    t('hero.rotating.3', 'Premium'),
  ];

  // ── Animation Variants ─────────────────────────────────────────────────────
  const bgVariants: Variants = {
    hidden: { opacity: 0, scale: 1.05 },
    show:   { opacity: 1, scale: 1, transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] } },
  };

  const containerVariants: Variants = {
    hidden: {},
    show:   { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
  };

  const logoVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 18 },
    show:   { opacity: 1, scale: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  };

  const taglineVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-full overflow-hidden overflow-x-clip bg-[var(--color-emerald,#1E3A2B)] font-sans antialiased selection:bg-[#C7982F]/30 selection:text-white flex flex-col justify-center pt-10 sm:pt-14 md:pt-16 pb-12 sm:pb-16 min-h-[calc(90vh-4rem)] border-b border-[#C7982F]/25"
    >
      {/* ── Gold Dust Particles (desktop only, reduced-motion hides via CSS) ── */}
      {DUST_PARTICLES.map((p, i) => (
        <div
          key={i}
          className="gold-dust-particle"
          aria-hidden="true"
          style={{
            left: p.left,
            top: p.top,
            '--dust-size': `${p.size}px`,
            '--dust-duration': `${p.duration}s`,
            '--dust-delay': `${p.delay}s`,
            '--dust-drift': `${p.drift}px`,
            '--dust-opacity': p.opacity,
          } as React.CSSProperties}
        />
      ))}

      {/* ── LAYER 1: Background with Ken Burns + Parallax ─────────────────── */}
      <motion.div
        variants={bgVariants}
        initial="hidden"
        animate="show"
        style={{ x: bgTranslateX, y: bgTranslateY }}
        className="pointer-events-none absolute inset-0 w-full h-full overflow-hidden z-0 will-change-transform select-none"
      >
        {/* Responsive hero imagery */}
        <picture className="h-full w-full block">
          <source media="(max-width: 767px)" srcSet="/images/generated/hero-dry-fruits-mobile-v1.webp" type="image/webp" />
          <source srcSet="/images/generated/hero-dry-fruits-wide-v1.webp" type="image/webp" />
          <img
            src="/images/generated/hero-dry-fruits-wide-v1.webp"
            alt={t('imageAlt.hero', 'Dry fruits arranged around a deep emerald surface')}
            width={1920}
            height={1080}
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="hero-ken-burns h-full w-full object-cover object-center opacity-40"
          />
        </picture>

        {/* Emerald gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1E3A2B] via-[#1E3A2B]/70 to-[#1E3A2B]" />
      </motion.div>

      {/* Ambient gold radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[#C7982F]/[0.07] rounded-full blur-3xl pointer-events-none z-0" />

      {/* ── LAYER 2 & 3: Foreground Content ──────────────────────────────── */}
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 sm:px-6 text-center my-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{ x: foregroundTranslateX, y: foregroundTranslateY }}
          className="flex w-full max-w-4xl flex-col items-center"
        >
          {/* Brand Logo */}
          <motion.div
            variants={logoVariants}
            className="will-change-transform mb-4 sm:mb-6 w-full flex items-center justify-center overflow-visible"
          >
            <AllBarkaFullLogo size="md" variant="light" as="span" />
          </motion.div>

          {/* ShinyText tagline above headline */}
          <motion.div variants={taglineVariants} className="mb-4 will-change-transform">
            <ShinyText
              text={t('allBarkaSubtitle', 'LUXURY HARVESTS')}
              className="text-xs sm:text-sm tracking-[0.25em] font-medium uppercase"
            />
          </motion.div>

          {/* Primary H1 with SplitText staggered entrance */}
          <motion.div variants={itemVariants} className="w-full text-center will-change-transform">
            <h1
              className={`font-serif text-[#FFFCF7] tracking-wide text-2xl sm:text-4xl md:text-5xl overflow-visible ${
                isRtl ? 'leading-[2] sm:leading-[2.1]' : 'leading-tight'
              }`}
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <SplitText
                text={t('heroHeadlinePart1', "Nature's finest, delivered with")}
                isRtl={isRtl}
                delay={400}
              />{' '}
              <span className="text-[#E4C783] italic font-serif">
                <RotatingText
                  words={rotatingWords}
                  className="font-serif italic text-[#E4C783]"
                />
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-sm sm:text-base mt-5 max-w-[620px] leading-[1.7] font-normal text-[#FFFCF7]/85 will-change-transform"
          >
            {t(
              'heroSubtitle',
              'Experience the rich taste of handpicked Iranian pistachios, Chilean walnuts, and roasted cashews. Delivered fresh across Lahore.'
            )}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="mt-7 flex flex-wrap items-center justify-center gap-3 sm:gap-4 will-change-transform"
          >
            <MagneticButton
              as="a"
              href="/shop"
              id="hero-cta-shop"
              strength={6}
              className="hero-cta-shine inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full text-sm font-semibold tracking-wide bg-[#C7982F] text-[#1E3A2B] border-2 border-[#C7982F] transition-all duration-250 hover:bg-[#B58724] hover:border-[#B58724] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7982F] focus-visible:outline-offset-2 min-h-[44px]"
            >
              {t('allProducts', 'Shop Now')}
            </MagneticButton>
            <MagneticButton
              as="a"
              href="/gifting"
              id="hero-cta-gifts"
              strength={6}
              className="hero-cta-shine inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full text-sm font-semibold tracking-wide bg-transparent text-[#E4C783] border-2 border-[#C7982F]/60 backdrop-blur-sm transition-all duration-250 hover:border-[#C7982F] hover:text-[#FFFCF7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7982F] focus-visible:outline-offset-2 min-h-[44px]"
            >
              {t('gifting', 'Gift Sets')}
            </MagneticButton>
          </motion.div>

          {/* Search Input */}
          <motion.div
            variants={itemVariants}
            className="mt-8 w-full max-w-[580px] mx-auto will-change-transform relative rounded-full"
          >
            <PlaceholdersAndVanishInput
              id="hero-search-input"
              label={t('heroSearchLabel', 'Search luxury dry fruits catalogue')}
              placeholder={t('heroSearchLabel', 'Search premium nuts, dates, and gifts...')}
              placeholders={heroPlaceholders}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSubmit={handleSearchSubmit}
              className="w-full"
            />
            <BorderBeam
              duration={10}
              borderWidth={2}
              colorFrom="rgba(212, 175, 55, 0)"
              colorTo="rgba(212, 175, 55, 0.7)"
            />
          </motion.div>

          {/* Category Quick Pills */}
          <motion.div variants={itemVariants} className="mt-6 sm:mt-8 w-full will-change-transform">
            <CategoryQuickPills
              selectedId={selectedPillId}
              onSelectCategory={handlePillSelect}
            />
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

export default AllBarkaHero;
