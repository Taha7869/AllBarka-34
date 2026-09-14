"use client";

import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, type Variants } from 'motion/react';
import heroWebp from '../assets/images/dryfruit_flatlay_hero.webp';
import heroWebpMobile from '../assets/images/dryfruit_flatlay_hero_mobile.webp';
import { AllBarkaFullLogo } from './AllBarkaLogo';
import HeroOrbit from './HeroOrbit';
import CategoryQuickPills, { CategoryPillItem } from './CategoryQuickPills';
import PlaceholdersAndVanishInput from "./ui/placeholders-and-vanish-input";
import { useLanguage } from '../contexts/LanguageContext';
import { BorderBeam } from './ui/border-beam';

interface AllBarkaHeroProps {
  onOpenCart?: () => void;
  onSearch?: (query: string) => void;
  onSelectCategory?: (category: string, query?: string) => void;
}

export function AllBarkaHero({ onSearch, onSelectCategory }: AllBarkaHeroProps = {}) {
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPillId, setSelectedPillId] = useState<string>('all');

  // ── Smooth Parallax Depth Tracking ─────────────────────────────────────────
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 28, stiffness: 90, mass: 0.6 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // Parallax offsets for distinct depth layers (nullified when user prefers reduced motion)
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

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const heroPlaceholders = [
    t('searchPlaceholder1', "Search Iranian Pistachios, Pine Nuts (Chilgoza)..."),
    t('searchPlaceholder2', "Search Chilean Walnuts & Royal Almonds..."),
    t('searchPlaceholder3', "Search Bespoke Gift Boxes & Deals..."),
    t('searchPlaceholder4', "Search Kashmiri Saffron & Medjool Dates..."),
  ];

  const handlePillSelect = (item: CategoryPillItem) => {
    setSelectedPillId(item.id);
    if (onSelectCategory && item.categoryFilter) {
      onSelectCategory(item.categoryFilter, item.searchTerm);
    }
    const productsSection = document.getElementById('products');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  // ── Restrained Luxury Staggered Entrance Variants ───
  const bgVariants: Variants = {
    hidden: { opacity: 0, scale: 1.05 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const logoSpringVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 18 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const itemSpringVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-full overflow-hidden overflow-x-clip bg-[var(--color-emerald)] font-sans antialiased selection:bg-[#C7982F]/30 selection:text-white flex flex-col justify-center pt-10 sm:pt-14 md:pt-16 pb-12 sm:pb-16 min-h-[calc(90vh-4rem)] border-b border-[#C7982F]/25"
    >
      {/* ── LAYER 1: Background Atmosphere & Parallax Depth ──────── */}
      <motion.div
        variants={bgVariants}
        initial="hidden"
        animate="show"
        style={{
          x: bgTranslateX,
          y: bgTranslateY,
        }}
        className="pointer-events-none absolute inset-0 w-full h-full overflow-hidden z-0 will-change-transform select-none opacity-40"
      >
        {/* Optimized responsive dry fruits flat-lay poster image */}
        <picture className="h-full w-full">
          <source media="(max-width: 768px)" srcSet={heroWebpMobile} type="image/webp" />
          <source srcSet={heroWebp} type="image/webp" />
          <img
            src={heroWebp}
            alt="AllBarka luxury single-origin dry fruits, pistachios, cashews, and walnuts collection"
            referrerPolicy="no-referrer"
            loading="eager"
            fetchPriority="high"
            className="h-full w-full object-cover object-center transform scale-105"
          />
        </picture>
        
        {/* Emerald tint overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-emerald)] via-[var(--color-emerald)]/70 to-[var(--color-emerald)]" />
      </motion.div>

      {/* Ambient Gold Radial Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[#C7982F]/[0.08] rounded-full blur-3xl pointer-events-none" />

      {/* ── LAYER 2 & 3: Foreground Branding, Headline & Actions ─────────── */}
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 sm:px-6 text-center my-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{
            x: foregroundTranslateX,
            y: foregroundTranslateY,
          }}
          className="flex w-full max-w-4xl flex-col items-center"
        >
          {/* Authentic AllBarka Custom Brand Logo (Rendered with as="span" so page retains clean single H1) */}
          <motion.div
            variants={logoSpringVariants}
            className="will-change-transform mb-6 sm:mb-8 w-full flex items-center justify-center overflow-visible"
          >
            <HeroOrbit>
              <AllBarkaFullLogo size="md" variant="light" as="span" />
            </HeroOrbit>
          </motion.div>

          {/* Primary Page H1 with Explicit Ivory and Warm Gold for Emerald Hero Background */}
          <motion.div variants={itemSpringVariants} className="w-full text-center will-change-transform mt-2">
            <h1 className="font-serif text-[#FFFCF7] tracking-wide text-2xl sm:text-4xl md:text-5xl leading-tight">
              {t('heroHeadlinePart1', "Nature's finest, delivered with")}{' '}
              <span className="text-[#E4C783] italic font-serif">
                {t('heroHeadlinePart2', 'Pure Elegance')}
              </span>
            </h1>
          </motion.div>

          {/* Subtitle - explicit warm ivory for high contrast on emerald */}
          <motion.p
            variants={itemSpringVariants}
            className="text-sm sm:text-base mt-5 max-w-[620px] leading-[1.7] font-normal text-[#FFFCF7]/85 will-change-transform"
          >
            {t(
              'heroSubtitle',
              'Experience the rich taste of handpicked Iranian pistachios, Chilean walnuts, and roasted cashews. Delivered fresh across Lahore.'
            )}
          </motion.p>

          {/* Search Input Bar with Accessible Label & High Contrast Surface */}
          <motion.div
            variants={itemSpringVariants}
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

          {/* Category Quick Pills Navigation Bar */}
          <motion.div
            variants={itemSpringVariants}
            className="mt-6 sm:mt-8 w-full will-change-transform"
          >
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

