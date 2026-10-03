import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Truck, RotateCcw, ShieldCheck, CheckCircle2, Clock, MapPin, Sparkles } from 'lucide-react';
import { acquireScrollLock } from '../utils/scrollLock';

export type PolicyTab = 'shipping' | 'refund' | 'privacy';

interface PolicyPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PolicyTab;
}

export function PolicyPagesModal({
  isOpen,
  onClose,
  initialTab = 'shipping',
}: PolicyPagesModalProps) {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);

  // Sync initial tab when reopened
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const releaseLock = acquireScrollLock();
      return () => {
        releaseLock();
      };
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-3 sm:p-5 md:p-8 select-none">
      {/* ── Backdrop with Soft Blur ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      />

      {/* ── Modal Container ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--color-surface,#FFFFFF)] rounded-3xl sm:rounded-[36px] shadow-lg border-2 border-[var(--color-gold,#B8935F)]/40 flex flex-col overflow-hidden text-[var(--color-ink,#1A1A1A)] z-10 select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header & Tab Navigation ────────────────────────────────── */}
        <div className="px-6 sm:px-10 pt-7 pb-4 border-b border-[var(--color-gold,#B8935F)]/25 bg-[var(--color-base,#FDFCFA)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-[var(--color-gold,#B8935F)]">
                AllBarka Boutique Governance
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[var(--color-ink,#1A1A1A)] tracking-tight mt-0.5">
              Client Assurance & Policies
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[var(--color-surface,#FFFFFF)] hover:bg-[var(--color-cream,#FAF9F5)] text-[var(--color-ink,#1A1A1A)] flex items-center justify-center transition-all cursor-pointer border border-[var(--color-gold,#B8935F)]/35 hover:border-[var(--color-gold,#B8935F)] shadow-xs"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Tab Switcher Pills ─────────────────────────────────────────── */}
        <div className="px-6 sm:px-10 py-3 bg-[var(--color-cream,#FAF9F5)] border-b border-[var(--color-gold,#B8935F)]/20 flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('shipping')}
            className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'shipping'
                ? 'bg-[var(--color-gold,#B8935F)] text-white shadow-xs border border-[var(--color-gold,#B8935F)]'
                : 'bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] hover:bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/20'
            }`}
          >
            <Truck size={14} />
            <span>Shipping & Delivery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('refund')}
            className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'refund'
                ? 'bg-[var(--color-gold,#B8935F)] text-white shadow-xs border border-[var(--color-gold,#B8935F)]'
                : 'bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] hover:bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/20'
            }`}
          >
            <RotateCcw size={14} />
            <span>Refund Policy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'bg-[var(--color-gold,#B8935F)] text-white shadow-xs border border-[var(--color-gold,#B8935F)]'
                : 'bg-[var(--color-surface,#FFFFFF)] text-[var(--color-ink,#1A1A1A)] hover:bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/20'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* ── Content Scroll Area (Typography Focused) ───────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 sm:py-10 space-y-8 leading-relaxed bg-[var(--color-base,#FDFCFA)]">
          {activeTab === 'shipping' && (
            <motion.div
              key="tab-shipping"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-3xl space-y-8"
            >
              {/* Section 1: Dispatch Logistics */}
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#B8935F)] block">
                  Logistics & Fulfillment
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-ink,#1A1A1A)]">
                  Artisanal Handling & Express Dispatch Logistics
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-ink,#1A1A1A)] font-normal leading-relaxed">
                  All AllBarka consignments are processed within our climate-controlled boutique facility in Lahore. Every parcel undergoes individual nitrogen thermal vacuum sealing directly prior to handover to our courier partners, preventing ambient moisture degradation and locking in the authentic kernel crunch and natural oils of the crop.
                </p>
              </div>

              {/* Subtle Gold Divider */}
              <hr className="border-t border-[var(--color-gold,#B8935F)]/30" />

              {/* Section 2: Standard Delivery Times */}
              <div className="space-y-4">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#B8935F)] block">
                  Standard Delivery Times
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-ink,#1A1A1A)]">
                  Transit Windows & Fleet Protocol
                </h3>
                
                <div className="grid sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-4.5 rounded-2xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 space-y-2 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-black text-[var(--color-ink,#1A1A1A)] uppercase tracking-wider">
                      <Clock size={15} className="text-[var(--color-gold,#B8935F)]" />
                      <span>Lahore Metropolitan (Same-Day / 24h)</span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-[var(--color-ink-muted,#5A5A5A)] leading-relaxed">
                      Orders placed before 09:00 PM are dispatched same-day via our dedicated in-house courier fleet across DHA, Gulberg, Cantt, Model Town, Johar Town, and Bahria Town.
                    </p>
                  </div>

                  <div className="p-4.5 rounded-2xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/30 space-y-2 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-black text-[var(--color-ink,#1A1A1A)] uppercase tracking-wider">
                      <MapPin size={15} className="text-[var(--color-gold,#B8935F)]" />
                      <span>Nationwide Air & Express (24–48h)</span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-[var(--color-ink-muted,#5A5A5A)] leading-relaxed">
                      Islamabad, Karachi, Peshawar, Rawalpindi, Faisalabad, and 100+ cities serviced through verified priority couriers (Trax / Leopards / TCS) with real-time tracking links.
                    </p>
                  </div>
                </div>
              </div>

              {/* Subtle Gold Divider */}
              <hr className="border-t border-[var(--color-gold,#B8935F)]/30" />

              {/* Section 3: Complimentary Threshold */}
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#B8935F)] block">
                  Shipping Tariffs & Complimentary Policy
                </span>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-[var(--color-ink,#1A1A1A)]">
                  Complimentary Standard Delivery in Lahore from Rs.3,000
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-ink-muted,#5A5A5A)] leading-relaxed">
                  Lahore standard delivery is Rs.150 and free when merchandise after discounts reaches Rs.3,000. Outside Lahore, delivery is Rs.250 per kilogram of actual order weight, with a minimum Rs.250 even below 1kg. No free delivery applies outside Lahore.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'refund' && (
            <motion.div
              key="tab-refund"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-3xl space-y-8"
            >
              {/* Section 1: 100% Purity & Quality Guarantee */}
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#B8935F)] block">
                  Purity Guarantee
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-ink,#1A1A1A)]">
                  100% Purity & Quality Guarantee
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-ink,#1A1A1A)] font-normal leading-relaxed">
                  At AllBarka, we stand behind the absolute purity, unbleached grade, and orchard freshness of every single item. Because we procure directly through private grower networks and inspect every batch by hand, we guarantee 100% genuine quality without compromise.
                </p>
              </div>

              {/* Subtle Gold Divider */}
              <hr className="border-t border-[var(--color-gold,#B8935F)]/30" />

              {/* Section 2: Hassle-Free Resolutions */}
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#B8935F)] block">
                  Boutique Resolution Protocol
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-ink,#1A1A1A)]">
                  Instant Replacement or Full 100% Refund
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-ink,#1A1A1A)] font-normal leading-relaxed">
                  If any batch received fails to meet your standard of freshness, kernel aroma, or crispness, notify our WhatsApp concierge within 48 hours of delivery. We will immediately dispatch a fresh replacement batch or process a full 100% refund to your preferred bank account or digital wallet—with zero tedious paperwork required.
                </p>
                <div className="p-4 rounded-2xl bg-[var(--color-cream,#FAF9F5)] border border-[var(--color-gold,#B8935F)]/40 flex items-center gap-3 text-xs font-semibold text-[var(--color-ink,#1A1A1A)] shadow-xs">
                  <CheckCircle2 size={16} className="text-[var(--color-gold,#B8935F)] shrink-0" />
                  <span>No need to return opened perishables if quality fails our purity criteria.</span>
                </div>
              </div>

              {/* Subtle Gold Divider */}
              <hr className="border-t border-[var(--color-gold,#B8935F)]/30" />

              {/* Section 3: Damaged Parcels */}
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#B8935F)] block">
                  Transit & Seal Protection
                </span>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-[var(--color-ink,#1A1A1A)]">
                  Compromised Packaging or Transit Damage
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-ink-muted,#5A5A5A)] leading-relaxed">
                  In the rare event that a courier pouch suffers exterior damage or compromised vacuum integrity during transit, simply send a photo to our WhatsApp line (0316-0666083). We immediately dispatch a fresh, sealed replacement package with priority air express at zero additional cost to you.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'privacy' && (
            <motion.div
              key="tab-privacy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-3xl space-y-8"
            >
              {/* Section 1: Customer Data Protection */}
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#B8935F)] block">
                  Discretion & Confidentiality
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-ink,#1A1A1A)]">
                  Customer Data Protection & Discretion
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-ink,#1A1A1A)] font-normal leading-relaxed">
                  We treat our patrons&apos; personal details with the highest degree of discretion. Information collected during checkout (including names, contact numbers, and delivery addresses) is used strictly and exclusively for order verification, express courier fulfillment, and customer support.
                </p>
              </div>

              {/* Subtle Gold Divider */}
              <hr className="border-t border-[var(--color-gold,#B8935F)]/30" />

              {/* Section 2: Zero Third-Party Sharing */}
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#B8935F)] block">
                  Commercial Privacy Standard
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-ink,#1A1A1A)]">
                  Zero Third-Party Commercial Sharing
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-ink,#1A1A1A)] font-normal leading-relaxed">
                  AllBarka never sells, rents, leases, or trades client details to external marketing agencies, advertising networks, or data brokers. All digital records are stored behind encrypted protocols and accessed solely by authorized fulfillment personnel.
                </p>
              </div>

              {/* Subtle Gold Divider */}
              <hr className="border-t border-[var(--color-gold,#B8935F)]/30" />

              {/* Section 3: Client Rights & Removal */}
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#B8935F)] block">
                  Client Rights
                </span>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-[var(--color-ink,#1A1A1A)]">
                  Right to Modify or Delete Contact Records
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-ink-muted,#5A5A5A)] leading-relaxed">
                  Patrons may at any time request the viewing, modification, or permanent deletion of their order history and contact phone records by messaging our WhatsApp concierge or emailing privacy@allbarka.com.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="px-6 sm:px-10 py-4 bg-[var(--color-cream,#FAF9F5)] border-t border-[var(--color-gold,#B8935F)]/25 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-ink-muted,#5A5A5A)]">
            <Sparkles size={14} className="text-[var(--color-gold,#B8935F)]" />
            <span>AllBarka Luxury Boutique, Lahore, Pakistan</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[var(--color-gold,#B8935F)] text-white hover:bg-[var(--color-gold-light,#D4B483)] text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border border-[var(--color-gold,#B8935F)] shadow-xs"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default PolicyPagesModal;
