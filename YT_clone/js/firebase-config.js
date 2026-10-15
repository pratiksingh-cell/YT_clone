// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

// TODO: Replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyA8GyIPrShWyOSm_OX5zfMFJYAjiANFVXo",
  authDomain: "dev-backend-cae4a.firebaseapp.com",
  projectId: "dev-backend-cae4a",
  storageBucket: "dev-backend-cae4a.firebasestorage.app",
  messagingSenderId: "100161214581",
  appId: "1:100161214581:web:4dceaced143c2647e0803c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
