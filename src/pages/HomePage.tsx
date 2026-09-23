import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import { Product } from '../types';
import Hero from '../components/Hero';
import CategoryCarousel from '../components/CategoryCarousel';
import ProductSlider from '../components/ProductSlider';
import AllBarkaMovingReviews from '../components/AllBarkaMovingReviews';
import FAQSection from '../components/FAQSection';
import { ShieldCheck, ThermometerSnowflake, Truck, ArrowUpRight } from 'lucide-react';

interface OutletContextType {
  setCartOpen: (open: boolean) => void;
  setSelectedQuickViewProduct: (product: Product) => void;
  handleAddToCart: (productId: string, weight: string) => void;
}

const servicePillars = [
  { icon: ShieldCheck, number: '01', title: 'Hand-graded purity', copy: 'Selected from trusted growers and packed without artificial glazing or chemical bleaching.' },
  { icon: ThermometerSnowflake, number: '02', title: 'Freshness protected', copy: 'Small-batch sealing and practical Lahore storage guidance preserve flavour and natural oils.' },
  { icon: Truck, number: '03', title: 'Lahore doorstep care', copy: 'Same-day options in selected areas, careful dispatch, and free standard delivery over Rs. 3,000.' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { setCartOpen, setSelectedQuickViewProduct, handleAddToCart } = useOutletContext<OutletContextType>();

  const handleSearch = (query: string) => navigate(`/shop?search=${encodeURIComponent(query)}`);

  return (
    <div className="flex w-full select-none flex-col items-center bg-[var(--color-base)] text-[var(--color-ink)]">
      <Hero
        onOpenCart={() => setCartOpen(true)}
        onSearch={handleSearch}
        onSelectCategory={(category) => navigate(category === 'all' ? '/shop' : `/shop/${category}`)}
      />

      <CategoryCarousel />

      <ProductSlider
        title="Boutique Bestsellers"
        subtitle="Our most requested harvest lots — freshly sealed in barrier pouches."
        products={PRODUCTS}
        onAddToCart={handleAddToCart}
        onQuickView={setSelectedQuickViewProduct}
      />

      <section className="w-full overflow-hidden bg-[#042821] py-16 text-[#FFFCF7] sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl">
              <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.3em] text-[#E4C783]">From source to doorstep</span>
              <h2 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">Quiet luxury, backed by everyday care</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#F6F1EA]/72">Premium should feel effortless: honest sourcing, freshness-first handling, and a delivery experience designed around Lahore.</p>
            </div>
            <button type="button" onClick={() => navigate('/pages/our-story')} className="focus-ring inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-[#C7982F]/55 px-5 text-xs font-bold uppercase tracking-[0.16em] text-[#FFFCF7] transition-colors hover:bg-[#C7982F] hover:text-[#042821]">
              Our standards <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3 md:gap-4">
            {servicePillars.map(({ icon: Icon, number, title, copy }) => (
              <article key={number} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm transition-colors hover:border-[#C7982F]/55 hover:bg-white/[0.08] sm:p-6">
                <div className="mb-7 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C7982F]/35 bg-[#C7982F]/10 text-[#E4C783]"><Icon size={21} aria-hidden="true" /></span>
                  <span className="font-serif text-sm text-[#E4C783]/70">{number}</span>
                </div>
                <h3 className="font-serif text-xl font-semibold text-[#FFFCF7]">{title}</h3>
                <p className="mt-3 text-xs leading-6 text-[#F6F1EA]/68 sm:text-sm">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <AllBarkaMovingReviews />

      <div className="w-full border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <FAQSection />
      </div>
    </div>
  );
}
