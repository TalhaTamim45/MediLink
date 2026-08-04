import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// MediLink Firebase Project Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIM55uQ5F7yiAqMcQjSUlxU7hFgY1zpOU",
  authDomain: "medilink-98ace.firebaseapp.com",
  projectId: "medilink-98ace",
  storageBucket: "medilink-98ace.firebasestorage.app",
  messagingSenderId: "359982361079",
  appId: "1:359982361079:web:8aff6326bc33da1c4a26f2"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
