import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCatalogState } from '../hooks/useLiveCatalog';
import { useLanguage } from '../contexts/LanguageContext';
import { absolutePublicUrl, publicSiteOrigin, routeMetadata, organizationSchema } from '../lib/routeMetadata';

/** One route head controller prevents old page titles, private indexing and conflicting schemas. */
export default function SEO() {
  const location = useLocation(); const { language } = useLanguage(); const { catalog, boxes, source, revision, status } = useCatalogState();
  const origin = typeof document === 'undefined' ? 'https://allbarka.com' : publicSiteOrigin(document.querySelector<HTMLMetaElement>('meta[name="allbarka:origin"]')?.content || window.location.origin);
  useEffect(() => {
    const metadata = routeMetadata(location.pathname + location.search, { origin, language, catalog: status === 'ready' ? { catalog, boxes, source, revision } : null });
    document.title = metadata.title;
    const meta = (attribute: 'name' | 'property', key: string, content: string) => {
      let node = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!node) { node = document.createElement('meta'); node.setAttribute(attribute, key); document.head.appendChild(node); } node.content = content;
    };
    meta('name', 'description', metadata.description); meta('name', 'robots', metadata.noindex ? 'noindex, nofollow' : 'index, follow');
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]'); if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = origin + metadata.canonicalPath;
    const image = absolutePublicUrl(metadata.image, origin);
    for (const [key, value] of Object.entries({ 'og:title': metadata.title, 'og:description': metadata.description, 'og:url': canonical.href, 'og:image': image, 'og:type': metadata.type === 'article' ? 'article' : 'website', 'og:locale': language === 'ur' ? 'ur_PK' : language === 'ar' ? 'ar_PK' : 'en_PK' })) meta('property', key, value);
    for (const [key, value] of Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': metadata.title, 'twitter:description': metadata.description, 'twitter:image': image })) meta('name', key, value);
    let organization = document.getElementById('organization-structured-data') as HTMLScriptElement | null;
    if (!organization) { organization = document.createElement('script'); organization.id = 'organization-structured-data'; organization.type = 'application/ld+json'; document.head.appendChild(organization); } organization.textContent = JSON.stringify(organizationSchema(origin));
    let script = document.getElementById('route-structured-data') as HTMLScriptElement | null;
    if (metadata.structuredData) { if (!script) { script = document.createElement('script'); script.id = 'route-structured-data'; script.type = 'application/ld+json'; document.head.appendChild(script); } script.textContent = JSON.stringify(metadata.structuredData); }
    else script?.remove();
  }, [location.pathname, location.search, origin, language, catalog, boxes, source, revision, status]);
  return null;
}
