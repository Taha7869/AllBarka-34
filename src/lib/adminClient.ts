import { apiUrl } from './apiUrl';

export class AdminRequestError extends Error {
  constructor(public code: string, public status = 0) {
    super(code);
    this.name = 'AdminRequestError';
  }
}

/** Authenticated, bounded requests. Customer records never go into browser storage. */
export async function adminRequest<T>(
  getToken: () => Promise<string>,
  path: string,
  options: { signal?: AbortSignal; body?: Record<string, unknown>; timeoutMs?: number } = {},
): Promise<T> {
  if (!path.startsWith('/api/admin/')) throw new AdminRequestError('INVALID_PATH');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AdminRequestError('OFFLINE');
  if (options.signal?.aborted) throw new AdminRequestError('REQUEST_CANCELLED');
  const controller = new AbortController();
  let timedOut = false;
  let rejectAbort: ((error: AdminRequestError) => void) | undefined;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const abortRequest = () => rejectAbort?.(new AdminRequestError('REQUEST_TIMEOUT'));
  controller.signal.addEventListener('abort', abortRequest, { once: true });
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 18000);
  try {
    // Include authentication in the deadline; do not let a stalled token refresh hang the panel.
    const token = await Promise.race([Promise.resolve().then(getToken), aborted]);
    if (controller.signal.aborted) throw new AdminRequestError('REQUEST_TIMEOUT');
    const response = await Promise.race([fetch(apiUrl(path), {
      method: options.body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'omit',
    }), aborted]);
    const data = await Promise.race([response.json(), aborted]);
    if (!response.ok) throw new AdminRequestError(typeof data.code === 'string' ? data.code : 'REQUEST_FAILED', response.status);
    return data as T;
  } catch (error) {
    if (timedOut) throw new AdminRequestError('REQUEST_TIMEOUT');
    if (error instanceof AdminRequestError) throw error;
    throw new AdminRequestError('REQUEST_FAILED');
  } finally {
    clearTimeout(timer);
    controller.signal.removeEventListener('abort', abortRequest);
    options.signal?.removeEventListener('abort', abort);
  }
}
