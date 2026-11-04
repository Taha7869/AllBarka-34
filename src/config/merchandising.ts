/**
 * Default Merchandising Settings & Canonical Taxonomies
 *
 * SPECIFICATION & GOVERNANCE:
 * - Requirements: REQ-S2-004, REQ-S2-006, REQ-S1-001
 * - Authority: AllBarka_Antigravity_Master_Prompt (1).md (Version 2.0)
 *
 * Safe for both client and server bundling (zero Node.js or Firebase dependencies).
 */

import type { MerchandisingSettings } from '../types';

export const DEFAULT_MERCHANDISING: MerchandisingSettings = {
  showcaseTabs: [
    {
      id: 'dry-fruits',
      label_en: 'Dry Fruits & Nuts',
      label_ur: 'خشک میوہ جات',
      visible: true,
      productIds: ['pista', 'kaju', 'badam'],
    },
    {
      id: 'pantry',
      label_en: 'Dates, Fruit & Seeds',
      label_ur: 'کھجور، پھل اور بیج',
      visible: true,
      productIds: ['khajoor', 'khubani', 'pumpkin_seeds'],
    },
    {
      id: 'gifts',
      label_en: 'Luxury Hampers & Gift Boxes',
      label_ur: 'لگژری گفٹ ہیمپرز',
      visible: true,
      productIds: ['bundle-silver-hamper', 'deal-1', 'deal-2'],
    },
    {
      id: 'celebration-boxes',
      label_en: 'Celebration Bid Boxes',
      label_ur: 'شادی و تقاریب بیڈ باکسز',
      visible: true,
      productIds: ['bid-box-card-nikkah', 'bid-box-luxury-tin', 'bid-box-umrah-tabarruk'],
    },
    {
      id: 'deals',
      label_en: 'Discovery & Combos',
      label_ur: 'آزمائشی پیک اور بنڈلز',
      visible: true,
      productIds: ['bundle-tasting-flight', 'bundle-daily-grind'],
    },
  ],
  featuredProductIds: ['pista', 'kaju', 'badam', 'khajoor', 'khubani', 'pumpkin_seeds', 'bundle-tasting-flight', 'bundle-daily-grind'],
  categoryOrder: ['dry-fruits', 'dates', 'seeds-snacks', 'oils', 'essentials', 'herbs-spices', 'combos', 'celebration-boxes', 'deals', 'personalized-treats'],
  categoryVisibility: {
    'dry-fruits': true,
    dates: true,
    'seeds-snacks': true,
    oils: true,
    essentials: true,
    'herbs-spices': true,
    combos: true,
    'celebration-boxes': true,
    deals: true,
    'personalized-treats': true,
  },
  autoplay: {
    enabled: true,
    intervalMs: 6000,
    resumeDelayMs: 3000,
  },
  autoplayDurationMs: 6000,
  autoplayResumeDelayMs: 3000,
  collections: [
    {
      collectionId: 'combos',
      title_en: 'Curated Combos',
      title_ur: 'منتخب بنڈلز',
      slug: '/shop/combos',
      visible: true,
    },
    {
      collectionId: 'celebration-boxes',
      title_en: 'Celebration & Bid Boxes',
      title_ur: 'تقاریب اور بیڈ باکسز',
      slug: '/shop/celebration-boxes',
      visible: true,
    },
    {
      collectionId: 'deals',
      title_en: 'Exclusive Value Deals',
      title_ur: 'خصوصی ڈیلز',
      slug: '/shop/deals',
      visible: true,
    },
    {
      collectionId: 'personalized-treats',
      title_en: 'Personalized Treats',
      title_ur: 'ذاتی تحائف',
      slug: '/wholesale',
      visible: true,
    },
  ],
  occasions: [
    {
      tag: 'wedding',
      title_en: 'Wedding & Nikkah',
      title_ur: 'شادی و نکاح',
      slug: '/shop/celebration-boxes?occasion=wedding',
      visible: true,
    },
    {
      tag: 'umrah',
      title_en: 'Umrah & Hajj Tabarruk',
      title_ur: 'عمرہ و حج تبرک',
      slug: '/shop/celebration-boxes?occasion=umrah',
      visible: true,
    },
    {
      tag: 'ramadan',
      title_en: 'Ramadan & Eid',
      title_ur: 'رمضان و عید',
      slug: '/shop?occasion=ramadan',
      visible: true,
    },
    {
      tag: 'birth',
      title_en: 'Birth & Aqeeqah',
      title_ur: 'ولادت و عقیقہ',
      slug: '/shop/celebration-boxes?occasion=birth',
      visible: true,
    },
    {
      tag: 'corporate',
      title_en: 'Corporate Gifting',
      title_ur: 'کارپوریٹ تحائف',
      slug: '/wholesale',
      visible: true,
    },
  ],
  revision: 1,
  updatedAt: new Date(0).toISOString(),
};
