import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { useLanguage } from '../contexts/LanguageContext';
import { getLocalized } from '../utils/localize';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items: customItems, className = '' }: BreadcrumbsProps) {
  const location = useLocation();
  const { language, isRtl, t } = useLanguage();

  // Derive breadcrumbs unconditionally (Hooks must be called in the same order on every render)
  const items: BreadcrumbItem[] = React.useMemo(() => {
    if (customItems && customItems.length > 0) {
      return customItems;
    }

    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const categoryParam = searchParams.get('category');

    // On home page without custom breadcrumbs, return empty array
    if (path === '/') {
      return [];
    }

    const result: BreadcrumbItem[] = [
      { label: t('home', 'Home'), path: '/' }
    ];

    // Category dictionary for localization
    const getCategoryLabel = (cat: string) => {
      const lower = cat.toLowerCase();
      if (lower === 'nuts' || lower === 'dry-fruits') return t('dryFruits', 'Royal Dry Fruits');
      if (lower === 'dried-fruits') return language === 'ur' ? 'خشک میوہ جات' : language === 'ar' ? 'الفواكه المجففة' : 'Artisanal Dried Fruits';
      if (lower === 'seeds') return language === 'ur' ? 'بیج اور غذائیت' : language === 'ar' ? 'البذور النقية' : 'Superfood Seeds';
      if (lower === 'snacks') return language === 'ur' ? 'روایتی نمکو اور چنے' : language === 'ar' ? 'المقبلات التقليدية' : 'Traditional Snacks';
      if (lower === 'berries') return t('berries', 'Exotic Berries');
      if (lower === 'spices' || lower === 'saffron') return t('spices', 'Spices & Saffron');
      if (lower === 'combos' || lower === 'gifting') return t('combos', 'Gift Combos');
      if (lower === 'dates') return language === 'ur' ? 'کھجوریں' : language === 'ar' ? 'التمور' : 'Premium Dates';
      if (lower === 'wholesale') return language === 'ur' ? 'ہول سیل' : language === 'ar' ? 'الجملة' : 'Wholesale Tier';
      return cat.charAt(0).toUpperCase() + cat.slice(1);
    };

    // 1. Product Detail Page: /product/:id
    if (path.startsWith('/product/')) {
      const productId = path.replace('/product/', '').split('/')[0];
      const product = PRODUCTS.find((p) => p.id === productId);

      result.push({ label: t('shop', 'Shop'), path: '/shop' });

      if (product) {
        result.push({
          label: getCategoryLabel(product.category),
          path: `/shop?category=${product.category}`
        });
        result.push({
          label: getLocalized(product, 'name', language),
          isCurrent: true
        });
      } else {
        result.push({
          label: language === 'ur' ? 'مصنوعات کی تفصیل' : language === 'ar' ? 'تفاصيل المنتج' : 'Product Details',
          isCurrent: true
        });
      }
      return result;
    }

    // 2. Wholesale & Gifting Dedicated Aliases
    if (path === '/wholesale') {
      result.push({ label: t('shop', 'Shop'), path: '/shop' });
      result.push({
        label: language === 'ur' ? 'ہول سیل کلیکشن' : language === 'ar' ? 'طلب الجملة' : 'Wholesale Inquiries',
        isCurrent: true
      });
      return result;
    }

    if (path === '/gifting') {
      result.push({ label: t('shop', 'Shop'), path: '/shop' });
      result.push({
        label: language === 'ur' ? 'خصوصی تحائف' : language === 'ar' ? 'صناديق الهدايا' : 'Gifting & Hampers',
        isCurrent: true
      });
      return result;
    }

    // 3. Shop Page: /shop, /shop/:category, /category/:category
    if (path.startsWith('/shop') || path.startsWith('/category/')) {
      const subpathCategory = path.startsWith('/shop/')
        ? path.replace('/shop/', '')
        : path.startsWith('/category/')
        ? path.replace('/category/', '')
        : null;
      const activeCat = subpathCategory || categoryParam;

      if (activeCat && activeCat !== 'all') {
        result.push({ label: t('shop', 'Shop'), path: '/shop' });
        result.push({
          label: getCategoryLabel(activeCat),
          isCurrent: true
        });
      } else {
        result.push({
          label: t('shop', 'Shop'),
          isCurrent: true
        });
      }
      return result;
    }

    // 4. Cart Page: /cart
    if (path === '/cart') {
      result.push({ label: t('shop', 'Shop'), path: '/shop' });
      result.push({
        label: language === 'ur' ? 'خریداری کا تھیلا' : language === 'ar' ? 'سلة التسوق' : 'Shopping Bag',
        isCurrent: true
      });
      return result;
    }

    // 5. Checkout Page: /checkout
    if (path === '/checkout') {
      result.push({ label: t('shop', 'Shop'), path: '/shop' });
      result.push({
        label: t('checkout', 'Checkout'),
        isCurrent: true
      });
      return result;
    }

    // 6. Success Page: /success
    if (path === '/success') {
      result.push({ label: t('shop', 'Shop'), path: '/shop' });
      result.push({
        label: language === 'ur' ? 'آرڈر کی تصدیق' : language === 'ar' ? 'تأكيد الطلب' : 'Order Confirmation',
        isCurrent: true
      });
      return result;
    }

    // 7. Journal Page: /journal
    if (path === '/journal') {
      result.push({
        label: t('journal', 'Harvest Chronicle'),
        isCurrent: true
      });
      return result;
    }

    // 8. Info & Story Pages: /pages/:slug, /pages, /story, /contact
    if (path.startsWith('/pages') || path === '/story' || path === '/contact') {
      const slug = path.startsWith('/pages/')
        ? path.replace('/pages/', '')
        : path === '/story'
        ? 'our-story'
        : path === '/contact'
        ? 'contact'
        : 'our-story';

      result.push({ label: t('journal', 'Journal & Info'), path: '/pages' });

      const titles: Record<string, { en: string; ur: string; ar: string }> = {
        'our-story': { en: 'Our Heritage', ur: 'ہماری تاریخ', ar: 'تاريخنا' },
        'story': { en: 'Our Heritage', ur: 'ہماری تاریخ', ar: 'تاريخنا' },
        'contact': { en: 'Contact Concierge', ur: 'رابطہ', ar: 'اتصل بنا' },
        'sourcing-policy': { en: 'Orchard Sourcing', ur: 'باغات سے چناؤ', ar: 'مصادر البساتين' },
        'vacuum-sealing': { en: 'Freshness & Storage', ur: 'تازگی اور تحفظ', ar: 'حفظ النضارة' },
        'freshness-guarantee': { en: 'Freshness Guarantee', ur: 'تازگی کی ضمانت', ar: 'ضمان النضارة' },
        'shipping': { en: 'Shipping & Delivery', ur: 'ترسیل', ar: 'الشحن والتوصيل' }
      };

      const titleObj = titles[slug];
      const pageTitle = titleObj
        ? titleObj[language]
        : slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      result.push({
        label: pageTitle,
        isCurrent: true
      });
      return result;
    }

    // 9. Policies: /policies, /policies/:slug
    if (path.startsWith('/policies')) {
      const policySlug = path.startsWith('/policies/') ? path.replace('/policies/', '') : null;

      if (policySlug) {
        result.push({
          label: language === 'ur' ? 'پالیسیاں' : language === 'ar' ? 'السياسات' : 'Policies',
          path: '/policies'
        });

        const policyTitles: Record<string, { en: string; ur: string; ar: string }> = {
          'shipping': { en: 'Shipping Policy', ur: 'ترسیل کی پالیسی', ar: 'سياسة الشحن' },
          'returns': { en: 'Returns & Exchange', ur: 'واپسی اور تبادلہ', ar: 'الإرجاع والاستبدال' },
          'freshness': { en: 'Freshness Guarantee', ur: 'تازگی کی ضمانت', ar: 'ضمان النضارة' },
          'privacy': { en: 'Privacy Policy', ur: 'رازداری کی پالیسی', ar: 'سياسة الخصوصية' },
          'terms': { en: 'Terms of Service', ur: 'خدمات کی شرائط', ar: 'شروط الخدمة' }
        };

        const titleObj = policyTitles[policySlug];
        const pageTitle = titleObj
          ? titleObj[language]
          : policySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        result.push({
          label: pageTitle,
          isCurrent: true
        });
      } else {
        result.push({
          label: language === 'ur' ? 'پالیسیاں اور شرائط' : language === 'ar' ? 'السياسات والشروط' : 'Policies & Terms',
          isCurrent: true
        });
      }
      return result;
    }

    // 10. FAQ Page: /faq
    if (path === '/faq') {
      result.push({
        label: language === 'ur' ? 'اکثر پوچھے گئے سوالات' : language === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions',
        isCurrent: true
      });
      return result;
    }

    // Fallback for general routes
    const segment = path.replace('/', '').replace(/-/g, ' ');
    if (segment) {
      result.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
        isCurrent: true
      });
    }

    return result;
  }, [customItems, location.pathname, location.search, language, t]);

  // If on homepage or single item, do not render redundant breadcrumbs
  if (items.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumbs"
      className={`w-full py-2.5 sm:py-3 mb-2 sm:mb-4 select-none ${className}`}
    >
      <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-[#635B52] dark:text-[#A8A199]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.isCurrent;

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5 sm:gap-2">
              {index > 0 && (
                <ChevronRight
                  size={12}
                  className="text-[#C7982F]/70 dark:text-[#C7982F]/80 shrink-0 rtl:rotate-180"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  aria-current="page"
                  className="font-medium text-[#042821] dark:text-[#FFFCF7] max-w-[160px] sm:max-w-[260px] md:max-w-none truncate"
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path || '#'}
                  className="hover:text-[#042821] dark:hover:text-[#FFFCF7] hover:underline underline-offset-4 decoration-[#C7982F]/40 transition-colors focus-ring rounded px-1 -mx-1 py-0.5 inline-flex items-center gap-1"
                >
                  {index === 0 && (
                    <Home size={12} className="shrink-0 opacity-70" aria-hidden="true" />
                  )}
                  <span className="truncate max-w-[120px] sm:max-w-[180px]">
                    {item.label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
