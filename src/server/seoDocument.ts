import { absolutePublicUrl, organizationSchema, publicSiteOrigin, routeMetadata, sitemapPaths, type RouteMetadata } from '../lib/routeMetadata';
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export function renderSeoDocument(template: string, metadata: RouteMetadata, origin: string): string {
  const base = publicSiteOrigin(origin); const url = base + metadata.canonicalPath; const image = absolutePublicUrl(metadata.image, base);
  const html = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|allbarka:origin|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  const head = [
    `<title>${escape(metadata.title)}</title>`, `<meta name="description" content="${escape(metadata.description)}">`,
    `<meta name="robots" content="${metadata.noindex ? 'noindex, nofollow' : 'index, follow'}">`, `<meta name="allbarka:origin" content="${escape(base)}">`,
    `<link rel="canonical" href="${escape(url)}">`,
    ...Object.entries({ 'og:type': metadata.type === 'article' ? 'article' : 'website', 'og:site_name': 'AllBarka', 'og:locale': 'en_PK', 'og:url': url, 'og:title': metadata.title, 'og:description': metadata.description, 'og:image': image }).map(([property, content]) => `<meta property="${property}" content="${escape(content)}">`),
    ...Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': metadata.title, 'twitter:description': metadata.description, 'twitter:image': image }).map(([name, content]) => `<meta name="${name}" content="${escape(content)}">`),
    `<script id="organization-structured-data" type="application/ld+json">${json(organizationSchema(base))}</script>`,
    ...(metadata.structuredData ? [`<script id="route-structured-data" type="application/ld+json">${json(metadata.structuredData)}</script>`] : []),
  ];
  if (metadata.canonicalPath === '/') head.push('<link rel="preload" as="image" type="image/webp" href="/images/generated/hero-dry-fruits-mobile-v1.webp" media="(max-width: 767px)" fetchpriority="high">', '<link rel="preload" as="image" type="image/webp" href="/images/generated/hero-dry-fruits-wide-v1.webp" media="(min-width: 768px)" fetchpriority="high">');
  return html.replace('</head>', head.join('\n') + '\n</head>');
}
export function renderSitemap(origin: string) { const base = publicSiteOrigin(origin); return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + sitemapPaths().map(path => `<url><loc>${escape(base + path)}</loc></url>`).join('') + '</urlset>'; }
export function renderRobots(origin: string) { return 'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\nSitemap: ' + publicSiteOrigin(origin) + '/sitemap.xml\n'; }
