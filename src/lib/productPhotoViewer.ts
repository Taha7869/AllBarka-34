export interface ProductPhoto {
  src: string;
  alt?: string;
}

export const PHOTO_ZOOM_LEVELS = [1, 1.5, 2] as const;

export function prepareProductPhotos(images: readonly ProductPhoto[], fallback: ProductPhoto): ProductPhoto[] {
  const seen = new Set<string>();
  const photos = images.filter(image => {
    if (!image || typeof image.src !== 'string' || !image.src.trim() || seen.has(image.src.trim())) return false;
    seen.add(image.src.trim());
    return true;
  }).slice(0, 24).map(image => ({ ...image, src: image.src.trim() }));
  return photos.length ? photos : [{ ...fallback, src: fallback.src || '/images/product-placeholder.svg' }];
}

export function clampPhotoIndex(index: number, count: number): number {
  if (!Number.isFinite(index) || !Number.isFinite(count) || count < 1) return 0;
  return Math.max(0, Math.min(Math.floor(count) - 1, Math.floor(index)));
}

export function nextPhotoIndex(index: number, step: number, count: number): number {
  if (!Number.isFinite(count) || count < 1) return 0;
  const total = Math.floor(count);
  const move = Number.isFinite(step) ? Math.trunc(step) : 0;
  return ((clampPhotoIndex(index, total) + move) % total + total) % total;
}

export function changePhotoZoom(zoom: number, direction: -1 | 1): number {
  const current = PHOTO_ZOOM_LEVELS.findIndex(value => value === zoom);
  const next = Math.max(0, Math.min(PHOTO_ZOOM_LEVELS.length - 1, (current < 0 ? 0 : current) + direction));
  return PHOTO_ZOOM_LEVELS[next];
}

/** Horizontal browsing is intentional; vertical movement, long holds and multitouch never change the photo. */
export function photoSwipeStep(start: { x: number; y: number; time: number }, end: { x: number; y: number; time: number }, touches: number, zoom: number): -1 | 0 | 1 {
  if (touches !== 1 || zoom !== 1) return 0;
  const values = [start.x, start.y, start.time, end.x, end.y, end.time];
  if (values.some(value => !Number.isFinite(value))) return 0;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const duration = end.time - start.time;
  if (duration < 0 || duration > 900 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}
