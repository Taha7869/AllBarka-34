import React, { useEffect, useRef, useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import { adminRequest } from '../lib/adminClient';
import { updateCopy, validateUpdateDraft, type StoreUpdate, type UpdateText } from '../lib/storeUpdates';

const blank = (): UpdateText => ({ en: '', ur: '', ar: '' });
export default function AdminUpdatesPanel() {
  const { currentUser } = useAuth(), { t, language } = useLanguage();
  const [locale, setLocale] = useState<LanguageCode>('en'), [title, setTitle] = useState(blank), [message, setMessage] = useState(blank), [href, setHref] = useState('');
  const [items, setItems] = useState<StoreUpdate[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [historyError, setHistoryError] = useState(false), [success, setSuccess] = useState(false), [revision, setRevision] = useState(0);
  const requestId = useRef(crypto.randomUUID()), controller = useRef<AbortController | null>(null), uid = useRef(currentUser?.uid), mounted = useRef(true);
  uid.current = currentUser?.uid;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => { controller.current?.abort(); setBusy(false); setItems([]); setSuccess(false); setError(''); setTitle(blank()); setMessage(blank()); setHref(''); requestId.current = crypto.randomUUID(); }, [currentUser?.uid]);
  useEffect(() => {
    if (!currentUser) return;
    const read = new AbortController(); setLoading(true); setHistoryError(false);
    adminRequest<{ items: StoreUpdate[] }>(() => currentUser.getIdToken(), '/api/admin/updates', { signal: read.signal }).then(data => { if (!read.signal.aborted) setItems(data.items); })
      .catch(() => { if (!read.signal.aborted) setHistoryError(true); }).finally(() => { if (!read.signal.aborted) setLoading(false); });
    return () => read.abort();
  }, [currentUser, revision]);
  const changed = () => { requestId.current = crypto.randomUUID(); setSuccess(false); };
  const publish = async (event: React.FormEvent) => {
    event.preventDefault(); if (!currentUser || busy) return;
    const body = { title, message, href, requestId: requestId.current };
    try { validateUpdateDraft(body); } catch { setError('updates.validation'); return; }
    const session = currentUser.uid, write = new AbortController(); controller.current = write; setBusy(true); setError(''); setSuccess(false);
    try {
      await adminRequest<StoreUpdate>(() => currentUser.getIdToken(), '/api/admin/updates', { body, signal: write.signal });
      if (mounted.current && !write.signal.aborted && uid.current === session) { setTitle(blank()); setMessage(blank()); setHref(''); requestId.current = crypto.randomUUID(); setSuccess(true); setRevision(value => value + 1); }
    } catch { if (mounted.current && !write.signal.aborted && uid.current === session) setError('updates.adminUnavailable'); }
    finally { if (mounted.current && !write.signal.aborted && uid.current === session) setBusy(false); }
  };
  const preview = updateCopy({ id: 'draft', title, message, href: '', publishedAt: 1 }, locale);
  return <section className="admin-section admin-updates" dir="ltr">
    <div className="admin-section-heading"><div><h2 dir="auto">{t('updates.adminTitle')}</h2><p dir="auto">{t('updates.adminHint')}</p></div><Bell size={23}/></div>
    <form onSubmit={publish} className="admin-update-composer" aria-busy={busy}>
      <div className="updates-languages" role="group" aria-label={t('language')}>{(['en', 'ur', 'ar'] as const).map(lang => <button type="button" key={lang} className="admin-button" aria-pressed={locale === lang} onClick={() => setLocale(lang)}>{lang === 'en' ? 'English' : lang === 'ur' ? 'اردو' : 'العربية'}</button>)}</div>
      <p className="updates-hint" dir="auto">{t('updates.languageHint')}</p>
      <label><span dir="auto">{t('updates.titleField')} · {locale.toUpperCase()}</span><input disabled={busy} maxLength={90} value={title[locale]} dir="auto" onChange={event => { changed(); setTitle(previous => ({ ...previous, [locale]: event.target.value })); }} /></label>
      <label><span dir="auto">{t('updates.messageField')} · {locale.toUpperCase()}</span><textarea disabled={busy} maxLength={1000} rows={4} value={message[locale]} dir="auto" onChange={event => { changed(); setMessage(previous => ({ ...previous, [locale]: event.target.value })); }} /></label>
      <label><span dir="auto">{t('updates.linkField')}</span><input disabled={busy} maxLength={300} value={href} placeholder="/shop" dir="ltr" onChange={event => { changed(); setHref(event.target.value); }} /></label>
      {(preview.title || preview.message) && <div className="admin-update-preview"><small dir="auto">{t('updates.preview')}</small><h3 dir="auto">{preview.title}</h3><p dir="auto">{preview.message}</p></div>}
      {error && <p role="alert" className="updates-error" dir="auto">{t(error)}</p>}{success && <p role="status" dir="auto">{t('updates.published')}</p>}
      <button type="submit" disabled={busy || !title.en.trim() || !message.en.trim()} className="admin-button admin-button-primary"><Send size={16}/><span dir="auto">{t(busy ? 'updates.publishing' : 'updates.publish')}</span></button>
    </form>
    <div className="admin-section-heading"><h3 dir="auto">{t('updates.history')}</h3><button type="button" className="admin-button" disabled={loading} onClick={() => setRevision(value => value + 1)}>{t('updates.retry')}</button></div>
    {loading ? <p role="status" dir="auto">{t('updates.loading')}</p> : historyError ? <p role="alert" className="updates-error" dir="auto">{t('updates.adminUnavailable')}</p> : !items.length ? <p dir="auto">{t('updates.noHistory')}</p> : items.map(item => { const copy = updateCopy(item, language); return <article key={item.id} className="store-update-note"><time dateTime={new Date(item.publishedAt).toISOString()}>{new Intl.DateTimeFormat(language === 'en' ? 'en-PK' : language === 'ur' ? 'ur-PK' : 'ar', { dateStyle: 'medium' }).format(item.publishedAt)}</time><h3 dir="auto">{copy.title}</h3><p dir="auto">{copy.message}</p><bdi>{item.href}</bdi></article>; })}
  </section>;
}
