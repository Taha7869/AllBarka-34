import React from 'react';
import AllBarkaHero from './AllBarkaHero';

interface HeroProps {
  onOpenCart?: () => void;
  onSearch?: (query: string) => void;
  onSelectCategory?: (category: string, query?: string) => void;
}

export default function Hero({ onOpenCart, onSearch, onSelectCategory }: HeroProps = {}) {
  return <AllBarkaHero onOpenCart={onOpenCart} onSearch={onSearch} onSelectCategory={onSelectCategory} />;
}
