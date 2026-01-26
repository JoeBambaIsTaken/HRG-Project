import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Members() {
  const [members, setMembers] = useState([])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, role')
      .then(({ data }) => setMembers(data || []))
  }, [])

  return (
    <div className="space-y-2 mt-6">
      <h2 className="text-2xl font-bold">Members</h2>
      <ul className="list-disc ml-5">
        {members.map((m, idx) => (
          <li key={idx}>{m.username} ({m.role})</li>
        ))}
      </ul>
    </div>
  )
}
