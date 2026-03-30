import { useRef, useEffect } from 'react'
import type { Skill } from '../../../src/lib/types.js'

interface Props {
  title: string
  count: number
  skills: Skill[]
  selected: Set<string>
  onSelectSection: (skills: Skill[]) => void
}

export default function SectionHeader({ title, count, skills, selected, onSelectSection }: Props) {
  const checkboxRef = useRef<HTMLInputElement>(null)
  const allSelected = skills.length > 0 && skills.every(s => selected.has(s.id))
  const someSelected = skills.some(s => selected.has(s.id))

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected && !allSelected
    }
  }, [someSelected, allSelected])

  return (
    <div className="mb-3 flex items-center gap-2">
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={allSelected}
        onChange={() => onSelectSection(skills)}
        aria-label={`Select all ${title.toLowerCase()}`}
        disabled={skills.length === 0}
        className="h-4 w-4 cursor-pointer accent-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
      />
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {title} ({count})
      </h2>
    </div>
  )
}
