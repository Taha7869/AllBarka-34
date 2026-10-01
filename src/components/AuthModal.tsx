import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Phone,
  Crown,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import CodeSlots from './CodeSlots';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot_password';
  onAuthSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess
}: AuthModalProps) {
  const { refreshProfile } = useAuth();
  const { t, isRtl } = useLanguage();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+92');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));

  const [isLoading, setIsLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhone('+92');
      setOtp(Array(6).fill(''));
      setAuthErrorMsg(null);
      setAuthSuccessMsg(null);
      setResendTimer(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const getFriendlyError = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-phone-number':
        return t('error_invalid_phone', 'The phone number provided is invalid. Include country code (e.g., +923001234567).');
      case 'auth/too-many-requests':
        return t('error_too_many_requests', 'We have blocked all requests from this device due to unusual activity. Try again later.');
      case 'auth/quota-exceeded':
        return t('error_quota_exceeded', 'SMS system is temporarily down or quota exceeded. Try later.');
      case 'auth/invalid-verification-code':
        return t('error_invalid_otp', 'The verification code you entered is incorrect. Please try again.');
      case 'auth/code-expired':
        return t('error_expired_otp', 'The verification code has expired. Please request a new one.');
      case 'rate_limit':
        return t('error_rate_limit', 'Too many OTP requests for this number. Please wait 10 minutes.');
      default:
        return t('error_unexpected', 'An unexpected error occurred. Please try again or contact concierge.');
    }
  };

  const handleSendOtp = async (e?: React.FormEvent, isResend = false) => {
    if (e) e.preventDefault();
    if (!phone || phone.trim().length < 8) {
      setAuthErrorMsg(t('error_phone_required', 'Please enter a valid phone number.'));
      return;
    }

    setAuthErrorMsg(null);
    setIsLoading(true);

    try {
      const [
        { RecaptchaVerifier, signInWithPhoneNumber },
        { auth }
      ] = await Promise.all([
        import('firebase/auth'),
        import('../lib/firebase')
      ]);

      // Measure Rate limit server-side FIRST
      const res = await fetch('/api/auth/request-otp-allowance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw { code: 'rate_limit' };

      // Ensure recaptcha verifier
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
      if (error.code) {
        setAuthErrorMsg(getFriendlyError(error.code));
      } else {
        setAuthErrorMsg(getFriendlyError('default'));
      }
      
      // Reset invisible recaptcha if error
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.render().then((widgetId: any) => {
          (window as any).grecaptcha.reset(widgetId);
        }).catch((e:any) => console.error(e));
      }
    } finally {
      setIsLoading(false);
    }
  };

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
        import('../lib/firebase')
      ]);
      const result = await (window as any).confirmationResult.confirm(code);
      const user = result.user;

      // Ensure Patron record exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          phone: user.phoneNumber,
          name: 'VIP Patron',
          patronStatus: 'VIP Patron',
          createdAt: Date.now()
        }, { merge: true });
      }

      // Establish secure server-session
      const idToken = await user.getIdToken();
      const sessionRes = await fetch('/api/auth/sessionLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      if (!sessionRes.ok) {
        throw new Error('Failed to establish secure session');
      }

      await refreshProfile();

      // Check pending orders claim
      const pendingClaimToken = sessionStorage.getItem("pendingClaimToken");
      const pendingOrderId = sessionStorage.getItem("pendingOrderId");
      if (pendingClaimToken && pendingOrderId && user) {
        try {
          await fetch("/api/orders/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
            body: JSON.stringify({ orderId: pendingOrderId, claimToken: pendingClaimToken })
          });
          sessionStorage.removeItem("pendingClaimToken");
          sessionStorage.removeItem("pendingOrderId");
        } catch (claimErr) {
          console.error("Order claim error:", claimErr);
        }
      }

      setAuthSuccessMsg(t('login_success', 'Welcome to the AllBarka VIP Patron Circle!'));
      if (onAuthSuccess) onAuthSuccess();
      
      setTimeout(() => {
        setAuthSuccessMsg(null);
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('OTP Verify Error:', error);
      setAuthErrorMsg(getFriendlyError(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

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
        <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--color-gold,#B8935F)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="px-6 py-5 border-b border-[var(--color-gold,#B8935F)]/20 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-ink,#1F120F)] border border-[var(--color-gold,#B8935F)]/50 flex items-center justify-center shadow-xs">
              <Crown size={18} className="text-[var(--color-gold,#B8935F)]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[var(--color-ink,#1F120F)] leading-tight">
                {t('patron_login', 'Patron Member Access')}
              </h3>
              <p className="text-[9.5px] font-bold tracking-widest uppercase text-[var(--color-gold,#B8935F)] mt-0.5">
                {t('vip_concierge', 'AllBarka VIP Concierge')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--color-ink,#1F120F)]/5 hover:bg-[var(--color-ink,#1F120F)]/10 text-[var(--color-ink,#1F120F)] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 relative custom-scrollbar">
          <AnimatePresence mode="wait">
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
                <h4 className="font-serif font-black text-xl text-[var(--color-ink,#1F120F)] mb-2">
                  {t('success', 'Success')}
                </h4>
                <p className="text-sm font-medium text-[var(--color-ink,#1F120F)]/70 px-4">
                  {authSuccessMsg}
                </p>
              </motion.div>
            ) : step === 'phone' ? (
              <motion.form
                key="phone"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSendOtp}
                className="space-y-4"
              >
                {authErrorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{authErrorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-[var(--color-ink,#1F120F)]/75 uppercase tracking-widest px-1">
                    {t('phone_number_label', 'Mobile Phone Number')}
                  </label>
                  <p className="text-[10px] text-[var(--color-ink,#1F120F)]/60 px-1 pb-1">
                    {t('otp_instruction', 'You will receive a 6-digit verification code via SMS.')}
                  </p>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-gold,#B8935F)]">
                      <Phone size={16} />
                    </div>
                    {/* Always ensure LTR for the phone number field so standard +92 works well */}
                    <input
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => {
                        setAuthErrorMsg(null);
                        setPhone(e.target.value);
                      }}
                      placeholder="+92 300 1234567"
                      className="w-full bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 pl-10 pr-4 text-sm tracking-widest font-bold focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/40 transition-colors shadow-2xs text-left"
                    />
                  </div>
                </div>

                <div id="recaptcha-container" />

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)] font-black text-xs uppercase tracking-widest shadow-xs hover:bg-[var(--color-ink,#1F120F)]/90 hover:shadow-[0_4px_15px_rgba(184,147,95,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 rounded-full border-2 border-[#FDFBF7]/30 border-t-[#FDFBF7] animate-spin inline-block" />
                    ) : (
                      <>
                        {t('send_code', 'Send Verification Code')}
                        <ArrowRight size={14} className={`text-[var(--color-gold,#B8935F)] ${isRtl ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {authErrorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{authErrorMsg}</span>
                  </div>
                )}

                <div className="text-center pt-2 pb-4">
                  <div className="mx-auto w-12 h-12 rounded-full border-2 border-[var(--color-gold,#B8935F)]/30 flex justify-center items-center mb-3">
                    <Lock size={20} className="text-[var(--color-gold,#B8935F)]" />
                  </div>
                  <h4 className="font-serif font-black text-lg text-[var(--color-ink,#1F120F)]">
                    {t('verify_your_number', 'Verify Your Number')}
                  </h4>
                  <p className="text-xs text-[var(--color-ink,#1F120F)]/60 mt-1" dir="ltr">
                    {t('enter_code_sent_to', 'Enter the 6-digit code sent to')} <br/>
                    <strong className="text-[var(--color-ink,#1F120F)]">{phone}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <CodeSlots value={otp.join('')} onChange={(value) => { setOtp(value.split('')); setAuthErrorMsg(null); }} label={t('enter_code_sent_to', 'Enter the 6-digit code sent to your phone')} />

                  <button
                    type="submit"
                    disabled={isLoading || otp.join('').length < 6}
                    className="w-full py-3.5 rounded-xl bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)] font-black text-xs uppercase tracking-widest shadow-xs hover:bg-[var(--color-ink,#1F120F)]/90 hover:shadow-[0_4px_15px_rgba(184,147,95,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                     {isLoading ? (
                      <span className="w-4 h-4 rounded-full border-2 border-[#FDFBF7]/30 border-t-[#FDFBF7] animate-spin inline-block" />
                    ) : (
                      <>
                        {t('verify_login', 'Verify & Login')}
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--color-gold,#B8935F)]/20">
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink,#1F120F)]/60 hover:text-[var(--color-ink,#1F120F)]"
                  >
                    {t('change_number', 'Change Number')}
                  </button>

                  <button
                    type="button"
                    disabled={resendTimer > 0 || isLoading}
                    onClick={() => handleSendOtp(undefined, true)}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold,#B8935F)] hover:text-[var(--color-gold,#B8935F)]/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
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
        </div>
      </motion.div>
    </div>
  );
}
