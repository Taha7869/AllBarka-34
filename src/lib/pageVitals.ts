/** Numeric-only document measurements. No performance URLs, DOM targets or form values leave this module. */
export function createLayoutShiftAccumulator() {
  let max = 0, session = 0, start = 0, previous = 0;
  return { add(entry: { value: number; startTime: number; hadRecentInput?: boolean }) {
    if (entry.hadRecentInput || !Number.isFinite(entry.value) || entry.value < 0 || !Number.isFinite(entry.startTime) || entry.startTime < previous) return max;
    if (session && entry.startTime - previous < 1000 && entry.startTime - start < 5000) session += entry.value;
    else { session = entry.value; start = entry.startTime; }
    previous = entry.startTime; max = Math.max(max, session); return max;
  }, value: () => max };
}
export function observePageVitals(report: (name: 'LCP' | 'CLS', value: number) => void) {
  if (typeof PerformanceObserver === 'undefined' || typeof document === 'undefined') return () => {};
  const observers: PerformanceObserver[] = []; const cls = createLayoutShiftAccumulator(); let lcp = 0, sent = false;
  const listen = (type: string, callback: (entries: any[]) => void) => { if (!PerformanceObserver.supportedEntryTypes.includes(type)) return; try { const observer = new PerformanceObserver(list => callback(list.getEntries())); observer.observe({ type, buffered: true }); observers.push(observer); } catch { /* Older engines keep shopping functional. */ } };
  listen('largest-contentful-paint', entries => { for (const entry of entries) if (Number.isFinite(entry.startTime)) lcp = Math.max(lcp, entry.startTime); });
  listen('layout-shift', entries => { for (const entry of entries) cls.add(entry); });
  const flush = () => { if (sent) return; for (const observer of observers) { for (const entry of observer.takeRecords() as any[]) { if (entry.entryType === 'layout-shift') cls.add(entry); if (entry.entryType === 'largest-contentful-paint') lcp = Math.max(lcp, entry.startTime); } } sent = true; if (lcp > 0) report('LCP', lcp); report('CLS', cls.value()); };
  const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
  document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', flush);
  return () => { observers.forEach(observer => observer.disconnect()); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', flush); };
}
