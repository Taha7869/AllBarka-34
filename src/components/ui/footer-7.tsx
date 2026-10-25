import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  ArrowRight, 
  MapPin, 
  Phone, 
  Mail,
  CheckCircle2
} from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin, FaTwitter } from "react-icons/fa";

export interface FooterSection {
  title: string;
  links: Array<{ name: string; href: string; badge?: string }>;
}

export interface Footer7Props {
  logo?: {
    url: string;
    src?: string;
    alt: string;
    title: string;
    subtitle?: string;
  };
  sections?: FooterSection[];
  description?: string;
  socialLinks?: Array<{
    icon: React.ReactElement;
    href: string;
    label: string;
  }>;
  copyright?: string;
  legalLinks?: Array<{
    name: string;
    href: string;
  }>;
  showTrustBadges?: boolean;
}

const defaultSections: FooterSection[] = [
  {
    title: "Curated Harvests",
    links: [
      { name: "Roasted Pistachios (Kerman)", href: "/shop/pistachios" },
      { name: "Wild Skardu Walnuts", href: "/shop/walnuts" },
      { name: "California Jumbo Almonds", href: "/shop/almonds" },
      { name: "Pure Hunza Apricots", href: "/shop/apricots", badge: "Seasonal" },
      { name: "Royal Pine Nuts (Chilgoza)", href: "/shop/pine-nuts" },
    ],
  },
  {
    title: "Gifting & Hampers",
    links: [
      { name: "Velvet Gift Chests", href: "/shop/combos" },
      { name: "Corporate Festive Boxes", href: "/gifting" },
      { name: "Wedding & Eid Favors", href: "/shop/combos" },
      { name: "Custom Mix Builder", href: "/shop" },
      { name: "Wholesale Enquiries", href: "/wholesale" },
    ],
  },
  {
    title: "Client Care",
    links: [
      { name: "Lahore Delivery Schedule", href: "/policies/shipping" },
      { name: "Pantry Storage Guide", href: "/pages/pantry-storage" },
      { name: "WhatsApp VIP Concierge", href: "https://wa.me/923160666083" },
      { name: "Quality & Refund Guarantee", href: "/policies/refund" },
      { name: "Track Consignment", href: "/policies/shipping" },
    ],
  },
];

const defaultSocialLinks = [
  { icon: <FaInstagram size={16} />, href: "https://instagram.com/allbarka.pk", label: "Instagram" },
  { icon: <FaFacebook size={16} />, href: "https://facebook.com/allbarka.pk", label: "Facebook" },
  { icon: <FaTwitter size={16} />, href: "https://twitter.com/allbarka_pk", label: "Twitter" },
  { icon: <FaLinkedin size={16} />, href: "https://linkedin.com/company/allbarka", label: "LinkedIn" },
];

const defaultLegalLinks = [
  { name: "Quality Assurance Terms", href: "/policies/refund" },
  { name: "Privacy Protocol", href: "/policies/privacy" },
  { name: "Delivery Policy", href: "/policies/shipping" },
];

function SmartLink({ href, children, className, ariaLabel }: { href: string; children: React.ReactNode; className?: string; ariaLabel?: string }) {
  const isInternal = href.startsWith('/') && !href.startsWith('//');
  if (isInternal) {
    return (
      <Link to={href} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <a 
      href={href} 
      className={className} 
      target={href.startsWith('http') ? '_blank' : undefined} 
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

export const Footer7 = ({
  logo = {
    url: "/",
    src: undefined,
    alt: "AllBarka Seal",
    title: "AllBarka",
    subtitle: "Purveyors of Exceptional Harvests",
  },
  sections = defaultSections,
  description = "Ethically procured single-origin dry fruits, nuts, and organic delicacies. Hand-graded for purity, vacuum-packed to lock in raw natural oils, and dispatched fresh daily across Lahore and nationwide.",
  socialLinks = defaultSocialLinks,
  copyright = "© 2026 AllBarka Dry Fruits & Confections. Lahore, Pakistan. All rights reserved.",
  legalLinks = defaultLegalLinks,
  showTrustBadges = true,
}: Footer7Props) => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="w-full bg-[#042821] text-[#EDE8DE] border-t border-[#D4AF37]/25 relative overflow-hidden select-none">
      {/* Subtle Background Ambience */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-[#D4AF37]/5 blur-3xl"
      />

      {/* Trust Badges Bar */}
      {showTrustBadges && (
        <div className="border-b border-white/10 bg-[#021A15]/60 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-[#D4AF37]/30 text-[#E4C783]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white font-serif">100% Unbleached & Pure</h4>
                  <p className="text-xs text-[#A8B2AF]">Generational farms, zero artificial glazing.</p>
                </div>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-[#D4AF37]/30 text-[#E4C783]">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white font-serif">Lahore Express Dispatch</h4>
                  <p className="text-xs text-[#A8B2AF]">Same-day delivery across Gulberg, DHA & Cantt.</p>
                </div>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-[#D4AF37]/30 text-[#E4C783]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white font-serif">Airtight Freshness Seal</h4>
                  <p className="text-xs text-[#A8B2AF]">Preserving delicate natural oils and crispness.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          
          {/* Brand & Newsletter Column (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <SmartLink href={logo.url} className="inline-flex items-center gap-3.5 group">
              {logo.src ? (
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className="h-11 w-11 rounded-full object-cover border border-[#D4AF37]/40 ring-2 ring-white/10"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8C6B1C] flex items-center justify-center text-[#042821] font-bold font-serif text-lg ring-2 ring-white/10 shadow-sm">
                  AB
                </div>
              )}
              <div>
                <span className="text-2xl font-serif font-bold text-white tracking-wide block group-hover:text-[#E4C783] transition-colors">
                  {logo.title}
                </span>
                {logo.subtitle && (
                  <span className="text-[11px] uppercase tracking-widest text-[#D4AF37] block font-medium">
                    {logo.subtitle}
                  </span>
                )}
              </div>
            </SmartLink>

            <p className="text-sm text-[#B4C0BC] leading-relaxed max-w-md">
              {description}
            </p>

            {/* Newsletter Subscription */}
            <div className="pt-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-[#E4C783] mb-2 font-serif">
                Private Reserve Announcements
              </span>
              {subscribed ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-white/5 border border-emerald-500/30 p-3 rounded-xl max-w-md">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Thank you. You have been added to our private tasting list.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex max-w-md gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-2.5 text-xs text-white placeholder:text-neutral-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition-colors"
                  />
                  <button
                    type="submit"
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38926] px-4 py-2.5 text-xs font-semibold text-[#042821] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                  >
                    <span>Join</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>

            {/* Quick Contacts */}
            <div className="pt-2 flex flex-col gap-2 text-xs text-[#A8B2AF]">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                <span>Gulberg III / DHA Phase 5, Lahore, Pakistan</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                <a href="https://wa.me/923160666083" target="_blank" rel="noreferrer" className="hover:text-[#E4C783] transition-colors">
                  WhatsApp: +92 316 0666083
                </a>
              </div>
            </div>

            {/* Social Icons */}
            <div className="pt-2 flex items-center space-x-3">
              {socialLinks.map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#C4D0CC] hover:text-[#042821] hover:bg-[#D4AF37] hover:border-[#D4AF37] transition-all"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Sections (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8 pt-2 text-left">
            {sections.map((section, sectionIdx) => (
              <div key={sectionIdx} className="space-y-4">
                <h3 className="text-sm font-serif font-bold uppercase tracking-wider text-white border-b border-[#D4AF37]/20 pb-2.5">
                  {section.title}
                </h3>
                <ul className="space-y-2.5 text-xs">
                  {section.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      <SmartLink
                        href={link.href}
                        className="group flex items-center justify-between text-[#B4C0BC] hover:text-[#E4C783] transition-colors py-0.5"
                      >
                        <span>{link.name}</span>
                        {link.badge && (
                          <span className="rounded-full bg-[#D4AF37]/20 text-[#E4C783] border border-[#D4AF37]/30 px-2 py-0.5 text-[9px] font-semibold">
                            {link.badge}
                          </span>
                        )}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#8A9693]">
          <p className="order-2 md:order-1 text-center md:text-left">
            {copyright}
          </p>
          <ul className="order-1 md:order-2 flex flex-wrap items-center justify-center gap-6">
            {legalLinks.map((link, idx) => (
              <li key={idx}>
                <SmartLink
                  href={link.href}
                  className="hover:text-[#E4C783] transition-colors underline-offset-4 hover:underline"
                >
                  {link.name}
                </SmartLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer7;
