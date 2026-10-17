import { useState, useEffect, useCallback } from 'react';
import { X, Save, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminRequest } from '../lib/adminClient';
import { useCatalogRefresh } from '../contexts/CatalogContext';
import type { Product, OrderMode, ProductStatus, ProductPersonalizationConfig } from '../types';

interface AdminProductEditModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved?: (updated: Product) => void;
}

type TabType = 'basic' | 'taxonomy' | 'personalization' | 'logistics' | 'media';

export default function AdminProductEditModal({ isOpen, product, onClose, onSaved }: AdminProductEditModalProps) {
  const { currentUser } = useAuth();
  const refreshCatalog = useCatalogRefresh();

  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loadingFresh, setLoadingFresh] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [conflict, setConflict] = useState(false);

  // Form states
  const [revision, setRevision] = useState<number>(0);
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descUr, setDescUr] = useState('');
  const [descAr, setDescAr] = useState('');
  const [category, setCategory] = useState('dry-fruits');
  const [productFamily, setProductFamily] = useState('');
  const [orderMode, setOrderMode] = useState<OrderMode>('standard');
  const [status, setStatus] = useState<ProductStatus>('draft');

  // Taxonomy & collections
  const [collectionsInput, setCollectionsInput] = useState('');
  const [occasionsInput, setOccasionsInput] = useState('');
  const [inclusionsInput, setInclusionsInput] = useState('');
  const [exclusionsInput, setExclusionsInput] = useState('');

  // Personalization
  const [personalization, setPersonalization] = useState<ProductPersonalizationConfig>({
    supported: false,
    allowMonogram: false,
    allowCardMessage: false,
    allowRibbonColor: false,
    notes: '',
  });

  // Logistics & Pricing
  const [moqOverride, setMoqOverride] = useState('');
  const [preparationDays, setPreparationDays] = useState('');
  const [shippingWeightG, setShippingWeightG] = useState('');
  const [displayOrder, setDisplayOrder] = useState('');
  const [wholesale, setWholesale] = useState('');
  const [targetMarginPercent, setTargetMarginPercent] = useState('');
  const [referencePrice, setReferencePrice] = useState('');
  const [supplierCost, setSupplierCost] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierItemUrl, setSupplierItemUrl] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Media
  const [image, setImage] = useState('');
  const [imageName, setImageName] = useState('');

  // Load product fields
  const loadProductData = useCallback(async (targetProduct: Product) => {
    if (!currentUser) return;
    setLoadingFresh(true);
    setError(null);
    setConflict(false);
    try {
      // Fetch fresh record from server to ensure exact revision
      const freshRes = await adminRequest<{ product: Product & { revision: number } }>(
        () => currentUser.getIdToken(),
        `/api/admin/catalog/products/${encodeURIComponent(targetProduct.id)}`
      );
      const p = freshRes.product || targetProduct;
      const rev = Number(p.adminRevision ?? p.revision ?? 0);
      setRevision(rev);

      setNameEn(p.name_en || p.name || '');
      setNameUr(p.name_ur || p.nameUr || '');
      setNameAr(p.name_ar || p.nameAr || '');
      setDescEn(p.desc_en || p.description || '');
      setDescUr(p.desc_ur || '');
      setDescAr(p.desc_ar || '');
      setCategory(p.category || 'dry-fruits');
      setProductFamily(p.productFamily || '');
      setOrderMode(p.orderMode || (p.quoteOnly ? 'inquiry_quote' : 'standard'));
      setStatus(p.status || (p.active === false ? 'archived' : 'published'));

      setCollectionsInput(Array.isArray(p.collections) ? p.collections.join(', ') : '');
      setOccasionsInput(Array.isArray(p.occasions) ? p.occasions.join(', ') : '');
      setInclusionsInput(Array.isArray(p.inclusions) ? p.inclusions.join('\n') : '');
      setExclusionsInput(Array.isArray(p.exclusions) ? p.exclusions.join('\n') : '');

      setPersonalization({
        supported: Boolean(p.personalization?.supported),
        allowMonogram: Boolean(p.personalization?.allowMonogram),
        allowCardMessage: Boolean(p.personalization?.allowCardMessage),
        allowRibbonColor: Boolean(p.personalization?.allowRibbonColor),
        notes: p.personalization?.notes || '',
      });

      setMoqOverride(p.moqOverride !== undefined ? String(p.moqOverride) : '');
      setPreparationDays(p.preparationDays !== undefined ? String(p.preparationDays) : '');
      setShippingWeightG(p.shippingWeightG !== undefined ? String(p.shippingWeightG) : '');
      setDisplayOrder(p.displayOrder !== undefined ? String(p.displayOrder) : '');
      setWholesale(p.wholesale ? String(p.wholesale) : '');
      setTargetMarginPercent(p.targetMarginPercent !== undefined ? String(p.targetMarginPercent) : '');
      setReferencePrice(p.referencePrice ? String(p.referencePrice) : '');
      setSupplierCost(p.supplierCost ? String(p.supplierCost) : '');
      setSupplierName(p.supplierName || '');
      setSupplierItemUrl(p.supplierItemUrl || '');
      setInternalNotes(p.internalNotes || '');

      setImage(p.image || '');
      setImageName(p.imageName || '');
    } catch {
      // Fallback to prop values
      const p = targetProduct;
      const rev = Number(p.adminRevision ?? p.revision ?? 0);
      setRevision(rev);
      setNameEn(p.name_en || p.name || '');
      setNameUr(p.name_ur || p.nameUr || '');
      setNameAr(p.name_ar || p.nameAr || '');
      setDescEn(p.desc_en || p.description || '');
      setCategory(p.category || 'dry-fruits');
      setOrderMode(p.orderMode || (p.quoteOnly ? 'inquiry_quote' : 'standard'));
      setStatus(p.status || (p.active === false ? 'archived' : 'published'));
      setImage(p.image || '');
      setImageName(p.imageName || '');
    } finally {
      setLoadingFresh(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen && product) {
      loadProductData(product);
    }
  }, [isOpen, product, loadProductData]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Admin authentication required.');
      return;
    }

    if (!nameEn.trim()) {
      setError('Product English name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setConflict(false);

    const parseList = (str: string, sep: string | RegExp) =>
      str.split(sep).map(s => s.trim()).filter(s => s.length > 0);

    const payload: Record<string, unknown> = {
      expectedRevision: revision,
      name_en: nameEn.trim(),
      name_ur: nameUr.trim() || nameEn.trim(),
      name_ar: nameAr.trim() || nameEn.trim(),
      name: nameEn.trim(),
      desc_en: descEn.trim(),
      desc_ur: descUr.trim() || descEn.trim(),
      desc_ar: descAr.trim() || descEn.trim(),
      category: category.trim(),
      productFamily: productFamily.trim() || undefined,
      orderMode,
      status,
      active: status === 'published',
      quoteOnly: orderMode === 'inquiry_quote',
      collections: parseList(collectionsInput, ','),
      occasions: parseList(occasionsInput, ','),
      inclusions: parseList(inclusionsInput, '\n'),
      exclusions: parseList(exclusionsInput, '\n'),
      personalization: personalization.supported ? personalization : undefined,
      moqOverride: moqOverride ? parseInt(moqOverride, 10) : undefined,
      preparationDays: preparationDays ? parseInt(preparationDays, 10) : undefined,
      shippingWeightG: shippingWeightG ? parseInt(shippingWeightG, 10) : undefined,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : undefined,
      wholesale: wholesale ? Math.round(Number(wholesale)) : 0,
      targetMarginPercent: targetMarginPercent ? parseFloat(targetMarginPercent) : undefined,
      referencePrice: referencePrice ? Number(referencePrice) : undefined,
      supplierCost: supplierCost ? Number(supplierCost) : undefined,
      supplierName: supplierName.trim() || undefined,
      supplierItemUrl: supplierItemUrl.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      image: image.trim() || null,
      imageName: imageName.trim() || null,
    };

    try {
      const response = await adminRequest<{ product: Product & { revision: number } }>(
        () => currentUser.getIdToken(),
        `/api/admin/catalog/products/${encodeURIComponent(product.id)}`,
        {
          method: 'PUT',
          body: payload,
        }
      );

      setSuccess(true);
      await refreshCatalog();
      if (onSaved && response.product) {
        onSaved(response.product);
      }
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 800);
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CATALOG_REVISION_CONFLICT') {
        setConflict(true);
        setError('Revision Conflict: This product was updated in another session. Please reload to review current changes.');
      } else {
        setError(err.code || err.message || 'Failed to save product details.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl text-[var(--color-text-primary)] my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-bold">Edit Product Details</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--color-base)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                {product.id}
              </span>
              <span className="text-[11px] text-[var(--color-accent-text)] font-semibold">
                Rev {revision}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Comprehensive taxonomy, commercial collections, occasions & logistics
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-base)] hover:text-inherit"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[var(--color-border)] gap-1 pt-3 shrink-0 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'basic', label: 'Basic & Content' },
            { id: 'taxonomy', label: 'Taxonomy & Occasions' },
            { id: 'personalization', label: 'Personalization' },
            { id: 'logistics', label: 'Logistics & Sourcing' },
            { id: 'media', label: 'Media & Images' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3 py-2 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-[#c7982f] text-[#c7982f]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-inherit'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {conflict && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadProductData(product)}
              className="inline-flex items-center gap-1 rounded bg-amber-600 text-white px-2 py-1 text-[11px] font-semibold hover:bg-amber-700"
            >
              <RefreshCw size={12} />
              <span>Reload Latest</span>
            </button>
          </div>
        )}

        {error && !conflict && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2 text-xs text-red-800 dark:text-red-300 shrink-0">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs text-emerald-800 dark:text-emerald-300 shrink-0">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>Product saved and synced successfully!</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4">
          {loadingFresh ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-secondary)]">
              <Loader2 size={24} className="animate-spin mb-2" />
              <p className="text-xs">Fetching authoritative revision...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: BASIC & CONTENT */}
              {activeTab === 'basic' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block font-medium mb-1">Name (English) *</label>
                      <input
                        type="text"
                        value={nameEn}
                        onChange={e => setNameEn(e.target.value)}
                        required
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Name (Urdu)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={nameUr}
                        onChange={e => setNameUr(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Name (Arabic)</label>
                      <input
                        type="text"
                        dir="rtl"
                        value={nameAr}
                        onChange={e => setNameAr(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="block font-medium mb-1">Category</label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      >
                        <option value="dry-fruits">Dry Fruits & Nuts</option>
                        <option value="dates">Dates</option>
                        <option value="seeds-snacks">Seeds & Snacks</option>
                        <option value="oils">Oils</option>
                        <option value="essentials">Essentials</option>
                        <option value="herbs-spices">Herbs & Spices</option>
                        <option value="combos">Gifts & Hampers</option>
                        <option value="celebration-boxes">Celebration Boxes</option>
                        <option value="deals">Deals</option>
                        <option value="personalized-treats">Personalized Treats</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium mb-1">Product Family</label>
                      <input
                        type="text"
                        value={productFamily}
                        onChange={e => setProductFamily(e.target.value)}
                        placeholder="e.g. badam, khajoor, bid-box"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-medium mb-1">Order Mode</label>
                      <select
                        value={orderMode}
                        onChange={e => setOrderMode(e.target.value as OrderMode)}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      >
                        <option value="standard">Standard (Direct Checkout)</option>
                        <option value="inquiry_quote">Inquiry Quote Only</option>
                        <option value="both">Both (Checkout & Custom Quote)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium mb-1">Publication Status</label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value as ProductStatus)}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none font-semibold"
                      >
                        <option value="draft">Draft (Hidden)</option>
                        <option value="published">Published (Storefront Live)</option>
                        <option value="archived">Archived (Unpurchasable)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Description (English)</label>
                    <textarea
                      rows={3}
                      value={descEn}
                      onChange={e => setDescEn(e.target.value)}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block font-medium mb-1">Description (Urdu)</label>
                      <textarea
                        rows={2}
                        dir="rtl"
                        value={descUr}
                        onChange={e => setDescUr(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Description (Arabic)</label>
                      <textarea
                        rows={2}
                        dir="rtl"
                        value={descAr}
                        onChange={e => setDescAr(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TAXONOMY & OCCASIONS */}
              {activeTab === 'taxonomy' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-medium mb-1">Curated Collections (comma separated)</label>
                    <input
                      type="text"
                      value={collectionsInput}
                      onChange={e => setCollectionsInput(e.target.value)}
                      placeholder="e.g. combos, celebration-boxes, deals, personalized-treats"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                      Matches the 4 commercial curated collections for homepage and nav filtering.
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Occasion Tags (comma separated)</label>
                    <input
                      type="text"
                      value={occasionsInput}
                      onChange={e => setOccasionsInput(e.target.value)}
                      placeholder="e.g. wedding, umrah, ramadan, eid, birth, corporate"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
                      Approved occasion filters: wedding, umrah, ramadan, eid, birth, corporate.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block font-medium mb-1">Explicit Inclusions (one per line)</label>
                      <textarea
                        rows={3}
                        value={inclusionsInput}
                        onChange={e => setInclusionsInput(e.target.value)}
                        placeholder="e.g.&#10;250g Roasted Pistachios&#10;250g Almonds&#10;Custom Gift Box"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Explicit Exclusions (one per line)</label>
                      <textarea
                        rows={3}
                        value={exclusionsInput}
                        onChange={e => setExclusionsInput(e.target.value)}
                        placeholder="e.g.&#10;Zamzam bottle not sold separately&#10;Nikkah dry fruits require 2-day lead time"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PERSONALIZATION */}
              {activeTab === 'personalization' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-pers-supported"
                      checked={personalization.supported}
                      onChange={e => setPersonalization(p => ({ ...p, supported: e.target.checked }))}
                      className="rounded border-[var(--color-border)] accent-[#c7982f]"
                    />
                    <label htmlFor="edit-pers-supported" className="font-semibold cursor-pointer">
                      Enable Bespoke Personalization for this Product
                    </label>
                  </div>

                  {personalization.supported && (
                    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={personalization.allowMonogram}
                            onChange={e => setPersonalization(p => ({ ...p, allowMonogram: e.target.checked }))}
                            className="rounded accent-[#c7982f]"
                          />
                          <span>Couple / Brand Monogram Tag</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={personalization.allowCardMessage}
                            onChange={e => setPersonalization(p => ({ ...p, allowCardMessage: e.target.checked }))}
                            className="rounded accent-[#c7982f]"
                          />
                          <span>Custom Calligraphy Card Insert</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={personalization.allowRibbonColor}
                            onChange={e => setPersonalization(p => ({ ...p, allowRibbonColor: e.target.checked }))}
                            className="rounded accent-[#c7982f]"
                          />
                          <span>Custom Satin Ribbon Selection</span>
                        </label>
                      </div>

                      <div>
                        <label className="block font-medium mb-1">Personalization Guidelines & Notes</label>
                        <textarea
                          rows={2}
                          value={personalization.notes || ''}
                          onChange={e => setPersonalization(p => ({ ...p, notes: e.target.value }))}
                          placeholder="e.g. Please specify Bride & Groom initials or company vector logo on WhatsApp."
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: LOGISTICS & SOURCING */}
              {activeTab === 'logistics' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-medium mb-1">MOQ Override</label>
                      <input
                        type="number"
                        min="1"
                        value={moqOverride}
                        onChange={e => setMoqOverride(e.target.value)}
                        placeholder="Default"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Preparation Lead Time (Days)</label>
                      <input
                        type="number"
                        min="0"
                        value={preparationDays}
                        onChange={e => setPreparationDays(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Shipping Weight (Packed grams)</label>
                      <input
                        type="number"
                        min="0"
                        value={shippingWeightG}
                        onChange={e => setShippingWeightG(e.target.value)}
                        placeholder="e.g. 450"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Display Sort Order</label>
                      <input
                        type="number"
                        value={displayOrder}
                        onChange={e => setDisplayOrder(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Wholesale / Tier Price (Rs.)</label>
                      <input
                        type="number"
                        min="0"
                        value={wholesale}
                        onChange={e => setWholesale(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Target Margin (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={targetMarginPercent}
                        onChange={e => setTargetMarginPercent(e.target.value)}
                        placeholder="e.g. 35"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Benchmark Reference Price (Rs.)</label>
                      <input
                        type="number"
                        min="0"
                        value={referencePrice}
                        onChange={e => setReferencePrice(e.target.value)}
                        placeholder="Optional"
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Private supplier fields */}
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-4 space-y-3">
                    <p className="font-semibold text-xs text-[var(--color-accent-text)] uppercase tracking-wider">
                      Authoritative Private Sourcing (Stripped from Public API)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-medium mb-1">Supplier Cost (Rs.)</label>
                        <input
                          type="number"
                          min="0"
                          value={supplierCost}
                          onChange={e => setSupplierCost(e.target.value)}
                          placeholder="Cost per unit"
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Supplier / Factory Name</label>
                        <input
                          type="text"
                          value={supplierName}
                          onChange={e => setSupplierName(e.target.value)}
                          placeholder="e.g. Lahore Paper Craft Ltd"
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Supplier Item / Invoice URL</label>
                        <input
                          type="url"
                          value={supplierItemUrl}
                          onChange={e => setSupplierItemUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Internal Merchant Notes</label>
                      <textarea
                        rows={2}
                        value={internalNotes}
                        onChange={e => setInternalNotes(e.target.value)}
                        placeholder="Private notes on harvest quality, minimum re-order quantities, etc."
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: MEDIA & IMAGES */}
              {activeTab === 'media' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-medium mb-1">Primary Cover Image URL / Path</label>
                    <input
                      type="text"
                      value={image}
                      onChange={e => setImage(e.target.value)}
                      placeholder="/images/products/bid-box-luxury-tin-1.webp"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium mb-1">Image Asset Name</label>
                    <input
                      type="text"
                      value={imageName}
                      onChange={e => setImageName(e.target.value)}
                      placeholder="/images/products/bid-box-luxury-tin-1.webp"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[#c7982f] focus:outline-none font-mono"
                    />
                  </div>

                  {image && (
                    <div className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] p-3">
                      <img
                        src={image}
                        alt="Preview"
                        className="h-20 w-20 rounded-lg object-cover border border-[var(--color-border)] bg-[var(--color-surface)]"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div>
                        <p className="font-semibold text-sm">Image Preview</p>
                        <p className="text-[11px] text-[var(--color-text-secondary)] font-mono break-all">{image}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs font-semibold hover:bg-[var(--color-base)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loadingFresh}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a2b] text-[#fff8e9] dark:bg-[#c7982f] dark:text-[#1e3a2b] px-5 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50 shadow-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
