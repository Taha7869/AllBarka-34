import type { Firestore } from 'firebase-admin/firestore';
import manifest from '../data/catalogIntake20261113.json';
import { PRODUCTS } from '../data/products';
import { createAdminProduct } from './catalogStore';
import { normalizeCommerceInput, validateDynamicProduct } from './catalogSchema';
import { careFacility, careStorage } from '../data/catalogCare';
import type { StorageKind } from '../data/care/types';

const tr = (en: string, ur: string, ar: string) => ({ en, ur, ar });
const allergens = {
  nuts: tr('Contains tree nuts.', 'اس میں درختوں کے میوے شامل ہیں۔', 'يحتوي على مكسرات الأشجار.'),
  peanut: tr('Contains peanuts.', 'اس میں مونگ پھلی شامل ہے۔', 'يحتوي على الفول السوداني.'),
  honey: tr('Not suitable for infants under 12 months.', 'بارہ ماہ سے کم عمر بچوں کے لیے موزوں نہیں۔', 'غير مناسب للرضع دون 12 شهرًا.'),
  none: tr('Check the label for any personal sensitivity.', 'کسی ذاتی حساسیت کے لیے لیبل دیکھیں۔', 'راجع الملصق عند وجود أي حساسية.'),
};
const container = {
  liquid: tr('Sealed bottle', 'سیل بند بوتل', 'زجاجة مغلقة'),
  preserve: tr('Sealed jar', 'سیل بند جار', 'برطمان مغلق'),
  food: tr('Food-grade pouch or jar, sealed for dispatch', 'خوراک کے لیے موزوں پاؤچ یا جار، روانگی کے لیے سیل بند', 'كيس أو برطمان مناسب للأغذية ومختوم للإرسال'),
};
const portions = tr('Available net portions', 'دستیاب خالص وزن', 'الحصص الصافية المتاحة');
const volumes = tr('Available volumes', 'دستیاب مقدار', 'الأحجام المتاحة');

/** Fill the shared care, packing and allergen copy so every new product reads like the existing catalogue. */
function enrich(source: Record<string, any>) {
  const { careKind, ...rest } = source;
  const labels = (source.commerce.options as Array<{ label: string }>).map(option => option.label).join(' · ');
  const liquid = source.commerce.kind === 'liquid';
  const box = liquid ? container.liquid : careKind === 'preserve' ? container.preserve : container.food;
  const store = careStorage(careKind as StorageKind);
  const allergen = source.id === 'salted-peanuts' ? allergens.peanut : careKind === 'nuts' ? allergens.nuts : careKind === 'honey' ? allergens.honey : allergens.none;
  const out: Record<string, any> = { ...rest };
  (['en', 'ur', 'ar'] as const).forEach((lang, i) => {
    out[`storageTips_${lang}`] = store[i];
    out[`packagingDetails_${lang}`] = `${box[lang]}. ${(liquid ? volumes : portions)[lang]}: ${labels}.`;
    out[`allergenWarning_${lang}`] = `${allergen[lang]} ${careFacility[i]}`;
  });
  return out;
}


/** One-time owner intake. Existing Firestore products remain the only live authority. */
export function intakeProducts20261113() {
  const protectedIds = new Set(PRODUCTS.map(product => product.id));
  const ids = new Set<string>();
  return manifest.newProducts.map(source => {
    if (protectedIds.has(source.id) || ids.has(source.id)) throw new Error('INTAKE_ID_COLLISION');
    ids.add(source.id);
    if (source.status !== 'draft' || source.active !== false) throw new Error('INTAKE_MUST_START_AS_DRAFT');
    const body = normalizeCommerceInput(enrich(structuredClone(source) as Record<string, any>) as any);
    validateDynamicProduct(body);
    return body;
  });
}

export async function importIntake20261113(options: { db: Firestore | null; actorUid?: string; execute?: boolean }) {
  const products = intakeProducts20261113();
  if (options.execute && (!options.db || !options.actorUid)) throw new Error('INTAKE_AUTHORITY_REQUIRED');
  const result: Array<{ id: string; action: 'CREATE_DRAFT' | 'CREATED_DRAFT' | 'SKIP_EXISTING'; verified: boolean }> = [];
  for (const product of products) {
    const id = String(product.id);
    const existing = options.db ? await options.db.collection('products').doc(id).get() : null;
    if (existing?.exists) { result.push({ id, action: 'SKIP_EXISTING', verified: true }); continue; }
    if (!options.execute) { result.push({ id, action: 'CREATE_DRAFT', verified: Boolean(options.db) }); continue; }
    try {
      // Existing admin create service owns validation, transaction, revision and audit.
      // Its transaction rejects a concurrent creator; never replace with set/merge.
      await createAdminProduct({ db: options.db, body: product, actorUid: options.actorUid! });
      result.push({ id, action: 'CREATED_DRAFT', verified: true });
    } catch (error) {
      if ((error as { code?: string }).code !== 'PRODUCT_ALREADY_EXISTS') throw error;
      result.push({ id, action: 'SKIP_EXISTING', verified: true });
    }
  }
  return { batch: manifest.batch, mode: options.execute ? 'EXECUTE_CREATE_ONLY' : options.db ? 'READ_ONLY_PLAN' : 'OFFLINE_PLAN_UNVERIFIED', items: result, reusedIds: manifest.reuseExistingIds };
}
