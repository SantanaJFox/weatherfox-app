const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()
const db = admin.firestore()

// Set the region explicitly to match client
const region = process.env.FUNCTIONS_REGION || 'us-central1'

exports.sendNotificationToAll = functions.region(region).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.')
  }

  const title = typeof data?.title === 'string' ? data.title.trim() : ''
  const body = typeof data?.body === 'string' ? data.body.trim() : ''
  if (!title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'title and body are required.')
  }

  const snap = await db.collection('tokens').get()
  const tokens = snap.docs.map((d) => d.id)

  if (tokens.length === 0) {
    return { success: true, sent: 0, invalid: 0 }
  }

  const multicast = {
    notification: { title, body },
    data: { title, body },
    tokens,
  }

  const response = await admin.messaging().sendEachForMulticast(multicast)

  const invalidTokens = []
  response.responses.forEach((r, idx) => {
    if (!r.success) {
      const code = r.error && r.error.code
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokens.push(tokens[idx])
      }
    }
  })

  await Promise.all(invalidTokens.map((t) => db.collection('tokens').doc(t).delete()))

  return { success: true, sent: tokens.length, invalid: invalidTokens.length }
})

exports.sendNotificationToActive = functions.region(region).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.')
  }

  const title = typeof data?.title === 'string' ? data.title.trim() : ''
  const body = typeof data?.body === 'string' ? data.body.trim() : ''
  const activeWithinSeconds = Number(data?.activeWithinSeconds || 120)
  if (!title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'title and body are required.')
  }

  const cutoff = Date.now() - activeWithinSeconds * 1000
  const cutoffTs = admin.firestore.Timestamp.fromMillis(cutoff)

  const snap = await db
    .collection('tokens')
    .where('lastSeen', '>=', cutoffTs)
    .get()

  const tokens = snap.docs.map((d) => d.id)
  if (tokens.length === 0) {
    return { success: true, sent: 0, invalid: 0, filteredBySeconds: activeWithinSeconds }
  }

  const multicast = {
    notification: { title, body },
    data: { title, body },
    tokens,
  }

  const response = await admin.messaging().sendEachForMulticast(multicast)

  const invalidTokens = []
  response.responses.forEach((r, idx) => {
    if (!r.success) {
      const code = r.error && r.error.code
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokens.push(tokens[idx])
      }
    }
  })

  await Promise.all(invalidTokens.map((t) => db.collection('tokens').doc(t).delete()))

  return {
    success: true,
    sent: tokens.length,
    invalid: invalidTokens.length,
    filteredBySeconds: activeWithinSeconds,
  }
})


