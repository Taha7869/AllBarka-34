import type { Product } from '../types';
import { CANONICAL_CATEGORIES, resolveCategorySlug } from '../config/categories';
import { JOURNAL_ARTICLES } from '../data/articles';

export interface RouteMetadata {
  status: 200 | 404;
  title: string;
  description: string;
  path: string;
  type: 'website' | 'product' | 'article';
  image: string;
  noindex?: boolean;
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
  '/policies': ['Store Policies', 'Read AllBarka delivery, returns, privacy and store policies.'],
  '/cart': ['Your Cart', 'Review your AllBarka selections and current checkout quote.'],
  '/checkout': ['Checkout', 'Confirm your AllBarka order and delivery details.'],
  '/success': ['Order Confirmation', 'View your saved AllBarka order confirmation.'],
  '/admin/orders': ['Merchant Workspace', 'AllBarka merchant workspace.'],
};

function text(value: string) { return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
function branded(title: string) { return title.includes('AllBarka') ? title : `${title} — AllBarka`; }
function basic(route: string, title: string, description: string): RouteMetadata {
  return { status: 200, path: route, title: branded(title), description, type: 'website', image: DEFAULT_IMAGE,
    ...(['/cart', '/checkout', '/success', '/admin/orders'].includes(route) ? { noindex: true } : {}) };
}

export function routeMetadata(pathname: string, origin: string, products: Product[]): RouteMetadata {
  let route: string;
  try { route = decodeURIComponent(pathname).replace(/\/+$/, '') || '/'; }
  catch { route = '/invalid-route'; }
  if (pages[route]) return basic(route, ...pages[route]);
  const productId = /^\/product\/([^/]+)$/.exec(route)?.[1];
  const product = productId ? products.find(item => item.id === productId) : undefined;
  if (product) {
    const description = text(product.desc_en || product.description || product.name_en).slice(0, 260);
    const metadata = basic(route, product.name_en, description);
    metadata.type = 'product';
    metadata.image = product.image || DEFAULT_IMAGE;
    const prices = Object.values(product.prices).filter(price => Number.isSafeInteger(price) && price > 0);
    metadata.structuredData = {
      '@context': 'https://schema.org', '@type': 'Product', name: product.name_en,
      description, sku: product.id, url: new URL(route, origin).href,
      image: new URL(metadata.image, origin).href, brand: { '@type': 'Brand', name: 'AllBarka' },
      ...(prices.length && !product.quoteOnly ? { offers: {
        '@type': 'AggregateOffer', priceCurrency: 'PKR', lowPrice: Math.min(...prices), highPrice: Math.max(...prices),
        offerCount: prices.length, url: new URL(route, origin).href,
        ...(product.active === false ? { availability: 'https://schema.org/OutOfStock' } : {}),
      } } : {}),
    };
    return metadata;
  }
  const categorySlug = /^\/(?:shop|category)\/([^/]+)$/.exec(route)?.[1];
  const categoryId = resolveCategorySlug(categorySlug);
  if (categorySlug && categoryId && CANONICAL_CATEGORIES[categoryId]) {
    const category = CANONICAL_CATEGORIES[categoryId];
    return basic(`/shop/${categoryId}`, category.name, text(category.description));
  }
  const articleSlug = /^\/journal\/([^/]+)$/.exec(route)?.[1];
  const article = JOURNAL_ARTICLES.find(item => item.slug === articleSlug);
  if (article) return { ...basic(route, article.title, article.excerpt), type: 'article', image: article.image };
  const infoSlug = /^\/pages\/(our-story|sourcing-policy|orchard-provenance|lahore-boutique|blog-nutrition|hand-sorting|vacuum-sealing|freshness-guarantee|shipping|contact)$/.exec(route)?.[1];
  const policySlug = /^\/policies\/(shipping|refund|privacy|terms)$/.exec(route)?.[1];
  if (infoSlug || policySlug) return basic(route, (infoSlug || policySlug)!.replaceAll('-', ' '),
    policySlug ? 'Read the AllBarka store policy and contact us for help with your order.' : 'Learn about AllBarka products and customer support.');
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
  for (const [key, value] of Object.entries({ title: metadata.title, description: metadata.description,
    type: metadata.type, url: canonical, image: new URL(metadata.image, origin).href })) setMeta('property', `og:${key}`, value);
  for (const [key, value] of Object.entries({ card: 'summary_large_image', title: metadata.title,
    description: metadata.description, image: new URL(metadata.image, origin).href })) setMeta('name', `twitter:${key}`, value);
  if (metadata.noindex) setMeta('name', 'robots', 'noindex, nofollow');
  if (metadata.structuredData) {
    const json = JSON.stringify(metadata.structuredData).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
    html = html.replace('</head>', () => `<script type="application/ld+json" id="route-structured-data">${json}</script>\n</head>`);
  }
  html = html.replace(/<script\b/g, () => `<script nonce="${escapeHtml(nonce)}"`);
  return html.replace('<div id="root"></div>', () => `<noscript><main><h1>${escapeHtml(metadata.title)}</h1><p>${escapeHtml(metadata.description)}</p><p><a href="/shop">Browse the collection</a>. Enable JavaScript to shop and check current delivery options.</p></main></noscript><div id="root"></div>`);
}
