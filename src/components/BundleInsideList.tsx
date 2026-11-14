import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { getLocalized } from '../utils/localize';

const PLACEHOLDER = '/images/product-placeholder.svg';
const heading = { en: "What's inside", ur: 'اس میں کیا ہے', ar: 'ما بداخل الصندوق' };
const netLine = {
  en: (g: string, rs: string) => `Net weight ${g} · works out to Rs. ${rs} per 100 g`,
  ur: (g: string, rs: string) => `کل خالص وزن ${g} · فی 100 گرام تقریباً ${rs} روپے`,
  ar: (g: string, rs: string) => `الوزن الصافي ${g} · نحو ${rs} روبية لكل 100 غ`,
};

/** Net grams of a bundle and its price per 100 g, only when every part is weighed in grams. */
export function bundlePerHundredGrams(product: Product, parts: Array<{ unitWeightG?: number; unitVolumeMl?: number; quantity?: number }>): { grams: number; per100: number } | null {
  if (!parts.length || parts.some(part => !(part.unitWeightG && part.unitWeightG > 0) || part.unitVolumeMl)) return null;
  const grams = parts.reduce((sum, part) => sum + part.unitWeightG! * (part.quantity && part.quantity > 0 ? part.quantity : 1), 0);
  const price = Object.values(product.prices || {}).find(value => typeof value === 'number' && value > 0) as number | undefined;
  if (!price || grams <= 0) return null;
  return { grams, per100: Math.round(price / grams * 100) };
}

function amount(c: { unitWeightG?: number; unitVolumeMl?: number }): string | null {
  if (c.unitWeightG && c.unitWeightG > 0) return c.unitWeightG >= 1000 ? `${c.unitWeightG / 1000} kg` : `${c.unitWeightG} g`;
  if (c.unitVolumeMl && c.unitVolumeMl > 0) return `${c.unitVolumeMl} ml`;
  return null;
}

/** Itemised "What's inside" list for bundles and boxes: photo, linked name and the exact quantity of each component. */
export default function BundleInsideList({ product }: { product: Product }) {
  const { language } = useLanguage();
  const catalog = useCatalogProducts();
  type Part = { productId: string; unitWeightG?: number; unitVolumeMl?: number; quantity?: number };
  const parts: Part[] = (product.components || []).filter((c): c is Part => typeof c !== 'string');
  // Older bundles store display names in `components`; their `componentIds` still link to the real products.
  const sources: Part[] = parts.length ? parts : (product.componentIds || []).map(productId => ({ productId }));
  const rows = sources
    .map(c => ({ c, item: catalog.find(p => p.id === c.productId) }))
    .filter((row): row is { c: Part; item: Product } => Boolean(row.item));
  if (rows.length < 2) return null;
  const value = rows.length === sources.length ? bundlePerHundredGrams(product, sources) : null;
  const gramsText = value ? (value.grams >= 1000 ? `${value.grams / 1000} kg` : `${value.grams} g`) : '';
  return <section data-bundle-inside={product.id} aria-label={heading[language]} dir={language === 'en' ? 'ltr' : 'rtl'}
    className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#FFFCF7)] p-3 text-start dark:bg-[#1A201E]">
    <h2 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">{heading[language]} · {rows.length}</h2>
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {rows.map(({ c, item }) => {
        const qty = amount(c);
        const name = getLocalized(item, 'name', language);
        return <li key={item.id}>
          <Link to={`/product/${item.id}`} className="focus-ring flex items-center gap-3 rounded-xl border border-transparent p-1.5 hover:border-[var(--color-border)]">
            <img src={item.image || PLACEHOLDER} alt="" loading="lazy" width={48} height={48}
              onError={e => { const img = e.currentTarget; if (!img.src.endsWith(PLACEHOLDER)) img.src = PLACEHOLDER; }}
              className="h-12 w-12 shrink-0 rounded-lg bg-[var(--color-base)] object-cover" />
            <span className="min-w-0">
              <span lang={language} className="block break-words text-xs font-medium text-[var(--color-text-primary)]">{name}</span>
              {qty && <bdi dir="ltr" className="block text-[11px] text-[var(--color-text-secondary)]">{qty}</bdi>}
            </span>
          </Link>
        </li>;
      })}
    </ul>
    {value && <p data-bundle-per100 className="mt-2 text-[11px] text-[var(--color-text-secondary)]"><bdi dir="auto">{netLine[language](gramsText, value.per100.toLocaleString())}</bdi></p>}
  </section>;
}
