import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanMcps } from '../src/lib/mcpScanner.js'
import { enableMcp, disableMcp, deleteMcp } from '../src/lib/mcpActions.js'
import { readFile } from 'node:fs/promises'
import request from 'supertest'
import { createApp } from '../web/server/app.js'

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

describe('MCP actions', () => {
  let tmpRoot: string
  let mcpFile: string

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'sm-mcp-actions-'))
    mcpFile = join(tmpRoot, 'mcp.json')
  })

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true })
  })

  function makeServer(name: string, enabled: boolean): import('../src/lib/mcpTypes.js').McpServer {
    return {
      id: `user:${name}`,
      name,
      scope: 'user',
      enabled,
      command: 'npx',
      args: [],
      configFile: mcpFile,
    }
  }

  it('enableMcp moves server from _disabledMcpServers to mcpServers', async () => {
    await writeFile(mcpFile, JSON.stringify({
      mcpServers: {},
      _disabledMcpServers: { memory: { command: 'npx', args: [] } },
    }))
    await enableMcp(makeServer('memory', false))
    const json = JSON.parse(await readFile(mcpFile, 'utf-8'))
    expect(json.mcpServers).toHaveProperty('memory')
    expect(json._disabledMcpServers).not.toHaveProperty('memory')
  })

  it('disableMcp moves server from mcpServers to _disabledMcpServers', async () => {
    await writeFile(mcpFile, JSON.stringify({
      mcpServers: { filesystem: { command: 'npx', args: ['-y', '@mcp/fs'] } },
    }))
    await disableMcp(makeServer('filesystem', true))
    const json = JSON.parse(await readFile(mcpFile, 'utf-8'))
    expect(json.mcpServers).not.toHaveProperty('filesystem')
    expect(json._disabledMcpServers).toHaveProperty('filesystem')
    expect(json._disabledMcpServers.filesystem.command).toBe('npx')
  })

  it('deleteMcp removes an enabled server', async () => {
    await writeFile(mcpFile, JSON.stringify({
      mcpServers: { todelete: { command: 'node', args: [] } },
    }))
    await deleteMcp(makeServer('todelete', true))
    const json = JSON.parse(await readFile(mcpFile, 'utf-8'))
    expect(json.mcpServers).not.toHaveProperty('todelete')
  })

  it('deleteMcp removes a disabled server', async () => {
    await writeFile(mcpFile, JSON.stringify({
      _disabledMcpServers: { todelete: { command: 'node', args: [] } },
    }))
    await deleteMcp(makeServer('todelete', false))
    const json = JSON.parse(await readFile(mcpFile, 'utf-8'))
    expect(json._disabledMcpServers ?? {}).not.toHaveProperty('todelete')
  })

  it('enableMcp preserves other keys in the JSON file', async () => {
    await writeFile(mcpFile, JSON.stringify({
      mcpServers: { other: { command: 'node', args: [] } },
      _disabledMcpServers: { memory: { command: 'npx', args: [] } },
      someOtherKey: 'preserved',
    }))
    await enableMcp(makeServer('memory', false))
    const json = JSON.parse(await readFile(mcpFile, 'utf-8'))
    expect(json.someOtherKey).toBe('preserved')
    expect(json.mcpServers).toHaveProperty('other')
  })
})

describe('MCP API routes', () => {
  let tmpRoot: string
  let mcpFile: string

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'sm-mcp-api-'))
    mcpFile = join(tmpRoot, 'mcp.json')
  })

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true })
  })

  describe('GET /api/mcps', () => {
    it('returns empty array when file does not exist', async () => {
      const app = createApp('', null, undefined, undefined, '/nonexistent/mcp.json', null)
      const res = await request(app).get('/api/mcps')
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('returns servers from mcp.json', async () => {
      await writeFile(mcpFile, JSON.stringify({
        mcpServers: { filesystem: { command: 'npx', args: ['-y', '@mcp/fs'] } },
      }))
      const app = createApp('', null, undefined, undefined, mcpFile, null)
      const res = await request(app).get('/api/mcps')
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0]).toMatchObject({ name: 'filesystem', enabled: true })
    })
  })

  describe('PATCH /api/mcps/:id/enable', () => {
    it('enables a disabled server', async () => {
      await writeFile(mcpFile, JSON.stringify({
        _disabledMcpServers: { memory: { command: 'npx', args: [] } },
      }))
      const app = createApp('', null, undefined, undefined, mcpFile, null)
      const res = await request(app).patch('/api/mcps/user%3Amemory/enable')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
      const json = JSON.parse(await readFile(mcpFile, 'utf-8'))
      expect(json.mcpServers).toHaveProperty('memory')
    })

    it('returns 404 when server not found', async () => {
      await writeFile(mcpFile, JSON.stringify({ mcpServers: {} }))
      const app = createApp('', null, undefined, undefined, mcpFile, null)
      const res = await request(app).patch('/api/mcps/user%3Anonexistent/enable')
      expect(res.status).toBe(404)
    })

    it('returns 409 when server is already enabled', async () => {
      await writeFile(mcpFile, JSON.stringify({
        mcpServers: { alreadyon: { command: 'npx', args: [] } },
      }))
      const app = createApp('', null, undefined, undefined, mcpFile, null)
      const res = await request(app).patch('/api/mcps/user%3Aalreadyon/enable')
      expect(res.status).toBe(409)
    })
  })

  describe('PATCH /api/mcps/:id/disable', () => {
    it('disables an enabled server', async () => {
      await writeFile(mcpFile, JSON.stringify({
        mcpServers: { filesystem: { command: 'npx', args: [] } },
      }))
      const app = createApp('', null, undefined, undefined, mcpFile, null)
      const res = await request(app).patch('/api/mcps/user%3Afilesystem/disable')
      expect(res.status).toBe(200)
      const json = JSON.parse(await readFile(mcpFile, 'utf-8'))
      expect(json._disabledMcpServers).toHaveProperty('filesystem')
    })

    it('returns 404 when server not found', async () => {
      await writeFile(mcpFile, JSON.stringify({ mcpServers: {} }))
      const app = createApp('', null, undefined, undefined, mcpFile, null)
      const res = await request(app).patch('/api/mcps/user%3Anonexistent/disable')
      expect(res.status).toBe(404)
    })

    it('returns 409 when server is already disabled', async () => {
      await writeFile(mcpFile, JSON.stringify({
        _disabledMcpServers: { alreadyoff: { command: 'npx', args: [] } },
      }))
      const app = createApp('', null, undefined, undefined, mcpFile, null)
      const res = await request(app).patch('/api/mcps/user%3Aalreadyoff/disable')
      expect(res.status).toBe(409)
    })
  })

  describe('DELETE /api/mcps/:id', () => {
    it('deletes an enabled server', async () => {
      await writeFile(mcpFile, JSON.stringify({
        mcpServers: { todelete: { command: 'node', args: [] } },
      }))
      const app = createApp('', null, undefined, undefined, mcpFile, null)
      const res = await request(app).delete('/api/mcps/user%3Atodelete')
      expect(res.status).toBe(200)
      const json = JSON.parse(await readFile(mcpFile, 'utf-8'))
      expect(json.mcpServers ?? {}).not.toHaveProperty('todelete')
    })

    it('returns 404 when server not found', async () => {
      await writeFile(mcpFile, JSON.stringify({ mcpServers: {} }))
      const app = createApp('', null, undefined, undefined, mcpFile, null)
      const res = await request(app).delete('/api/mcps/user%3Anonexistent')
      expect(res.status).toBe(404)
    })
  })
})
