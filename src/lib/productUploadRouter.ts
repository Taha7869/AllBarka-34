import { Router, raw, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import type { Bucket } from '@google-cloud/storage';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Accept only raster formats with their matching signature, never SVG/HTML. */
export function uploadImageType(bytes: Buffer, mime: string): 'jpg' | 'png' | 'webp' {
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) throw new Error('INVALID_UPLOAD_SIZE');
  if (mime === 'image/jpeg' && bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) return 'jpg';
  if (mime === 'image/png' && bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0 && bytes.readUInt32BE(16) <= 12000 && bytes.readUInt32BE(20) <= 12000) return 'png';
  if (mime === 'image/webp' && bytes.length >= 20 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP'
    && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii',12,16)) && bytes.readUInt32LE(4) === bytes.length - 8) return 'webp';
  throw new Error('INVALID_UPLOAD_TYPE');
}
export function createProductUploadRouter(options: { requireAdmin: RequestHandler; getBucket: () => Bucket | null }) {
  const router = Router();
  router.post('/api/admin/catalog/uploads', options.requireAdmin, raw({ type: ['image/jpeg','image/png','image/webp'], limit: MAX_UPLOAD_BYTES }), async (request, response) => {
    response.setHeader('Cache-Control','no-store');
    if (!Buffer.isBuffer(request.body)) return response.status(400).json({ code:'INVALID_UPLOAD_TYPE' });
    let extension: string;
    try { extension = uploadImageType(request.body, request.get('Content-Type')?.split(';')[0] || ''); }
    catch (error) { return response.status(400).json({ code:(error as Error).message }); }
    try {
      const bucket = options.getBucket();
      if (!bucket) return response.status(503).json({ code:'MEDIA_STORAGE_UNAVAILABLE' });
      const token = randomUUID();
      const key = `catalog-uploads/${randomUUID()}.${extension}`;
      await bucket.file(key).save(request.body, { resumable:false, validation:'crc32c', metadata: {
        contentType: request.get('Content-Type')!.split(';')[0], cacheControl:'public, max-age=31536000, immutable',
        metadata: { firebaseStorageDownloadTokens:token },
      } });
      return response.status(201).json({ url:`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(key)}?alt=media&token=${token}` });
    } catch { return response.status(503).json({ code:'MEDIA_STORAGE_UNAVAILABLE' }); }
  });
  router.use((error: any, _request: any, response: any, next: any) => {
    if (error?.type === 'entity.too.large') return response.status(413).json({ code:'INVALID_UPLOAD_SIZE' });
    return next(error);
  });
  return router;
}
