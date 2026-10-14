import type { CatalogSnapshot } from './catalogPricing';
import { HAMPER_PORTION_GRAMS, HAMPER_SELECTION_IDS, hamperSelectionPrice } from './hamperCatalog';

/** Trusted AI context is generated from the same validated view as the storefront and quote API. */
export function catalogConciergeContext(snapshot: CatalogSnapshot): string {
  const products = snapshot.catalog.filter(product => product.active !== false).map(product => {
    if (product.quoteOnly) return `- ${product.name_en}: personalized quote required; no checkout price.`;
    const portions = Object.entries(product.prices).map(([portion, price]) => `${portion}: Rs. ${price}`).join(', ');
    return `- ${product.name_en} [${product.id}]: ${portions}${product.allowCustomWeight ? `; custom weight Rs. ${product.pricePer100g} per 100g, ${product.minCustomWeightG}–${product.maxCustomWeightG}g in 50g steps, rounded up to the next Rs.5` : ''}`;
  });
  const boxes = snapshot.boxes.filter(box => box.active !== false).map(box => `- ${box.name_en} [${box.id}]: Rs. ${box.price}, ${box.minSelections}–${box.maxSelections} selections.`);
  const selections = snapshot.catalog.filter(product => product.active !== false && !product.quoteOnly && HAMPER_SELECTION_IDS.some(id => id === product.id))
    .flatMap(product => { const price = hamperSelectionPrice(product); return price === null ? [] : [`- ${product.name_en}: ${HAMPER_PORTION_GRAMS}g hamper portion Rs. ${price}`]; });
  return `${products.join('\n')}\n\nCustom hamper packaging:\n${boxes.join('\n')}\nHamper contents:\n${selections.join('\n')}\nA custom hamper costs its selected box plus its selected 200g portions. Final discounts and delivery fees must come from the authoritative quote API. Unlisted or inactive selections are unavailable.`;
}
