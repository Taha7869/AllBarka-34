import manifest from '../data/product-media.json';
import { getProductImages, isSingleImageCatalogProduct } from '../data/productImages';
import { PRODUCTS } from '../data/products';
import type { Product } from '../types';

export const MAX_PRODUCT_IMAGES = 12;
export const PRODUCT_MEDIA_URL_LIMIT = 2048;
const productIds = new Set(PRODUCTS.map(product => product.id));

export interface ProductMedia {
  /** The first photograph is the card cover and primary product photograph. */
  images: string[];
  videoUrl: string;
  videoPoster: string;
}

export interface ProductMediaRecord {
  productId: string;
  revision: number;
  updatedAt: string | null;
  override: ProductMedia | null;
  media: ProductMedia;
}

export type ProductMediaOverrides = Record<string, ProductMedia>;
export type ResolvedProductMedia = ProductMedia & { source: 'catalogue' | 'manifest' | 'override' };

export class ProductMediaError extends Error {
  constructor(public code: string, public httpStatus = 400) {
    super(code);
    this.name = 'ProductMediaError';
  }
}

export function isProductMediaId(value: unknown): value is string {
  return typeof value === 'string' && productIds.has(value);
}

function isPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!host.includes('.') || host.includes(':') || host.includes('[')
    || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid|example)$/.test(host)) return false;
  // URL normalizes alternate IPv4 spellings (decimal, hex and short forms) before this check.
  if (/^\d+(?:\.\d+){3}$/.test(host)) {
    const [a, b] = host.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168))
      || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0)) return false;
  }
  return true;
}

/** Passive browser media only. This never downloads, proxies or probes an owner-supplied URL. */
export function validateProductMediaUrl(value: unknown, kind: 'image' | 'video', optional = false): string {
  if (typeof value !== 'string') throw new ProductMediaError('INVALID_MEDIA_URL');
  const url = value.trim();
  if (!url && optional) return '';
  if (!url || url.length > PRODUCT_MEDIA_URL_LIMIT || /[\s\\\u0000-\u001f\u007f]/.test(url)) throw new ProductMediaError('INVALID_MEDIA_URL');
  if (url.startsWith('/')) {
    const prefix = kind === 'video' ? '/videos/' : '/images/';
    const extension = kind === 'video' ? /\.(?:mp4|webm)$/i : /\.(?:jpe?g|png|webp|avif|gif|svg)$/i;
    if (!url.startsWith(prefix) || !/^\/[a-zA-Z0-9_./-]+$/.test(url) || url.includes('//')
      || url.split('/').some(segment => segment === '.' || segment === '..') || !extension.test(url)) {
      throw new ProductMediaError('INVALID_MEDIA_URL');
    }
    return url;
  }
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new ProductMediaError('INVALID_MEDIA_URL'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || (parsed.port && parsed.port !== '443')
    || parsed.hash || !isPublicHost(parsed.hostname)) throw new ProductMediaError('INVALID_MEDIA_URL');
  // Videos must be directly playable assets, rather than an embed/watch page.
  if (kind === 'video' && !/\.(?:mp4|webm)$/i.test(parsed.pathname)) throw new ProductMediaError('INVALID_MEDIA_VIDEO');
  return parsed.href;
}

export function validateProductMedia(value: unknown): ProductMedia {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProductMediaError('INVALID_MEDIA');
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !['images', 'videoUrl', 'videoPoster'].includes(key))) throw new ProductMediaError('INVALID_MEDIA');
  if (!Array.isArray(input.images) || input.images.length < 1 || input.images.length > MAX_PRODUCT_IMAGES) throw new ProductMediaError('INVALID_MEDIA_IMAGES');
  const images = input.images.map(image => validateProductMediaUrl(image, 'image'));
  if (new Set(images).size !== images.length) throw new ProductMediaError('DUPLICATE_MEDIA_IMAGE');
  const videoUrl = validateProductMediaUrl(input.videoUrl ?? '', 'video', true);
  const videoPoster = validateProductMediaUrl(input.videoPoster ?? '', 'image', true);
  if (!videoUrl && videoPoster) throw new ProductMediaError('MEDIA_POSTER_REQUIRES_VIDEO');
  return { images, videoUrl, videoPoster };
}

export function sanitizeProductMediaOverrides(value: unknown): ProductMediaOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output: ProductMediaOverrides = {};
  for (const [id, input] of Object.entries(value)) {
    if (!isProductMediaId(id)) continue;
    try { output[id] = validateProductMedia(input); } catch { /* Ignore a malformed stored override and retain the catalogue. */ }
  }
  return output;
}

function applyCatalogImagePolicy(product: Product, media: ProductMedia): ProductMedia {
  if (!isSingleImageCatalogProduct(product)) return media;
  // A previously saved two-view override must not reintroduce the retired SVG.
  const retired = `/images/products/${product.id}-secondary.svg`;
  const cover = media.images.find(image => image !== retired) || product.image!;
  return { ...media, images: [cover], videoPoster: media.videoPoster === retired ? cover : media.videoPoster };
}

export function resolveProductMedia(product: Product, overrides: ProductMediaOverrides = {}): ResolvedProductMedia {
  const override = overrides[product.id];
  if (override) {
    try { return { ...applyCatalogImagePolicy(product, validateProductMedia(override)), source: 'override' }; } catch { /* Safe fallback. */ }
  }
  const configured = (manifest as Record<string, unknown>)[product.id];
  if (configured) {
    try { return { ...applyCatalogImagePolicy(product, validateProductMedia(configured)), source: 'manifest' }; } catch { /* Safe fallback. */ }
  }
  return { images: getProductImages(product), videoUrl: '', videoPoster: '', source: 'catalogue' };
}

export function getDefaultProductMedia(product: Product): ProductMedia {
  const { images, videoUrl, videoPoster } = resolveProductMedia(product);
  return { images, videoUrl, videoPoster };
}

export function validateMediaPatch(body: unknown): { expectedRevision: number; media: ProductMedia | null } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ProductMediaError('INVALID_MEDIA');
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some(key => !['expectedRevision', 'media'].includes(key))) throw new ProductMediaError('INVALID_MEDIA');
  if (!Number.isSafeInteger(input.expectedRevision) || (input.expectedRevision as number) < 0) throw new ProductMediaError('INVALID_MEDIA_REVISION');
  return { expectedRevision: input.expectedRevision as number, media: input.media === null ? null : validateProductMedia(input.media) };
}
