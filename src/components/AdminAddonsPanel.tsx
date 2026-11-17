import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminLanguage } from '../hooks/useAdminLanguage';
import { adminRequest, AdminRequestError } from '../lib/adminClient';
import {
  STARTER_ADDONS,
  type AddonDefinition,
  type AddonsCatalogDocument,
} from '../lib/addonsCatalog';

function formatOverrides(overrides?: Record<string, number>): string {
  if (!overrides) return '';
  return Object.entries(overrides)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
}

function parseOverrides(raw: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of raw.split(',')) {
    const [k, v] = part.split(':').map(s => s.trim());
    const num = Number(v);
    if (k && Number.isFinite(num) && num >= 0) {
      out[k] = Math.round(num);
    }
  }
  return out;
}

function splitList(raw: string): string[] {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export default function AdminAddonsPanel() {
  const { currentUser } = useAuth();
  const { t } = useAdminLanguage();
  const [addons, setAddons] = useState<AddonDefinition[]>(() => structuredClone(STARTER_ADDONS));
  const [revision, setRevision] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [refreshTick, setRefreshTick] = useState<number>(0);

  useEffect(() => {
    if (!currentUser) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    adminRequest<{ ok: boolean; catalog: AddonsCatalogDocument }>(
      () => currentUser.getIdToken(),
      '/api/admin/catalog/addons',
      { signal: controller.signal }
    )
      .then(data => {
        if (controller.signal.aborted) return;
        if (data?.catalog) {
          setAddons(data.catalog.addons);
          setRevision(data.catalog.revision);
        }
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        const reqErr = err as AdminRequestError;
        setError(reqErr.message || reqErr.code || 'Failed to load add-ons');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [currentUser, refreshTick]);

  const updateAddon = (index: number, patch: Partial<AddonDefinition>) => {
    setAddons(prev => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
    setFeedback('');
    setError('');
  };

  const addNewAddon = () => {
    const nextNum = addons.length + 1;
    const newEntry: AddonDefinition = {
      id: `custom-addon-${nextNum}`,
      name_en: `Custom Add-on ${nextNum}`,
      name_ur: `کسٹم ایڈ آن ${nextNum}`,
      name_ar: `إضافة مخصصة ${nextNum}`,
      price: 0,
      pricingMode: 'fixed',
      productPriceOverrides: {},
      categories: [],
      productIds: [],
      occasions: ['gift'],
      minOrderValue: 0,
      maxOrderValue: null,
      active: false,
      sortOrder: nextNum,
    };
    setAddons(prev => [...prev, newEntry]);
  };

  const removeAddon = (index: number) => {
    setAddons(prev => prev.filter((_, idx) => idx !== index));
  };

  const saveAll = async () => {
    if (!currentUser || saving) return;
    setSaving(true);
    setError('');
    setFeedback('');
    try {
      const res = await adminRequest<{ ok: boolean; catalog: AddonsCatalogDocument }>(
        () => currentUser.getIdToken(),
        '/api/admin/catalog/addons',
        {
          method: 'PUT',
          body: {
            expectedRevision: revision,
            catalog: {
              revision,
              addons,
            },
          },
        }
      );
      if (res?.catalog) {
        setAddons(res.catalog.addons);
        setRevision(res.catalog.revision);
        setFeedback(t('admin.addons.saved'));
      }
    } catch (err) {
      const reqErr = err as AdminRequestError;
      setError(reqErr.message || reqErr.code || t('admin.addons.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-section" aria-busy={loading || saving} data-testid="admin-addons-panel">
      <div className="admin-section-heading">
        <div>
          <p className="admin-eyebrow">AllBarka · {t('admin.tab.addons')}</p>
          <h2 dir="auto">{t('admin.addons.title')}</h2>
          <p dir="auto">{t('admin.addons.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="admin-button"
            onClick={() => setRefreshTick(v => v + 1)}
            disabled={loading || saving}
          >
            <RefreshCw size={15} />
            <span dir="auto">{t('admin.refresh')}</span>
          </button>
          <button
            type="button"
            className="admin-button"
            onClick={addNewAddon}
            disabled={loading || saving}
            data-testid="admin-addon-create-btn"
          >
            <Plus size={15} />
            <span dir="auto">{t('admin.addons.add')}</span>
          </button>
          <button
            type="button"
            className="admin-button admin-button-primary"
            onClick={saveAll}
            disabled={loading || saving}
            data-testid="admin-addon-save-btn"
          >
            <Save size={15} />
            <span dir="auto">{saving ? t('admin.addons.saving') : t('admin.addons.save')}</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="admin-notice admin-notice-error" role="alert" dir="auto">
          {error}
        </p>
      )}
      {feedback && (
        <p className="admin-notice" role="status" dir="auto">
          {feedback}
        </p>
      )}

      <div className="space-y-4 mt-4">
        {addons.map((addon, idx) => (
          <article
            key={`${addon.id}-${idx}`}
            data-testid={`admin-addon-card-${addon.id}`}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--color-gold,#B8935F)]" />
                <strong className="font-mono text-xs">{addon.id}</strong>
                <span
                  className={`admin-badge ${
                    addon.active ? 'admin-badge-success' : 'admin-badge-muted'
                  }`}
                >
                  {addon.active ? t('admin.addons.active') : t('admin.addons.inactiveDraft')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addon.active}
                    onChange={e => updateAddon(idx, { active: e.target.checked })}
                    data-testid={`admin-addon-toggle-${addon.id}`}
                  />
                  <span>{t('admin.addons.enableLabel')}</span>
                </label>
                {!STARTER_ADDONS.some(s => s.id === addon.id) && (
                  <button
                    type="button"
                    className="admin-icon-button"
                    aria-label={`Remove ${addon.name_en}`}
                    onClick={() => removeAddon(idx)}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <label className="block space-y-1">
                <span>ID (slug)</span>
                <input
                  type="text"
                  value={addon.id}
                  disabled={STARTER_ADDONS.some(s => s.id === addon.id)}
                  onChange={e => updateAddon(idx, { id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 font-mono text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span>Name (English)</span>
                <input
                  type="text"
                  value={addon.name_en}
                  onChange={e => updateAddon(idx, { name_en: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span>نام (اردو)</span>
                <input
                  type="text"
                  dir="rtl"
                  value={addon.name_ur}
                  onChange={e => updateAddon(idx, { name_ur: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span>الاسم (العربية)</span>
                <input
                  type="text"
                  dir="rtl"
                  value={addon.name_ar}
                  onChange={e => updateAddon(idx, { name_ar: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 text-xs"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <label className="block space-y-1">
                <span>{t('admin.addons.pricePkr')}</span>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={addon.price}
                  onChange={e => updateAddon(idx, { price: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                  data-testid={`admin-addon-price-${addon.id}`}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 text-xs font-bold"
                />
              </label>
              <label className="block space-y-1">
                <span>{t('admin.addons.pricingMode')}</span>
                <select
                  value={addon.pricingMode}
                  onChange={e => updateAddon(idx, { pricingMode: e.target.value === 'per_item' ? 'per_item' : 'fixed' })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 text-xs"
                >
                  <option value="fixed">Fixed (per order)</option>
                  <option value="per_item">Per matching item</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span>Min order value (PKR)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={addon.minOrderValue}
                  onChange={e => updateAddon(idx, { minOrderValue: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span>Max order value (blank = none)</span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={addon.maxOrderValue ?? ''}
                  placeholder="No limit"
                  onChange={e => {
                    const val = e.target.value.trim();
                    updateAddon(idx, { maxOrderValue: val === '' || Number(val) <= 0 ? null : Math.round(Number(val)) });
                  }}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 text-xs"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <label className="block space-y-1">
                <span>Occasions (gift, eid, nikah)</span>
                <input
                  type="text"
                  value={addon.occasions.join(', ')}
                  placeholder="gift, eid, nikah"
                  onChange={e => updateAddon(idx, { occasions: splitList(e.target.value).map(s => s.toLowerCase()) })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span>Categories (empty = all)</span>
                <input
                  type="text"
                  value={addon.categories.join(', ')}
                  placeholder="All categories"
                  onChange={e => updateAddon(idx, { categories: splitList(e.target.value) })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span>Product IDs (empty = all)</span>
                <input
                  type="text"
                  value={addon.productIds.join(', ')}
                  placeholder="All products"
                  onChange={e => updateAddon(idx, { productIds: splitList(e.target.value) })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span>Product price overrides (id:price)</span>
                <input
                  type="text"
                  value={formatOverrides(addon.productPriceOverrides)}
                  placeholder="e.g. badam:150, pista:200"
                  onChange={e => updateAddon(idx, { productPriceOverrides: parseOverrides(e.target.value) })}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-2 text-xs font-mono"
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
