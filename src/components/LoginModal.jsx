import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function LoginModal({ open, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('magic') // magic | password
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!open) return null

  const sendMagicLink = async () => {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
    })

    if (error) setMessage(error.message)
    else setMessage('Check your email for the login link')

    setLoading(false)
  }

  const loginWithPassword = async () => {
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) setMessage(error.message)
    setLoading(false)
  }

  const loginWithDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-zinc-900 w-full max-w-md rounded-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-400 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4">Login</h2>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-800 p-2 rounded"
          />

          {mode === 'password' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 p-2 rounded"
            />
          )}

          {mode === 'magic' ? (
            <button
              onClick={sendMagicLink}
              disabled={loading || !email}
              className="w-full bg-blue-600 disabled:bg-zinc-700 py-2 rounded"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          ) : (
            <button
              onClick={loginWithPassword}
              disabled={loading || !email || !password}
              className="w-full bg-blue-600 disabled:bg-zinc-700 py-2 rounded"
            >
              {loading ? 'Logging in…' : 'Login'}
            </button>
          )}

          <button
            onClick={() =>
              setMode(mode === 'magic' ? 'password' : 'magic')
            }
            className="w-full text-sm text-zinc-400 hover:text-white"
          >
            {mode === 'magic'
              ? 'Already a user? Login with password'
              : 'Use magic link instead'}
          </button>

          <div className="text-center text-zinc-400 text-sm">or</div>

          <button
            onClick={loginWithDiscord}
            className="w-full bg-indigo-600 py-2 rounded"
          >
            Login with Discord
          </button>

          {message && (
            <p className="text-sm text-zinc-400 text-center">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
