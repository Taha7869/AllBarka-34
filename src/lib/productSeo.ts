import type { Product } from '../types';
import type { LanguageCode } from '../contexts/LanguageContext';
import { getLocalized } from '../utils/localize';
export function productSeo(product:Product, language:LanguageCode='en') {
  const localized=(field:'title'|'description'|'imageAlt')=>product.seo?.[`${field}_${language}`]?.trim()||product.seo?.[`${field}_en`]?.trim();
  return {title:localized('title')||getLocalized(product,'name',language),description:localized('description')||getLocalized(product,'desc',language),
    imageAlt:localized('imageAlt')||getLocalized(product,'name',language),image:product.seo?.socialImage||product.image||product.galleryImages?.[0],keywords:product.keywords||[]};
}
