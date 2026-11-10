import { FOOD_CATEGORIES, COMMERCIAL_COLLECTIONS, OCCASION_TAGS } from '../config/categories';
import { isMeasurementUnit, validateProductAttributes, type MeasurementUnit, type ProductAttribute, type ProductCommerce } from './productCommerce';
import { ValidationError } from './validationError';

export interface CatalogTemplate {
  id: string;
  name_en: string; name_ur: string; name_ar: string;
  kind: ProductCommerce['kind'];
  defaultCategory: string;
  defaultUnit: MeasurementUnit;
  archived: boolean;
  attributes: Omit<ProductAttribute, 'value'>[];
}
export interface TaxonomyEntry {
  id: string;
  type: 'category' | 'collection' | 'occasion';
  name_en: string; name_ur: string; name_ar: string;
  description_en: string; description_ur: string; description_ar: string;
  visible: boolean;
}
export interface CatalogConfiguration {
  version: 1;
  revision: number;
  templates: CatalogTemplate[];
  taxonomy: TaxonomyEntry[];
}
export const DEFAULT_CATALOG_CONFIGURATION: CatalogConfiguration = {
  version: 1, revision: 0,
  templates: [
    { id: 'food', name_en: 'Food by weight', name_ur: 'وزن کے حساب سے خوراک', name_ar: 'غذاء حسب الوزن', kind: 'food', defaultCategory: 'dry-fruits', defaultUnit: 'g', archived: false, attributes: [] },
    { id: 'liquid', name_en: 'Oil or liquid', name_ur: 'تیل یا مائع', name_ar: 'زيت أو سائل', kind: 'liquid', defaultCategory: 'oils', defaultUnit: 'ml', archived: false, attributes: [] },
    { id: 'packaging', name_en: 'Celebration packaging', name_ur: 'تقریبات کی پیکنگ', name_ar: 'تغليف المناسبات', kind: 'packaging', defaultCategory: 'celebration-boxes', defaultUnit: 'piece', archived: false, attributes: [] },
    { id: 'gift', name_en: 'Gift or hamper', name_ur: 'تحفہ یا ہیمپر', name_ar: 'هدية أو سلة', kind: 'gift', defaultCategory: 'gift-boxes', defaultUnit: 'pack', archived: false, attributes: [] },
  ],
  taxonomy: [
    ...Object.values(FOOD_CATEGORIES).map(c => ({ id: c.id, type: 'category' as const, name_en: c.name,
      name_ur: c.id === 'saunf' ? 'سونف اور مکھواس' : '', name_ar: c.id === 'saunf' ? 'الشمر ومعطرات الفم' : '',
      description_en: c.description,
      description_ur: c.id === 'saunf' ? 'سادہ سونف، چینی لگی رنگین سونف اور روایتی مکھواس۔' : '',
      description_ar: c.id === 'saunf' ? 'بذور شمر سادة ومغلّفة بالسكر ومزيج تقليدي لما بعد الطعام.' : '', visible: true })),
    ...Object.values(COMMERCIAL_COLLECTIONS).map(c => ({ id: c.id === 'combos' ? 'gift-boxes' : c.id, type: 'collection' as const,
      name_en: c.name, name_ur: '', name_ar: '', description_en: c.description, description_ur: '', description_ar: '', visible: true })),
    ...OCCASION_TAGS.map(c => ({ id: c.id, type: 'occasion' as const, name_en: c.name, name_ur: '', name_ar: '',
      description_en: '', description_ur: '', description_ar: '', visible: true })),
  ],
};
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const invalid = (code: string): never => { throw new ValidationError(code, code); };
const text = (v: unknown, maximum = 160) => {
  if (typeof v !== 'string' || v.length > maximum) return invalid('INVALID_CONFIGURATION_TEXT');
  return v.trim();
};
const id = (v: unknown) => {
  if (typeof v !== 'string' || !/^[a-z][a-z0-9_-]{0,79}$/.test(v) || ['constructor', 'prototype', '__proto__', 'all'].includes(v)) return invalid('INVALID_CONFIGURATION_ID');
  return v;
};
export function validateCatalogConfiguration(value: unknown): CatalogConfiguration {
  if (!object(value) || value.version !== 1 || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0
    || !Array.isArray(value.templates) || value.templates.length > 50 || !Array.isArray(value.taxonomy) || value.taxonomy.length > 150) return invalid('INVALID_CATALOG_CONFIGURATION');
  const keys = new Set<string>();
  const taxonomy = value.taxonomy.map((raw): TaxonomyEntry => {
    if (!object(raw) || !['category', 'collection', 'occasion'].includes(String(raw.type)) || typeof raw.visible !== 'boolean') return invalid('INVALID_TAXONOMY');
    const entryId = id(raw.id), key = `${raw.type}:${entryId}`;
    if (keys.has(key)) return invalid('DUPLICATE_TAXONOMY');
    keys.add(key);
    const name_en = text(raw.name_en);
    if (!name_en) return invalid('CONFIGURATION_NAME_REQUIRED');
    return { id: entryId, type: raw.type as TaxonomyEntry['type'], name_en, name_ur: text(raw.name_ur ?? ''), name_ar: text(raw.name_ar ?? ''),
      description_en: text(raw.description_en ?? '', 2000), description_ur: text(raw.description_ur ?? '', 2000), description_ar: text(raw.description_ar ?? '', 2000), visible: raw.visible };
  });
  const templates = value.templates.map((raw): CatalogTemplate => {
    if (!object(raw) || !['food', 'liquid', 'packaging', 'gift'].includes(String(raw.kind)) || !isMeasurementUnit(raw.defaultUnit)
      || typeof raw.archived !== 'boolean' || !Array.isArray(raw.attributes)) return invalid('INVALID_TEMPLATE');
    const entryId = id(raw.id);
    if (keys.has(`template:${entryId}`)) return invalid('DUPLICATE_TEMPLATE');
    keys.add(`template:${entryId}`);
    const name_en = text(raw.name_en);
    if (!name_en) return invalid('CONFIGURATION_NAME_REQUIRED');
    const attributes = validateProductAttributes(raw.attributes.map(a => object(a) ? { ...a, value: '' } : a)).map(({ value: _value, ...definition }) => definition);
    return { id: entryId, name_en, name_ur: text(raw.name_ur ?? ''), name_ar: text(raw.name_ar ?? ''),
      kind: raw.kind as CatalogTemplate['kind'], defaultCategory: id(raw.defaultCategory), defaultUnit: raw.defaultUnit,
      archived: raw.archived, attributes };
  });
  return { version: 1, revision: value.revision as number, templates, taxonomy };
}
