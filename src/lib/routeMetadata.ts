import { PRODUCTS, getProductImage } from '../data/products';
import { ARTICLE_INDEX } from '../data/articleIndex';
import { CANONICAL_CATEGORIES, resolveCategorySlug } from '../config/categories';
import { STORE_CONFIG } from '../config/store';
import type { Product } from '../types';
import type { CatalogSnapshot } from './catalogPricing';

export interface RouteMetadata {
  title: string; description: string; canonicalPath: string; image: string; type: 'website' | 'product' | 'article';
  noindex: boolean; status: 200 | 404; labelKey: string; structuredData?: Record<string, unknown>;
}
const HOME_TITLE = 'AllBarka — Premium Dry Fruits, Nuts & Gifts';
const HOME_DESCRIPTION = 'Explore AllBarka dry fruits, nuts, pantry essentials and gift boxes, with delivery in Lahore and nationwide.';
export const INFO_ROUTES: Record<string, string> = { 'our-story': 'Our Story', 'sourcing-policy': 'Sourcing Policy', 'orchard-provenance': 'Orchard Provenance', 'lahore-boutique': 'Lahore Boutique', 'blog-nutrition': 'Pantry Journal', 'hand-sorting': 'Hand Sorting', 'vacuum-sealing': 'Sealed Packing', 'freshness-guarantee': 'Freshness & Care', shipping: 'Shipping Information', contact: 'Contact AllBarka' };
export const POLICY_ROUTES: Record<string, string> = { shipping: 'Shipping Policy', refund: 'Returns & Refunds', privacy: 'Privacy Policy', terms: 'Terms & Conditions' };
export function publicSiteOrigin(value?: string | null): string {
  try { const url = new URL(value || 'https://allbarka.com'); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); return url.origin; } catch { return 'https://allbarka.com'; }
}
export function absolutePublicUrl(path: string, origin: string): string {
  try { const url = new URL(path, publicSiteOrigin(origin)); return ['http:', 'https:'].includes(url.protocol) ? url.href : publicSiteOrigin(origin) + '/images/generated/og-image.jpg'; } catch { return publicSiteOrigin(origin) + '/images/generated/og-image.jpg'; }
}
export function routeMetadata(input: string, options: { origin?: string; catalog?: CatalogSnapshot | null; language?: 'en' | 'ur' | 'ar' } = {}): RouteMetadata {
  const origin = publicSiteOrigin(options.origin); const language = options.language || 'en';
  let url: URL; try { url = new URL(input, origin); } catch { url = new URL('/not-found', origin); }
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const base: RouteMetadata = { title: HOME_TITLE, description: HOME_DESCRIPTION, canonicalPath: '/', image: '/images/generated/og-image.jpg', type: 'website', noindex: false, status: 200, labelKey: 'experience.route.home' };
  const page = (title: string, canonicalPath: string, description: string, key: string) => ({ ...base, title: title + ' — AllBarka', canonicalPath, description, labelKey: 'experience.route.' + key });
  const unknown = () => ({ ...page('Page not found', path, 'Explore the AllBarka collection or contact our team for help.', 'notFound'), noindex: true, status: 404 as const });
  if (path === '/' || path === '/index.html') return base;
  if (/^\/admin(?:\/|$)/.test(path)) return { ...page('Administration', path, 'Private AllBarka administration workspace.', 'admin'), noindex: true };
  if (['/cart', '/checkout', '/success'].includes(path)) return { ...page(path === '/cart' ? 'Your bag' : path === '/checkout' ? 'Checkout' : 'Order details', path, 'Private AllBarka order and checkout details.', path.slice(1)), noindex: true };
  if (path === '/wholesale') return page('Wholesale Dry Fruits & Bulk Reserve', path, 'Browse AllBarka bulk selections and contact the team about approved wholesale orders.', 'wholesale');
  if (path === '/gifting') return page('Gift Boxes & Bespoke Hampers', path, 'Explore AllBarka gift boxes and build a hamper with your selected portions.', 'gifting');
  if (path === '/shop' || /^\/(shop|category)\/[^/]+$/.test(path)) {
    const raw = path === '/shop' ? url.searchParams.get('category') || 'all' : path.split('/')[2];
    const category = resolveCategorySlug(raw); if (!category) return unknown();
    const title = category === 'all' ? 'The Complete Collection' : CANONICAL_CATEGORIES[category].name;
    const description = category === 'all' ? HOME_DESCRIPTION : CANONICAL_CATEGORIES[category].description;
    return { ...page(title, category === 'all' ? '/shop' : `/shop/${category}`, description, 'shop'), noindex: !!url.searchParams.get('search')?.trim() };
  }
  if (/^\/product\/[^/]+$/.test(path)) {
    const id = path.split('/')[2]; const registry = PRODUCTS.find(product => product.id === id); if (!registry) return unknown();
    const product = options.catalog?.catalog.find(product => product.id === id) || registry;
    const name = product[`name_${language}`] || product.name_en;
    const description = product[`desc_${language}`] || product.desc_en || HOME_DESCRIPTION;
    const metadata = { ...page(name, `/product/${id}`, description, 'product'), image: getProductImage(product), type: 'product' as const };
    const values = Object.values(product.prices).filter(price => Number.isFinite(price) && price > 0);
    const schema: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'Product', name, description, sku: id,
      image: absolutePublicUrl(metadata.image, origin), brand: { '@type': 'Brand', name: STORE_CONFIG.companyName } };
    // Never advertise an old default price while current pricing/inventory is unverified.
    if (options.catalog && !product.quoteOnly && values.length) schema.offers = { '@type': 'Offer', url: origin + metadata.canonicalPath,
      priceCurrency: 'PKR', price: Math.min(...values), availability: `https://schema.org/${product.active === false ? 'OutOfStock' : 'InStock'}`, itemCondition: 'https://schema.org/NewCondition' };
    return { ...metadata, structuredData: schema };
  }
  if (path === '/faq') return page('Frequently Asked Questions', path, 'Find answers about AllBarka portions, ordering, delivery, storage and gift boxes.', 'faq');
  if (path === '/journal') return page('The Pantry Journal', path, 'Read AllBarka buying guides, pantry notes and product-selection articles.', 'journal');
  if (/^\/journal\/[^/]+$/.test(path)) {
    const article = ARTICLE_INDEX.find(article => article.slug === path.split('/')[2]); if (!article) return unknown();
    const metadata = { ...page(article.title, path, article.excerpt, 'article'), type: 'article' as const, image: article.image };
    return { ...metadata, structuredData: { '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.excerpt,
      image: absolutePublicUrl(article.image, origin), mainEntityOfPage: origin + path, author: { '@type': 'Organization', name: article.authorName }, publisher: { '@id': origin + '/#organization' } } };
  }
  if (path === '/story' || path === '/pages' || path === '/contact' || /^\/pages\/[^/]+$/.test(path)) {
    const tab = path === '/contact' ? 'contact' : path === '/pages' || path === '/story' ? 'our-story' : path.split('/')[2];
    if (!Object.hasOwn(INFO_ROUTES, tab)) return unknown();
    return page(INFO_ROUTES[tab], `/pages/${tab}`, `Read ${INFO_ROUTES[tab].toLowerCase()} information from AllBarka in Lahore, Pakistan.`, tab === 'contact' ? 'contact' : 'information');
  }
  if (path === '/policies' || /^\/policies\/[^/]+$/.test(path)) {
    const tab = path === '/policies' ? 'shipping' : path.split('/')[2]; if (!Object.hasOwn(POLICY_ROUTES, tab)) return unknown();
    return page(POLICY_ROUTES[tab], `/policies/${tab}`, `Read AllBarka's ${POLICY_ROUTES[tab].toLowerCase()} before placing your order.`, 'policy');
  }
  return unknown();
}
export function organizationSchema(origin: string) {
  const base = publicSiteOrigin(origin);
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': base + '/#organization', name: STORE_CONFIG.companyName, url: base + '/', logo: base + '/favicon.svg',
      sameAs: [STORE_CONFIG.social.instagramUrl, STORE_CONFIG.social.facebookUrl], contactPoint: { '@type': 'ContactPoint', telephone: '+' + STORE_CONFIG.humanSupportWhatsApp, contactType: 'customer support', areaServed: 'PK' } },
    { '@type': 'WebSite', '@id': base + '/#website', name: STORE_CONFIG.companyName, url: base + '/', publisher: { '@id': base + '/#organization' } },
  ] };
}
export function sitemapPaths(): string[] {
  return ['/', '/shop', '/gifting', '/wholesale', '/faq', '/journal', ...Object.keys(CANONICAL_CATEGORIES).map(id => `/shop/${id}`),
    ...Object.keys(INFO_ROUTES).map(id => `/pages/${id}`), ...Object.keys(POLICY_ROUTES).map(id => `/policies/${id}`),
    ...PRODUCTS.map(product => `/product/${product.id}`), ...ARTICLE_INDEX.map(article => `/journal/${article.slug}`)];
}
