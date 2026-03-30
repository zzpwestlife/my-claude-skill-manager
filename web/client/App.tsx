import { useState, useEffect, useRef } from 'react'
import type { Skill } from '../../src/lib/types.js'
import {
  fetchSkills,
  fetchConfig,
  enableSkill,
  disableSkill,
  deleteSkill,
} from './api.js'
import type { Config } from './api.js'
import SearchBar from './components/SearchBar.js'
import SectionHeader from './components/SectionHeader.js'
import SkillRow from './components/SkillRow.js'
import ConfirmModal from './components/ConfirmModal.js'
import BulkActionBar from './components/BulkActionBar.js'
import McpPage from './McpPage.js'
import type { SelectableItem } from '../../src/lib/types.js'

export default function App() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [confirmSkill, setConfirmSkill] = useState<Skill | null>(null)
  const [confirmBulk, setConfirmBulk] = useState<Skill[] | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [currentTab, setCurrentTab] = useState<'skills' | 'mcp'>('skills')

  function handleToggleCollapse(section: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
  }
  const deleteButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  async function load() {
    try {
      setError(null)
      const [data, cfg] = await Promise.all([fetchSkills(), fetchConfig()])
      setSkills(data)
      setConfig(cfg)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  // load is defined inline and intentionally omitted from deps:
  // it's only called imperatively, and adding it would require useCallback
  // wrapping with no behavioral benefit in this single-fetch pattern.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Single-skill handlers ─────────────────────────────────────────────────

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
    try {
      await deleteSkill(skill.id)
      // Clean up stale ref after successful deletion
      delete deleteButtonRefs.current[skill.id]
      await load()
    } catch (err) {
      // On failure, skill still exists — return focus to its delete button
      setTimeout(() => {
        deleteButtonRefs.current[skill.id]?.focus()
      }, 0)
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

  // ── Selection handlers ────────────────────────────────────────────────────

  function handleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleSelectSection(sectionSkills: SelectableItem[]) {
    setSelected(prev => {
      const allSelected = sectionSkills.length > 0 && sectionSkills.every(s => prev.has(s.id))
      const next = new Set(prev)
      if (allSelected) {
        sectionSkills.forEach(s => next.delete(s.id))
      } else {
        sectionSkills.forEach(s => next.add(s.id))
      }
      return next
    })
  }

  function handleClearSelection() {
    setSelected(new Set())
  }

  // ── Bulk handlers ─────────────────────────────────────────────────────────

  async function handleBulkEnable() {
    const toEnable = skills.filter(s => selected.has(s.id) && !s.enabled)
    const results = await Promise.allSettled(toEnable.map(s => enableSkill(s.id)))
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        showRowError(toEnable[i].id, String(result.reason))
      }
    })
    setSelected(new Set())
    await load()
  }

  async function handleBulkDisable() {
    const toDisable = skills.filter(s => selected.has(s.id) && s.enabled)
    const results = await Promise.allSettled(toDisable.map(s => disableSkill(s.id)))
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        showRowError(toDisable[i].id, String(result.reason))
      }
    })
    setSelected(new Set())
    await load()
  }

  function handleBulkDelete() {
    const toDelete = skills.filter(s => selected.has(s.id))
    setConfirmBulk(toDelete)
  }

  async function handleConfirmBulkDelete() {
    if (!confirmBulk) return
    const toDelete = confirmBulk
    setConfirmBulk(null)
    const results = await Promise.allSettled(toDelete.map(s => deleteSkill(s.id)))
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        showRowError(toDelete[i].id, String(result.reason))
      }
    })
    setSelected(new Set())
    await load()
  }

  function handleCancelBulkDelete() {
    setConfirmBulk(null)
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const filtered = skills.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  )
  const userSkills = filtered.filter(s => s.scope === 'user')
  const projectSkills = filtered.filter(s => s.scope === 'project')
  const pluginSkills = filtered.filter(s => s.scope === 'plugin')
  // selectedSkills from full skills list (not filtered) so bulk bar stays accurate while searching
  const selectedSkills = skills.filter(s => selected.has(s.id))

  // ── Render ────────────────────────────────────────────────────────────────

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
    // pb-24: leaves room so BulkActionBar doesn't overlap last skill row
    <div className="min-h-screen bg-gray-900 p-8 pb-24">
      <div className="mb-6 flex items-center gap-6">
        <h1 className="text-2xl font-bold text-white">🔧 Skill Manager</h1>
        <div className="flex gap-1 rounded-lg bg-gray-800 p-1">
          <button
            onClick={() => setCurrentTab('skills')}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${
              currentTab === 'skills'
                ? 'bg-gray-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Skills
          </button>
          <button
            onClick={() => setCurrentTab('mcp')}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${
              currentTab === 'mcp'
                ? 'bg-gray-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            MCP
          </button>
        </div>
      </div>

      {currentTab === 'skills' ? (
        <>
          <SearchBar value={search} onChange={setSearch} />

      <div className="mb-8">
        <SectionHeader
          title="USER SKILLS"
          skills={userSkills}
          selected={selected}
          onSelectSection={handleSelectSection}
          collapsed={collapsed.has('user')}
          onToggleCollapse={() => handleToggleCollapse('user')}
        />
        {!collapsed.has('user') && (
          userSkills.length === 0 ? (
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
                    isSelected={selected.has(skill.id)}
                    onSelect={() => handleSelect(skill.id)}
                  />
                  {rowErrors[skill.id] && (
                    <p className="px-4 text-xs text-red-400" role="alert">
                      {rowErrors[skill.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <div>
        <SectionHeader
          title="PROJECT SKILLS"
          skills={projectSkills}
          selected={selected}
          onSelectSection={handleSelectSection}
          hint={config?.projectRoot ?? undefined}
          collapsed={collapsed.has('project')}
          onToggleCollapse={() => handleToggleCollapse('project')}
        />
        {!collapsed.has('project') && (
          projectSkills.length === 0 ? (
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
                    isSelected={selected.has(skill.id)}
                    onSelect={() => handleSelect(skill.id)}
                  />
                  {rowErrors[skill.id] && (
                    <p className="px-4 text-xs text-red-400" role="alert">
                      {rowErrors[skill.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <div className="mt-8">
        <SectionHeader
          title="PLUGIN SKILLS"
          skills={pluginSkills}
          selected={selected}
          onSelectSection={handleSelectSection}
          collapsed={collapsed.has('plugin')}
          onToggleCollapse={() => handleToggleCollapse('plugin')}
        />
        {!collapsed.has('plugin') && (
          pluginSkills.length === 0 ? (
            <p className="italic text-gray-500">(none found)</p>
          ) : (
            <div className="space-y-1">
              {pluginSkills.map(skill => (
                <div key={skill.id}>
                  <SkillRow
                    skill={skill}
                    onToggle={() => void handleToggle(skill)}
                    onDelete={() => handleDelete(skill)}
                    deleteButtonRef={(el) => { deleteButtonRefs.current[skill.id] = el }}
                    isSelected={selected.has(skill.id)}
                    onSelect={() => handleSelect(skill.id)}
                  />
                  {rowErrors[skill.id] && (
                    <p className="px-4 text-xs text-red-400" role="alert">
                      {rowErrors[skill.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Single-skill delete confirmation */}
      {confirmSkill && (
        <ConfirmModal
          skill={confirmSkill}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={handleCancelDelete}
        />
      )}

      {/* Bulk delete confirmation */}
      {confirmBulk && (
        <ConfirmModal
          skills={confirmBulk}
          onConfirm={() => void handleConfirmBulkDelete()}
          onCancel={handleCancelBulkDelete}
        />
      )}

      <BulkActionBar
        count={selectedSkills.length}
        selectedSkills={selectedSkills}
        onEnable={() => void handleBulkEnable()}
        onDisable={() => void handleBulkDisable()}
        onDelete={handleBulkDelete}
        onClear={handleClearSelection}
      />
        </>
      ) : (
        <McpPage />
      )}
    </div>
  )
}
