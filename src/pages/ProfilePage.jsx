import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [callsign, setCallsign] = useState('')
  const [newsletter, setNewsletter] = useState(false)

  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const [discordLinked, setDiscordLinked] = useState(false)
  const [discordUsername, setDiscordUsername] = useState(null)

  const [message, setMessage] = useState('')

  /* ---------- LOAD USER + PROFILE ---------- */
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        setLoading(false)
        return
      }

      const u = data.user
      setUser(u)

      // Detect Discord identity
      const discordIdentity = u.identities?.find(
        (i) => i.provider === 'discord'
      )

      if (discordIdentity) {
        setDiscordLinked(true)
        setDiscordUsername(
          discordIdentity.identity_data?.username || null
        )
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()

      setProfile(prof)
      setCallsign(prof?.callsign || '')
      setNewsletter(!!prof?.newsletter)
      setAvatarPreview(prof?.avatar_url || null)

      setLoading(false)
    }

    load()
  }, [])

  /* ---------- SAVE PROFILE ---------- */
  const saveProfile = async () => {
    if (!user) return
    setMessage('')

    let avatarUrl = profile?.avatar_url || null

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const filePath = `avatars/${user.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true })

      if (uploadError) {
        setMessage(uploadError.message)
        return
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      avatarUrl = data.publicUrl
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        callsign,
        newsletter,
        avatar_url: avatarUrl,
      })
      .eq('id', user.id)

    if (error) setMessage(error.message)
    else setMessage('Profile updated successfully')
  }

  /* ---------- SECURITY ---------- */
  const resetPassword = async () => {
    if (!user?.email) return
    await supabase.auth.resetPasswordForEmail(user.email)
    setMessage('Password reset email sent')
  }

  const linkDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: window.location.origin + '/profile',
      },
    })
  }

  if (loading) return <p className="text-zinc-400">Loading profile…</p>
  if (!user) return <p className="text-zinc-400">You must be logged in.</p>

  return (
    <div className="max-w-xl space-y-8">
      <h2 className="text-3xl font-bold">Your Profile</h2>

      {/* PROFILE INFO */}
      <div className="bg-zinc-900 p-4 rounded space-y-4">
        {/* AVATAR */}
        <div className="flex items-center gap-4">
          <img
            src={
              avatarPreview ||
              `https://placehold.co/96x96?text=${callsign || 'User'}`
            }
            className="w-24 h-24 rounded-full object-cover"
          />

          <label className="cursor-pointer text-sm text-blue-400">
            Change picture
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0]
                if (!file) return
                setAvatarFile(file)
                setAvatarPreview(URL.createObjectURL(file))
              }}
            />
          </label>
        </div>

        {/* CALLSIGN */}
        <div>
          <label className="text-sm text-zinc-400">Callsign</label>
          <input
            value={callsign}
            onChange={(e) => setCallsign(e.target.value)}
            className="w-full bg-zinc-800 p-2 rounded"
          />
        </div>

        {/* NEWSLETTER */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
          />
          Receive game & event emails
        </label>

        <button
          onClick={saveProfile}
          className="bg-blue-600 px-4 py-2 rounded"
        >
          Save profile
        </button>
      </div>

      {/* SECURITY */}
      <div className="bg-zinc-900 p-4 rounded space-y-3">
        <h3 className="font-semibold">Linked accounts</h3>

        {discordLinked ? (
          <p className="text-green-400 text-sm">
            ✅ Discord linked
            {discordUsername && ` as ${discordUsername}`}
          </p>
        ) : (
          <button
            onClick={linkDiscord}
            className="bg-indigo-600 px-4 py-2 rounded"
          >
            Link Discord account
          </button>
        )}

        <button
          onClick={resetPassword}
          className="bg-zinc-700 px-4 py-2 rounded"
        >
          Reset password
        </button>
      </div>

      {message && (
        <p className="text-sm text-zinc-400">{message}</p>
      )}
    </div>
  )
}
