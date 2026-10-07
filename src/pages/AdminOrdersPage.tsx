import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpRight, Bell, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Copy, CreditCard, Eye, LayoutDashboard, LockKeyhole, Package, Printer, RefreshCw, Search, ShieldCheck, Truck, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { useAdminLanguage } from '../hooks/useAdminLanguage';
import { AllBarkaCrestVector } from '../components/AllBarkaLogo';
import AdminCatalogPanel from '../components/AdminCatalogPanel';
import AdminUpdatesPanel from '../components/AdminUpdatesPanel';
import AdminInquiriesPanel from '../components/AdminInquiriesPanel';
import { adminRequest, AdminRequestError } from '../lib/adminClient';
import { adminPhoneHref, createAdminCsv, formatAdminCurrency, formatAdminDate, isAdminQuoteRequest, formatAdminOrderTotal, adminEditableStatuses, adminEditablePaymentStatuses, adminPromoNotes } from '../lib/adminPresentation';
import { acquireScrollLock } from '../utils/scrollLock';
import type { CanonicalOrder, OrderStatus, PaymentStatus } from '../lib/serverOrderService';
import { PRODUCTS } from '../data/products';
import { getLocalized } from '../utils/localize';
import { resolveHamper } from '../lib/hamperCatalog';
import '../styles/admin.css';

const STATUSES: OrderStatus[] = ['ORDER_RECEIVED', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'QUOTE_REQUESTED'];
const PAYMENTS: PaymentStatus[] = ['UNPAID', 'PAID', 'REFUNDED', 'NOT_REQUIRED'];
export type AdminOrderSummary = CanonicalOrder;
type Audit = { timestamp?: number; timestampIso?: string; actorEmail?: string; reason?: string; previousStatus?: string; newStatus?: string; previousPaymentStatus?: string; newPaymentStatus?: string; action?: string; note?: string };
type OrderDetail = { order: AdminOrderSummary; audits: Audit[] };
type Ledger = {
  orders: AdminOrderSummary[]; page: number; totalCount: number; totalPages: number; asOf: string; scannedCount: number; truncated: boolean;
  metrics: { count: number; activeCount: number; deliveredCount: number; cancelledCount: number; orderValue: number; paidValue: number; unpaidValue: number; bankPendingCount: number; statusCounts: Partial<Record<OrderStatus, number>> };
};
type Tab = 'overview' | 'orders' | 'catalogue' | 'updates' | 'inquiries';
type Mutation = { type: 'status' | 'payment'; target: string };

function hamperPackingDetails(item: CanonicalOrder['items'][number], language: LanguageCode, t: (key: string) => string) {
  if (item.productId !== 'custom-hamper') return null;
  const hamper = resolveHamper(item.hamperConfiguration);
  if (!hamper) return null;
  const configuration = hamper.configuration;
  return <div className="admin-hamper-details" dir="auto"><strong>{t('admin.hamper.contents')}</strong><ul>{configuration.selections.map(id => <li key={id}>{getLocalized(PRODUCTS.find(product => product.id === id), 'name', language)} <bdi>— 200g</bdi></li>)}</ul>
    {configuration.recipientName && <p><strong>{t('admin.hamper.recipient')}: </strong>{configuration.recipientName}</p>}
    {configuration.giftMessage && <p className="admin-hamper-message"><strong>{t('admin.detail.message')}: </strong>{configuration.giftMessage}</p>}
  </div>;
}

function OrderBadge({ value, payment = false }: { value: string; payment?: boolean }) {
  const { t } = useAdminLanguage();
  const tone = ['DELIVERED', 'PAID'].includes(value) ? 'success' : ['CANCELLED', 'REFUNDED'].includes(value) ? 'muted' : ['DISPATCHED', 'OUT_FOR_DELIVERY'].includes(value) ? 'transit' : 'pending';
  return <span className={`admin-badge admin-badge-${tone}`} dir="auto">{t(`admin.${payment ? 'payment' : 'status'}.${value}`, value)}</span>;
}

/** One focus-managed dialog for details and print; private records stay in memory. */
function AdminDialog({ title, children, onClose, busy = false, packing = false }: { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean; packing?: boolean }) {
  const { t } = useAdminLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose; busyRef.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const release = acquireScrollLock();
    const root = document.getElementById('root');
    const previousInert = root?.inert ?? false;
    if (root) root.inert = true;
    const frame = requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('button')?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || []).filter(el => el.getClientRects().length);
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !ref.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !ref.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', keydown); release(); if (root) root.inert = previousInert; if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div className="admin-dialog-backdrop" data-admin-dialog data-admin-packing={packing ? 'true' : undefined} dir="ltr" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="admin-dialog-panel">
      <header className="admin-dialog-header"><div><p className="admin-eyebrow">AllBarka</p><h2 id={titleId} dir="auto">{title}</h2></div><button type="button" className="admin-icon-button admin-dialog-close" aria-label={t('admin.close')} disabled={busy} onClick={onClose}><X size={20} /></button></header>
      {children}
    </div>
  </div>, document.body);
}

function PackingPreview({ orders, onClose }: { orders: AdminOrderSummary[]; onClose: () => void }) {
  const { t, language } = useAdminLanguage();
  return <AdminDialog title={t('admin.packingTitle')} onClose={onClose} packing>
    <div className="admin-print-actions"><p dir="auto">{t('admin.printHint')}</p><button type="button" className="admin-button admin-button-primary" onClick={() => window.print()}><Printer size={16} />{t('admin.printSelected')}</button></div>
    <div className="admin-print-packet">{orders.map(order => <article className="admin-packing-sheet" key={order.orderId}>
      <header><div><p className="admin-eyebrow">AllBarka · {t('admin.packing')}</p><h3>{order.orderId}</h3><p>{formatAdminDate(order.createdAt, language)}</p></div><OrderBadge value={order.status} /></header>
      <div className="admin-packing-customer"><h4 dir="auto">{order.customer.name}</h4><p><bdi>{order.customer.phone}</bdi></p><p dir="auto">{order.customer.address}, {order.customer.city}</p><p dir="auto">{t('admin.detail.deliverySlot')}: {order.customer.deliverySlot || '—'}</p>{order.deliverySchedule?.scheduledDeliveryDate && <p>{t('admin.detail.deliveryDate')}: <bdi>{order.deliverySchedule.scheduledDeliveryDate}</bdi></p>}</div>
      {isAdminQuoteRequest(order) && <p className="admin-packing-note" dir="auto">{t('admin.quote.notice')}</p>}{adminPromoNotes(order, t).map((text, index) => <p className="admin-packing-note" dir="auto" key={`promo-${index}`}>{text}</p>)}<table><thead><tr><th>{t('admin.table.items')}</th><th>{t('selectWeight')}</th><th>{t('quantity')}</th><th>{t('admin.table.total')}</th></tr></thead><tbody>{order.items.map((item, index) => <tr key={`${item.id}-${index}`}><td dir="auto">{item.name}{hamperPackingDetails(item, language, t)}</td><td><bdi>{item.selectedWeight}</bdi></td><td>□ {item.quantity}</td><td><bdi>{isAdminQuoteRequest(order) ? '—' : formatAdminCurrency(item.price * item.quantity)}</bdi></td></tr>)}</tbody></table>
      {typeof order.totals.shippingWeightGrams === 'number' && <p dir="auto">{t('admin.detail.shippingWeight')}: <bdi>{order.totals.shippingWeightGrams / 1000}kg</bdi>{order.totals.shippingRegion && <> · {t(`admin.shippingRegion.${order.totals.shippingRegion}`)}</>}</p>}
      {order.customer.instructions && <p className="admin-packing-note" dir="auto"><strong>{t('admin.detail.instructions')}: </strong>{order.customer.instructions}</p>}
      <p dir="auto">{order.gifting?.giftWrapping ? t('admin.detail.giftWrap') : t('admin.detail.noGiftWrap')}</p>
      {order.gifting?.giftMessage && <p className="admin-packing-note" dir="auto"><strong>{t('admin.detail.message')}: </strong>{order.gifting.giftMessage}</p>}
      <footer><span dir="auto">{t(`admin.method.${order.paymentMethod}`)} · {t(`admin.payment.${order.paymentStatus}`)}</span><strong><bdi>{formatAdminOrderTotal(order, t)}</bdi></strong></footer>
    </article>)}</div>
  </AdminDialog>;
}

export default function AdminOrdersPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { t, language, setLanguage } = useAdminLanguage();
  const { t: updateT } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab: Tab = ['catalogue', 'orders', 'updates', 'inquiries'].includes(params.get('view') || '') ? params.get('view') as Tab : 'overview';
  const status = STATUSES.includes(params.get('status') as OrderStatus) ? params.get('status')! : 'ALL';
  const payment = PAYMENTS.includes(params.get('paymentStatus') as PaymentStatus) ? params.get('paymentStatus')! : 'ALL';
  const method = ['cod', 'bank', 'quote'].includes(params.get('paymentMethod') || '') ? params.get('paymentMethod')! : 'ALL';
  const range = ['today', '7d', '30d'].includes(params.get('range') || '') ? params.get('range')! : 'all';
  const queue = ['new', 'packing', 'transit', 'bank-pending'].includes(params.get('queue') || '') ? params.get('queue')! : 'all';
  // Customer search terms stay in memory rather than the browser's address/history.
  const [search, setSearch] = useState('');
  const rawPage = Number(params.get('page') || '1');
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
  const [searchDraft, setSearchDraft] = useState(search);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [accessRefresh, setAccessRefresh] = useState(0);
  const [accessError, setAccessError] = useState('');
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selection, setSelection] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [mutation, setMutation] = useState<Mutation | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [exporting, setExporting] = useState(false);
  const [packingOrders, setPackingOrders] = useState<AdminOrderSummary[]>([]);
  const alive = useRef(true);
  const mutationController = useRef<AbortController | null>(null);
  const exportController = useRef<AbortController | null>(null);
  const sessionUid = useRef(currentUser?.uid);
  sessionUid.current = currentUser?.uid;
  const listQuery = new URLSearchParams({ page: String(page), limit: '20', status, paymentStatus: payment, paymentMethod: method, range, search, queue }).toString();

  useEffect(() => { alive.current = true; return () => { alive.current = false; mutationController.current?.abort(); exportController.current?.abort(); }; }, []);
  useEffect(() => { setSearchDraft(search); }, [search]);
  useEffect(() => {
    let active = true;
    setIsAdmin(null); setAccessError(''); setLedger(null); setSelectedId(null); setPackingOrders([]); setSelection([]);
    mutationController.current?.abort(); exportController.current?.abort(); setBusy(false); setExporting(false);
    if (!currentUser) { setIsAdmin(false); return; }
    let timeout: ReturnType<typeof setTimeout>;
    Promise.race([currentUser.getIdTokenResult(accessRefresh > 0), new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new AdminRequestError('REQUEST_TIMEOUT')), 12000);
    })]).then(result => {
      if (active) setIsAdmin(result.claims.admin === true || result.claims.role === 'admin');
    }).catch(failure => { if (active) { setIsAdmin(false); setAccessError(failure instanceof AdminRequestError ? failure.code : 'REQUEST_FAILED'); } }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); };
  }, [currentUser, accessRefresh]);
  useEffect(() => {
    if (!currentUser || isAdmin !== true) return;
    if (tab === 'catalogue' || tab === 'updates' || tab === 'inquiries') { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(''); setSelection([]);
    adminRequest<Ledger>(() => currentUser.getIdToken(), `/api/admin/orders?${listQuery}`, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setLedger(data);
    }).catch((failure: AdminRequestError) => {
      if (!controller.signal.aborted) { setError(failure.code); setLedger(null); if (failure.status === 401 || failure.status === 403) setIsAdmin(false); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [currentUser, isAdmin, listQuery, refresh, tab]);
  useEffect(() => { setDetail(null); setDetailError(''); setFeedback(''); setMutation(null); setNote(''); setReason(''); }, [selectedId]);
  useEffect(() => {
    setDetailError('');
    if (!selectedId || !currentUser || isAdmin !== true) return;
    const controller = new AbortController();
    setDetailLoading(true);
    adminRequest<OrderDetail>(() => currentUser.getIdToken(), `/api/admin/orders/${encodeURIComponent(selectedId)}`, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setDetail(data);
    }).catch((failure: AdminRequestError) => {
      if (!controller.signal.aborted) { setDetailError(failure.code); if (failure.status === 401 || failure.status === 403) setIsAdmin(false); }
    }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedId, currentUser, isAdmin, detailRefresh]);
  useEffect(() => {
    // Protect indexing during client navigation too; the server also disallows /admin.
    const previousTitle = document.title;
    document.title = `${t('admin.workspace')} · AllBarka`;
    const existing = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const meta = existing || document.createElement('meta'); const previous = existing?.content;
    meta.name = 'robots'; meta.content = 'noindex, nofollow'; if (!existing) document.head.appendChild(meta);
    return () => { document.title = previousTitle; if (!existing) meta.remove(); else meta.content = previous || ''; };
  }, [t]);

  const changeFilters = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) { if (key === 'search') { setSearch(value.slice(0, 120)); next.delete(key); continue; } if (!value || value === 'ALL' || value === 'all') next.delete(key); else next.set(key, value); }
    if (!Object.hasOwn(changes, 'page')) next.delete('page');
    setParams(next, { replace: true }); setSelection([]); setFeedback('');
  };
  const errorMessage = (code: string) => t(`admin.errors.${code}`, t('admin.errors.REQUEST_FAILED'));
  const doMutation = async (body: Record<string, unknown>, endpoint: string) => {
    if (!detail || !currentUser || busy) return;
    const uid = currentUser.uid;
    const id = detail.order.orderId;
    const controller = new AbortController(); mutationController.current = controller;
    setBusy(true); setDetailError(''); setFeedback('');
    try {
      const data = await adminRequest<{ order: AdminOrderSummary }>(() => currentUser.getIdToken(), `/api/admin/orders/${encodeURIComponent(id)}/${endpoint}`, { body, signal: controller.signal });
      if (!alive.current || controller.signal.aborted || sessionUid.current !== uid) return;
      setDetail(previous => previous ? { ...previous, order: data.order } : previous);
      if (endpoint === 'notes') setNote('');
      else { setMutation(null); setReason(''); }
      setFeedback(t('admin.detail.saved'));
      setRefresh(value => value + 1); setDetailRefresh(value => value + 1);
    } catch (failure) {
      if (!alive.current || controller.signal.aborted || sessionUid.current !== uid) return;
      const requestError = failure as AdminRequestError;
      setDetailError(requestError.code);
      if (requestError.status === 401 || requestError.status === 403) setIsAdmin(false);
      // Keep failed drafts visible. Explicit refresh obtains the current server revision.
    } finally { if (alive.current && !controller.signal.aborted && sessionUid.current === uid) setBusy(false); }
  };
  const exportOrders = async () => {
    if (!currentUser || exporting) return;
    const uid = currentUser.uid;
    const controller = new AbortController(); exportController.current = controller;
    setExporting(true); setFeedback('');
    try {
      const data = await adminRequest<{ orders: AdminOrderSummary[]; truncated: boolean }>(() => currentUser.getIdToken(), `/api/admin/orders/export?${listQuery}`, { signal: controller.signal });
      if (!alive.current || controller.signal.aborted || sessionUid.current !== uid) return;
      const headers = ['admin.table.order', 'admin.table.date', 'admin.status', 'admin.payment', 'admin.method', 'admin.table.customer', 'admin.csv.phone', 'admin.csv.address', 'admin.csv.city', 'admin.table.items', 'admin.detail.subtotal', 'admin.detail.discount', 'admin.detail.shipping', 'admin.detail.giftFee', 'admin.table.total'].map(key => t(key));
      const csv = createAdminCsv(headers, data.orders.map(order => [order.orderId, order.createdAt, t(`admin.status.${order.status}`), t(`admin.payment.${order.paymentStatus}`), t(`admin.method.${order.paymentMethod}`), order.customer.name, order.customer.phone, order.customer.address, order.customer.city, [order.items.map(item => `${item.name} (${item.selectedWeight}) × ${item.quantity}`).join(' | '), ...adminPromoNotes(order, t)].join(' | '), order.totals.subtotal, order.totals.discount, order.totals.shipping, order.totals.giftWrapFee, order.totals.total]));
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `allbarka-orders-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback(data.truncated ? t('admin.scanLimited') : t('admin.exportComplete'));
    } catch (failure) { if (!controller.signal.aborted && sessionUid.current === uid && alive.current) { const e = failure as AdminRequestError; setFeedback(errorMessage(e.code)); if (e.status === 401 || e.status === 403) setIsAdmin(false); } }
    finally { if (!controller.signal.aborted && sessionUid.current === uid && alive.current) setExporting(false); }
  };
  const copyOrder = async () => {
    if (!detail) return;
    try { await navigator.clipboard.writeText(detail.order.orderId); setFeedback(t('admin.copied')); }
    catch { setFeedback(t('admin.errors.REQUEST_FAILED')); }
  };

  const languageSelect = <label className="admin-language"><span className="sr-only">{t('languageSelector')}</span><select value={language} onChange={event => setLanguage(event.target.value as LanguageCode)}><option value="en">English</option><option value="ur">اردو</option><option value="ar">العربية</option></select></label>;
  if (authLoading || isAdmin === null) return <div className="admin-access" dir="ltr"><RefreshCw size={24} className="admin-loading-spin" /><p role="status" dir="auto">{t('admin.checking')}</p></div>;
  if (!currentUser || !isAdmin) return <div className="admin-access" dir="ltr"><section className="admin-access-card"><div className="admin-access-crest"><AllBarkaCrestVector /></div><p className="admin-eyebrow" dir="auto">{t('admin.operations')}</p><h1 dir="auto">{t('admin.workspace')}</h1><div className="admin-access-rule" /><LockKeyhole size={22} /><h2 dir="auto">{t(accessError ? 'admin.unavailable' : currentUser ? 'admin.accessRestricted' : 'admin.signIn')}</h2><p dir="auto">{accessError ? errorMessage(accessError) : t(currentUser ? 'admin.accessHint' : 'admin.signInHint')}</p>{currentUser && <p className="admin-account"><bdi>{currentUser.email || currentUser.phoneNumber}</bdi></p>}<button type="button" className="admin-button admin-button-primary" onClick={() => currentUser ? setAccessRefresh(value => value + 1) : window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signin' } }))}>{t(currentUser ? 'admin.refreshAccess' : 'admin.signIn')}</button><div className="admin-access-footer">{languageSelect}<Link className="admin-button" to="/">{t('admin.returnStore')}<ArrowUpRight size={16} /></Link></div></section></div>;

  const rows = ledger?.orders || [];
  const metrics = ledger?.metrics;
  const currentOrder = detail?.order;
  const selectedRows = rows.filter(order => selection.includes(order.orderId));
  const allSelected = rows.length > 0 && selection.length === rows.length;
  const filters = <div className="admin-filters">
    <form className="admin-search" onSubmit={event => { event.preventDefault(); changeFilters({ search: searchDraft.trim() }); }}><Search size={17} aria-hidden="true" /><label htmlFor="admin-order-search" className="sr-only">{t('admin.search')}</label><input id="admin-order-search" type="search" maxLength={120} dir="auto" value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder={t('admin.searchHint')} /><button type="submit" className="admin-icon-button" aria-label={t('admin.search')}><ArrowUpRight size={17} /></button></form>
    {([
      ['status', status, 'admin.status', [['ALL', 'admin.all'], ...STATUSES.map(value => [value, `admin.status.${value}`])]],
      ['paymentStatus', payment, 'admin.payment', [['ALL', 'admin.all'], ...PAYMENTS.map(value => [value, `admin.payment.${value}`])]],
      ['paymentMethod', method, 'admin.method', [['ALL', 'admin.all'], ['cod', 'admin.method.cod'], ['bank', 'admin.method.bank'], ['quote', 'admin.method.quote']]],
      ['range', range, 'admin.range', [['all', 'admin.all'], ['today', 'admin.today'], ['7d', 'admin.sevenDays'], ['30d', 'admin.thirtyDays']]],
    ] as [string, string, string, string[][]][]).map(([key, value, label, options]) => <label className="admin-filter" key={key}><span dir="auto">{t(label)}</span><select dir="auto" aria-label={t(label)} value={value} onChange={event => changeFilters({ [key]: event.target.value, queue: 'all' })}>{options.map(([option, text]) => <option value={option} key={option}>{t(text)}</option>)}</select></label>)}
  </div>;

  return <div className="admin-workspace" dir="ltr">
    <aside className="admin-sidebar"><div className="admin-sidebar-brand"><AllBarkaCrestVector className="w-9 h-12" /><div><strong>AllBarka</strong><p dir="auto">{t('admin.operations')}</p></div></div>
      <nav aria-label={t('admin.workspace')}>{([{ key: 'overview', icon: LayoutDashboard }, { key: 'orders', icon: ClipboardList }, { key: 'catalogue', icon: Package }, { key: 'updates', icon: Bell }, { key: 'inquiries', icon: ShieldCheck }] as const).map(({ key, icon: Icon }) => <button type="button" key={key} aria-current={tab === key ? 'page' : undefined} className={tab === key ? 'active' : ''} onClick={() => changeFilters({ view: key })}><Icon size={18} /><span dir="auto">{key === 'updates' ? updateT('updates.adminTitle') : key === 'inquiries' ? 'Inquiries' : t(`admin.${key}`)}</span>{key === 'orders' && metrics && <span className="admin-nav-count">{metrics.count}</span>}</button>)}</nav>
      <div className="admin-sidebar-bottom"><ShieldCheck size={21} /><strong dir="auto">{t('admin.security')}</strong><p dir="auto">{t('admin.privacy')}</p><bdi>{currentUser.email || currentUser.phoneNumber}</bdi><Link to="/" className="admin-store-link"><span dir="auto">{t('admin.returnStore')}</span><ArrowUpRight size={16} /></Link></div>
    </aside>
    <div className="admin-main">
      <header className="admin-page-heading"><div><p className="admin-eyebrow" dir="auto">{t('admin.workspace')}</p><h1 dir="auto">{tab === 'updates' ? updateT('updates.adminTitle') : tab === 'inquiries' ? 'Inquiries' : t(`admin.${tab}`)}</h1><p dir="auto">{tab === 'updates' ? updateT('updates.adminHint') : tab === 'inquiries' ? 'Manage customer inquiries and contact requests' : t(tab === 'catalogue' ? 'admin.catalog.hint' : tab === 'orders' ? 'admin.ordersHint' : 'admin.overviewHint')}</p></div><div className="admin-heading-actions">{languageSelect}{tab !== 'catalogue' && tab !== 'updates' && tab !== 'inquiries' && <button type="button" className="admin-button" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} className={loading ? 'admin-loading-spin' : ''} /><span dir="auto">{t('admin.refresh')}</span></button>}</div></header>
      {tab === 'catalogue' ? <AdminCatalogPanel /> : tab === 'updates' ? <AdminUpdatesPanel /> : tab === 'inquiries' ? <AdminInquiriesPanel /> : <>
        {filters}
        <div className="admin-sync-line"><span dir="auto">{t('admin.filteredScope')}</span><span dir="auto">{ledger?.asOf ? t('admin.lastSynced').replace('{time}', formatAdminDate(ledger.asOf, language)) : '—'}</span></div>
        {queue !== 'all' && <div className="admin-queue-filter"><span dir="auto">{t(`admin.queue.${queue === 'bank-pending' ? 'payments' : queue}`)}</span><button type="button" className="admin-icon-button" aria-label={t('admin.clearQueue')} onClick={() => changeFilters({ queue: 'all' })}><X size={15} /></button></div>}
        {error && <div role="alert" className="admin-notice admin-notice-error"><span dir="auto">{errorMessage(error)}</span><button type="button" className="admin-button" onClick={() => setRefresh(value => value + 1)}>{t('admin.retry')}</button></div>}
        {ledger?.truncated && <p className="admin-notice" role="status" dir="auto">{t('admin.scanLimited')}</p>}
        <div className="admin-metrics" aria-busy={loading}>{[
          { label: 'orderCount', value: metrics?.count, icon: ClipboardList, money: false },
          { label: 'active', value: metrics?.activeCount, icon: Package, money: false },
          { label: 'orderValue', value: metrics?.orderValue, icon: CreditCard, money: true },
          { label: 'paid', value: metrics?.paidValue, icon: CheckCircle2, money: true },
        ].map(({ label, value, icon: Icon, money }) => <section className={`admin-metric ${loading ? 'admin-metric-loading' : ''}`} key={label}><div><span dir="auto">{t(`admin.metrics.${label}`)}</span><Icon size={18} /></div><strong><bdi>{loading || value === undefined ? '—' : money ? formatAdminCurrency(value) : value.toLocaleString('en-PK')}</bdi></strong></section>)}</div>
        <p className="admin-metrics-hint" dir="auto">{t('admin.metricsHint')}</p>
        {tab === 'overview' && <>
          <section className="admin-section admin-pipeline"><div className="admin-section-heading"><div><p className="admin-eyebrow" dir="auto">{t('admin.operations')}</p><h2 dir="auto">{t('admin.pipeline')}</h2></div><span className="admin-badge admin-badge-success"><ShieldCheck size={13} />{t('admin.security')}</span></div><div className="admin-pipeline-grid">{STATUSES.map((value, index) => <button type="button" key={value} onClick={() => changeFilters({ view: 'orders', status: value, queue: 'all' })} disabled={loading || !ledger}><span className="admin-stage-number">{String(index + 1).padStart(2, '0')}</span><strong>{loading || !metrics ? '—' : metrics.statusCounts[value] || 0}</strong><span dir="auto">{t(`admin.status.${value}`)}</span></button>)}</div></section>
          <section className="admin-queues"><div className="admin-section-heading"><div><h2 dir="auto">{t('admin.queueHint')}</h2><p dir="auto">{t('admin.filteredScope')}</p></div></div><div className="admin-queue-grid">{[
            { label: 'new', count: metrics?.statusCounts.ORDER_RECEIVED || 0, status: 'ORDER_RECEIVED', icon: ClipboardList },
            { label: 'packing', count: metrics?.statusCounts.PREPARING || 0, status: 'PREPARING', icon: Package },
            { label: 'transit', count: (metrics?.statusCounts.DISPATCHED || 0) + (metrics?.statusCounts.OUT_FOR_DELIVERY || 0), status: 'DISPATCHED', icon: Truck },
            { label: 'payments', count: metrics?.bankPendingCount || 0, status: 'ALL', icon: CreditCard },
          ].map(({ label, count, icon: Icon }) => <button type="button" key={label} className="admin-queue" disabled={loading || !ledger} onClick={() => changeFilters({ view: 'orders', queue: label === 'payments' ? 'bank-pending' : label })}><Icon size={20} /><div><span dir="auto">{t(`admin.queue.${label}`)}</span><strong>{loading || !metrics ? '—' : count}</strong></div><ArrowUpRight size={17} /></button>)}</div></section>
        </>}
        <section className="admin-section admin-ledger" aria-busy={loading}><div className="admin-section-heading"><div><h2 dir="auto">{t('admin.orders')}</h2><p dir="auto">{ledger ? t('admin.showing').replace('{count}', String(ledger.totalCount)) : t(loading ? 'admin.checking' : 'admin.unavailable')}</p></div><button type="button" className="admin-button" onClick={exportOrders} disabled={loading || exporting || !rows.length}><ArrowDownToLine size={16} /><span dir="auto">{t(exporting ? 'admin.exporting' : 'admin.export')}</span></button></div>
          <p className="admin-export-hint" dir="auto">{t('admin.exportWarning')}</p>
          {!!selection.length && <div className="admin-selection-bar" role="status"><span dir="auto">{t('admin.selected').replace('{count}', String(selection.length))}</span><div><button type="button" className="admin-button" onClick={() => setPackingOrders(selectedRows)}><Printer size={16} />{t('admin.packing')}</button><button type="button" className="admin-button" onClick={() => setSelection([])}>{t('admin.clearSelection')}</button></div></div>}
          {loading ? <div className="admin-ledger-loading" role="status"><RefreshCw className="admin-loading-spin" size={22} /><span dir="auto">{t('admin.checking')}</span></div> : !rows.length ? <div className="admin-empty"><Package size={30} /><h3 dir="auto">{t(error ? 'admin.unavailable' : 'admin.table.empty')}</h3><p dir="auto">{t(error ? 'admin.errors.REQUEST_FAILED' : 'admin.table.emptyHint')}</p></div> : <>
            <div className="admin-table-wrap"><table className="admin-order-table"><caption className="sr-only">{t('admin.orders')}</caption><thead><tr><th><label className="admin-check-label"><input type="checkbox" checked={allSelected} onChange={event => setSelection(event.target.checked ? rows.map(order => order.orderId) : [])} aria-label={t('admin.selectPage')} /></label></th><th scope="col">{t('admin.table.order')}</th><th scope="col">{t('admin.table.customer')}</th><th scope="col">{t('admin.status')}</th><th scope="col">{t('admin.payment')}</th><th scope="col">{t('admin.table.total')}</th><th scope="col"><span className="sr-only">{t('admin.table.action')}</span></th></tr></thead><tbody>{rows.map(order => <tr key={order.orderId} data-selected={selection.includes(order.orderId)}><td><label className="admin-check-label"><input type="checkbox" aria-label={`${t('admin.table.order')} ${order.orderId}`} checked={selection.includes(order.orderId)} onChange={event => setSelection(previous => event.target.checked ? [...previous, order.orderId] : previous.filter(id => id !== order.orderId))} /></label></td><td><button type="button" className="admin-order-link" onClick={() => setSelectedId(order.orderId)}>{order.orderId}</button><small>{formatAdminDate(order.createdAt, language)}</small><small dir="auto">{order.items.reduce((sum, item) => sum + item.quantity, 0)} {t('admin.table.items')}</small></td><td><strong dir="auto">{order.customer.name}</strong><small dir="auto">{order.customer.city}</small><small><bdi>{order.customer.phone}</bdi></small></td><td><OrderBadge value={order.status} /></td><td><OrderBadge payment value={order.paymentStatus} /><small dir="auto">{t(`admin.method.${order.paymentMethod}`)}</small></td><td><bdi className="admin-table-amount">{formatAdminOrderTotal(order, t)}</bdi></td><td><button type="button" className="admin-icon-button" aria-label={`${t('admin.table.action')} ${order.orderId}`} onClick={() => setSelectedId(order.orderId)}><Eye size={18} /></button></td></tr>)}</tbody></table></div>
            <div className="admin-mobile-orders">{rows.map(order => <article key={order.orderId} className="admin-mobile-order"><div><label className="admin-check-label"><input type="checkbox" aria-label={`${t('admin.table.order')} ${order.orderId}`} checked={selection.includes(order.orderId)} onChange={event => setSelection(previous => event.target.checked ? [...previous, order.orderId] : previous.filter(id => id !== order.orderId))} /></label><button type="button" className="admin-order-link" onClick={() => setSelectedId(order.orderId)}>{order.orderId}</button><button type="button" className="admin-icon-button" aria-label={`${t('admin.table.action')} ${order.orderId}`} onClick={() => setSelectedId(order.orderId)}><ArrowUpRight size={18} /></button></div><h3 dir="auto">{order.customer.name}</h3><p dir="auto">{order.customer.city} · <bdi>{formatAdminDate(order.createdAt, language)}</bdi></p><footer><div><OrderBadge value={order.status} /><OrderBadge payment value={order.paymentStatus} /></div><strong><bdi>{formatAdminOrderTotal(order, t)}</bdi></strong></footer></article>)}</div>
          </>}
          <footer className="admin-pagination"><span dir="auto">{ledger ? t('admin.page').replace('{page}', String(ledger.page)).replace('{total}', String(ledger.totalPages)) : '—'}</span><div><button type="button" aria-label={t('admin.previousPage')} className="admin-icon-button" disabled={loading || (ledger?.page || page) <= 1} onClick={() => changeFilters({ page: String((ledger?.page || page) - 1) })}><ChevronLeft size={18} /></button><button type="button" aria-label={t('admin.nextPage')} className="admin-icon-button" disabled={loading || !ledger || ledger.page >= ledger.totalPages} onClick={() => changeFilters({ page: String((ledger?.page || page) + 1) })}><ChevronRight size={18} /></button></div></footer>
        </section>
        {!!feedback && !selectedId && <p className="admin-notice" role="status" dir="auto">{feedback}</p>}
      </>}
    </div>
    {selectedId && <AdminDialog title={selectedId} onClose={() => setSelectedId(null)} busy={busy}>
      <div className="admin-detail-body">
        {detailError && <div role="alert" className="admin-notice admin-notice-error"><p dir="auto">{errorMessage(detailError)}</p><button type="button" disabled={busy} className="admin-button" onClick={() => setDetailRefresh(value => value + 1)}><RefreshCw size={15} />{t('admin.detail.retry')}</button></div>}
        {detailLoading ? <p role="status" className="admin-ledger-loading" dir="auto">{t('admin.detail.loading')}</p> : currentOrder && <>
          <div className="admin-detail-toolbar"><div><OrderBadge value={currentOrder.status} /><OrderBadge payment value={currentOrder.paymentStatus} /></div><div><button type="button" className="admin-button" onClick={copyOrder}><Copy size={15} />{t('admin.copy')}</button><button type="button" className="admin-button" disabled={busy} onClick={() => { setPackingOrders([currentOrder]); setSelectedId(null); }}><Printer size={15} />{t('admin.packing')}</button></div></div>
          {isAdminQuoteRequest(currentOrder) && <p className="admin-notice" dir="auto">{t('admin.quote.notice')}</p>}{!!currentOrder.promoCode && <section className="admin-detail-card"><h3 dir="auto">{t('admin.detail.promo')}</h3>{adminPromoNotes(currentOrder, t).map((text, index) => <p key={index} dir="auto">{text}</p>)}</section>}<div className="admin-detail-grid"><section className="admin-detail-card"><h3 dir="auto">{t('admin.detail.customer')}</h3><strong dir="auto">{currentOrder.customer.name}</strong>{adminPhoneHref(currentOrder.customer.phone) ? <a className="admin-phone" href={adminPhoneHref(currentOrder.customer.phone)!}><bdi>{currentOrder.customer.phone}</bdi><ArrowUpRight size={14} /></a> : <p><bdi>{currentOrder.customer.phone}</bdi></p>}<p dir="auto">{currentOrder.customer.address}</p><p dir="auto">{currentOrder.customer.city}</p></section><section className="admin-detail-card"><h3 dir="auto">{t('admin.detail.delivery')}</h3><p><span dir="auto">{t('admin.detail.deliveryDate')}</span><strong><bdi>{currentOrder.deliverySchedule?.scheduledDeliveryDate || '—'}</bdi></strong></p><p dir="auto">{currentOrder.customer.deliverySlot || '—'}</p>{currentOrder.customer.instructions && <div className="admin-detail-note" dir="auto">{currentOrder.customer.instructions}</div>}</section></div>
          <section className="admin-detail-card"><h3 dir="auto">{t('admin.table.items')}</h3><div className="admin-detail-items">{currentOrder.items.map((item, index) => <div key={`${item.id}-${index}`}><div><strong dir="auto">{item.name}</strong><span><bdi>{item.selectedWeight} × {item.quantity}</bdi></span>{hamperPackingDetails(item, language, t)}</div><bdi>{isAdminQuoteRequest(currentOrder) ? '—' : formatAdminCurrency(item.price * item.quantity)}</bdi></div>)}</div>{!isAdminQuoteRequest(currentOrder) && <dl className="admin-total-breakdown">{(['subtotal', 'discount', 'shipping', 'giftWrapFee'] as const).map(key => <div key={key}><dt dir="auto">{t(`admin.detail.${key === 'giftWrapFee' ? 'giftFee' : key}`)}</dt><dd><bdi>{key === 'discount' ? '− ' : ''}{formatAdminCurrency(currentOrder.totals[key])}</bdi></dd></div>)}{typeof currentOrder.totals.shippingWeightGrams === 'number' && <div><dt dir="auto">{t('admin.detail.shippingWeight')}</dt><dd><bdi>{currentOrder.totals.shippingWeightGrams / 1000}kg</bdi></dd></div>}{currentOrder.totals.shippingRegion && <div><dt dir="auto">{t('admin.detail.shippingRegion')}</dt><dd dir="auto">{t(`admin.shippingRegion.${currentOrder.totals.shippingRegion}`)}</dd></div>}<div className="admin-total-final"><dt dir="auto">{t('admin.table.total')}</dt><dd><bdi>{formatAdminOrderTotal(currentOrder, t)}</bdi></dd></div></dl>}</section>
          {currentOrder.gifting?.giftWrapping && <section className="admin-detail-card"><h3 dir="auto">{t('admin.detail.gifting')}</h3><p dir="auto">{t('admin.detail.giftWrap')}</p>{currentOrder.gifting.giftMessage && <blockquote dir="auto">{currentOrder.gifting.giftMessage}</blockquote>}</section>}
          <div className="admin-detail-grid"><section className="admin-detail-card"><h3 dir="auto">{t('admin.detail.changeStatus')}</h3><label className="admin-field"><span className="sr-only">{t('admin.status')}</span><select dir="auto" disabled={busy} value={mutation?.type === 'status' ? mutation.target : currentOrder.status} onChange={event => { setMutation(event.target.value === currentOrder.status ? null : { type: 'status', target: event.target.value }); setReason(''); }}>{adminEditableStatuses(currentOrder, STATUSES).map(value => <option value={value} key={value}>{t(`admin.status.${value}`)}</option>)}</select></label></section><section className="admin-detail-card"><h3 dir="auto">{t('admin.detail.paymentRecording')}</h3><p dir="auto">{t(`admin.method.${currentOrder.paymentMethod}`)}</p><label className="admin-field"><span className="sr-only">{t('admin.payment')}</span><select dir="auto" disabled={busy || isAdminQuoteRequest(currentOrder)} value={mutation?.type === 'payment' ? mutation.target : currentOrder.paymentStatus} onChange={event => { setMutation(event.target.value === currentOrder.paymentStatus ? null : { type: 'payment', target: event.target.value }); setReason(''); }}>{adminEditablePaymentStatuses(currentOrder, PAYMENTS).map(value => <option value={value} key={value}>{t(`admin.payment.${value}`)}</option>)}</select></label></section></div>
          <p className="admin-bookkeeping-hint" dir="auto">{t('admin.bookkeepingHint')}</p>
          {mutation && <form className="admin-mutation-form" onSubmit={event => { event.preventDefault(); const body = mutation.type === 'status' ? { status: mutation.target, expectedStatus: currentOrder.status, expectedUpdatedAt: currentOrder.updatedAt, reason: reason.trim() } : { paymentStatus: mutation.target, expectedPaymentStatus: currentOrder.paymentStatus, expectedUpdatedAt: currentOrder.updatedAt, reason: reason.trim() }; void doMutation(body, mutation.type); }}><p dir="auto"><strong>{t(mutation.type === 'status' ? 'admin.detail.changeStatus' : 'admin.detail.changePayment')}</strong> · {t(`admin.${mutation.type}.${mutation.type === 'status' ? currentOrder.status : currentOrder.paymentStatus}`)} → {t(`admin.${mutation.type}.${mutation.target}`)}</p><label className="admin-field"><span dir="auto">{t('admin.reasonRequired')}</span><textarea required minLength={3} maxLength={500} rows={2} dir="auto" value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label><div className="admin-form-actions"><button type="button" className="admin-button" disabled={busy} onClick={() => setMutation(null)}>{t('admin.cancel')}</button><button type="submit" className="admin-button admin-button-primary" disabled={busy || reason.trim().length < 3}><Check size={16} />{t(busy ? 'admin.saving' : 'admin.save')}</button></div></form>}
          <section className="admin-detail-card"><h3 dir="auto">{t('admin.detail.note')}</h3><p className="admin-bookkeeping-hint" dir="auto">{t('admin.detail.noteHint')}</p><form onSubmit={event => { event.preventDefault(); void doMutation({ note: note.trim(), expectedUpdatedAt: currentOrder.updatedAt }, 'notes'); }}><label className="admin-field"><span className="sr-only">{t('admin.detail.note')}</span><textarea rows={3} maxLength={1000} dir="auto" value={note} disabled={busy} onChange={event => setNote(event.target.value)} /></label><div className="admin-form-actions"><span>{note.length}/1000</span><button type="submit" className="admin-button" disabled={busy || note.trim().length < 1}><Check size={16} />{t(busy ? 'admin.saving' : 'admin.save')}</button></div></form><div className="admin-note-list">{currentOrder.adminNoteEntries?.slice().reverse().map(entry => <article key={entry.id}><p dir="auto">{entry.text}</p><small><bdi>{entry.actorEmail}</bdi> · {formatAdminDate(entry.timestampIso || entry.timestamp, language)}</small></article>)}{currentOrder.adminNotes?.map((text, index) => <article key={`legacy-${index}`}><p dir="auto">{text}</p><small dir="auto">{t('admin.detail.legacyNote')}</small></article>)}{!currentOrder.adminNoteEntries?.length && !currentOrder.adminNotes?.length && <p className="admin-muted" dir="auto">{t('admin.detail.notesEmpty')}</p>}</div></section>
          <section className="admin-detail-card"><h3 dir="auto">{t('admin.detail.audit')}</h3><ol className="admin-audit-list">{detail.audits.map((entry, index) => <li key={`${entry.timestamp}-${index}`}><span className="admin-audit-dot" /><div><p>{entry.newStatus ? <><span dir="auto">{t(`admin.status.${entry.previousStatus}`)}</span> → <span dir="auto">{t(`admin.status.${entry.newStatus}`)}</span></> : entry.newPaymentStatus ? <><span dir="auto">{t(`admin.payment.${entry.previousPaymentStatus}`)}</span> → <span dir="auto">{t(`admin.payment.${entry.newPaymentStatus}`)}</span></> : <span dir="auto">{t('admin.detail.note')}</span>}</p>{(entry.reason || entry.note) && <p className="admin-muted" dir="auto">{entry.reason || entry.note}</p>}<small><bdi>{entry.actorEmail || '—'}</bdi> · {formatAdminDate(entry.timestampIso || entry.timestamp, language)}</small></div></li>)}</ol>{!detail.audits.length && <p className="admin-muted" dir="auto">{t('admin.detail.auditEmpty')}</p>}</section>
        </>}
        {feedback && <p className="admin-notice" role="status" dir="auto">{feedback}</p>}
      </div>
    </AdminDialog>}
    {!!packingOrders.length && <PackingPreview orders={packingOrders} onClose={() => setPackingOrders([])} />}
  </div>;
}
