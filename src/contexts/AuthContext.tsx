import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged, User as FbUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../lib/types';

interface AuthContextType {
  currentUser: FbUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FbUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = sessionStorage.getItem('edumate_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('edumate_token');
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile from Firestore or API
  const fetchProfile = async (uidOrEmail: string): Promise<UserProfile | null> => {
    try {
      // 1. Try server API endpoint first (handles both Firebase and mock store seamlessly)
      const res = await fetch(`/api/users/${encodeURIComponent(uidOrEmail)}`);
      if (res.ok) {
        const data = await res.json();
        return data as UserProfile;
      }

      // 2. Fall back to direct Firestore fetch if online and client is configured
      if (db) {
        const docRef = doc(db, 'users', uidOrEmail);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data() as UserProfile;
        }
      }
    } catch (e) {
      console.warn('Profile fetch warning:', e);
    }
    return null;
  };

  useEffect(() => {
    // Listen to Firebase Auth state if active
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setCurrentUser(fbUser);
        try {
          const userToken = await fbUser.getIdToken();
          setToken(userToken);
          sessionStorage.setItem('edumate_token', userToken);

          const userProfile = await fetchProfile(fbUser.uid);
          if (userProfile) {
            if (userProfile.status === 'disabled') {
              await fbSignOut(auth);
              setProfile(null);
              setError('This account has been disabled by the administrator. Please contact your college office.');
              sessionStorage.removeItem('edumate_profile');
              sessionStorage.removeItem('edumate_token');
            } else {
              setProfile(userProfile);
              sessionStorage.setItem('edumate_profile', JSON.stringify(userProfile));
              setError(null);
            }
          }
        } catch (e) {
          console.error('Error loading user profile:', e);
        }
      } else {
        // If not in Firebase Auth, check if we have a persisted mock session
        const savedProfile = sessionStorage.getItem('edumate_profile');
        if (savedProfile) {
          try {
            const parsed = JSON.parse(savedProfile);
            setProfile(parsed);
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
          setToken(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<UserProfile> => {
    setError(null);
    setLoading(true);

    try {
      let resolvedProfile: UserProfile | null = null;
      let sessionToken: string | null = null;

      // First attempt: Firebase Auth
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = userCredential.user;
        setCurrentUser(fbUser);
        sessionToken = await fbUser.getIdToken();
        resolvedProfile = await fetchProfile(fbUser.uid);
      } catch (fbErr: any) {
        // If Firebase Auth fails (e.g. invalid-credential, or emulator not running), try server endpoint
        const isAuthCredentialErr = fbErr.code === 'auth/invalid-credential' || fbErr.code === 'auth/user-not-found';

        const res = await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || (isAuthCredentialErr ? 'Invalid email or password.' : fbErr.message);
          throw new Error(errMsg);
        }

        const data = await res.json();
        resolvedProfile = data.user;
        sessionToken = data.token;
      }

      if (!resolvedProfile) {
        throw new Error('User profile could not be retrieved.');
      }

      if (resolvedProfile.status === 'disabled') {
        throw new Error('This account has been disabled by the administrator.');
      }

      setProfile(resolvedProfile);
      setToken(sessionToken);
      sessionStorage.setItem('edumate_profile', JSON.stringify(resolvedProfile));
      if (sessionToken) {
        sessionStorage.setItem('edumate_token', sessionToken);
      }

      setLoading(false);
      return resolvedProfile;
    } catch (err: any) {
      setLoading(false);
      const friendlyMessage = getFriendlyErrorMessage(err);
      setError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    setProfile(null);
    setToken(null);
    sessionStorage.removeItem('edumate_profile');
    sessionStorage.removeItem('edumate_token');
    setError(null);
  };

  const refreshProfile = async () => {
    if (profile) {
      const updated = await fetchProfile(profile.uid || profile.email);
      if (updated) {
        setProfile(updated);
        sessionStorage.setItem('edumate_profile', JSON.stringify(updated));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        role: profile ? profile.role : null,
        token,
        loading,
        error,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper to translate Firebase and network error codes into friendly human readable messages
function getFriendlyErrorMessage(err: any): string {
  const code = err.code || '';
  const message = err.message || '';

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Invalid email or password. Please verify your credentials and try again.';
  }
  if (code === 'auth/user-not-found') {
    return 'No account exists with this email address. Please contact your college administrator.';
  }
  if (code === 'auth/user-disabled') {
    return 'This account has been disabled by the administrator.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many unsuccessful attempts. Access has been temporarily paused. Please try again in a few minutes.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection issue. Please check your internet connection.';
  }
  return message || 'An unexpected error occurred during sign-in.';
}
