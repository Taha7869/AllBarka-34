import React, { useEffect, useMemo, useState } from 'react';
import { Eye, ShoppingBag, MessageSquareQuote, CreditCard, CheckCircle2, Bot } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { adminRequest } from '../lib/adminClient';
import type { DemandSummary } from '../lib/demandAnalytics';

type TopKey = 'product_view' | 'add_to_cart' | 'quote_request';
const PERIODS = [7, 30, 90] as const;
const METRICS = [
  { key: 'product_view', label: 'Product views', icon: Eye },
  { key: 'add_to_cart', label: 'Added to bag', icon: ShoppingBag },
  { key: 'quote_request', label: 'Quote requests', icon: MessageSquareQuote },
  { key: 'checkout_start', label: 'Checkouts started', icon: CreditCard },
  { key: 'order_placed', label: 'Orders placed', icon: CheckCircle2 },
  { key: 'ai_chat', label: 'AI chat replies', icon: Bot },
] as const;
const TOP_LISTS: Array<{ key: TopKey; title: string }> = [
  { key: 'product_view', title: 'Most viewed' },
  { key: 'add_to_cart', title: 'Most added to bag' },
  { key: 'quote_request', title: 'Most quoted' },
];

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 1000) / 10}%` : '—');

/** Owner view of anonymous demand counts. No visitor is identified; numbers are daily totals. */
export default function AdminDemandPanel() {
  const { currentUser } = useAuth();
  const products = useCatalogProducts();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [data, setData] = useState<DemandSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const names = useMemo(() => new Map(products.map(p => [p.id, p.name_en || p.name || p.id])), [products]);

  useEffect(() => {
    if (!currentUser) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    adminRequest<DemandSummary>(() => currentUser.getIdToken(), `/api/admin/analytics?days=${days}`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { if (!controller.signal.aborted) setError('Demand numbers could not be loaded. Refresh in a minute.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [currentUser, days]);

  const peak = Math.max(1, ...(data?.daily || []).map(d => d.product_view || 0));
  const totals = data?.totals;

  return (
    <div className="space-y-6" data-admin-demand>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-secondary)]">Anonymous daily counts from the website. No cookies, no visitor ids. Updated every minute.</p>
        <div role="group" aria-label="Period" className="flex gap-2">
          {PERIODS.map(p => (
            <button key={p} type="button" className={`admin-button ${days === p ? 'admin-button-primary' : ''}`} aria-pressed={days === p} onClick={() => setDays(p)}>
              Last {p} days
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <div className="admin-metrics" aria-busy={loading}>
        {METRICS.map(({ key, label, icon: Icon }) => (
          <section className="admin-metric" key={key}>
            <div><span>{label}</span><Icon size={18} aria-hidden="true" /></div>
            <strong>{loading || !totals ? '—' : totals[key].toLocaleString()}</strong>
          </section>
        ))}
      </div>

      {totals && !loading && (
        <p className="text-sm">
          Of every 100 product views, <strong>{pct(totals.add_to_cart, totals.product_view)}</strong> were added to the bag.
          {' '}Of checkouts started, <strong>{pct(totals.order_placed, totals.checkout_start)}</strong> became orders.
        </p>
      )}

      {data && data.daily.length > 0 && (
        <section aria-label="Daily product views">
          <h2 className="mb-3 font-serif text-lg">Daily product views</h2>
          <div className="flex h-32 items-end gap-[3px] overflow-x-auto rounded-xl border border-[var(--color-border)] p-3">
            {data.daily.map(d => (
              <div key={d.day} className="flex min-w-[8px] flex-1 flex-col items-center justify-end" title={`${d.day}: ${d.product_view || 0} views, ${d.order_placed || 0} orders`}>
                <div className="w-full rounded-t bg-[#8C6B1B]" style={{ height: `${Math.max(2, ((d.product_view || 0) / peak) * 100)}%` }} />
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{data.from} to {data.to}. Hover a bar for the day's views and orders.</p>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {TOP_LISTS.map(({ key, title }) => (
          <section key={key} className="rounded-xl border border-[var(--color-border)] p-4">
            <h2 className="mb-2 font-serif text-lg">{title}</h2>
            {!data || data.topProducts[key].length === 0
              ? <p className="text-sm text-[var(--color-text-secondary)]">{loading ? 'Loading…' : 'No data yet for this period.'}</p>
              : <ol className="space-y-1 text-sm">
                  {data.topProducts[key].map(row => (
                    <li key={row.productId} className="flex justify-between gap-3">
                      <span className="truncate" dir="auto">{names.get(row.productId) || row.productId}</span>
                      <strong>{row.count.toLocaleString()}</strong>
                    </li>
                  ))}
                </ol>}
          </section>
        ))}
      </div>
    </div>
  );
}
