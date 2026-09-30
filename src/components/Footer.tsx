import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { MapPin, MessageCircle, Instagram, ChevronDown } from 'lucide-react';
import { FaFacebookF } from 'react-icons/fa';
import { AllBarkaCrestVector } from './AllBarkaLogo';
import { STORE_CONFIG } from '../config/store';
import { CONTACT_CONFIG, buildHumanSupportWhatsAppUrl } from '../config/contacts';

import TrustBadges from './TrustBadges';
import NewsletterCard from './NewsletterCard';

interface FooterColumn {
  title: string;
  links: Array<{ name: string; href: string }>;
}

export default function Footer() {
  const { t, isRtl } = useLanguage();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    setOpenSection(prev => (prev === title ? null : title));
  };

  const QUICK_LINKS: FooterColumn = {
    title: t('quickLinks', 'Quick Links'), // Default fallback if not translated
    links: [
      { name: t('shop', 'Shop'), href: '/shop' },
      { name: t('gifting', 'Luxury Gifting'), href: '/gifting' },
      { name: t('journal', 'Journal'), href: '/journal' },
      { name: t('aboutUs', 'Our Heritage'), href: '/pages/our-story' }
    ]
  };

  const CUSTOMER_SERVICE: FooterColumn = {
    title: t('customerService', 'Customer Service'),
    links: [
      { name: t('contact', 'Contact Us'), href: '/contact' },
      { name: 'FAQ', href: '/faq' },
      { name: t('shippingPolicy', 'Shipping Policy'), href: '/policies/shipping' },
      { name: t('refundPolicy', 'Returns & Refunds'), href: '/policies/refund' }
    ]
  };

  const renderMobileAccordion = (col: FooterColumn) => {
    const isOpen = openSection === col.title;
    return (
      <div key={col.title} className="border-b border-white/10 last:border-0 lg:hidden">
        <button
          type="button"
          onClick={() => toggleSection(col.title)}
          className="w-full min-h-[48px] flex items-center justify-between py-3 text-xs font-serif font-bold uppercase tracking-wider text-white hover:text-[var(--color-accent)] transition-colors cursor-pointer"
        >
          <span>{col.title}</span>
          <ChevronDown
            size={16}
            className={`text-[var(--color-accent)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isOpen && (
          <ul className="pb-4 space-y-2.5 text-xs px-2">
            {col.links.map((link, idx) => (
              <li key={idx}>
                <Link to={link.href} className="text-[#B4C0BC] hover:text-[var(--color-accent)] transition-colors inline-block py-1">
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col">
      <TrustBadges />
      
      <footer aria-label="AllBarka footer" className="w-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-t border-[var(--color-accent)]/30 relative overflow-hidden select-none">
        {/* Restrained ambient gold radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-[var(--color-accent)]/5 blur-3xl"
        />

        {/* The Newsletter Card overlays the footer border */}
        <div className="[&_h3]:text-[var(--color-gold)]">
          <NewsletterCard />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 relative z-10">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-start text-start">
            {/* Column 1: Brand & Story */}
            <div className="space-y-6 col-span-2 md:col-span-1">
              <Link to="/" className="inline-flex items-center gap-3 group transition-colors hover:text-[var(--color-gold)]">
                <div className="w-10 h-10 flex items-center justify-center">
                  <AllBarkaCrestVector />
                </div>
                <div>
                  <span className="text-2xl font-serif font-bold text-white tracking-wide block group-hover:text-[var(--color-gold)] transition-colors">
                    AllBarka
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-gold)] block font-semibold">
                    LUXURY HARVESTS
                  </span>
                </div>
              </Link>
              <p className="text-xs text-[var(--color-primary-fg)]/70 leading-relaxed font-sans max-w-sm">
                {t('footerStory', 'Ethically procured single-origin dry fruits, nuts, and delicacies hand-graded and dispatched fresh daily from Lahore.')}
              </p>
            </div>

            {/* Column 2 & 3: Desktop Links / Mobile Accordion */}
            <div className="col-span-2 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-10">
              {/* Desktop view */}
              <div className="hidden lg:block space-y-5">
                <h3 className="text-xs font-serif font-bold uppercase tracking-[0.2em] text-[var(--color-accent)] border-b border-[var(--color-accent)]/20 pb-2">
                  {QUICK_LINKS.title}
                </h3>
                <ul className="space-y-3 text-xs">
                  {QUICK_LINKS.links.map((link, idx) => (
                    <li key={idx}>
                      <Link to={link.href} className="text-[#B4C0BC] hover:text-[var(--color-gold)] transition-colors">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hidden lg:block space-y-5">
                <h3 className="text-xs font-serif font-bold uppercase tracking-[0.2em] text-[var(--color-accent)] border-b border-[var(--color-accent)]/20 pb-2">
                  {CUSTOMER_SERVICE.title}
                </h3>
                <ul className="space-y-3 text-xs">
                  {CUSTOMER_SERVICE.links.map((link, idx) => (
                    <li key={idx}>
                      <Link to={link.href} className="text-[#B4C0BC] hover:text-[var(--color-gold)] transition-colors">
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mobile view */}
              <div className="lg:hidden border-t border-white/10 mt-2">
                {renderMobileAccordion(QUICK_LINKS)}
                {renderMobileAccordion(CUSTOMER_SERVICE)}
              </div>
            </div>

            {/* Column 4: Contact Info & Socials */}
            <div className="space-y-5 col-span-2 md:col-span-1">
              <h3 className="text-xs font-serif font-bold uppercase tracking-[0.2em] text-[var(--color-accent)] border-b border-[var(--color-accent)]/20 pb-2 hidden lg:block">
                {t('connectWithUs', 'Connect With Us')}
              </h3>
              
              <div className="space-y-3 text-xs text-[var(--color-primary-fg)]/70">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                  <span className="leading-snug">Gulberg III & DHA Phase 5, Lahore, Pakistan</span>
                </div>
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-[#25D366] shrink-0" />
                  <a
                    href={buildHumanSupportWhatsAppUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[var(--color-gold)] transition-colors font-medium"
                    dir="ltr" // WhatsApp numbers should remain LTR
                  >
                    WhatsApp: {CONTACT_CONFIG.humanSupportWhatsApp.formatted}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <a
                  href={STORE_CONFIG.social.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[var(--color-primary-fg)]/80 hover:text-[var(--color-ink)] hover:bg-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all cursor-pointer shadow-sm"
                >
                  <Instagram size={16} />
                </a>
                <a
                  href={STORE_CONFIG.social.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[var(--color-primary-fg)]/80 hover:text-[var(--color-ink)] hover:bg-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all cursor-pointer shadow-sm"
                >
                  <FaFacebookF size={15} />
                </a>
              </div>
            </div>
          </div>

          {/* Trust Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-zinc-400 border-t border-zinc-800 pt-6 mt-10 text-center font-medium">
            <span>✓ Ethically Sourced</span>
            <span>✓ Encrypted Payments</span>
            <span>✓ Same-day in Lahore</span>
            <span>✓ Hassle-free Replacement</span>
          </div>

          {/* Copyright & Payment Badges Row */}
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[var(--color-primary-fg)]/50">
            
            <div className="order-2 md:order-1 text-center md:text-start space-y-1">
              <p>
                © {new Date().getFullYear()} AllBarka Dry Fruits & Confections. {t('allRightsReserved', 'All rights reserved.')}
              </p>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-2 font-sans font-medium text-[9px] uppercase tracking-wider text-[var(--color-primary-fg)]/40 child-hover:text-[var(--color-gold)] transition-colors">
                <Link to="/policies/privacy" className="hover:text-[var(--color-gold)] transition-colors">Privacy</Link>
                <Link to="/policies/terms" className="hover:text-[var(--color-gold)] transition-colors">Terms</Link>
              </div>
            </div>
            
            <div className="order-1 md:order-2 flex flex-wrap items-center justify-center gap-3 opacity-80">
              <span className="px-2.5 py-1 border border-white/10 rounded-md bg-white/5 text-[9px] font-bold tracking-widest uppercase">
                Visa
              </span>
              <span className="px-2.5 py-1 border border-white/10 rounded-md bg-white/5 text-[9px] font-bold tracking-widest uppercase">
                Mastercard
              </span>
              <span className="px-2.5 py-1 border border-white/10 rounded-md bg-white/5 text-[9px] font-bold tracking-widest uppercase text-[#C7982F]">
                Cash on Delivery
              </span>
              <span className="px-2.5 py-1 border border-white/10 rounded-md bg-white/5 text-[9px] font-bold tracking-widest uppercase">
                Bank Transfer
              </span>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}
