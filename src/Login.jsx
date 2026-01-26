import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const navigate = useNavigate()

  const loginWithPassword = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) setStatus(error.message)
    else navigate('/')
  }

  const sendMagicLink = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    setStatus(error ? error.message : 'Check your email for the login link')
  }

  const loginWithDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin + '/profile',
      },
    })
  }

  return (
    <div className="max-w-sm mx-auto mt-16 bg-zinc-900 p-6 rounded space-y-4">
      <h2 className="text-2xl font-bold">Login</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-zinc-800 p-2 rounded"
      />

      <input
        type="password"
        placeholder="Password (optional)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-zinc-800 p-2 rounded"
      />

      <button
        onClick={loginWithPassword}
        className="w-full bg-blue-600 py-2 rounded"
      >
        Login with password
      </button>

      <button
        onClick={sendMagicLink}
        className="w-full bg-zinc-700 py-2 rounded"
      >
        Send magic link
      </button>

      <div className="border-t border-zinc-700 pt-4">
        <button
          onClick={loginWithDiscord}
          className="w-full bg-indigo-600 py-2 rounded"
        >
          Login with Discord
        </button>
      </div>

      {status && <p className="text-sm text-zinc-400">{status}</p>}
    </div>
  )
}
