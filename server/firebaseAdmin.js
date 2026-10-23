import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

let db;
let auth;
let isMock = false;

// Check if service account file exists
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'edumate-demo';

try {
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
    db = admin.firestore();
    auth = admin.auth();
    console.log('[Firebase Admin] Initialized with Service Account Key');
  } else if (process.env.FIRESTORE_EMULATOR_HOST || process.env.USE_EMULATOR === 'true') {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
    admin.initializeApp({ projectId });
    db = admin.firestore();
    auth = admin.auth();
    console.log(`[Firebase Admin] Initialized in Emulator Mode (Firestore: ${process.env.FIRESTORE_EMULATOR_HOST})`);
  } else {
    // If not configured, fall back to mock in-memory database to allow seamless offline demo
    console.log('[Firebase Admin] No service account or emulator detected. Initializing local in-memory mock engine.');
    isMock = true;
  }
} catch (error) {
  console.warn('[Firebase Admin] Error initializing Firebase Admin SDK, falling back to mock mode:', error.message);
  isMock = true;
}

export { admin, db, auth, isMock };
