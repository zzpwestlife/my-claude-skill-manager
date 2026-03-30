import { enableHook, disableHook, deleteHook } from '../src/lib/hookActions.js'
import { readFile } from 'node:fs/promises'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanHooks } from '../src/lib/hookScanner.js'
import request from 'supertest'
import { createApp } from '../web/server/app.js'

describe('scanHooks', () => {
  let tmpRoot: string
  let userFile: string

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'sm-hook-test-'))
    userFile = join(tmpRoot, 'settings.json')
  })

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true })
  })

  it('returns empty array when settings file does not exist', async () => {
    const result = await scanHooks('/nonexistent/settings.json', null)
    expect(result).toEqual([])
  })

  it('returns empty array when settings.json has no hooks key', async () => {
    await writeFile(userFile, JSON.stringify({ permissions: [] }))
    const result = await scanHooks(userFile, null)
    expect(result).toEqual([])
  })

  it('returns hooks with correct shape', async () => {
    await writeFile(userFile, JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [{ type: 'command', command: 'echo before bash' }],
          },
        ],
      },
    }))
    const result = await scanHooks(userFile, null)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'user:PreToolUse:0:0',
      scope: 'user',
      event: 'PreToolUse',
      matcher: 'Bash',
      command: 'echo before bash',
      enabled: true,
      configFile: userFile,
      matcherIndex: 0,
      hookIndex: 0,
    })
  })

  it('returns enabled:false when hook has disabled:true', async () => {
    await writeFile(userFile, JSON.stringify({
      hooks: {
        Stop: [
          {
            hooks: [{ type: 'command', command: '/notify.sh', disabled: true }],
          },
        ],
      },
    }))
    const result = await scanHooks(userFile, null)
    expect(result).toHaveLength(1)
    expect(result[0].enabled).toBe(false)
    expect(result[0].matcher).toBe('')
  })

  it('handles multiple matchers and multiple hooks per matcher', async () => {
    await writeFile(userFile, JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              { type: 'command', command: 'echo a' },
              { type: 'command', command: 'echo b' },
            ],
          },
          {
            matcher: 'Edit',
            hooks: [{ type: 'command', command: 'echo c' }],
          },
        ],
      },
    }))
    const result = await scanHooks(userFile, null)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ id: 'user:PreToolUse:0:0', command: 'echo a' })
    expect(result[1]).toMatchObject({ id: 'user:PreToolUse:0:1', command: 'echo b' })
    expect(result[2]).toMatchObject({ id: 'user:PreToolUse:1:0', command: 'echo c' })
  })

  it('handles multiple event types', async () => {
    await writeFile(userFile, JSON.stringify({
      hooks: {
        PreToolUse: [{ hooks: [{ command: 'echo pre' }] }],
        Stop: [{ hooks: [{ command: 'echo stop' }] }],
      },
    }))
    const result = await scanHooks(userFile, null)
    expect(result).toHaveLength(2)
    expect(result.some(h => h.event === 'PreToolUse')).toBe(true)
    expect(result.some(h => h.event === 'Stop')).toBe(true)
  })

  it('includes project scope hooks from project file', async () => {
    const projectFile = join(tmpRoot, 'project-settings.json')
    await writeFile(userFile, JSON.stringify({
      hooks: { Stop: [{ hooks: [{ command: 'echo user-stop' }] }] },
    }))
    await writeFile(projectFile, JSON.stringify({
      hooks: { Stop: [{ hooks: [{ command: 'echo proj-stop' }] }] },
    }))
    const result = await scanHooks(userFile, projectFile)
    expect(result.some(h => h.scope === 'user' && h.command === 'echo user-stop')).toBe(true)
    expect(result.some(h => h.scope === 'project' && h.command === 'echo proj-stop')).toBe(true)
  })

  it('handles malformed JSON gracefully', async () => {
    await writeFile(userFile, 'NOT JSON')
    const result = await scanHooks(userFile, null)
    expect(result).toEqual([])
  })
})

describe('Hook actions', () => {
  let tmpRoot: string
  let settingsFile: string

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'sm-hook-actions-'))
    settingsFile = join(tmpRoot, 'settings.json')
  })

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true })
  })

  function makeHook(overrides: Partial<import('../src/lib/hookTypes.js').Hook> = {}): import('../src/lib/hookTypes.js').Hook {
    return {
      id: 'user:PreToolUse:0:0',
      scope: 'user',
      event: 'PreToolUse',
      matcher: 'Bash',
      command: 'echo hi',
      enabled: true,
      configFile: settingsFile,
      matcherIndex: 0,
      hookIndex: 0,
      ...overrides,
    }
  }

  it('disableHook adds disabled:true to the hook entry', async () => {
    await writeFile(settingsFile, JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] },
        ],
      },
    }))
    await disableHook(makeHook())
    const json = JSON.parse(await readFile(settingsFile, 'utf-8'))
    expect(json.hooks.PreToolUse[0].hooks[0].disabled).toBe(true)
  })

  it('enableHook removes disabled field from hook entry', async () => {
    await writeFile(settingsFile, JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [{ type: 'command', command: 'echo hi', disabled: true }],
          },
        ],
      },
    }))
    await enableHook(makeHook({ enabled: false }))
    const json = JSON.parse(await readFile(settingsFile, 'utf-8'))
    expect(json.hooks.PreToolUse[0].hooks[0].disabled).toBeUndefined()
  })

  it('deleteHook removes the hook entry — empty hooks array cleans up matcher and event', async () => {
    await writeFile(settingsFile, JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] },
        ],
      },
    }))
    await deleteHook(makeHook())
    const json = JSON.parse(await readFile(settingsFile, 'utf-8'))
    expect(json.hooks?.PreToolUse).toBeUndefined()
  })

  it('deleteHook removes only the targeted hook when multiple exist', async () => {
    await writeFile(settingsFile, JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              { type: 'command', command: 'echo first' },
              { type: 'command', command: 'echo second' },
            ],
          },
        ],
      },
    }))
    await deleteHook(makeHook({ hookIndex: 0 }))
    const json = JSON.parse(await readFile(settingsFile, 'utf-8'))
    expect(json.hooks.PreToolUse[0].hooks).toHaveLength(1)
    expect(json.hooks.PreToolUse[0].hooks[0].command).toBe('echo second')
  })

  it('deleteHook removes matcher entry when its hooks array becomes empty', async () => {
    await writeFile(settingsFile, JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ command: 'echo a' }] },
          { matcher: 'Edit', hooks: [{ command: 'echo b' }] },
        ],
      },
    }))
    await deleteHook(makeHook({ matcherIndex: 0, hookIndex: 0 }))
    const json = JSON.parse(await readFile(settingsFile, 'utf-8'))
    expect(json.hooks.PreToolUse).toHaveLength(1)
    expect(json.hooks.PreToolUse[0].matcher).toBe('Edit')
  })

  it('actions preserve other keys in settings.json', async () => {
    await writeFile(settingsFile, JSON.stringify({
      permissions: ['allow-bash'],
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ command: 'echo hi' }] },
        ],
      },
    }))
    await disableHook(makeHook())
    const json = JSON.parse(await readFile(settingsFile, 'utf-8'))
    expect(json.permissions).toEqual(['allow-bash'])
  })
})

describe('Hooks API routes', () => {
  let tmpRoot: string
  let settingsFile: string

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'sm-hook-api-'))
    settingsFile = join(tmpRoot, 'settings.json')
  })

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true })
  })

  describe('GET /api/hooks', () => {
    it('returns empty array when settings file does not exist', async () => {
      const app = createApp('', null, undefined, undefined, undefined, null, '/nonexistent/settings.json', null)
      const res = await request(app).get('/api/hooks')
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('returns hooks from settings.json', async () => {
      await writeFile(settingsFile, JSON.stringify({
        hooks: {
          Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }],
        },
      }))
      const app = createApp('', null, undefined, undefined, undefined, null, settingsFile, null)
      const res = await request(app).get('/api/hooks')
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0]).toMatchObject({ event: 'Stop', command: 'echo done', enabled: true })
    })
  })

  describe('PATCH /api/hooks/:id/disable', () => {
    it('disables an enabled hook', async () => {
      await writeFile(settingsFile, JSON.stringify({
        hooks: {
          PreToolUse: [
            { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] },
          ],
        },
      }))
      const app = createApp('', null, undefined, undefined, undefined, null, settingsFile, null)
      const res = await request(app).patch('/api/hooks/user%3APreToolUse%3A0%3A0/disable')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
      const json = JSON.parse(await readFile(settingsFile, 'utf-8'))
      expect(json.hooks.PreToolUse[0].hooks[0].disabled).toBe(true)
    })

    it('returns 404 when hook not found', async () => {
      await writeFile(settingsFile, JSON.stringify({ hooks: {} }))
      const app = createApp('', null, undefined, undefined, undefined, null, settingsFile, null)
      const res = await request(app).patch('/api/hooks/user%3APreToolUse%3A0%3A0/disable')
      expect(res.status).toBe(404)
    })

    it('returns 409 when hook is already disabled', async () => {
      await writeFile(settingsFile, JSON.stringify({
        hooks: {
          PreToolUse: [
            { matcher: 'Bash', hooks: [{ command: 'echo hi', disabled: true }] },
          ],
        },
      }))
      const app = createApp('', null, undefined, undefined, undefined, null, settingsFile, null)
      const res = await request(app).patch('/api/hooks/user%3APreToolUse%3A0%3A0/disable')
      expect(res.status).toBe(409)
    })
  })

  describe('PATCH /api/hooks/:id/enable', () => {
    it('enables a disabled hook', async () => {
      await writeFile(settingsFile, JSON.stringify({
        hooks: {
          Stop: [{ hooks: [{ command: 'echo hi', disabled: true }] }],
        },
      }))
      const app = createApp('', null, undefined, undefined, undefined, null, settingsFile, null)
      const res = await request(app).patch('/api/hooks/user%3AStop%3A0%3A0/enable')
      expect(res.status).toBe(200)
      const json = JSON.parse(await readFile(settingsFile, 'utf-8'))
      expect(json.hooks.Stop[0].hooks[0].disabled).toBeUndefined()
    })

    it('returns 409 when hook is already enabled', async () => {
      await writeFile(settingsFile, JSON.stringify({
        hooks: {
          Stop: [{ hooks: [{ command: 'echo hi' }] }],
        },
      }))
      const app = createApp('', null, undefined, undefined, undefined, null, settingsFile, null)
      const res = await request(app).patch('/api/hooks/user%3AStop%3A0%3A0/enable')
      expect(res.status).toBe(409)
    })
  })

  describe('DELETE /api/hooks/:id', () => {
    it('deletes a hook', async () => {
      await writeFile(settingsFile, JSON.stringify({
        hooks: {
          Stop: [{ hooks: [{ command: 'echo bye' }] }],
        },
      }))
      const app = createApp('', null, undefined, undefined, undefined, null, settingsFile, null)
      const res = await request(app).delete('/api/hooks/user%3AStop%3A0%3A0')
      expect(res.status).toBe(200)
      const json = JSON.parse(await readFile(settingsFile, 'utf-8'))
      expect(json.hooks?.Stop).toBeUndefined()
    })

    it('returns 404 when hook not found', async () => {
      await writeFile(settingsFile, JSON.stringify({ hooks: {} }))
      const app = createApp('', null, undefined, undefined, undefined, null, settingsFile, null)
      const res = await request(app).delete('/api/hooks/user%3AStop%3A9%3A9')
      expect(res.status).toBe(404)
    })
  })
})
