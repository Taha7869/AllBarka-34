/**
 * Browser-side review photo preparation:
 * - Decodes user-selected photo via createImageBitmap / HTMLImageElement (applies EXIF orientation)
 * - Resizes down to max 1200px longest side without upscaling
 * - Re-encodes via Canvas to WebP (stripping ALL EXIF / GPS / camera metadata client-side too)
 */

export const REVIEW_PHOTO_MAX_PX = 1200;
export const REVIEW_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export interface PreparedReviewPhoto {
  blob: Blob;
  mime: 'image/webp' | 'image/jpeg';
  base64: string;
  width: number;
  height: number;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error('PHOTO_READ_FAILED'));
    reader.readAsDataURL(blob);
  });
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('PHOTO_DECODE_FAILED'));
    };
    img.src = url;
  });
}

export async function prepareReviewPhoto(file: File): Promise<PreparedReviewPhoto> {
  if (!file || !/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
    throw new Error('INVALID_REVIEW_IMAGE_TYPE');
  }

  const img = await loadImageElement(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) throw new Error('PHOTO_DECODE_FAILED');

  const scale = Math.min(1, REVIEW_PHOTO_MAX_PX / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
  ctx.drawImage(img, 0, 0, width, height);

  const encode = (type: 'image/webp' | 'image/jpeg', quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, quality));

  let blob = await encode('image/webp', 0.84);
  let mime: 'image/webp' | 'image/jpeg' = 'image/webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await encode('image/jpeg', 0.86);
    mime = 'image/jpeg';
  }
  if (!blob) throw new Error('PHOTO_ENCODE_FAILED');
  if (blob.size > REVIEW_PHOTO_MAX_BYTES) {
    blob = await encode(mime, 0.7);
    if (!blob || blob.size > REVIEW_PHOTO_MAX_BYTES) {
      throw new Error('INVALID_REVIEW_IMAGE_SIZE');
    }
  }

  const base64 = await blobToBase64(blob);
  return { blob, mime, base64, width, height };
}
