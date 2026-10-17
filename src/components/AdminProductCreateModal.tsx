import { useState } from 'react';
import { X, Plus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminRequest } from '../lib/adminClient';
import { useCatalogRefresh } from '../contexts/CatalogContext';
import type { Product, OrderMode, ProductStatus } from '../types';

interface AdminProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (product: Product) => void;
}

export default function AdminProductCreateModal({ isOpen, onClose, onCreated }: AdminProductCreateModalProps) {
  const { currentUser } = useAuth();
  const refreshCatalog = useCatalogRefresh();

  const [id, setId] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [category, setCategory] = useState('dry-fruits');
  const [productFamily, setProductFamily] = useState('');
  const [orderMode, setOrderMode] = useState<OrderMode>('standard');
  const [status, setStatus] = useState<ProductStatus>('draft');
  const [moqOverride, setMoqOverride] = useState('');
  const [portions, setPortions] = useState<{ label: string; price: string; moqOverride: string }[]>([
    { label: '250g', price: '1200', moqOverride: '' },
    { label: '500g', price: '2300', moqOverride: '' },
  ]);
  const [wholesale, setWholesale] = useState('');
  const [referencePrice, setReferencePrice] = useState('');
  const [supplierCost, setSupplierCost] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAddPortion = () => {
    setPortions(prev => [...prev, { label: '', price: '', moqOverride: '' }]);
  };

  const handleRemovePortion = (index: number) => {
    setPortions(prev => prev.filter((_, i) => i !== index));
  };

  const handlePortionChange = (index: number, field: 'label' | 'price' | 'moqOverride', value: string) => {
    setPortions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Admin authentication required.');
      return;
    }

    const cleanId = id.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,80}$/.test(cleanId)) {
      setError('Product ID must be 2-80 characters using only lowercase letters, numbers, hyphens, and underscores.');
      return;
    }

    if (!nameEn.trim()) {
      setError('Product English name is required.');
      return;
    }

    let parsedProductMoq: number | undefined = undefined;
    if (moqOverride.trim() !== '') {
      const numMoq = Number(moqOverride);
      if (!Number.isSafeInteger(numMoq) || numMoq < 1 || numMoq > 10000) {
        setError('Product MOQ override must be a positive whole number between 1 and 10,000.');
        return;
      }
      parsedProductMoq = numMoq;
    }

    const prices: Record<string, number> = {};
    const variants: { label: string; price: number; available: boolean; moqOverride?: number }[] = [];
    for (const p of portions) {
      const label = p.label.trim();
      const num = Number(p.price);
      if (label && Number.isFinite(num) && num > 0) {
        const roundedPrice = Math.round(num);
        prices[label] = roundedPrice;
        let parsedVarMoq: number | undefined = undefined;
        if (p.moqOverride && p.moqOverride.trim() !== '') {
          const numVarMoq = Number(p.moqOverride);
          if (!Number.isSafeInteger(numVarMoq) || numVarMoq < 1 || numVarMoq > 10000) {
            setError(`MOQ override for "${label}" must be a positive whole number between 1 and 10,000.`);
            return;
          }
          parsedVarMoq = numVarMoq;
        }
        variants.push({
          label,
          price: roundedPrice,
          available: true,
          ...(parsedVarMoq !== undefined ? { moqOverride: parsedVarMoq } : {}),
        });
      }
    }

    if (orderMode !== 'inquiry_quote' && Object.keys(prices).length === 0) {
      setError('At least one valid portion price is required for standard products.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: Partial<Product> = {
      id: cleanId,
      name_en: nameEn.trim(),
      name_ur: nameUr.trim() || nameEn.trim(),
      name_ar: nameAr.trim() || nameEn.trim(),
      category: category.trim(),
      prices,
      variants,
      orderMode,
      status,
      active: status === 'published',
      quoteOnly: orderMode === 'inquiry_quote',
      wholesale: wholesale ? Math.round(Number(wholesale)) : 0,
      productFamily: productFamily.trim() || undefined,
      moqOverride: parsedProductMoq,
      referencePrice: referencePrice ? Number(referencePrice) : undefined,
      supplierCost: supplierCost ? Number(supplierCost) : undefined,
      supplierName: supplierName.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
    };

    try {
      const response = await adminRequest<{ product: Product }>(
        () => currentUser.getIdToken(),
        '/api/admin/catalog/products',
        {
          method: 'POST',
          body: payload as Record<string, unknown>,
        }
      );

      setSuccess(true);
      await refreshCatalog();
      if (onCreated && response.product) {
        onCreated(response.product);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.code || err.message || 'Failed to create product in authoritative store.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl text-[var(--color-text-primary)] my-8">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <h3 className="font-serif text-2xl font-bold">Create Dynamic Product</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Add a new catalog item directly into authoritative Firestore without redeployment.
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
            <span>Product created successfully! Saved to Firestore.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Product ID (Canonical Slug) *
              </label>
              <input
                type="text"
                required
                value={id}
                onChange={e => setId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="e.g. badam-giri-extra"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus-ring font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus-ring"
              >
                <optgroup label="Food Categories">
                  <option value="dry-fruits">Dry Fruits & Nuts</option>
                  <option value="dates">Dates</option>
                  <option value="seeds-snacks">Seeds & Snacks</option>
                  <option value="oils">Oils</option>
                  <option value="essentials">Desi Essentials</option>
                  <option value="herbs-spices">Herbs & Spices</option>
                </optgroup>
                <optgroup label="Commercial Collections">
                  <option value="combos">Gifts & Hampers</option>
                  <option value="celebration-boxes">Celebration Boxes</option>
                  <option value="deals">Deals</option>
                  <option value="personalized-treats">Personalized Treats & Wrappers</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
              English Name *
            </label>
            <input
              type="text"
              required
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              placeholder="e.g. Royal Afghan Almonds (Giri)"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Urdu Name (نام اردو)
              </label>
              <input
                type="text"
                dir="rtl"
                value={nameUr}
                onChange={e => setNameUr(e.target.value)}
                placeholder="بادام گری افغان"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Product Family
              </label>
              <input
                type="text"
                value={productFamily}
                onChange={e => setProductFamily(e.target.value)}
                placeholder="e.g. badam, khajoor, tin-box"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Order Mode
              </label>
              <select
                value={orderMode}
                onChange={e => setOrderMode(e.target.value as OrderMode)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus-ring"
              >
                <option value="standard">Standard Direct Checkout</option>
                <option value="inquiry_quote">Inquiry / Quote Only</option>
                <option value="both">Both (Direct & Quote)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                Publication Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ProductStatus)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus-ring"
              >
                <option value="draft">Draft (Admin Only)</option>
                <option value="published">Published (Storefront Active)</option>
                <option value="archived">Archived (Unpurchasable)</option>
              </select>
            </div>
          </div>

          {/* Product MOQ Override */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)]/40 p-4">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="create-product-moq" className="block text-xs font-semibold text-[var(--color-text-secondary)]">
                Product MOQ Override (pcs, optional — leave blank for formula)
              </label>
              {moqOverride !== '' && (
                <button
                  type="button"
                  onClick={() => setMoqOverride('')}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Clear Override
                </button>
              )}
            </div>
            <input
              id="create-product-moq"
              type="number"
              min={1}
              max={10000}
              step={1}
              value={moqOverride}
              onChange={e => setMoqOverride(e.target.value)}
              placeholder="e.g. 10 (optional)"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus-ring"
            />
          </div>

          {/* Portions and Pricing */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)]/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-text)]">
                Portion Pricing (PKR) &amp; Variant MOQ Overrides
              </span>
              <button
                type="button"
                onClick={handleAddPortion}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e3a2b] dark:text-[#c7982f] hover:underline"
              >
                <Plus size={14} /> Add Portion
              </button>
            </div>
            <div className="space-y-2">
              {portions.map((p, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={p.label}
                    onChange={e => handlePortionChange(index, 'label', e.target.value)}
                    placeholder="e.g. 250g, 500g, 1kg, 1 pc"
                    className="flex-1 min-w-[140px] rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5 text-xs focus-ring"
                  />
                  <span className="text-xs text-[var(--color-text-secondary)]">Rs.</span>
                  <input
                    type="number"
                    value={p.price}
                    onChange={e => handlePortionChange(index, 'price', e.target.value)}
                    placeholder="Price"
                    className="w-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5 text-xs focus-ring"
                  />
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    step={1}
                    value={p.moqOverride}
                    onChange={e => handlePortionChange(index, 'moqOverride', e.target.value)}
                    placeholder="MOQ pcs (opt)"
                    aria-label={`Variant MOQ override for ${p.label || `portion ${index + 1}`}`}
                    className="w-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-2.5 py-1.5 text-xs focus-ring"
                  />
                  {p.moqOverride !== '' && (
                    <button
                      type="button"
                      onClick={() => handlePortionChange(index, 'moqOverride', '')}
                      className="text-[11px] font-semibold text-red-600 hover:underline"
                    >
                      Clear MOQ
                    </button>
                  )}
                  {portions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePortion(index)}
                      className="p-1 text-red-500 hover:text-red-700"
                      aria-label="Remove portion"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sourcing & Private Supplier Fields */}
          <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)]/30 p-4">
            <summary className="cursor-pointer text-xs font-semibold text-[var(--color-text-secondary)] select-none">
              Private Supplier & Cost Details (Stripped from Public Endpoints)
            </summary>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[var(--color-text-secondary)] mb-1">
                  Supplier Cost (PKR)
                </label>
                <input
                  type="number"
                  value={supplierCost}
                  onChange={e => setSupplierCost(e.target.value)}
                  placeholder="Cost"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--color-text-secondary)] mb-1">
                  Reference Price (PKR)
                </label>
                <input
                  type="number"
                  value={referencePrice}
                  onChange={e => setReferencePrice(e.target.value)}
                  placeholder="Ref Price"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--color-text-secondary)] mb-1">
                  Wholesale Base (PKR)
                </label>
                <input
                  type="number"
                  value={wholesale}
                  onChange={e => setWholesale(e.target.value)}
                  placeholder="Wholesale"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5 text-xs"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] text-[var(--color-text-secondary)] mb-1">
                  Supplier Name & Internal Notes
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  placeholder="e.g. Quetta Dry Fruit Mandi / Direct Balochistan Farmer"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5 text-xs mb-2"
                />
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="Private internal notes regarding shelf life, packaging batches, or special handling."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </details>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a2b] text-[#fff8e9] dark:bg-[#c7982f] dark:text-[#1e3a2b] px-5 py-2 text-xs font-semibold focus-ring hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving to Firestore...</span>
                </>
              ) : (
                <span>Create Product</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
