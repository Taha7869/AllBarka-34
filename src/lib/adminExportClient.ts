import { withApiDeadline } from './apiDeadline';
import { apiUrl } from './apiUrl';
import { AdminRequestError } from './adminClient';

export const MAX_ADMIN_EXPORT_BYTES = 50 * 1024 * 1024;
/** Stream into a bounded browser download; aborts on navigation/cancellation and rejects incomplete responses. */
export async function downloadAdminOrdersCsv(getToken: () => Promise<string>, query: string, signal?: AbortSignal): Promise<Blob> {
  try {
    return await withApiDeadline(async deadlineSignal => {
      const token = await getToken();
      if (!token || deadlineSignal.aborted) throw new AdminRequestError('UNAUTHORIZED', 401);
      const response = await fetch(apiUrl(`/api/admin/orders/export.csv?${query}`), { headers: { Authorization: `Bearer ${token}`, Accept: 'text/csv' },
        signal: deadlineSignal, cache: 'no-store', credentials: 'omit' });
      if (!response.ok) {
        let data: any = null; try { data = await response.json(); } catch { /* Provider HTML never enters a download. */ }
        throw new AdminRequestError(data?.code || 'REQUEST_FAILED', response.status);
      }
      if (!response.headers.get('content-type')?.startsWith('text/csv') || !response.body) throw new AdminRequestError('INVALID_EXPORT');
      const reader = response.body.getReader(); const chunks: Uint8Array<ArrayBuffer>[] = []; let size = 0;
      const abort = () => { void reader.cancel().catch(() => undefined); };
      deadlineSignal.addEventListener('abort', abort, { once: true });
      try {
        while (true) {
          const result = await reader.read(); if (result.done) break;
          size += result.value.byteLength;
          if (size > MAX_ADMIN_EXPORT_BYTES) { await reader.cancel(); throw new AdminRequestError('EXPORT_TOO_LARGE'); }
          chunks.push(new Uint8Array(result.value));
        }
        if (deadlineSignal.aborted) throw new AdminRequestError('REQUEST_CANCELLED');
      } finally { deadlineSignal.removeEventListener('abort', abort); reader.releaseLock(); }
      return new Blob(chunks, { type: 'text/csv;charset=utf-8' });
    }, 180000, signal);
  } catch (error) {
    if (error instanceof AdminRequestError) throw error;
    throw new AdminRequestError(signal?.aborted ? 'REQUEST_CANCELLED' : (error as any)?.name === 'AbortError' ? 'REQUEST_TIMEOUT' : 'REQUEST_FAILED');
  }
}
