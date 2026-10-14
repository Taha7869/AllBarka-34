import { PRODUCTS } from '../data/products';
import { HAMPER_BOXES } from './hamperCatalog';
import { BOX_PRICE_COLLECTION, PRODUCT_PRICE_COLLECTION, defaultProductPricing, validateProductPricing, validateBoxPricing } from './catalogPricing';

/** Create-only migration. A successful deployment must preserve prices already entered by the owner. */
export function catalogSeedPlan(products: Map<string, unknown>, boxes: Map<string, unknown>) {
  const create: Array<{ path: string; pricing: Record<string, unknown> }> = [];
  const invalid: string[] = [];
  const preserve: string[] = [];
  for (const product of PRODUCTS) {
    const path = `${PRODUCT_PRICE_COLLECTION}/${product.id}`;
    if (!products.has(product.id)) create.push({ path, pricing: { ...defaultProductPricing(product), schemaVersion: 1, revision: 0 } });
    else {
      preserve.push(path);
      try { validateProductPricing(product, products.get(product.id)); } catch { invalid.push(path); }
    }
  }
  for (const box of HAMPER_BOXES) {
    const path = `${BOX_PRICE_COLLECTION}/${box.id}`;
    if (!boxes.has(box.id)) create.push({ path, pricing: { price: box.price, active: true, schemaVersion: 1, revision: 0 } });
    else {
      preserve.push(path);
      try { validateBoxPricing(boxes.get(box.id)); } catch { invalid.push(path); }
    }
  }
  return { create, preserve, invalid };
}
