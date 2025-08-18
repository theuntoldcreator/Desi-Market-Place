import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// --- ADDING THIS FOR DEBUGGING ---
console.log("Attempting to initialize Firebase with API Key:", import.meta.env.VITE_FIREBASE_API_KEY);
// ---------------------------------

// Basic validation to ensure environment variables are set
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("CRITICAL ERROR: Firebase environment variables are missing from the build.");
  console.error("VITE_FIREBASE_API_KEY loaded as:", import.meta.env.VITE_FIREBASE_API_KEY);
  console.error("VITE_FIREBASE_PROJECT_ID loaded as:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
  throw new Error("Firebase configuration is missing. Please check your .env file and rebuild the application.");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);