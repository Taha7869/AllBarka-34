import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import type { CartItem } from '../types';
import { useCart, parsePrice } from '../contexts/CartContext';

import { buildAutomatedOrderWhatsAppUrl } from '../config/contacts';

interface StickyCartBottomBarProps {
  cartItems?: CartItem[];
  onOpenCart?: () => void;
  hide?: boolean;
}

export const StickyCartBottomBar: React.FC<StickyCartBottomBarProps> = ({
  cartItems: propCartItems,
  onOpenCart: propOnOpenCart,
  hide = false,
}) => {
  const location = useLocation();
  const { cartItems: contextCartItems, setIsCartOpen, totalItemsCount, subtotal } = useCart();
  
  const cartItems = propCartItems ?? contextCartItems;
  const onOpenCart = propOnOpenCart ?? (() => setIsCartOpen(true));
  const totalCount = propCartItems ? propCartItems.reduce((acc, item) => acc + item.quantity, 0) : totalItemsCount;
  const totalPrice = propCartItems ? propCartItems.reduce((acc, item) => acc + parsePrice(item.unitPrice ?? item.price) * item.quantity, 0) : subtotal;

  // Auto-hide when on checkout, cart page, or when any modal/drawer is open
  const isCheckoutOrCartPage = location.pathname === '/checkout' || location.pathname === '/cart';
  const isVisible = totalCount > 0 && !hide && !isCheckoutOrCartPage;

  const handleQuickWhatsAppOrder = () => {
    if (cartItems.length === 0) {
      onOpenCart();
      return;
    }
    const lines = cartItems.map((item) => {
      const unit = parsePrice(item.unitPrice || item.price);
      return `• ${item.name} (${item.selectedWeight}) × ${item.quantity} = Rs. ${(unit * item.quantity).toLocaleString()}`;
    });
    const msg = [
      'Assalam-o-Alaikum AllBarka! 🌿',
      'I would like to place the following order:',
      '',
      ...lines,
      '',
      `Subtotal: Rs. ${totalPrice.toLocaleString()}`,
      'Please confirm availability and share payment/delivery details. Shukriya! 🙏'
    ].join('\n');
    window.open(buildAutomatedOrderWhatsAppUrl(msg), '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="sticky-cart-bottom-bar"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-3 sm:bottom-5 inset-x-0 z-30 max-w-xl mx-auto px-3 sm:px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]"
        >
          {/* Card Container in Whitish Cream Luxury Theme */}
          <div className="pointer-events-auto bg-[#FAF9F5]/98 backdrop-blur-xl border-2 border-[#D4AF6A] rounded-2xl sm:rounded-full p-2 sm:pl-5 shadow-[0_12px_40px_rgba(43,27,20,0.25),0_0_24px_rgba(212,175,106,0.3)] flex items-center justify-between gap-2 sm:gap-3 select-none text-left">
            {/* Left: Item count & total price */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pl-1 cursor-pointer" onClick={onOpenCart}>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-[#D4AF6A]/60 flex items-center justify-center shrink-0 shadow-xs text-[#2B1B17]">
                <ShoppingBag size={15} className="text-[#D4AF6A]" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#8C6B1B]">
                    {totalCount} {totalCount === 1 ? 'Item Added' : 'Items Added'}
                  </span>
                  {totalPrice >= 3000 && (
                    <span className="hidden xs:inline-flex items-center gap-0.5 text-[8.5px] font-bold text-[#2B1B17] bg-[#D4AF6A]/20 border border-[#D4AF6A]/50 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                      <Sparkles size={8} className="text-[#D4AF6A]" />
                      Free Delivery
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-serif font-black text-[#2B1B17] tracking-tight truncate">
                  Rs. {totalPrice?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Right: Prominent Luxury Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              id="sticky-cart-checkout-btn"
              onClick={handleQuickWhatsAppOrder}
              type="button"
              className="group shrink-0 px-3 sm:px-6 py-2.5 rounded-xl sm:rounded-full bg-[#1E3A2B] hover:bg-[#14281E] text-[#FDFBF7] border border-[#D4AF6A]/70 font-black text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-wider shadow-[0_4px_18px_rgba(43,27,20,0.3)] hover:shadow-[0_6px_22px_rgba(212,175,106,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="hidden min-[360px]:inline">ORDER VIA WHATSAPP</span>
              <span className="min-[360px]:hidden">ORDER</span>
              <ArrowRight
                size={14}
                className="text-[#D4AF6A] group-hover:translate-x-0.5 transition-transform"
              />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyCartBottomBar;
