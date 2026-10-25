import type { ReactNode } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
export function ItemField({label,required=false,publish=false,children}:{label:string;required?:boolean;publish?:boolean;children:ReactNode}) {
  const {t}=useLanguage();
  return <label className="item-field"><span>{label} <small>({t(publish?'item.publishRequired':required?'item.required':'item.optional')})</small></span>{children}</label>;
}
