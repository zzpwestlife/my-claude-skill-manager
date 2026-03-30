import { useState, useEffect, useRef } from 'react'
import type { Hook } from '../../src/lib/hookTypes.js'
import { fetchHooks, enableHook, disableHook, deleteHook } from './api.js'
import SearchBar from './components/SearchBar.js'
import SectionHeader from './components/SectionHeader.js'
import HookRow from './components/HookRow.js'
import ConfirmModal from './components/ConfirmModal.js'
import BulkActionBar from './components/BulkActionBar.js'
import type { SelectableItem } from '../../src/lib/types.js'

export default function HookPage() {
  const [hooks, setHooks] = useState<Hook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [confirmHook, setConfirmHook] = useState<Hook | null>(null)
  const [confirmBulk, setConfirmBulk] = useState<Hook[] | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const deleteButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  function handleToggleCollapse(section: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
  }

  async function load() {
    try {
      setError(null)
      const data = await fetchHooks()
      setHooks(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [])

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

  async function handleToggle(hook: Hook) {
    try {
      if (hook.enabled) {
        await disableHook(hook.id)
      } else {
        await enableHook(hook.id)
      }
      await load()
    } catch (err) {
      showRowError(hook.id, String(err))
    }
  }

  function handleDelete(hook: Hook) {
    setConfirmHook(hook)
  }

  async function handleConfirmDelete() {
    if (!confirmHook) return
    const hook = confirmHook
    setConfirmHook(null)
    try {
      await deleteHook(hook.id)
      delete deleteButtonRefs.current[hook.id]
      await load()
    } catch (err) {
      setTimeout(() => { deleteButtonRefs.current[hook.id]?.focus() }, 0)
      showRowError(hook.id, String(err))
    }
  }

  function handleCancelDelete() {
    if (!confirmHook) return
    const id = confirmHook.id
    setConfirmHook(null)
    setTimeout(() => { deleteButtonRefs.current[id]?.focus() }, 0)
  }

  function handleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSelectSection(items: SelectableItem[]) {
    setSelected(prev => {
      const allSelected = items.length > 0 && items.every(s => prev.has(s.id))
      const next = new Set(prev)
      if (allSelected) {
        items.forEach(s => next.delete(s.id))
      } else {
        items.forEach(s => next.add(s.id))
      }
      return next
    })
  }

  function handleClearSelection() {
    setSelected(new Set())
  }

  async function handleBulkEnable() {
    const toEnable = hooks.filter(s => selected.has(s.id) && !s.enabled)
    const results = await Promise.allSettled(toEnable.map(s => enableHook(s.id)))
    results.forEach((result, i) => {
      if (result.status === 'rejected') showRowError(toEnable[i].id, String(result.reason))
    })
    setSelected(new Set())
    await load()
  }

  async function handleBulkDisable() {
    const toDisable = hooks.filter(s => selected.has(s.id) && s.enabled)
    const results = await Promise.allSettled(toDisable.map(s => disableHook(s.id)))
    results.forEach((result, i) => {
      if (result.status === 'rejected') showRowError(toDisable[i].id, String(result.reason))
    })
    setSelected(new Set())
    await load()
  }

  function handleBulkDelete() {
    setConfirmBulk(hooks.filter(s => selected.has(s.id)))
  }

  async function handleConfirmBulkDelete() {
    if (!confirmBulk) return
    const toDelete = confirmBulk
    setConfirmBulk(null)
    const results = await Promise.allSettled(toDelete.map(s => deleteHook(s.id)))
    results.forEach((result, i) => {
      if (result.status === 'rejected') showRowError(toDelete[i].id, String(result.reason))
    })
    setSelected(new Set())
    await load()
  }

  const q = search.toLowerCase()
  const filtered = hooks.filter(s =>
    s.command.toLowerCase().includes(q) ||
    s.matcher.toLowerCase().includes(q) ||
    s.event.toLowerCase().includes(q)
  )
  const userHooks = filtered.filter(s => s.scope === 'user')
  const projectHooks = filtered.filter(s => s.scope === 'project')
  const selectedHooks = hooks.filter(s => selected.has(s.id))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => { setLoading(true); void load() }}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <SearchBar value={search} onChange={setSearch} />

      <div className="mb-8">
        <SectionHeader
          title="USER HOOKS"
          skills={userHooks}
          selected={selected}
          onSelectSection={handleSelectSection}
          collapsed={collapsed.has('user-hooks')}
          onToggleCollapse={() => handleToggleCollapse('user-hooks')}
        />
        {!collapsed.has('user-hooks') && (
          userHooks.length === 0
            ? <p className="italic text-gray-500">(none found)</p>
            : <div className="space-y-1">
                {userHooks.map(hook => (
                  <div key={hook.id}>
                    <HookRow
                      hook={hook}
                      onToggle={() => void handleToggle(hook)}
                      onDelete={() => handleDelete(hook)}
                      deleteButtonRef={el => { deleteButtonRefs.current[hook.id] = el }}
                      isSelected={selected.has(hook.id)}
                      onSelect={() => handleSelect(hook.id)}
                    />
                    {rowErrors[hook.id] && (
                      <p className="px-4 text-xs text-red-400" role="alert">{rowErrors[hook.id]}</p>
                    )}
                  </div>
                ))}
              </div>
        )}
      </div>

      <div>
        <SectionHeader
          title="PROJECT HOOKS"
          skills={projectHooks}
          selected={selected}
          onSelectSection={handleSelectSection}
          collapsed={collapsed.has('project-hooks')}
          onToggleCollapse={() => handleToggleCollapse('project-hooks')}
        />
        {!collapsed.has('project-hooks') && (
          projectHooks.length === 0
            ? <p className="italic text-gray-500">(none found)</p>
            : <div className="space-y-1">
                {projectHooks.map(hook => (
                  <div key={hook.id}>
                    <HookRow
                      hook={hook}
                      onToggle={() => void handleToggle(hook)}
                      onDelete={() => handleDelete(hook)}
                      deleteButtonRef={el => { deleteButtonRefs.current[hook.id] = el }}
                      isSelected={selected.has(hook.id)}
                      onSelect={() => handleSelect(hook.id)}
                    />
                    {rowErrors[hook.id] && (
                      <p className="px-4 text-xs text-red-400" role="alert">{rowErrors[hook.id]}</p>
                    )}
                  </div>
                ))}
              </div>
        )}
      </div>

      {confirmHook && (
        <ConfirmModal
          skill={confirmHook}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={handleCancelDelete}
        />
      )}

      {confirmBulk && (
        <ConfirmModal
          skills={confirmBulk}
          onConfirm={() => void handleConfirmBulkDelete()}
          onCancel={() => setConfirmBulk(null)}
        />
      )}

      <BulkActionBar
        count={selectedHooks.length}
        selectedSkills={selectedHooks}
        onEnable={() => void handleBulkEnable()}
        onDisable={() => void handleBulkDisable()}
        onDelete={handleBulkDelete}
        onClear={handleClearSelection}
      />
    </div>
  )
}
