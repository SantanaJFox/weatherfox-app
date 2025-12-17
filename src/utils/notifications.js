import { getToken, isSupported, onMessage } from 'firebase/messaging'
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { app, db, vapidKey } from '../firebase'
import { getMessaging } from 'firebase/messaging'

export async function requestNotificationPermissionAndSaveToken(serviceWorkerRegistration) {
  const supported = await isSupported()
  // eslint-disable-next-line no-console
  console.log('[FCM] isSupported:', supported)
  if (!supported) {
    // eslint-disable-next-line no-console
    console.error('[FCM] This browser does not support Web Push/FCM.')
    return null
  }

  // eslint-disable-next-line no-console
  console.log('[FCM] Requesting Notification permission…')
  const permission = await Notification.requestPermission()
  // eslint-disable-next-line no-console
  console.log('[FCM] Notification permission result:', permission)
  if (permission !== 'granted') {
    // eslint-disable-next-line no-console
    console.warn('[FCM] Permission not granted. Skipping token generation.')
    return null
  }

  const messaging = getMessaging(app)
  if (!vapidKey) {
    // eslint-disable-next-line no-console
    console.error('[FCM] Missing VAPID key (VITE_FIREBASE_VAPID_KEY). Cannot get token.')
    return null
  }
  let token = null
  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[FCM] getToken error:', err)
    return null
  }

  // eslint-disable-next-line no-console
  console.log('[FCM] getToken resolved token:', token || '(null)')
  if (!token) {
    // Explicit log for easier debugging
    // eslint-disable-next-line no-console
    console.warn('[FCM] No token returned from getToken.')
    return null
  }

  try {
    // Expose token for easy testing in Firebase Console → "Send test message"
    // You can copy it from DevTools console: window.FCM_TOKEN
    // eslint-disable-next-line no-undef
    window.FCM_TOKEN = token
    // eslint-disable-next-line no-console
    console.log('[FCM] registration token:', token)
  } catch {
    // ignore
  }

  // Save token and presence; do not block token logging on failures
  try {
    const tokenRef = doc(db, 'tokens', token)
    await setDoc(tokenRef, {
      token,
      userAgent: navigator.userAgent || '',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      visibility: document.visibilityState,
      focused: document.hasFocus(),
      active: true,
    }, { merge: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[FCM] Failed to persist token to Firestore (will still use token):', err?.message || err)
  }

  return token
}

export function startPresenceHeartbeat(token, intervalMs = 30000) {
  if (!token) return
  const tokenRef = doc(db, 'tokens', token)

  const updatePresence = async () => {
    try {
      await updateDoc(tokenRef, {
        lastSeen: serverTimestamp(),
        visibility: document.visibilityState,
        focused: document.hasFocus(),
        active: true,
      })
    } catch {
      // ignore
    }
  }

  const id = setInterval(updatePresence, intervalMs)

  const handleVis = () => updatePresence()
  const handleFocus = () => updatePresence()
  const handleBlur = () => updatePresence()

  document.addEventListener('visibilitychange', handleVis)
  window.addEventListener('focus', handleFocus)
  window.addEventListener('blur', handleBlur)

  // initial ping
  updatePresence()

  return () => {
    clearInterval(id)
    document.removeEventListener('visibilitychange', handleVis)
    window.removeEventListener('focus', handleFocus)
    window.removeEventListener('blur', handleBlur)
  }
}

export function listenForegroundNotifications() {
  const messaging = getMessaging(app)
  try {
    onMessage(messaging, (payload) => {
      console.log('payload>>>>> vikas', payload)
      const title =
        payload?.data?.title ||
        payload?.notification?.title ||
        'Notification'
      const body =
        payload?.data?.body ||
        payload?.notification?.body ||
        ''
      if (Notification.permission === 'granted') {
        try {
          // Show a basic notification when page is in foreground
          // Some browsers may suppress this if user disabled page notifications
          // eslint-disable-next-line no-new
          new Notification(title, { body })
        } catch {
          // ignore
        }
      }
    })
  } catch {
    // ignore
  }
}

