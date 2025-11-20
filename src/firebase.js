import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Senin Ayarların
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

// Sadece Veritabanı ve Kimlik Doğrulama'yı dışarı aktarıyoruz
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
