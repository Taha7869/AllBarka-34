import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageCircle,
  RefreshCw,
  Search,
  Package,
  Gift,
  Tag,
  Calendar,
  Layers,
  Check,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  CheckCircle2,
  Clock,
  FileText,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminRequest, AdminRequestError } from '../lib/adminClient';
import { formatAdminCurrency, formatAdminDate } from '../lib/adminPresentation';
import { useAdminLanguage } from '../hooks/useAdminLanguage';
import { formatFillingsLabel, buildAdminWhatsAppPitchUrl } from '../lib/inquiryWhatsApp';

export type InquiryType = 'bid_box_quote' | 'wholesale' | 'custom_hamper' | 'general';
export type InquiryStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'APPROVED' | 'CLOSED';

export interface AdminInquiryRecord {
  id: string;
  ticketId?: string;
  quoteId?: string;
  type: InquiryType;
  customerName: string;
  phone: string;
  email: string;
  city: string;
  productId: string;
  productName: string;
  packagingVariant?: string | null;
  boxMode: 'empty' | 'filled' | 'custom';
  quantity: number;
  quantityUnit?: 'pieces' | 'packs' | 'sets';
  piecesPerPack?: number;
  eventType: string;
  targetEventDate?: string | null;
  budgetType?: 'per_piece' | 'total' | null;
  preferredFillings?: string[];
  customFillingsNotes?: string;
  monogramText?: string;
  cardMessage?: string;
  customPrintText: string;
  standardPrice: number | null;
  perPiecePrice?: number | null;
  requiresTeamQuote?: boolean;
  belowMoq?: boolean;
  moqRequired?: number | null;
  isVerifiedCatalogProduct?: boolean;
  submissionKey?: string | null;
  offeredPrice: number | null;
  finalAgreedPrice: number | null;
  notes: string;
  adminNotes: string;
  status: InquiryStatus;
  whatsappUrl: string;
  whatsappReplyUrl: string;
  assignedTo?: string | null;
  followUpDate?: string | null;
  leadTimeNoticeAcknowledged?: boolean;
  createdAt: string;
  updatedAt: string;
}

const INQUIRY_STATUSES: InquiryStatus[] = ['NEW', 'CONTACTED', 'QUOTED', 'APPROVED', 'CLOSED'];

const TYPE_LABELS: Record<InquiryType, string> = {
  bid_box_quote: 'Bid Box Bargain Quote',
  wholesale: 'Wholesale Inquiry',
  custom_hamper: 'Custom Hamper Request',
  general: 'General Concierge Inquiry',
};

function buildLiveWhatsAppPitch(
  record: AdminInquiryRecord,
  draftAgreedPrice: string,
  draftAdminNotes: string
): string {
  return buildAdminWhatsAppPitchUrl({
    ...record,
    finalAgreedPrice: draftAgreedPrice.trim() ? Number(draftAgreedPrice) : record.finalAgreedPrice,
    adminNotes: draftAdminNotes.trim() || record.adminNotes,
  });
}

export default function AdminInquiriesPanel() {
  const { currentUser } = useAuth();
  const { language } = useAdminLanguage();

  const [inquiries, setInquiries] = useState<AdminInquiryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  const [typeFilter, setTypeFilter] = useState<'ALL' | InquiryType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InquiryStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        status: InquiryStatus;
        finalAgreedPrice: string;
        adminNotes: string;
        assignedTo: string;
        followUpDate: string;
        saving?: boolean;
        savedMsg?: string;
        errorMsg?: string;
      }
    >
  >({});

  useEffect(() => {
    if (!currentUser) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    adminRequest<{ inquiries: AdminInquiryRecord[] }>(
      () => currentUser.getIdToken(),
      '/api/admin/inquiries',
      { signal: controller.signal }
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        const list = Array.isArray(res.inquiries) ? res.inquiries : [];
        setInquiries(list);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const item of list) {
            if (!next[item.id]) {
              next[item.id] = {
                status: item.status || 'NEW',
                finalAgreedPrice: item.finalAgreedPrice != null ? String(item.finalAgreedPrice) : '',
                adminNotes: item.adminNotes || '',
                assignedTo: item.assignedTo || '',
                followUpDate: item.followUpDate || '',
              };
            }
          }
          return next;
        });
      })
      .catch((err: AdminRequestError) => {
        if (!controller.signal.aborted) {
          setError(err.code || 'REQUEST_FAILED');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [currentUser, refreshTick]);

  const filteredInquiries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inquiries.filter((item) => {
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        item.id,
        item.customerName,
        item.phone,
        item.email,
        item.city,
        item.productName,
        item.productId,
        item.eventType,
        item.customPrintText,
        item.notes,
        item.adminNotes,
        item.assignedTo,
        item.followUpDate,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [inquiries, typeFilter, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    return {
      total: inquiries.length,
      newCount: inquiries.filter((i) => i.status === 'NEW').length,
      bidBoxQuotes: inquiries.filter((i) => i.type === 'bid_box_quote').length,
      wholesaleAndHampers: inquiries.filter((i) => i.type === 'wholesale' || i.type === 'custom_hamper').length,
    };
  }, [inquiries]);

  const updateDraft = (
    id: string,
    patch: Partial<{
      status: InquiryStatus;
      finalAgreedPrice: string;
      adminNotes: string;
      assignedTo: string;
      followUpDate: string;
    }>
  ) => {
    setDrafts((prev) => {
      const current = prev[id] || {
        status: 'NEW' as InquiryStatus,
        finalAgreedPrice: '',
        adminNotes: '',
        assignedTo: '',
        followUpDate: '',
      };
      return {
        ...prev,
        [id]: {
          ...current,
          ...patch,
          savedMsg: undefined,
          errorMsg: undefined,
        },
      };
    });
  };

  const handleSaveInquiry = async (item: AdminInquiryRecord) => {
    if (!currentUser) return;
    const draft = drafts[item.id] || {
      status: item.status,
      finalAgreedPrice: item.finalAgreedPrice != null ? String(item.finalAgreedPrice) : '',
      adminNotes: item.adminNotes || '',
      assignedTo: item.assignedTo || '',
      followUpDate: item.followUpDate || '',
    };

    setDrafts((prev) => ({
      ...prev,
      [item.id]: { ...draft, saving: true, savedMsg: undefined, errorMsg: undefined },
    }));

    try {
      const res = await adminRequest<{ inquiry: AdminInquiryRecord; whatsappReplyUrl: string }>(
        () => currentUser.getIdToken(),
        `/api/admin/inquiries/${encodeURIComponent(item.id)}`,
        {
          method: 'PATCH',
          body: {
            status: draft.status,
            finalAgreedPrice: draft.finalAgreedPrice.trim() ? Number(draft.finalAgreedPrice) : null,
            adminNotes: draft.adminNotes.trim(),
            assignedTo: draft.assignedTo.trim() || null,
            followUpDate: draft.followUpDate.trim() || null,
          },
        }
      );

      setInquiries((prev) =>
        prev.map((existing) => (existing.id === item.id ? res.inquiry : existing))
      );
      setDrafts((prev) => ({
        ...prev,
        [item.id]: {
          status: res.inquiry.status,
          finalAgreedPrice: res.inquiry.finalAgreedPrice != null ? String(res.inquiry.finalAgreedPrice) : '',
          adminNotes: res.inquiry.adminNotes || '',
          assignedTo: res.inquiry.assignedTo || '',
          followUpDate: res.inquiry.followUpDate || '',
          saving: false,
          savedMsg: 'Saved & WhatsApp pitch updated',
        },
      }));
    } catch (err: any) {
      setDrafts((prev) => ({
        ...prev,
        [item.id]: {
          ...draft,
          saving: false,
          errorMsg: err?.message || 'Failed to save changes.',
        },
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Summary */}
      <div className="admin-metrics" aria-busy={loading}>
        <section className="admin-metric">
          <div>
            <span>Total Inquiries & Quotes</span>
            <FileText size={18} />
          </div>
          <strong>{loading ? '—' : metrics.total}</strong>
        </section>
        <section className="admin-metric">
          <div>
            <span>New / Awaiting Pitch</span>
            <Clock size={18} />
          </div>
          <strong>{loading ? '—' : metrics.newCount}</strong>
        </section>
        <section className="admin-metric">
          <div>
            <span>Bid Box Bargain Quotes</span>
            <Tag size={18} />
          </div>
          <strong>{loading ? '—' : metrics.bidBoxQuotes}</strong>
        </section>
        <section className="admin-metric">
          <div>
            <span>Wholesale & Hampers</span>
            <Gift size={18} />
          </div>
          <strong>{loading ? '—' : metrics.wholesaleAndHampers}</strong>
        </section>
      </div>

      {/* Filters & Search Bar */}
      <div className="admin-filters">
        <div className="admin-search">
          <Search size={17} aria-hidden="true" />
          <label htmlFor="admin-inquiry-search" className="sr-only">
            Search inquiries and quotes
          </label>
          <input
            id="admin-inquiry-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, phone, ref ID, Bid Box, or event..."
          />
        </div>

        <label className="admin-filter">
          <span>Inquiry Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | InquiryType)}
          >
            <option value="ALL">All Types</option>
            <option value="bid_box_quote">Bid Box Bargain Quotes</option>
            <option value="wholesale">Wholesale (10kg+)</option>
            <option value="custom_hamper">Custom Hampers</option>
            <option value="general">General Concierge</option>
          </select>
        </label>

        <label className="admin-filter">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | InquiryStatus)}
          >
            <option value="ALL">All Statuses</option>
            {INQUIRY_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="admin-button"
          disabled={loading}
          onClick={() => setRefreshTick((v) => v + 1)}
        >
          <RefreshCw size={15} className={loading ? 'admin-loading-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="admin-notice admin-notice-error">
          <span>Unable to load inquiries ({error}).</span>
          <button
            type="button"
            className="admin-button"
            onClick={() => setRefreshTick((v) => v + 1)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Inquiries & Bargain Desk Cards */}
      {loading ? (
        <div className="admin-ledger-loading" role="status">
          <RefreshCw className="admin-loading-spin" size={22} />
          <span>Loading customer inquiries & custom quotes...</span>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="admin-empty">
          <Sparkles size={30} />
          <h3>No Inquiries or Custom Quotes Found</h3>
          <p>
            Customer Bid Box bargain requests, wholesale inquiries, custom hampers, and concierge messages will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((item) => {
            const draft = drafts[item.id] || {
              status: item.status,
              finalAgreedPrice: item.finalAgreedPrice != null ? String(item.finalAgreedPrice) : '',
              adminNotes: item.adminNotes || '',
              assignedTo: item.assignedTo || '',
              followUpDate: item.followUpDate || '',
            };
            const liveWhatsAppUrl = buildLiveWhatsAppPitch(
              item,
              draft.finalAgreedPrice,
              draft.adminNotes
            );
            const estimatedStandardTotal =
              item.standardPrice && item.quantity
                ? item.standardPrice * item.quantity
                : null;

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-[#D4AF6A]/35 bg-white p-5 shadow-xs space-y-4 text-[#1A1A1A]"
              >
                {/* Top Header Row: ID, Badges & Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D4AF6A]/20 pb-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#072A20] text-[#E6C786]">
                      {item.id}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FAF6EE] border border-[#D4AF6A]/40 text-[#8C6B1B]">
                      {TYPE_LABELS[item.type] || item.type}
                    </span>

                    {/* Empty vs Filled vs Custom Badge */}
                    {(item.type === 'bid_box_quote' || item.boxMode) && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                          item.boxMode === 'empty'
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : item.boxMode === 'custom'
                            ? 'bg-purple-50 border-purple-300 text-purple-900'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        }`}
                      >
                        {item.boxMode === 'empty' ? <Package size={13} /> : item.boxMode === 'custom' ? <Sparkles size={13} /> : <Gift size={13} />}
                        {item.boxMode === 'empty'
                          ? 'Box Only (Empty)'
                          : item.boxMode === 'custom'
                          ? 'Custom Pack & Sourced Fillings'
                          : 'Filled with Dry Fruits'}
                      </span>
                    )}

                    {/* Packaging Variant Badge */}
                    {item.packagingVariant && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900">
                        <Tag size={12} />
                        {item.packagingVariant}
                      </span>
                    )}

                    {/* Quantity Badge */}
                    {item.quantity > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
                        <Layers size={13} />
                        {item.quantity} {item.quantity === 1 ? 'pc / lot' : 'pcs'}
                      </span>
                    )}

                    {/* Event Type Badge */}
                    {item.eventType && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-900">
                        <Calendar size={13} />
                        {item.eventType}
                      </span>
                    )}

                    {/* Target Event Date Badge */}
                    {item.targetEventDate && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900">
                        <Calendar size={13} />
                        Date: {item.targetEventDate}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#566B63]">
                    <span>{formatAdminDate(item.createdAt, language)}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[11px] ${
                        item.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-900'
                          : item.status === 'QUOTED' || item.status === 'CONTACTED'
                          ? 'bg-blue-100 text-blue-900'
                          : item.status === 'CLOSED'
                          ? 'bg-neutral-200 text-neutral-700'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Middle Grid: Customer Details + Product & Pricing Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Customer Info */}
                  <div className="rounded-xl bg-[#FAF6EE]/60 border border-[#D4AF6A]/25 p-3.5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C6B1B] block">
                      Patron Contact
                    </span>
                    <div className="font-serif font-bold text-base text-[#072A20]">
                      {item.customerName}
                    </div>
                    {item.phone && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#1A1A1A]">
                        <Phone size={13} className="text-[#8C6B1B]" />
                        <a href={`tel:${item.phone}`} className="underline hover:text-[#8C6B1B]">
                          {item.phone}
                        </a>
                      </div>
                    )}
                    {item.email && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#1A1A1A]">
                        <Mail size={13} className="text-[#8C6B1B]" />
                        <span>{item.email}</span>
                      </div>
                    )}
                    {item.city && (
                      <div className="flex items-center gap-1.5 text-xs text-[#566B63]">
                        <MapPin size={13} className="text-[#8C6B1B]" />
                        <span>{item.city}</span>
                      </div>
                    )}
                    {item.assignedTo && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#072A20] pt-0.5">
                        <User size={13} className="text-[#8C6B1B]" />
                        <span>Assigned: {item.assignedTo}</span>
                      </div>
                    )}
                    {item.followUpDate && (
                      <div className="flex items-center gap-1.5 text-xs text-[#8C6B1B]">
                        <Calendar size={13} />
                        <span>Follow-up: {item.followUpDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Standard Price vs Customer Offered Price */}
                  <div className="rounded-xl bg-[#FAF6EE]/60 border border-[#D4AF6A]/25 p-3.5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C6B1B] block">
                      Product & Bargain Comparison
                    </span>
                    <div className="font-semibold text-sm text-[#072A20]">
                      {item.productName}
                      {item.packagingVariant ? ` (${item.packagingVariant})` : ''}
                    </div>
                    <div className="text-xs text-[#566B63] space-y-1 pt-1">
                      <div className="flex justify-between">
                        <span>Standard Unit Price:</span>
                        <strong className="text-[#072A20]">
                          {item.standardPrice ? formatAdminCurrency(item.standardPrice) + '/pc' : 'Custom'}
                        </strong>
                      </div>
                      {estimatedStandardTotal != null && (
                        <div className="flex justify-between">
                          <span>Est. Standard Total ({item.quantity} pcs):</span>
                          <strong className="text-[#072A20]">
                            {formatAdminCurrency(estimatedStandardTotal)}
                          </strong>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-[#D4AF6A]/20 pt-1 text-[#8C6B1B]">
                        <span className="font-semibold">Customer Offered Budget:</span>
                        <strong className="font-bold">
                          {item.offeredPrice
                            ? `${formatAdminCurrency(item.offeredPrice)} PKR${item.budgetType === 'per_piece' ? '/pc' : ' total'}`
                            : 'Open / Requesting Rate'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Custom Print, Fillings & Patron Requirements */}
                  <div className="rounded-xl bg-[#FAF6EE]/60 border border-[#D4AF6A]/25 p-3.5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C6B1B] block">
                      Custom Printing & Requirements
                    </span>
                    {item.monogramText ? (
                      <p className="text-xs text-[#072A20] font-medium leading-relaxed">
                        <strong>Monogram / Name Tag:</strong> {item.monogramText}
                      </p>
                    ) : null}
                    {item.cardMessage ? (
                      <p className="text-xs text-[#072A20] font-medium leading-relaxed">
                        <strong>Card / Ribbon:</strong> {item.cardMessage}
                      </p>
                    ) : null}
                    {item.preferredFillings && item.preferredFillings.length > 0 ? (
                      <p className="text-xs text-[#8C6B1B] font-medium leading-relaxed">
                        <strong>Fillings Selected:</strong> {formatFillingsLabel(item.preferredFillings)}
                      </p>
                    ) : null}
                    {item.customFillingsNotes ? (
                      <p className="text-xs text-[#3E564D] leading-relaxed">
                        <strong>Fillings Notes:</strong> {item.customFillingsNotes}
                      </p>
                    ) : null}
                    {item.customPrintText && item.customPrintText !== item.monogramText ? (
                      <p className="text-xs text-[#072A20] font-medium leading-relaxed">
                        <strong>Custom Printing:</strong> {item.customPrintText}
                      </p>
                    ) : null}
                    {item.notes && item.notes !== item.customPrintText && item.notes !== item.customFillingsNotes ? (
                      <p className="text-xs text-[#3E564D] leading-relaxed">{item.notes}</p>
                    ) : null}
                    {!item.monogramText && !item.cardMessage && (!item.preferredFillings || item.preferredFillings.length === 0) && !item.customPrintText && !item.notes && (
                      <p className="text-xs italic text-[#566B63]">
                        Standard specifications — finalize couple name/event tag on WhatsApp.
                      </p>
                    )}
                  </div>
                </div>

                {/* Admin Action Row: Status, Final Agreed Price, Assigned Staff, Follow-up Date, Admin Notes & 1-Click WhatsApp Pitch */}
                <div className="rounded-xl bg-[#072A20]/[0.03] border border-[#072A20]/15 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#072A20] mb-1">
                        Quote Status
                      </label>
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          updateDraft(item.id, { status: e.target.value as InquiryStatus })
                        }
                        className="w-full rounded-lg border border-[#D4AF6A]/50 bg-white px-3 py-2 text-xs font-semibold text-[#072A20]"
                      >
                        {INQUIRY_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#072A20] mb-1">
                        Final Agreed / Pitched Price (PKR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        placeholder={
                          item.offeredPrice
                            ? String(item.offeredPrice)
                            : estimatedStandardTotal
                            ? String(estimatedStandardTotal)
                            : 'e.g. 42000'
                        }
                        value={draft.finalAgreedPrice}
                        onChange={(e) =>
                          updateDraft(item.id, { finalAgreedPrice: e.target.value })
                        }
                        className="w-full rounded-lg border border-[#D4AF6A]/50 bg-white px-3 py-2 text-xs font-semibold text-[#072A20]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#072A20] mb-1">
                        Assigned Concierge
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Taha / Boutique Lead"
                        value={draft.assignedTo}
                        onChange={(e) => updateDraft(item.id, { assignedTo: e.target.value })}
                        className="w-full rounded-lg border border-[#D4AF6A]/50 bg-white px-3 py-2 text-xs font-semibold text-[#072A20]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#072A20] mb-1">
                        Follow-up Target Date
                      </label>
                      <input
                        type="date"
                        value={draft.followUpDate}
                        onChange={(e) => updateDraft(item.id, { followUpDate: e.target.value })}
                        className="w-full rounded-lg border border-[#D4AF6A]/50 bg-white px-3 py-2 text-xs font-semibold text-[#072A20]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#072A20] mb-1">
                      Concierge Note (Included in WhatsApp Pitch)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Includes complimentary gold Nikkah name tags and fast courier delivery"
                      value={draft.adminNotes}
                      onChange={(e) => updateDraft(item.id, { adminNotes: e.target.value })}
                      className="w-full rounded-lg border border-[#D4AF6A]/50 bg-white px-3 py-2 text-xs text-[#072A20]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="text-xs">
                      {draft.savedMsg && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 size={14} /> {draft.savedMsg}
                        </span>
                      )}
                      {draft.errorMsg && (
                        <span className="font-semibold text-red-600">{draft.errorMsg}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        disabled={draft.saving}
                        onClick={() => handleSaveInquiry(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#072A20] hover:bg-[#0D3F30] text-white px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <Check size={14} className="text-[#E6C786]" />
                        {draft.saving ? 'Saving...' : 'Save Status & Rate'}
                      </button>

                      <a
                        href={liveWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#128C7E] hover:bg-[#0E7266] text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors"
                      >
                        <MessageCircle size={14} />
                        Pitch Rate on WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
