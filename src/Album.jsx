import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Album({ user }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const PROJECT_ID = 'lxtnwqwlgrmvkonfwram'
  const BUCKET = 'albums'

  // Fetch files with metadata safely
  const fetchFiles = async () => {
    try {
      const { data: fileList, error } = await supabase.storage.from(BUCKET).list('', { limit: 100 })
      if (error) throw error

      const filesWithMeta = await Promise.all(
        fileList.map(async (f) => {
          try {
            const { data: meta } = await supabase.storage.from(BUCKET).getMetadata(f.name)
            return { ...f, metadata: meta?.metadata || {} }
          } catch {
            return { ...f, metadata: {} } // fallback if metadata fetch fails
          }
        })
      )

      // Sort newest first
      setFiles(filesWithMeta.reverse())
    } catch (err) {
      console.error('Error fetching files:', err.message)
    }
  }

  useEffect(() => { fetchFiles() }, [])

  // Upload file with uploader UID
  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setMessage('')

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(file.name, file, { upsert: true, metadata: { uploader: user.id } })

    if (error) setMessage(error.message)
    else {
      setMessage('Uploaded!')
      fetchFiles()
    }

    setUploading(false)
  }

  // Delete file: only admin/leader or uploader
  const handleDelete = async (file) => {
    const canDelete = user.role === 'admin' || user.role === 'leader' || file.metadata.uploader === user.id
    if (!canDelete) {
      setMessage("You can't delete this file!")
      return
    }

    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return

    const { error } = await supabase.storage.from(BUCKET).remove([file.name])
    if (error) setMessage(`Delete failed: ${error.message}`)
    else {
      setMessage(`${file.name} deleted!`)
      fetchFiles()
    }
  }

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold mb-3">Game Album</h2>

      {/* Upload Input */}
      {user && (
        <div className="mb-4">
          <input type="file" onChange={handleUpload} disabled={uploading} />
          {message && <p className="mt-1 text-sm">{message}</p>}
        </div>
      )}

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((f) => {
          const url = `https://${PROJECT_ID}.supabase.co/storage/v1/object/public/${BUCKET}/${f.name}`
          const isVideo = f.name.match(/\.(mp4|webm|ogg)$/i)

          return (
            <div key={f.name} className="w-full h-48 overflow-hidden rounded shadow-lg bg-black relative flex items-center justify-center">
              {isVideo ? (
                <video controls className="w-full h-full object-cover">
                  <source src={url} type={`video/${f.name.split('.').pop()}`} />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img src={url} alt={f.name} className="w-full h-full object-cover" />
              )}

              {/* Delete Button */}
              {(user.role === 'admin' || user.role === 'leader' || f.metadata.uploader === user.id) && (
                <button
                  onClick={() => handleDelete(f)}
                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded hover:bg-red-700 text-xs"
                >
                  Delete
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
