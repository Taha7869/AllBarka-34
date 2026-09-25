import { getLocalized } from '../utils/localize';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, 
  ShieldCheck, 
  Sparkles, 
  Leaf, 
  Droplets, 
  Wind, 
  ThermometerSnowflake, 
  Clock, 
  MapPin, 
  Check,
  Award,
  PackageCheck,
  AlertCircle
} from 'lucide-react';
import { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ProductDetailAccordionProps {
  product: Product;
  theme?: 'dark' | 'light';
  className?: string;
  defaultOpenKey?: string;
}

export default function ProductDetailAccordion({
  product,
  theme = 'light',
  className = '',
  defaultOpenKey = 'storage'
}: ProductDetailAccordionProps) {
  const { language } = useLanguage();
  const [openSection, setOpenSection] = useState<string | null>(defaultOpenKey);

  const toggleSection = (key: string) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  // Dynamic tailored details based on product type
  const getProductDetails = (p: Product) => {
    let origin = getLocalized(p, 'origin', language) || 'Premium High-Altitude Orchards';
    let harvest = getLocalized(p, 'harvest', language) || 'Peak Seasonal Crop';
    
    let sourcing = getLocalized(p, 'sourcingDetails', language) || 'Curated directly from verified regional growers. Each batch is inspected for density, oil richness, and whole-kernel integrity without chemical bleaching.';
    let storage = getLocalized(p, 'storageTips', language) || 'Store in an airtight container in a cool, dry cupboard. In summer or for storage over 45 days, refrigerate in glass jars to protect natural crispness.';
    let packaging = getLocalized(p, 'packagingDetails', language) || 'Multi-layer food-grade barrier pouch with zip-lock closure, protecting kernels from ambient humidity and light.';
    let culinary = getLocalized(p, 'recipe', language) || 'Enjoy as a wholesome raw snack or pair with traditional tea and desserts.';

    return { origin, harvest, sourcing, storage, packaging, culinary };
  };

  const details = getProductDetails(product);

  return (
    <div className={`w-full rounded-2xl overflow-hidden border border-[var(--color-gold,#B8935F)]/30 bg-[var(--color-surface,#FFFFFF)] shadow-xs select-none ${className}`}>
      
      {/* Mini Quality Banner Header */}
      <div className="px-4 py-2.5 bg-[var(--color-cream,#FAF9F5)] border-b border-[var(--color-gold,#B8935F)]/25 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold,#B8935F)]">
        <div className="flex items-center gap-1.5">
          <Award size={12} className="text-[var(--color-gold,#B8935F)]" />
          <span className="text-[var(--color-ink,#1A1A1A)]">AllBarka Sourcing Transparency</span>
        </div>
        <span className="text-[9px] font-extrabold text-[var(--color-gold,#B8935F)] bg-[var(--color-surface,#FFFFFF)] px-2 py-0.5 rounded-full border border-[var(--color-gold,#B8935F)]/30 shadow-xs">
          100% Traceable
        </span>
      </div>

      <div className="divide-y divide-[var(--color-gold,#B8935F)]/15">
        
        {/* Accordion Item 1 (TOP): How to Enjoy & Store */}
        <div className="transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('storage')}
            aria-expanded={openSection === 'storage'}
            className={`w-full py-3.5 px-4 flex items-center justify-between text-left transition-colors cursor-pointer ${
              openSection === 'storage' 
                ? 'bg-[var(--color-cream,#FAF9F5)]' 
                : 'hover:bg-[var(--color-cream,#FAF9F5)]/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ThermometerSnowflake size={14} className="text-[var(--color-gold,#B8935F)] shrink-0" />
              <span className="text-xs font-serif font-bold tracking-wide text-[var(--color-ink,#1A1A1A)]">
                How to Enjoy & Store
              </span>
            </div>
            <motion.div
              animate={{ rotate: openSection === 'storage' ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[var(--color-gold,#B8935F)]"
            >
              <ChevronDown size={15} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {openSection === 'storage' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-1 space-y-2.5 text-xs leading-relaxed text-[var(--color-ink-muted,#5A5A5A)]">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-[var(--color-gold,#B8935F)]">
                      Chef & Dietary Suggestion
                    </span>
                    <p className="italic text-[var(--color-ink,#1A1A1A)] font-medium">"{details.culinary}"</p>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-[var(--color-gold,#B8935F)]">
                      Optimal Storage
                    </span>
                    <p className="text-[var(--color-ink,#1A1A1A)]/90">{details.storage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accordion Item 2: Details & Sourcing */}
        <div className="transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('sourcing')}
            aria-expanded={openSection === 'sourcing'}
            className={`w-full py-3.5 px-4 flex items-center justify-between text-left transition-colors cursor-pointer ${
              openSection === 'sourcing' 
                ? 'bg-[var(--color-cream,#FAF9F5)]' 
                : 'hover:bg-[var(--color-cream,#FAF9F5)]/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Leaf size={14} className="text-[var(--color-gold,#B8935F)] shrink-0" />
              <span className="text-xs font-serif font-bold tracking-wide text-[var(--color-ink,#1A1A1A)]">
                Details & Sourcing
              </span>
            </div>
            <motion.div
              animate={{ rotate: openSection === 'sourcing' ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[var(--color-gold,#B8935F)]"
            >
              <ChevronDown size={15} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {openSection === 'sourcing' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-1 space-y-2.5 text-xs leading-relaxed text-[var(--color-ink-muted,#5A5A5A)]">
                  <p className="font-normal text-[var(--color-ink,#1A1A1A)]/90">{details.sourcing}</p>
                  
                  <div className="p-2.5 rounded-xl text-[11px] grid grid-cols-2 gap-2 bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/25">
                    <div>
                      <span className="block font-semibold uppercase text-[9px] tracking-wider text-[var(--color-gold,#B8935F)]">
                        Origin
                      </span>
                      <span className="truncate block text-[var(--color-ink,#1A1A1A)] font-bold">{details.origin}</span>
                    </div>
                    <div>
                      <span className="block font-semibold uppercase text-[9px] tracking-wider text-[var(--color-gold,#B8935F)]">
                        Harvest Cycle
                      </span>
                      <span className="truncate block text-[var(--color-ink,#1A1A1A)] font-bold">{details.harvest}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accordion Item 3: Vacuum Packaging & Freshness */}
        <div className="transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('packaging')}
            aria-expanded={openSection === 'packaging'}
            className={`w-full py-3.5 px-4 flex items-center justify-between text-left transition-colors cursor-pointer ${
              openSection === 'packaging' 
                ? 'bg-[var(--color-cream,#FAF9F5)]' 
                : 'hover:bg-[var(--color-cream,#FAF9F5)]/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <PackageCheck size={14} className="text-[var(--color-gold,#B8935F)] shrink-0" />
              <span className="text-xs font-serif font-bold tracking-wide text-[var(--color-ink,#1A1A1A)]">
                Vacuum Packaging & Freshness
              </span>
            </div>
            <motion.div
              animate={{ rotate: openSection === 'packaging' ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[var(--color-gold,#B8935F)]"
            >
              <ChevronDown size={15} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {openSection === 'packaging' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-1 space-y-2.5 text-xs leading-relaxed text-[var(--color-ink-muted,#5A5A5A)]">
                  <p className="text-[var(--color-ink,#1A1A1A)]/90">{details.packaging}</p>
                  <div className="pt-2 flex items-center gap-2 text-[10px] font-semibold text-[var(--color-gold,#B8935F)]">
                    <ShieldCheck size={14} />
                    <span>Food-grade certified high barrier pouch</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accordion Item 4: Allergen & Facility Notice */}
        <div className="transition-colors">
          <button
            type="button"
            onClick={() => toggleSection('allergens')}
            aria-expanded={openSection === 'allergens'}
            className={`w-full py-3.5 px-4 flex items-center justify-between text-left transition-colors cursor-pointer ${
              openSection === 'allergens' 
                ? 'bg-[var(--color-cream,#FAF9F5)]' 
                : 'hover:bg-[var(--color-cream,#FAF9F5)]/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={14} className="text-[var(--color-gold,#B8935F)] shrink-0" />
              <span className="text-xs font-serif font-bold tracking-wide text-[var(--color-ink,#1A1A1A)]">
                Allergen & Facility Transparency
              </span>
            </div>
            <motion.div
              animate={{ rotate: openSection === 'allergens' ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-[var(--color-gold,#B8935F)]"
            >
              <ChevronDown size={15} />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {openSection === 'allergens' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-1 space-y-2 text-xs leading-relaxed text-[var(--color-ink-muted,#5A5A5A)]">
                  <p className="text-[var(--color-ink,#1A1A1A)]/90 font-medium">
                    {getLocalized(product, 'allergenWarning', language) || 'Packed in a facility that handles tree nuts, peanuts, sesame seeds, and dried fruits.'}
                  </p>
                  <p className="text-[11px] text-[var(--color-ink,#1A1A1A)]/70">
                    All lots are visually inspected and nitrogen sealed in our climate-controlled roastery in Lahore.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
