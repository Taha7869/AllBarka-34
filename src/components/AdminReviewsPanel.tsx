import React, { useCallback, useEffect, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  History,
  MessageSquareReply,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStorefrontContentRefresh } from '../contexts/StorefrontContentContext';
import { adminRequest } from '../lib/adminClient';
import { apiUrl } from '../lib/apiUrl';
import { prepareReviewPhoto } from '../utils/prepareReviewPhoto';
import type {
  DeliveredOrderSummary,
  ReviewAuditEntry,
  StoredReviewRecord,
} from '../lib/reviewsRouter';

type StatusFilter = 'all' | 'draft' | 'published';

interface DraftFormState {
  id?: string;
  orderId: string;
  name_en: string;
  location: string;
  purchasedItem: string;
  headline: string;
  review: string;
  rating: number;
  photoUrl: string;
  reply: string;
  published: boolean;
}

const EMPTY_FORM: DraftFormState = {
  orderId: '',
  name_en: '',
  location: '',
  purchasedItem: '',
  headline: '',
  review: '',
  rating: 5,
  photoUrl: '',
  reply: '',
  published: false,
};

export default function AdminReviewsPanel() {
  const { currentUser } = useAuth();
  const refreshStorefront = useStorefrontContentRefresh();

  const [reviews, setReviews] = useState<StoredReviewRecord[]>([]);
  const [audits, setAudits] = useState<ReviewAuditEntry[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAudit, setShowAudit] = useState(false);

  // Delivered order search & add/edit modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<DraftFormState>(EMPTY_FORM);
  const [orderQuery, setOrderQuery] = useState('');
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrderSummary[]>([]);
  const [searchingOrders, setSearchingOrders] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const data = await adminRequest<{ reviews: StoredReviewRecord[]; audits: ReviewAuditEntry[] }>(
        () => currentUser.getIdToken(),
        '/api/admin/reviews',
      );
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setAudits(Array.isArray(data.audits) ? data.audits : []);
    } catch (e: any) {
      setError(e?.code || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const searchDeliveredOrders = useCallback(
    async (queryText: string) => {
      if (!currentUser) return;
      setSearchingOrders(true);
      try {
        const qs = queryText.trim() ? `?q=${encodeURIComponent(queryText.trim())}` : '';
        const data = await adminRequest<{ orders: DeliveredOrderSummary[] }>(
          () => currentUser.getIdToken(),
          `/api/admin/reviews/delivered-orders${qs}`,
        );
        setDeliveredOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (e: any) {
        setError(e?.code || 'Failed to search delivered orders');
      } finally {
        setSearchingOrders(false);
      }
    },
    [currentUser],
  );

  const openNewEditor = () => {
    setForm(EMPTY_FORM);
    setOrderQuery('');
    setEditorOpen(true);
    setError('');
    setNotice('');
    void searchDeliveredOrders('');
  };

  const openEditEditor = (rev: StoredReviewRecord) => {
    setForm({
      id: rev.id,
      orderId: rev.orderId,
      name_en: rev.name_en,
      location: rev.location,
      purchasedItem: rev.purchasedItem,
      headline: rev.headline || '',
      review: rev.review,
      rating: rev.rating || 5,
      photoUrl: rev.photoUrl || '',
      reply: rev.reply || '',
      published: Boolean(rev.published),
    });
    setEditorOpen(true);
    setError('');
    setNotice('');
  };

  const selectDeliveredOrder = (order: DeliveredOrderSummary) => {
    setForm((prev) => ({
      ...prev,
      orderId: order.orderId,
      name_en: prev.name_en || order.customerName,
      location: prev.location || order.area,
      purchasedItem: prev.purchasedItem || order.items[0] || '',
    }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentUser) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const prepared = await prepareReviewPhoto(file);
      const token = await currentUser.getIdToken();
      const res = await fetch(apiUrl('/api/admin/reviews/photo'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': prepared.mime,
        },
        credentials: 'omit',
        body: prepared.blob,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.code || 'PHOTO_UPLOAD_FAILED');
      }
      setForm((prev) => ({ ...prev, photoUrl: data.url }));
      setNotice('Photo sanitized (1200px WebP, EXIF stripped) and uploaded.');
    } catch (e: any) {
      setError(e?.message || 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        orderId: form.orderId.trim(),
        name_en: form.name_en.trim(),
        location: form.location.trim(),
        purchasedItem: form.purchasedItem.trim(),
        headline: form.headline.trim(),
        review: form.review.trim(),
        rating: form.rating,
        photoUrl: form.photoUrl.trim() || null,
        reply: form.reply.trim(),
        published: form.published,
      };
      if (form.id) {
        await adminRequest(() => currentUser.getIdToken(), `/api/admin/reviews/${encodeURIComponent(form.id)}`, {
          method: 'PATCH',
          body: payload,
        });
        setNotice('Review updated.');
      } else {
        await adminRequest(() => currentUser.getIdToken(), '/api/admin/reviews', {
          method: 'POST',
          body: payload,
        });
        setNotice(form.published ? 'Review created and published.' : 'Draft review saved.');
      }
      setEditorOpen(false);
      await loadReviews();
      await refreshStorefront();
    } catch (e: any) {
      setError(e?.code || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (rev: StoredReviewRecord) => {
    if (!currentUser) return;
    setBusyId(rev.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(() => currentUser.getIdToken(), `/api/admin/reviews/${encodeURIComponent(rev.id)}`, {
        method: 'PATCH',
        body: { published: !rev.published },
      });
      setNotice(!rev.published ? `Published review for ${rev.orderId}.` : `Moved ${rev.orderId} back to draft.`);
      await loadReviews();
      await refreshStorefront();
    } catch (e: any) {
      setError(e?.code || 'Failed to update publish status');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (rev: StoredReviewRecord) => {
    if (!currentUser) return;
    if (!window.confirm(`Delete review by ${rev.name_en} (${rev.orderId})?`)) return;
    setBusyId(rev.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(() => currentUser.getIdToken(), `/api/admin/reviews/${encodeURIComponent(rev.id)}`, {
        method: 'DELETE',
      });
      setNotice('Review deleted.');
      await loadReviews();
      await refreshStorefront();
    } catch (e: any) {
      setError(e?.code || 'Failed to delete review');
    } finally {
      setBusyId(null);
    }
  };

  const visibleReviews = reviews.filter((rev) => {
    if (filter === 'published') return rev.published === true;
    if (filter === 'draft') return !rev.published;
    return true;
  });

  const draftCount = reviews.filter((r) => !r.published).length;
  const publishedCount = reviews.filter((r) => r.published).length;

  return (
    <section className="admin-section space-y-5" data-testid="admin-reviews-panel">
      <div className="admin-section-heading flex-wrap gap-3">
        <div>
          <p className="admin-eyebrow">Verified Orders Only</p>
          <h2>Patron Reviews ({reviews.length})</h2>
          <p className="text-xs opacity-75">
            Every published review must link to a real delivered order. Order IDs and customer contacts are never sent to the public storefront.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="admin-button admin-button-primary" onClick={openNewEditor}>
            <Plus size={15} /> Add from delivered order
          </button>
          <button type="button" className="admin-button" onClick={() => setShowAudit((v) => !v)}>
            <History size={15} /> Audit log ({audits.length})
          </button>
          <button type="button" className="admin-button" disabled={loading} onClick={() => void loadReviews()}>
            <RefreshCw size={15} className={loading ? 'admin-loading-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && <div role="alert" className="admin-notice admin-notice-error">{error}</div>}
      {notice && <div role="status" className="admin-notice">{notice}</div>}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {([
          ['all', `All (${reviews.length})`],
          ['draft', `Drafts (${draftCount})`],
          ['published', `Published (${publishedCount})`],
        ] as [StatusFilter, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`admin-button ${filter === key ? 'admin-button-primary' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Add / Edit Editor */}
      {editorOpen && (
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-[#C7982F]/40 bg-[var(--color-surface,#FFFCF7)] p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-lg font-bold">
              {form.id ? `Edit review (${form.orderId})` : 'New review from a delivered order'}
            </h3>
            <button
              type="button"
              aria-label="Close review editor"
              onClick={() => setEditorOpen(false)}
              className="admin-icon-button"
            >
              <X size={16} />
            </button>
          </div>

          {!form.id && (
            <div className="space-y-2 rounded-xl border border-[var(--color-border)] p-3.5 bg-[var(--color-base)]">
              <label htmlFor="delivered-order-search" className="block text-xs font-bold">
                1. Search & select a real delivered order *
              </label>
              <div className="flex gap-2">
                <input
                  id="delivered-order-search"
                  type="search"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="Order ID (AB-...), customer name, city, or item"
                  className="admin-field flex-1"
                />
                <button
                  type="button"
                  className="admin-button"
                  disabled={searchingOrders}
                  onClick={() => void searchDeliveredOrders(orderQuery)}
                >
                  <Search size={14} /> {searchingOrders ? 'Searching…' : 'Search'}
                </button>
              </div>
              {deliveredOrders.length > 0 ? (
                <div className="max-h-44 overflow-y-auto divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                  {deliveredOrders.map((order) => (
                    <button
                      key={order.orderId}
                      type="button"
                      onClick={() => selectDeliveredOrder(order)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-[#C7982F]/10 cursor-pointer ${
                        form.orderId === order.orderId ? 'bg-[#C7982F]/15 font-semibold' : ''
                      }`}
                    >
                      <span>
                        <strong>{order.orderId}</strong> · {order.customerName} ({order.area}) — {order.items.join(', ')}
                      </span>
                      {order.hasReview && (
                        <span className="admin-badge admin-badge-muted shrink-0">Has review</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs opacity-70">No delivered orders matched yet.</p>
              )}
              {form.orderId && (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Selected order: {form.orderId}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1 text-xs font-semibold">
              <span>Patron name *</span>
              <input
                type="text"
                required
                maxLength={120}
                value={form.name_en}
                onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))}
                className="admin-field w-full"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              <span>Area & city (area-level only) *</span>
              <input
                type="text"
                required
                maxLength={120}
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. DHA Phase 6, Lahore"
                className="admin-field w-full"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              <span>Item purchased *</span>
              <input
                type="text"
                required
                maxLength={160}
                value={form.purchasedItem}
                onChange={(e) => setForm((p) => ({ ...p, purchasedItem: e.target.value }))}
                className="admin-field w-full"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 text-xs font-semibold">
              <span>Rating (1–5) *</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, rating: star }))}
                    aria-label={`${star} stars`}
                    className="admin-icon-button"
                  >
                    <Star
                      size={16}
                      className={star <= form.rating ? 'fill-[#C7982F] text-[#C7982F]' : 'opacity-40'}
                    />
                  </button>
                ))}
              </div>
            </div>
            <label className="space-y-1 text-xs font-semibold">
              <span>Optional photo (1200px WebP, EXIF stripped)</span>
              <div className="flex items-center gap-2">
                <label className="admin-button cursor-pointer">
                  <Camera size={14} /> {uploadingPhoto ? 'Uploading…' : 'Upload photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>
                {form.photoUrl && (
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => setForm((p) => ({ ...p, photoUrl: '' }))}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </label>
          </div>

          {form.photoUrl && (
            <img
              src={form.photoUrl}
              alt="Review preview"
              className="h-24 w-32 rounded-xl border border-[#C7982F]/30 object-cover"
            />
          )}

          <label className="block space-y-1 text-xs font-semibold">
            <span>Review text *</span>
            <textarea
              required
              rows={3}
              maxLength={1200}
              value={form.review}
              onChange={(e) => setForm((p) => ({ ...p, review: e.target.value }))}
              className="admin-field w-full"
            />
          </label>

          <label className="block space-y-1 text-xs font-semibold">
            <span>AllBarka reply (optional)</span>
            <textarea
              rows={2}
              maxLength={600}
              value={form.reply}
              onChange={(e) => setForm((p) => ({ ...p, reply: e.target.value }))}
              placeholder="Warm thank-you note shown publicly below the review"
              className="admin-field w-full"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
            />
            <span>Publish immediately to storefront (leave unchecked to save as Draft)</span>
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || !form.orderId}
              className="admin-button admin-button-primary"
            >
              {saving ? 'Saving…' : form.id ? 'Save changes' : form.published ? 'Create & publish' : 'Save draft'}
            </button>
            <button type="button" className="admin-button" onClick={() => setEditorOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="admin-ledger-loading" role="status">
          <RefreshCw size={20} className="admin-loading-spin" /> Loading reviews…
        </div>
      ) : visibleReviews.length === 0 ? (
        <div className="admin-empty">
          <Star size={28} />
          <h3>No reviews in this view</h3>
          <p>Customer submissions from /track arrive here as drafts, or add one linked to a delivered order above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {visibleReviews.map((rev) => (
            <article
              key={rev.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface,#FFFCF7)] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`admin-badge ${rev.published ? 'admin-badge-success' : 'admin-badge-pending'}`}>
                      {rev.published ? <><CheckCircle2 size={12} /> Published</> : <><Clock size={12} /> Draft</>}
                    </span>
                    <span className="admin-badge admin-badge-muted">Order {rev.orderId}</span>
                    <span className="text-[11px] opacity-65">
                      {rev.source === 'customer_tracking' ? 'Submitted on /track' : 'Added by admin'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[#C7982F]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        className={i < (rev.rating || 5) ? 'fill-[#C7982F] text-[#C7982F]' : 'opacity-25'}
                      />
                    ))}
                    <strong className="ms-1.5 text-sm text-[var(--color-text-primary)]">{rev.name_en}</strong>
                    <span className="text-xs opacity-70">
                      · {rev.location} · {rev.purchasedItem}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === rev.id}
                    onClick={() => void togglePublish(rev)}
                    className={`admin-button ${rev.published ? '' : 'admin-button-primary'}`}
                  >
                    {rev.published ? <><EyeOff size={14} /> Unpublish</> : <><Eye size={14} /> Publish</>}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === rev.id}
                    onClick={() => openEditEditor(rev)}
                    className="admin-button"
                  >
                    <Pencil size={14} /> Edit / Reply
                  </button>
                  <button
                    type="button"
                    disabled={busyId === rev.id}
                    onClick={() => void handleDelete(rev)}
                    aria-label={`Delete review ${rev.id}`}
                    className="admin-icon-button"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {rev.photoUrl && (
                  <img
                    src={rev.photoUrl}
                    alt={rev.purchasedItem}
                    className="h-24 w-32 shrink-0 rounded-xl border border-[var(--color-border)] object-cover"
                  />
                )}
                <div className="space-y-2 flex-1 min-w-0">
                  <p dir="auto" className="text-sm leading-relaxed">“{rev.review}”</p>
                  {rev.reply && (
                    <div className="rounded-xl border border-[#C7982F]/25 bg-[var(--color-base)] px-3 py-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-[#806326] dark:text-[#E4C783]">
                        <MessageSquareReply size={12} /> AllBarka reply
                      </span>
                      <p dir="auto" className="mt-0.5 opacity-85">{rev.reply}</p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Durable Audit Log */}
      {showAudit && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-base)] p-4 space-y-2">
          <h3 className="text-xs font-bold">Recent Review Audit Log</h3>
          {audits.length === 0 ? (
            <p className="text-xs opacity-70">No audit entries yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] text-xs">
              {audits.map((entry) => (
                <li key={entry.id} className="py-2 flex flex-wrap justify-between gap-2">
                  <span>
                    <strong className="uppercase">{entry.action}</strong> · {entry.orderId || entry.reviewId}
                    {entry.summary ? ` — ${entry.summary}` : ''}
                  </span>
                  <span className="opacity-70">
                    {entry.actorEmail} · {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
