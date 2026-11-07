import { useCatalogProducts } from '../contexts/CatalogContext';
import { getLocalized } from '../utils/localize';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, MessageCircle, ShoppingCart } from 'lucide-react';
import { useCart, formatPrice, parsePrice } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProductMediaCover } from '../contexts/ProductMediaContext';
import CartTools from '../components/CartTools';
import SEO from '../components/SEO';
import CartItemPersonalization from '../components/CartItemPersonalization';
import TrustBadges from '../components/TrustBadges';
import { buildAutomatedOrderWhatsAppUrl } from '../config/contacts';
import { hamperPackingLines } from '../lib/hamperCatalog';

export default function CartPage() {
  const PRODUCTS = useCatalogProducts();
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


if (!cartItems.length) return <div className="purchase-cart purchase-empty" dir={isRtl ? 'rtl' : 'ltr'}>
    <SEO title={`${t('purchase.bag')} — AllBarka`} description={t('purchase.emptyCopy')} canonicalPath="/cart" />
    <div className="purchase-empty-panel"><ShoppingCart size={36} aria-hidden="true"/><p className="purchase-eyebrow">AllBarka</p><h1>{t('cartEmpty')}</h1><p>{t('purchase.emptyCopy')}</p><Link className="purchase-primary" to="/shop">{t('purchase.browse')} <ArrowRight size={16}/></Link></div>
    <CartTools />
  </div>;

  return <div className="purchase-cart" dir={isRtl ? 'rtl' : 'ltr'}>
    <SEO title={`${t('purchase.bag')} (${totalItemCount}) — AllBarka`} description={t('purchase.intro')} canonicalPath="/cart" />
    <header className="purchase-cart-heading"><div><p className="purchase-eyebrow">{t('purchase.eyebrow')}</p><h1>{t('purchase.bag')} <span>({totalItemCount})</span></h1><p>{t('purchase.intro')}</p></div><button type="button" className="purchase-clear" onClick={clearCart}>{t('purchase.clear')}</button></header>
    <div className="purchase-cart-layout"><section className="purchase-cart-items" aria-label={t('purchase.bag')}>
      {cartItems.map(item => {
        const unit = parsePrice(item.unitPrice ?? item.price);
        const product = PRODUCTS.find(candidate => candidate.id === item.productId || candidate.id === item.id);
        const name = getLocalized(item, 'name', language);
        return <article key={item.id} className="purchase-cart-item">
          <div className="purchase-cart-photo"><img src={mediaCover(product, item.image || '')} alt={name} width={160} height={160} loading="lazy" decoding="async" onError={event => { if (!event.currentTarget.src.endsWith('/images/product-placeholder.svg')) event.currentTarget.src='/images/product-placeholder.svg'; }}/></div>
          <div className="purchase-cart-detail"><h2>{product ? <Link to={`/product/${product.id}`}>{name}</Link> : name}</h2><p className="purchase-portion" dir="auto">{item.selectedWeight}</p><p className="purchase-unit"><bdi>{formatPrice(unit)}</bdi> {t('purchase.each')}</p>
            <CartItemPersonalization configuration={item.hamperConfiguration} expanded />
            <div className="purchase-line-actions"><div className="purchase-quantity" role="group" aria-label={`${t('quantity')}: ${name}`}><button type="button" onClick={() => updateQuantity(item.id,item.quantity-1)} aria-label={`${t(item.quantity===1?'purchase.remove':'purchase.decrease')}: ${name}`}><Minus size={15}/></button><span><bdi>{item.quantity}</bdi></span><button type="button" disabled={item.quantity>=50} onClick={() => updateQuantity(item.id,item.quantity+1)} aria-label={`${t('purchase.increase')}: ${name}`}><Plus size={15}/></button></div><button type="button" className="purchase-remove" onClick={() => removeFromCart(item.id)} aria-label={`${t('purchase.remove')}: ${name}`}><Trash2 size={16}/><span>{t('purchase.remove')}</span></button></div>
          </div><div className="purchase-line-total"><small>{t('purchase.lineTotal')}</small><bdi>{formatPrice(unit*item.quantity)}</bdi></div>
        </article>;
      })}
      <Link className="purchase-continue" to="/shop"><ArrowRight size={16}/>{t('continueShopping')}</Link>
    </section><aside className="purchase-cart-summary" aria-label={t('purchase.summary')}>
      <div className="purchase-summary-heading"><p className="purchase-eyebrow">{t('purchase.estimate')}</p><h2>{t('purchase.summary')}</h2></div>
      <div className="purchase-summary-body"><label htmlFor="cart-delivery-city">{t('shipping.destination')}</label><select id="cart-delivery-city" value={shippingCity==='Lahore'?'Lahore':'Other City'} onChange={event=>setShippingCity(event.target.value)}><option value="Lahore">{t('shipping.lahore')}</option><option value="Other City">{t('shipping.outside')}</option></select><p className="purchase-delivery-note">{t(shippingCity==='Lahore'?'shipping.lahoreRule':'shipping.nationwideRule')}</p>
      {shippingCity==='Lahore'&&!isFreeShippingUnlocked&&<div className="purchase-shipping-progress"><p>{t('freeShippingHint').replace('{amount}',remainingForFreeShipping.toLocaleString())}</p><progress value={freeShippingProgress} max={100} aria-label={t('freeShippingHint').replace('{amount}',remainingForFreeShipping.toLocaleString())}/></div>}
      <dl className="purchase-totals"><div><dt>{t('cartSubtotal')}</dt><dd><bdi>{formatPrice(subtotal)}</bdi></dd></div><div><dt>{t('shippingFee')}</dt><dd><bdi>{shippingCost===null?t('shipping.pending'):shippingCost===0?t('shipping.free'):formatPrice(shippingCost)}</bdi></dd></div><div className="purchase-total"><dt>{t('purchase.estimatedTotal')}</dt><dd><bdi>{estimatedTotal===null?t('shipping.pending'):formatPrice(estimatedTotal)}</bdi></dd></div></dl><p className="purchase-estimate-note">{t('purchase.estimateNote')}</p>
      <button type="button" className="purchase-primary purchase-cart-checkout" onClick={()=>navigate('/checkout')}><ShoppingBag size={16}/>{t('proceedToCheckout')}<ArrowRight size={16}/></button><button type="button" className="purchase-secondary" onClick={handleWhatsAppCheckout}><MessageCircle size={16}/>{t('purchase.whatsapp')}</button></div>
    </aside></div>
    <CartTools /><div className="purchase-trust"><TrustBadges /></div>
  </div>;
}
