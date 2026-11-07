import { useCatalogProducts } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { HAMPER_PORTION_GRAMS, type HamperConfiguration } from '../lib/hamperCatalog';
import { getLocalized } from '../utils/localize';

/** Saved item details only. Pricing and printing options remain with existing services. */
export default function CartItemPersonalization({ configuration, expanded = false }: {
  configuration?: HamperConfiguration;
  expanded?: boolean;
}) {
  const products = useCatalogProducts();
  const { language, t } = useLanguage();
  if (!configuration || configuration.version !== 1 || !Array.isArray(configuration.selections)) return null;
  const selections = configuration.selections.filter(id => typeof id === 'string').slice(0, 8);
  const recipient = typeof configuration.recipientName === 'string' ? configuration.recipientName.slice(0, 100) : '';
  const message = typeof configuration.giftMessage === 'string' ? configuration.giftMessage.slice(0, 500) : '';

  return <details className="purchase-personalization" open={expanded || undefined}>
    <summary>{t('purchase.giftDetails')}</summary>
    <p className="purchase-reference">{t('gift.reference')}</p>
    <dl>
      <div><dt>{t('purchase.contents')}</dt><dd><ul>{selections.map(id => <li key={id} dir="auto">{getLocalized(products.find(product => product.id === id), 'name', language) || id} <bdi>({HAMPER_PORTION_GRAMS}g)</bdi></li>)}</ul></dd></div>
      {recipient && <div><dt>{t('purchase.recipient')}</dt><dd dir="auto">{recipient}</dd></div>}
      {message && <div><dt>{t('purchase.message')}</dt><dd dir="auto" className="purchase-gift-message">{message}</dd></div>}
    </dl>
  </details>;
}
