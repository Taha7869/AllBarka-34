import React, { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import { Product } from '../types';
import Hero from '../components/Hero';
import CategoryCarousel from '../components/CategoryCarousel';
import ProductSlider from '../components/ProductSlider';
import CollectionLogoLoop from '../components/CollectionLogoLoop';
import AllBarkaMovingReviews from '../components/AllBarkaMovingReviews';
import FAQSection from '../components/FAQSection';
import ScrollReveal from '../components/motion/ScrollReveal';
import WordScrollReveal from '../components/motion/WordScrollReveal';
import MagneticButton from '../components/motion/MagneticButton';
import { useLanguage } from '../contexts/LanguageContext';
import { ShieldCheck, ThermometerSnowflake, Truck, ArrowUpRight, Play, ShoppingBag } from 'lucide-react';
import '../styles/editorial.css';

interface OutletContextType {
  setCartOpen: (open: boolean) => void;
  setSelectedQuickViewProduct: (product: Product) => void;
  handleAddToCart: (productId: string, weight: string) => void;
}

const featuredIds = ['pista', 'kaju', 'badam', 'akhroot', 'deal-1', 'deal-2', 'khajoor', 'org-honey'];
const featuredProducts = featuredIds.map(id => PRODUCTS.find(product => product.id === id)).filter((product): product is Product => !!product);

const servicePillars = [
  { icon: ShieldCheck,          number: '01', title: 'home.purity',    copy: 'home.purityCopy' },
  { icon: ThermometerSnowflake, number: '02', title: 'home.freshness', copy: 'home.freshnessCopy' },
  { icon: Truck,                number: '03', title: 'home.delivery', copy: 'home.deliveryCopy' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [giftFilmPlaying, setGiftFilmPlaying] = useState(false);
  const { setCartOpen, setSelectedQuickViewProduct, handleAddToCart } = useOutletContext<OutletContextType>();

  const handleSearch = (query: string) => navigate(`/shop?search=${encodeURIComponent(query)}`);

  return (
    <div className="editorial-home flex w-full flex-col items-center bg-[var(--color-base)] text-[var(--color-ink)]">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Hero
        onOpenCart={() => setCartOpen(true)}
        onSearch={handleSearch}
        onSelectCategory={(category, query) => navigate(`${category === 'all' ? '/shop' : `/shop/${category}`}${query ? `?search=${encodeURIComponent(query)}` : ''}`)}
      />

      {/* ── Section Divider ──────────────────────────────────────────────── */}
      <div className="w-full px-6 sm:px-10 py-6" aria-hidden="true">
        <div className="section-divider" />
      </div>

      {/* ── Delivery and packing assurances ───────────────────────────────── */}
      <div className="editorial-assurances w-full border-y border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-[var(--color-border)] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
          {[{ Icon: ShieldCheck, title: 'footer.pure', copy: 'footer.pureCopy' }, { Icon: Truck, title: 'boutique.delivery', copy: 'boutique.deliveryValue' }, { Icon: ShoppingBag, title: 'boutique.gifts', copy: 'boutique.giftsDetail' }].map(({ Icon, title, copy }) => <div key={title} className="flex items-center gap-4 px-3 py-5 sm:justify-center sm:py-7"><Icon size={22} className="shrink-0 text-[var(--color-accent-text)]" /><div><p className="font-serif text-base font-semibold">{t(title)}</p><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t(copy)}</p></div></div>)}
        </div>
        <CollectionLogoLoop />
      </div>

      {/* ── Section Divider ──────────────────────────────────────────────── */}
      <div className="w-full px-6 sm:px-10 py-6" aria-hidden="true">
        <div className="section-divider" />
      </div>

      {/* ── Category Carousel ────────────────────────────────────────────── */}
      <ScrollReveal className="w-full">
        <CategoryCarousel />
      </ScrollReveal>

      {/* ── Section Divider ──────────────────────────────────────────────── */}
      <div className="w-full px-6 sm:px-10 py-6" aria-hidden="true">
        <div className="section-divider" />
      </div>

      {/* ── Product Slider ───────────────────────────────────────────────── */}
      <ScrollReveal className="w-full" index={0}>
        <ProductSlider
          title="Boutique Bestsellers"
          subtitle="Our most requested harvest lots — freshly sealed in barrier pouches."
          products={featuredProducts}
          onAddToCart={handleAddToCart}
          onQuickView={setSelectedQuickViewProduct}
        />
      </ScrollReveal>

      {/* ── Section Divider ──────────────────────────────────────────────── */}
      <div className="w-full px-6 sm:px-10 py-6" aria-hidden="true">
        <div className="section-divider" />
      </div>

      <section dir="ltr" className="boutique-gifting editorial-gifting">
        <div className="boutique-gifting-inner">
          <figure className="editorial-gift-figure"><div className="boutique-gifting-media">
            {giftFilmPlaying ? (
              <video
                autoPlay
                muted
                controls
                playsInline
                preload="metadata"
                poster="/images/generated/higgsfield-gifting-v1.jpg"
                onEnded={() => setGiftFilmPlaying(false)}
                onError={() => setGiftFilmPlaying(false)}
                aria-label={t('boutique.giftFilm')}
              >
                <source src="/videos/allbarka-gifting-motion.mp4" type="video/mp4" />
              </video>
            ) : (
              <>
                <img src="/images/generated/higgsfield-gifting-v1.jpg" width={2048} height={1152} loading="lazy" decoding="async" alt={t('boutique.giftAlt')} />
                <button type="button" className="boutique-gifting-play focus-ring" onClick={() => setGiftFilmPlaying(true)} aria-label={t('boutique.giftFilm')}>
                  <Play size={20} fill="currentColor" aria-hidden="true" />
                  <span>{t('boutique.giftFilm')}</span>
                </button>
              </>
            )}
          </div><figcaption dir="auto">{t('home.giftNote')}<span aria-hidden="true">01 / ALLBARKA</span></figcaption></figure>
          <div>
            <p dir="auto" className="boutique-eyebrow">{t('boutique.giftEyebrow')}</p>
            <h2 dir="auto">{t('boutique.giftTitle')}</h2>
            <p dir="auto">{t('boutique.giftCopy')}</p>
            <Link to="/gifting" className="boutique-button boutique-button-gold focus-ring">{t('boutique.gifting')} <ArrowUpRight size={17} /></Link>
          </div>
        </div>
      </section>

      {/* ── Service Pillars (dark emerald section) ───────────────────────── */}
      <section dir="ltr" className="editorial-care w-full overflow-hidden bg-[#042821] py-16 text-[#FFFCF7] sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Section divider on emerald */}
          <div className="section-divider-on-emerald mb-10" aria-hidden="true" />

          <div className="mb-10 grid gap-5 text-left lg:grid-cols-[1fr_auto] lg:items-end">
            <ScrollReveal className="max-w-2xl" index={0}>
              <span dir="auto" className="mb-3 block text-[10px] font-bold uppercase tracking-[0.3em] text-[#E4C783]">
                {t('home.careEyebrow')}
              </span>
              <h2 dir="auto" className="font-serif text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                <WordScrollReveal text={t('home.careTitle')} />
              </h2>
              <p dir="auto" className="mt-4 max-w-xl text-sm leading-relaxed text-[#F6F1EA]/80">
                {t('home.careCopy')}
              </p>
            </ScrollReveal>

            <ScrollReveal index={1}>
              <MagneticButton
                as="button"
                onClick={() => navigate('/pages/our-story')}
                className="focus-ring inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-[#C7982F]/55 px-5 text-xs font-bold uppercase tracking-[0.16em] text-[#FFFCF7] transition-colors hover:bg-[#C7982F] hover:text-[#042821]"
              >
                {t('home.standards')} <ArrowUpRight size={15} aria-hidden="true" />
              </MagneticButton>
            </ScrollReveal>
          </div>

          <div className="grid gap-3 text-left md:grid-cols-3 md:gap-4">
            {servicePillars.map(({ icon: Icon, number, title, copy }, i) => (
              <ScrollReveal key={number} index={i}>
                <article className="editorial-care-pillar group p-5 transition-colors sm:p-6 h-full">
                  <div className="mb-7 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C7982F]/35 bg-[#C7982F]/10 text-[#E4C783]">
                      <Icon size={21} aria-hidden="true" />
                    </span>
                    <span className="font-serif text-sm text-[#E4C783]/70">{number}</span>
                  </div>
                  <h3 dir="auto" className="font-serif text-xl font-semibold text-[#FFFCF7]">{t(title)}</h3>
                  <p dir="auto" className="mt-3 text-xs leading-6 text-[#F6F1EA]/80 sm:text-sm">{t(copy)}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>

          {/* Section divider on emerald */}
          <div className="section-divider-on-emerald mt-10" aria-hidden="true" />
        </div>
      </section>

      {/* ── Reviews ──────────────────────────────────────────────────────── */}
      <ScrollReveal className="w-full" index={0}>
        <AllBarkaMovingReviews />
      </ScrollReveal>

      {/* ── Section Divider ──────────────────────────────────────────────── */}
      <div className="w-full px-6 sm:px-10 py-4" aria-hidden="true">
        <div className="section-divider" />
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <ScrollReveal className="w-full border-t border-[var(--color-border)] bg-[var(--color-surface)]" index={0}>
        <FAQSection />
      </ScrollReveal>

    </div>
  );
}
