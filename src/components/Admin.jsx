import React, { useEffect, useState } from 'react'
import { auth, functions } from '../firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import './Admin.css'

const Admin = () => {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser)
    return () => unsub()
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setMessage('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setMessage(err.message || 'Login failed')
    }
  }

  async function handleLogout() {
    setMessage('')
    await signOut(auth)
  }

  async function handleSend(e) {
    e.preventDefault()
    setMessage('')
    setSending(true)
    try {
      const sendNotificationToActive = httpsCallable(functions, 'sendNotificationToActive')
      const res = await sendNotificationToActive({ title, body, activeWithinSeconds: 120 })
      const data = res?.data || {}
      setMessage(`Sent to ${data.sent || 0} device(s). Invalid: ${data.invalid || 0}`)
      setTitle('')
      setBody('')
    } catch (err) {
      setMessage(err.message || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  if (!user) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <h2 className="admin-title">Admin Login</h2>
          <form onSubmit={handleLogin} className="admin-form">
            <input
              className="admin-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="admin-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="admin-button">Login</button>
            {message ? <div className="admin-alert">{message}</div> : null}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-topbar">
          <h2 className="admin-title" style={{ margin: 0 }}>Send Push Notification</h2>
          <div>
            <span style={{ marginRight: 12 }}>{user.email}</span>
            <button className="admin-button" onClick={handleLogout}>Logout</button>
          </div>
        </div>
        <form onSubmit={handleSend} className="admin-form">
          <input
            className="admin-input"
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="admin-textarea"
            placeholder="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            required
          />
          <button className="admin-button" type="submit" disabled={sending}>
            {sending ? 'Sending…' : 'Send notification'}
          </button>
          {message ? <div className="admin-alert">{message}</div> : null}
        </form>
        <p className="admin-caption">
          Sends to users active in the last 2 minutes. Adjust in code via <code>activeWithinSeconds</code>.
        </p>
      </div>
    </div>
  )
}

export default Admin


