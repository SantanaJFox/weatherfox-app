import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

// Firebase web config
const firebaseConfig = {
  apiKey: "AIzaSyDoieILTM1Q2qWzHynHnmFqTPDOwF88wrU",
  authDomain: "weather-app-push-569d4.firebaseapp.com",
  projectId: "weather-app-push-569d4",
  storageBucket: "weather-app-push-569d4.firebasestorage.app",
  messagingSenderId: "897750597772",
  appId: "1:897750597772:web:fe378d868d447cd027bba9",
  measurementId: "G-G5M8C66HPG"
};

// Provide your Web Push certificates key from Firebase Console → Cloud Messaging
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BL8vW4lz0mEsItvpKZ0l62QlGvyb7cIlf27FlBAq1ziD8TaWq32zQJdU6AXMym95-6MSP-oPzlnLdPXYwpOSuv4'

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
// Ensure the region matches your deployed Functions region
const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1'
export const functions = getFunctions(app, functionsRegion)

// Optional: connect to local emulator when developing
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  try {
    connectFunctionsEmulator(functions, 'localhost', Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || 5001))
  } catch {
    // ignore
  }
}


