"use client";
import React, { useState } from "react";
import { HoveredLink, Menu, MenuItem, ProductItem } from "./ui/navbar-menu";
import { cn } from "../lib/utils";

export interface NavbarDemoProps {
  className?: string;
  onNavigate?: (action: string, payload?: any) => void;
}

export function NavbarDemo({ className, onNavigate }: NavbarDemoProps) {
  return (
    <div className={cn("relative w-full flex items-center justify-center", className)}>
      <Navbar className="top-2" onNavigate={onNavigate} />
    </div>
  );
}

export function AllBarkaNavbarDemo(props: NavbarDemoProps) {
  return <NavbarDemo {...props} />;
}

export function Navbar({ 
  className,
  onNavigate 
}: { 
  className?: string;
  onNavigate?: (action: string, payload?: any) => void;
}) {
  const [active, setActive] = useState<string | null>(null);

  const handleNav = (action: string, payload?: any) => {
    setActive(null);
    if (onNavigate) {
      onNavigate(action, payload);
    }
  };

  return (
    <div
      className={cn("relative mx-auto max-w-2xl lg:max-w-3xl select-none transition-all duration-300", className)}
    >
      <div className="bg-[var(--color-base,#FAF9F5)] border-2 border-[var(--color-gold,#B8935F)]/35 shadow-lg rounded-full px-3.5 sm:px-6 py-1.5 sm:py-2 backdrop-blur-md">
        <Menu setActive={setActive} className="bg-transparent border-none shadow-none p-0 space-x-1 sm:space-x-2">
          {/* Brand / Home */}
          <MenuItem setActive={setActive} active={active} item="ALLBARKA">
            <div className="flex flex-col space-y-2.5 min-w-[200px]">
              <HoveredLink 
                href="/" 
                onClick={() => handleNav('home')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors font-serif font-bold"
              >
                ✦ Home Boutique
              </HoveredLink>
              <HoveredLink 
                href="/about" 
                onClick={() => handleNav('about')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors"
              >
                About Our Purity Promise
              </HoveredLink>
              <HoveredLink 
                href="/reviews" 
                onClick={() => handleNav('reviews')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors"
              >
                Patron Reviews & Feedback
              </HoveredLink>
              <HoveredLink 
                href="/bulk-orders" 
                onClick={() => handleNav('wholesale')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors text-[var(--color-gold,#B8935F)] font-medium"
              >
                Bulk & Wholesale Tier (Save 20%+)
              </HoveredLink>
            </div>
          </MenuItem>

          {/* Categories Menu */}
          <MenuItem setActive={setActive} active={active} item="CATEGORIES">
            <div className="flex flex-col space-y-2.5 min-w-[220px]">
              <HoveredLink 
                href="/category/nuts" 
                onClick={() => handleNav('category', 'nuts')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors"
              >
                Premium Nuts & Badam
              </HoveredLink>
              <HoveredLink 
                href="/category/dried-fruits" 
                onClick={() => handleNav('category', 'dried-fruits')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors"
              >
                Sun-Dried Gourmet Fruits
              </HoveredLink>
              <HoveredLink 
                href="/category/snacks" 
                onClick={() => handleNav('category', 'snacks')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors"
              >
                Artisanal Roasted Snacks
              </HoveredLink>
              <HoveredLink 
                href="/category/seeds" 
                onClick={() => handleNav('category', 'seeds')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors"
              >
                Superfood Seeds & Wellness
              </HoveredLink>
              <HoveredLink 
                href="/category/combos" 
                onClick={() => handleNav('category', 'combos')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors text-[var(--color-gold,#B8935F)] font-medium"
              >
                Gift Combos & Curated Boxes
              </HoveredLink>
            </div>
          </MenuItem>

          {/* Best Sellers Showcase Menu */}
          <MenuItem setActive={setActive} active={active} item="BEST SELLERS">
            <div className="grid grid-cols-2 gap-3.5 w-[410px] sm:w-[460px]">
              <ProductItem
                title="Premium Almonds (Badam)"
                href="/products/almonds"
                onClick={() => handleNav('product', 'badam')}
                src="/images/badam.jpg.png"
                description="Raw, sweet, high-oil mountain almonds sorted for pure energy."
              />
              <ProductItem
                title="Chilean Walnuts (Akhroot)"
                href="/products/walnuts"
                onClick={() => handleNav('product', 'akhroot')}
                src="/images/akhroot.jpg.png"
                description="Light golden, sweet, and intact brain-boosting halves."
              />
            </div>
          </MenuItem>

          {/* Support Menu */}
          <MenuItem setActive={setActive} active={active} item="SUPPORT">
            <div className="flex flex-col space-y-2.5 min-w-[240px]">
              <HoveredLink 
                href="/track-order" 
                onClick={() => handleNav('delivery')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors"
              >
                Lahore Delivery & Shipping Rates
              </HoveredLink>
              <HoveredLink 
                href="/faqs" 
                onClick={() => handleNav('faqs')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors"
              >
                Freshness Guarantee & FAQs
              </HoveredLink>
              <HoveredLink 
                href="/contact" 
                onClick={() => handleNav('whatsapp')} 
                className="hover:text-[var(--color-gold,#B8935F)] transition-colors font-bold text-[var(--color-gold,#B8935F)]"
              >
                Direct WhatsApp Concierge
              </HoveredLink>
            </div>
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
}

export default NavbarDemo;
