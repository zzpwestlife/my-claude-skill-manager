import type { Hook } from '../../../src/lib/hookTypes.js'
import type { RefCallback } from 'react'

interface Props {
  hook: Hook
  onToggle: () => void
  onDelete: () => void
  deleteButtonRef?: RefCallback<HTMLButtonElement>
  isSelected?: boolean
  onSelect?: () => void
}

const EVENT_COLORS: Record<string, string> = {
  PreToolUse:       'bg-orange-900 text-orange-300',
  PostToolUse:      'bg-blue-900 text-blue-300',
  Stop:             'bg-red-900 text-red-300',
  Notification:     'bg-purple-900 text-purple-300',
  UserPromptSubmit: 'bg-teal-900 text-teal-300',
  SubagentStop:     'bg-gray-700 text-gray-400',
}

function commandSummary(command: string): string {
  return command.length > 72 ? command.slice(0, 69) + '…' : command
}

export default function HookRow({
  hook,
  onToggle,
  onDelete,
  deleteButtonRef,
  isSelected = false,
  onSelect = () => {},
}: Props) {
  const eventColor = EVENT_COLORS[hook.event] ?? 'bg-gray-700 text-gray-300'

  return (
    <div className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-gray-800">
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          aria-label={`Select hook ${hook.id}`}
          className="h-4 w-4 shrink-0 cursor-pointer accent-blue-500"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${eventColor}`}>
              {hook.event}
            </span>
            <span className="shrink-0 rounded px-2 py-0.5 text-xs bg-gray-700 text-gray-300">
              {hook.matcher || 'any'}
            </span>
            {!hook.enabled && (
              <span className="shrink-0 text-xs text-gray-500">disabled</span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
            {commandSummary(hook.command)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 ml-4">
        <button
          role="switch"
          aria-checked={hook.enabled}
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
            hook.enabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
          aria-label={`Toggle hook ${hook.event}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              hook.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <button
          ref={deleteButtonRef}
          onClick={onDelete}
          className="text-gray-500 transition-colors hover:text-red-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900 rounded"
          aria-label="Delete hook"
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
