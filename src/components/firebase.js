import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

// Firebase web config
const firebaseConfig = {
  apiKey: "AIzaSyC1CRYodya0ud-XohNq88FPRFx5oOS5pco",
  authDomain: "weatherfox-app-push.firebaseapp.com",
  projectId: "weatherfox-app-push",
  storageBucket: "weatherfox-app-push.firebasestorage.app",
  messagingSenderId: "510155737938",
  appId: "1:510155737938:web:84ea7798d9a6c516d5488b",
  measurementId: "G-3TJP2LT7B8"
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


