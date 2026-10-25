import { ArrowUpRight, Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useStorefrontContent } from '../contexts/StorefrontContentContext';
import { contentText } from '../lib/storefrontContent';
import { buildHumanSupportWhatsAppUrl } from '../config/contacts';
export function FAQSection(){
  const {t,language,isRtl}=useLanguage();const {faqs}=useStorefrontContent();
  return <section id="faq" className="premium-faq" dir={isRtl?'rtl':'ltr'}><div className="premium-faq-intro"><p className="premium-eyebrow">{t('content.faqEyebrow')}</p><h2>{t('content.faqTitle')}</h2><p>{t('content.faqHint')}</p><a className="focus-ring" href={buildHumanSupportWhatsAppUrl()} target="_blank" rel="noreferrer">{t('content.contact')}<ArrowUpRight size={16}/></a></div><div className="premium-faq-list">{faqs.filter(faq=>faq.visible).map((faq,index)=><details key={faq.id} open={index===0}><summary><span>{contentText(faq.question,language)}</span><Plus size={18}/></summary><p>{contentText(faq.answer,language)}</p></details>)}{!faqs.some(x=>x.visible)&&<p>{t('content.faqEmpty')}</p>}</div></section>;
}
export default FAQSection;
