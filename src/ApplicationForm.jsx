import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function ApplicationForm() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [experience, setExperience] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    const { error } = await supabase
      .from('applications')
      .insert([{ name, age: parseInt(age), experience }])

    if (error) setMessage(error.message)
    else {
      setMessage('Application submitted!')
      setName(''); setAge(''); setExperience('')
    }
  }

  return (
    <div className="max-w-md p-4 bg-zinc-800 rounded space-y-3 mt-6">
      <h2 className="text-xl font-bold">Join the Team</h2>
      <input
        className="w-full p-2 rounded"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-full p-2 rounded"
        placeholder="Age"
        value={age}
        onChange={(e) => setAge(e.target.value)}
      />
      <input
        className="w-full p-2 rounded"
        placeholder="Experience"
        value={experience}
        onChange={(e) => setExperience(e.target.value)}
      />
      <button
        className="w-full bg-green-600 p-2 rounded hover:bg-green-700"
        onClick={handleSubmit}
      >
        Submit Application
      </button>
      {message && <p>{message}</p>}
    </div>
  )
}
