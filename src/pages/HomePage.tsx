import React from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products';
import { Product } from '../types';
import Hero from '../components/Hero';
import CategoryCarousel from '../components/CategoryCarousel';
import ProductSlider from '../components/ProductSlider';
import AllBarkaMovingReviews from '../components/AllBarkaMovingReviews';
import FAQSection from '../components/FAQSection';
import { 
  ShieldCheck, 
  
  ThermometerSnowflake, 
  
  Truck,
  
} from 'lucide-react';

interface OutletContextType {
  setCartOpen: (open: boolean) => void;
  setSelectedQuickViewProduct: (product: Product) => void;
  handleAddToCart: (productId: string, weight: string) => void;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { setCartOpen, setSelectedQuickViewProduct, handleAddToCart } = useOutletContext<OutletContextType>();

  const handleSearch = (query: string) => {
    navigate(`/shop?search=${encodeURIComponent(query)}`);
  };

  return (
    <div className="w-full flex flex-col items-center select-none bg-[var(--color-base)] text-[var(--color-ink)]">
      
      {/* 1. HERO BANNER */}
      <Hero 
        onOpenCart={() => setCartOpen(true)}
        onSearch={handleSearch}
        onSelectCategory={(category) => {
          navigate(category === 'all' ? '/shop' : `/shop/${category}`);
        }}
      />

      {/* 2. TYPES OF PRODUCTS SLIDING CAROUSEL */}
      <CategoryCarousel />

      {/* 3. CURATED FEATURED PRODUCTS SLIDING CAROUSEL (Top 8 Bestsellers Only) */}
      <ProductSlider 
        title="Boutique Bestsellers"
        subtitle="Our most requested harvest lots — freshly sealed in barrier pouches."
        products={PRODUCTS}
        onAddToCart={handleAddToCart}
        onQuickView={setSelectedQuickViewProduct}
      />

      {/* 4. CLEAN EDITORIAL SOURCING & CARE GUIDE (Single Uncluttered Block) */}
      <section className="w-full py-20 bg-[var(--color-base)] select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border-accent)] p-8 sm:p-12 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            
            {/* Pillar 1 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-accent)] flex items-center justify-center text-[var(--color-gold)]">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-lg font-serif font-bold text-[var(--color-ink)]">
                Single-Origin Purity
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed font-normal">
                Direct procurement from generational growers in Kerman, California, and Skardu. Zero chemical bleaching or artificial glazing.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-accent)] flex items-center justify-center text-[var(--color-gold)]">
                <ThermometerSnowflake size={20} />
              </div>
              <h3 className="text-lg font-serif font-bold text-[var(--color-ink)]">
                Pantry Storage Advice
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed font-normal">
                Store in airtight glass jars away from direct heat. During Lahore summers, keep walnuts in the refrigerator crisper to preserve natural oils.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--color-surface-subtle)] border border-[var(--color-border-accent)] flex items-center justify-center text-[var(--color-gold)]">
                <Truck size={20} />
              </div>
              <h3 className="text-lg font-serif font-bold text-[var(--color-ink)]">
                Lahore Express Dispatch
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed font-normal">
                Same-day dispatch for DHA, Gulberg, Model Town, and Cantt. All orders over Rs. 3,000 enjoy free doorstep delivery.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. VERIFIED REVIEWS MARQUEE */}
      <AllBarkaMovingReviews />

      {/* 6. COMPACT FAQ */}
      <div className="w-full bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <FAQSection />
      </div>

    </div>
  );
}
