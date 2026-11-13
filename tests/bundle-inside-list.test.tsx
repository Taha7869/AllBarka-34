import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { CatalogProvider } from '../src/contexts/CatalogContext';
import BundleInsideList from '../src/components/BundleInsideList';
import { PRODUCTS } from '../src/data/products';
import type { Product } from '../src/types';

const render = (product: Product, products: Product[] = PRODUCTS) =>
  renderToString(<MemoryRouter><LanguageProvider><CatalogProvider initialProducts={products}>{<BundleInsideList product={product} />}</CatalogProvider></LanguageProvider></MemoryRouter>);

test('older bundles list every linked component through componentIds', () => {
  const bundle = PRODUCTS.find(p => p.id === 'bundle-daily-grind')!;
  const html = render(bundle);
  assert.match(html, /data-bundle-inside="bundle-daily-grind"/);
  for (const id of bundle.componentIds!) assert.ok(html.includes(`/product/${id}`), id);
});

test('object components show the exact weight and volume, and unresolved ones are skipped', () => {
  const bundle = { ...PRODUCTS.find(p => p.id === 'bundle-daily-grind')!, id: 'x-test', componentIds: undefined,
    components: [{ productId: 'badam', unitWeightG: 250 }, { productId: 'oil-blackseed', unitVolumeMl: 60 }, { productId: 'kaju', unitWeightG: 1000 }, { productId: 'not-in-catalog', unitWeightG: 5 }] } as Product;
  const html = render(bundle);
  assert.match(html, />250 g</); assert.match(html, />60 ml</); assert.match(html, />1 kg</);
  assert.ok(!html.includes('not-in-catalog'));
});

test('a bundle with fewer than two resolvable components renders nothing', () => {
  const bundle = { ...PRODUCTS.find(p => p.id === 'bundle-silver-hamper')! } as Product;
  assert.equal(render(bundle), '');
});
