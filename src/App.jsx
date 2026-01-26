import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

import LoginModal from './components/LoginModal'
import AlbumIndex from './pages/AlbumIndex'
import AlbumFieldPage from './pages/AlbumFieldPage'
import ProfilePage from './pages/ProfilePage'
import MembersShowcase from './components/MembersShowcase'

const FIELDS = [
  { key: 'area-49', name: 'Area 49' },
  { key: 'cloudmaker', name: 'The Cloudmaker' },
  { key: 'nukebase', name: 'Nukebase' },
]

/* ---------------- TOP PHOTOS (PER FIELD) ---------------- */
function TopPhotosSection({ fieldKey, title }) {
  const [items, setItems] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const { data: likes } = await supabase
        .from('media_likes')
        .select('media_path')

      if (!likes) return

      const counts = {}
      for (const l of likes) {
        if (!l.media_path.startsWith(fieldKey + '/')) continue
        counts[l.media_path] = (counts[l.media_path] || 0) + 1
      }

      const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      const results = []

      for (const [path, count] of top) {
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
    }

    load()
  }, [fieldKey])

  if (items.length === 0) return null

  return (
    <section className="space-y-4">
      <h3 className="text-2xl font-bold">{title}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map(item => (
          <div
            key={item.path}
            onClick={() => navigate(`/album/${fieldKey}`)}
            className="relative aspect-square bg-zinc-900 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500"
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

            <div className="absolute bottom-2 left-2 bg-black/70 text-xs px-2 py-1 rounded">
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
    <div className="space-y-20">
      <section>
        <h2 className="text-3xl font-bold">HRG Airsoft</h2>
        <p className="text-zinc-400 max-w-xl">
          Best airsoft team in the world. Seal Team Six has nothing on us.
        </p>
      </section>

      {/* TOP PHOTOS PER FIELD */}
      {FIELDS.map(f => (
        <TopPhotosSection
          key={f.key}
          fieldKey={f.key}
          title={`Top Photos – ${f.name}`}
        />
      ))}

      {/* MEET THE TEAM */}
      <MembersShowcase />
    </div>
  )
}

/* ---------------- APP ---------------- */
export default function App() {
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

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

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-white">
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

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/album" element={<AlbumIndex />} />
            <Route path="/album/:field" element={<AlbumFieldPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>

        <LoginModal
          open={showLogin}
          onClose={() => setShowLogin(false)}
        />
      </div>
    </BrowserRouter>
  )
}
