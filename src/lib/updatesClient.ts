import { apiUrl } from './apiUrl';

export class UpdateRequestError extends Error { constructor(public code: string) { super(code); } }
export async function updatesRequest<T>(getToken: () => Promise<string>, path: string, options: { body?: Record<string, unknown>; signal?: AbortSignal } = {}): Promise<T> {
  if (!/^\/api\/updates(?:\/|$)/.test(path)) throw new UpdateRequestError('INVALID_PATH');
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  let rejectAbort: (reason: unknown) => void;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const fail = () => rejectAbort(new UpdateRequestError('REQUEST_FAILED'));
  controller.signal.addEventListener('abort', fail, { once: true });
  const timeout = setTimeout(abort, 12000);
  try {
    if (controller.signal.aborted) throw new UpdateRequestError('REQUEST_FAILED');
    const token = await Promise.race([getToken(), aborted]);
    const response = await Promise.race([fetch(apiUrl(path), { method: options.body ? 'POST' : 'GET', credentials: 'omit', cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined, signal: controller.signal }), aborted]);
    const data = await Promise.race([response.json(), aborted]);
    if (!response.ok) throw new UpdateRequestError(data.code || 'REQUEST_FAILED');
    return data;
  } catch (error) {
    if (error instanceof UpdateRequestError) throw error;
    throw new UpdateRequestError('REQUEST_FAILED');
  } finally { clearTimeout(timeout); controller.signal.removeEventListener('abort', fail); options.signal?.removeEventListener('abort', abort); }
}
