// lib/firebase-admin.js
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Parse and validate service account
const keyEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let serviceAccount;
try {
  if (!keyEnv) {
    // During build time, Firebase may not be initialized yet
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_KEY env variable is missing - Firebase features will not be available at runtime');
    }
  } else {
    serviceAccount = JSON.parse(keyEnv);
    console.log('✅ Service account parsed successfully');
    console.log('📋 Project ID:', serviceAccount.project_id);
    console.log('📋 Client Email:', serviceAccount.client_email);
    
    // Validate required fields
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Service account is missing required fields (project_id, private_key, or client_email)');
    }
  }
} catch (e) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY parsing error:', e.message);
  if (process.env.NODE_ENV === 'development') {
    throw e;
  }
}

// Initialize Firebase Admin only if credentials exist
if (serviceAccount && !getApps().length) {
  console.log('🔥 Initializing Firebase Admin SDK...');
  try {
    // Ensure project id is visible to underlying Google auth libs BEFORE init
    if (!process.env.GOOGLE_CLOUD_PROJECT) {
      process.env.GOOGLE_CLOUD_PROJECT = serviceAccount.project_id;
    }
    if (!process.env.GCLOUD_PROJECT) {
      process.env.GCLOUD_PROJECT = serviceAccount.project_id;
    }
    if (!process.env.FIREBASE_CONFIG) {
      process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: serviceAccount.project_id });
    }
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin initialized successfully for project:', serviceAccount.project_id);
  } catch (e) {
    console.error('❌ Firebase Admin initialization failed:', e.message);
    if (process.env.NODE_ENV === 'development') {
      throw e;
    }
  }
} else if (getApps().length) {
  console.log('ℹ️  Firebase Admin already initialized');
} else {
  console.warn('⚠️  Firebase Admin not initialized - service account credentials not available');
}

export { getAuth };