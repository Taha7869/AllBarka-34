import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

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

  const refreshProfile = async () => {
    if (currentUser) {
      try {
        const [{ doc, getDoc }, { db }] = await Promise.all([
          import('firebase/firestore'),
          import('../lib/firebase')
        ]);
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPatronProfile(docSnap.data() as PatronProfile);
        } else {
          setPatronProfile(null);
        }
      } catch (error) {
        console.error("Error fetching patron profile:", error);
      }
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    async function initAuth() {
      try {
        const [{ onAuthStateChanged }, { auth, db }, { doc, getDoc }] = await Promise.all([
          import('firebase/auth'),
          import('../lib/firebase'),
          import('firebase/firestore')
        ]);

        if (!isMounted) return;

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!isMounted) return;
          setCurrentUser(user);
          if (user) {
            try {
              const docRef = doc(db, 'users', user.uid);
              const docSnap = await getDoc(docRef);
              if (isMounted) {
                if (docSnap.exists()) {
                  setPatronProfile(docSnap.data() as PatronProfile);
                } else {
                  setPatronProfile(null);
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
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      const [{ signOut }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../lib/firebase')
      ]);
      await signOut(auth);
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
