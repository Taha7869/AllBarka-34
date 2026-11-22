import {contentJournal} from './contentPresentation';
import type {StorefrontContent} from './storefrontContent';
import { productSeo } from './productSeo';
import type { TaxonomyEntry } from './catalogConfiguration';
import type { Product } from '../types';
import { CANONICAL_CATEGORIES, OCCASION_TAGS, normalizeOccasionSlug, resolveCategorySlug } from '../config/categories';
import { getSectionCover } from '../config/sectionCovers';
import { getDesign, getFormat, getOccasion, isFormatPublished, isOccasionPublished, resolveFormatSlug, resolveOccasionSlug } from '../config/celebrations';
import { JOURNAL_ARTICLES } from '../data/articles';

export interface RouteMetadata {
  status: 200 | 404;
  title: string;
  description: string;
  path: string;
  type: 'website' | 'product' | 'article';
  image: string;
  noindex?: boolean;
  keywords?: string[];
  structuredData?: Record<string, unknown>;
}

const DEFAULT_IMAGE = '/images/generated/og-image.jpg';
const pages: Record<string, [string, string]> = {
  '/': ['AllBarka | Premium Dry Fruits, Nuts & Gifts', 'Shop dry fruits, nuts, pantry ingredients and gift hampers from AllBarka. Delivery in Lahore and across Pakistan.'],
  '/shop': ['Shop the Collection', 'Browse AllBarka dry fruits, nuts, oils, pantry essentials and gift collections with current prices and portion options.'],
  '/gifting': ['Gift Hampers & Boxes', 'Explore AllBarka gift boxes and curated hampers, with delivery options confirmed at checkout.'],
  '/wholesale': ['Wholesale Enquiries', 'Explore the AllBarka collection and enquire about approved wholesale purchasing.'],
  '/journal': ['The AllBarka Journal', 'Practical guides to choosing, storing, serving and gifting dry fruits and pantry ingredients.'],
  '/faq': ['Frequently Asked Questions', 'Find answers about AllBarka orders, delivery, portions and payment options.'],
  '/contact': ['Contact AllBarka', 'Contact AllBarka for product questions, order support and gifting enquiries.'],
  '/story': ['Our Story', 'Learn about AllBarka and our collection of dry fruits, pantry ingredients and gifts.'],
  '/pages': ['About AllBarka', 'Learn about AllBarka, our products and customer support.'],
  '/policies': ['Store Policies', 'Read AllBarka delivery, returns, privacy, cookie and store policies.'],
  '/track': ['Track Your Order', 'Check live fulfillment and delivery status for your AllBarka order.'],
  '/offline': ['Offline', 'View recently browsed AllBarka products while offline.'],
  '/cart': ['Your Cart', 'Review your AllBarka selections and current checkout quote.'],
  '/checkout': ['Checkout', 'Confirm your AllBarka order and delivery details.'],
  '/success': ['Order Confirmation', 'View your saved AllBarka order confirmation.'],
  '/staff/orders': ['Order room', 'AllBarka staff order reader.'],
  '/admin/orders': ['Merchant Workspace', 'AllBarka merchant workspace.'],
};

function text(value: string) { return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
function branded(title: string) { return title.includes('AllBarka') ? title : `${title} — AllBarka`; }
function basic(route: string, title: string, description: string): RouteMetadata {
  return { status: 200, path: route, title: branded(title), description, type: 'website', image: DEFAULT_IMAGE,
    ...((['/cart', '/checkout', '/success', '/offline'].includes(route) || route.startsWith('/admin') || route.startsWith('/staff') || route.startsWith('/reveal/')) ? { noindex: true } : {}) };
}

export function routeMetadata(pathname: string, origin: string, products: Product[], taxonomy: TaxonomyEntry[] = [], content?:StorefrontContent): RouteMetadata {
  let route: string;
  try { route = decodeURIComponent(pathname).replace(/\/+$/, '') || '/'; }
  catch { route = '/invalid-route'; }
  if (pages[route]) {
    const meta = basic(route, ...pages[route]);
    if (route === '/shop') meta.image = getSectionCover('all')?.src || meta.image;
    else if (route === '/gifting') meta.image = getSectionCover('gift-boxes')?.src || meta.image;
    return meta;
  }
  const productId = /^\/product\/([^/]+)$/.exec(route)?.[1];
  const product = productId ? products.find(item => item.id === productId) : undefined;
  if (product) {
    const seo=productSeo(product);
    const description = text(seo.description).slice(0, 600);
    const metadata = basic(route, seo.title, description);
    metadata.type = 'product';
    metadata.image = seo.image || DEFAULT_IMAGE;
    metadata.keywords=seo.keywords;
    const prices = Object.values(product.prices).filter(price => Number.isSafeInteger(price) && price > 0);
    const productUrl = new URL(route, origin).href;
    const productData = {
      '@type': 'Product', name: product.name_en,
      description, sku: product.id, url: new URL(route, origin).href,
      image: new URL(metadata.image, origin).href, brand: { '@type': 'Brand', name: 'AllBarka' },
      ...(prices.length && !product.quoteOnly ? { offers: {
        '@type': 'AggregateOffer', priceCurrency: 'PKR', lowPrice: Math.min(...prices), highPrice: Math.max(...prices),
        offerCount: prices.length, url: new URL(route, origin).href,
        ...(product.active === false ? { availability: 'https://schema.org/OutOfStock' } : {}),
      } } : {}),
    };
    const categoryId = resolveCategorySlug(product.category);
    const category = categoryId ? CANONICAL_CATEGORIES[categoryId] : undefined;
    // Breadcrumbs let search results show Home > Category > Product instead of a bare URL.
    const crumbs = [{ name: 'Home', item: new URL('/', origin).href }, { name: 'Shop', item: new URL('/shop', origin).href },
      ...(category ? [{ name: category.name, item: new URL(`/shop/${categoryId}`, origin).href }] : []), { name: product.name_en, item: productUrl }];
    metadata.structuredData = {
      '@context': 'https://schema.org',
      '@graph': [productData, { '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: crumb.item })) }],
    };
    return metadata;
  }
  const categorySlug = /^\/(?:shop|category)\/([^/]+)$/.exec(route)?.[1];
  const categoryId = resolveCategorySlug(categorySlug);
  if (categorySlug && categoryId && CANONICAL_CATEGORIES[categoryId]) {
    const category = CANONICAL_CATEGORIES[categoryId];
    const meta = basic(`/shop/${categoryId}`, category.name, text(category.description));
    const cover = getSectionCover(categoryId);
    if (cover) meta.image = cover.src;
    return meta;
  }
  const extra=taxonomy.find(x=>x.visible&&x.type!=='occasion'&&x.id===categorySlug);
  if(extra) return basic(`/shop/${extra.id}`,extra.name_en,text(extra.description_en));
  // Celebrations: hubs are indexable; an occasion, format or design only once it has an approved design.
  if (route === '/occasions') return basic(route, 'Celebrations & Gifting for Every Occasion', 'Browse AllBarka gifting and packaging by occasion, from weddings and new arrivals to Hajj, Umrah, Eid and corporate gifts.');
  if (route === '/packaging') return basic(route, 'Packaging & Presentation', 'Browse AllBarka packaging formats and event accessories, and the designs made for each.');
  const occasionSlug = /^\/occasions\/([^/]+)$/.exec(route)?.[1];
  if (occasionSlug) {
    const resolved = resolveOccasionSlug(occasionSlug);
    const occasion = resolved ? getOccasion(resolved.slug) : undefined;
    const legacy = normalizeOccasionSlug(occasionSlug);
    if (occasion && isOccasionPublished(occasion.slug)) return basic(`/occasions/${occasion.slug}`, `${occasion.signature.en} (${occasion.plain.en})`, `AllBarka designs and packaging for ${occasion.plain.en}.`);
    if (legacy && OCCASION_TAGS.some(item => item.id === legacy)) return basic(route, OCCASION_TAGS.find(item => item.id === legacy)!.name, 'Gift boxes and hampers from AllBarka, ready to order for this occasion.');
    if (occasion) return { ...basic(`/occasions/${occasion.slug}`, `${occasion.signature.en} (${occasion.plain.en})`, `Enquire about AllBarka designs and packaging for ${occasion.plain.en}.`), noindex: true };
  }
  const formatSlug = /^\/packaging\/([^/]+)$/.exec(route)?.[1];
  const format = formatSlug ? resolveFormatSlug(formatSlug) : null;
  if (format) {
    const entry = getFormat(format.slug)!;
    return { ...basic(`/packaging/${entry.slug}`, entry.plain.en, `AllBarka designs available in ${entry.plain.en.toLowerCase()}.`), ...(isFormatPublished(entry.slug) ? {} : { noindex: true }) };
  }
  const design = getDesign(/^\/designs\/([^/]+)$/.exec(route)?.[1] || '');
  if (design) return { ...basic(route, design.name, `${design.name}: an AllBarka packaging design concept.`), ...(design.publishApproved ? {} : { noindex: true }) };
  const articleSlug = /^\/journal\/([^/]+)$/.exec(route)?.[1];
  const article = (content?contentJournal(content,'en'):JOURNAL_ARTICLES).find(item => item.slug === articleSlug);
  if (article) return { ...basic(route, article.title, article.excerpt), type: 'article', image: article.image };
  const infoSlug = /^\/pages\/(our-story|sourcing-policy|orchard-provenance|lahore-boutique|blog-nutrition|hand-sorting|vacuum-sealing|freshness-guarantee|shipping|contact)$/.exec(route)?.[1];
  const policySlug = /^\/policies\/(shipping|refund|privacy|terms|cookies)$/.exec(route)?.[1];
  if (infoSlug || policySlug) {
    const label = policySlug === 'cookies'
      ? 'Cookie Policy'
      : (infoSlug || policySlug)!.replaceAll('-', ' ');
    const desc = policySlug === 'cookies'
      ? 'Inspect every storage key and cookie AllBarka uses, its purpose, retention, and manage your privacy preferences.'
      : policySlug
        ? 'Read the AllBarka store policy and contact us for help with your order.'
        : 'Learn about AllBarka products and customer support.';
    return basic(route, label, desc);
  }
  if (/^\/reveal\/[^/]+$/.test(route)) {
    return basic(route, 'Gift Reveal', 'Open your personal gift message from AllBarka.');
  }
  return { ...basic(route, 'Page Not Found', 'This page could not be found. Explore the AllBarka collection or contact us for help.'), status: 404, noindex: true };
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Metadata is present in the initial HTTP response, including social-link fetches. */
export function renderRouteDocument(template: string, metadata: RouteMetadata, origin: string, nonce: string) {
  let html = template.replace(/<title>[^]*?<\/title>/i, () => `<title>${escapeHtml(metadata.title)}</title>`);
  const canonical = new URL(metadata.path, origin).href;
  html = html.replace(/<link\s+rel="canonical"[^>]*>/i, () => `<link rel="canonical" href="${escapeHtml(canonical)}">`);
  const setMeta = (attribute: 'name' | 'property', key: string, value: string) => {
    const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}">`;
    const pattern = new RegExp(`<meta\\s+${attribute}="${key}"[^>]*>`, 'i');
    html = pattern.test(html) ? html.replace(pattern, () => tag) : html.replace('</head>', () => `${tag}\n</head>`);
  };
  setMeta('name', 'description', metadata.description);
  setMeta('name','keywords',(metadata.keywords||[]).join(', '));
  for (const [key, value] of Object.entries({ title: metadata.title, description: metadata.description,
    type: metadata.type, url: canonical, image: new URL(metadata.image, origin).href })) setMeta('property', `og:${key}`, value);
  for (const [key, value] of Object.entries({ card: 'summary_large_image', title: metadata.title,
    description: metadata.description, image: new URL(metadata.image, origin).href })) setMeta('name', `twitter:${key}`, value);
  if (metadata.noindex) setMeta('name', 'robots', 'noindex, nofollow');
  // Preload the primary LCP hero image in the initial HTML document for faster mobile LCP.
  if (metadata.path === '/') {
    html = html.replace('</head>', () => `<link rel="preload" as="image" href="/images/living-gallery-final/hero-mobile.webp" media="(max-width: 767px)" fetchpriority="high">\n<link rel="preload" as="image" href="/images/living-gallery-final/hero-desktop.webp" media="(min-width: 768px)" fetchpriority="high">\n</head>`);
  } else if (metadata.type === 'product' && metadata.image && metadata.image !== DEFAULT_IMAGE) {
    html = html.replace('</head>', () => `<link rel="preload" as="image" href="${escapeHtml(metadata.image)}" fetchpriority="high">\n</head>`);
  }
  if (metadata.structuredData) {
    const json = JSON.stringify(metadata.structuredData).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
    html = html.replace('</head>', () => `<script type="application/ld+json" id="route-structured-data">${json}</script>\n</head>`);
  }
  html = html.replace(/<script\b/g, () => `<script nonce="${escapeHtml(nonce)}"`);
  return html.replace('<div id="root"></div>', () => `<noscript><main><h1>${escapeHtml(metadata.title)}</h1><p>${escapeHtml(metadata.description)}</p><p><a href="/shop">Browse the collection</a>. Enable JavaScript to shop and check current delivery options.</p></main></noscript><div id="root"></div>`);
}
