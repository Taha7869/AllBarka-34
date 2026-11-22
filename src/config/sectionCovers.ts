export type SectionCoverId =
  | 'all'
  | 'nuts'
  | 'dates'
  | 'herbs-spices'
  | 'oils'
  | 'essentials'
  | 'snacks-seeds'
  | 'saunf'
  | 'murabba-jaat'
  | 'herbal-teas'
  | 'gift-boxes'
  | 'celebration-boxes'
  | 'bundles';

export interface SectionCoverAsset {
  id: SectionCoverId;
  src: string;
  src800: string;
  srcSet: string;
  altKey: string;
}

const COVER_BASE = '/images/section-covers-20261120';

function makeCover(id: SectionCoverId): SectionCoverAsset {
  const src = `${COVER_BASE}/${id}.webp`;
  const src800 = `${COVER_BASE}/${id}-800.webp`;
  return {
    id,
    src,
    src800,
    srcSet: `${src800} 800w, ${src} 1600w`,
    altKey: `catalog.alt.${id}`,
  };
}

export const SECTION_COVER_IDS: readonly SectionCoverId[] = [
  'all',
  'nuts',
  'dates',
  'herbs-spices',
  'oils',
  'essentials',
  'snacks-seeds',
  'saunf',
  'murabba-jaat',
  'herbal-teas',
  'gift-boxes',
  'celebration-boxes',
  'bundles',
] as const;

export const SECTION_COVERS: Record<SectionCoverId, SectionCoverAsset> = {
  all: makeCover('all'),
  nuts: makeCover('nuts'),
  dates: makeCover('dates'),
  'herbs-spices': makeCover('herbs-spices'),
  oils: makeCover('oils'),
  essentials: makeCover('essentials'),
  'snacks-seeds': makeCover('snacks-seeds'),
  saunf: makeCover('saunf'),
  'murabba-jaat': makeCover('murabba-jaat'),
  'herbal-teas': makeCover('herbal-teas'),
  'gift-boxes': makeCover('gift-boxes'),
  'celebration-boxes': makeCover('celebration-boxes'),
  bundles: makeCover('bundles'),
};

const SECTION_COVER_ALIASES: Record<string, SectionCoverId> = {
  all: 'all',
  nuts: 'nuts',
  'dry-fruits': 'nuts',
  fruits: 'nuts',
  dates: 'dates',
  'herbs-spices': 'herbs-spices',
  spices: 'herbs-spices',
  oils: 'oils',
  essentials: 'essentials',
  organics: 'essentials',
  'snacks-seeds': 'snacks-seeds',
  'seeds-snacks': 'snacks-seeds',
  snacks: 'snacks-seeds',
  seeds: 'snacks-seeds',
  saunf: 'saunf',
  'murabba-jaat': 'murabba-jaat',
  murabba: 'murabba-jaat',
  'herbal-teas': 'herbal-teas',
  teas: 'herbal-teas',
  'gift-boxes': 'gift-boxes',
  gifts: 'gift-boxes',
  gifting: 'gift-boxes',
  combos: 'gift-boxes',
  'celebration-boxes': 'celebration-boxes',
  'bid-boxes': 'celebration-boxes',
  'personalized-treats': 'celebration-boxes',
  bundles: 'bundles',
  deals: 'bundles',
};

export function getSectionCover(id?: string | null): SectionCoverAsset | null {
  if (!id) return null;
  const key = id.trim().toLowerCase();
  const canonical = SECTION_COVER_ALIASES[key];
  return canonical ? SECTION_COVERS[canonical] : null;
}

const SECTION_COVER_URL_PATTERN = /^\/images\/section-covers-20261120\/([a-z0-9-]+)\.webp$/i;

/** Returns responsive 800w/1600w srcSet whenever an image URL points to a studio section cover. */
export function sectionCoverSrcSet(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;
  const match = SECTION_COVER_URL_PATTERN.exec(imageUrl.trim());
  if (!match) return undefined;
  const slug = match[1].replace(/-800$/i, '') as SectionCoverId;
  return SECTION_COVERS[slug]?.srcSet;
}
