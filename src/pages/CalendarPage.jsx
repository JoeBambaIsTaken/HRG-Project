import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function CalendarPage() {
  const [events, setEvents] = useState([])
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [title, setTitle] = useState('')
  const [field, setField] = useState('Area 49')
  const [startTime, setStartTime] = useState('')
  const [description, setDescription] = useState('')

  const isLeader =
    profile?.role === 'leader' || profile?.role === 'admin'

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
      }

      loadEvents()
    }

    init()
  }, [])

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true })

    setEvents(data || [])
  }

  const createEvent = async () => {
    if (!title || !startTime) return

    await supabase.from('events').insert({
      title,
      field,
      start_time: startTime,
      description,
      created_by: user.id,
    })

    setTitle('')
    setDescription('')
    setStartTime('')
    loadEvents()
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-3xl font-bold">Upcoming Games</h2>
        <p className="text-zinc-400">
          Planned events and game days.
        </p>
      </section>

      <section className="space-y-4">
        {events.length === 0 && (
          <p className="text-zinc-500">No upcoming games yet.</p>
        )}

        {events.map(ev => (
          <div
            key={ev.id}
            className="bg-zinc-900 p-4 rounded border border-zinc-800"
          >
            <div className="flex justify-between">
              <h3 className="text-xl font-semibold">{ev.title}</h3>
              <span className="text-sm text-zinc-400">
                {new Date(ev.start_time).toLocaleString()}
              </span>
            </div>

            <p className="text-sm text-zinc-400">{ev.field}</p>

            {ev.description && (
              <p className="mt-2">{ev.description}</p>
            )}
          </div>
        ))}
      </section>

      {user && isLeader && (
        <section className="bg-zinc-900 p-6 rounded max-w-lg space-y-4">
          <h3 className="text-xl font-bold">Create Event</h3>

          <input
            className="w-full bg-zinc-800 p-2 rounded"
            placeholder="Event title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <select
            className="w-full bg-zinc-800 p-2 rounded"
            value={field}
            onChange={e => setField(e.target.value)}
          >
            <option>Area 49</option>
            <option>The Cloudmaker</option>
            <option>Nukebase</option>
          </select>

          <input
            type="datetime-local"
            className="w-full bg-zinc-800 p-2 rounded"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
          />

          <textarea
            className="w-full bg-zinc-800 p-2 rounded"
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          <button
            onClick={createEvent}
            className="bg-blue-600 px-4 py-2 rounded"
          >
            Create Event
          </button>
        </section>
      )}
    </div>
  )
}
