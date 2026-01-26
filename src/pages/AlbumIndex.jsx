import { Link } from 'react-router-dom'

const FIELDS = [
  {
    key: 'area-49',
    name: 'Area 49',
    description: 'CQB focused indoor field',
  },
  {
    key: 'cloudmaker',
    name: 'The Cloudmaker',
    description: 'Large outdoor engagements',
  },
  {
    key: 'nukebase',
    name: 'Nukebase',
    description: 'Mixed terrain and structures',
  },
]

export default function AlbumIndex() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Album</h2>
      <p className="text-zinc-400">
        Browse photos and videos by field.
      </p>

      <div className="grid sm:grid-cols-3 gap-6 mt-8">
        {FIELDS.map(field => (
          <Link
            key={field.key}
            to={`/album/${field.key}`}
            className="bg-zinc-900 hover:bg-zinc-800 transition rounded p-6 block"
          >
            <h3 className="text-xl font-semibold mb-2">
              {field.name}
            </h3>
            <p className="text-sm text-zinc-400">
              {field.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
