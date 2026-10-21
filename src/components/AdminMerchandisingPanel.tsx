import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, Sparkles, Send, RefreshCw, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminRequest } from '../lib/adminClient';
import type { MerchandisingSettings } from '../types';
import { useCatalogProducts } from '../contexts/CatalogContext';
import { DEFAULT_MERCHANDISING } from '../config/merchandising';

interface AdminMerchandisingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminMerchandisingPanel({ isOpen, onClose }: AdminMerchandisingPanelProps) {
  const { currentUser } = useAuth();
  const products = useCatalogProducts();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const [settings, setSettings] = useState<MerchandisingSettings>(DEFAULT_MERCHANDISING);
  const [featuredIdsInput, setFeaturedIdsInput] = useState('');
  const [liveRevision, setLiveRevision] = useState<number>(0);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');

  const computeSnapshot = (s: MerchandisingSettings, featuredText: string) => {
    return JSON.stringify({
      featured: featuredText.split(',').map(s => s.trim()).filter(Boolean).join(','),
      categoryVisibility: s.categoryVisibility || {},
      showcaseTabs: (s.showcaseTabs || []).map(t => ({ id: t.id, productIds: (t.productIds || []).join(',') })),
      autoplay: s.autoplay,
      categoryOrder: s.categoryOrder || [],
    });
  };

  const hasUnsavedChanges = lastSavedSnapshot !== '' && computeSnapshot(settings, featuredIdsInput) !== lastSavedSnapshot;

  const fetchSettings = useCallback(() => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    setConflict(false);
    adminRequest<{
      settings: MerchandisingSettings;
      draft?: MerchandisingSettings;
      live?: MerchandisingSettings;
      draftRevision?: number;
      liveRevision?: number;
    }>(
      () => currentUser.getIdToken(),
      '/api/admin/merchandising?preview=true'
    )
      .then(res => {
        const draft = res.draft || res.settings;
        if (draft) {
          setSettings(draft);
          const featStr = (draft.featuredProductIds || []).join(', ');
          setFeaturedIdsInput(featStr);
          setLastSavedSnapshot(computeSnapshot(draft, featStr));
          if (typeof res.liveRevision === 'number') {
            setLiveRevision(res.liveRevision);
          } else if (res.live?.revision !== undefined) {
            setLiveRevision(res.live.revision);
          }
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to load merchandising settings.');
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchSettings();
    }
  }, [isOpen, currentUser, fetchSettings]);

  if (!isOpen) return null;

  const handleToggleCategory = (categoryKey: string) => {
    setSettings(prev => ({
      ...prev,
      categoryVisibility: {
        ...prev.categoryVisibility,
        [categoryKey]: !prev.categoryVisibility[categoryKey],
      },
    }));
  };

  const handleTabProductChange = (tabId: string, value: string) => {
    const ids = value.split(',').map(s => s.trim()).filter(Boolean);
    setSettings(prev => ({
      ...prev,
      showcaseTabs: (prev.showcaseTabs || []).map(tab =>
        tab.id === tabId ? { ...tab, productIds: ids } : tab
      ),
    }));
  };

  const handleSaveDraft = async () => {
    if (!currentUser) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    setConflict(false);

    const parsedFeatured = featuredIdsInput
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    const payload = {
      ...settings,
      featuredProductIds: parsedFeatured,
      expectedRevision: settings.revision,
    };

    try {
      const res = await adminRequest<{ settings: MerchandisingSettings }>(
        () => currentUser.getIdToken(),
        '/api/admin/merchandising',
        {
          method: 'POST',
          body: payload as Record<string, unknown>,
        }
      );
      setSettings(res.settings);
      setLastSavedSnapshot(computeSnapshot(res.settings, featuredIdsInput));
      setSuccess('Draft merchandising settings saved successfully.');
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CATALOG_REVISION_CONFLICT') {
        setConflict(true);
        setError('Revision Conflict: Merchandising settings were modified by another session. Please reload.');
      } else {
        setError(err.code || err.message || 'Failed to save draft settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!currentUser) return;
    if (hasUnsavedChanges) {
      setError('Unsaved changes detected. Please save your draft before publishing live.');
      return;
    }
    setPublishing(true);
    setError(null);
    setSuccess(null);
    setConflict(false);

    try {
      const res = await adminRequest<{
        settings: MerchandisingSettings;
        draft: MerchandisingSettings;
        published: MerchandisingSettings;
        draftRevision: number;
        liveRevision: number;
      }>(
        () => currentUser.getIdToken(),
        '/api/admin/merchandising/publish',
        {
          method: 'POST',
          body: {
            expectedDraftRevision: settings.revision,
            expectedLiveRevision: liveRevision,
          },
        }
      );
      // Synchronize the UI with the resulting draft revision
      const newDraft = res.draft || res.settings;
      setSettings(newDraft);
      const featStr = (newDraft.featuredProductIds || []).join(', ');
      setFeaturedIdsInput(featStr);
      setLastSavedSnapshot(computeSnapshot(newDraft, featStr));
      if (typeof res.liveRevision === 'number') {
        setLiveRevision(res.liveRevision);
      }
      setSuccess(`Published live to storefront! (Live Rev ${res.liveRevision}, Draft Rev ${res.draftRevision})`);
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CATALOG_REVISION_CONFLICT') {
        setConflict(true);
        setError('Revision Conflict: Merchandising draft or live settings were modified by another session. Please reload.');
      } else {
        setError(err.code || err.message || 'Failed to publish merchandising settings.');
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl text-[var(--color-text-primary)] my-8">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-[#c7982f]" />
              <h3 className="font-serif text-2xl font-bold">Store Merchandising & Autoplay</h3>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Control showcase tabs, commercial collections, occasions, and carousel timings directly in Firestore.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-base)] focus-ring"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {conflict && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchSettings}
              className="inline-flex items-center gap-1 rounded bg-amber-600 text-white px-2.5 py-1 text-[11px] font-semibold hover:bg-amber-700"
            >
              <RefreshCw size={12} />
              <span>Reload Latest</span>
            </button>
          </div>
        )}

        {error && !conflict && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-[var(--color-text-secondary)] gap-2">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-xs">Loading merchandising settings...</span>
          </div>
        ) : (
          <div className="mt-5 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Showcase Tabs (3 admin-selected items per tab) */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)]/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#c7982f]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-text)]">
                  Showcase Tabs (Homepage Curations)
                </span>
              </div>
              <div className="space-y-2">
                {(settings.showcaseTabs || []).map(tab => (
                  <div key={tab.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-[var(--color-surface)] p-2.5 rounded-lg border border-[var(--color-border)] text-xs">
                    <div>
                      <span className="font-semibold block">{tab.label_en}</span>
                      <span className="text-[10px] text-[var(--color-text-secondary)] font-mono">{tab.id}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={tab.productIds.join(', ')}
                        onChange={e => handleTabProductChange(tab.id, e.target.value)}
                        placeholder="Comma-separated product IDs (e.g. chilgoza, pista, badam)"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-1.5 font-mono text-[11px] focus-ring"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Product IDs */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-text)] mb-1">
                Featured Product IDs (Comma-separated)
              </label>
              <textarea
                rows={2}
                value={featuredIdsInput}
                onChange={e => setFeaturedIdsInput(e.target.value)}
                placeholder="e.g. badam, pista, chilgoza, khajoor, deal-1, deal-2"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-3 text-xs font-mono focus-ring"
              />
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
                Currently loaded products in store: {products.length} available.
              </p>
            </div>

            {/* Category Visibility */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)]/50 p-4">
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-text)] mb-2">
                Category Visibility (Active Storefront Tabs)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(settings.categoryVisibility).map(([catKey, isVisible]) => (
                  <label
                    key={catKey}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-xs cursor-pointer select-none transition-colors ${
                      isVisible
                        ? 'border-[#1e3a2b] bg-[#1e3a2b]/10 dark:border-[#c7982f] dark:bg-[#c7982f]/10 font-semibold'
                        : 'border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => handleToggleCategory(catKey)}
                      className="rounded accent-[#1e3a2b] dark:accent-[#c7982f]"
                    />
                    <span>{catKey}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Autoplay Timings (Rule D5) */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)]/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-text)]">
                  Autoplay & Motion Control (Rule D5)
                </span>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoplay?.enabled ?? true}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      autoplay: { ...prev.autoplay, enabled: e.target.checked }
                    }))}
                    className="rounded accent-[#c7982f]"
                  />
                  <span>Autoplay Enabled</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Rotation Interval (ms) [Default: 6000ms]
                  </label>
                  <input
                    type="number"
                    min={1000}
                    max={60000}
                    step={500}
                    value={settings.autoplay?.intervalMs || settings.autoplayDurationMs || 6000}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setSettings(prev => ({
                        ...prev,
                        autoplayDurationMs: val,
                        autoplay: { ...prev.autoplay, intervalMs: val },
                      }));
                    }}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus-ring font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                    Resume Delay on Interaction (ms) [Default: 3000ms]
                  </label>
                  <input
                    type="number"
                    min={500}
                    max={30000}
                    step={500}
                    value={settings.autoplay?.resumeDelayMs || settings.autoplayResumeDelayMs || 3000}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setSettings(prev => ({
                        ...prev,
                        autoplayResumeDelayMs: val,
                        autoplay: { ...prev.autoplay, resumeDelayMs: val },
                      }));
                    }}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus-ring font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] pt-2 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span>Draft Rev: #{settings.revision} | Live Rev: #{liveRevision}</span>
                {hasUnsavedChanges && (
                  <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    Unsaved draft edits
                  </span>
                )}
              </div>
              <span>Last updated: {new Date(settings.updatedAt).toLocaleTimeString()}</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold focus-ring"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving || publishing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-4 py-2 text-xs font-semibold hover:bg-[var(--color-border)]/50 focus-ring disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                <span>Save Draft (Preview)</span>
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving || publishing || hasUnsavedChanges}
                title={hasUnsavedChanges ? "Please save draft before publishing live" : undefined}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a2b] text-[#fff8e9] dark:bg-[#c7982f] dark:text-[#1e3a2b] px-4 py-2 text-xs font-semibold hover:opacity-90 focus-ring disabled:opacity-50"
              >
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Publish Live to Store</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
