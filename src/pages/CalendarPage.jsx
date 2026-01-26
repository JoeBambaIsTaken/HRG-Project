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

  const [editingEventId, setEditingEventId] = useState(null)

  const isLeader =
    profile?.role === 'leader' || profile?.role === 'admin'

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
      }

      loadEvents()
    }

    init()
  }, [])

  /* ---------- LOAD ---------- */
  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true })

    setEvents(data || [])
  }

  /* ---------- CREATE ---------- */
  const createEvent = async () => {
    if (!title || !startTime) return

    await supabase.from('events').insert({
      title,
      field,
      start_time: startTime,
      description,
      created_by: user.id,
    })

    resetForm()
    loadEvents()
  }

  /* ---------- UPDATE ---------- */
  const updateEvent = async () => {
    if (!editingEventId || !title || !startTime) return

    await supabase
      .from('events')
      .update({
        title,
        field,
        start_time: startTime,
        description,
      })
      .eq('id', editingEventId)

    resetForm()
    loadEvents()
  }

  /* ---------- DELETE ---------- */
  const deleteEvent = async (id) => {
    if (!confirm('Delete this event?')) return

    await supabase
      .from('events')
      .delete()
      .eq('id', id)

    loadEvents()
  }

  /* ---------- FORM HELPERS ---------- */
  const startEdit = (ev) => {
    setEditingEventId(ev.id)
    setTitle(ev.title)
    setField(ev.field)
    setStartTime(ev.start_time.slice(0, 16))
    setDescription(ev.description || '')
  }

  const resetForm = () => {
    setEditingEventId(null)
    setTitle('')
    setField('Area 49')
    setStartTime('')
    setDescription('')
  }

  /* ---------- RENDER ---------- */
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-3xl font-bold">Upcoming Games</h2>
        <p className="text-zinc-400">
          Planned events and game days.
        </p>
      </section>

      {/* EVENTS LIST */}
      <section className="space-y-4">
        {events.length === 0 && (
          <p className="text-zinc-500">No upcoming games yet.</p>
        )}

        {events.map(ev => (
          <div
            key={ev.id}
            className="bg-zinc-900 p-4 rounded border border-zinc-800 space-y-2"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">{ev.title}</h3>
                <p className="text-sm text-zinc-400">{ev.field}</p>
              </div>

              <span className="text-sm text-zinc-400">
                {new Date(ev.start_time).toLocaleString()}
              </span>
            </div>

            {ev.description && (
              <p>{ev.description}</p>
            )}

            {isLeader && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => startEdit(ev)}
                  className="text-sm text-blue-400"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteEvent(ev.id)}
                  className="text-sm text-red-400"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* CREATE / EDIT FORM */}
      {user && isLeader && (
        <section className="bg-zinc-900 p-6 rounded max-w-lg space-y-4">
          <h3 className="text-xl font-bold">
            {editingEventId ? 'Edit Event' : 'Create Event'}
          </h3>

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

          <div className="flex gap-3">
            <button
              onClick={editingEventId ? updateEvent : createEvent}
              className="bg-blue-600 px-4 py-2 rounded"
            >
              {editingEventId ? 'Save Changes' : 'Create Event'}
            </button>

            {editingEventId && (
              <button
                onClick={resetForm}
                className="bg-zinc-700 px-4 py-2 rounded"
              >
                Cancel
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
