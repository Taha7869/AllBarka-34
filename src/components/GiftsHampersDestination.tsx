import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Gift } from 'lucide-react';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { Product } from '../types';
import { productMatchesOccasion } from '../config/categories';
import { openCustomQuoteModal } from './CustomQuoteModal';
import ProductCard from './ProductCard';
import { HAMPER_BOXES } from '../lib/hamperCatalog';
import { getLocalized } from '../utils/localize';
import { GIFT_RECIPIENTS, isGiftRecipient } from '../lib/giftRecipient';

interface GiftsHampersDestinationProps { onQuickView?: (product: Product) => void }

// Presentation filter follows the shared card's initial enabled, priced portion.
function initialGiftPrice(product: Product): number | null {
  if (product.quoteOnly || product.orderMode === 'inquiry_quote') return null;
  const label = Object.keys(product.prices || {}).find(key => Number.isFinite(product.prices[key]) && product.prices[key] > 0 && !product.variants?.some(variant => variant.label === key && variant.available === false));
  return label ? product.prices[label] : null;
}
export default function GiftsHampersDestination({ onQuickView }: GiftsHampersDestinationProps) {
  const { t, language } = useLanguage();
  const products = useCatalogProducts();
  const [params, setParams] = useSearchParams();
  const occasion = (params.get('occasion') || 'all').trim().toLowerCase();
  const budget = ['3000','6000'].includes(params.get('budget') || '') ? Number(params.get('budget')) : 0;
  const recipientParam = params.get('recipient');
  const recipient = isGiftRecipient(recipientParam) ? recipientParam : '';
  const giftProducts = useMemo(() => products.filter(product => {
    if (product.active === false || product.status === 'draft' || product.status === 'archived') return false;
    const category = (product.category || '').toLowerCase(), id = product.id.toLowerCase();
    return category === 'gift-boxes' || category === 'combos' || (product as Product & {isGift?:boolean}).isGift === true || id.includes('hamper') || ['deal-1','deal-2','corporate-gifting','bundle-royal-feast'].includes(id);
  }), [products]);
  const filtered = giftProducts.filter(product => (occasion === 'all' || productMatchesOccasion(product, occasion)) && (!budget || (initialGiftPrice(product) !== null && initialGiftPrice(product)! <= budget)));
  const change = (key: string, value: string) => { const next = new URLSearchParams(params); if (!value) next.delete(key); else next.set(key,value); setParams(next,{replace:true,preventScrollReset:true}); };
  const reset = () => { const next = new URLSearchParams(params); next.delete('occasion'); next.delete('budget'); setParams(next,{replace:true,preventScrollReset:true}); };
  const launch = () => window.dispatchEvent(new CustomEvent('open-hamper-builder'));
  const builderAvailable = HAMPER_BOXES.some(box => box.active !== false && box.price > 0);
  const heroBox = HAMPER_BOXES.find(box => box.id === 'box-velvet') || HAMPER_BOXES[0];
  const requestGuidance = () => openCustomQuoteModal({
    productId: '', mode: 'filled', quantity: 1,
    giftRecipient: recipient || undefined,
    eventType: ({ wedding: 'Nikkah', umrah: 'Umrah / Hajj Tabarruk', ramadan: 'Eid / Festive Gifting', corporate: 'Corporate & Bulk Gifting' } as Record<string, string>)[occasion] || 'Other Celebration',
  });
  return <div className="gift-destination" dir={language === 'en' ? 'ltr' : 'rtl'}>
    <header className="gift-opening"><div><p className="gift-eyebrow">{t('dest.gifting.eyebrow')}</p><h1>{t('gift.heroTitle')}</h1><p>{t('gift.heroCopy')}</p>
      <div className="gift-opening-actions"><button type="button" className="gift-open-builder" disabled={!builderAvailable} onClick={launch}><Gift size={17}/>{t('dest.gifting.openBuilder')}</button><a href="#gift-selection">{t('gift.browse')} <ArrowRight size={16}/></a></div>
      {!builderAvailable && <p role="status">{t('gift.builderUnavailable')}</p>}<p className="gift-opening-note">{t('gift.boxChoices')}</p><ul>{HAMPER_BOXES.map(box=><li key={box.id}>{getLocalized(box,'name',language)}</li>)}</ul>
    </div><figure><img src={heroBox.image} width={960} height={960} alt={getLocalized(heroBox,'name',language)} onError={event=>{if(!event.currentTarget.src.endsWith('/images/product-placeholder.svg'))event.currentTarget.src='/images/product-placeholder.svg';}}/><figcaption>{t('gift.reference')}</figcaption></figure></header>
    <section id="gift-selection" className="gift-discovery"><div className="gift-discovery-heading"><div><p className="gift-eyebrow">{t('gift.explore')}</p><h2>{t('gift.selectionTitle')}</h2></div><p role="status">{filtered.length} {t('shop.results')}</p></div>
      <div className="gift-recipient-guide">
        <div className="gift-recipient-field">
          <label htmlFor="gift-recipient">{t('gift.recipientLabel')}</label>
          <select id="gift-recipient" value={recipient} onChange={event => change('recipient', event.target.value)} aria-describedby="gift-recipient-note">
            <option value="">{t('gift.recipientAny')}</option>
            {GIFT_RECIPIENTS.map(value => <option key={value} value={value}>{t(`gift.recipient.${value}`)}</option>)}
          </select>
          <p id="gift-recipient-note">{t('gift.recipientNote')}</p>
        </div>
        <button type="button" className="gift-recipient-action" onClick={requestGuidance}>{t('gift.recipientAction')} <ArrowRight size={16} aria-hidden="true"/></button>
      </div>
      <nav className="gift-occasions" aria-label={t('gift.occasionLabel')}>{['all','wedding','umrah','ramadan','corporate'].map(value=><button key={value} type="button" aria-pressed={occasion===value} onClick={()=>change('occasion',value==='all'?'':value)}>{t(`dest.occasions.${value}`)}</button>)}</nav>
      <div className="gift-budget" role="group" aria-label={t('gift.budgetLabel')}>{[0,3000,6000].map(value=><button key={value} type="button" aria-pressed={budget===value} onClick={()=>change('budget',value?String(value):'')}>{value?<><span>{t('gift.upTo')}</span> <bdi>Rs. {value.toLocaleString()}</bdi></>:t('gift.anyBudget')}</button>)}</div><p className="gift-filter-note">{t('gift.budgetNote')}</p>
      {filtered.length ? <div className="gift-product-grid">{filtered.map(product=><ProductCard key={product.id} product={product} isWholesale={false} onQuickView={onQuickView}/>)}</div> : <div className="gift-empty"><Gift size={28}/><h3>{t('dest.occasions.emptyTitle')}</h3><p>{t('dest.occasions.emptyCopy')}</p><button type="button" onClick={reset}>{t('gift.clear')}</button></div>}
    </section>
    <section className="gift-inquiry"><div><p className="gift-eyebrow">{t('dest.gifting.corporateTitle')}</p><h2>{t('gift.inquiryTitle')}</h2><p>{t('gift.inquiryCopy')}</p></div><div><button type="button" onClick={()=>openCustomQuoteModal({mode:'filled',eventType:'Corporate',quantity:25})}>{t('dest.gifting.requestCorporateQuote')} <ArrowRight size={16}/></button><Link to="/shop/celebration-boxes">{t('gift.celebration')} <ArrowRight size={16}/></Link></div></section>
  </div>;
}
