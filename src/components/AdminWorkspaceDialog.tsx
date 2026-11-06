import React,{useEffect,useId,useRef} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {useAdminLanguage} from '../hooks/useAdminLanguage';
import {acquireScrollLock} from '../utils/scrollLock';
/** One focus-managed dialog for details and print; private records stay in memory. */
export default function AdminWorkspaceDialog({ title, children, onClose, busy = false, packing = false }: { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean; packing?: boolean }) {
  const { t } = useAdminLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose; busyRef.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const release = acquireScrollLock();
    const root = document.getElementById('root');
    const previousInert = root?.inert ?? false;
    if (root) root.inert = true;
    const frame = requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('button')?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || []).filter(el => el.getClientRects().length);
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !ref.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !ref.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', keydown); release(); if (root) root.inert = previousInert; if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div className="admin-dialog-backdrop" data-admin-dialog data-admin-packing={packing ? 'true' : undefined} dir="ltr" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="admin-dialog-panel">
      <header className="admin-dialog-header"><div><p className="admin-eyebrow">AllBarka</p><h2 id={titleId} dir="auto">{title}</h2></div><button type="button" className="admin-icon-button admin-dialog-close" aria-label={t('admin.close')} disabled={busy} onClick={onClose}><X size={20} /></button></header>
      {children}
    </div>
  </div>, document.body);
}

