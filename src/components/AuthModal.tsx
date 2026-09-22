import React, { useEffect,  useState  } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Crown,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot_password';
  onAuthSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'signin',
  onAuthSuccess
}: AuthModalProps) {
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setAuthErrorMsg(null);
      setAuthSuccessMsg(null);
    }
  }, [isOpen, initialMode]);


  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setAuthErrorMsg(null);
  };

  const getFriendlyError = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Incorrect email or password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is disabled in the Firebase Console. Please enable it in Authentication > Sign-in method.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by your browser. Please allow popups for this boutique domain.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized in Firebase Console (Authentication > Settings > Authorized domains).';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with this email using a different sign-in method.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return 'An unexpected authentication error occurred. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMsg(null);

    // Basic Validation
    if (mode === 'signup') {
      if (!formData.name.trim() || formData.name.trim().length < 3) {
        setAuthErrorMsg('Please enter your full name (minimum 3 characters).');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setAuthErrorMsg('Passwords do not match.');
        return;
      }
    }
    
    if (mode === 'forgot_password') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setAuthErrorMsg("Please enter a valid email address.");
      return;
    }
      if (!formData.email) {
        setAuthErrorMsg('Please provide your email address.');
        return;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setAuthErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!formData.email) {
      setAuthErrorMsg('Email is required.');
      return;
    }

    if (mode !== 'forgot_password' && (!formData.password || formData.password.length < 6)) {
      setAuthErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const [
        { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail },
        { doc, setDoc },
        { auth, db }
      ] = await Promise.all([
        import('firebase/auth'),
        import('firebase/firestore'),
        import('../lib/firebase')
      ]);

      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
        setAuthSuccessMsg('Welcome back to your Patron Lounge!');
      } else if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
        // Create patron profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: formData.email.trim(),
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          patronStatus: 'VIP Patron',
          createdAt: Date.now()
        });
        setAuthSuccessMsg('Welcome to AllBarka VIP Patron Circle!');
      } else if (mode === 'forgot_password') {
        await sendPasswordResetEmail(auth, formData.email.trim());
        setAuthSuccessMsg('Password reset email sent. Please check your inbox.');
      }

      await refreshProfile();
      if (mode === "signup" || mode === "signin") {
        const pendingClaimToken = sessionStorage.getItem("pendingClaimToken");
        const pendingOrderId = sessionStorage.getItem("pendingOrderId");
        if (pendingClaimToken && pendingOrderId && auth.currentUser) {
          try {
            await fetch("/api/orders/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: pendingOrderId, claimToken: pendingClaimToken, uid: auth.currentUser.uid })
            });
            sessionStorage.removeItem("pendingClaimToken");
            sessionStorage.removeItem("pendingOrderId");
          } catch(e) {
            console.error("Order claim error:", e);
          }
        }
      }

      
      if (mode !== 'forgot_password') {
        if (onAuthSuccess) onAuthSuccess();
        setTimeout(() => {
          setAuthSuccessMsg(null);
          onClose();
        }, 1200);
      } else {
        setTimeout(() => {
          setAuthSuccessMsg(null);
          setMode('signin');
        }, 2500);
      }
    } catch (error: any) {
      console.error('Auth Error:', error);
      setAuthErrorMsg(getFriendlyError(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthErrorMsg(null);
    setIsLoading(true);
    try {
      const [
        { GoogleAuthProvider, signInWithPopup },
        { doc, setDoc },
        { auth, db }
      ] = await Promise.all([
        import('firebase/auth'),
        import('firebase/firestore'),
        import('../lib/firebase')
      ]);

      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Create or update patron profile in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: userCredential.user.displayName || "VIP Patron",
        patronStatus: "VIP Patron",
        lastLoginAt: Date.now()
      }, { merge: true });
      
      setAuthSuccessMsg("Welcome to AllBarka VIP Patron Circle!");
      await refreshProfile();
      
      const pendingClaimToken = sessionStorage.getItem("pendingClaimToken");
      const pendingOrderId = sessionStorage.getItem("pendingOrderId");
      if (pendingClaimToken && pendingOrderId && auth.currentUser) {
        try {
          await fetch("/api/orders/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: pendingOrderId, claimToken: pendingClaimToken, uid: auth.currentUser.uid })
          });
          sessionStorage.removeItem("pendingClaimToken");
          sessionStorage.removeItem("pendingOrderId");
        } catch(e) {
          console.error("Order claim error:", e);
        }
      }
      
      if (onAuthSuccess) onAuthSuccess();
      setTimeout(() => {
        setAuthSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      if (error.code !== "auth/popup-closed-by-user") {
        setAuthErrorMsg(getFriendlyError(error.code) || "Google Sign-In failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
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
      >
        <div className="absolute top-0 right-0 w-44 h-44 bg-[var(--color-gold,#B8935F)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="px-6 py-5 border-b border-[var(--color-gold,#B8935F)]/20 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-ink,#1F120F)] border border-[var(--color-gold,#B8935F)]/50 flex items-center justify-center shadow-xs">
              <Crown size={18} className="text-[var(--color-gold,#B8935F)]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[var(--color-ink,#1F120F)] leading-tight">
                {mode === 'signin' && 'Patron Member Sign In'}
                {mode === 'signup' && 'Create Patron Account'}
                {mode === 'forgot_password' && 'Reset Password'}
              </h3>
              <p className="text-[9.5px] font-bold tracking-widest uppercase text-[var(--color-gold,#B8935F)] mt-0.5">
                AllBarka VIP Concierge
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

        {mode !== 'forgot_password' && (
          <div className="px-6 pt-4 shrink-0">
            <div className="grid grid-cols-2 p-1 bg-[var(--color-ink,#1F120F)]/5 rounded-xl border border-[var(--color-gold,#B8935F)]/20 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setAuthErrorMsg(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-[var(--color-ink,#1F120F)] text-[var(--color-gold,#B8935F)] shadow-xs font-black'
                    : 'text-[var(--color-ink,#1F120F)]/70 hover:text-[var(--color-ink,#1F120F)]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setAuthErrorMsg(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-[var(--color-ink,#1F120F)] text-[var(--color-gold,#B8935F)] shadow-xs font-black'
                    : 'text-[var(--color-ink,#1F120F)]/70 hover:text-[var(--color-ink,#1F120F)]'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>
        )}

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
                  Success
                </h4>
                <p className="text-sm font-medium text-[var(--color-ink,#1F120F)]/70 px-4">
                  {authSuccessMsg}
                </p>
              </motion.div>
            ) : (
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {authErrorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{authErrorMsg}</span>
                  </div>
                )}

                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-[var(--color-ink,#1F120F)]/75 uppercase tracking-widest pl-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-gold,#B8935F)]">
                        <User size={16} />
                      </div>
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Patron Member Name"
                        className="w-full bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/40 transition-colors shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-[var(--color-ink,#1F120F)]/75 uppercase tracking-widest pl-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-gold,#B8935F)]">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/40 transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-[var(--color-ink,#1F120F)]/75 uppercase tracking-widest pl-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-gold,#B8935F)]">
                        <Phone size={16} />
                      </div>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Phone Number"
                        className="w-full bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/40 transition-colors shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                {mode !== 'forgot_password' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-[var(--color-ink,#1F120F)]/75 uppercase tracking-widest pl-1">
                      Secure Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-gold,#B8935F)]">
                        <Lock size={16} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password || ''}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 pl-10 pr-10 text-xs font-bold focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/40 transition-colors shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-ink,#1F120F)]/40 hover:text-[var(--color-gold,#B8935F)] transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-[var(--color-ink,#1F120F)]/75 uppercase tracking-widest pl-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-gold,#B8935F)]">
                        <ShieldCheck size={16} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword || ''}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-[var(--color-gold,#B8935F)]/30 rounded-xl py-3 pl-10 pr-10 text-xs font-bold focus:outline-none focus:border-[var(--color-gold,#B8935F)] text-[var(--color-ink,#1F120F)] placeholder:text-[var(--color-ink,#1F120F)]/40 transition-colors shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                {mode === 'signin' && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setAuthErrorMsg(null);
                      }}
                      className="text-[10px] font-bold text-[var(--color-gold,#B8935F)] hover:underline cursor-pointer"
                    >
                      Forgot Passphrase?
                    </button>
                  </div>
                )}

                {mode !== "forgot_password" && (
                  <>
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-[var(--color-gold,#B8935F)]/20" />
                      </div>
                      <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                        <span className="bg-[#FAF9F5] px-2 text-[var(--color-ink,#1F120F)]/50">Or continue with</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleGoogleSignIn}
                      className="w-full py-3.5 rounded-xl bg-white text-[var(--color-ink,#1F120F)] border border-[var(--color-gold,#B8935F)]/30 font-black text-xs uppercase tracking-widest shadow-2xs hover:bg-gray-50 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Google
                    </button>
                  </>
                )}

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-xl bg-[var(--color-ink,#1F120F)] text-[var(--color-surface,#FDFBF7)] border border-[var(--color-gold,#B8935F)] font-black text-xs uppercase tracking-widest shadow-xs hover:bg-[var(--color-ink,#1F120F)]/90 hover:shadow-[0_4px_15px_rgba(184,147,95,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {isLoading ? 'Processing...' : (
                        <>
                          {mode === 'signin' && 'Access Lounge'}
                          {mode === 'signup' && 'Create Account'}
                          {mode === 'forgot_password' && 'Reset Password'}
                          <ArrowRight size={14} className="text-[var(--color-gold,#B8935F)]" />
                        </>
                      )}
                    </span>
                  </button>
                </div>

                {mode === 'forgot_password' && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-xs font-medium text-[var(--color-ink,#1F120F)]/60 hover:text-[var(--color-ink,#1F120F)] cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                )}

              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
