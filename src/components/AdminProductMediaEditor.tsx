import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Film, ImagePlus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProductMediaRegistry } from '../contexts/ProductMediaContext';
import { useProductMediaLanguage } from '../hooks/useProductMediaLanguage';
import { getDefaultProductMedia, MAX_PRODUCT_IMAGES, ProductMediaError, validateProductMedia, validateProductMediaUrl, type ProductMedia, type ProductMediaRecord } from '../lib/productMedia';
import { requestProductMedia } from '../lib/productMediaClient';
import { getLocalized } from '../utils/localize';
import type { Product } from '../types';

function copyMedia(media: ProductMedia): ProductMedia { return { ...media, images: [...media.images] }; }
function previewUrl(url: string, kind: 'image' | 'video') { try { return validateProductMediaUrl(url, kind, true); } catch { return ''; } }

export default function AdminProductMediaEditor({ product, onClose }: { product: Product; onClose: () => void }) {
  const { currentUser } = useAuth();
  const { language, t } = useProductMediaLanguage();
  const { setOverride } = useProductMediaRegistry();
  const [record, setRecord] = useState<ProductMediaRecord | null>(null);
  const [draft, setDraft] = useState<ProductMedia | null>(null);
  const [clearOverride, setClearOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [filmFailed, setFilmFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const sessionUid = useRef(currentUser?.uid);
  sessionUid.current = currentUser?.uid;
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();

  const errorText = (code: string) => t(
    code === 'MEDIA_REVISION_CONFLICT' ? 'media.error.conflict'
      : code === 'MEDIA_STORE_UNAVAILABLE' || code === 'AUTH_SERVICE_UNAVAILABLE' ? 'media.error.unavailable'
      : code === 'UNAUTHORIZED' || code === 'AUTHENTICATION_REQUIRED' || code === 'FORBIDDEN_ADMIN' ? 'media.error.auth'
      : code === 'MEDIA_OFFLINE' ? 'media.error.offline' : code === 'MEDIA_REQUEST_TIMEOUT' ? 'media.error.timeout'
      : code === 'INVALID_MEDIA_VIDEO' ? 'media.error.video'
      : code.startsWith('INVALID_') || code === 'DUPLICATE_MEDIA_IMAGE' || code === 'MEDIA_POSTER_REQUIRES_VIDEO' ? 'media.error.invalid' : 'media.error.failed',
  );

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError(''); setSaved(false);
    const uid = currentUser?.uid;
    try {
      if (!currentUser) throw new ProductMediaError('AUTHENTICATION_REQUIRED', 401);
      const loaded = await requestProductMedia(() => currentUser.getIdToken(), product.id, { signal: controller.signal });
      if (!mounted.current || controller.signal.aborted || sessionUid.current !== uid) return;
      setRecord(loaded); setDraft(copyMedia(loaded.media)); setClearOverride(false);
      setPreviewFailed(false); setFilmFailed(false);
      setOverride(product.id, loaded.override);
    } catch (caught) {
      if (!mounted.current || controller.signal.aborted || sessionUid.current !== uid) return;
      setError(caught instanceof ProductMediaError ? caught.code : 'MEDIA_REQUEST_FAILED');
    } finally {
      if (mounted.current && request.current === controller) { request.current = null; setLoading(false); }
    }
  }, [currentUser, product.id, setOverride]);

  useEffect(() => {
    mounted.current = true;
    setSaving(false);
    setRecord(null); setDraft(null); setClearOverride(false);
    void load();
    const frame = requestAnimationFrame(() => heading.current?.focus());
    return () => { mounted.current = false; request.current?.abort(); cancelAnimationFrame(frame); };
  }, [load]);

  const edit = (next: ProductMedia) => { setDraft(next); setClearOverride(false); setSaved(false); setError(''); setPreviewFailed(false); setFilmFailed(false); };
  let validDraft: ProductMedia | null = null;
  let validationCode = '';
  if (draft) { try { validDraft = validateProductMedia(draft); } catch (caught) { validationCode = caught instanceof ProductMediaError ? caught.code : 'INVALID_MEDIA'; } }
  const dirty = !!record && !!draft && (clearOverride ? record.override !== null : JSON.stringify(draft) !== JSON.stringify(record.media));
  const busy = loading || saving;

  const save = async () => {
    if (!record || !draft || !validDraft || !currentUser || busy || !dirty) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const uid = currentUser.uid;
    setSaving(true); setError(''); setSaved(false);
    try {
      const next = await requestProductMedia(() => currentUser.getIdToken(), product.id, { signal: controller.signal,
        patch: { expectedRevision: record.revision, media: clearOverride ? null : validDraft } });
      if (!mounted.current || controller.signal.aborted || sessionUid.current !== uid) return;
      setRecord(next); setDraft(copyMedia(next.media)); setClearOverride(false); setSaved(true);
      setOverride(product.id, next.override);
    } catch (caught) {
      if (mounted.current && !controller.signal.aborted && sessionUid.current === uid) setError(caught instanceof ProductMediaError ? caught.code : 'MEDIA_REQUEST_FAILED');
    } finally {
      if (mounted.current && request.current === controller) { request.current = null; setSaving(false); }
    }
  };

  const move = (index: number, step: number) => {
    if (!draft || busy || index + step < 0 || index + step >= draft.images.length) return;
    const images = [...draft.images];
    [images[index], images[index + step]] = [images[index + step], images[index]];
    edit({ ...draft, images });
  };

  const inputClass = 'focus-ring min-h-11 w-full min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-base sm:text-sm';
  const buttonClass = 'focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40';
  const imagePreview = draft ? previewUrl(draft.images[0] || '', 'image') : '';
  const filmPreview = draft ? previewUrl(draft.videoUrl, 'video') : '';
  const filmPoster = draft ? previewUrl(draft.videoPoster, 'image') : '';

  return <section aria-labelledby={`${id}-title`} className="min-w-0 rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-base)] p-4 sm:p-6 xl:col-span-3">
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0" dir="auto"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--color-accent-text)]">{t('media.title')}</p><h3 ref={heading} tabIndex={-1} id={`${id}-title`} className="mt-2 font-serif text-2xl">{getLocalized(product, 'name', language)}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">{t('media.help')}</p></div>
      <button type="button" className={`${buttonClass} shrink-0`} disabled={saving} onClick={onClose} aria-label={t('media.close')}><X size={18} aria-hidden="true" /></button>
    </header>
    <p className="mt-3 max-w-3xl text-xs leading-5 text-[var(--color-text-secondary)]" dir="auto">{t('media.storage')}</p>
    {loading && <p className="mt-5 text-sm" role="status" dir="auto">{t('media.loading')}</p>}
    {error && <div className="mt-4 rounded-xl border border-red-700/30 bg-red-50 p-4 text-sm leading-6 text-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert" dir="auto">{errorText(error)}</div>}
    {!loading && <button type="button" className={`${buttonClass} mt-4`} disabled={saving} onClick={() => void load()}><RefreshCw size={15} aria-hidden="true" /><span dir="auto">{t('media.reload')}</span></button>}
    {draft && record && !loading && <div className="mt-5 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <fieldset disabled={busy} className="min-w-0"><legend className="font-serif text-xl" dir="auto">{t('media.images')}</legend><p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]" dir="auto">{t('media.limit').replace('{count}', String(MAX_PRODUCT_IMAGES))}</p>
          <ol className="mt-3 space-y-3">{draft.images.map((url, index) => <li key={index} className="flex min-w-0 flex-wrap items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <img src={previewUrl(url, 'image') || '/images/product-placeholder.svg'} alt="" loading="lazy" width={56} height={56} referrerPolicy="no-referrer" className="h-14 w-14 shrink-0 rounded-lg object-cover" onError={event => { if (!event.currentTarget.src.endsWith('/images/product-placeholder.svg')) { event.currentTarget.src = '/images/product-placeholder.svg'; setPreviewFailed(true); } }} />
            <label htmlFor={`${id}-image-${index}`} className="block min-w-0 flex-1 basis-48"><span className="mb-2 block text-xs font-medium" dir="auto">{index === 0 ? t('media.primary') : t('media.photo').replace('{number}', String(index + 1))}</span><input id={`${id}-image-${index}`} aria-label={`${t('media.imageUrl')} — ${index + 1}`} value={url} onChange={event => edit({ ...draft, images: draft.images.map((image, at) => at === index ? event.target.value : image) })} maxLength={2048} spellCheck={false} dir="ltr" inputMode="url" className={inputClass} /></label>
            <div className="flex shrink-0 gap-1 self-end"><button type="button" className={buttonClass} disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={t('media.up').replace('{number}', String(index + 1))}><ArrowUp size={16} aria-hidden="true" /></button><button type="button" className={buttonClass} disabled={busy || index === draft.images.length - 1} onClick={() => move(index, 1)} aria-label={t('media.down').replace('{number}', String(index + 1))}><ArrowDown size={16} aria-hidden="true" /></button><button type="button" className={buttonClass} disabled={busy || draft.images.length === 1} onClick={() => edit({ ...draft, images: draft.images.filter((_, at) => at !== index) })} aria-label={t('media.remove').replace('{number}', String(index + 1))}><Trash2 size={16} aria-hidden="true" /></button></div>
          </li>)}</ol>
          <button type="button" className={`${buttonClass} mt-3`} disabled={busy || draft.images.length >= MAX_PRODUCT_IMAGES} onClick={() => edit({ ...draft, images: [...draft.images, ''] })}><ImagePlus size={16} aria-hidden="true" /><span dir="auto">{t('media.add')}</span></button>
        </fieldset>
        <fieldset disabled={busy} className="min-w-0 space-y-3"><legend className="mb-3 font-serif text-xl" dir="auto">{t('media.video')}</legend>
          <label className="block" htmlFor={`${id}-video`}><span className="mb-2 block text-xs font-medium" dir="auto">{t('media.videoUrl')}</span><input id={`${id}-video`} className={inputClass} value={draft.videoUrl} onChange={event => edit({ ...draft, videoUrl: event.target.value })} maxLength={2048} inputMode="url" spellCheck={false} dir="ltr" /></label>
          <label className="block" htmlFor={`${id}-poster`}><span className="mb-2 block text-xs font-medium" dir="auto">{t('media.poster')}</span><input id={`${id}-poster`} className={inputClass} value={draft.videoPoster} onChange={event => edit({ ...draft, videoPoster: event.target.value })} maxLength={2048} inputMode="url" spellCheck={false} dir="ltr" /></label>
          <p className="text-xs leading-5 text-[var(--color-text-secondary)]" dir="auto">{t('media.videoHint')}</p>
        </fieldset>
      </div>
      <aside className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h4 className="font-serif text-xl" dir="auto">{t('media.preview')}</h4><p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]" dir="auto">{t('media.previewHint')}</p>
        <img src={imagePreview || '/images/product-placeholder.svg'} alt={getLocalized(product, 'name', language)} loading="lazy" width={400} height={400} referrerPolicy="no-referrer" className="mt-4 aspect-square w-full rounded-xl object-cover" onError={event => { if (!event.currentTarget.src.endsWith('/images/product-placeholder.svg')) { event.currentTarget.src = '/images/product-placeholder.svg'; setPreviewFailed(true); } }} />
        {previewFailed && <p role="status" className="mt-3 text-xs leading-5 text-red-800 dark:text-red-300" dir="auto">{t('media.previewFailed')}</p>}
        {filmPreview && <div className="mt-4"><p className="mb-2 inline-flex items-center gap-2 text-xs" dir="auto"><Film size={15} aria-hidden="true" />{t('media.video')}</p><video key={filmPreview} src={filmPreview} poster={filmPoster || imagePreview || undefined} controls playsInline preload="none" className="aspect-video w-full rounded-xl bg-black" onError={() => setFilmFailed(true)} aria-label={t('media.video')} />{filmFailed && <p role="status" className="mt-3 text-xs text-red-800 dark:text-red-300" dir="auto">{t('media.videoError')}</p>}</div>}
      </aside>
    </div>}
    {draft && record && !loading && <footer className="mt-6 border-t border-[var(--color-border)] pt-4">
      <p className="text-xs text-[var(--color-text-secondary)]" dir="auto">{t('media.revision').replace('{number}', String(record.revision))} · {t(dirty ? 'media.unsaved' : 'media.noChanges')}</p>
      {clearOverride && <p className="mt-3 text-xs leading-5 text-[var(--color-accent-text)]" dir="auto">{t('media.resetHint')}</p>}
      {validationCode && <p className="mt-3 text-xs leading-5 text-red-800 dark:text-red-300" role="status" dir="auto">{errorText(validationCode)}</p>}
      {saved && <p className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300" role="status"><CheckCircle2 size={16} aria-hidden="true" /><span dir="auto">{t('media.saved')}</span></p>}
      <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy || !dirty || !validDraft} className={`${buttonClass} bg-[var(--color-primary)] text-[var(--color-primary-fg)]`} onClick={() => void save()}><Save size={16} aria-hidden="true" /><span dir="auto">{t(saving ? 'media.saving' : 'media.save')}</span></button><button type="button" disabled={busy || !dirty} className={buttonClass} onClick={() => { setDraft(copyMedia(record.media)); setClearOverride(false); setError(''); setSaved(false); setPreviewFailed(false); setFilmFailed(false); }}><span dir="auto">{t('media.discard')}</span></button><button type="button" disabled={busy} className={buttonClass} onClick={() => { setDraft(copyMedia(getDefaultProductMedia(product))); setClearOverride(true); setError(''); setSaved(false); setPreviewFailed(false); setFilmFailed(false); }}><span dir="auto">{t('media.defaults')}</span></button></div>
    </footer>}
  </section>;
}
