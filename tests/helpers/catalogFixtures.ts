import { PRODUCTS } from '../../src/data/products';
import { HAMPER_BOX_SEEDS } from '../../src/lib/hamperBoxSchema';

/** Explicit test database fixtures; production never falls back to this catalog. */
export function fixtureCatalogSnapshot(path: string) {
  const [collection, id] = path.split('/');
  const product = collection === 'products' ? PRODUCTS.find(product => product.id === id) : undefined;
  const box = collection === 'hamperBoxes' ? HAMPER_BOX_SEEDS.find(box => box.id === id) : undefined;
  const data = product || (box ? { schemaVersion: 1, boxId: box.id, revision: 0, price: box.price, active: true } : undefined);
  return { id, exists: !!data, ref: { path }, data: () => structuredClone(data) };
}
