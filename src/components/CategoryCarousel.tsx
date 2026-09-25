import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const categories = [
  { id: 'premium-nuts', name: 'Premium Assorted Nuts', luxuryName: 'Assorted Nuts', eyebrow: 'Hand-picked', image: '/assets/categories/premium_nuts.png', altKey: 'imageAlt.categoryNuts', link: '/shop/nuts', featured: true },
  { id: 'organic-dried-fruits', name: 'Organic Dried Fruits', luxuryName: 'Dried Fruits', eyebrow: 'Sun-dried', image: '/assets/categories/organic_dried_fruits.png', altKey: 'imageAlt.categoryDriedFruits', link: '/shop/dried-fruits' },
  { id: 'cold-pressed-oils', name: 'Cold Pressed Oils', luxuryName: 'Cold Pressed Oils', eyebrow: 'Pure extracted', image: '/assets/categories/cold_pressed_oils.png', altKey: 'imageAlt.categoryOils', link: '/shop/oils' },
  { id: 'luxury-hampers', name: 'Luxury Hampers & Gifts', luxuryName: 'Hampers & Gifts', eyebrow: 'Made for giving', image: '/assets/categories/luxury_hampers.png', altKey: 'imageAlt.categoryGifts', link: '/gifting' },
  { id: 'wholesale-tiers', name: 'Wholesale Tiers', luxuryName: 'Wholesale Tiers', eyebrow: 'Bulk supply', image: '/assets/categories/wholesale_tiers.png', altKey: 'imageAlt.categoryWholesale', link: '/wholesale' },
];

export default function CategoryCarousel() {
  const { t } = useLanguage();

  return (
    <section className="w-full border-b border-[var(--color-border)] bg-[var(--color-base)] py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-5 sm:mb-9">
          <div className="max-w-xl">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--color-gold)]">The AllBarka Pantry</span>
            <h2 className="font-serif text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">Begin with what you crave</h2>
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-[var(--color-ink-muted)] sm:text-sm">Browse the complete boutique, seasonal value bundles, hand-graded dry fruits, savoury snacks, and thoughtful gifts.</p>
          </div>
          <Link to="/shop" className="focus-ring hidden min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--color-gold)]/35 bg-[var(--color-surface)] px-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] sm:inline-flex">
            Explore all <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:flex lg:flex-row lg:h-[380px]">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={category.link}
              className={`group relative min-h-[220px] overflow-hidden rounded-[1.5rem] border border-[var(--color-border-accent)] bg-[var(--color-surface)] shadow-[0_12px_32px_rgba(41,35,29,0.06)] focus-ring sm:min-h-[280px] lg:min-h-0 lg:flex-1 lg:hover:flex-[1.8] lg:duration-500 lg:transition-[flex] lg:ease-[cubic-bezier(0.25,1,0.5,1)] ${category.featured ? 'col-span-2 lg:col-span-1' : ''}`}
              aria-label={`Shop ${category.name}`}
            >
              <img src={category.image} alt={t(category.altKey, category.name)} width={960} height={960}
                onError={(event) => { (event.currentTarget as HTMLImageElement).src = '/images/product-placeholder.svg'; }}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none"
                loading={index < 2 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#042821]/95 via-[#042821]/30 to-transparent" />
              {index < 2 && (
                <span className="absolute left-3 top-3 rounded-full border border-white/25 bg-[#042821]/72 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#F6F1EA] backdrop-blur-md sm:left-4 sm:top-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-500">
                  {index === 0 ? 'Start here' : 'Popular value'}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0 flex flex-col justify-end h-full">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#E4C783] sm:text-[10px] transform lg:translate-y-4 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 transition-all duration-500 delay-100">{category.eyebrow}</span>
                  <h3 className="font-serif text-lg font-semibold leading-tight text-[#FFFCF7] sm:text-xl lg:text-center w-full lg:group-hover:text-left transition-all duration-500 block truncate lg:whitespace-normal">{category.luxuryName}</h3>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[#FFFCF7] backdrop-blur-md transition-all group-hover:border-[#C7982F] group-hover:bg-[#C7982F] group-hover:text-[#042821] transform lg:opacity-0 lg:-translate-x-4 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 duration-500">
                  <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <Link to="/shop" className="focus-ring mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--color-gold)]/35 bg-[var(--color-surface)] px-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-ink)] sm:hidden">
          Explore all products <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
