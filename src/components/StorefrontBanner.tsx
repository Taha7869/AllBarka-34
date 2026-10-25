import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useStorefrontContent } from '../contexts/StorefrontContentContext';
import { useLanguage } from '../contexts/LanguageContext';
import { contentText } from '../lib/storefrontContent';
export default function StorefrontBanner(){const {banner}=useStorefrontContent();const {language,isRtl}=useLanguage();return banner.enabled?<aside className="storefront-announcement" dir={isRtl?'rtl':'ltr'}><p>{contentText(banner.text,language)}</p>{banner.path&&<Link className="focus-ring" to={banner.path}>{contentText(banner.linkLabel,language)}<ArrowUpRight size={14}/></Link>}</aside>:null;}
