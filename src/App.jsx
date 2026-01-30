// App.jsx
// Beta v0.0.05

import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

import LoginModal from './components/LoginModal'
import AlbumIndex from './pages/AlbumIndex'
import AlbumFieldPage from './pages/AlbumFieldPage'
import ProfilePage from './pages/ProfilePage'
import MembersShowcase from './components/MembersShowcase'
import CalendarPage from './pages/CalendarPage'

const FIELDS = [
  { key: 'area-49', name: 'Area 49' },
  { key: 'cloudmaker', name: 'The Cloudmaker' },
  { key: 'nukebase', name: 'Nukebase' },
]

function TopPhotosSection({ fieldKey, title }) {
  const [items, setItems] = useState([])
  const navigate = useNavigate()

  const isGif = (path) => /\.gif$/i.test(path)

  const isVideo = (path) =>
    !isGif(path) && /\.(mp4|webm|mov|avi)$/i.test(path)

  const getThumbnailPath = (path) => {
    const parts = path.split('/')
    const file = parts.pop()
    const base = file.replace(/\.[^.]+$/, '')
    return [...parts, 'thumbs', `${base}.jpg`].join('/')
  }

  useEffect(() => {
    const load = async () => {
      // 1️⃣ Load existing media for this field
      const { data: media } = await supabase
        .from('album_items')
        .select('path')
        .eq('field', fieldKey)

      if (!media || media.length === 0) return

      const validPaths = new Set(media.map(m => m.path))

      // 2️⃣ Load likes
      const { data: likes } = await supabase
        .from('media_likes')
        .select('media_path')

      if (!likes) return

      // 3️⃣ Count likes ONLY for existing media
      const counts = {}
      for (const l of likes) {
        if (!validPaths.has(l.media_path)) continue
        counts[l.media_path] = (counts[l.media_path] || 0) + 1
      }

      const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      const results = []

      // 4️⃣ Resolve URLs
      for (const [path, count] of top) {
        const { data } = await supabase.storage
          .from('albums')
          .createSignedUrl(path, 3600)

        if (!data?.signedUrl) continue

        results.push({
          path,
          likes: count,
          url: data.signedUrl,
          isVideo: isVideo(path),
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
            className="relative aspect-square bg-zinc-900 rounded overflow-hidden cursor-pointer
                       transition-transform duration-300 hover:scale-[1.04]"
          >
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30
                            transition-colors duration-300 z-10" />

            {item.isVideo ? (
              <video
                src={item.url}
                poster={getThumbnailPath(item.path)}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={item.url}
                className="w-full h-full object-cover"
              />
            )}

            <div className="absolute bottom-2 left-2 z-20 bg-black/70 text-xs px-2 py-1 rounded">
              ❤️ {item.likes}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Home({ user }) {
  return (
    <div className="space-y-20">
      <section>
        <h2 className="text-3xl font-bold">HRG Airsoft</h2>
        <p className="text-zinc-400 max-w-xl">
          Best airsoft team in the world. Seal Team Six has nothing on us.
        </p>
      </section>

      {FIELDS.map(f => (
        <TopPhotosSection
          key={f.key}
          fieldKey={f.key}
          title={`Top Photos – ${f.name}`}
        />
      ))}

      <MembersShowcase />
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e, session) => {
        setUser(session?.user ?? null)
        setShowLogin(false)
      }
    )

    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-white">
        <nav className="flex justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex gap-6">
            <Link to="/" className="font-bold">HRG</Link>
            <Link to="/">Home</Link>
            <Link to="/album">Album</Link>
            <Link to="/calendar">Calendar</Link>
            {user && <Link to="/profile">Profile</Link>}
          </div>

          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-red-400"
            >
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
            <Route path="/calendar" element={<CalendarPage />} />
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
