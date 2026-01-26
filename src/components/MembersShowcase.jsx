import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function MembersShowcase() {
  const [leaders, setLeaders] = useState([])
  const [members, setMembers] = useState([])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, callsign, role, avatar_url')
      .then(({ data }) => {
        if (!data) return

        setLeaders(data.filter(u => u.role === 'admin' || u.role === 'leader'))
        setMembers(data.filter(u => u.role === 'member'))
      })
  }, [])

  const displayName = (u) => u.callsign || u.username || 'Unknown'

  const Avatar = ({ user }) =>
    user.avatar_url ? (
      <img
        src={user.avatar_url}
        alt={displayName(user)}
        className="w-16 h-16 rounded-full object-cover mx-auto"
      />
    ) : (
      <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center mx-auto text-xl font-bold">
        {displayName(user)[0]?.toUpperCase()}
      </div>
    )

  const Card = ({ user }) => (
    <div className="bg-zinc-800 border border-zinc-700 rounded p-4 text-center space-y-2">
      <Avatar user={user} />
      <div className="font-semibold">{displayName(user)}</div>
      <div className="text-sm text-zinc-400 capitalize">{user.role}</div>
    </div>
  )

  return (
    <section className="space-y-12">
      <div>
        <h3 className="text-2xl font-bold mb-2">Top People</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {leaders.map(u => (
            <Card key={u.username} user={u} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold mb-2">Members</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {members.map(u => (
            <Card key={u.username} user={u} />
          ))}
        </div>
      </div>
    </section>
  )
}
