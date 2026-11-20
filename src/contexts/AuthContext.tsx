import { apiUrl } from '../lib/apiUrl';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { patronProfileFromIdentity } from '../lib/emailAuthentication';

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
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  patronProfile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patronProfile, setPatronProfile] = useState<PatronProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const active = useRef(true);
  const authVersion = useRef(0);
  const invalidateProfileRequests = useCallback(() => { authVersion.current++; }, []);

  const refreshProfile = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;
    let started = false;
    let idleHandle: ReturnType<typeof setTimeout> | undefined;
    active.current = true;

    async function initAuth() {
      if (started || !isMounted) return;
      started = true;
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

    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const isAuthPriorityRoute = /^\/(admin|staff|checkout|success|cart)(\/|$)/.test(pathname);
    const triggerAuth = () => {
      if (idleHandle) { clearTimeout(idleHandle); idleHandle = undefined; }
      void initAuth();
    };

    if (isAuthPriorityRoute || typeof window === 'undefined') {
      void initAuth();
    } else {
      // Defer heavy Firebase Auth SDK + auth iframe on public storefront routes so LCP/TBT stay fast.
      setLoading(false);
      window.addEventListener('open-auth-modal', triggerAuth, { once: true });
      window.addEventListener('open-patron-lounge', triggerAuth, { once: true });
      window.addEventListener('open-updates-dialog', triggerAuth, { once: true });
      idleHandle = setTimeout(triggerAuth, 4500);
    }

    return () => {
      isMounted = false;
      active.current = false;
      if (idleHandle) clearTimeout(idleHandle);
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-auth-modal', triggerAuth);
        window.removeEventListener('open-patron-lounge', triggerAuth);
        window.removeEventListener('open-updates-dialog', triggerAuth);
      }
      invalidateProfileRequests();
      if (unsubscribe) unsubscribe();
    };
  }, [invalidateProfileRequests]);

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
      setCurrentUser(null);
      setPatronProfile(null);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, patronProfile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
