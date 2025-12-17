// Local Express server to test sending notifications without Vercel / Firebase Functions
// Usage:
// 1) Put your service account JSON into FIREBASE_SERVICE_ACCOUNT_JSON env var
// 2) node scripts/notifier-local.js
// 3) POST http://localhost:3000/api/sendActive with { title, body, sendToAll }

import dotenv from 'dotenv'
import express from 'express'
import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

// Load .env.local first (if present), then .env
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })
  dotenv.config()
} catch {
  // ignore
}
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000

function initAdmin() {
  if (globalThis.__adminApp) return globalThis.__adminApp
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  const fileEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_FILE
  let credentialObj = null
  try {
    if (inline && inline.trim().startsWith('{')) {
      credentialObj = JSON.parse(inline)
    } else if (fileEnv) {
      const resolved = path.resolve(process.cwd(), fileEnv)
      const content = fs.readFileSync(resolved, 'utf8')
      credentialObj = JSON.parse(content)
    } else {
      // eslint-disable-next-line no-console
      console.error('Missing FIREBASE_SERVICE_ACCOUNT_JSON (minified JSON) or FIREBASE_SERVICE_ACCOUNT_JSON_FILE (path) env')
      process.exit(1)
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse service account JSON. Ensure it is valid JSON or provide a file path via FIREBASE_SERVICE_ACCOUNT_JSON_FILE.')
    // eslint-disable-next-line no-console
    console.error(e?.message || e)
    process.exit(1)
  }
  const app = admin.initializeApp({
    credential: admin.credential.cert(credentialObj),
  })
  globalThis.__projectId = credentialObj.project_id
  globalThis.__adminApp = app
  return app
}

initAdmin()
const db = admin.firestore()

const app = express()
app.use(express.json())

// Basic CORS for local testing
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})

app.post('/api/sendActive', async (req, res) => {
  try {
    const { title, body, activeWithinSeconds = 120, sendToAll } = req.body || {}
    if (!title || !body) return res.status(400).json({ error: 'title and body are required' })

    let snap
    if (sendToAll) {
      snap = await db.collection('tokens').get()
    } else {
      const cutoffTs = admin.firestore.Timestamp.fromMillis(Date.now() - Number(activeWithinSeconds) * 1000)
      snap = await db.collection('tokens').where('lastSeen', '>=', cutoffTs).get()
    }
    const tokens = snap.docs.map((d) => d.id)
    // eslint-disable-next-line no-console
    console.log('[notifier] project:', globalThis.__projectId, 'tokens:', tokens.length, tokens[0]?.slice(0, 12) || '')
    if (tokens.length === 0) {
      return res.status(200).json({
        success: true,
        sent: 0,
        invalid: 0,
        filteredBySeconds: sendToAll ? null : Number(activeWithinSeconds),
        mode: sendToAll ? 'all' : 'active',
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
    await Promise.all(invalidTokens.map((t) => db.collection('tokens').doc(t).delete()))

    res.json({
      success: true,
      sent: tokens.length,
      invalid: invalidTokens.length,
      filteredBySeconds: sendToAll ? null : Number(activeWithinSeconds),
      mode: sendToAll ? 'all' : 'active',
    })
  } catch (e) {
    res.status(500).json({ error: e.message || 'internal' })
  }
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Notifier local API listening on http://localhost:${PORT}`)
})


