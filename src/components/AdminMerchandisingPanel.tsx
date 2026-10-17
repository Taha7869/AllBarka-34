import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, Sparkles, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminRequest } from '../lib/adminClient';
import type { MerchandisingSettings, Product } from '../types';
import { useCatalogProducts } from '../contexts/CatalogContext';

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

  const [settings, setSettings] = useState<MerchandisingSettings>({
    featuredProductIds: ['badam', 'pista', 'chilgoza', 'khajoor', 'deal-1', 'deal-2'],
    categoryOrder: ['dry-fruits', 'dates', 'seeds-snacks', 'oils', 'essentials', 'herbs-spices', 'combos', 'celebration-boxes', 'deals', 'personalized-treats'],
    categoryVisibility: {
      'dry-fruits': true,
      dates: true,
      'seeds-snacks': true,
      oils: true,
      essentials: true,
      'herbs-spices': true,
      combos: true,
      'celebration-boxes': true,
      deals: true,
      'personalized-treats': true,
    },
    autoplayDurationMs: 6000,
    autoplayResumeDelayMs: 3000,
    revision: 1,
    updatedAt: new Date().toISOString(),
  });

  const [featuredIdsInput, setFeaturedIdsInput] = useState('');

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    setLoading(true);
    setError(null);
    adminRequest<{ settings: MerchandisingSettings }>(
      () => currentUser.getIdToken(),
      '/api/admin/merchandising?preview=true'
    )
      .then(res => {
        if (res.settings) {
          setSettings(res.settings);
          setFeaturedIdsInput((res.settings.featuredProductIds || []).join(', '));
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to load merchandising settings.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, currentUser]);

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

  const handleSaveDraft = async () => {
    if (!currentUser) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

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
      setSuccess('Draft merchandising settings saved successfully.');
    } catch (err: any) {
      setError(err.code || err.message || 'Failed to save draft settings.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!currentUser) return;
    setPublishing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await adminRequest<{ settings: MerchandisingSettings }>(
        () => currentUser.getIdToken(),
        '/api/admin/merchandising/publish',
        {
          method: 'POST',
          body: {},
        }
      );
      setSettings(res.settings);
      setSuccess('Published live to storefront! Customer views will reflect these settings immediately.');
    } catch (err: any) {
      setError(err.code || err.message || 'Failed to publish merchandising settings.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl text-[var(--color-text-primary)] my-8">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-[#c7982f]" />
              <h3 className="font-serif text-2xl font-bold">Store Merchandising & Autoplay</h3>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Control showcase order, featured product IDs, and carousel timings directly in Firestore.
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

        {error && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Autoplay Rotation (ms) [Default: 6000ms]
                </label>
                <input
                  type="number"
                  min={1000}
                  max={60000}
                  step={500}
                  value={settings.autoplayDurationMs}
                  onChange={e => setSettings(prev => ({ ...prev, autoplayDurationMs: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus-ring font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                  Autoplay Resume Delay (ms) [Default: 3000ms]
                </label>
                <input
                  type="number"
                  min={500}
                  max={30000}
                  step={500}
                  value={settings.autoplayResumeDelayMs}
                  onChange={e => setSettings(prev => ({ ...prev, autoplayResumeDelayMs: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus-ring font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] pt-2 border-t border-[var(--color-border)]">
              <span>Revision: #{settings.revision}</span>
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
                disabled={saving || publishing}
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
