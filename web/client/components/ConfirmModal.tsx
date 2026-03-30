import { useRef, useEffect } from 'react'
import type { Skill } from '../../../src/lib/types.js'

interface Props {
  skill: Skill
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ skill, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { cancelRef.current?.focus() }, [])

  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
        return
      }
      if (e.key === 'Tab') {
        // Focus trap: cycle between cancelRef and confirmRef
        const focusable = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLButtonElement[]
        if (focusable.length < 2) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div
        className="w-80 rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <h3 id="confirm-modal-title" className="mb-2 text-lg font-semibold text-white">
          Delete &quot;{skill.name}&quot;?
        </h3>
        <p className="mb-6 text-sm text-gray-400">This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
