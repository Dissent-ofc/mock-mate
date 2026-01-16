// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-ISae3khhrbNr1FrLeI7YiEgGdzvA54c",
  authDomain: "mock-matee.firebaseapp.com",
  projectId: "mock-matee",
  storageBucket: "mock-matee.firebasestorage.app",
  messagingSenderId: "291701095032",
  appId: "1:291701095032:web:cfdba0ad05bacc64238b8d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const db = getFirestore(app);                   // <--- This handles the Database
const auth = getAuth(app);                      // <--- This handles Login
const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error(error);
    return null;
  }
}; // <--- This handles Google Sign-In

// Export them so App.jsx can use them
export { db, auth, googleProvider };