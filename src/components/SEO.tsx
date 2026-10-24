import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  type?: 'website' | 'product' | 'article';
  image?: string;
  keywords?: string[];
  noindex?:boolean;
  structuredData?: Record<string, any>;
}

export default function SEO({
  title,
  description = 'Hand-sorted, unbleached, orchard-fresh dry fruits, roasted pistachios, Chilean walnuts and luxury gift hampers delivered in Lahore and nationwide.',
  canonicalPath,
  type = 'website',
  image = '/images/generated/og-image.jpg',
  structuredData,
  keywords,
  noindex=false,
}: SEOProps) {
  const location = useLocation();
  const currentPath = canonicalPath || location.pathname;
  const siteOrigin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'https://allbarka.com';
  const canonicalUrl = `${siteOrigin}${currentPath.startsWith('/') ? currentPath : `/${currentPath}`}`;
  const fullTitle = title 
    ? `${title} — AllBarka Premium Dry Fruits`
    : 'AllBarka | Premium Dry Fruits, Nuts & Gifts';

  useEffect(() => {
    // 1. Page Title
    document.title = fullTitle;

    // 2. Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // 3. Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // 4. OpenGraph Tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', fullTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

    const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.querySelector(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };
    setMeta('name','keywords',(keywords||[]).join(', '));
    setMeta('property', 'og:type', type);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', new URL(image, siteOrigin).href);
    setMeta('name', 'robots', (noindex || /^\/(?:admin|staff|cart|checkout|success)(?:\/|$)/.test(currentPath)) ? 'noindex, nofollow' : 'index, follow');

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && image) {
      const fullImageUrl = new URL(image, siteOrigin).href;
      ogImage.setAttribute('content', fullImageUrl);
    }

    // 5. Structured Data JSON-LD
    let scriptTag = document.getElementById('route-structured-data') as HTMLScriptElement | null;
    if (structuredData) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'route-structured-data';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(structuredData);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      // Cleanup custom structured data when leaving route
      const el = document.getElementById('route-structured-data');
      if (el) el.remove();
    };
  }, [fullTitle, description, canonicalUrl, image, structuredData, siteOrigin, type, currentPath, keywords,noindex]);

  return null;
}
