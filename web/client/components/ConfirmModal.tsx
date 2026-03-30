import type { Skill } from '../../../src/lib/types.js'

interface Props {
  skill: Skill
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ skill, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="w-80 rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-semibold text-white">
          Delete &quot;{skill.name}&quot;?
        </h3>
        <p className="mb-6 text-sm text-gray-400">This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700 focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 focus:outline-none"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
