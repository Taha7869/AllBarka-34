import type { Product } from '../types';
import { PRODUCTS } from '../data/products';

export interface WaProductRow {
  product_id: string;
  base_product_id: string;
  name: string;
  name_ur: string;
  category: string;
  unit: 'weight' | 'bottle' | 'piece';
  weight_g: number;
  price: number;
  wholesale_per_kg: number;
  stock_qty: number;
  aliases: string;
  active: boolean;
}

function slugifyVariant(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'default';
}

function parseVariantWeightGrams(product: Product, label: string): number {
  if (product.shippingWeights && typeof product.shippingWeights[label] === 'number' && product.shippingWeights[label] > 0) {
    return product.shippingWeights[label];
  }
  const simple = /^(\d+(?:\.\d+)?)\s*(kg|g|ml)$/i.exec(label.trim());
  if (simple) {
    const val = Number(simple[1]);
    const unit = simple[2].toLowerCase();
    return Math.round(unit === 'kg' ? val * 1000 : val);
  }
  const pack = /^(\d+)x(\d+)g$/i.exec(label.trim());
  if (pack) {
    return Number(pack[1]) * Number(pack[2]);
  }
  if (typeof product.shippingWeightG === 'number' && product.shippingWeightG > 0) {
    return product.shippingWeightG;
  }
  return 500;
}

function resolveWaCategory(product: Product): string {
  if (product.isBidBox) return 'bid-boxes';
  if (product.category === 'bundles' || product.isBundle) return 'bundles';
  return product.category;
}

function resolveWaUnit(product: Product, label: string): 'weight' | 'bottle' | 'piece' {
  if (product.category === 'oils' || /ml$/i.test(label.trim())) return 'bottle';
  if (
    product.isBidBox ||
    product.isBundle ||
    product.category === 'bundles' ||
    product.category === 'gift-boxes' ||
    /^(Empty|Filled|Bundle|Combo)/i.test(label.trim())
  ) {
    return 'piece';
  }
  return 'weight';
}

export function buildWaProductRows(catalogProducts: Product[] = PRODUCTS): WaProductRow[] {
  const rows: WaProductRow[] = [];

  for (const product of catalogProducts) {
    const active = product.active !== false && (product as any).inStock !== false;
    const stockQty = !active
      ? 0
      : typeof (product as any).stockQty === 'number'
      ? Math.max(0, (product as any).stockQty)
      : 100;
    const category = resolveWaCategory(product);
    const displayName = product.name_en || (product as any).name || product.id;
    const aliases = Array.from(
      new Set(
        [
          product.id,
          product.name_en,
          (product as any).name,
          product.name_ur,
          ...(product.keywords || []),
        ]
          .map(s => String(s || '').trim())
          .filter(Boolean)
      )
    ).join(', ');

    const entries = Object.entries(product.prices || {});
    if (entries.length === 0) {
      rows.push({
        product_id: product.id,
        base_product_id: product.id,
        name: displayName,
        name_ur: product.name_ur || '',
        category,
        unit: 'piece',
        weight_g: product.shippingWeightG || 1000,
        price: (product as any).price || 0,
        wholesale_per_kg: product.wholesale || 0,
        stock_qty: stockQty,
        aliases,
        active,
      });
      continue;
    }

    for (const [label, price] of entries) {
      const variantSlug = slugifyVariant(label);
      const isSingleDefault = entries.length === 1 && (label === 'Bundle' || label === 'Combo (500g + 500g)');
      const productId = isSingleDefault ? product.id : `${product.id}-${variantSlug}`;
      const unit = resolveWaUnit(product, label);
      const weightG = parseVariantWeightGrams(product, label);

      rows.push({
        product_id: productId,
        base_product_id: product.id,
        name: entries.length === 1 ? displayName : `${displayName} (${label})`,
        name_ur: product.name_ur || '',
        category,
        unit,
        weight_g: weightG,
        price: Number(price) || 0,
        wholesale_per_kg: product.wholesale || 0,
        stock_qty: stockQty,
        aliases,
        active,
      });
    }
  }

  return rows;
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeWaProductsCsv(rows: WaProductRow[]): string {
  const headers: (keyof WaProductRow)[] = [
    'product_id',
    'base_product_id',
    'name',
    'name_ur',
    'category',
    'unit',
    'weight_g',
    'price',
    'wholesale_per_kg',
    'stock_qty',
    'aliases',
    'active',
  ];
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escapeCsvCell(row[h])).join(',')),
  ];
  return lines.join('\n') + '\n';
}
