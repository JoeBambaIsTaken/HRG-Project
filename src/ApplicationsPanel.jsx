import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function ApplicationsPanel({ user }) {
  const [applications, setApplications] = useState([])

  useEffect(() => {
    if (user.role === 'leader' || user.role === 'admin') {
      fetchApplications()
    }
  }, [user])

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setApplications(data || [])
  }

  const handleAction = async (id, newStatus) => {
    await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', id)
    fetchApplications()
  }

  if (!(user.role === 'leader' || user.role === 'admin')) return null

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold">Applications Review</h2>
      {applications.length === 0 && <p>No applications yet.</p>}
      <ul className="space-y-2 mt-2">
        {applications.map(app => (
          <li key={app.id} className="p-3 bg-zinc-800 rounded flex justify-between items-center">
            <div>
              <p><strong>{app.name}</strong> (Age: {app.age})</p>
              <p>Experience: {app.experience}</p>
              <p>Status: {app.status}</p>
            </div>
            <div className="space-x-2">
              {app.status === 'pending' && (
                <>
                  <button
                    className="bg-green-600 p-1 px-3 rounded hover:bg-green-700"
                    onClick={() => handleAction(app.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    className="bg-red-600 p-1 px-3 rounded hover:bg-red-700"
                    onClick={() => handleAction(app.id, 'denied')}
                  >
                    Deny
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
