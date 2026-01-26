import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

import LoginModal from './components/LoginModal'
import AlbumIndex from './pages/AlbumIndex'
import AlbumFieldPage from './pages/AlbumFieldPage'
import ProfilePage from './pages/ProfilePage'
import MembersShowcase from './components/MembersShowcase'

/* ---------------- HOME ---------------- */
function Home({ user }) {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-3xl font-bold">HRG Airsoft</h2>
        <p className="text-zinc-400 max-w-xl">
          Best airsoft team in the world. Seal Team Six has nothing on us.
        </p>
      </section>

      <MembersShowcase />
    </div>
  )
}

/* ---------------- APP ---------------- */
export default function App() {
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  /* ---------- AUTH + PROFILE BOOTSTRAP ---------- */
  useEffect(() => {
    const ensureProfile = async (user) => {
      if (!user) return

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existing) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          callsign: user.email?.split('@')[0] || 'NewUser',
        })
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      ensureProfile(data.user)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        ensureProfile(session?.user)
        setShowLogin(false)
      }
    )

    return () => sub.subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  /* ---------- RENDER ---------- */
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-white">
        {/* NAVBAR */}
        <nav className="flex justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex gap-6">
            <Link to="/" className="font-bold">HRG</Link>
            <Link to="/">Home</Link>
            <Link to="/album">Album</Link>
            {user && <Link to="/profile">Profile</Link>}
          </div>

          {user ? (
            <button onClick={logout} className="text-red-400">
              Logout
            </button>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="bg-blue-600 px-4 py-2 rounded"
            >
              Login
            </button>
          )}
        </nav>

        {/* ROUTES */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/album" element={<AlbumIndex />} />
            <Route path="/album/:field" element={<AlbumFieldPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>

        {/* LOGIN MODAL */}
        <LoginModal
          open={showLogin}
          onClose={() => setShowLogin(false)}
        />
      </div>
    </BrowserRouter>
  )
}