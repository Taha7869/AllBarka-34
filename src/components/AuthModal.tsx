import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Phone,
  Crown,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  RefreshCw,
  Mail,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { WHATSAPP_SUPPORT_URL } from '../config/contacts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot_password';
  onAuthSuccess?: () => void;
}

type ModalTab = 'email' | 'phone';
type EmailMode = 'signin' | 'register';

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
}: AuthModalProps) {
  const { refreshProfile } = useAuth();
  const { t, isRtl } = useLanguage();

  // ─── Tab / Feature Flag ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ModalTab>('email');
  const [phoneAuthEnabled, setPhoneAuthEnabled] = useState(true);

  // ─── Email Tab State ─────────────────────────────────────────────────────────
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ─── Phone Tab State (preserved from Stage 10) ──────────────────────────────
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+92');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(0);

  // ─── Shared ──────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

  // ─── Reset on modal open + fetch config ─────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setActiveTab('email');
      setEmailMode('signin');
      setEmail('');
      setPassword('');
      setName('');
      setShowPassword(false);
      setStep('phone');
      setPhone('+92');
      setOtp(Array(6).fill(''));
      setAuthErrorMsg(null);
      setAuthSuccessMsg(null);
      setResendTimer(0);

      // Fetch phone auth flag from server
      fetch('/api/auth/config')
        .then(r => r.json())
        .then(data => {
          setPhoneAuthEnabled(data.phoneAuthEnabled !== false);
        })
        .catch(() => setPhoneAuthEnabled(true));
    }
  }, [isOpen]);

  // ─── Resend countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ─── ESC to close ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ─── Tab switch: clear errors ────────────────────────────────────────────────
  const handleTabChange = (tab: ModalTab) => {
    setActiveTab(tab);
    setAuthErrorMsg(null);
    setAuthSuccessMsg(null);
  };

  // ─── Error helper ────────────────────────────────────────────────────────────
  const getFriendlyError = useCallback((errorCode: string, extra?: Record<string, string>): string => {
    switch (errorCode) {
      // Email errors
      case 'auth/invalid-email':
      case 'auth/missing-email':
        return t('error_email_required', 'Please enter a valid email address.');
      case 'auth/weak-password':
        return t('error_password_weak', 'Password must be at least 6 characters.');
      case 'auth/email-already-in-use':
        return t('error_email_in_use', 'This email is already registered. Try signing in.');
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return t('error_wrong_password', 'Incorrect email or password.');
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return t('error_unexpected', 'Sign-in cancelled. Please try again.');
      case 'auth/popup-blocked':
        return t('error_unexpected', 'Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      // Phone errors
      case 'auth/invalid-phone-number':
        return t('error_invalid_phone', 'Invalid phone number. Include country code (e.g., +923001234567).');
      case 'auth/too-many-requests':
        return t('error_too_many_requests', 'Too many attempts from this device. Please try again later.');
      case 'auth/quota-exceeded':
        return t('error_quota_exceeded_friendly', 'Phone login limit reached today — please use Email or Google.');
      case 'auth/invalid-verification-code':
        return t('error_invalid_otp', 'Incorrect verification code. Please try again.');
      case 'auth/code-expired':
        return t('error_expired_otp', 'Verification code expired. Please request a new one.');
      case 'rate_limit': {
        const mins = extra?.minutes || '10';
        return t('error_rate_limit_minutes', `Too many OTP requests. Please wait {minutes} minutes.`).replace('{minutes}', mins);
      }
      default:
        return t('error_unexpected', 'An unexpected error occurred. Please try again or contact concierge.');
    }
  }, [t]);

  // ─── Session cookie helper (shared by all auth methods) ─────────────────────
  const establishSession = useCallback(async (user: any): Promise<void> => {
    const idToken = await user.getIdToken();
    const sessionRes = await fetch('/api/auth/sessionLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!sessionRes.ok) throw new Error('Failed to establish secure session');

    await refreshProfile();

    // Claim any pending guest order
    const pendingClaimToken = sessionStorage.getItem('pendingClaimToken');
    const pendingOrderId = sessionStorage.getItem('pendingOrderId');
    if (pendingClaimToken && pendingOrderId) {
      try {
        await fetch('/api/orders/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ orderId: pendingOrderId, claimToken: pendingClaimToken }),
        });
        sessionStorage.removeItem('pendingClaimToken');
        sessionStorage.removeItem('pendingOrderId');
      } catch (claimErr) {
        console.error('Order claim error:', claimErr);
      }
    }
  }, [refreshProfile]);

  const handleAuthSuccess = useCallback(() => {
    setAuthSuccessMsg(t('login_success', 'Welcome to the AllBarka VIP Patron Circle!'));
    if (onAuthSuccess) onAuthSuccess();
    setTimeout(() => {
      setAuthSuccessMsg(null);
      onClose();
    }, 1400);
  }, [t, onAuthSuccess, onClose]);

  // ─── Email Sign-In ───────────────────────────────────────────────────────────
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setAuthErrorMsg(getFriendlyError('auth/invalid-email')); return; }
    if (password.length < 6) { setAuthErrorMsg(getFriendlyError('auth/weak-password')); return; }

    setAuthErrorMsg(null);
    setIsLoading(true);
    try {
      const [{ signInWithEmailAndPassword }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../lib/firebase'),
      ]);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await establishSession(cred.user);
      handleAuthSuccess();
    } catch (err: any) {
      setAuthErrorMsg(getFriendlyError(err.code || 'default'));
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Email Register ──────────────────────────────────────────────────────────
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setAuthErrorMsg(getFriendlyError('auth/invalid-email')); return; }
    if (password.length < 6) { setAuthErrorMsg(getFriendlyError('auth/weak-password')); return; }

    setAuthErrorMsg(null);
    setIsLoading(true);
    try {
      const [{ createUserWithEmailAndPassword }, { auth }, { doc, setDoc }, { db }] = await Promise.all([
        import('firebase/auth'),
        import('../lib/firebase'),
        import('firebase/firestore'),
        import('../lib/firebase'),
      ]);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;

      // Create Firestore patron record
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: name.trim() || 'VIP Patron',
        patronStatus: 'VIP Patron',
        loyaltyPoints: 0,
        createdAt: Date.now(),
      }, { merge: true });

      await establishSession(user);
      handleAuthSuccess();
    } catch (err: any) {
      setAuthErrorMsg(getFriendlyError(err.code || 'default'));
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Google Sign-In ──────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setAuthErrorMsg(null);
    setIsLoading(true);
    try {
      const [{ signInWithPopup, GoogleAuthProvider }, { auth }, { doc, setDoc, getDoc }, { db }] = await Promise.all([
        import('firebase/auth'),
        import('../lib/firebase'),
        import('firebase/firestore'),
        import('../lib/firebase'),
      ]);
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user = cred.user;

      // Create/merge patron record
      const docRef = doc(db, 'users', user.uid);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'VIP Patron',
          patronStatus: 'VIP Patron',
          loyaltyPoints: 0,
          createdAt: Date.now(),
        }, { merge: true });
      }

      await establishSession(user);
      handleAuthSuccess();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setAuthErrorMsg(null); // user cancelled — silent
      } else {
        setAuthErrorMsg(getFriendlyError(err.code || 'default'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Phone: Send OTP ─────────────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent, isResend = false) => {
    if (e) e.preventDefault();
    if (!phone || phone.trim().length < 8) {
      setAuthErrorMsg(t('error_phone_required', 'Please enter a valid phone number.'));
      return;
    }
    setAuthErrorMsg(null);
    setIsLoading(true);
    try {
      const [{ RecaptchaVerifier, signInWithPhoneNumber }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../lib/firebase'),
      ]);

      // Rate-limit check server-side
      const res = await fetch('/api/auth/request-otp-allowance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const mins = String(data.waitMinutes || 10);
        throw { code: 'rate_limit', waitMinutes: mins };
      }

      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }

      const confirmationResult = await signInWithPhoneNumber(auth, phone.trim(), (window as any).recaptchaVerifier);
      (window as any).confirmationResult = confirmationResult;
      setStep('otp');
      setResendTimer(60);
    } catch (error: any) {
      console.error('OTP Send Error:', error);
      if (error.code === 'auth/quota-exceeded') {
        setAuthErrorMsg(getFriendlyError('auth/quota-exceeded'));
      } else if (error.code === 'rate_limit') {
        setAuthErrorMsg(getFriendlyError('rate_limit', { minutes: error.waitMinutes || '10' }));
      } else if (error.code) {
        setAuthErrorMsg(getFriendlyError(error.code));
      } else {
        setAuthErrorMsg(getFriendlyError('default'));
      }
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.render().then((widgetId: any) => {
          (window as any).grecaptcha?.reset(widgetId);
        }).catch(() => {});
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Phone: Verify OTP ───────────────────────────────────────────────────────
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setAuthErrorMsg(t('error_complete_otp', 'Please enter the 6-digit code.'));
      return;
    }
    setAuthErrorMsg(null);
    setIsLoading(true);
    try {
      const [{ doc, setDoc, getDoc }, { db }] = await Promise.all([
        import('firebase/firestore'),
        import('../lib/firebase'),
      ]);
      const result = await (window as any).confirmationResult.confirm(code);
      const user = result.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          phone: user.phoneNumber,
          name: 'VIP Patron',
          patronStatus: 'VIP Patron',
          loyaltyPoints: 0,
          createdAt: Date.now(),
        }, { merge: true });
      }

      await establishSession(user);
      handleAuthSuccess();
    } catch (error: any) {
      console.error('OTP Verify Error:', error);
      setAuthErrorMsg(getFriendlyError(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  // ─── OTP input helpers ───────────────────────────────────────────────────────
  const handleOtpChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!/^[0-9]*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);
    setAuthErrorMsg(null);
    if (val && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (paste.length > 0) {
      const newOtp = [...otp];
      paste.forEach((char, i) => (newOtp[i] = char));
      setOtp(newOtp);
      const nextIndex = Math.min(paste.length, 5);
      otpRefs.current[nextIndex]?.focus();
    }
  };

  if (!isOpen) return null;

  // ─── Shared error banner ─────────────────────────────────────────────────────
  const ErrorBanner = ({ msg, showSupport = false }: { msg: string; showSupport?: boolean }) => (
    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
        <span>{msg}</span>
      </div>
      {showSupport && (
        <a
          href={WHATSAPP_SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[var(--color-gold,#B8935F)] hover:underline font-bold text-[10px] uppercase tracking-widest"
        >
          {t('whatsapp_support', 'Contact Support on WhatsApp')}
          <ArrowRight size={10} className={isRtl ? 'rotate-180' : ''} />
        </a>
      )}
    </div>
  );

  const isRateLimitError = authErrorMsg?.includes('minutes') || authErrorMsg?.includes('منٹ') || authErrorMsg?.includes('دقيقة') || authErrorMsg?.includes('limit') || authErrorMsg?.includes('quota') || authErrorMsg?.includes('ختم') || authErrorMsg?.includes('الأقصى');

  // ─── Submit button ────────────────────────────────────────────────────────────
  const PrimaryBtn = ({ label, onClick, type = 'submit', disabled = false }: { label: string; onClick?: () => void; type?: 'submit' | 'button'; disabled?: boolean }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading || disabled}
      className="w-full py-3.5 rounded-xl bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)] font-black text-xs uppercase tracking-widest shadow-xs hover:bg-[var(--color-ink,#1F120F)]/90 hover:shadow-[0_4px_15px_rgba(184,147,95,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <span className="w-4 h-4 rounded-full border-2 border-[#FDFBF7]/30 border-t-[#FDFBF7] animate-spin inline-block" />
      ) : (
        label
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.96 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md bg-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)]/35 rounded-[24px] shadow-[0_24px_60px_rgba(31,18,15,0.22),0_0_32px_rgba(184,147,95,0.15)] overflow-hidden flex flex-col max-h-[92vh]"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--color-gold,#B8935F)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--color-gold,#B8935F)]/20 bg-white/80 dark:bg-black/30 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-ink,#1F120F)] border border-[var(--color-gold,#B8935F)]/50 flex items-center justify-center shadow-xs">
              <Crown size={18} className="text-[var(--color-gold,#B8935F)]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[var(--color-ink,#1F120F)] dark:text-[var(--color-surface,#FDFBF7)] leading-tight">
                {t('patron_login', 'Patron Member Access')}
              </h3>
              <p className="text-[9.5px] font-bold tracking-widest uppercase text-[var(--color-gold,#B8935F)] mt-0.5">
                {t('vip_concierge', 'AllBarka VIP Concierge')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--color-ink,#1F120F)]/5 hover:bg-[var(--color-ink,#1F120F)]/10 text-[var(--color-ink,#1F120F)] dark:text-[var(--color-surface,#FDFBF7)] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab bar (only shown if phone auth enabled) */}
        {phoneAuthEnabled && (
          <div className="flex border-b border-[var(--color-gold,#B8935F)]/20 shrink-0 bg-white/60 dark:bg-black/20">
            {(['email', 'phone'] as ModalTab[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 cursor-pointer ${
                  activeTab === tab
                    ? 'border-[var(--color-gold,#B8935F)] text-[var(--color-gold,#B8935F)]'
                    : 'border-transparent text-[var(--color-ink,#1F120F)]/50 dark:text-white/40 hover:text-[var(--color-ink,#1F120F)]/80'
                }`}
              >
                {tab === 'email' ? <Mail size={13} /> : <Phone size={13} />}
                {tab === 'email' ? t('tab_email', 'Email') : t('tab_phone', 'Phone')}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 relative custom-scrollbar">
          <AnimatePresence mode="wait">
            {/* ── Success state ── */}
            {authSuccessMsg ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-[var(--color-gold,#B8935F)]/10 flex items-center justify-center mb-4 border-2 border-[var(--color-gold,#B8935F)]/30">
                  <CheckCircle2 size={32} className="text-[var(--color-gold,#B8935F)]" />
                </div>
                <h4 className="font-serif font-black text-xl text-[var(--color-ink,#1F120F)] dark:text-[var(--color-surface,#FDFBF7)] mb-2">
                  {t('success', 'Success')}
                </h4>
                <p className="text-sm font-medium text-[var(--color-ink,#1F120F)]/70 dark:text-white/60 px-4">
                  {authSuccessMsg}
                </p>
              </motion.div>

            ) : activeTab === 'email' ? (
              /* ── EMAIL TAB ─────────────────────────────────────────────────── */
              <motion.div
                key="email-tab"
                initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {authErrorMsg && (
                  <ErrorBanner msg={authErrorMsg} />
                )}

                <form
                  onSubmit={emailMode === 'signin' ? handleEmailSignIn : handleEmailRegister}
                  className="space-y-3"
                >
                  {/* Name field — register only */}
                  {emailMode === 'register' && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-[var(--color-ink,#1F120F)]/75 dark:text-white/60 uppercase tracking-widest px-1">
                        {t('name_label', 'Full Name')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-[var(--color-gold,#B8935F)]">
                          <User size={15} />
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={e => { setAuthErrorMsg(null); setName(e.target.value); }}
                          placeholder={t('name_label', 'Full Name')}
                          className="w-full bg-white dark:bg-white/10 border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 ps-10 pe-4 text-sm font-medium focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] dark:text-white placeholder:text-[var(--color-ink,#1F120F)]/40 transition-colors shadow-2xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email field */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-[var(--color-ink,#1F120F)]/75 dark:text-white/60 uppercase tracking-widest px-1">
                      {t('email_label', 'Email Address')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-[var(--color-gold,#B8935F)]">
                        <Mail size={15} />
                      </div>
                      <input
                        type="email"
                        dir="ltr"
                        value={email}
                        onChange={e => { setAuthErrorMsg(null); setEmail(e.target.value); }}
                        placeholder="patron@example.com"
                        autoComplete="email"
                        className="w-full bg-white dark:bg-white/10 border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 ps-10 pe-4 text-sm font-medium focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] dark:text-white placeholder:text-[var(--color-ink,#1F120F)]/40 transition-colors shadow-2xs text-left"
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-[var(--color-ink,#1F120F)]/75 dark:text-white/60 uppercase tracking-widest px-1">
                      {t('password_label', 'Password')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-[var(--color-gold,#B8935F)]">
                        <Lock size={15} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        dir="ltr"
                        value={password}
                        onChange={e => { setAuthErrorMsg(null); setPassword(e.target.value); }}
                        placeholder="••••••••"
                        autoComplete={emailMode === 'signin' ? 'current-password' : 'new-password'}
                        className="w-full bg-white dark:bg-white/10 border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 ps-10 pe-10 text-sm font-medium focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] dark:text-white placeholder:text-[var(--color-ink,#1F120F)]/40 transition-colors shadow-2xs text-left"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-[var(--color-ink,#1F120F)]/40 hover:text-[var(--color-ink,#1F120F)]/70 transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="pt-2">
                    <PrimaryBtn
                      label={emailMode === 'signin' ? t('btn_signin', 'Sign In') : t('btn_register', 'Create Account')}
                    />
                  </div>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-[var(--color-gold,#B8935F)]/20" />
                  <span className="text-[10px] text-[var(--color-ink,#1F120F)]/40 dark:text-white/30 font-medium uppercase tracking-widest">or</span>
                  <div className="flex-1 h-px bg-[var(--color-gold,#B8935F)]/20" />
                </div>

                {/* Google button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-white dark:bg-white/10 border border-[var(--color-gold,#B8935F)]/30 hover:border-[var(--color-gold,#B8935F)]/60 font-bold text-xs text-[var(--color-ink,#1F120F)] dark:text-white flex items-center justify-center gap-2.5 transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {/* Google SVG logo */}
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t('btn_google', 'Continue with Google')}
                </button>

                {/* Switch signin/register */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode(m => m === 'signin' ? 'register' : 'signin');
                      setAuthErrorMsg(null);
                    }}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink,#1F120F)]/50 dark:text-white/40 hover:text-[var(--color-gold,#B8935F)] transition-colors cursor-pointer"
                  >
                    {emailMode === 'signin'
                      ? t('switch_to_register', 'New here? Create account')
                      : t('switch_to_signin', 'Already have an account? Sign in')
                    }
                  </button>
                </div>
              </motion.div>

            ) : (
              /* ── PHONE TAB ─────────────────────────────────────────────────── */
              <motion.div
                key="phone-tab"
                initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <AnimatePresence mode="wait">
                  {step === 'phone' ? (
                    <motion.form
                      key="phone-step"
                      initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleSendOtp}
                      className="space-y-4"
                    >
                      {authErrorMsg && (
                        <ErrorBanner msg={authErrorMsg} showSupport={isRateLimitError} />
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-[var(--color-ink,#1F120F)]/75 dark:text-white/60 uppercase tracking-widest px-1">
                          {t('phone_number_label', 'Mobile Phone Number')}
                        </label>
                        <p className="text-[10px] text-[var(--color-ink,#1F120F)]/60 dark:text-white/40 px-1 pb-1">
                          {t('otp_instruction', 'You will receive a 6-digit verification code via SMS.')}
                        </p>
                        <div className="relative">
                          <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-[var(--color-gold,#B8935F)]">
                            <Phone size={16} />
                          </div>
                          <input
                            type="tel"
                            dir="ltr"
                            value={phone}
                            onChange={e => { setAuthErrorMsg(null); setPhone(e.target.value); }}
                            placeholder="+92 300 1234567"
                            className="w-full bg-white dark:bg-white/10 border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 ps-10 pe-4 text-sm tracking-widest font-bold focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] dark:text-white placeholder:text-[var(--color-ink,#1F120F)]/40 transition-colors shadow-2xs text-left"
                          />
                        </div>
                      </div>

                      <div id="recaptcha-container" />

                      <div className="pt-2">
                        <PrimaryBtn label={t('send_code', 'Send Verification Code')} />
                      </div>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="otp-step"
                      initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {authErrorMsg && (
                        <ErrorBanner msg={authErrorMsg} showSupport={isRateLimitError} />
                      )}

                      <div className="text-center pt-2 pb-4">
                        <div className="mx-auto w-12 h-12 rounded-full border-2 border-[var(--color-gold,#B8935F)]/30 flex justify-center items-center mb-3">
                          <Lock size={20} className="text-[var(--color-gold,#B8935F)]" />
                        </div>
                        <h4 className="font-serif font-black text-lg text-[var(--color-ink,#1F120F)] dark:text-[var(--color-surface,#FDFBF7)]">
                          {t('verify_your_number', 'Verify Your Number')}
                        </h4>
                        <p className="text-xs text-[var(--color-ink,#1F120F)]/60 dark:text-white/50 mt-1" dir="ltr">
                          {t('enter_code_sent_to', 'Enter the 6-digit code sent to')} <br />
                          <strong className="text-[var(--color-ink,#1F120F)] dark:text-white">{phone}</strong>
                        </p>
                      </div>

                      <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div dir="ltr" className="flex justify-center gap-1.5 sm:gap-2">
                          {otp.map((d, index) => (
                            <input
                              key={index}
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              pattern="\d*"
                              maxLength={1}
                              value={d}
                              ref={el => (otpRefs.current[index] = el)}
                              onChange={e => handleOtpChange(index, e)}
                              onKeyDown={e => handleOtpKeyDown(index, e)}
                              onPaste={handleOtpPaste}
                              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-white dark:bg-white/10 border border-[var(--color-gold,#B8935F)]/30 rounded-xl focus:outline-none focus:border-[var(--color-gold,#B8935F)] focus:ring-1 focus:ring-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] dark:text-white shadow-2xs"
                            />
                          ))}
                        </div>

                        <PrimaryBtn
                          label={t('verify_login', 'Verify & Login')}
                          disabled={otp.join('').length < 6}
                        />
                      </form>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--color-gold,#B8935F)]/20">
                        <button
                          type="button"
                          onClick={() => setStep('phone')}
                          className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink,#1F120F)]/60 dark:text-white/40 hover:text-[var(--color-ink,#1F120F)] dark:hover:text-white cursor-pointer"
                        >
                          {t('change_number', 'Change Number')}
                        </button>

                        <button
                          type="button"
                          disabled={resendTimer > 0 || isLoading}
                          onClick={() => handleSendOtp(undefined, true)}
                          className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold,#B8935F)] hover:text-[var(--color-gold,#B8935F)]/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                        >
                          {resendTimer > 0 ? (
                            `${t('resend_in', 'Resend in')} ${resendTimer}s`
                          ) : (
                            <>
                              <RefreshCw size={12} />
                              {t('resend_code', 'Resend Code')}
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
