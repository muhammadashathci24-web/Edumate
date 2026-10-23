import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'edumate-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'edumate-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'edumate-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef1234567890',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Determine if we should connect to the Firebase Emulator
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  if (useEmulator) {
    try {
      const authEmulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || 'http://localhost:9099';
      const firestoreHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || 'localhost';
      const firestorePort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080);

      connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
      connectFirestoreEmulator(db, firestoreHost, firestorePort);
      console.log('[Firebase Client] Connected to Firebase Local Emulator Suite.');
    } catch (e) {
      console.warn('[Firebase Client] Emulator connection notice:', e);
    }
  }
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };
