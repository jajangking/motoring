// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJnqan1XmoA_B7i6m_gzpPzYLaatut1C0",
  authDomain: "dimonitor-1c806.firebaseapp.com",
  projectId: "dimonitor-1c806",
  storageBucket: "dimonitor-1c806.firebasestorage.app",
  messagingSenderId: "1070689820014",
  appId: "1:1070689820014:web:f6bccee0036e61ffb3357f",
  measurementId: "G-ZCNV7Q6DCJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, analytics };