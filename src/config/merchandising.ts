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
      productIds: ['chilgoza', 'pista', 'badam'],
    },
    {
      id: 'pantry',
      label_en: 'Dates & Pantry Essentials',
      label_ur: 'کھجوریں اور ضروریات',
      visible: true,
      productIds: ['khajoor', 'kalonji-oil', 'almond-oil'],
    },
    {
      id: 'gifts',
      label_en: 'Luxury Hampers & Gift Boxes',
      label_ur: 'لگژری گفٹ ہیمپرز',
      visible: true,
      productIds: ['deal-1', 'deal-2', 'custom-hamper'],
    },
    {
      id: 'celebration-boxes',
      label_en: 'Celebration Bid Boxes',
      label_ur: 'شادی و تقاریب بیڈ باکسز',
      visible: true,
      productIds: ['bid-box-umrah-tabarruk', 'bid-box-luxury-tin', 'bid-box-card-nikkah'],
    },
    {
      id: 'deals',
      label_en: 'Value Bundles & Deals',
      label_ur: 'ڈیلز اور بنڈلز',
      visible: true,
      productIds: ['deal-1', 'deal-2', 'deal-3'],
    },
  ],
  featuredProductIds: ['badam', 'pista', 'chilgoza', 'khajoor', 'deal-1', 'deal-2'],
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
      slug: '/shop?category=combos',
      visible: true,
    },
    {
      collectionId: 'celebration-boxes',
      title_en: 'Celebration & Bid Boxes',
      title_ur: 'تقاریب اور بیڈ باکسز',
      slug: '/celebration-boxes',
      visible: true,
    },
    {
      collectionId: 'deals',
      title_en: 'Exclusive Value Deals',
      title_ur: 'خصوصی ڈیلز',
      slug: '/deals',
      visible: true,
    },
    {
      collectionId: 'personalized-treats',
      title_en: 'Personalized Treats',
      title_ur: 'ذاتی تحائف',
      slug: '/shop?category=personalized-treats',
      visible: true,
    },
  ],
  occasions: [
    {
      tag: 'wedding',
      title_en: 'Wedding & Nikkah',
      title_ur: 'شادی و نکاح',
      slug: '/occasions/wedding',
      visible: true,
    },
    {
      tag: 'umrah',
      title_en: 'Umrah & Hajj Tabarruk',
      title_ur: 'عمرہ و حج تبرک',
      slug: '/occasions/umrah',
      visible: true,
    },
    {
      tag: 'ramadan',
      title_en: 'Ramadan Kareem',
      title_ur: 'رمضان کریم',
      slug: '/occasions/ramadan',
      visible: true,
    },
    {
      tag: 'eid',
      title_en: 'Eid Celebrations',
      title_ur: 'عید الفطر و الضحیٰ',
      slug: '/occasions/eid',
      visible: true,
    },
    {
      tag: 'corporate',
      title_en: 'Corporate Gifting',
      title_ur: 'کارپوریٹ تحائف',
      slug: '/occasions/corporate',
      visible: true,
    },
    {
      tag: 'baby-announcement',
      title_en: 'Birth & Baby Announcement',
      title_ur: 'ولادت و عقیقہ',
      slug: '/occasions/baby-announcement',
      visible: true,
    },
  ],
  revision: 1,
  updatedAt: new Date(0).toISOString(),
};
