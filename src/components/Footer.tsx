import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, MessageCircle, Instagram, ShieldCheck, Truck, Sparkles, ArrowRight, Bell } from 'lucide-react';
import { FaFacebookF } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';
import { AllBarkaCrestVector } from './AllBarkaLogo';
import { STORE_CONFIG } from '../config/store';
import { CONTACT_CONFIG, buildHumanSupportWhatsAppUrl } from '../config/contacts';
import NewsletterCard from './NewsletterCard';
import { CANONICAL_CATEGORIES } from '../config/categories';

export default function Footer() {
  const { t } = useLanguage();
  const collections = [
    ['footer.allProducts', '/shop'],
    ...Object.keys(CANONICAL_CATEGORIES).map(id => [`shop.${id}`, id === 'gift-boxes' ? '/gifting' : `/shop/${id}`]),
  ];
  const journal = [
    ['footer.journal', '/journal'], ['footer.story', '/pages/our-story'], ['footer.sourcing', '/pages/our-story'],
    ['footer.guide', '/journal'], ['footer.storage', '/journal'], ['footer.giftIdeas', '/gifting'],
  ];
  const support = [
    ['footer.faq', '/faq'], ['footer.shipping', '/policies/shipping'], ['footer.contact', '/contact'],
    ['footer.returns', '/policies/refund'], ['footer.privacy', '/policies/privacy'], ['footer.terms', '/policies/terms'],
  ];
  const column = (title: string, links: string[][]) => <div className="footer-links-col" key={title}>
    <h3>{t(title)}</h3><ul>{links.map(([key, href]) => <li key={key}><Link to={href}>{t(key)}</Link></li>)}</ul>
  </div>;
  return <footer id="site-footer" className="site-footer">
    <div className="site-footer-promise"><div><ShieldCheck size={21}/><span><strong>{t('footer.pure')}</strong><small>{t('footer.pureCopy')}</small></span></div><div><Truck size={21}/><span><strong>{t('footer.dispatch')}</strong><small>{t('footer.dispatchCopy')}</small></span></div><div><Sparkles size={21}/><span><strong>{t('footer.seal')}</strong><small>{t('footer.sealCopy')}</small></span></div></div>
    <div className="site-footer-inner">
      <div className="site-footer-editorial">
        <div className="site-footer-editorial-copy">
          <span className="site-footer-eyebrow"><span aria-hidden="true" />{t('footer.eyebrow')}</span>
          <h2>{t('footer.statement')}</h2>
          <p>{t('footer.statementCopy')}</p>
          <Link to="/gifting" className="site-footer-editorial-link">{t('footer.gifts')} <ArrowRight size={17}/></Link>
        </div>
        <div className="site-footer-newsletter"><NewsletterCard /><button type="button" className="footer-updates-entry focus-ring" onClick={() => window.dispatchEvent(new CustomEvent('open-store-updates'))}><Bell size={17}/><span dir="auto">{t('updates.open')}</span></button></div>
      </div>
      <div className="site-footer-rule" aria-hidden="true"><span>✦</span></div>
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <Link to="/" className="site-footer-logo"><AllBarkaCrestVector /><span><strong>AllBarka</strong><small>LUXURY HARVESTS</small></span></Link>
          <p>{t('footerStory')}</p>
          <div className="site-footer-contact"><MapPin size={16}/><span dir="ltr">{CONTACT_CONFIG.boutiqueAddress}</span></div>
          <a className="site-footer-contact" href={buildHumanSupportWhatsAppUrl()} target="_blank" rel="noreferrer"><MessageCircle size={16}/><span dir="ltr">WhatsApp: {CONTACT_CONFIG.humanSupportWhatsApp.formatted}</span></a>
          <div className="site-footer-social"><a href={buildHumanSupportWhatsAppUrl()} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={17}/></a><a href={STORE_CONFIG.social.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={17}/></a><a href={STORE_CONFIG.social.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF size={16}/></a></div>
        </div>
        {column('footer.collections', collections)}
        {column('footer.journalTitle', journal)}
        <div>{column('footer.support', support)}<div className="site-footer-concierge"><strong>{t('footer.concierge')}</strong><p>{t('footer.conciergeCopy')}</p><Link to="/contact">{t('footer.connect')} <ArrowRight size={15}/></Link></div></div>
      </div>
      <div className="site-footer-bottom"><span>© {new Date().getFullYear()} AllBarka Dry Fruits & Confections. {t('allRightsReserved')}</span><div><Link to="/policies/privacy">{t('footer.privacy')}</Link><Link to="/policies/terms">{t('footer.terms')}</Link><Link to="/policies/shipping">{t('footer.shipping')}</Link></div></div>
    </div>
  </footer>;
}
