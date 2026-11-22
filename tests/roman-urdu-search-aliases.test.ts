import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS } from '../src/data/products';
import { intakeProducts20261110 } from '../src/lib/catalogIntake20261110';
import { intakeProducts20261113 } from '../src/lib/catalogIntake20261113';
import { intakeProducts20261114 } from '../src/lib/catalogIntake20261114';
import { intakeProducts20261115 } from '../src/lib/catalogIntake20261115';
import { searchCatalog } from '../src/lib/catalogDiscovery';
import type { Product } from '../src/types';

const ALL_252 = [
  ...PRODUCTS,
  ...intakeProducts20261110(),
  ...intakeProducts20261113(),
  ...intakeProducts20261114(),
  ...intakeProducts20261115(),
].map(p => ({ ...p, active: true })) as Product[];

test('Roman Urdu and Urdu script queries discover matching products across all 252 seeds and intake items', () => {
  assert.equal(ALL_252.length, 252);

  const cases: Array<[string, string[]]> = [
    ['badam', ['badam', 'american-almonds', 'mamra-almonds', 'gurbandi-almonds-shelled', 'kagzi-almonds-inshell']],
    ['بادام', ['badam', 'american-almonds']],
    ['kaju', ['kaju']],
    ['khajoor', ['khajoor', 'dates-mazafati', 'dates-safawi', 'dates-sukkari']],
    ['کھجور', ['khajoor', 'dates-mazafati']],
    ['pista', ['pista', 'pistachio-kernels']],
    ['akhrot', ['akhroot', 'kagzi-walnut-inshell']],
    ['kishmish', ['kishmish', 'brown-raisins', 'sundarkhani-raisins']],
    ['anjeer', ['afghan-figs', 'mission-figs-dried']],
    ['chilgoza', ['pine-nuts', 'chilgoza-inshell', 'bundle-chilgoza-heirloom']],
    ['saunf', ['sugar-coated-saunf', 'mixed-mukhwas']],
    ['haldi', ['turmeric-powder', 'turmeric-root-whole']],
    ['ہلدی', ['turmeric-powder']],
    ['dalchini', ['desi-dalchini']],
    ['dhaniya', ['coriander-seeds-whole', 'coriander-powder']],
    ['kali mirch', ['black-pepper-powder']],
    ['lal mirch', ['lal-mirch-powder', 'dadar-mirch-dry-red-chilli']],
    ['shehad', ['honey-beri', 'honey-phulai']],
    ['murabba', ['murabba-amla', 'murabba-gajar', 'murabba-saib', 'murabba-behi', 'murabba-harad']],
    ['moongphali', ['salted-peanuts', 'peanuts-inshell', 'peanut-jaggery-gachak']],
    ['khopra', ['dry-coconut-khopra', 'desiccated-coconut']],
    ['chai', ['chai-patti-ctc', 'elaichi-chai', 'noon-chai']],
    ['kahwa', ['kashmiri-kahwa', 'peshawari-qehwa']],
    ['imli', ['imli-tamarind']],
    ['mulethi', ['mulethi-licorice-root']],
    ['isabgol', ['isabgol-husk']],
    ['salajeet', ['shilajit-gilgit-resin']],
    ['zafran', ['saffron-afghan-negin', 'saffron-spanish-coupe']],
    ['tel', ['oil-peanut', 'oil-amla', 'oil-neem']],
    ['ayadat', ['gift-ayadat-basket', 'gift-ayadat-premium-hamper']],
    ['taziyat', ['gift-condolence-visit']],
  ];

  for (const [query, expectedIds] of cases) {
    const foundIds = new Set(searchCatalog(ALL_252, query).map(p => p.id));
    for (const id of expectedIds) {
      assert.ok(foundIds.has(id), `Query "${query}" should match product "${id}"`);
    }
  }
});
