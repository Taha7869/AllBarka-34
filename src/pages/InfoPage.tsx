import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  MapPin, 
  CheckCircle2, 
  BookOpen, 
  Leaf, 
  Wind, 
  Eye, 
  Clock, 
  MessageCircle, 
  ArrowRight,
  ChevronRight,
  Package
} from 'lucide-react';
import { AllBarkaCrestVector } from '../components/AllBarkaLogo';
import { acquireScrollLock } from '../utils/scrollLock';
import BoutiqueContactForm from '../components/BoutiqueContactForm';

export type InfoPageTab = 
  | 'our-story'
  | 'sourcing-policy'
  | 'orchard-provenance'
  | 'lahore-boutique'
  | 'blog-nutrition'
  | 'hand-sorting'
  | 'vacuum-sealing'
  | 'freshness-guarantee'
  | 'shipping'
  | 'contact';

export interface InfoPagesModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: InfoPageTab;
  onExploreProducts?: () => void;
  asPage?: boolean;
}

interface PageData {
  id: InfoPageTab;
  category: 'discover' | 'information';
  categoryLabel: string;
  navTitle: string;
  badge: string;
  headline: string;
  content: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  highlights: string[];
  quote?: string;
}

const PAGES: Record<InfoPageTab, PageData> = {
  'our-story': {
    id: 'our-story',
    category: 'discover',
    categoryLabel: '✦ Discover AllBarka',
    navTitle: 'Our Story',
    badge: 'Heritage & Vision',
    headline: 'A Legacy of Taste, Curated for Lahore.',
    content: `At AllBarka, we believe that nature's finest treasures shouldn't be hard to find. Born out of a passion for purity and uncompromising quality, our boutique was established to redefine the gourmet dry fruit experience in Lahore. We don't rely on open markets; instead, we lean on deep-rooted, time-tested relationships within the trade. These exclusive connections allow us to secure the most elite harvests directly from the source. Every product that carries the AllBarka name is a testament to our dedication to authenticity, luxury, and unmatched taste.`,
    icon: Sparkles,
    highlights: [
      'Direct partnerships with generational orchards worldwide',
      'Curated exclusively for discerning families and connoisseurs across Lahore',
      'Zero intermediaries, ensuring strict quality control from orchard to doorstep'
    ],
    quote: 'True luxury lies in the uncompromising purity of what nature yields.'
  },
  'sourcing-policy': {
    id: 'sourcing-policy',
    category: 'discover',
    categoryLabel: '✦ Discover AllBarka',
    navTitle: 'Sourcing Policy',
    badge: 'Origin Integrity',
    headline: 'Pure Origins, Certified Terroirs.',
    content: `Quality begins at the root. We scour the finest growing regions across the globe to bring you dry fruits of exceptional calibre. From the sun-drenched valleys of California for our buttery Jumbo Almonds, to the mineral-rich soils of Chile for extra-light Walnuts, and the high-altitude orchards of Afghanistan and Iran for rare Mamra and Akbari Pistachios—every origin is chosen with intention. We strictly select single-origin, certified crops that meet our exacting standards for kernel size, moisture content, and rich natural oil profiles.`,
    icon: Leaf,
    highlights: [
      'Single-origin certification from premier global growing belts',
      'Uncompromised grade specifications: Top 1% of each annual crop',
      'Rigorous testing for moisture balance, natural oil density, and kernel purity'
    ],
    quote: 'We select only the top tier of every harvest—no compromises, ever.'
  },
  'lahore-boutique': {
    id: 'lahore-boutique',
    category: 'discover',
    categoryLabel: '✦ Discover AllBarka',
    navTitle: 'Lahore Boutique',
    badge: 'Local Roots',
    headline: 'Rooted in the Heart of Lahore.',
    content: `AllBarka was born out of Lahore’s timeless appreciation for hospitality, rich feasts, and meaningful gifting. We understand that in our city, sharing dry fruits is an act of warmth and tradition. Operating from our temperature-controlled facility in Lahore, we handle every batch with pristine precision before it reaches your home. Whether you're assembling a bespoke wedding gift tray in Gulberg or ordering daily vitality essentials in DHA, we bring world-class boutique service right to your doorstep.`,
    icon: MapPin,
    highlights: [
      'Same-day temperature-controlled dispatch across Lahore (DHA, Gulberg, Model Town, Cantt)',
      'Custom bespoke luxury gift boxes curated for special occasions',
      'Dedicated concierge support for corporate orders and VIP clientele'
    ],
    quote: 'Honoring Lahore’s timeless hospitality with world-class gourmet elegance.'
  },
    'blog-nutrition': {
    id: 'blog-nutrition',
    category: 'discover',
    categoryLabel: 'The Journal',
    navTitle: 'Nutritional Guidelines',
    badge: 'Wellness & Nutrition Profile',
    headline: 'Essential Macronutrients & Dietary Benefits',
    content: "AllBarka dry fruits are 100% raw, unbleached, and naturally preserved in nitrogen-flushed barrier pouches to retain their full micronutrient density:\n\n• Iranian Pistachios: 20g Protein / 100g, abundant in Vitamin B6, Potassium, and eye-healthy Lutein.\n• American Mountain Almonds: 21g Plant Protein, rich in Alpha-Tocopherol (Vitamin E) and dietary fiber for cardiovascular and skin health.\n• Chilean Walnuts: Supreme plant source of Omega-3 ALA (Alpha-Linolenic Acid) supporting brain health and lowering LDL cholesterol.\n• King Cashews (W240): Packed with Zinc, Iron, and Magnesium for muscle recovery and immune function.\n• Organic Chia & Pumpkin Seeds: High dietary fiber (34g/100g) and natural Tryptophan promoting restorative sleep and sustained satiety.\n• Sun-Dried Apricots & Plums: High in Potassium and natural Sorbitol aiding digestive health.",
    icon: BookOpen,
    highlights: [
      "Zero Added Sugar, Artificial Glazes, or Preservatives",
      "Dense in Heart-Healthy Monounsaturated Fatty Acids",
      "Recommended Daily Portion: 30g mixed handful (approx. 180 kcal)"
    ],
    quote: "Whole-food nutrition straight from orchard trees to your daily vitality routine."
  },
  'hand-sorting': {
    id: 'hand-sorting',
    category: 'information',
    categoryLabel: '✦ Information & Craft',
    navTitle: 'Hand Sorting',
    badge: 'Meticulous Curation',
    headline: 'Triple-Tier Hand Sorting Protocol.',
    content: `Perfection cannot be mass-produced by machines alone. Every single consignment that arrives at our facility undergoes a rigorous three-stage manual inspection by trained master graders. We meticulously inspect each batch for size uniformity, color consistency, and skin integrity, discarding broken pieces, shriveled kernels, and cosmetic imperfections. Only the most pristine, whole, and flawless specimens earn the AllBarka seal of excellence.`,
    icon: Eye,
    highlights: [
      'Manual inspection by master graders with decades of combined expertise',
      'Triple-stage sorting: Size grading, color uniformity, and defect removal',
      'Less than 0.5% tolerance for broken or irregular pieces in standard packs'
    ],
    quote: 'Only the most flawless kernels make it past our master graders.'
  },
  'vacuum-sealing': {
    id: 'vacuum-sealing',
    category: 'information',
    categoryLabel: '✦ Information & Craft',
    navTitle: 'Vacuum Freshness',
    badge: 'Barrier Technology',
    headline: 'Airtight Vacuum & Nitrogen Flush Packaging.',
    content: `Exposure to air, humidity, and heat is the enemy of fresh nuts and dried fruits. To preserve the farm-fresh crunch and delicate natural oils of our products, we pack all orders in high-barrier, food-grade thermal vacuum pouches immediately after grading. This airtight seal eliminates oxygen transfer, prevents oil rancidity, and locks in peak crispness and fragrance until the very moment you break the seal at home.`,
    icon: Wind,
    highlights: [
      'Multi-layer barrier pouches designed to block light, moisture, and ambient air',
      'Nitrogen-flush option for ultra-crisp texture retention and zero oxidation',
      'Resealable zip locks for enduring freshness throughout everyday home use'
    ],
    quote: 'From our temperature-controlled store to your pantry, crunch remains pristine.'
  },
  'freshness-guarantee': {
    id: 'freshness-guarantee',
    category: 'information',
    categoryLabel: '✦ Information & Craft',
    navTitle: 'Freshness Promise',
    badge: 'Unconditional Guarantee',
    headline: '100% Purity & Crunch Guarantee.',
    content: `We stand behind every single gram of dry fruit that leaves our boutique. If your order does not meet your expectations for crispness, natural aroma, and pristine taste, we will replace it or issue a full refund—no questions asked. We believe that trust is earned through unwavering consistency, and we are committed to making your AllBarka experience nothing short of extraordinary.`,
    icon: ShieldCheck,
    highlights: [
      'Hassle-free replacement or refund policy on any quality concern',
      'Direct WhatsApp access to our management team for immediate resolution',
      'Consistent batch freshness verified before every single dispatch'
    ],
    quote: 'Your absolute delight is our benchmark. Unconditional quality, always.'
  },
  'shipping': {
    id: 'shipping',
    category: 'information',
    categoryLabel: '✦ Information & Craft',
    navTitle: 'Express Logistics',
    badge: 'Logistics Protocol',
    headline: 'Premium Dispatch, Direct to Your Doorstep.',
    content: `True freshness shouldn't spend days in transit. To ensure our products reach you in their peak state, we have streamlined our delivery network exclusively for our Lahore clientele. Every order is freshly packed and thermal vacuum-sealed just before dispatch. We take pride in our Same-Day Lahore Dispatch for all orders confirmed within our daily operating hours (09:00 AM - 09:00 PM). Handled with the utmost care by our dedicated local courier partners, your luxury dry fruits arrive swiftly, safely, and in pristine condition.`,
    icon: Clock,
    highlights: [
      'Same-Day Lahore Dispatch for orders confirmed 09:00 AM - 09:00 PM',
      'Freshly packed and thermal vacuum-sealed immediately prior to courier pickup',
      'Handled by dedicated local courier partners for pristine, safe transit'
    ],
    quote: 'True freshness shouldn’t spend days in transit.'
  },
  'contact': {
    id: 'contact',
    category: 'information',
    categoryLabel: 'Get in Touch',
    navTitle: 'Contact',
    badge: 'Concierge',
    headline: 'Boutique Concierge',
    content: "For corporate gifting, custom hampers, or immediate assistance, our dedicated concierge is ready to assist you. Visit our boutique in Lahore or connect with us directly on WhatsApp.",
    icon: MessageCircle,
    highlights: [
      "Neelum Block, Allama Iqbal Town, Lahore",
      "Open Daily: 9:00 AM – 9:00 PM",
      "WhatsApp: 0316-0666083"
    ],
    quote: "Fast response guaranteed"
  },
  'orchard-provenance': {
    id: 'orchard-provenance',
    category: 'discover',
    categoryLabel: 'The Journal',
    navTitle: 'Orchard Provenance',
    badge: 'Terroir & Sourcing Map',
    headline: 'Single-Origin Provenance from Generational Orchards',
    content: "Every variety at AllBarka is traceable back to its certified growing belt:\n\n• Kerman & Rafsanjan (Iran): UNESCO-recognized arid soils yielding wood-roasted Akbari and jumbo pistachios with guaranteed 99% open-shell ratios.\n• Central Valley (California, USA): Alluvial valley soils cultivating sweet, high-oil Nonpareil and Butte-Padre mountain almonds.\n• Central Valleys (Chile): Glacial Andean snow-melt rivers irrigating extra-light Serr and Chandler walnuts, cracked fresh for zero bitter aftertaste.\n• Mangalore & Goa (India): Tropical coastal microclimates producing jumbo W240 and royal W180 sweet white whole cashews.\n• Hunza & Skardu Valleys (Pakistan): Alpine ultraviolet sun-cured golden apricots (Khubani) with pure honeyed tartness.\n• Kandahar (Afghanistan): Traditional shade-drying vineyards producing seedless long emerald Kishmish.\n• Madinah Oasis (Saudi Arabia): Historic date palm groves providing authentic dark Ajwa and amber dates.",
    icon: Leaf,
    highlights: [
      "Single-Estate Traceability for every harvest lot",
      "Direct ethical contracts with verified generational growers",
      "Zero mass-market blending or old crop mixing"
    ],
    quote: "True luxury begins with respect for the soil, sun, and origin."
  }
};

export default function InfoPagesModal({
  isOpen,
  onClose,
  initialTab = 'our-story',
  onExploreProducts,
  asPage = false
}: InfoPagesModalProps) {
  const [activeTab, setActiveTab] = useState<InfoPageTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Scroll to top on page load or tab switch when rendered as a page
  useEffect(() => {
    if (asPage) {
      window.scrollTo(0, 0);
    }
  }, [asPage, activeTab]);

  // Lock background scroll only when open as modal
  useEffect(() => {
    if (asPage || !isOpen) return;
    const releaseLock = acquireScrollLock();
    return () => {
      releaseLock();
    };
  }, [isOpen, asPage]);

  if (!asPage && !isOpen) return null;

  const isValidTab = Boolean(PAGES[activeTab]);
  const current = isValidTab ? PAGES[activeTab] : null;

  const discoverTabs: InfoPageTab[] = ['our-story', 'sourcing-policy', 'orchard-provenance', 'blog-nutrition', 'lahore-boutique'];
  const infoTabs: InfoPageTab[] = ['hand-sorting', 'vacuum-sealing', 'freshness-guarantee', 'shipping', 'contact'];

  // ── UNKNOWN SLUG / TAB RECOVERY VIEW ──────────────────────────────────────
  if (!current) {
    return (
      <div className="w-full min-h-[70vh] bg-[var(--color-base,#F6F1EA)] pt-12 pb-24 px-4 sm:px-6 lg:px-8 flex items-center justify-center select-none">
        <div className="max-w-xl w-full bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/30 rounded-3xl p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-emerald,#042821)]/5 border border-[var(--color-gold,#C7982F)]/30 flex items-center justify-center mx-auto mb-5 text-[var(--color-gold,#C7982F)]">
            <BookOpen size={28} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-gold,#C7982F)] block mb-2">
            AllBarka Archives
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--color-ink,#29231D)] mb-3">
            Article Not Found
          </h2>
          <p className="text-sm text-[var(--color-ink,#29231D)]/70 mb-8 leading-relaxed">
            The journal entry or information page you requested does not exist or has been relocated. Choose from our curated chronicles below:
          </p>

          <div className="grid grid-cols-2 gap-2 mb-8 text-left">
            {[...discoverTabs, ...infoTabs].slice(0, 6).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="p-2.5 rounded-xl bg-[var(--color-base,#F6F1EA)] hover:bg-[var(--color-gold,#C7982F)]/10 border border-[var(--color-gold,#C7982F)]/20 text-left text-xs font-semibold text-[var(--color-ink,#29231D)] transition-colors flex items-center justify-between"
              >
                <span>{PAGES[tab].navTitle}</span>
                <ChevronRight size={13} className="text-[var(--color-gold,#C7982F)]" />
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('our-story')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[var(--color-emerald,#042821)] text-[var(--color-surface,#FFFCF7)] text-xs font-bold uppercase tracking-wider hover:bg-[#03201A] transition-colors"
            >
              Read Our Heritage
            </button>
            <Link
              to="/shop"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white text-[var(--color-ink,#29231D)] text-xs font-bold uppercase tracking-wider border border-[var(--color-gold,#C7982F)]/30 hover:border-[var(--color-gold,#C7982F)] transition-colors"
            >
              Browse Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const IconComponent = current.icon;

  // ── IN-FLOW STANDALONE PAGE VARIANT (Full Route Page) ─────────────────────
  if (asPage) {
    return (
      <div className="w-full min-h-screen bg-[var(--color-base,#FDFCFA)] pt-6 sm:pt-10 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Top Header & Breadcrumb */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-gold,#B8935F)]/25">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 flex items-center justify-center text-[var(--color-gold,#B8935F)]">
                <AllBarkaCrestVector />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-[var(--color-gold,#B8935F)] block leading-none">
                  AllBarka Boutique Journal & Heritage
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif font-black text-[var(--color-ink,#1A1A1A)] tracking-tight mt-1">
                  {current.categoryLabel}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--color-cream,#FAF9F5)] hover:bg-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1A1A1A)] hover:text-white border border-[var(--color-gold,#B8935F)]/35 transition-all shadow-xs"
              >
                <span>Shop Gourmet</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="px-3 sm:px-5 py-2.5 bg-[var(--color-cream,#FAF9F5)] rounded-2xl border border-[var(--color-gold,#B8935F)]/25 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-xs">
            <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-[var(--color-gold,#B8935F)]/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-gold,#B8935F)] px-2 py-1 rounded-md bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/30">
                Discover:
              </span>
              {discoverTabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[var(--color-gold,#B8935F)] text-white shadow-xs border border-[var(--color-gold,#B8935F)]'
                        : 'text-[var(--color-ink,#1A1A1A)] hover:text-[var(--color-gold,#B8935F)] hover:bg-[var(--color-surface,#FFFFFF)]'
                    }`}
                  >
                    {PAGES[tab].navTitle}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-gold,#B8935F)] px-2 py-1 rounded-md bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/30">
                Information:
              </span>
              {infoTabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[var(--color-gold,#B8935F)] text-white shadow-xs border border-[var(--color-gold,#B8935F)]'
                        : 'text-[var(--color-ink,#1A1A1A)] hover:text-[var(--color-gold,#B8935F)] hover:bg-[var(--color-surface,#FFFFFF)]'
                    }`}
                  >
                    {PAGES[tab].navTitle}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Card Content */}
          <div className="rounded-3xl border border-[var(--color-gold,#B8935F)]/30 bg-[var(--color-surface,#FFFFFF)] shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-6 sm:p-10 space-y-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Badge & Category Header */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-cream,#FAF9F5)] text-[var(--color-gold,#B8935F)] flex items-center justify-center shrink-0 border border-[var(--color-gold,#B8935F)]/40 shadow-xs">
                    <IconComponent size={16} />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-widest bg-[var(--color-cream,#FAF9F5)] text-[var(--color-gold,#B8935F)] border border-[var(--color-gold,#B8935F)]/40 shadow-xs">
                    {current.badge}
                  </span>
                  <span className="text-xs text-[var(--color-ink-muted,#5A5A5A)] font-semibold hidden sm:inline">
                    • AllBarka Luxury Standards
                  </span>
                </div>

                {/* Headline */}
                <div className="space-y-2 text-left">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-[var(--color-ink,#1A1A1A)] leading-tight">
                    {current.headline}
                  </h2>
                  <div className="h-0.5 w-16 bg-[var(--color-gold,#B8935F)] rounded-full" />
                </div>

                {/* Verbatim Content Body */}
                <div className="p-5 sm:p-7 rounded-2xl bg-[var(--color-base,#FDFCFA)] border border-[var(--color-gold,#B8935F)]/25 shadow-xs text-left">
                  <p className="text-base sm:text-[17px] text-[var(--color-ink,#1A1A1A)] font-medium leading-relaxed sm:leading-loose whitespace-pre-line">
                    {current.content}
                  </p>
                </div>

                {/* Interactive Contact & Concierge Form if on Contact Tab */}
                {activeTab === 'contact' && (
                  <div className="pt-2">
                    <BoutiqueContactForm />
                  </div>
                )}

                {/* Highlights & Pillars Grid */}
                {activeTab !== 'contact' && (
                  <div className="space-y-3 text-left">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-ink,#1A1A1A)] flex items-center gap-1.5">
                      <Award size={14} className="text-[var(--color-gold,#B8935F)]" />
                      Core Quality Pillars
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {current.highlights.map((highlight, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 flex items-start gap-2.5 shadow-xs"
                        >
                          <CheckCircle2 size={16} className="text-[var(--color-gold,#B8935F)] shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-[var(--color-ink,#1A1A1A)] leading-snug">
                            {highlight}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quote Banner */}
                {current.quote && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-cream,#FAF9F5)] text-[var(--color-ink,#1A1A1A)] border border-[var(--color-gold,#B8935F)]/40 flex items-center justify-between gap-4 shadow-xs text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-10 bg-[var(--color-gold,#B8935F)] rounded-full shrink-0" />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-gold,#B8935F)] block">
                          The AllBarka Guarantee
                        </span>
                        <p className="font-serif italic font-bold text-sm sm:text-base text-[var(--color-ink,#1A1A1A)]">
                          &ldquo;{current.quote}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className="p-6 rounded-2xl sm:rounded-3xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/25 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-ink-muted,#5A5A5A)]">
              <ShieldCheck size={18} className="text-[var(--color-gold,#B8935F)] shrink-0" />
              <span>Authenticated Sourcing & Crop Freshness • Same-Day Lahore Dispatch</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <a
                href="https://wa.me/923160666083"
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-[var(--color-gold,#B8935F)]/40 bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] hover:bg-[var(--color-cream,#FAF9F5)] hover:text-[var(--color-gold,#B8935F)] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <MessageCircle size={15} className="text-[var(--color-gold,#B8935F)]" />
                <span>WhatsApp Concierge</span>
              </a>

              <Link
                to="/shop"
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-[var(--color-gold,#B8935F)] text-white hover:bg-[var(--color-gold-light,#D4B483)] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-[var(--color-gold,#B8935F)] shadow-xs"
              >
                <span>Explore Boutique</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MODAL VARIANT (Triggered Modal Overlay) ──────────────────────────────
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 select-none">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Main Luxury Modal Window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl sm:rounded-[2rem] border-2 border-[var(--color-gold,#B8935F)]/35 bg-[var(--color-surface,#FFFFFF)] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15),0_0_35px_rgba(184,147,95,0.15)] overflow-hidden text-[var(--color-ink,#1A1A1A)]"
      >
        {/* ── Top Header Bar ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-[var(--color-gold,#B8935F)]/25 bg-[var(--color-base,#FDFCFA)] text-[var(--color-ink,#1A1A1A)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center text-[var(--color-gold,#B8935F)]">
              <AllBarkaCrestVector />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-[var(--color-gold,#B8935F)] block leading-none">
                AllBarka Boutique Journal
              </span>
              <h2 className="text-base sm:text-lg font-serif font-black text-[var(--color-ink,#1A1A1A)] tracking-wide mt-0.5">
                {current.categoryLabel}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[var(--color-gold,#B8935F)]/35 bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] hover:bg-[var(--color-cream,#FAF9F5)] hover:text-[var(--color-gold,#B8935F)] flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shadow-xs"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Navigation Tabs Bar ── */}
        <div className="px-4 sm:px-8 py-3 bg-[var(--color-cream,#FAF9F5)] border-b border-[var(--color-gold,#B8935F)]/20 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-[var(--color-gold,#B8935F)]/30">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-gold,#B8935F)] px-2 py-1 rounded-md bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/30">
              Discover:
            </span>
            {discoverTabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-gold,#B8935F)] text-white shadow-xs border border-[var(--color-gold,#B8935F)]'
                      : 'text-[var(--color-ink,#1A1A1A)] hover:text-[var(--color-gold,#B8935F)] hover:bg-[var(--color-surface,#FFFFFF)]'
                  }`}
                >
                  {PAGES[tab].navTitle}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-gold,#B8935F)] px-2 py-1 rounded-md bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/30">
              Information:
            </span>
            {infoTabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[var(--color-gold,#B8935F)] text-white shadow-xs border border-[var(--color-gold,#B8935F)]'
                      : 'text-[var(--color-ink,#1A1A1A)] hover:text-[var(--color-gold,#B8935F)] hover:bg-[var(--color-surface,#FFFFFF)]'
                  }`}
                >
                  {PAGES[tab].navTitle}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Scrollable Body Content ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 sm:space-y-7 bg-[var(--color-base,#FDFCFA)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Badge & Category Header */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-cream,#FAF9F5)] text-[var(--color-gold,#B8935F)] flex items-center justify-center shrink-0 border border-[var(--color-gold,#B8935F)]/40 shadow-xs">
                  <IconComponent size={16} />
                </div>
                <span className="px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-widest bg-[var(--color-cream,#FAF9F5)] text-[var(--color-gold,#B8935F)] border border-[var(--color-gold,#B8935F)]/40 shadow-xs">
                  {current.badge}
                </span>
                <span className="text-xs text-[var(--color-ink-muted,#5A5A5A)] font-semibold hidden sm:inline">
                  • AllBarka Luxury Standards
                </span>
              </div>

              {/* Exact Headline */}
              <div className="space-y-2 text-left">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-[var(--color-ink,#1A1A1A)] leading-tight">
                  {current.headline}
                </h3>
                <div className="h-0.5 w-16 bg-[var(--color-gold,#B8935F)] rounded-full" />
              </div>

              {/* Exact Verbatim Content Body */}
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--color-surface,#FFFFFF)] border border-[var(--color-gold,#B8935F)]/30 shadow-xs text-left">
                <p className="text-sm sm:text-base text-[var(--color-ink,#1A1A1A)] font-medium leading-relaxed sm:leading-loose">
                  {current.content}
                </p>
              </div>

              {/* Interactive Contact & Concierge Form if on Contact Tab */}
              {activeTab === 'contact' && (
                <div className="pt-2">
                  <BoutiqueContactForm />
                </div>
              )}

              {/* Highlights & Pillars Grid */}
              {activeTab !== 'contact' && (
                <div className="space-y-3 text-left">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-ink,#1A1A1A)] flex items-center gap-1.5">
                    <Award size={14} className="text-[var(--color-gold,#B8935F)]" />
                    Core Quality Pillars
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {current.highlights.map((highlight, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 sm:p-4 rounded-2xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 flex items-start gap-2.5 shadow-xs"
                      >
                        <CheckCircle2 size={16} className="text-[var(--color-gold,#B8935F)] shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold text-[var(--color-ink,#1A1A1A)] leading-snug">
                          {highlight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quote Banner */}
              {current.quote && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] border border-[var(--color-gold,#B8935F)]/40 flex items-center justify-between gap-4 shadow-xs text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-10 bg-[var(--color-gold,#B8935F)] rounded-full shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-gold,#B8935F)] block">
                        The AllBarka Guarantee
                      </span>
                      <p className="font-serif italic font-bold text-sm sm:text-base text-[var(--color-ink,#1A1A1A)]">
                        &ldquo;{current.quote}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer Actions ────────────────────────────────────────── */}
        <div className="px-5 sm:px-8 py-4 bg-[var(--color-cream,#FAF9F5)] border-t border-[var(--color-gold,#B8935F)]/25 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-ink-muted,#5A5A5A)]">
            <ShieldCheck size={16} className="text-[var(--color-gold,#B8935F)]" />
            <span>Authenticated Sourcing & Crop Freshness</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <a
              href="https://wa.me/923160666083"
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-[var(--color-gold,#B8935F)]/40 bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] hover:bg-[var(--color-cream,#FAF9F5)] hover:text-[var(--color-gold,#B8935F)] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <MessageCircle size={15} className="text-[var(--color-gold,#B8935F)]" />
              WhatsApp Help
            </a>

            <button
              onClick={() => {
                onClose();
                if (onExploreProducts) {
                  onExploreProducts();
                } else {
                  const el = document.getElementById('products');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-[var(--color-gold,#B8935F)] text-white hover:bg-[var(--color-gold-light,#D4B483)] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 border border-[var(--color-gold,#B8935F)] shadow-xs cursor-pointer"
            >
              <span>Explore Boutique</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
