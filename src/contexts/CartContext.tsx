import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { CartItem, Product } from '../types';
import { PRODUCTS, getProductImage } from '../data/products';
import { useToast } from '../components/ToastManager';

import { STORE_CONFIG } from '../config/store';
import { resolveCartIdentity, resolveCartPortion, resolveCartQuantity, resolveCartUnitPrice } from '../lib/cartInput';
import { useLanguage } from './LanguageContext';
import { calculateOrderSummary, isLahoreCity } from '../lib/pricing';
import { readCheckoutDraft } from '../lib/checkoutPreferences';
import { resolveHamper, hamperCartKey, type HamperConfiguration } from '../lib/hamperCatalog';

const CART_STORAGE_KEY = 'allbarka_cart_v1';
const DELIVERY_CITY_KEY = 'allbarka_delivery_city';
export const FREE_SHIPPING_THRESHOLD = STORE_CONFIG.shipping.freeThreshold;

/**
 * Universal price parsing helper.
 * Removes currency symbols (Rs, PKR, $), commas, and spaces.
 * Returns a sanitized integer in PKR. Never returns NaN.
 */
export function parsePrice(val: string | number | undefined | null): number {
  if (typeof val === 'number') {
    return !Number.isFinite(val) || val < 0 ? 0 : Math.round(val);
  }
  if (!val) return 0;
  const str = String(val).replace(/(?:Rs\.?|PKR|\$)/gi, '').trim();
  const noCommas = str.replace(/,/g, '');
  const match = noCommas.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const parsed = parseFloat(match[0]);
  return !Number.isFinite(parsed) || parsed < 0 ? 0 : Math.round(parsed);
}

/**
 * Cleanly formats a price in PKR with commas.
 * Never outputs NaN or undefined.
 */
export function formatPrice(val: number | string | undefined | null): string {
  const num = parsePrice(val);
  return `Rs. ${num.toLocaleString()}`;
}

export type AddToCartInput =
  | Product
  | CartItem
  | {
      id: string;
      productId?: string;
      name: string;
      slug?: string;
      image?: string;
      prices?: Record<string, number>;
      price?: number;
      unitPrice?: number;
      wholesale?: number | boolean;
      selectedWeight?: string;
      quantity?: number;
      hamperConfiguration?: HamperConfiguration;
    };

export interface CartContextValue {
  cartItems: CartItem[];
  subtotal: number;
  totalItemCount: number;
  totalItemsCount: number;
  freeShippingThreshold: number;
  remainingForFreeShipping: number;
  isFreeShippingUnlocked: boolean;
  freeShippingProgress: number;
  shippingCity: string;
  setShippingCity: (city: string) => void;
  estimatedShipping: number | null;
  isCartOpen: boolean;
  isCartPulsing: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (
    product: AddToCartInput,
    weight?: string,
    quantity?: number,
    customUnitPrice?: number,
    options?: { silent?: boolean; openCart?: boolean }
  ) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQty: number) => void;
  clearCart: () => void;
  // Legacy alias compatibility
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const { t, language } = useLanguage();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartPulsing, setIsCartPulsing] = useState(false);
  const [shippingCity, updateShippingCity] = useState(() => {
    try { return localStorage.getItem(DELIVERY_CITY_KEY) || readCheckoutDraft()?.customer.city || 'Lahore'; } catch { return readCheckoutDraft()?.customer.city || 'Lahore'; }
  });
  const setShippingCity = useCallback((city: string) => {
    const normalized = city.trim().slice(0, 60);
    if (!normalized) return;
    updateShippingCity(normalized);
    try { localStorage.setItem(DELIVERY_CITY_KEY, normalized); } catch { /* private mode */ }
  }, []);

  // Initialize cart from localStorage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.flatMap((item: any) => {
            if (!item || typeof item !== 'object') return [];
            const identity = resolveCartIdentity(item, PRODUCTS);
            if (!identity) return [];
            const hamper = identity.productId === 'custom-hamper' ? resolveHamper(item.hamperConfiguration) : null;
            const rawWeight = hamper?.portion || resolveCartPortion(identity.product, item.selectedWeight || identity.portion);
            if (!rawWeight) return [];
            const rawProductId = identity.productId;
            const compositeId = hamper ? hamperCartKey(hamper.configuration) : `${rawProductId}-${rawWeight}`;
            const unitPrice = hamper?.unitPrice ?? resolveCartUnitPrice(identity.product, rawWeight, item.unitPrice ?? item.price ?? 0);
            return [{
              id: compositeId,
              productId: rawProductId,
              name_en: hamper?.name_en || identity.product?.name_en || item.name_en || item.name || 'Artisanal Dry Fruit',
              name_ur: hamper?.name_ur || identity.product?.name_ur || item.name_ur || item.name || 'Artisanal Dry Fruit',
              name_ar: hamper?.name_ar || identity.product?.name_ar || item.name_ar || item.name || 'Artisanal Dry Fruit',
              slug: identity.product?.id || item.slug || rawProductId,
              image: hamper?.image || (identity.product ? getProductImage(identity.product) : (item.image || '')),
              selectedWeight: rawWeight,
              unitPrice: unitPrice,
              price: unitPrice,
              quantity: resolveCartQuantity(item.quantity),
              wholesale: identity.product ? false : !!item.wholesale,
              ...(hamper ? { hamperConfiguration: hamper.configuration } : {}),
            }];
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved cart from localStorage:', e);
    }
    return [];
  });

  // Sync with localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Failed to save cart to localStorage:', e);
    }
  }, [cartItems]);

  // Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const itemPrice = parsePrice(item.unitPrice || item.price);
      return sum + itemPrice * item.quantity;
    }, 0);
  }, [cartItems]);

  const totalItemCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const remainingForFreeShipping = useMemo(() => {
    return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  }, [subtotal]);

  const isFreeShippingUnlocked = isLahoreCity(shippingCity) && subtotal >= FREE_SHIPPING_THRESHOLD;
  const estimatedShipping = useMemo(() => {
    try { return calculateOrderSummary({ items: cartItems, city: shippingCity }).shipping; }
    catch { return null; } // A selection requiring a quote must never crash the bag.
  }, [cartItems, shippingCity]);

  const freeShippingProgress = useMemo(() => {
    return Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  }, [subtotal]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  /**
   * Add to Cart implementation.
   * Enforces composite key: `${product.id}-${selectedWeight}`.
   * Same product with different weight => separate line item.
   * Same product with same weight => increments quantity.
   */
  const addToCart = useCallback(
    (
      productOrItem: AddToCartInput,
      weight?: string,
      quantity?: number,
      customUnitPrice?: number,
      options?: { silent?: boolean; openCart?: boolean }
    ) => {
      const identity = resolveCartIdentity(productOrItem, PRODUCTS);
      if (!identity) return;
      const rawProdId = identity.productId;
      const hamper = rawProdId === 'custom-hamper' ? resolveHamper((productOrItem as CartItem).hamperConfiguration) : null;
      const fullProd = hamper ? { ...hamper, id: 'custom-hamper' } : identity.product || (productOrItem as any);
      const selectedWeight = hamper?.portion || resolveCartPortion(identity.product, weight || (productOrItem as any).selectedWeight || identity.portion);
      if (!selectedWeight) {
        addToast(t('cart.portionUnavailable', 'This portion is unavailable. Please choose another size.'), 'error');
        return;
      }
      const compositeId = hamper ? hamperCartKey(hamper.configuration) : `${rawProdId}-${selectedWeight}`;

      // Calculate sanitized price
      let rawPrice = customUnitPrice;
      if (rawPrice === undefined || rawPrice === null) {
        if ((productOrItem as any).unitPrice !== undefined) {
          rawPrice = (productOrItem as any).unitPrice;
        } else if ((productOrItem as any).price !== undefined) {
          rawPrice = (productOrItem as any).price;
        } else if (fullProd.prices && fullProd.prices[selectedWeight] !== undefined) {
          rawPrice = fullProd.prices[selectedWeight];
        } else {
          rawPrice = 0;
        }
      }
      const unitPrice = hamper?.unitPrice ?? resolveCartUnitPrice(identity.product, selectedWeight, rawPrice);
      const cleanQty = resolveCartQuantity((productOrItem as any).quantity, quantity);
      const imageSrc = hamper?.image || (identity.product ? getProductImage(identity.product) : ((productOrItem as any).image || ''));
      const isWholesale = !identity.product && typeof (productOrItem as any).wholesale === 'boolean'
        ? (productOrItem as any).wholesale
        : false;

      setCartItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === compositeId);
        if (existingIndex > -1) {
          const next = [...prev];
          const newQty = Math.min(50, next[existingIndex].quantity + cleanQty);
          next[existingIndex] = {
            ...next[existingIndex],
            quantity: newQty,
            unitPrice: unitPrice || next[existingIndex].unitPrice,
            price: unitPrice || next[existingIndex].price,
          };
          return next;
        }

        const newItem: CartItem = {
          id: compositeId,
          productId: rawProdId,
          name_en: fullProd.name_en || (productOrItem as any).name_en || (productOrItem as any).name || 'Artisanal Selection',
          name_ur: fullProd.name_ur || (productOrItem as any).name_ur || (productOrItem as any).name || 'Artisanal Selection',
          name_ar: fullProd.name_ar || (productOrItem as any).name_ar || (productOrItem as any).name || 'Artisanal Selection',
          slug: fullProd.id || rawProdId,
          image: imageSrc,
          selectedWeight,
          unitPrice,
          price: unitPrice,
          quantity: cleanQty,
          wholesale: isWholesale,
          ...(hamper ? { hamperConfiguration: hamper.configuration } : {}),
        };
        return [...prev, newItem];
      });

      // Subtle toast notification & auto-open cart drawer
      if (!options?.silent) addToast(`${fullProd[`name_${language}`] || fullProd.name_en || 'Item'} (${selectedWeight}) — ${t('cart.addedToast')}`, 'success');
      if (options?.openCart !== false) {
        setIsCartPulsing(true);
        setTimeout(() => setIsCartPulsing(false), 800);
        setIsCartOpen(true);
      }
    },
    [addToast, t, language]
  );

  /**
   * Remove item from cart by composite ID (or by legacy ID match).
   */
  const removeFromCart = useCallback((cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== cartItemId && `${item.productId}-${item.selectedWeight}` !== cartItemId));
  }, []);

  /**
   * Update item quantity safely.
   * If newQty <= 0 or decremented from 1 => cleanly removed.
   * Enforces min 1, max 50.
   */
  const updateQuantity = useCallback((cartItemId: string, newQty: number) => {
    setCartItems((prev) => {
      if (newQty <= 0) {
        return prev.filter((item) => item.id !== cartItemId && `${item.productId}-${item.selectedWeight}` !== cartItemId);
      }
      if (!Number.isFinite(newQty)) return prev;
      const clampedQty = Math.max(1, Math.min(50, Math.floor(newQty)));
      return prev.map((item) => {
        if (item.id === cartItemId || `${item.productId}-${item.selectedWeight}` === cartItemId) {
          return { ...item, quantity: clampedQty };
        }
        return item;
      });
    });
  }, []);

  /**
   * Clear entire cart.
   */
  const clearCart = useCallback(() => {
    setCartItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear cart in localStorage:', e);
    }
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    cartItems,
    subtotal,
    totalItemCount,
    totalItemsCount: totalItemCount,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    remainingForFreeShipping,
    isFreeShippingUnlocked,
    freeShippingProgress,
    shippingCity,
    setShippingCity,
    estimatedShipping,
    isCartOpen,
    isCartPulsing,
    setIsCartOpen,
    openCart,
    closeCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    setCartItems,
  }), [
    cartItems,
    subtotal,
    totalItemCount,
    remainingForFreeShipping,
    isFreeShippingUnlocked,
    freeShippingProgress,
    shippingCity,
    setShippingCity,
    estimatedShipping,
    isCartOpen,
    isCartPulsing,
    openCart,
    closeCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
