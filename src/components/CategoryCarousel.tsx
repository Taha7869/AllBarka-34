import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const categories = [
  {
    id: 'nuts',
    name: 'Dry Fruits & Nuts',
    image: '/images/generated/category-dry-fruits-tile-v1.webp',
    altKey: 'imageAlt.categoryDryFruits',
    link: '/category/nuts'
  },
  {
    id: 'oils',
    name: 'Cold-Pressed Oils',
    image: '/images/product-placeholder.svg',
    altKey: 'imageAlt.categoryOils',
    link: '/category/oils'
  },
  {
    id: 'essentials',
    name: 'Desi Essentials',
    image: '/images/product-placeholder.svg',
    altKey: 'imageAlt.categoryEssentials',
    link: '/category/essentials'
  },
  {
    id: 'snacks-seeds',
    name: 'Snacks & Seeds',
    image: '/images/generated/lahori-nimko-catalog-v1.webp',
    altKey: 'imageAlt.categorySnacks',
    link: '/category/snacks-seeds'
  },
  {
    id: 'gift-boxes',
    name: 'Gift Boxes',
    image: '/images/generated/category-gifts-tile-v1.webp',
    altKey: 'imageAlt.categoryGifts',
    link: '/category/gift-boxes'
  }
];

export default function CategoryCarousel() {
  const { t } = useLanguage();
  return (
    <section className="w-full py-10 sm:py-12 bg-[var(--color-base)] border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-5 sm:mb-6">
          <div>
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[var(--color-gold)] block mb-1">
              Curated Varieties
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--color-ink)]">
              Explore by Category
            </h2>
          </div>
          <Link
            to="/shop"
            className="shrink-0 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--color-ink)] hover:text-[var(--color-gold)] rounded-md focus-ring"
          >
            Shop all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.link}
              className="group min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs transition-colors hover:border-[var(--color-gold)] focus-ring"
              aria-label={`Shop ${cat.name}`}
            >
              <div className="aspect-[4/3] overflow-hidden bg-[var(--color-base)]">
                <img
                  src={cat.image}
                  alt={t(cat.altKey, cat.name)}
                  width={960}
                  height={960}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/product-placeholder.svg';
                  }}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                  loading="lazy"
                />
              </div>
              <div className="flex min-h-12 items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
                <h3 className="min-w-0 text-sm sm:text-base font-serif font-semibold text-[var(--color-ink)]">
                  {cat.name}
                </h3>
                <ArrowRight size={15} className="shrink-0 text-[var(--color-gold)] rtl:rotate-180" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
