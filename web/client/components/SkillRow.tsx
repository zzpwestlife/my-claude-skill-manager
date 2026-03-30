import type { Skill } from '../../../src/lib/types.js'
import type { RefCallback } from 'react'

interface Props {
  skill: Skill
  onToggle: () => void
  onDelete: () => void
  deleteButtonRef?: RefCallback<HTMLButtonElement>
}

export default function SkillRow({ skill, onToggle, onDelete, deleteButtonRef }: Props) {
  return (
    <div className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-gray-800">
      <div className="flex items-center gap-3 min-w-0">
        <span className="truncate font-mono text-sm text-white">
          {skill.name}
        </span>
        <span className="shrink-0 rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
          {skill.scope}
        </span>
        {!skill.enabled && (
          <span className="shrink-0 text-xs text-gray-500">disabled</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 ml-4">
        {/* Toggle switch */}
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
            skill.enabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
          aria-label={skill.enabled ? 'Disable skill' : 'Enable skill'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              skill.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        {/* Delete button */}
        <button
          ref={deleteButtonRef}
          onClick={onDelete}
          className="text-gray-500 transition-colors hover:text-red-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 rounded"
          aria-label="Delete skill"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
