import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Senin proje ayarların (Buraları elleme, senin için doldurdum)
const firebaseConfig = {
  apiKey: "AIzaSyDZB_8rf6-R02_4Popkt-APSNdT2-s2UTo",
  authDomain: "akilli-not-defteri-ea627.firebaseapp.com",
  projectId: "akilli-not-defteri-ea627",
  storageBucket: "akilli-not-defteri-ea627.firebasestorage.app",
  messagingSenderId: "628676298507",
  appId: "1:628676298507:web:7d203c15b7621086ed440e",
  measurementId: "G-5BEDBY1KYQ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
