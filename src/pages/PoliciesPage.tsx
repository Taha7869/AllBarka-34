import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  X, 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Sparkles, 
  ArrowRight,
  FileText,
  Scale,
  PhoneCall
} from 'lucide-react';
import { acquireScrollLock } from '../utils/scrollLock';
import SEO from '../components/SEO';
import { CONTACT_CONFIG, buildHumanSupportWhatsAppUrl, buildCustomerEmailUrl } from '../config/contacts';

export type PolicyTab = 'shipping' | 'refund' | 'privacy' | 'terms';

export const normalizePolicyTab = (slug?: string): PolicyTab | 'unknown' => {
  if (!slug) return 'shipping';
  const s = slug.toLowerCase().trim();
  if (s === 'shipping' || s === 'delivery' || s === 'dispatch') return 'shipping';
  if (s === 'refund' || s === 'refunds' || s === 'returns' || s === 'return') return 'refund';
  if (s === 'privacy' || s === 'security') return 'privacy';
  if (s === 'terms' || s === 'terms-of-service' || s === 'conditions' || s === 'tos') return 'terms';
  return 'unknown';
};

export interface PolicyPagesModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: PolicyTab | string;
  asPage?: boolean;
}

export function PolicyPagesModal({
  isOpen,
  onClose,
  initialTab = 'shipping',
  asPage = false
}: PolicyPagesModalProps) {
  const [activeTab, setActiveTab] = useState<PolicyTab | 'unknown'>(() => normalizePolicyTab(initialTab));

  // Sync initial tab when reopened or route changed
  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizePolicyTab(initialTab));
    }
  }, [isOpen, initialTab]);

  // Scroll to top when viewed as a page
  useEffect(() => {
    if (asPage) {
      window.scrollTo(0, 0);
    }
  }, [asPage, activeTab]);

  // Lock background scroll only when modal is active
  useEffect(() => {
    if (asPage || !isOpen) return;
    const releaseLock = acquireScrollLock();
    return () => {
      releaseLock();
    };
  }, [isOpen, asPage]);

  // Close on Escape key press (modal mode only)
  useEffect(() => {
    if (asPage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, asPage]);

  if (!asPage && !isOpen) return null;

  const policyMeta: Record<PolicyTab, { title: string; desc: string }> = {
    shipping: {
      title: 'Shipping & Delivery Policy',
      desc: 'AllBarka delivery guidelines: Rs. 150 standard delivery across Pakistan, free over Rs. 3,000, Rs. 350 priority express, and same-day dispatch in Lahore.'
    },
    refund: {
      title: 'Returns & Freshness Guarantee',
      desc: '48-hour inspection guarantee: immediate replacement or full refund if any batch fails our freshness and purity standards.'
    },
    privacy: {
      title: 'Client Privacy & Data Security',
      desc: 'AllBarka client confidentiality: zero data sharing with third parties, secure encrypted storage, and patron right to record deletion.'
    },
    terms: {
      title: 'Terms of Service & Boutique Conditions',
      desc: 'Terms governing AllBarka boutique sales, weight tolerances, transparent PKR pricing, wholesale orders, and Lahore jurisdiction.'
    }
  };

  const currentMeta = activeTab !== 'unknown' ? policyMeta[activeTab] : {
    title: 'Policies & Client Governance',
    desc: 'Boutique governance policies for AllBarka Luxury Dry Fruits & Spices.'
  };

  // ── IN-FLOW STANDALONE PAGE VARIANT (Full Route Page) ─────────────────────
  if (asPage) {
    return (
      <div className="w-full min-h-screen bg-[var(--color-base,#F6F1EA)] pt-6 sm:pt-10 pb-24 px-4 sm:px-6 lg:px-8">
        <SEO 
          title={`${currentMeta.title} — AllBarka Luxury Boutique`}
          description={currentMeta.desc}
          canonicalPath={activeTab !== 'unknown' ? `/policies/${activeTab}` : '/policies'}
        />
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Top Header & Breadcrumb */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-gold,#C7982F)]/25">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-[var(--color-gold,#C7982F)]">
                  AllBarka Boutique Governance
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-[var(--color-emerald,#042821)] tracking-tight mt-1">
                Client Assurance & Policies
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--color-surface,#FFFCF7)] hover:bg-[var(--color-gold,#C7982F)] text-[var(--color-ink,#29231D)] hover:text-white border border-[var(--color-gold,#C7982F)]/35 transition-all shadow-xs"
              >
                <span>Return to Shop</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Tab Switcher Pills */}
          <div className="px-3 sm:px-6 py-2.5 bg-[var(--color-surface,#FFFCF7)] rounded-2xl border border-[var(--color-gold,#C7982F)]/25 flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('shipping')}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'shipping'
                  ? 'bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)] shadow-xs border border-[var(--color-emerald,#042821)]'
                  : 'bg-[var(--color-surface,#FFFCF7)] text-[var(--color-ink,#29231D)] hover:bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/20'
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
                  ? 'bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)] shadow-xs border border-[var(--color-emerald,#042821)]'
                  : 'bg-[var(--color-surface,#FFFCF7)] text-[var(--color-ink,#29231D)] hover:bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/20'
              }`}
            >
              <RotateCcw size={14} />
              <span>Refund & Returns</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'privacy'
                  ? 'bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)] shadow-xs border border-[var(--color-emerald,#042821)]'
                  : 'bg-[var(--color-surface,#FFFCF7)] text-[var(--color-ink,#29231D)] hover:bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/20'
              }`}
            >
              <ShieldCheck size={14} />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'terms'
                  ? 'bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)] shadow-xs border border-[var(--color-emerald,#042821)]'
                  : 'bg-[var(--color-surface,#FFFCF7)] text-[var(--color-ink,#29231D)] hover:bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/20'
              }`}
            >
              <FileText size={14} />
              <span>Terms of Service</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="rounded-3xl border border-[var(--color-gold,#C7982F)]/30 bg-[var(--color-surface,#FFFCF7)] shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-6 sm:p-12 space-y-8 text-left leading-relaxed">
            {activeTab === 'shipping' && (
              <motion.div
                key="tab-shipping"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl space-y-8"
              >
                {/* Section 1: Dispatch Logistics */}
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Logistics & Fulfillment
                  </span>
                  <h2 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                    Artisanal Handling & Express Dispatch Logistics
                  </h2>
                  <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)] font-normal leading-relaxed">
                    All AllBarka consignments are processed within our climate-controlled boutique facility in Lahore. Every parcel undergoes individual nitrogen thermal vacuum sealing directly prior to handover to courier dispatch, preventing ambient humidity degradation and locking in the authentic kernel crunch and natural oils of the harvest.
                  </p>
                </div>

                <hr className="border-t border-[var(--color-gold,#C7982F)]/30" />

                {/* Section 2: Transit Windows */}
                <div className="space-y-4">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Standard Delivery Times
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                    Transit Windows & City Coverage
                  </h3>
                  
                  <div className="grid sm:grid-cols-2 gap-4 pt-1">
                    <div className="p-4.5 rounded-2xl bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/30 space-y-2 shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-black text-[var(--color-ink,#29231D)] uppercase tracking-wider">
                        <Clock size={15} className="text-[var(--color-gold,#C7982F)]" />
                        <span>Lahore Metropolitan (Same-Day / 24h)</span>
                      </div>
                      <p className="text-xs sm:text-[13px] text-[var(--color-ink,#29231D)]/70 leading-relaxed">
                        Orders placed before 09:00 PM are dispatched same-day via dedicated boutique courier across DHA, Gulberg, Cantt, Model Town, Johar Town, Bahria Town, and all Lahore sectors.
                      </p>
                    </div>

                    <div className="p-4.5 rounded-2xl bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/30 space-y-2 shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-black text-[var(--color-ink,#29231D)] uppercase tracking-wider">
                        <MapPin size={15} className="text-[var(--color-gold,#C7982F)]" />
                        <span>Nationwide Air & Express (24–48h)</span>
                      </div>
                      <p className="text-xs sm:text-[13px] text-[var(--color-ink,#29231D)]/70 leading-relaxed">
                        Islamabad, Rawalpindi, Karachi, Peshawar, Faisalabad, Multan, and 120+ cities serviced via verified air & express courier partners (TCS, Leopards, Trax) with real-time tracking links.
                      </p>
                    </div>
                  </div>
                </div>

                <hr className="border-t border-[var(--color-gold,#C7982F)]/30" />

                {/* Section 3: Shipping Tariffs */}
                <div className="space-y-4">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Shipping Tariffs & Complimentary Policy
                  </span>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[var(--color-emerald,#042821)]">
                    Transparent Flat Rates Across Pakistan
                  </h3>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/30 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold,#C7982F)]">Standard Shipping</span>
                      <p className="text-lg font-serif font-bold text-[var(--color-emerald,#042821)]">Rs. 150 <span className="text-xs font-sans font-normal text-[var(--color-ink,#29231D)]/60">(Free over Rs. 3,000)</span></p>
                      <p className="text-xs text-[var(--color-ink,#29231D)]/70">Delivered within 2–4 business days across all nationwide courier hubs.</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/30 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold,#C7982F)]">Express Courier Dispatch</span>
                      <p className="text-lg font-serif font-bold text-[var(--color-emerald,#042821)]">Rs. 350</p>
                      <p className="text-xs text-[var(--color-ink,#29231D)]/70">Priority processing and expedited air transit (24–36 hours).</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'refund' && (
              <motion.div
                key="tab-refund"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl space-y-8"
              >
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Purity Guarantee
                  </span>
                  <h2 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                    100% Purity & Freshness Guarantee
                  </h2>
                  <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)] font-normal leading-relaxed">
                    At AllBarka, we stand behind the absolute purity, unbleached natural grade, and orchard freshness of every single item. Because we procure directly through private grower networks and inspect every lot by hand in Lahore, we guarantee 100% genuine quality without compromise.
                  </p>
                </div>

                <hr className="border-t border-[var(--color-gold,#C7982F)]/30" />

                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Boutique Resolution Protocol
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                    Instant Replacement or Full 100% Refund
                  </h3>
                  <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)] font-normal leading-relaxed">
                    If any batch received fails to meet your standard of freshness, kernel aroma, or crunch, notify our WhatsApp concierge ({CONTACT_CONFIG.humanSupportWhatsApp.formatted}) within 48 hours of delivery. We will immediately dispatch a fresh replacement batch or process a full refund to your bank account or digital wallet (JazzCash / EasyPaisa)—with zero tedious paperwork required.
                  </p>
                  <div className="p-4 rounded-2xl bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/40 flex items-center gap-3 text-xs font-semibold text-[var(--color-ink,#29231D)] shadow-xs">
                    <CheckCircle2 size={16} className="text-[var(--color-gold,#C7982F)] shrink-0" />
                    <span>No need to return opened perishables if quality fails our purity criteria.</span>
                  </div>
                </div>

                <hr className="border-t border-[var(--color-gold,#C7982F)]/30" />

                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Transit & Seal Protection
                  </span>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[var(--color-emerald,#042821)]">
                    Compromised Packaging or Transit Damage
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-ink,#29231D)]/70 leading-relaxed">
                    In the rare event that a courier parcel suffers exterior damage or compromised vacuum integrity during transit, simply send a photo to our WhatsApp line. We immediately dispatch a fresh, sealed replacement package with priority air express at zero additional cost.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'privacy' && (
              <motion.div
                key="tab-privacy"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl space-y-8"
              >
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Discretion & Confidentiality
                  </span>
                  <h2 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                    Customer Data Protection & Discretion
                  </h2>
                  <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)] font-normal leading-relaxed">
                    We treat our patrons&apos; personal details with the highest degree of discretion. Information collected during checkout (including names, contact numbers, and delivery addresses) is used strictly and exclusively for order verification, express courier fulfillment, and customer support.
                  </p>
                </div>

                <hr className="border-t border-[var(--color-gold,#C7982F)]/30" />

                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Commercial Privacy Standard
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                    Zero Third-Party Commercial Sharing
                  </h3>
                  <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)] font-normal leading-relaxed">
                    AllBarka never sells, rents, leases, or trades client details to external marketing agencies, advertising networks, or data brokers. All digital records are stored behind encrypted protocols and accessed solely by authorized fulfillment personnel.
                  </p>
                </div>

                <hr className="border-t border-[var(--color-gold,#C7982F)]/30" />

                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Client Rights
                  </span>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[var(--color-emerald,#042821)]">
                    Right to Modify or Delete Contact Records
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-ink,#29231D)]/70 leading-relaxed">
                    Patrons may at any time request the viewing, modification, or permanent deletion of their order history and contact phone records by messaging our WhatsApp concierge or emailing {CONTACT_CONFIG.customerEmail}.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'terms' && (
              <motion.div
                key="tab-terms"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl space-y-8"
              >
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Terms of Service
                  </span>
                  <h2 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                    Boutique Conditions & Commercial Standards
                  </h2>
                  <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)] font-normal leading-relaxed">
                    By placing an order with AllBarka Luxury Dry Fruits & Spices, you agree to the conditions outlined below. Our terms are designed to protect both the patron and our artisanal producers, ensuring uncompromised standards of grade, weight, and fulfillment.
                  </p>
                </div>

                <hr className="border-t border-[var(--color-gold,#C7982F)]/30" />

                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Pricing & Weight Accuracy
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                    Spot-Rate Pricing & Calibrated Weights
                  </h3>
                  <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)] font-normal leading-relaxed">
                    All product prices are quoted in Pakistani Rupees (PKR) and include packaging. Due to international crop spot rates (e.g., Pine Nuts from Waziristan, Iranian Mamra Almonds, Kashmiri Saffron), rates may be revised periodically. Every consignment is packed on certified digital scales with a precision tolerance of +/- 1%.
                  </p>
                </div>

                <hr className="border-t border-[var(--color-gold,#C7982F)]/30" />

                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Order Cancellation & Amendments
                  </span>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[var(--color-emerald,#042821)]">
                    Fulfillment Handover & Cancellation Windows
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-ink,#29231D)]/70 leading-relaxed">
                    Orders may be modified or cancelled free of penalty prior to dispatch handover to our courier team. For same-day orders in Lahore, notify our WhatsApp concierge within 1 hour of placement. Once an order is with the courier and in transit, address redirects or returns will be handled under our standard returns protocol.
                  </p>
                </div>

                <hr className="border-t border-[var(--color-gold,#C7982F)]/30" />

                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                    Jurisdiction & Dispute Resolution
                  </span>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-[var(--color-emerald,#042821)]">
                    Governing Law of Pakistan
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-ink,#29231D)]/70 leading-relaxed">
                    All sales, contracts, and dispute resolutions are governed in accordance with the laws of the Islamic Republic of Pakistan, subject to the exclusive jurisdiction of the competent courts of Lahore, Punjab.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'unknown' && (
              <div className="py-8 text-center max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 rounded-full bg-[var(--color-gold,#C7982F)]/10 border border-[var(--color-gold,#C7982F)]/30 flex items-center justify-center mx-auto text-[var(--color-gold,#C7982F)]">
                  <ShieldCheck size={26} />
                </div>
                <h3 className="text-xl font-serif font-bold text-[var(--color-ink,#29231D)]">
                  Policy Document Not Found
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-ink,#29231D)]/70 leading-relaxed">
                  The requested policy slug does not exist. Please review our core boutique governance policies below:
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('shipping')}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-[var(--color-base,#F6F1EA)] hover:bg-[var(--color-gold,#C7982F)] text-[var(--color-ink,#29231D)] hover:text-white border border-[var(--color-gold,#C7982F)]/30 transition-colors"
                  >
                    Shipping & Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('refund')}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-[var(--color-base,#F6F1EA)] hover:bg-[var(--color-gold,#C7982F)] text-[var(--color-ink,#29231D)] hover:text-white border border-[var(--color-gold,#C7982F)]/30 transition-colors"
                  >
                    Refund Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('privacy')}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-[var(--color-base,#F6F1EA)] hover:bg-[var(--color-gold,#C7982F)] text-[var(--color-ink,#29231D)] hover:text-white border border-[var(--color-gold,#C7982F)]/30 transition-colors"
                  >
                    Privacy Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('terms')}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-[var(--color-base,#F6F1EA)] hover:bg-[var(--color-gold,#C7982F)] text-[var(--color-ink,#29231D)] hover:text-white border border-[var(--color-gold,#C7982F)]/30 transition-colors"
                  >
                    Terms of Service
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 rounded-2xl sm:rounded-3xl bg-[var(--color-surface,#FFFCF7)] border border-[var(--color-gold,#C7982F)]/25 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-ink,#29231D)]/70">
              <Sparkles size={14} className="text-[var(--color-gold,#C7982F)]" />
              <span>AllBarka Luxury Boutique, Lahore, Pakistan • Concierge: {CONTACT_CONFIG.humanSupportWhatsApp.formatted}</span>
            </div>

            <a
              href={buildHumanSupportWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-full border border-[var(--color-gold,#C7982F)]/40 bg-[var(--color-surface,#FFFCF7)] text-[var(--color-ink,#29231D)] hover:bg-[var(--color-base,#F6F1EA)] hover:text-[var(--color-gold,#C7982F)] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs"
            >
              <PhoneCall size={13} />
              <span>WhatsApp Direct Support</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── MODAL VARIANT (Triggered Modal Overlay) ──────────────────────────────
  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-3 sm:p-5 md:p-8 select-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--color-surface,#FFFCF7)] rounded-3xl sm:rounded-[36px] shadow-lg border-2 border-[var(--color-gold,#C7982F)]/40 flex flex-col overflow-hidden text-[var(--color-ink,#29231D)] z-10 select-text"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 sm:px-10 pt-7 pb-4 border-b border-[var(--color-gold,#C7982F)]/25 bg-[var(--color-base,#F6F1EA)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-[var(--color-gold,#C7982F)]">
                AllBarka Boutique Governance
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-[var(--color-emerald,#042821)] tracking-tight mt-0.5">
              Client Assurance & Policies
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[var(--color-surface,#FFFCF7)] hover:bg-[var(--color-base,#F6F1EA)] text-[var(--color-ink,#29231D)] flex items-center justify-center transition-all cursor-pointer border border-[var(--color-gold,#C7982F)]/35 hover:border-[var(--color-gold,#C7982F)] shadow-xs"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="px-6 sm:px-10 py-3 bg-[var(--color-base,#F6F1EA)] border-b border-[var(--color-gold,#C7982F)]/20 flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('shipping')}
            className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'shipping'
                ? 'bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)] shadow-xs border border-[var(--color-emerald,#042821)]'
                : 'bg-[var(--color-surface,#FFFCF7)] text-[var(--color-ink,#29231D)] hover:bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/20'
            }`}
          >
            <Truck size={14} />
            <span>Shipping</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('refund')}
            className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'refund'
                ? 'bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)] shadow-xs border border-[var(--color-emerald,#042821)]'
                : 'bg-[var(--color-surface,#FFFCF7)] text-[var(--color-ink,#29231D)] hover:bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/20'
            }`}
          >
            <RotateCcw size={14} />
            <span>Refunds</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)] shadow-xs border border-[var(--color-emerald,#042821)]'
                : 'bg-[var(--color-surface,#FFFCF7)] text-[var(--color-ink,#29231D)] hover:bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/20'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Privacy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'terms'
                ? 'bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)] shadow-xs border border-[var(--color-emerald,#042821)]'
                : 'bg-[var(--color-surface,#FFFCF7)] text-[var(--color-ink,#29231D)] hover:bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/20'
            }`}
          >
            <FileText size={14} />
            <span>Terms</span>
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 sm:py-10 space-y-8 leading-relaxed bg-[var(--color-surface,#FFFCF7)]">
          {activeTab === 'shipping' && (
            <motion.div
              key="tab-shipping-modal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-3xl space-y-8"
            >
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                  Logistics & Fulfillment
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                  Artisanal Handling & Express Dispatch
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)] font-normal leading-relaxed">
                  All AllBarka consignments are processed within our climate-controlled boutique facility in Lahore. Every parcel undergoes individual nitrogen thermal vacuum sealing directly prior to courier handover.
                </p>
              </div>

              <hr className="border-t border-[var(--color-gold,#C7982F)]/30" />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/30 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold,#C7982F)]">Lahore Same-Day / 24h</span>
                  <p className="text-xs text-[var(--color-ink,#29231D)]/70">Orders before 9 PM dispatched same day across DHA, Gulberg, Model Town, Cantt & Bahria.</p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--color-base,#F6F1EA)] border border-[var(--color-gold,#C7982F)]/30 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold,#C7982F)]">Nationwide Express</span>
                  <p className="text-xs text-[var(--color-ink,#29231D)]/70">TCS / Leopards / Trax air express to Karachi, Islamabad, Peshawar, and 120+ cities.</p>
                </div>
              </div>

              <hr className="border-t border-[var(--color-gold,#C7982F)]/30" />

              <div className="space-y-2">
                <h4 className="text-base font-bold font-serif text-[var(--color-emerald,#042821)]">Complimentary Threshold</h4>
                <p className="text-xs sm:text-sm text-[var(--color-ink,#29231D)]/70 leading-relaxed">
                  Orders over Rs. 3,000 qualify for free standard shipping across Pakistan. Orders below carry a flat Rs. 150 standard fee (or Rs. 350 express).
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'refund' && (
            <motion.div
              key="tab-refund-modal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-3xl space-y-8"
            >
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                  Purity Guarantee
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                  100% Purity & Quality Guarantee
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)] font-normal leading-relaxed">
                  Every parcel is guaranteed fresh. Notify our WhatsApp concierge within 48 hours if any item fails your satisfaction for an immediate replacement or full refund without red tape.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'privacy' && (
            <motion.div
              key="tab-privacy-modal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-3xl space-y-8"
            >
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                  Discretion
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                  Zero Third-Party Commercial Sharing
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)] font-normal leading-relaxed">
                  Your delivery and contact details are stored securely and never traded with marketing brokers. You may request record deletion at any time.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'terms' && (
            <motion.div
              key="tab-terms-modal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-3xl space-y-8"
            >
              <div className="space-y-3">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-gold,#C7982F)] block">
                  Terms of Service
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-[var(--color-emerald,#042821)]">
                  Transparent Terms & Lahore Jurisdiction
                </h3>
                <p className="text-sm sm:text-base text-[var(--color-ink,#29231D)] font-normal leading-relaxed">
                  All transactions are quoted in PKR with +/- 1% calibrated scale accuracy. Orders can be cancelled prior to dispatch handover. Governed under the laws of Pakistan.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-10 py-4 bg-[var(--color-base,#F6F1EA)] border-t border-[var(--color-gold,#C7982F)]/25 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-ink,#29231D)]/70">
            <Sparkles size={14} className="text-[var(--color-gold,#C7982F)]" />
            <span>AllBarka Luxury Boutique, Lahore, Pakistan</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[var(--color-emerald,#042821)] text-[var(--color-gold,#C7982F)] hover:bg-[#03201A] text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border border-[var(--color-emerald,#042821)] shadow-xs"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default PolicyPagesModal;
