import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDrZOQB6bElkrGenF0RVua0Uk3zChSv9D8",
  authDomain: "desi-market-place.firebaseapp.com",
  projectId: "desi-market-place",
  storageBucket: "desi-market-place.firebasestorage.app",
  messagingSenderId: "911068949400",
  appId: "1:911068949400:web:eec79dc6a3fb76c4dc59ed"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);