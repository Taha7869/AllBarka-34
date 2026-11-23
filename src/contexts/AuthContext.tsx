import { apiUrl } from '../lib/apiUrl';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { patronProfileFromIdentity } from '../lib/emailAuthentication';

export const AUTH_HINT_STORAGE_KEY = 'allbarka_auth_hint';

export interface PatronProfile {
  uid: string;
  email: string;
  name: string;
  phone: string;
  address?: string;
  city?: string;
  patronStatus: string;
  createdAt: number;
}

interface AuthContextType {
  currentUser: User | null;
  patronProfile: PatronProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  ensureAuthReady: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  patronProfile: null,
  loading: false,
  logout: async () => {},
  refreshProfile: async () => {},
  ensureAuthReady: () => {},
});

export const useAuth = () => useContext(AuthContext);

function shouldBootAuthEagerly(): boolean {
  if (typeof window === 'undefined') return false;
  const pathname = window.location?.pathname || '/';
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/track')
  ) {
    return true;
  }
  const search = window.location?.search || '';
  if (/[?&](?:oobCode|apiKey|mode=signIn)=/i.test(search)) {
    return true;
  }
  try {
    if (window.localStorage.getItem(AUTH_HINT_STORAGE_KEY) === '1') {
      return true;
    }
  } catch {
    // Storage unavailable; stay lazy until user opens sign-in.
  }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patronProfile, setPatronProfile] = useState<PatronProfile | null>(null);
  const [bootRequested, setBootRequested] = useState<boolean>(() => shouldBootAuthEagerly());
  const [loading, setLoading] = useState<boolean>(() => shouldBootAuthEagerly());
  const active = useRef(true);
  const authVersion = useRef(0);
  const invalidateProfileRequests = useCallback(() => { authVersion.current++; }, []);

  const ensureAuthReady = useCallback(() => {
    setBootRequested((prev) => {
      if (!prev) setLoading(true);
      return true;
    });
  }, []);

  // Trigger lazy Firebase Auth SDK load only when an auth surface or protected flow is requested.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onAuthDemand = () => ensureAuthReady();
    window.addEventListener('open-auth-modal', onAuthDemand);
    window.addEventListener('open-patron-lounge', onAuthDemand);
    window.addEventListener('open-store-updates', onAuthDemand);
    window.addEventListener('allbarka:ensure-auth', onAuthDemand);
    return () => {
      window.removeEventListener('open-auth-modal', onAuthDemand);
      window.removeEventListener('open-patron-lounge', onAuthDemand);
      window.removeEventListener('open-store-updates', onAuthDemand);
      window.removeEventListener('allbarka:ensure-auth', onAuthDemand);
    };
  }, [ensureAuthReady]);

  const refreshProfile = useCallback(async () => {
    ensureAuthReady();
    try {
      const [{ doc, getDoc }, { db }, { auth }] = await Promise.all([
        import('firebase/firestore'),
        import('../lib/firebase'),
        import('../lib/firebaseAuth'),
      ]);
      const user = auth.currentUser;
      if (!user) { if (active.current) setPatronProfile(null); return; }
      const version = authVersion.current;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (!active.current || version !== authVersion.current || auth.currentUser?.uid !== user.uid) return;
      if (docSnap.exists()) {
        setPatronProfile(patronProfileFromIdentity(user, docSnap.data()));
      } else {
        setPatronProfile(patronProfileFromIdentity(user));
      }
    } catch (error) {
      console.error("Error fetching patron profile:", error);
    }
  }, [ensureAuthReady]);

  useEffect(() => {
    if (!bootRequested) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let isMounted = true;
    active.current = true;

    async function initAuth() {
      try {
        const [{ onAuthStateChanged }, { auth }] = await Promise.all([
          import('firebase/auth'),
          import('../lib/firebaseAuth')
        ]);

        if (!isMounted) return;

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!isMounted) return;
          const version = ++authVersion.current;
          setCurrentUser(user);
          setPatronProfile(user ? patronProfileFromIdentity(user) : null);
          try {
            if (user) window.localStorage.setItem(AUTH_HINT_STORAGE_KEY, '1');
            else window.localStorage.removeItem(AUTH_HINT_STORAGE_KEY);
          } catch {
            // Ignore restricted storage
          }
          setLoading(false);
          if (user) {
            try {
              const [{ doc, getDoc }, { db }] = await Promise.all([import('firebase/firestore'), import('../lib/firebase')]);
              const docRef = doc(db, 'users', user.uid);
              const docSnap = await getDoc(docRef);
              if (isMounted && version === authVersion.current) {
                if (docSnap.exists()) {
                  setPatronProfile(patronProfileFromIdentity(user, docSnap.data()));
                } else {
                  setPatronProfile(patronProfileFromIdentity(user));
                }
              }
            } catch (error) {
              console.error("Error fetching patron profile:", error);
            }
          } else {
            setPatronProfile(null);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error("Failed to initialize Firebase Auth:", error);
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
      active.current = false;
      invalidateProfileRequests();
      if (unsubscribe) unsubscribe();
    };
  }, [bootRequested, invalidateProfileRequests]);

  const logout = async () => {
    try {
      const [{ signOut }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../lib/firebaseAuth')
      ]);
      // Firebase sign-out must still happen if optional server-cookie cleanup is unavailable.
      const results = await Promise.allSettled([
        fetch(apiUrl('/api/auth/sessionLogout'), { method: 'POST', signal: AbortSignal.timeout(8000) }),
        signOut(auth),
      ]);
      if (results[1].status === 'rejected') throw results[1].reason;
      try {
        window.localStorage.removeItem(AUTH_HINT_STORAGE_KEY);
      } catch {
        // Ignore
      }
      setCurrentUser(null);
      setPatronProfile(null);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, patronProfile, loading, logout, refreshProfile, ensureAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
}
