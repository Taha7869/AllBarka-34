/** Offline additive-impact report only. There is no live database or apply option. */
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PRODUCTS} from '../src/data/products';
import {requiresStoredLegacyPackagingPricing} from '../src/lib/catalogSchema';
import {loadAuthoritativeCatalog,mergeAuthoritativeCatalog,invalidateCatalogCache} from '../src/lib/catalogStore';
import {readCatalogConfiguration} from '../src/lib/catalogConfigurationRouter';
import {readStorefrontContent} from '../src/lib/storefrontContentRouter';
import {memoryFirestore} from '../tests/helpers/memoryFirestore';

if(process.argv.length>2)throw Error('This report accepts no live/apply arguments.');
const original=structuredClone(PRODUCTS);
const initial=Object.fromEntries(original.map(product=>[`products/${product.id}`,product]));
const {db,records}=memoryFirestore(initial);const recordsBefore=JSON.stringify([...records]);
invalidateCatalogCache();const snapshot=await loadAuthoritativeCatalog(db,{fresh:true});
const merged=mergeAuthoritativeCatalog(original,snapshot.products);
const configuration=await readCatalogConfiguration(db);const content=await readStorefrontContent(db);
assert.equal(merged.length,original.length);
const unavailableSeedIds:string[]=[];
for(const seed of original){const product=merged.find(value=>value.id===seed.id);assert.ok(product,seed.id);if(snapshot.invalidProductIds.includes(seed.id)){unavailableSeedIds.push(seed.id);assert.deepEqual(product.prices,{});assert.equal(product.active,false);}else{assert.deepEqual(product.prices,seed.prices,`${seed.id}: valid seed prices changed`);assert.equal(Boolean(product.allowCustomWeight),Boolean(seed.allowCustomWeight),`${seed.id}: custom quantity changed`);}assert.equal(product.commerce,undefined,`${seed.id}: new commerce must remain opt-in`);}
assert.equal(JSON.stringify([...records]),recordsBefore,'Reads must not rewrite saved records');
const empty=memoryFirestore();invalidateCatalogCache();const missing=await loadAuthoritativeCatalog(empty.db,{fresh:true});
const missingStandard=missing.products.filter(product=>missing.invalidProductIds.includes(product.id));
assert.ok(missingStandard.length>0);assert.ok(missingStandard.every(product=>Object.keys(product.prices).length===0&&product.active===false),'Missing authoritative records must remain unavailable');
assert.equal(empty.records.size,0);
const compatibilityIds=original.filter(product=>requiresStoredLegacyPackagingPricing(product.id)).map(product=>product.id);
for(const id of compatibilityIds)assert.ok(missing.invalidProductIds.includes(id),'Missing legacy records must not gain compiled fallback prices');
assert.equal(configuration.revision,0);assert.equal(content.revision,0);assert.equal(content.liveRevision,0);
const priceFingerprint=(values:typeof PRODUCTS)=>createHash('sha256').update(JSON.stringify(values.map(value=>[value.id,value.prices]))).digest('hex');
const report={generatedAt:new Date().toISOString(),timezone:'Asia/Karachi',scope:'Isolated store initialized with compiled seed records, plus empty-store safety check; not live merchant records',mode:'offline-read-only',products:original.length,productIdsPreserved:true,savedFixtureRecordsPreserved:true,validSeedPriceComparisons:original.length-unavailableSeedIds.length,unavailableSeedIds,unavailableSeedReviewRequired:unavailableSeedIds.length>0,legacyLabelCompatibilityIds:compatibilityIds,liveMerchantReviewRequired:true,legacyCustomQuantityPreserved:true,automaticCommerceConversions:0,plannedCreates:0,plannedUpdates:0,plannedDeletes:0,fixtureWrites:0,fixtureRecords:records.size,emptyStoreUnavailableProducts:missingStandard.length,emptyStoreWrites:empty.records.size,liveDatabaseCalls:0,configurationDefaultRevision:configuration.revision,contentDefaultRevision:content.revision,priceFingerprintBefore:priceFingerprint(original),savedPriceFingerprintAfter:priceFingerprint([...records.values()] as typeof PRODUCTS),resolvedPriceFingerprint:priceFingerprint(merged),externalVerification:'NOT_RUN'};
await mkdir('docs/admin-expansion/evidence',{recursive:true});await writeFile('docs/admin-expansion/evidence/additive-dry-run.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
