/** One deadline includes token acquisition, fetch headers and response-body parsing. */
export async function withApiDeadline<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number, externalSignal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const cancelled = new DOMException('The request deadline expired or was cancelled.', 'AbortError');
  let rejectAbort: (error: DOMException) => void = () => {};
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const rejectRequest = () => rejectAbort(cancelled);
  const abort = () => controller.abort();
  controller.signal.addEventListener('abort', rejectRequest, { once: true });
  externalSignal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    if (externalSignal?.aborted) throw cancelled;
    return await Promise.race([operation(controller.signal), aborted]);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abort);
    controller.signal.removeEventListener('abort', rejectRequest);
  }
}
