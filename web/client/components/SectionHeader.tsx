import { useRef, useEffect } from 'react'
import type { Skill } from '../../../src/lib/types.js'

interface Props {
  title: string
  skills: Skill[]
  selected: Set<string>
  onSelectSection: (skills: Skill[]) => void
  hint?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function SectionHeader({ title, skills, selected, onSelectSection, hint, collapsed = false, onToggleCollapse }: Props) {
  const checkboxRef = useRef<HTMLInputElement>(null)
  const allSelected = skills.length > 0 && skills.every(s => selected.has(s.id))
  const someSelected = skills.some(s => selected.has(s.id))
  const enabledCount = skills.filter(s => s.enabled).length
  const disabledCount = skills.length - enabledCount

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected && !allSelected
    }
  }, [someSelected, allSelected])

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        {!collapsed && (
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={allSelected}
            onChange={() => onSelectSection(skills)}
            aria-label={`Select all ${title.toLowerCase()}`}
            disabled={skills.length === 0}
            className="h-4 w-4 cursor-pointer accent-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          />
        )}
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 text-left focus-visible:outline-none"
          aria-expanded={!collapsed}
        >
          <span className="text-gray-600 text-xs select-none">{collapsed ? '▶' : '▼'}</span>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {title}
            <span className="ml-2 normal-case font-normal">
              <span className="text-green-500">{enabledCount} enabled</span>
              {disabledCount > 0 && (
                <span className="text-gray-500"> · {disabledCount} disabled</span>
              )}
            </span>
          </h2>
        </button>
      </div>
      {hint && (
        <p className="ml-6 mt-0.5 font-mono text-xs text-gray-600">{hint}</p>
      )}
    </div>
  )
}
