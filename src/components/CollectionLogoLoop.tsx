import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Gift, Leaf, Nut, Package, Sprout } from 'lucide-react';
import LogoLoop, { type LogoItem } from './LogoLoop';
import { AllBarkaCrestVector } from './AllBarkaLogo';
import { useVisualRefinementLanguage } from '../hooks/useVisualRefinementLanguage';
import { CANONICAL_CATEGORIES, resolveCategorySlug } from '../config/categories';

const COLLECTION_RIBBON_PRESENTATION = [
  { key: 'visual.nuts', href: '/shop/nuts', icon: Nut },
  { key: 'pantry.bundles', href: '/shop/bundles', icon: Package },
  { key: 'visual.snacks', href: '/shop/snacks-seeds', icon: Sprout },
  { key: 'visual.gifts', href: '/gifting', icon: Gift },
  { key: 'visual.oils', href: '/shop/oils', icon: Droplets },
  { key: 'visual.essentials', href: '/shop/essentials', icon: Leaf },
  { key: 'visual.all', href: '/shop', icon: null },
] as const;
export const COLLECTION_RIBBON_LINKS = [
  ...COLLECTION_RIBBON_PRESENTATION,
  ...Object.keys(CANONICAL_CATEGORIES).filter(id => !COLLECTION_RIBBON_PRESENTATION.some(item => resolveCategorySlug(item.href.split('/').pop()) === id))
    .map(id => ({ key: `shop.${id}`, href: `/shop/${id}`, icon: Leaf })),
];

/** Real storefront collections; no implied payment, courier or third-party partnerships. */
export default function CollectionLogoLoop() {
  const { t } = useVisualRefinementLanguage();
  const logos = useMemo<LogoItem[]>(() => COLLECTION_RIBBON_LINKS.map(({ key, href, icon: Icon }) => ({
    title: t(key), href,
    node: <><span className="collection-ribbon__motif" aria-hidden="true">{Icon ? <Icon size={21} strokeWidth={1.2} /> : <AllBarkaCrestVector />}</span><span dir="auto">{t(key)}</span></>,
  })), [t]);

  return <div className="collection-ribbon" dir="ltr">
    <span className="collection-ribbon__signature" aria-hidden="true"><AllBarkaCrestVector /></span>
    <LogoLoop logos={logos} speed={24} gap={40} logoHeight={24} ariaLabel={t('visual.loopLabel')}
      renderItem={(item, key, duplicate) => <Link key={key} to={item.href!} tabIndex={duplicate ? -1 : undefined} className="logoloop__link collection-ribbon__link" aria-label={item.title}>{item.node}</Link>} />
  </div>;
}
