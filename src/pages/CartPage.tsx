import { getLocalized } from '../utils/localize';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, MessageCircle, ShoppingCart } from 'lucide-react';
import { useCart, formatPrice, parsePrice } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { PRODUCTS } from '../data/products';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import CartTools from '../components/CartTools';
import SEO from '../components/SEO';
import TrustBadges from '../components/TrustBadges';
import { buildAutomatedOrderWhatsAppUrl } from '../config/contacts';
import { hamperPackingLines } from '../lib/hamperCatalog';

export default function CartPage() {
  const navigate = useNavigate();
  const { t, isRtl , language } = useLanguage();
  const mediaCover = useProductMediaCover();
  const {
    cartItems,
    subtotal,
    totalItemCount,
    remainingForFreeShipping,
    isFreeShippingUnlocked,
    freeShippingProgress,
    updateQuantity,
    removeFromCart,
    clearCart,
    shippingCity,
    setShippingCity,
    estimatedShipping,
  } = useCart();

  const shippingCost = estimatedShipping;
  const estimatedTotal = shippingCost === null ? null : subtotal + shippingCost;

  const handleWhatsAppCheckout = () => {
    if (cartItems.length === 0) return;
    const lines = cartItems.map((item) => {
      const itemUnit = parsePrice(item.unitPrice || item.price);
      const itemTotal = itemUnit * item.quantity;
      return [`• ${getLocalized(item, 'name', language)} (${item.selectedWeight}) × ${item.quantity} = Rs. ${itemTotal.toLocaleString()}`, ...hamperPackingLines(item.hamperConfiguration, language)].join('\n');
    });
    const shippingLine = `Delivery to ${shippingCity}: ${shippingCost === null ? 'confirmation required' : `Rs. ${shippingCost}`} (estimate)`;
    const messageLines = [
      'Assalam-o-Alaikum AllBarka! 🌿',
      'I would like to place the following order:',
      '',
      ...lines,
      '',
      `Subtotal: Rs. ${subtotal.toLocaleString()}`,
      shippingLine,
      estimatedTotal === null ? 'Please confirm the delivery charge and final total.' : `*Estimated total: Rs. ${estimatedTotal.toLocaleString()}*`,
      '',
      'Please confirm availability and share payment/delivery details. Shukriya! 🙏',
    ];
    window.open(buildAutomatedOrderWhatsAppUrl(messageLines.join('\n')), '_blank', 'noopener,noreferrer');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-base,#F6F1EA)] flex items-center justify-center px-4 py-16">
        <SEO title="Your Cart — AllBarka" description="View and manage your AllBarka cart" canonicalPath="/cart" />
        <div className="max-w-md w-full text-center space-y-6">
          <CartTools />
          <div className="w-24 h-24 rounded-full bg-[#FFFCF7] border border-[#C7982F]/30 flex items-center justify-center text-[#C7982F] mx-auto shadow-sm">
            <ShoppingCart size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#29231D] dark:text-[#F6F1EA] mb-2">
              {t('cartEmpty', 'Your Shopping Bag is Empty')}
            </h1>
            <p className="text-sm text-[#635B52] dark:text-[#A8A199] leading-relaxed">
              Explore our curated selection of premium dry fruits, cold-pressed oils, and artisanal gifts.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-3.5 min-h-[48px] rounded-full bg-[#1E3A2B] hover:bg-[#14281E] text-[#FDFBF7] text-xs font-bold uppercase tracking-widest transition-all shadow-md border border-[#C7982F]/40"
          >
            <ShoppingBag size={16} className="text-[#C7982F]" />
            <span>Browse Collections</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-base,#F6F1EA)] pb-24" dir={isRtl ? 'rtl' : 'ltr'}>
      <SEO title={`Your Cart (${totalItemCount} items) — AllBarka`} description="Review your AllBarka order before checkout" canonicalPath="/cart" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#806326] dark:text-[#E4C783] block mb-1">
              AllBarka Reserve
            </span>
            <h1 className="text-3xl font-serif font-bold text-[#29231D] dark:text-[#F6F1EA]">
              {t('cart', 'Your Cart')} <span className="text-[#C7982F]">({totalItemCount})</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-[#635B52] hover:text-red-600 dark:text-[#A8A199] dark:hover:text-red-400 font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Clear All
          </button>
        </div>

        <CartTools />
        <div className="mb-5 rounded-2xl border border-[#C7982F]/25 bg-[var(--color-surface)] p-4">
          <label htmlFor="cart-delivery-city" className="mb-2 block text-xs font-semibold">{t('shipping.destination')}</label>
          <select id="cart-delivery-city" className="focus-ring min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-sm" value={shippingCity === 'Lahore' ? 'Lahore' : 'Other City'} onChange={event => setShippingCity(event.target.value)}>
            <option value="Lahore">{t('shipping.lahore')}</option>
            <option value="Other City">{t('shipping.outside')}</option>
          </select>
          <p className="mt-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">{t(shippingCity === 'Lahore' ? 'shipping.lahoreRule' : 'shipping.nationwideRule')}</p>
        </div>
        {/* Free Shipping Progress */}
        {shippingCity === 'Lahore' && !isFreeShippingUnlocked && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FFFCF7] dark:bg-[#1A201E] border border-[#C7982F]/25">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-[#29231D] dark:text-[#F6F1EA] font-medium">
                {t('freeShippingHint').replace('{amount}', remainingForFreeShipping.toLocaleString())}
              </span>
              <span className="text-[#806326] dark:text-[#E4C783] font-bold">{freeShippingProgress}%</span>
            </div>
            <div className="h-2 w-full bg-[#ECE5DC] dark:bg-[#0D1110] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C7982F] via-[#E4C783] to-[#C7982F] rounded-full transition-all duration-500"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map((item) => {
              const itemUnit = parsePrice(item.unitPrice || item.price);
              const itemTotal = itemUnit * item.quantity;
              const matchedProduct = PRODUCTS.find((p) => p.id === item.productId || p.id === item.id);
              const imageSource = mediaCover(matchedProduct, item.image || '');

              return (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 bg-[#FFFCF7] dark:bg-[#1A201E] rounded-2xl border border-[#29231D]/10 dark:border-[#F6F1EA]/12 shadow-xs hover:border-[#C7982F]/50 transition-all"
                >
                  {/* Product Image */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#F6F1EA] dark:bg-[#222A28] border border-[#29231D]/8 shrink-0">
                    <img
                      src={imageSource}
                      alt={getLocalized(item, 'name', language)}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/images/product-placeholder.svg'; }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-[#29231D] dark:text-[#F6F1EA] text-sm sm:text-base line-clamp-1">
                      {getLocalized(item, 'name', language)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#F6F1EA] dark:bg-[#222A28] border border-[#29231D]/10 text-[#635B52] dark:text-[#A8A199] text-[9.5px] font-semibold uppercase tracking-wider">
                        {item.selectedWeight}
                      </span>
                      <span className="text-xs font-semibold text-[#806326] dark:text-[#E4C783]">
                        {formatPrice(itemUnit)} each
                      </span>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center bg-[#F6F1EA] dark:bg-[#222A28] rounded-xl border border-[#29231D]/10 dark:border-[#F6F1EA]/10">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-[#C7982F] hover:text-[#042821] transition-all cursor-pointer"
                          aria-label={item.quantity === 1 ? `Remove ${getLocalized(item, 'name', language)}` : `Decrease ${getLocalized(item, 'name', language)}`}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-[#29231D] dark:text-[#F6F1EA]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= 50}
                          className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-[#C7982F] hover:text-[#042821] transition-all cursor-pointer disabled:opacity-40"
                          aria-label={`Increase ${getLocalized(item, 'name', language)}`}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-serif font-bold text-[#29231D] dark:text-[#F6F1EA] text-sm">
                          {formatPrice(itemTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="w-9 h-9 flex items-center justify-center text-red-600 hover:text-red-700 dark:text-red-400 rounded-xl transition-colors cursor-pointer"
                          aria-label={`Remove ${getLocalized(item, 'name', language)}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-[#FFFCF7] dark:bg-[#1A201E] rounded-2xl border border-[#29231D]/10 dark:border-[#F6F1EA]/12 p-5 space-y-4 shadow-sm">
              <h2 className="font-serif font-bold text-[#29231D] dark:text-[#F6F1EA] text-lg">
                Order Summary
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#635B52] dark:text-[#A8A199]">{t('cartSubtotal', 'Subtotal')}</span>
                  <span className="font-bold text-[#29231D] dark:text-[#F6F1EA] font-mono">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#635B52] dark:text-[#A8A199]">Shipping</span>
                  <span className="font-bold text-[#806326] dark:text-[#E4C783]">
                    {shippingCost === null ? t('shipping.pending') : shippingCost === 0 ? t('shipping.free') : formatPrice(shippingCost)}
                  </span>
                </div>
                <div className="h-px bg-[#29231D]/10 dark:bg-[#F6F1EA]/10" />
                <div className="flex justify-between items-baseline font-serif font-bold">
                  <span className="text-[#29231D] dark:text-[#F6F1EA]">Estimated Total</span>
                  <span className="text-[#806326] dark:text-[#E4C783] text-lg font-mono">{estimatedTotal === null ? t('shipping.pending') : formatPrice(estimatedTotal)}</span>
                </div>
              </div>

              {/* Primary Checkout */}
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="w-full min-h-[48px] py-3.5 px-5 rounded-full bg-[#1E3A2B] hover:bg-[#14281E] text-[#FDFBF7] text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2.5 border border-[#C7982F]/40 cursor-pointer"
              >
                <ShoppingBag size={16} className="text-[#C7982F]" />
                <span>{t('proceedToCheckout', 'Proceed to Checkout')}</span>
                <ArrowRight size={15} />
              </button>

              {/* WhatsApp Alternative */}
              <button
                type="button"
                onClick={handleWhatsAppCheckout}
                className="w-full min-h-[44px] py-3 px-5 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#1E3A2B] dark:text-[#E4C783] text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 border border-[#25D366]/40 cursor-pointer"
              >
                <MessageCircle size={15} className="text-[#25D366]" />
                <span>Order via WhatsApp</span>
              </button>

              <Link
                to="/shop"
                className="block text-center text-xs text-[#806326] dark:text-[#E4C783] hover:text-[#C7982F] font-semibold uppercase tracking-wider transition-colors"
              >
                {t('continueShopping', 'Continue Shopping')}
              </Link>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 pt-8 border-t border-[#C7982F]/20">
          <TrustBadges />
        </div>
      </div>
    </div>
  );
}
