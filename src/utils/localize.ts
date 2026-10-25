import { Product, CartItem } from '../types';
import { LanguageCode } from '../contexts/LanguageContext';

export function getLocalized(item: any, field: string, lang: LanguageCode): string {
    if (!item) return '';
    const val = item[`${field}_${lang}`];
    if (val) return val;
    return item[`${field}_en`] || item[field] || '';
}
