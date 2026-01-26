import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import LoginModal from './components/LoginModal'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoginOpen(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      <nav className="flex items-center justify-between px-6 py-4 bg-zinc-900">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-bold text-lg">
            HRG Airsoft
          </Link>

          <Link to="/album" className="text-zinc-300 hover:text-white">
            Album
          </Link>
        </div>

        <div>
          {user ? (
            <button
              onClick={logout}
              className="bg-zinc-700 px-4 py-2 rounded"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="bg-blue-600 px-4 py-2 rounded"
            >
              Login
            </button>
          )}
        </div>
      </nav>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
      />
    </>
  )
}
