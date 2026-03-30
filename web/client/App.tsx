import { useState, useEffect, useRef } from 'react'
import type { Skill } from '../../src/lib/types.js'
import {
  fetchSkills,
  enableSkill,
  disableSkill,
  deleteSkill,
} from './api.js'
import SearchBar from './components/SearchBar.js'
import SectionHeader from './components/SectionHeader.js'
import SkillRow from './components/SkillRow.js'
import ConfirmModal from './components/ConfirmModal.js'

export default function App() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [confirmSkill, setConfirmSkill] = useState<Skill | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const deleteButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  async function load() {
    try {
      setError(null)
      const data = await fetchSkills()
      setSkills(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function showRowError(id: string, msg: string) {
    setRowErrors(prev => ({ ...prev, [id]: msg }))
    setTimeout(() => {
      setRowErrors(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }, 3000)
  }

  async function handleToggle(skill: Skill) {
    try {
      if (skill.enabled) {
        await disableSkill(skill.id)
      } else {
        await enableSkill(skill.id)
      }
      await load()
    } catch (err) {
      showRowError(skill.id, String(err))
    }
  }

  function handleDelete(skill: Skill) {
    setConfirmSkill(skill)
  }

  async function handleConfirmDelete() {
    if (!confirmSkill) return
    const skill = confirmSkill
    setConfirmSkill(null)
    // Return focus to the delete button that triggered the modal
    setTimeout(() => {
      deleteButtonRefs.current[skill.id]?.focus()
    }, 0)
    try {
      await deleteSkill(skill.id)
      await load()
    } catch (err) {
      showRowError(skill.id, String(err))
    }
  }

  function handleCancelDelete() {
    if (!confirmSkill) return
    const id = confirmSkill.id
    setConfirmSkill(null)
    // Return focus to the delete button that triggered the modal
    setTimeout(() => {
      deleteButtonRefs.current[id]?.focus()
    }, 0)
  }

  const filtered = skills.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  )
  const userSkills = filtered.filter(s => s.scope === 'user')
  const projectSkills = filtered.filter(s => s.scope === 'project')

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-900">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => {
            setLoading(true)
            void load()
          }}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <h1 className="mb-6 text-2xl font-bold text-white">🔧 Skill Manager</h1>

      <SearchBar value={search} onChange={setSearch} />

      <div className="mb-8">
        <SectionHeader title="USER SKILLS" count={userSkills.length} />
        {userSkills.length === 0 ? (
          <p className="italic text-gray-500">(none found)</p>
        ) : (
          <div className="space-y-1">
            {userSkills.map(skill => (
              <div key={skill.id}>
                <SkillRow
                  skill={skill}
                  onToggle={() => void handleToggle(skill)}
                  onDelete={() => handleDelete(skill)}
                  deleteButtonRef={(el) => { deleteButtonRefs.current[skill.id] = el }}
                />
                {rowErrors[skill.id] && (
                  <p className="px-4 text-xs text-red-400" role="alert">
                    {rowErrors[skill.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeader title="PROJECT SKILLS" count={projectSkills.length} />
        {projectSkills.length === 0 ? (
          <p className="italic text-gray-500">(none found)</p>
        ) : (
          <div className="space-y-1">
            {projectSkills.map(skill => (
              <div key={skill.id}>
                <SkillRow
                  skill={skill}
                  onToggle={() => void handleToggle(skill)}
                  onDelete={() => handleDelete(skill)}
                  deleteButtonRef={(el) => { deleteButtonRefs.current[skill.id] = el }}
                />
                {rowErrors[skill.id] && (
                  <p className="px-4 text-xs text-red-400" role="alert">
                    {rowErrors[skill.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmSkill && (
        <ConfirmModal
          skill={confirmSkill}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}
