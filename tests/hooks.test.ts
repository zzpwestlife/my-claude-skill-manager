import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scanHooks } from '../src/lib/hookScanner.js'

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
