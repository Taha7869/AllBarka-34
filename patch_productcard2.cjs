const fs = require('fs');

const content = `import React, { useState } from 'react';
import { ShoppingBag, Check, Eye } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  isWholesale: boolean;
  onAddToCart: (productId: string, weight: string) => void;
  onQuickView?: (product: Product) => void;
  viewMode?: 'grid' | 'list';
}

export default function ProductCard({
  product,
  isWholesale,
  onAddToCart,
  onQuickView,
}: ProductCardProps) {
  const weights = Object.keys(product.prices || {});
  const [selectedWeight, setSelectedWeight] = useState(weights[0] || '250g');
  const [isAdded, setIsAdded] = useState(false);

  const unitPrice = isWholesale
    ? (product.wholesale || Object.values(product.prices)[0] || 0)
    : (product.prices[selectedWeight] || Object.values(product.prices)[0] || 0);

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product.id, selectedWeight);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1600);
  };

  return (
    <article
      onClick={() => onQuickView && onQuickView(product)}
      className="group/card bg-[#FFFFFF] border border-[#191917]/15 hover:border-[#D4AF37] rounded-3xl p-5 flex flex-col justify-between h-full transition-all duration-300 hover:shadow-[0_12px_32px_rgba(25,25,23,0.08)] hover:-translate-y-1 cursor-pointer select-none text-left relative"
    >
      {/* Top Meta Line */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[9px] font-sans font-bold uppercase tracking-[0.2em] text-[#B8935F]">
          {product.health || 'Single-Origin'}
        </span>
        {product.tag && (
          <span className="px-2.5 py-0.5 rounded-full bg-[#FAF9F5] border border-[#D4AF37]/40 text-[#B8935F] text-[9px] font-sans font-bold uppercase tracking-wider">
            {product.tag}
          </span>
        )}
      </div>

      {/* Image Plate */}
      <div className="w-full aspect-[4/3] rounded-2xl bg-[#FAF9F5] border border-[#191917]/10 overflow-hidden flex items-center justify-center p-3 relative group shadow-2xs">
        <img
          src={product.image || \`/images/\${product.imageName}\`}
          alt={product.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1543257580-7269da773bf5?w=500&q=80';
          }}
          className="w-full h-full object-contain group-hover/card:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[#191917]/15 backdrop-blur-[2px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
          <span className="px-3.5 py-1.5 rounded-full text-[9px] font-sans font-bold uppercase tracking-widest bg-[#191917] text-white shadow-md flex items-center gap-1.5">
            <Eye size={11} />
            <span>Quick Look</span>
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="pt-4 pb-2 space-y-1.5 flex-1 text-left">
        <h3 className="text-lg font-serif font-semibold text-[#191917] leading-snug line-clamp-1">
          {product.name}
        </h3>
        <p className="text-xs text-[#191917]/70 line-clamp-2 leading-relaxed font-sans">
          {product.desc}
        </p>
      </div>

      {/* Weights & Action Area */}
      <div className="pt-3 border-t border-dashed border-[#191917]/15 space-y-3 mt-auto">
        {/* Weight Selector */}
        <div className="flex gap-1.5 w-full flex-wrap">
          {weights.map((w) => (
            <button
              key={w}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedWeight(w);
              }}
              className={\`flex-1 min-w-[50px] py-1.5 px-2 rounded-xl text-[10px] font-sans font-bold tracking-wider uppercase border transition-all duration-200 cursor-pointer \${
                selectedWeight === w
                  ? 'bg-[#043327] text-[#D4AF37] border-[#043327] shadow-xs'
                  : 'bg-[#FAF9F5] text-[#191917] border-[#191917]/15 hover:border-[#D4AF37]'
              }\`}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Pricing & Add to Cart */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex flex-col text-left">
            <span className="text-[8px] uppercase tracking-widest text-[#191917]/50 font-sans font-bold">
              Investment
            </span>
            <span className="text-base sm:text-lg font-serif font-bold text-[#191917]">
              Rs. {unitPrice?.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={handleBuy}
            className={\`min-w-[110px] px-4 py-2.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 \${
              isAdded
                ? 'bg-emerald-700 text-white border border-emerald-700'
                : 'bg-[#043327] text-[#D4AF37] hover:bg-[#064e3b] border border-[#D4AF37]/50'
            }\`}
          >
            {isAdded ? (
              <>
                <Check size={13} className="text-emerald-300" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag size={13} />
                <span>Add to Box</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
`;

fs.writeFileSync('src/components/ProductCard.tsx', content);
