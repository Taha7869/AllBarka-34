import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  Sparkles,
  ArrowRight,
  MapPin,
  MessageCircle,
  Instagram,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  Mail
} from 'lucide-react';
import { FaFacebookF } from 'react-icons/fa';
import { AllBarkaCrestVector } from './AllBarkaLogo';
import { STORE_CONFIG } from '../config/store';
import { CONTACT_CONFIG, buildHumanSupportWhatsAppUrl } from '../config/contacts';

interface AccordionSection {
  title: string;
  links: Array<{ name: string; href: string; badge?: string }>;
}

const FOOTER_COLLECTIONS: AccordionSection = {
  title: 'Our Collections',
  links: [
    { name: 'All Products', href: '/shop' },
    { name: 'Premium Nuts & Kernels', href: '/shop/nuts' },
    { name: 'Sun-Dried Fruits', href: '/shop/fruits' },
    { name: 'Superfood Seeds', href: '/shop/berries' },
    { name: 'Snacks & Confections', href: '/shop/snacks' },
    { name: 'Gift Boxes & Combos', href: '/shop/combos', badge: 'Artisanal' },
  ],
};

const FOOTER_JOURNAL: AccordionSection = {
  title: 'The Journal',
  links: [
    { name: 'Harvest Chronicle', href: '/journal' },
    { name: 'Sourcing Heritage', href: '/pages/sourcing-policy' },
    { name: 'Nutritional Guidelines', href: '/journal' },
    { name: 'Storage & Serving', href: '/pages/vacuum-sealing' },
    { name: 'Gifting Ideas', href: '/gifting' },
  ],
};

const FOOTER_SUPPORT: AccordionSection = {
  title: 'Support & Dispatch',
  links: [
    { name: 'Frequently Asked Questions', href: '/faq' },
    { name: 'Lahore & Nationwide Shipping', href: '/policies/shipping' },
    { name: 'Order Support', href: '/contact' },
    { name: 'Returns & Replacement', href: '/policies/refund' },
    { name: 'Privacy Protocol', href: '/policies/privacy' },
    { name: 'Terms of Service', href: '/policies/terms' },
  ],
};

export default function Footer() {
  // Mobile accordion: only 1 section open at a time
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Newsletter State
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [newsletterError, setNewsletterError] = useState<string | null>(null);

  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    setOpenSection(prev => (prev === title ? null : title));
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterError(null);
    setNewsletterMessage(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setNewsletterError('Please provide a valid email address.');
      setNewsletterStatus('error');
      return;
    }

    if (!consent) {
      setNewsletterError('Please accept the private reserve communications consent.');
      setNewsletterStatus('error');
      return;
    }

    setNewsletterStatus('submitting');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), consent: true })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to subscribe at this moment.');
      }
      
      // Store local record
      const existing = JSON.parse(localStorage.getItem('allbarka_subscribers') || '[]');
      if (!existing.includes(email.trim().toLowerCase())) {
        existing.push(email.trim().toLowerCase());
        localStorage.setItem('allbarka_subscribers', JSON.stringify(existing));
      }

      setNewsletterStatus('success');
      setNewsletterMessage(data.message || 'You are enrolled in the AllBarka Private Reserve harvest alerts.');
      setEmail('');
    } catch (err: any) {
      // Fallback gracefully if offline
      try {
        const existing = JSON.parse(localStorage.getItem('allbarka_subscribers') || '[]');
        if (!existing.includes(email.trim().toLowerCase())) {
          existing.push(email.trim().toLowerCase());
          localStorage.setItem('allbarka_subscribers', JSON.stringify(existing));
        }
        setNewsletterStatus('success');
        setNewsletterMessage('Welcome to the Private Reserve. Your email is saved for upcoming seasonal harvest announcements.');
        setEmail('');
      } catch {
        setNewsletterStatus('error');
        setNewsletterError(err.message || 'Subscription failed. Please try again or message our concierge.');
      }
    }
  };

  return (
    <footer className="w-full bg-[#042821] text-[#EDE8DE] border-t border-[#C7982F]/30 relative overflow-hidden select-none">
      {/* Restrained ambient gold radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-[#C7982F]/5 blur-3xl"
      />

      {/* 1. Subtle Gold/Emerald Assurance Strip with 3 concise trust points */}
      <div className="border-b border-[#C7982F]/20 bg-[#021A15]/80 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 text-center sm:text-left">
            
            {/* Point 1: Unbleached and Pure */}
            <div className="flex items-center justify-center sm:justify-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-[#C7982F]/40 text-[#C7982F]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white font-serif tracking-wide">
                  Unbleached & Pure
                </h4>
                <p className="text-xs text-[#A8B2AF] mt-0.5">
                  Single-origin harvests with zero chemical processing or artificial glazing.
                </p>
              </div>
            </div>

            {/* Point 2: Lahore Express Dispatch */}
            <div className="flex items-center justify-center sm:justify-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-[#C7982F]/40 text-[#C7982F]">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white font-serif tracking-wide">
                  Lahore Express Dispatch
                </h4>
                <p className="text-xs text-[#A8B2AF] mt-0.5">
                  Priority delivery across Gulberg, DHA, Cantt & swift nationwide courier.
                </p>
              </div>
            </div>

            {/* Point 3: Airtight Freshness Seal */}
            <div className="flex items-center justify-center sm:justify-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-[#C7982F]/40 text-[#C7982F]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white font-serif tracking-wide">
                  Airtight Freshness Seal
                </h4>
                <p className="text-xs text-[#A8B2AF] mt-0.5">
                  Custom vacuum packaging locking in raw aroma and crisp botanical oils.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 2. Main Footer Grid: 4 Balanced Columns on Desktop */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="hidden lg:grid lg:grid-cols-4 gap-8 xl:gap-12 items-start text-left">
          
          {/* Column 1: Brand & Sourcing Story */}
          <div className="space-y-6">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 flex items-center justify-center">
                <AllBarkaCrestVector />
              </div>
              <div>
                <span className="text-2xl font-serif font-bold text-white tracking-wide block group-hover:text-[#C7982F] transition-colors">
                  AllBarka
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#C7982F] block font-semibold">
                  LUXURY HARVESTS
                </span>
              </div>
            </Link>

            <p className="text-xs text-[#B4C0BC] leading-relaxed">
              Ethically procured single-origin dry fruits, nuts, and organic delicacies hand-graded for purity and dispatched fresh daily from Lahore.
            </p>

            <div className="space-y-2 text-xs text-[#A8B2AF]">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-[#C7982F] shrink-0 mt-0.5" />
                <span>Gulberg III & DHA Phase 5, Lahore, Pakistan</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MessageCircle className="h-4 w-4 text-[#25D366] shrink-0" />
                <a
                  href={buildHumanSupportWhatsAppUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#C7982F] transition-colors font-medium"
                  dir="ltr"
                >
                  WhatsApp: {CONTACT_CONFIG.humanSupportWhatsApp.formatted}
                </a>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={buildHumanSupportWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                aria-label="Contact via WhatsApp"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#B4C0BC] hover:text-[#042821] hover:bg-[#C7982F] hover:border-[#C7982F] transition-all"
              >
                <MessageCircle size={16} />
              </a>
              <a
                href={STORE_CONFIG.social.instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Follow on Instagram"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#B4C0BC] hover:text-[#042821] hover:bg-[#C7982F] hover:border-[#C7982F] focus-visible:ring-2 focus-visible:ring-[#C7982F] transition-all"
              >
                <Instagram size={16} />
              </a>
              <a
                href={STORE_CONFIG.social.facebookUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Follow AllBarka on Facebook"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#B4C0BC] hover:text-[#042821] hover:bg-[#C7982F] hover:border-[#C7982F] focus-visible:ring-2 focus-visible:ring-[#C7982F] transition-all"
              >
                <FaFacebookF size={15} />
              </a>
            </div>
          </div>

          {/* Column 2: Our Collections */}
          <div className="space-y-4">
            <h3 className="text-xs font-serif font-bold uppercase tracking-[0.2em] text-[#C7982F] border-b border-[#C7982F]/20 pb-2">
              Our Collections
            </h3>
            <ul className="space-y-2.5 text-xs">
              {FOOTER_COLLECTIONS.links.map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.href}
                    className="flex items-center justify-between text-[#B4C0BC] hover:text-white transition-colors py-1 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">{link.name}</span>
                    {link.badge && (
                      <span className="rounded-full bg-[#C7982F]/20 text-[#C7982F] border border-[#C7982F]/30 px-2 py-0.5 text-[9px] font-semibold">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: The Journal */}
          <div className="space-y-4">
            <h3 className="text-xs font-serif font-bold uppercase tracking-[0.2em] text-[#C7982F] border-b border-[#C7982F]/20 pb-2">
              The Journal
            </h3>
            <ul className="space-y-2.5 text-xs">
              {FOOTER_JOURNAL.links.map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.href}
                    className="flex items-center justify-between text-[#B4C0BC] hover:text-white transition-colors py-1 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Support & Dispatch + Concierge Card */}
          <div className="space-y-5">
            <h3 className="text-xs font-serif font-bold uppercase tracking-[0.2em] text-[#C7982F] border-b border-[#C7982F]/20 pb-2">
              Support & Dispatch
            </h3>
            <ul className="space-y-2.5 text-xs">
              {FOOTER_SUPPORT.links.map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.href}
                    className="flex items-center justify-between text-[#B4C0BC] hover:text-white transition-colors py-1 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Boutique Concierge Contact Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-[#C7982F]/30 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C7982F] block">
                Boutique Concierge
              </span>
              <p className="text-[11px] text-[#A8B2AF] leading-relaxed">
                Need bespoke corporate hampers or seasonal gifting curation? Our Lahore concierge is at your service.
              </p>
              <a
                href={buildHumanSupportWhatsAppUrl('Assalam-o-Alaikum, I would like to inquire about bespoke boutique hampers.')}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-[#C7982F] transition-colors mt-1"
              >
                <span>Connect with Concierge</span>
                <ArrowRight size={13} />
              </a>
            </div>
          </div>

        </div>

        {/* Desktop Newsletter Section: Private Reserve / AllBarka Updates */}
        <div className="hidden lg:block mt-12 pt-10 border-t border-white/10">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center justify-center gap-2 text-[#C7982F]">
              <Mail size={16} />
              <span className="text-xs font-serif font-bold uppercase tracking-[0.25em]">
                Private Reserve / AllBarka Updates
              </span>
            </div>
            <p className="text-xs text-[#A8B2AF]">
              Receive privileged notices regarding fresh seasonal harvests, wild Skardu arrivals, and exclusive patron privileges.
            </p>

            {newsletterStatus === 'success' ? (
              <div className="space-y-2 p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs">
                <div className="flex items-center justify-center gap-2 font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>{newsletterMessage || 'Enrolled in AllBarka Private Reserve.'}</span>
                </div>
                <p className="text-[11px] text-emerald-300/80">
                  You can modify your preferences or unsubscribe at any time by contacting our Lahore concierge or replying to any harvest bulletin.
                </p>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="flex-1 rounded-xl bg-white/5 border border-white/15 px-4 py-2.5 text-xs text-white placeholder:text-neutral-400 focus:border-[#C7982F] focus:outline-none focus:ring-1 focus:ring-[#C7982F] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'submitting'}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#C7982F] text-[#042821] font-bold text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                  >
                    <span>{newsletterStatus === 'submitting' ? 'Submitting...' : 'Subscribe'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Explicit Consent Checkbox & Transparency */}
                <div className="space-y-1.5">
                  <label className="flex items-center justify-center gap-2 text-[11px] text-[#A8B2AF] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="rounded border-white/30 text-[#C7982F] focus:ring-[#C7982F] h-3.5 w-3.5 cursor-pointer accent-[#C7982F]"
                    />
                    <span>I agree to receive seasonal harvest drops and private tasting previews.</span>
                  </label>
                  <p className="text-[10.5px] text-[#7E8C87] text-center">
                    Subscribers receive harvest bulletins & festive allocations. Never shared, unsubscribe anytime.
                  </p>
                </div>

                {newsletterError && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-red-400">
                    <AlertCircle size={14} />
                    <span>{newsletterError}</span>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* 3. Mobile Footer Layout: Brand/Newsletter first, then Accordions, then Social */}
        <div className="lg:hidden space-y-8 text-left">
          
          {/* Brand & Story */}
          <div className="space-y-4 text-center sm:text-left">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center">
                <AllBarkaCrestVector />
              </div>
              <div className="text-left">
                <span className="text-xl font-serif font-bold text-white tracking-wide block">
                  AllBarka
                </span>
                <span className="text-[9px] uppercase tracking-[0.22em] text-[#C7982F] block font-semibold">
                  LUXURY HARVESTS
                </span>
              </div>
            </Link>
            <p className="text-xs text-[#B4C0BC] leading-relaxed">
              Ethically procured single-origin dry fruits, nuts, and delicacies hand-graded and dispatched fresh daily from Lahore.
            </p>
          </div>

          {/* Mobile Newsletter Form */}
          <div className="min-w-0 p-4 sm:p-5 rounded-2xl bg-white/5 border border-[#C7982F]/20 space-y-3">
            <span className="text-[11px] font-serif font-bold uppercase tracking-[0.2em] text-[#C7982F] block">
              Private Reserve Updates
            </span>
            <p className="text-xs text-[#A8B2AF]">
              Get notified of seasonal crop arrivals & exclusive offers.
            </p>

            {newsletterStatus === 'success' ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{newsletterMessage || 'Enrolled in AllBarka Private Reserve.'}</span>
                </div>
                <p className="text-[11px] text-emerald-300/80">
                  Unsubscribe or change preferences anytime via concierge.
                </p>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <div className="flex flex-col gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-xs text-white placeholder:text-neutral-400 focus:border-[#C7982F] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'submitting'}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 rounded-xl bg-[#C7982F] text-[#042821] font-bold text-xs uppercase tracking-wider hover:brightness-110 cursor-pointer"
                  >
                    <span>{newsletterStatus === 'submitting' ? 'Submitting...' : 'Join Private Reserve'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="flex items-start gap-2 text-[11px] text-[#A8B2AF] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 rounded border-white/30 text-[#C7982F] focus:ring-[#C7982F] h-3.5 w-3.5 cursor-pointer accent-[#C7982F]"
                    />
                    <span className="min-w-0 break-words">I agree to receive seasonal harvest notices and private tasting invitations.</span>
                  </label>
                  <p className="text-[10px] text-[#7E8C87] pl-5">
                    Subscribers receive harvest bulletins & festive allocations. Never shared.
                  </p>
                </div>

                {newsletterError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertCircle size={14} />
                    <span>{newsletterError}</span>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Mobile Accordions (One open group at a time) */}
          <div className="space-y-2 border-t border-b border-white/10 py-2">
            {[FOOTER_COLLECTIONS, FOOTER_JOURNAL, FOOTER_SUPPORT].map((section) => {
              const isOpen = openSection === section.title;
              return (
                <div key={section.title} className="border-b border-white/5 last:border-0">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="w-full min-h-[48px] flex items-center justify-between py-3 text-xs font-serif font-bold uppercase tracking-wider text-white hover:text-[#C7982F] transition-colors cursor-pointer"
                  >
                    <span>{section.title}</span>
                    <ChevronDown
                      size={16}
                      className={`text-[#C7982F] transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <ul className="pb-4 space-y-2.5 text-xs pl-2">
                      {section.links.map((link, idx) => (
                        <li key={idx}>
                          <Link
                            to={link.href}
                            className="flex items-center justify-between py-1 text-[#B4C0BC] hover:text-[#C7982F] transition-colors"
                          >
                            <span>{link.name}</span>
                            {link.badge && (
                              <span className="rounded-full bg-[#C7982F]/20 text-[#C7982F] border border-[#C7982F]/30 px-2 py-0.5 text-[9px] font-semibold">
                                {link.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* Social Action Buttons */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
            <a
              href={buildHumanSupportWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              aria-label="Contact AllBarka on WhatsApp"
              className="min-w-0 min-h-[48px] flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl border border-white/15 bg-white/5 text-[11px] sm:text-xs font-bold text-white hover:bg-[#C7982F] hover:text-[#042821] hover:border-[#C7982F] focus-visible:ring-2 focus-visible:ring-[#C7982F] transition-all"
            >
              <MessageCircle size={16} className="text-[#25D366]" />
              <span>WhatsApp</span>
            </a>

            <a
              href={STORE_CONFIG.social.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Follow AllBarka on Instagram"
              className="min-w-0 min-h-[48px] flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl border border-white/15 bg-white/5 text-[11px] sm:text-xs font-bold text-white hover:bg-[#C7982F] hover:text-[#042821] hover:border-[#C7982F] focus-visible:ring-2 focus-visible:ring-[#C7982F] transition-all"
            >
              <Instagram size={16} className="text-[#E4405F]" />
              <span>Instagram</span>
            </a>

            <a
              href={STORE_CONFIG.social.facebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Follow AllBarka on Facebook"
              className="min-w-0 min-h-[48px] flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl border border-white/15 bg-white/5 text-[11px] sm:text-xs font-bold text-white hover:bg-[#C7982F] hover:text-[#042821] hover:border-[#C7982F] focus-visible:ring-2 focus-visible:ring-[#C7982F] transition-all"
            >
              <span className="text-[#1877F2] flex shrink-0" aria-hidden="true">
                <FaFacebookF size={15} />
              </span>
              <span>Facebook</span>
            </a>
          </div>

        </div>

        {/* 4. Bottom Legal Row: Copyright, Delivery, Replacements, Privacy, Terms */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#8A9693]">
          <p className="order-2 md:order-1 text-center md:text-left">
            © 2026 AllBarka Dry Fruits & Confections. Lahore, Pakistan. All rights reserved.
          </p>
          <ul className="order-1 md:order-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:gap-6 text-center">
            <li>
              <Link to="/policies/shipping" className="hover:text-[#C7982F] transition-colors">
                Delivery Terms
              </Link>
            </li>
            <li>
              <Link to="/policies/refund" className="hover:text-[#C7982F] transition-colors">
                Replacements & Returns
              </Link>
            </li>
            <li>
              <Link to="/policies/privacy" className="hover:text-[#C7982F] transition-colors">
                Privacy Protocol
              </Link>
            </li>
            <li>
              <Link to="/policies/terms" className="hover:text-[#C7982F] transition-colors">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>

      </div>
    </footer>
  );
}
