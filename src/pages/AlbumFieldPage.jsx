// AlbumFieldPage.jsx
// Beta v0.0.07

import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const FIELD_NAMES = {
  'area-49': 'Area 49',
  cloudmaker: 'The Cloudmaker',
  nukebase: 'Nukebase',
}

export default function AlbumFieldPage() {
  const { field } = useParams()
  const fieldName = FIELD_NAMES[field] || 'Unknown Field'

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [filesByDate, setFilesByDate] = useState({})
  const [flatFiles, setFlatFiles] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [fileInputKey, setFileInputKey] = useState(0)
  const [uploading, setUploading] = useState(false)

  const [viewerOpen, setViewerOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(null)

  const [comments, setComments] = useState({})
  const [newComment, setNewComment] = useState('')

  const [likes, setLikes] = useState({})
  const [userLikes, setUserLikes] = useState(new Set())

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState(null)

  /* ---------- INIT ---------- */
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)

      if (data.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        setProfile(prof)
        setIsAdmin(prof?.role === 'admin')
      }

      loadFiles()
    }

    init()
  }, [field])

  /* ---------- ENSURE ALBUM ITEM EXISTS ---------- */
  const ensureAlbumItem = async (path, date) => {
    const { data: existing } = await supabase
      .from('album_items')
      .select('id')
      .eq('path', path)
      .single()

    if (existing) return

    await supabase.from('album_items').insert({
      path,
      field,
      game_date: date,
    })
  }

  /* ---------- HELPERS ---------- */
  const isGif = (f) =>
    /\.gif$/i.test(f.name)

  const isVideo = (f) =>
    !isGif(f) &&
    (f.type.startsWith('video') ||
      /\.(mp4|webm|mov|avi)$/i.test(f.name))

  const getThumbnailPath = (path) => {
    const parts = path.split('/')
    const file = parts.pop()
    const base = file.replace(/\.[^.]+$/, '')
    return [...parts, 'thumbs', `${base}.jpg`].join('/')
  }

  /* ---------- LOAD FILES ---------- */
  const loadFiles = async () => {
    setLoading(true)

    const grouped = {}
    const flat = []

    const { data: dateFolders } = await supabase.storage
      .from('albums')
      .list(field)

    for (const folder of dateFolders || []) {
      if (!folder.name) continue

      const folderPath = `${field}/${folder.name}`
      const { data: files } = await supabase.storage
        .from('albums')
        .list(folderPath)

      grouped[folder.name] = []

      for (const file of files || []) {
        const path = `${folderPath}/${file.name}`
        const { data } = await supabase.storage
          .from('albums')
          .createSignedUrl(path, 3600)

        await ensureAlbumItem(path, folder.name)

        const obj = {
          name: file.name,
          path,
          url: data?.signedUrl,
          type: file.metadata?.mimetype || '',
          owner: file.owner,
        }

        grouped[folder.name].push(obj)
        flat.push(obj)
      }
    }

    setFilesByDate(grouped)
    setFlatFiles(flat)
    setLoading(false)
  }

  /* ---------- LIKES ---------- */
  useEffect(() => {
    if (flatFiles.length === 0) return
    loadLikes()
  }, [flatFiles, user])

  const loadLikes = async () => {
    const existingPaths = new Set(flatFiles.map(f => f.path))

    const { data } = await supabase
      .from('media_likes')
      .select('media_path, user_id')

    const counts = {}
    const mine = new Set()

    for (const l of data || []) {
      if (!existingPaths.has(l.media_path)) continue
      counts[l.media_path] = (counts[l.media_path] || 0) + 1
      if (l.user_id === user?.id) mine.add(l.media_path)
    }

    setLikes(counts)
    setUserLikes(mine)
  }

  const toggleLike = async (path) => {
    if (!user) return

    const date = path.split('/')[1]
    await ensureAlbumItem(path, date)

    if (userLikes.has(path)) {
      await supabase
        .from('media_likes')
        .delete()
        .eq('media_path', path)
        .eq('user_id', user.id)
    } else {
      await supabase.from('media_likes').insert({
        media_path: path,
        user_id: user.id,
      })
    }

    loadLikes()
  }

  /* ---------- UPLOAD ---------- */
  const handleUpload = async () => {
    if (!user || !selectedDate || selectedFiles.length === 0) return

    setUploading(true)

    for (const file of selectedFiles) {
      const ext = file.name.split('.').pop()
      const filename = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`

      const path = `${field}/${selectedDate}/${filename}`
      await supabase.storage.from('albums').upload(path, file)
      await ensureAlbumItem(path, selectedDate)
    }

    setSelectedFiles([])
    setSelectedDate('')
    setFileInputKey(k => k + 1)
    setUploading(false)
    loadFiles()
  }

  /* ---------- COMMENTS ---------- */
  const loadComments = async (path) => {
    const { data } = await supabase
      .from('media_comments')
      .select('*')
      .eq('media_path', path)
      .order('created_at')

    setComments(prev => ({ ...prev, [path]: data || [] }))
  }

  const submitComment = async () => {
    if (!newComment.trim() || !user) return
    const file = flatFiles[activeIndex]

    await supabase.from('media_comments').insert({
      media_path: file.path,
      user_id: user.id,
      content: newComment,
      author_callsign: profile?.callsign || 'Unknown',
    })

    setNewComment('')
    loadComments(file.path)
  }

  const deleteComment = async (id) => {
    await supabase.from('media_comments').delete().eq('id', id)
    loadComments(flatFiles[activeIndex].path)
  }

  /* ---------- DELETE MEDIA ---------- */
  const canDeleteFile = (file) =>
    isAdmin || (user && file.owner === user.id)

  const requestDelete = (file) => {
    setFileToDelete(file)
    setConfirmOpen(true)
  }

  const executeDelete = async () => {
    await supabase.storage
      .from('albums')
      .remove([fileToDelete.path])

    await supabase
      .from('album_items')
      .delete()
      .eq('path', fileToDelete.path)

    setConfirmOpen(false)
    setViewerOpen(false)
    setFileToDelete(null)
    loadFiles()
  }

  /* ---------- VIEWER NAV ---------- */
  const next = () => setActiveIndex(i => (i + 1) % flatFiles.length)
  const prev = () =>
    setActiveIndex(i => (i === 0 ? flatFiles.length - 1 : i - 1))

  useEffect(() => {
    if (!viewerOpen) return
    const h = (e) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape') setViewerOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [viewerOpen, flatFiles])

  const activeFile = flatFiles[activeIndex]

  /* ---------- RENDER ---------- */
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold">{fieldName}</h2>

      {Object.entries(filesByDate)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, items]) => (
          <section key={date}>
            <h3 className="font-semibold mb-3">{date}</h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(file => (
                <div
                  key={file.path}
                  className="relative group aspect-square bg-zinc-900 rounded overflow-hidden cursor-pointer
                             transition-transform duration-300 hover:scale-[1.03]"
                  onClick={() => {
                    setActiveIndex(
                      flatFiles.findIndex(f => f.path === file.path)
                    )
                    setViewerOpen(true)
                    loadComments(file.path)
                  }}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30
                                  transition-colors duration-300 z-10" />

                  {isVideo(file) ? (
                    <video
                      src={file.url}
                      poster={getThumbnailPath(file.path)}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover transition-transform duration-300"
                    />
                  ) : (
                    <img
                      src={file.url}
                      className="w-full h-full object-cover transition-transform duration-300"
                    />
                  )}

                  <div
                    className="absolute bottom-2 left-2 flex items-center gap-1
                               bg-black/60 px-2 py-1 rounded text-xs z-20
                               opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                  >
                    <button onClick={() => toggleLike(file.path)}>
                      {userLikes.has(file.path) ? '❤️' : '🤍'}
                    </button>
                    <span>{likes[file.path] || 0}</span>
                  </div>

                  {canDeleteFile(file) && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        requestDelete(file)
                      }}
                      className="absolute top-2 right-2 z-20
                                 bg-black/70 hover:bg-red-600
                                 text-white text-xs px-2 py-1 rounded
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

      {viewerOpen && activeFile && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <button onClick={prev} className="absolute left-4 text-white text-5xl">‹</button>

          <div className="max-w-6xl w-full p-6 grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              {isVideo(activeFile) ? (
                <video src={activeFile.url} controls className="max-h-[80vh]" />
              ) : (
                <img src={activeFile.url} className="max-h-[80vh]" />
              )}

              <button
                onClick={() => toggleLike(activeFile.path)}
                className="absolute bottom-4 left-4 bg-black/70 px-3 py-2 rounded"
              >
                {userLikes.has(activeFile.path) ? '❤️' : '🤍'}{' '}
                {likes[activeFile.path] || 0}
              </button>

              {canDeleteFile(activeFile) && (
                <button
                  onClick={() => requestDelete(activeFile)}
                  className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              )}
            </div>

            <div className="bg-zinc-900 p-4 rounded flex flex-col">
              <h4 className="font-semibold mb-2">Comments</h4>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {(comments[activeFile.path] || []).map(c => (
                  <div key={c.id} className="text-sm">
                    <div className="flex justify-between">
                      <strong>{c.author_callsign}</strong>
                      {(isAdmin || c.user_id === user?.id) && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p>{c.content}</p>
                  </div>
                ))}
              </div>

              {user && (
                <>
                  <textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    className="bg-zinc-800 p-2 rounded mt-2"
                  />
                  <button
                    onClick={submitComment}
                    className="bg-blue-600 mt-2 rounded py-1"
                  >
                    Post
                  </button>
                </>
              )}
            </div>
          </div>

          <button onClick={next} className="absolute right-4 text-white text-5xl">›</button>
          <button onClick={() => setViewerOpen(false)} className="absolute top-4 right-4 text-white text-3xl">✕</button>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-zinc-900 p-6 rounded max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold">Delete media?</h3>
            <p className="text-sm text-zinc-400">This cannot be undone.</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="bg-zinc-700 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="bg-red-600 px-4 py-2 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
