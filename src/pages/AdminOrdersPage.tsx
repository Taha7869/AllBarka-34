import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  Eye,
  ArrowUpDown,
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatPKR } from '../lib/pricing';

export interface AdminOrderSummary {
  orderId: string;
  createdAt: string;
  status: 'NEW' | 'CONFIRMED' | 'PREPARING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  paymentMethod: 'cod' | 'bank';
  customer: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    giftWrapFee: number;
    total: number;
  };
  items: Array<{
    name: string;
    selectedWeight?: string;
    quantity: number;
    price: number;
  }>;
  claimedAt?: number | null;
  adminNotes?: string[];
}

export default function AdminOrdersPage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderSummary | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin status via token custom claims
  useEffect(() => {
    async function verifyAdminClaim() {
      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        const idTokenResult = await currentUser.getIdTokenResult();
        const hasAdmin = Boolean(idTokenResult.claims.admin || idTokenResult.claims.role === 'admin');
        setIsAdmin(hasAdmin);
      } catch (e) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }
    verifyAdminClaim();
  }, [currentUser]);

  // Fetch orders from server API
  const fetchOrders = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        }
      });

      if (!res.ok) {
        if (res.status === 403) {
          setIsAdmin(false);
          throw new Error('You do not possess verified boutique administrative credentials.');
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve administrative orders ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin, page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleInitiateStatusChange = (newStatus: string) => {
    setTargetStatus(newStatus);
    setStatusReason('');
    setShowConfirmModal(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedOrder || !targetStatus || !currentUser) return;
    setStatusUpdating(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/admin/orders/${selectedOrder.orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          expectedStatus: selectedOrder.status,
          reason: statusReason.trim() || 'Admin manual status transition'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order status');
      }

      // Update local state
      setSelectedOrder(prev => prev ? { ...prev, status: targetStatus as any } : null);
      setOrders(prev => prev.map(o => o.orderId === selectedOrder.orderId ? { ...o, status: targetStatus as any } : o));
      setShowConfirmModal(false);
    } catch (err: any) {
      alert(`Status transition failed: ${err.message}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F6F1EA]">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#FFFCF7] border border-[#C7982F]/20 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#C7982F]/10 flex items-center justify-center text-[#806326] mb-4">
            <Lock size={26} />
          </div>
          <h1 className="font-serif text-2xl text-[#042821] font-semibold mb-2">Patron Sign-In Required</h1>
          <p className="text-sm text-[#29231D]/80 leading-relaxed mb-6">
            Please sign in with your verified AllBarka administrative credentials to access the orders ledger.
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signin' } }))}
            className="w-full py-3 px-5 rounded-xl bg-[#042821] text-white font-medium text-sm hover:bg-[#06382e] transition-colors"
          >
            Sign In with Boutique ID
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F6F1EA]">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#FFFCF7] border border-rose-200 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4">
            <ShieldAlert size={28} />
          </div>
          <h1 className="font-serif text-2xl text-[#042821] font-semibold mb-2">Restricted Area</h1>
          <p className="text-sm text-[#29231D]/80 leading-relaxed mb-6">
            Your account ({currentUser.email || currentUser.phoneNumber}) is authenticated as a Patron, but lacks authoritative administrative privileges.
          </p>
          <p className="text-xs text-[#806326] mb-6">
            To manage boutique dispatches, please have an operator grant the administrative role to your account.
          </p>
          <a
            href="/"
            className="inline-block py-2.5 px-6 rounded-xl bg-[#042821] text-white text-xs font-medium hover:bg-[#06382e] transition-colors"
          >
            Return to Boutique
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F1EA] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#C7982F]/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <p className="text-[11px] uppercase tracking-widest text-[#806326] font-semibold">Lahore Operations</p>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#042821] font-bold mt-1">Orders Ledger & Dispatch</h1>
          </div>
          <button
            onClick={() => fetchOrders()}
            className="self-start sm:self-auto inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-[#FFFCF7] border border-[#C7982F]/30 text-xs font-medium text-[#29231D] hover:bg-[#F0EAE1] transition-all shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-[#FFFCF7] border border-[#C7982F]/15 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-2xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {['ALL', 'NEW', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].map(st => (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#042821] text-white shadow-2xs'
                    : 'bg-[#F6F1EA] text-[#29231D]/80 hover:bg-[#EBE3D7]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#806326]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Ref or Phone..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#C7982F]/20 text-xs text-[#29231D] bg-[#F6F1EA] focus:outline-hidden focus:border-[#042821]"
              />
            </div>
            <button
              type="submit"
              className="py-1.5 px-3 rounded-xl bg-[#042821] text-white text-xs font-medium hover:bg-[#06382e]"
            >
              Search
            </button>
          </form>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
            <AlertTriangle size={16} className="shrink-0 text-rose-600" />
            <p className="flex-1">{error}</p>
            <button onClick={() => fetchOrders()} className="underline font-semibold">Retry</button>
          </div>
        )}

        {/* Orders Table */}
        <div className="rounded-2xl bg-[#FFFCF7] border border-[#C7982F]/15 overflow-hidden shadow-2xs">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#806326]">
              <div className="w-8 h-8 rounded-full border-2 border-[#C7982F]/20 border-t-[#C7982F] animate-spin" />
              <p className="text-xs uppercase tracking-widest font-semibold">Querying Orders Ledger...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center px-4">
              <Package size={36} className="mx-auto text-[#806326]/40 mb-3" />
              <p className="font-serif text-lg text-[#042821] font-semibold">No Orders Found</p>
              <p className="text-xs text-[#29231D]/60 mt-1 max-w-sm mx-auto">
                No orders match the selected status filter or search parameters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#C7982F]/15 bg-[#F6F1EA]/60 text-[#806326] uppercase font-semibold tracking-wider">
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Patron</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Fulfillment</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C7982F]/10">
                  {orders.map(order => (
                    <tr
                      key={order.orderId}
                      className="hover:bg-[#F6F1EA]/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#042821]">
                        #{order.orderId}
                      </td>
                      <td className="py-3.5 px-4 text-[#29231D]/70 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#29231D]">{order.customer.name}</p>
                        <p className="text-[11px] text-[#29231D]/60 font-mono">{order.customer.phone}</p>
                      </td>
                      <td className="py-3.5 px-4 max-w-[180px] truncate text-[#29231D]/80">
                        {order.customer.city} • {order.customer.address}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#042821] whitespace-nowrap">
                        {formatPKR(order.totals.total)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          order.status === 'DISPATCHED' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                          order.status === 'PREPARING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          order.status === 'CONFIRMED' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                          order.status === 'CANCELLED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                          'bg-amber-50 text-amber-900 border-amber-300'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-zinc-100 text-zinc-800'
                        }`}>
                          {order.paymentMethod.toUpperCase()} • {order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                          className="p-1.5 rounded-lg hover:bg-[#EBE3D7] text-[#806326] transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="p-3 border-t border-[#C7982F]/15 flex items-center justify-between text-xs text-[#29231D]/70 bg-[#F6F1EA]/40">
            <p>Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#C7982F]/20 disabled:opacity-30 hover:bg-[#EBE3D7]"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#C7982F]/20 disabled:opacity-30 hover:bg-[#EBE3D7]"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="max-w-2xl w-full max-h-[90vh] flex flex-col rounded-2xl bg-[#FFFCF7] border border-[#C7982F]/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#C7982F]/20 flex items-center justify-between bg-[#F6F1EA]">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#806326]">Order Details</p>
                <h2 className="font-mono text-lg font-bold text-[#042821]">#{selectedOrder.orderId}</h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#29231D]/70 hover:bg-[#EBE3D7] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[#29231D]">
              {/* Customer & Delivery Block */}
              <div className="p-4 rounded-xl bg-[#F6F1EA] border border-[#C7982F]/15 space-y-2">
                <p className="font-semibold text-[#042821] text-sm">Recipient & Delivery Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#806326] block">Customer Name:</span>
                    <span className="font-medium text-sm">{selectedOrder.customer.name}</span>
                  </div>
                  <div>
                    <span className="text-[#806326] block">Phone Contact:</span>
                    <span className="font-mono font-medium">{selectedOrder.customer.phone}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[#806326] block">Delivery Address:</span>
                    <span className="font-medium">{selectedOrder.customer.address}, {selectedOrder.customer.city}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <p className="font-semibold text-[#042821] text-sm mb-2">Purchased Items</p>
                <div className="border border-[#C7982F]/15 rounded-xl overflow-hidden divide-y divide-[#C7982F]/10">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#29231D]">{item.name}</p>
                        <p className="text-[11px] text-[#806326]">{item.selectedWeight || '250g'} × {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-[#042821]">{formatPKR(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Immutable Financial Breakdown */}
              <div className="p-4 rounded-xl bg-[#F6F1EA] border border-[#C7982F]/15 space-y-1.5">
                <div className="flex justify-between text-[#29231D]/80">
                  <span>Merchandise Subtotal</span>
                  <span>{formatPKR(selectedOrder.totals.subtotal)}</span>
                </div>
                {selectedOrder.totals.discount > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Discount Applied</span>
                    <span>-{formatPKR(selectedOrder.totals.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#29231D]/80">
                  <span>Delivery Fee</span>
                  <span>{selectedOrder.totals.shipping === 0 ? 'Complimentary' : formatPKR(selectedOrder.totals.shipping)}</span>
                </div>
                {selectedOrder.totals.giftWrapFee > 0 && (
                  <div className="flex justify-between text-[#29231D]/80">
                    <span>Gift Packaging</span>
                    <span>{formatPKR(selectedOrder.totals.giftWrapFee)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#C7982F]/20 flex justify-between font-bold text-sm text-[#042821]">
                  <span>Total Due</span>
                  <span>{formatPKR(selectedOrder.totals.total)}</span>
                </div>
              </div>

              {/* Fulfillment Controls */}
              <div className="p-4 rounded-xl bg-[#FFFCF7] border border-[#C7982F]/25 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[#042821]">Fulfillment Status:</span>
                  <span className="font-mono uppercase font-bold text-xs text-[#806326]">{selectedOrder.status}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const).map(st => (
                    <button
                      key={st}
                      disabled={selectedOrder.status === st}
                      onClick={() => handleInitiateStatusChange(st)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                        selectedOrder.status === st
                          ? 'bg-[#042821] text-white opacity-50 cursor-not-allowed'
                          : st === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-[#F6F1EA] text-[#042821] border border-[#C7982F]/20 hover:bg-[#EBE3D7]'
                      }`}
                    >
                      Mark {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#C7982F]/20 bg-[#F6F1EA] flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="py-2 px-5 rounded-xl bg-[#042821] text-white text-xs font-medium hover:bg-[#06382e]"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Transition Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#FFFCF7] border border-[#C7982F]/30 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#042821]">Confirm Status Transition</h3>
            <p className="text-xs text-[#29231D]/80 leading-relaxed">
              Transition order <span className="font-mono font-bold">#{selectedOrder?.orderId}</span> from{' '}
              <span className="font-semibold text-[#806326]">{selectedOrder?.status}</span> to{' '}
              <span className="font-semibold text-emerald-700">{targetStatus}</span>?
            </p>

            <div>
              <label className="block text-xs font-medium text-[#806326] mb-1">
                Reason / Audit Note {targetStatus === 'CANCELLED' && <span className="text-rose-600">*</span>}:
              </label>
              <textarea
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                placeholder="State the operational reason for this status transition..."
                className="w-full p-2.5 rounded-xl border border-[#C7982F]/20 text-xs text-[#29231D] bg-[#F6F1EA] focus:outline-hidden"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2 px-4 rounded-xl border border-[#C7982F]/30 text-xs text-[#29231D] hover:bg-[#EBE3D7]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusUpdating || (targetStatus === 'CANCELLED' && !statusReason.trim())}
                onClick={handleConfirmStatusChange}
                className="py-2 px-5 rounded-xl bg-[#042821] text-white text-xs font-medium hover:bg-[#06382e] disabled:opacity-40"
              >
                {statusUpdating ? 'Updating...' : 'Confirm Transition'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
