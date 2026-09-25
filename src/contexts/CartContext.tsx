import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { CartItem, Product } from '../types';
import type { HamperConfiguration } from '../config/hampers';
import { PRODUCTS, getProductImage } from '../data/products';
import { useToast } from '../components/ToastManager';

import { STORE_CONFIG } from '../config/store';

const CART_STORAGE_KEY = 'allbarka_cart_v1';
export const FREE_SHIPPING_THRESHOLD = STORE_CONFIG.shipping.freeThreshold;

/**
 * Universal price parsing helper.
 * Removes currency symbols (Rs, PKR, $), commas, and spaces.
 * Returns a sanitized integer in PKR. Never returns NaN.
 */
export function parsePrice(val: string | number | undefined | null): number {
  if (typeof val === 'number') {
    return isNaN(val) || val < 0 ? 0 : Math.round(val);
  }
  if (!val) return 0;
  const str = String(val).replace(/(?:Rs\.?|PKR|\$)/gi, '').trim();
  const noCommas = str.replace(/,/g, '');
  const match = noCommas.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const parsed = parseFloat(match[0]);
  return isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed);
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
      hamper?: HamperConfiguration;
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
  isCartOpen: boolean;
  isCartPulsing: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (
    product: AddToCartInput,
    weight?: string,
    quantity?: number,
    customUnitPrice?: number
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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartPulsing, setIsCartPulsing] = useState(false);

  // Initialize cart from localStorage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) => !String(item.productId || item.id || '').startsWith('custom-hamper-') || item.hamper).map((item: any) => {
            const rawWeight = item.selectedWeight || '250g';
            const rawProductId = item.productId || item.id?.split('-')[0] || item.id || 'item';
            const compositeId = `${rawProductId}-${rawWeight}`;
            const unitPrice = parsePrice(item.unitPrice || item.price || 0);
            return {
              id: compositeId,
              productId: rawProductId,
              name: item.name || 'Artisanal Dry Fruit',
              slug: item.slug || rawProductId,
              image: item.image || '',
              selectedWeight: rawWeight,
              unitPrice: unitPrice,
              price: unitPrice,
              quantity: Math.max(1, Math.min(50, parseInt(item.quantity, 10) || 1)),
              wholesale: !!item.wholesale,
              hamper: item.hamper,
            };
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

  const isFreeShippingUnlocked = subtotal >= FREE_SHIPPING_THRESHOLD;

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
      quantity = 1,
      customUnitPrice?: number
    ) => {
      const rawProdId = (productOrItem as any).productId || (productOrItem as any).id?.split('-')[0] || (productOrItem as any).id;
      const fullProd = PRODUCTS.find((p) => p.id === rawProdId) || (productOrItem as any);
      const availableWeights = fullProd.prices ? Object.keys(fullProd.prices) : ['250g'];
      const selectedWeight = weight || (productOrItem as any).selectedWeight || availableWeights[0] || '250g';
      const compositeId = `${rawProdId}-${selectedWeight}`;

      // Calculate sanitized price
      let rawPrice = customUnitPrice;
      if (rawPrice === undefined || rawPrice === null) {
        if ((productOrItem as any).unitPrice !== undefined) {
          rawPrice = (productOrItem as any).unitPrice;
        } else if ((productOrItem as any).price !== undefined) {
          rawPrice = (productOrItem as any).price;
        } else if (fullProd.prices && fullProd.prices[selectedWeight] !== undefined) {
          rawPrice = fullProd.prices[selectedWeight];
        } else if (typeof fullProd.wholesale === 'number') {
          rawPrice = fullProd.wholesale;
        } else {
          rawPrice = 0;
        }
      }
      const unitPrice = parsePrice(rawPrice);
      const effectiveQty = quantity !== undefined ? quantity : ((productOrItem as any).quantity || 1);
      const cleanQty = Math.max(1, Math.min(50, effectiveQty));
      const imageSrc = (productOrItem as any).image || (fullProd.image ? fullProd.image : getProductImage(fullProd as Product));
      const isWholesale = typeof (productOrItem as any).wholesale === 'boolean'
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
          name: fullProd.name || (productOrItem as any).name || 'Artisanal Selection',
          slug: fullProd.id || rawProdId,
          image: imageSrc,
          selectedWeight,
          unitPrice,
          price: unitPrice,
          quantity: cleanQty,
          wholesale: isWholesale,
          hamper: (productOrItem as any).hamper,
        };
        return [...prev, newItem];
      });

      // Subtle toast notification & auto-open cart drawer
      addToast(`${fullProd.name || 'Item'} (${selectedWeight}) added to your box`, 'success');
      setIsCartPulsing(true);
      setTimeout(() => setIsCartPulsing(false), 800);
      setIsCartOpen(true);
    },
    [addToast]
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
      const clampedQty = Math.max(1, Math.min(50, newQty));
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
