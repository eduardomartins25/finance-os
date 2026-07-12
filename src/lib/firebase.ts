import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAre3r2m9FG1KvzHFg7g1FsYoxBc8GGc3I",
  authDomain: "sistema-financeiro-19fcc.firebaseapp.com",
  projectId: "sistema-financeiro-19fcc",
  storageBucket: "sistema-financeiro-19fcc.firebasestorage.app",
  messagingSenderId: "627482627120",
  appId: "1:627482627120:web:65a37be7ea4d084012f1f5"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
