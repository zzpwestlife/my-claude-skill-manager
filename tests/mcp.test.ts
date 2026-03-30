import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanMcps } from '../src/lib/mcpScanner.js'

describe('scanMcps', () => {
  let tmpRoot: string
  let userFile: string

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'sm-mcp-test-'))
    userFile = join(tmpRoot, 'user-mcp.json')
  })

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true })
  })

  it('returns empty array when user file does not exist', async () => {
    const result = await scanMcps('/nonexistent/mcp.json', null)
    expect(result).toEqual([])
  })

  it('returns enabled servers from mcpServers', async () => {
    await writeFile(userFile, JSON.stringify({
      mcpServers: {
        filesystem: { command: 'npx', args: ['-y', '@mcp/fs'] },
      },
    }))
    const result = await scanMcps(userFile, null)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'user:filesystem',
      name: 'filesystem',
      scope: 'user',
      enabled: true,
      command: 'npx',
      args: ['-y', '@mcp/fs'],
      configFile: userFile,
    })
  })

  it('returns disabled servers from _disabledMcpServers', async () => {
    await writeFile(userFile, JSON.stringify({
      _disabledMcpServers: {
        memory: { command: 'node', args: ['memory-server.js'] },
      },
    }))
    const result = await scanMcps(userFile, null)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'user:memory',
      name: 'memory',
      scope: 'user',
      enabled: false,
    })
  })

  it('merges enabled and disabled servers, sorted by name', async () => {
    await writeFile(userFile, JSON.stringify({
      mcpServers: { zoo: { command: 'node', args: [] } },
      _disabledMcpServers: { alpha: { command: 'npx', args: [] } },
    }))
    const result = await scanMcps(userFile, null)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('alpha')
    expect(result[1].name).toBe('zoo')
  })

  it('includes project scope servers from project file', async () => {
    const projectFile = join(tmpRoot, 'project-mcp.json')
    await writeFile(userFile, JSON.stringify({ mcpServers: { 'user-server': { command: 'node', args: [] } } }))
    await writeFile(projectFile, JSON.stringify({ mcpServers: { 'proj-server': { command: 'npx', args: [] } } }))
    const result = await scanMcps(userFile, projectFile)
    expect(result.some(s => s.scope === 'user' && s.name === 'user-server')).toBe(true)
    expect(result.some(s => s.scope === 'project' && s.name === 'proj-server')).toBe(true)
  })

  it('handles malformed JSON gracefully', async () => {
    await writeFile(userFile, 'NOT JSON')
    const result = await scanMcps(userFile, null)
    expect(result).toEqual([])
  })

  it('preserves env and type fields', async () => {
    await writeFile(userFile, JSON.stringify({
      mcpServers: {
        'api-server': {
          command: 'node',
          args: ['server.js'],
          env: { API_KEY: 'secret123' },
          type: 'stdio',
        },
      },
    }))
    const result = await scanMcps(userFile, null)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      env: { API_KEY: 'secret123' },
      type: 'stdio',
    })
  })
})
