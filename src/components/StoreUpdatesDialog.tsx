import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { updatesRequest } from '../lib/updatesClient';
import { updateCopy, type UpdateFeed, type UpdatePreferences } from '../lib/storeUpdates';
import { acquireScrollLock } from '../utils/scrollLock';
import BellToggle from './BellToggle';

export default function StoreUpdatesDialog({ isOpen, onClose, onSignIn }: { isOpen: boolean; onClose: () => void; onSignIn: () => void }) {
  const { currentUser } = useAuth(), { t, language } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null), closeRef = useRef(onClose), uidRef = useRef(currentUser?.uid), visible = useRef(isOpen), mutation = useRef<AbortController | null>(null);
  closeRef.current = onClose; uidRef.current = currentUser?.uid; visible.current = isOpen;
  const id = useId();
  const [feed, setFeed] = useState<UpdateFeed | null>(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(false), [feedback, setFeedback] = useState(''), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const node = dialog.current;
    if (!isOpen || !node) return;
    const previous = document.activeElement as HTMLElement | null, release = acquireScrollLock();
    node.showModal();
    return () => { node.close(); release(); previous?.isConnected && previous.focus(); };
  }, [isOpen]);
  useEffect(() => {
    setFeed(null); setFeedback(''); setError(false);
    mutation.current?.abort(); setBusy(false);
  }, [currentUser, isOpen]);
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    const controller = new AbortController(); setLoading(true); setError(false);
    updatesRequest<UpdateFeed>(() => currentUser.getIdToken(), '/api/updates', { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setFeed(data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [isOpen, currentUser, refresh]);
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    const update = () => { if (document.visibilityState === 'visible' && navigator.onLine) setRefresh(value => value + 1); };
    const timer = setInterval(update, 60000); window.addEventListener('focus', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); mutation.current?.abort(); };
  }, [isOpen, currentUser]);
  const signIn = () => onSignIn();
  const save = async (body: Record<string, unknown>, path: string, feedbackKey: string) => {
    if (!currentUser || busy) return;
    const uid = currentUser.uid, controller = new AbortController(); mutation.current = controller; setBusy(true); setFeedback(''); setError(false);
    try {
      const preferences = await updatesRequest<UpdatePreferences>(() => currentUser.getIdToken(), path, { body, signal: controller.signal });
      if (!controller.signal.aborted && visible.current && uidRef.current === uid) { setFeed(previous => previous ? { ...previous, preferences, unread: preferences.enabled ? previous.items.filter(item => item.publishedAt > preferences.seenAt).length : 0, items: preferences.enabled ? previous.items : [] } : null); setFeedback(feedbackKey); setRefresh(value => value + 1); }
    } catch { if (!controller.signal.aborted && visible.current && uidRef.current === uid) setError(true); }
    finally { if (!controller.signal.aborted && visible.current && uidRef.current === uid) setBusy(false); }
  };
  return createPortal(<dialog ref={dialog} className="store-updates-dialog" dir="ltr" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <header><div><span className="updates-eyebrow">AllBarka</span><h2 id={`${id}-title`} dir="auto">{t('updates.title')}</h2></div><button className="updates-icon-button focus-ring" aria-label={t('updates.close')} onClick={onClose}><X size={20} /></button></header>
    <div className="updates-dialog-body"><p dir="auto" className="updates-hint">{t('updates.hint')}</p>
      {!currentUser ? <div className="updates-guest"><Bell size={32} /><p dir="auto">{t('updates.account')}</p><BellToggle pressed={false} onChange={signIn} offLabel={t('updates.notify')} onLabel={t('updates.enabled')} label={t('updates.preference')} /><button className="updates-text-button focus-ring" onClick={signIn}>{t('updates.signIn')}</button></div> : <>
        <BellToggle pressed={feed?.preferences.enabled === true} onChange={enabled => void save({ enabled }, '/api/updates/preferences', 'updates.saved')} offLabel={t('updates.notify')} onLabel={t('updates.enabled')} label={t('updates.preference')} count={feed?.unread || 0} disabled={busy || loading || !feed} />
        {loading && <p role="status" className="updates-status" dir="auto">{t('updates.loading')}</p>}
        {error && <div role="alert" className="updates-error"><p dir="auto">{t('updates.unavailable')}</p><button className="updates-text-button focus-ring" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16}/>{t('updates.retry')}</button></div>}
        {feedback && <p role="status" className="updates-status" dir="auto">{t(feedback)}</p>}
        {feed?.preferences.enabled && <div className="updates-list-heading"><h3 dir="auto">{t('updates.open')}</h3><button className="updates-text-button focus-ring" disabled={busy || !feed.unread} onClick={() => void save({ through: feed.asOf }, '/api/updates/read', 'updates.readSaved')}><CheckCheck size={17}/><span dir="auto">{t('updates.read')}</span></button></div>}
        {feed?.items.map(item => { const copy = updateCopy(item, language); return <article className="store-update-note" key={item.id}><div><time dateTime={new Date(item.publishedAt).toISOString()}>{new Intl.DateTimeFormat(language === 'en' ? 'en-PK' : language === 'ur' ? 'ur-PK' : 'ar', { dateStyle: 'medium' }).format(item.publishedAt)}</time>{item.publishedAt > feed.preferences.seenAt && <span dir="auto">{t('updates.new')}</span>}</div><h3 dir="auto">{copy.title}</h3><p dir="auto">{copy.message}</p>{item.href && <Link className="updates-text-button focus-ring" to={item.href} onClick={onClose}>{t('updates.explore')} →</Link>}</article>; })}
        {feed && !feed.items.length && !loading && <div className="updates-empty"><Bell size={25}/><h3 dir="auto">{t('updates.empty')}</h3><p dir="auto">{t(feed.preferences.enabled ? 'updates.emptyHint' : 'updates.offHint')}</p></div>}
      </>}
    </div>
  </dialog>, document.body);
}
