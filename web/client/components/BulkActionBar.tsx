import type { Skill } from '../../../src/lib/types.js'

interface Props {
  count: number
  selectedSkills: Skill[]
  onDisable: () => void
  onDelete: () => void
  onClear: () => void
}

export default function BulkActionBar({ count, selectedSkills, onDisable, onDelete, onClear }: Props) {
  if (count === 0) return null

  const allDisabled = selectedSkills.every(s => !s.enabled)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-gray-700 bg-gray-800 px-8 py-4">
      <span className="text-sm text-gray-300">
        {count} selected
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={onDisable}
          disabled={allDisabled}
          className="rounded bg-gray-600 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
        >
          Disable
        </button>
        <button
          onClick={onDelete}
          className="rounded bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
        >
          Delete
        </button>
        <button
          onClick={onClear}
          aria-label="Clear selection"
          className="rounded p-2 text-gray-400 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-800"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
