import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

function initAdmin() {
  if (globalThis.__adminApp) return globalThis.__adminApp
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const fileEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_FILE
  let credentialObj = null
  if (inline && inline.trim().startsWith('{')) {
    credentialObj = JSON.parse(inline)
  } else if (fileEnv) {
    const resolved = path.resolve(process.cwd(), fileEnv)
    const content = fs.readFileSync(resolved, 'utf8')
    credentialObj = JSON.parse(content)
  } else {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_JSON_FILE')
  }
  const app = admin.initializeApp({
    credential: admin.credential.cert(credentialObj),
  })
  globalThis.__projectId = credentialObj.project_id
  globalThis.__adminApp = app
  return app
}

function setCors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req, res) {
  setCors(res, req.headers.origin)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    initAdmin()

    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!idToken) return res.status(401).json({ error: 'Missing Authorization Bearer token' })
    await admin.auth().verifyIdToken(idToken)

    const { title, body, activeWithinSeconds = 120, sendToAll } = req.body || {}
    if (!title || !body) return res.status(400).json({ error: 'title and body are required' })

    const db = admin.firestore()
    let snap
    if (sendToAll) {
      snap = await db.collection('tokens').get()
    } else {
      const cutoffTs = admin.firestore.Timestamp.fromMillis(Date.now() - Number(activeWithinSeconds) * 1000)
      snap = await db.collection('tokens').where('lastSeen', '>=', cutoffTs).get()
    }
    const tokens = snap.docs.map(d => d.id)
    if (!tokens.length) {
      return res.status(200).json({
        success: true,
        sent: 0,
        invalid: 0,
        filteredBySeconds: sendToAll ? null : Number(activeWithinSeconds),
        mode: sendToAll ? 'all' : 'active',
        project: globalThis.__projectId || null,
      })
    }

    const response = await admin.messaging().sendEachForMulticast({
      notification: { title, body },
      data: { title, body },
      tokens,
    })

    const invalidTokens = []
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error && r.error.code
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          invalidTokens.push(tokens[idx])
        }
      }
    })
    await Promise.all(invalidTokens.map(t => db.collection('tokens').doc(t).delete()))

    return res.status(200).json({
      success: true,
      sent: tokens.length,
      invalid: invalidTokens.length,
      filteredBySeconds: sendToAll ? null : Number(activeWithinSeconds),
      mode: sendToAll ? 'all' : 'active',
      project: globalThis.__projectId || null,
    })
  } catch (e) {
    // Surface Messaging error codes to help diagnose NOT_FOUND or mismatched projects
    const code = e?.code || e?.errorInfo?.code || null
    const message = e?.message || e?.errorInfo?.message || 'internal'
    return res.status(500).json({ error: message, code, project: globalThis.__projectId || null })
  }
}


