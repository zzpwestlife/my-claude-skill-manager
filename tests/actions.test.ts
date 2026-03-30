import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, access, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { enableSkill, disableSkill, deleteSkill } from '../src/lib/actions.js'
import type { Skill } from '../src/lib/types.js'

function makeSkill(overrides: Partial<Skill> & { path: string }): Skill {
  return {
    id: 'user:my-skill',
    name: 'my-skill',
    scope: 'user',
    enabled: true,
    isSymlink: false,
    ...overrides,
  }
}

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true } catch { return false }
}

describe('enableSkill', () => {
  let tmpDir: string
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), 'act-test-')) })
  afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }) })

  it('renames SKILL.md.disabled to SKILL.md', async () => {
    const skillDir = join(tmpDir, 'my-skill')
    await mkdir(skillDir)
    await writeFile(join(skillDir, 'SKILL.md.disabled'), '# skill')

    await enableSkill(makeSkill({ path: skillDir, enabled: false }))

    expect(await exists(join(skillDir, 'SKILL.md'))).toBe(true)
    expect(await exists(join(skillDir, 'SKILL.md.disabled'))).toBe(false)
  })

  it('enables skill via symlink by modifying the target', async () => {
    const targetDir = join(tmpDir, 'real-skill')
    await mkdir(targetDir)
    await writeFile(join(targetDir, 'SKILL.md.disabled'), '# skill')
    const linkPath = join(tmpDir, 'linked-skill')
    await symlink(targetDir, linkPath)

    await enableSkill(makeSkill({ path: linkPath, enabled: false, isSymlink: true }))

    expect(await exists(join(targetDir, 'SKILL.md'))).toBe(true)
    expect(await exists(join(targetDir, 'SKILL.md.disabled'))).toBe(false)
  })
})

describe('disableSkill', () => {
  let tmpDir: string
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), 'act-test-')) })
  afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }) })

  it('renames SKILL.md to SKILL.md.disabled', async () => {
    const skillDir = join(tmpDir, 'my-skill')
    await mkdir(skillDir)
    await writeFile(join(skillDir, 'SKILL.md'), '# skill')

    await disableSkill(makeSkill({ path: skillDir, enabled: true }))

    expect(await exists(join(skillDir, 'SKILL.md.disabled'))).toBe(true)
    expect(await exists(join(skillDir, 'SKILL.md'))).toBe(false)
  })
})

describe('deleteSkill', () => {
  let tmpDir: string
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), 'act-test-')) })
  afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }) })

  it('removes the entire directory for a standalone skill', async () => {
    const skillDir = join(tmpDir, 'my-skill')
    await mkdir(skillDir)
    await writeFile(join(skillDir, 'SKILL.md'), '# skill')
    await writeFile(join(skillDir, 'README.md'), '# readme')

    await deleteSkill(makeSkill({ path: skillDir }))

    expect(await exists(skillDir)).toBe(false)
  })

  it('removes only SKILL.md for a plugin sub-skill', async () => {
    const pluginDir = join(tmpDir, 'pua')
    const skillDir = join(pluginDir, 'mama')
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), '# mama')
    await writeFile(join(skillDir, 'README.md'), '# readme')

    await deleteSkill(makeSkill({
      id: 'user:pua/mama',
      name: 'pua/mama',
      pluginName: 'pua',
      path: skillDir,
    }))

    expect(await exists(skillDir)).toBe(true)             // dir still exists
    expect(await exists(join(skillDir, 'SKILL.md'))).toBe(false)  // SKILL.md gone
    expect(await exists(join(skillDir, 'README.md'))).toBe(true)  // other files intact
  })

  it('removes disabled SKILL.md for a plugin sub-skill', async () => {
    const skillDir = join(tmpDir, 'pua', 'mama')
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md.disabled'), '# mama')

    await deleteSkill(makeSkill({
      name: 'pua/mama',
      pluginName: 'pua',
      path: skillDir,
      enabled: false,
    }))

    expect(await exists(join(skillDir, 'SKILL.md.disabled'))).toBe(false)
  })

  it('removes symlink but not the target directory', async () => {
    const targetDir = join(tmpDir, 'real-skill')
    await mkdir(targetDir)
    await writeFile(join(targetDir, 'SKILL.md'), '# skill')
    const linkPath = join(tmpDir, 'linked-skill')
    await symlink(targetDir, linkPath)

    await deleteSkill(makeSkill({ path: linkPath, isSymlink: true }))

    expect(await exists(linkPath)).toBe(false)                    // symlink gone
    expect(await exists(join(targetDir, 'SKILL.md'))).toBe(true) // target intact
  })
})
