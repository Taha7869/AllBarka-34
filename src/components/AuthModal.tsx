import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { X, Crown, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authenticateEmail, completeEmailSignIn, emailAuthErrorKey, type EmailAuthMode } from '../lib/emailAuthentication';
import { authenticateGoogle, googleAuthErrorKey, prepareGoogleSignIn, type GoogleAuthSdk } from '../lib/googleAuthentication';
import type { User } from 'firebase/auth';
import { acquireScrollLock } from '../utils/scrollLock';

interface AuthModalProps { isOpen: boolean; onClose: () => void; initialMode?: EmailAuthMode; onAuthSuccess?: () => void }
type AuthView = EmailAuthMode | 'choice';
const initialView = (mode: EmailAuthMode): AuthView => mode === 'signin' ? 'choice' : mode;

export default function AuthModal({ isOpen, onClose, initialMode = 'signin', onAuthSuccess }: AuthModalProps) {
  const { refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<AuthView>(() => initialView(initialMode));
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyProvider, setBusyProvider] = useState<'email' | 'google' | null>(null);
  const [errorKey, setErrorKey] = useState('');
  const [successKey, setSuccessKey] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const visible = useRef(isOpen);
  const requestVersion = useRef(0);
  const onCloseRef = useRef(onClose);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleSdk = useRef<GoogleAuthSdk | null>(null);
  const id = useId();
  visible.current = isOpen; onCloseRef.current = onClose;

  useEffect(() => {
    requestVersion.current++;
    if (timer.current) clearTimeout(timer.current);
    setPassword(''); setConfirmation(''); setErrorKey(''); setSuccessKey(''); setShowPassword(false);
    busyRef.current = false; setBusy(false); setBusyProvider(null);
    if (isOpen) { setMode(initialView(initialMode)); setEmail(''); setName(''); }
  }, [isOpen, initialMode]);
  useEffect(() => () => { visible.current = false; requestVersion.current++; if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void prepareGoogleSignIn().then(sdk => { if (active) googleSdk.current = sdk; }, () => { if (active) googleSdk.current = null; });
    return () => { active = false; };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const release = acquireScrollLock();
    const root = document.getElementById('root');
    const previousInert = root?.inert ?? false;
    if (root) root.inert = true;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]') || []).filter(control => control.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { release(); document.removeEventListener('keydown', keydown); if (root) root.inert = previousInert; if (previous?.isConnected) previous.focus(); };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('[data-auth-focus]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen, mode]);

  const changeMode = (next: AuthView) => { if (busyRef.current || successKey === 'auth.success') return; setMode(next); setErrorKey(''); setSuccessKey(''); setPassword(''); setConfirmation(''); setShowPassword(false); };
  const signedIn = (user: User, version: number, enteredName = '') => {
    // A verified OAuth result receives the same profile/session/order recovery as email.
    void completeEmailSignIn(user, enteredName).then(() => refreshProfile());
    if (!visible.current || version !== requestVersion.current) return;
    setSuccessKey('auth.success'); setPassword(''); setConfirmation('');
    onAuthSuccess?.();
    timer.current = setTimeout(() => { if (visible.current && version === requestVersion.current) onCloseRef.current(); }, reduceMotion ? 500 : 1000);
  };
  const googleSignIn = async () => {
    if (busyRef.current || successKey === 'auth.success') return;
    const version = ++requestVersion.current;
    busyRef.current = true; setBusy(true); setBusyProvider('google'); setErrorKey(''); setSuccessKey('');
    try {
      const user = await authenticateGoogle(language, googleSdk.current || undefined);
      signedIn(user, version);
    } catch (failure: any) {
      if (visible.current && version === requestVersion.current) setErrorKey(googleAuthErrorKey(failure?.code));
    } finally {
      if (visible.current && version === requestVersion.current) { busyRef.current = false; setBusy(false); setBusyProvider(null); }
    }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busyRef.current || mode === 'choice' || successKey === 'auth.success') return;
    const version = ++requestVersion.current;
    busyRef.current = true; setBusy(true); setBusyProvider('email'); setErrorKey(''); setSuccessKey('');
    try {
      const result = await authenticateEmail({ mode, email, password, name, confirmPassword: confirmation });
      if (result.user) { signedIn(result.user, version, mode === 'signup' ? name : ''); return; }
      if (!visible.current || version !== requestVersion.current) return;
      if (result.resetSent) { setSuccessKey('auth.resetSent'); return; }
    } catch (failure: any) {
      if (visible.current && version === requestVersion.current) setErrorKey(emailAuthErrorKey(failure?.code));
    } finally {
      if (visible.current && version === requestVersion.current) { busyRef.current = false; setBusy(false); setBusyProvider(null); }
    }
  };

  if (!isOpen) return null;
  const field = 'w-full min-h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-base)] px-4 text-base text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-gold)]/20';
  const completed = successKey === 'auth.success';
  const titleMode = mode === 'choice' ? 'signin' : mode;
  const content = <div className="fixed inset-0 z-[12000] flex items-center justify-center p-3 sm:p-4" dir="ltr">
    <motion.div aria-hidden="true" initial={{ opacity: reduceMotion ? 1 : 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => { if (!busyRef.current) onClose(); }} />
    <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-hint`} initial={reduceMotion ? false : { opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0 : .22 }} className="relative z-10 flex max-h-[92svh] w-full max-w-md flex-col overflow-hidden rounded-[24px] border border-[var(--color-border-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-gold)]"><Crown size={19} /></span><div><p className="text-[10px] font-semibold text-[var(--color-accent-text)]" dir="auto">{t('auth.subtitle')}</p><h2 id={`${id}-title`} className="font-serif text-xl font-semibold" dir="auto">{t(`auth.title.${titleMode}`)}</h2></div></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label={t('close')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-base)] disabled:opacity-50"><X size={18} /></button>
      </header>
      <div className="overflow-y-auto px-5 py-5 sm:px-6">
        {mode !== 'choice' && <button type="button" disabled={busy || completed} onClick={() => changeMode(mode === 'forgot_password' ? 'signin' : 'choice')} className="focus-ring mb-2 flex min-h-11 items-center gap-2 rounded-lg pr-3 text-xs font-medium text-[var(--color-accent-text)] disabled:opacity-50"><ArrowLeft size={15} aria-hidden="true" /><span dir="auto">{t(mode === 'forgot_password' ? 'auth.backToSignIn' : 'auth.backToOptions')}</span></button>}
        <p id={`${id}-hint`} dir="auto" className="mb-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">{t(mode === 'choice' ? 'auth.hint.signin' : mode === 'signin' ? 'auth.hint.emailSignin' : `auth.hint.${mode}`)}</p>
        {errorKey && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/35 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300"><AlertCircle size={17} className="mt-0.5 shrink-0" /><span dir="auto">{t(errorKey)}</span></div>}
        {successKey && <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-[var(--color-border-accent)] bg-[var(--color-base)] p-3 text-sm"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--color-accent-text)]" /><span dir="auto">{t(successKey)}</span></div>}
        {mode === 'choice' && <div className="space-y-3">
          <button type="button" disabled={busy || successKey === 'auth.success'} onClick={googleSignIn} aria-busy={busy && busyProvider === 'google'} className="focus-ring flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white px-4 py-3 text-sm font-semibold text-[#3c4043] transition-colors hover:bg-[#f8f9fa] disabled:opacity-60 motion-reduce:transition-none">
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.67-.35-3.93H24v7.43h11c-.47 2.39-1.86 4.41-3.94 5.77v4.8h6.39c3.73-3.43 6.16-8.52 6.16-14.07z" /><path fill="#34A853" d="M24 44c5.4 0 9.94-1.79 13.25-4.85l-6.39-4.8c-1.78 1.2-4.06 1.92-6.86 1.92-5.23 0-9.66-3.53-11.25-8.27H6.17v4.95A20 20 0 0 0 24 44z" /><path fill="#FBBC05" d="M12.75 28a12.02 12.02 0 0 1 0-8V15.05H6.17a20 20 0 0 0 0 17.9L12.75 28z" /><path fill="#EA4335" d="M24 11.73c3.02 0 5.72 1.04 7.85 3.09l5.89-5.89A19.7 19.7 0 0 0 24 4 20 20 0 0 0 6.17 15.05L12.75 20c1.59-4.74 6.02-8.27 11.25-8.27z" /></svg>
            <span dir="auto">{t(busy && busyProvider === 'google' ? 'auth.googleWorking' : 'auth.google')}</span>
          </button>
          <button type="button" data-auth-focus disabled={busy || completed} onClick={() => changeMode('signin')} className="focus-ring flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border-accent)] bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-60"><Mail size={18} aria-hidden="true" /><span dir="auto">{t('auth.googleOrEmail')}</span></button>
          <p className="pt-2 text-center text-xs leading-relaxed text-[var(--color-text-secondary)]" dir="auto">{t('auth.googleAccountHint')}</p>
        </div>}
        {mode !== 'choice' && <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
          {mode === 'signup' && <label className="block space-y-2 text-xs font-medium"><span dir="auto" className="block">{t('auth.name')}</span><input data-auth-focus className={field} dir="auto" type="text" autoComplete="name" maxLength={80} required disabled={busy || completed} value={name} onChange={event => setName(event.target.value)} /></label>}
          <label className="block space-y-2 text-xs font-medium"><span dir="auto" className="block">{t('auth.email')}</span><div className="relative"><Mail size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" /><input data-auth-focus={mode === 'signup' ? undefined : true} className={`${field} pl-10`} dir="ltr" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={254} required disabled={busy || completed} value={email} onChange={event => setEmail(event.target.value)} /></div></label>
          {mode !== 'forgot_password' && <label className="block space-y-2 text-xs font-medium"><span dir="auto" className="block">{t('auth.password')}</span><div className="relative"><input className={`${field} pr-14`} dir="ltr" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : 1} required disabled={busy || completed} value={password} onChange={event => setPassword(event.target.value)} /><button type="button" disabled={busy || completed} className="focus-ring absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[var(--color-text-secondary)] disabled:opacity-50" aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{mode === 'signup' && <span className="block text-[var(--color-text-secondary)]" dir="auto">{t('auth.passwordHint')}</span>}</label>}
          {mode === 'signup' && <label className="block space-y-2 text-xs font-medium"><span dir="auto" className="block">{t('auth.confirmPassword')}</span><input className={field} dir="ltr" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required disabled={busy || completed} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>}
          <button type="submit" disabled={busy || successKey === 'auth.success'} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border-accent)] bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-60"><span dir="auto">{t(busy && busyProvider === 'email' ? 'auth.working' : `auth.submit.${mode}`)}</span><ArrowRight size={16} /></button>
        </form>}
        <div className="mt-3 flex flex-col items-center text-xs text-[var(--color-text-secondary)]">
          {mode === 'signin' && <button type="button" disabled={busy || completed} className="focus-ring min-h-11 rounded-lg px-3 text-[var(--color-accent-text)] underline underline-offset-4" onClick={() => changeMode('forgot_password')} dir="auto">{t('auth.forgot')}</button>}
          {mode !== 'forgot_password' && <div className="flex flex-wrap items-center justify-center gap-x-2"><span dir="auto">{t(mode === 'signup' ? 'auth.haveAccount' : 'auth.needAccount')}</span><button type="button" disabled={busy || completed} className="focus-ring min-h-11 rounded-lg px-2 font-semibold text-[var(--color-accent-text)]" onClick={() => changeMode(mode === 'signup' ? 'signin' : 'signup')} dir="auto">{t(mode === 'signup' ? 'auth.submit.signin' : 'auth.submit.signup')}</button></div>}
        </div>
      </div>
    </motion.div>
  </div>;
  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
