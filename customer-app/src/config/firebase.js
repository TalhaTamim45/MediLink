import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// MediLink Firebase Project Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIM55uQ5F7yiAqMcQjSUlxU7hFgY1zpOU",
  authDomain: "medilink-98ace.firebaseapp.com",
  projectId: "medilink-98ace",
  storageBucket: "medilink-98ace.firebasestorage.app",
  messagingSenderId: "359982361079",
  appId: "1:359982361079:web:8aff6326bc33da1c4a26f2"
};

// Initialize Firebase App (Singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication with proper platform persistence
let auth;
try {
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch (error) {
  // Fallback if auth is already initialized during dev hot-reloads
  auth = getAuth(app);
}

// Initialize Cloud Firestore
const db = getFirestore(app);

// Development-only initialization diagnostic check
if (__DEV__) {
  console.log('[MediLink Firebase] App successfully initialized:', app.name);
  console.log('[MediLink Firebase] Auth target platform:', Platform.OS);
  console.log('[MediLink Firebase] Firestore ready:', !!db);
}

export { app, auth, db };
