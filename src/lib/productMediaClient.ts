import { apiUrl } from './apiUrl';
import { ProductMediaError, validateProductMedia, type ProductMediaRecord } from './productMedia';

export async function requestProductMedia(
  getToken: () => Promise<string>, productId: string,
  options: { signal?: AbortSignal; patch?: { expectedRevision: number; media: unknown }; timeoutMs?: number } = {},
): Promise<ProductMediaRecord> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) cancel();
  let timedOut = false;
  let rejectAborted: (error: ProductMediaError) => void = () => {};
  const aborted = new Promise<never>((_, reject) => { rejectAborted = reject; });
  const rejectRequest = () => rejectAborted(new ProductMediaError(timedOut ? 'MEDIA_REQUEST_TIMEOUT' : 'MEDIA_REQUEST_CANCELLED', 0));
  controller.signal.addEventListener('abort', rejectRequest, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 18_000);
  try {
    if (controller.signal.aborted) throw new ProductMediaError('MEDIA_REQUEST_CANCELLED', 0);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ProductMediaError('MEDIA_OFFLINE', 0);
    const token = await Promise.race([Promise.resolve().then(getToken), aborted]);
    const response = await Promise.race([fetch(apiUrl(`/api/admin/product-media/${encodeURIComponent(productId)}`), {
      method: options.patch ? 'PATCH' : 'GET', signal: controller.signal, credentials: 'omit', cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(options.patch ? { 'Content-Type': 'application/json' } : {}) },
      body: options.patch ? JSON.stringify(options.patch) : undefined,
    }), aborted]);
    const data = await Promise.race([response.json(), aborted]);
    if (!response.ok) throw new ProductMediaError(typeof data.code === 'string' ? data.code : 'MEDIA_REQUEST_FAILED', response.status);
    const record = data.record;
    if (!record || record.productId !== productId || !Number.isSafeInteger(record.revision) || record.revision < 0) throw new ProductMediaError('MEDIA_REQUEST_FAILED');
    return { productId, revision: record.revision, updatedAt: record.updatedAt ?? null,
      media: validateProductMedia(record.media), override: record.override === null ? null : validateProductMedia(record.override) };
  } catch (error) {
    if (error instanceof ProductMediaError) throw error;
    throw new ProductMediaError('MEDIA_REQUEST_FAILED', 0);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', rejectRequest);
  }
}
