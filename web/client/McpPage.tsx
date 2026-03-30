import { useState, useEffect, useRef } from 'react'
import type { McpServer } from '../../src/lib/mcpTypes.js'
import { fetchMcps, enableMcp, disableMcp, deleteMcp } from './api.js'
import SearchBar from './components/SearchBar.js'
import SectionHeader from './components/SectionHeader.js'
import McpRow from './components/McpRow.js'
import ConfirmModal from './components/ConfirmModal.js'
import BulkActionBar from './components/BulkActionBar.js'
import type { SelectableItem } from '../../src/lib/types.js'

export default function McpPage() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [confirmServer, setConfirmServer] = useState<McpServer | null>(null)
  const [confirmBulk, setConfirmBulk] = useState<McpServer[] | null>(null)
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
      const data = await fetchMcps()
      setServers(data)
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

  async function handleToggle(server: McpServer) {
    try {
      if (server.enabled) {
        await disableMcp(server.id)
      } else {
        await enableMcp(server.id)
      }
      await load()
    } catch (err) {
      showRowError(server.id, String(err))
    }
  }

  function handleDelete(server: McpServer) {
    setConfirmServer(server)
  }

  async function handleConfirmDelete() {
    if (!confirmServer) return
    const server = confirmServer
    setConfirmServer(null)
    try {
      await deleteMcp(server.id)
      delete deleteButtonRefs.current[server.id]
      await load()
    } catch (err) {
      setTimeout(() => { deleteButtonRefs.current[server.id]?.focus() }, 0)
      showRowError(server.id, String(err))
    }
  }

  function handleCancelDelete() {
    if (!confirmServer) return
    const id = confirmServer.id
    setConfirmServer(null)
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
    const toEnable = servers.filter(s => selected.has(s.id) && !s.enabled)
    const results = await Promise.allSettled(toEnable.map(s => enableMcp(s.id)))
    results.forEach((result, i) => {
      if (result.status === 'rejected') showRowError(toEnable[i].id, String(result.reason))
    })
    setSelected(new Set())
    await load()
  }

  async function handleBulkDisable() {
    const toDisable = servers.filter(s => selected.has(s.id) && s.enabled)
    const results = await Promise.allSettled(toDisable.map(s => disableMcp(s.id)))
    results.forEach((result, i) => {
      if (result.status === 'rejected') showRowError(toDisable[i].id, String(result.reason))
    })
    setSelected(new Set())
    await load()
  }

  function handleBulkDelete() {
    setConfirmBulk(servers.filter(s => selected.has(s.id)))
  }

  async function handleConfirmBulkDelete() {
    if (!confirmBulk) return
    const toDelete = confirmBulk
    setConfirmBulk(null)
    const results = await Promise.allSettled(toDelete.map(s => deleteMcp(s.id)))
    results.forEach((result, i) => {
      if (result.status === 'rejected') showRowError(toDelete[i].id, String(result.reason))
    })
    setSelected(new Set())
    await load()
  }

  const filtered = servers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
  const userServers = filtered.filter(s => s.scope === 'user')
  const projectServers = filtered.filter(s => s.scope === 'project')
  const selectedServers = servers.filter(s => selected.has(s.id))

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
          title="USER MCP"
          skills={userServers}
          selected={selected}
          onSelectSection={handleSelectSection}
          collapsed={collapsed.has('user-mcp')}
          onToggleCollapse={() => handleToggleCollapse('user-mcp')}
        />
        {!collapsed.has('user-mcp') && (
          userServers.length === 0
            ? <p className="italic text-gray-500">(none found)</p>
            : <div className="space-y-1">
                {userServers.map(server => (
                  <div key={server.id}>
                    <McpRow
                      server={server}
                      onToggle={() => void handleToggle(server)}
                      onDelete={() => handleDelete(server)}
                      deleteButtonRef={el => { deleteButtonRefs.current[server.id] = el }}
                      isSelected={selected.has(server.id)}
                      onSelect={() => handleSelect(server.id)}
                    />
                    {rowErrors[server.id] && (
                      <p className="px-4 text-xs text-red-400" role="alert">{rowErrors[server.id]}</p>
                    )}
                  </div>
                ))}
              </div>
        )}
      </div>

      <div>
        <SectionHeader
          title="PROJECT MCP"
          skills={projectServers}
          selected={selected}
          onSelectSection={handleSelectSection}
          collapsed={collapsed.has('project-mcp')}
          onToggleCollapse={() => handleToggleCollapse('project-mcp')}
        />
        {!collapsed.has('project-mcp') && (
          projectServers.length === 0
            ? <p className="italic text-gray-500">(none found)</p>
            : <div className="space-y-1">
                {projectServers.map(server => (
                  <div key={server.id}>
                    <McpRow
                      server={server}
                      onToggle={() => void handleToggle(server)}
                      onDelete={() => handleDelete(server)}
                      deleteButtonRef={el => { deleteButtonRefs.current[server.id] = el }}
                      isSelected={selected.has(server.id)}
                      onSelect={() => handleSelect(server.id)}
                    />
                    {rowErrors[server.id] && (
                      <p className="px-4 text-xs text-red-400" role="alert">{rowErrors[server.id]}</p>
                    )}
                  </div>
                ))}
              </div>
        )}
      </div>

      {confirmServer && (
        <ConfirmModal
          skill={confirmServer}
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
        count={selectedServers.length}
        selectedSkills={selectedServers}
        onEnable={() => void handleBulkEnable()}
        onDisable={() => void handleBulkDisable()}
        onDelete={handleBulkDelete}
        onClear={handleClearSelection}
      />
    </div>
  )
}
