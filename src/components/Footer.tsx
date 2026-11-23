import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, MessageCircle, Instagram, Bell, ChevronDown } from 'lucide-react';
import { FaFacebookF } from 'react-icons/fa';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useConsent } from '../contexts/ConsentContext';
import { AllBarkaCrestVector } from './AllBarkaLogo';
import { STORE_CONFIG } from '../config/store';
import { CONTACT_CONFIG, buildHumanSupportWhatsAppUrl } from '../config/contacts';

type FooterGroupId = 'shop' | 'help' | 'house';

const COLUMN_TITLES: Record<LanguageCode, { shop: string; help: string; house: string; track: string; occasions: string; wholesale: string; tag: string }> = {
  en: {
    shop: 'Shop',
    help: 'Help',
    house: 'House',
    track: 'Track order',
    occasions: 'Occasions',
    wholesale: 'Corporate & wholesale',
    tag: 'Lahore gifting house',
  },
  ur: {
    shop: 'شاپ',
    help: 'مدد و رہنمائی',
    house: 'البرکہ ہاؤس',
    track: 'آرڈر ٹریک کریں',
    occasions: 'تقریبات',
    wholesale: 'ہول سیل و کارپوریٹ',
    tag: 'لاہور گفٹنگ ہاؤس',
  },
  ar: {
    shop: 'المتجر',
    help: 'المساعدة',
    house: 'الدار',
    track: 'تتبع الطلب',
    occasions: 'المناسبات',
    wholesale: 'الجملة والشركات',
    tag: 'دار الهدايا في لاهور',
  },
};

export default function Footer() {
  const { t, language, isRtl } = useLanguage();
  const { openPreferences } = useConsent();
  const labels = COLUMN_TITLES[language] || COLUMN_TITLES.en;
  const [openGroup, setOpenGroup] = useState<FooterGroupId | null>(null);

  const toggleGroup = (id: FooterGroupId) => {
    setOpenGroup((prev) => (prev === id ? null : id));
  };

  const shopLinks: Array<[string, string]> = [
    [t('footer.allProducts', 'All Products'), '/shop'],
    [t('shop.dry-fruits', 'Dry Fruits & Nuts'), '/shop/dry-fruits'],
    [t('shop.dates', 'Dates'), '/shop/dates'],
    [t('nav.gifting', 'Gifts & Hampers'), '/gifting'],
    [t('shop.celebration-boxes', 'Celebration Boxes'), '/shop/celebration-boxes'],
    [t('shop.herbs-spices', 'Saffron & Spices'), '/shop/herbs-spices'],
    [t('shop.oils', 'Cold-Pressed Oils'), '/shop/oils'],
  ];

  const helpLinks: Array<[string, string]> = [
    [t('footer.faq', 'Frequently Asked Questions'), '/faq'],
    [labels.track, '/track'],
    [t('footer.shipping', 'Shipping Policy'), '/policies/shipping'],
    [t('footer.returns', 'Returns & Refunds'), '/policies/refund'],
    [t('footer.contact', 'Contact Us'), '/contact'],
  ];

  const houseLinks: Array<[string, string]> = [
    [t('footer.story', 'Our Story'), '/story'],
    [t('footer.journal', 'The Harvest Chronicle'), '/journal'],
    [labels.occasions, '/occasions'],
    [labels.wholesale, '/wholesale'],
  ];

  const groups: Array<{
    id: FooterGroupId;
    title: string;
    links: Array<[string, string]>;
    includeStoreUpdates?: boolean;
  }> = [
    { id: 'shop', title: labels.shop, links: shopLinks },
    { id: 'help', title: labels.help, links: helpLinks },
    { id: 'house', title: labels.house, links: houseLinks, includeStoreUpdates: true },
  ];

  return (
    <footer
      id="site-footer"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="site-footer bg-[#042821] text-[#FDFBF7] border-t border-[#C7982F]/35"
    >
      <div className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid grid-cols-1 gap-7 sm:gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand Crest, Area-Level Location & WhatsApp */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-5">
            <Link
              to="/"
              className="focus-ring inline-flex min-h-[44px] items-center gap-3 rounded-xl"
            >
              <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0">
                <AllBarkaCrestVector />
              </div>
              <div>
                <strong className="block font-serif text-xl sm:text-2xl font-semibold leading-none tracking-tight text-[#FDFBF7]">
                  AllBarka
                </strong>
                <small className="mt-1 block text-[11px] font-medium text-[#E4C783]">
                  {labels.tag}
                </small>
              </div>
            </Link>

            <p dir="auto" className="max-w-xs text-xs leading-relaxed text-[#F2ECE2]/75">
              {t('footerStory')}
            </p>

            <div className="flex flex-col gap-1 sm:gap-2 text-xs text-[#F2ECE2]/85">
              <div className="flex items-start gap-2.5 py-1">
                <MapPin size={15} className="mt-0.5 shrink-0 text-[#C7982F]" aria-hidden="true" />
                <span dir="ltr">{CONTACT_CONFIG.boutiqueAddress}</span>
              </div>
              <a
                href={buildHumanSupportWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex min-h-[44px] items-center gap-2.5 text-[#F2ECE2]/90 transition-colors hover:text-[#E4C783]"
              >
                <MessageCircle size={15} className="shrink-0 text-[#C7982F]" aria-hidden="true" />
                <span dir="ltr">WhatsApp: {CONTACT_CONFIG.humanSupportWhatsApp.formatted}</span>
              </a>
            </div>

            <div className="flex items-center gap-2.5 pt-0.5">
              <a
                href={buildHumanSupportWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="focus-ring grid h-11 w-11 place-items-center rounded-full border border-[#C7982F]/35 bg-[#08352B] text-[#FDFBF7] transition-colors hover:bg-[#C7982F] hover:text-[#042821]"
              >
                <MessageCircle size={16} />
              </a>
              <a
                href={STORE_CONFIG.social.instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="focus-ring grid h-11 w-11 place-items-center rounded-full border border-[#C7982F]/35 bg-[#08352B] text-[#FDFBF7] transition-colors hover:bg-[#C7982F] hover:text-[#042821]"
              >
                <Instagram size={16} />
              </a>
              <a
                href={STORE_CONFIG.social.facebookUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="focus-ring grid h-11 w-11 place-items-center rounded-full border border-[#C7982F]/35 bg-[#08352B] text-[#FDFBF7] transition-colors hover:bg-[#C7982F] hover:text-[#042821]"
              >
                <FaFacebookF size={15} />
              </a>
            </div>
          </div>

          {/* 3 Calm Navigation Columns: Mobile Accordion (<640px), Desktop 3-Column Grid (Zero Duplicate Links) */}
          <div
            data-footer-accordion="true"
            className="lg:col-span-8 divide-y divide-[#C7982F]/20 border-y border-[#C7982F]/20 sm:divide-y-0 sm:border-y-0 sm:grid sm:grid-cols-3 sm:gap-8"
          >
            {groups.map((group) => {
              const isOpen = openGroup === group.id;
              const panelId = `footer-accordion-panel-${group.id}`;
              return (
                <nav key={group.id} aria-label={group.title} className="footer-accordion-group">
                  {/* Mobile Accordion Trigger (min 44px touch target) */}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    data-footer-group-toggle={group.id}
                    onClick={() => toggleGroup(group.id)}
                    className="focus-ring flex sm:hidden w-full min-h-[44px] items-center justify-between py-2.5 text-start font-serif text-sm font-semibold text-[#E4C783] cursor-pointer"
                  >
                    <span dir="auto">{group.title}</span>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className={`shrink-0 text-[#C7982F] transition-transform duration-200 motion-reduce:transition-none ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Desktop Static Column Title */}
                  <h3 className="hidden sm:block mb-4 border-b border-[#C7982F]/25 pb-3 font-serif text-sm font-semibold text-[#E4C783]">
                    {group.title}
                  </h3>

                  <ul
                    id={panelId}
                    data-footer-panel={group.id}
                    className={`${isOpen ? 'block pb-2' : 'hidden'} sm:block sm:pb-0 space-y-0.5`}
                  >
                    {group.links.map(([label, href]) => (
                      <li key={href}>
                        <Link
                          to={href}
                          className="focus-ring inline-flex min-h-[44px] w-full sm:w-auto items-center text-xs text-[#F2ECE2]/85 transition-colors hover:text-[#E4C783]"
                        >
                          <span dir="auto">{label}</span>
                        </Link>
                      </li>
                    ))}
                    {group.includeStoreUpdates && (
                      <li>
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent('open-store-updates'))}
                          className="focus-ring inline-flex min-h-[44px] w-full sm:w-auto items-center gap-2 text-xs text-[#E4C783] transition-colors hover:text-[#FDFBF7] cursor-pointer"
                        >
                          <Bell size={14} aria-hidden="true" />
                          <span dir="auto">{t('updates.open', 'Store updates')}</span>
                        </button>
                      </li>
                    )}
                  </ul>
                </nav>
              );
            })}
          </div>
        </div>

        {/* Bottom Legal & Consent Bar (Unique legal links only, zero duplication, 44px touch targets) */}
        <div className="mt-7 sm:mt-12 flex flex-col items-start justify-between gap-2 sm:gap-4 border-t border-[#C7982F]/20 pt-5 sm:pt-6 text-[11px] text-[#F2ECE2]/70 sm:flex-row sm:items-center">
          <span>
            © {new Date().getFullYear()} AllBarka Dry Fruits &amp; Confections. {t('allRightsReserved')}
          </span>
          <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-0.5">
            <Link to="/policies/privacy" className="focus-ring inline-flex min-h-[44px] items-center hover:text-[#E4C783]">
              {t('footer.privacy', 'Privacy policy')}
            </Link>
            <Link to="/policies/cookies" className="focus-ring inline-flex min-h-[44px] items-center hover:text-[#E4C783]">
              {t('footer.cookies', 'Cookie policy')}
            </Link>
            <button
              type="button"
              data-footer-cookie-settings
              onClick={openPreferences}
              className="focus-ring inline-flex min-h-[44px] items-center cursor-pointer bg-transparent border-0 p-0 text-inherit font-inherit underline-offset-4 hover:text-[#E4C783] hover:underline"
            >
              {t('footer.cookieSettings', 'Cookie settings')}
            </button>
            <Link to="/policies/terms" className="focus-ring inline-flex min-h-[44px] items-center hover:text-[#E4C783]">
              {t('footer.terms', 'Terms of service')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
