import type { Product } from '../types';

export interface VarietyCriterion {
  key: string;
  label_en: string;
  label_ur: string;
  label_ar: string;
  render: (product: Product) => string | string[];
}

export function getComparableProducts(product: Product, allProducts: Product[]): Product[] {
  const targetCategory = product.category;
  const isDate = targetCategory === 'dates' || product.id.includes('dates') || product.id === 'khajoor';
  const isNut = targetCategory === 'dry-fruits' || targetCategory === 'nuts';

  const candidates = allProducts.filter(p => {
    if (p.active === false || p.quoteOnly) return false;
    if (p.id === product.id) return true;
    if (isDate) {
      return p.category === 'dates' || p.id.includes('dates');
    }
    if (isNut) {
      return p.category === 'dry-fruits' || p.category === 'nuts';
    }
    return p.category === targetCategory;
  });

  const self = candidates.filter(p => p.id === product.id);
  const others = candidates.filter(p => p.id !== product.id);
  return [...self, ...others].slice(0, 4);
}

export const VARIETY_CRITERIA: VarietyCriterion[] = [
  {
    key: 'variety',
    label_en: 'Variety / Cultivar',
    label_ur: 'قسم / ورائٹی',
    label_ar: 'الصنف / النوع',
    render: p => p.passport?.variety || p.name_en,
  },
  {
    key: 'origin',
    label_en: 'Origin & Terroir',
    label_ur: 'پیداوار کا علاقہ',
    label_ar: 'المنشأ والمنطقة',
    render: p => p.origin_en || 'Hand-selected Orchards',
  },
  {
    key: 'roast',
    label_en: 'Roast & Processing',
    label_ur: 'بھنائی اور تیاری',
    label_ar: 'التحميص والمعالجة',
    render: p => {
      const roast = p.passport?.roastLevel ? p.passport.roastLevel.replace('_', ' ') : 'Natural';
      const method = p.passport?.processingMethod ? ` (${p.passport.processingMethod})` : '';
      return `${roast}${method}`;
    },
  },
  {
    key: 'texture',
    label_en: 'Texture & Crunch',
    label_ur: 'بناوٹ اور کرنچ',
    label_ar: 'القوام والقرمشة',
    render: p => {
      const desc = (p.tasteProfile_en || p.desc_en || '').toLowerCase();
      if (/crunch|crisp|snapp/.test(desc)) return 'Crisp & Crunchy';
      if (/chew/.test(desc)) return 'Soft & Chewy';
      if (/butter|melt|silk/.test(desc)) return 'Rich & Buttery';
      return 'Tender Whole Kernel';
    },
  },
  {
    key: 'taste',
    label_en: 'Taste Profile',
    label_ur: 'ذائقہ کی خصوصیات',
    label_ar: 'مذاق ونكهة',
    render: p => p.tasteProfile_en || p.desc_en.slice(0, 80) + '...',
  },
  {
    key: 'shelfLife',
    label_en: 'Shelf Life',
    label_ur: 'استعمال کی مدت',
    label_ar: 'الصلاحية',
    render: p => p.passport?.bestBeforeDays ? `${p.passport.bestBeforeDays} Days` : '90 Days',
  },
  {
    key: 'certifications',
    label_en: 'Verified Claims',
    label_ur: 'تصدیق شدہ شارات',
    label_ar: 'الشهادات المؤكدة',
    render: p => {
      if (p.claimsVerification?.status === 'verified' && p.passport?.certifications?.length) {
        return p.passport.certifications.map(c => c.replace('_', ' ').toUpperCase());
      }
      return 'Standard Quality Checked';
    },
  },
  {
    key: 'price',
    label_en: 'Starting Price',
    label_ur: 'ابتدائی قیمت',
    label_ar: 'السعر الابتدائي',
    render: p => {
      const prices = Object.entries(p.prices || {}).sort((a, b) => a[1] - b[1]);
      if (prices.length > 0) {
        return `Rs. ${prices[0][1].toLocaleString()} (${prices[0][0]})`;
      }
      return 'Standard rates';
    },
  },
];
