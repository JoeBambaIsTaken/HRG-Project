import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

import LoginModal from './components/LoginModal'
import AlbumIndex from './pages/AlbumIndex'
import AlbumFieldPage from './pages/AlbumFieldPage'
import ProfilePage from './pages/ProfilePage'
import MembersShowcase from './components/MembersShowcase'

/* ---------------- TOP PHOTOS ---------------- */
function TopPhotos() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      /*
        1. Get like counts per media
        2. Sort descending
        3. Take top 6
        4. Generate signed URLs for display
      */

      const { data: likes } = await supabase
        .from('media_likes')
        .select('media_path')

      if (!likes || likes.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      // Count likes per path
      const counts = {}
      for (const l of likes) {
        counts[l.media_path] = (counts[l.media_path] || 0) + 1
      }

      // Sort paths by like count
      const topPaths = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)

      const results = []

      for (const [path, count] of topPaths) {
        const { data } = await supabase.storage
          .from('albums')
          .createSignedUrl(path, 3600)

        results.push({
          path,
          likes: count,
          url: data?.signedUrl,
          isVideo: /\.(mp4|webm|mov|avi)$/i.test(path),
        })
      }

      setItems(results)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <section>
        <h3 className="text-2xl font-bold mb-4">Top Photos</h3>
        <p className="text-zinc-400">Loading…</p>
      </section>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <h3 className="text-2xl font-bold">Top Photos</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map(item => (
          <div
            key={item.path}
            className="relative aspect-square bg-zinc-900 rounded overflow-hidden"
          >
            {item.isVideo ? (
              <video
                src={item.url}
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={item.url}
                className="w-full h-full object-cover"
              />
            )}

            <div className="absolute bottom-1 left-1 bg-black/70 text-xs px-2 py-1 rounded">
              ❤️ {item.likes}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ---------------- HOME ---------------- */
function Home({ user }) {
  return (
    <div className="space-y-16">
      <section>
        <h2 className="text-3xl font-bold">HRG Airsoft</h2>
        <p className="text-zinc-400 max-w-xl">
          Best airsoft team in the world. Seal Team Six has nothing on us.
        </p>
      </section>

      {/* NEW: TOP PHOTOS */}
      <TopPhotos />

      {/* EXISTING: MEET THE TEAM */}
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
