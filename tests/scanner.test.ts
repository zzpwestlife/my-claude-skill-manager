import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { scanSkills } from '../src/lib/scanner.js'

describe('scanSkills', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'skill-manager-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('returns empty array for empty directory', async () => {
    const skills = await scanSkills(tmpDir, null)
    expect(skills).toEqual([])
  })

  it('returns empty array for nonexistent directory', async () => {
    const skills = await scanSkills('/nonexistent/path/xyz', null)
    expect(skills).toEqual([])
  })

  it('discovers a standalone enabled skill', async () => {
    await mkdir(join(tmpDir, 'my-skill'))
    await writeFile(join(tmpDir, 'my-skill', 'SKILL.md'), '# My Skill')

    const skills = await scanSkills(tmpDir, null)

    expect(skills).toHaveLength(1)
    expect(skills[0]).toMatchObject({
      id: 'user:my-skill',
      name: 'my-skill',
      scope: 'user',
      enabled: true,
      isSymlink: false,
    })
    expect(skills[0].path).toBe(join(tmpDir, 'my-skill'))
  })

  it('discovers a standalone disabled skill', async () => {
    await mkdir(join(tmpDir, 'my-skill'))
    await writeFile(join(tmpDir, 'my-skill', 'SKILL.md.disabled'), '# My Skill')

    const skills = await scanSkills(tmpDir, null)

    expect(skills).toHaveLength(1)
    expect(skills[0].enabled).toBe(false)
    expect(skills[0].name).toBe('my-skill')
  })

  it('discovers plugin skills with correct names', async () => {
    await mkdir(join(tmpDir, 'pua', 'mama'), { recursive: true })
    await mkdir(join(tmpDir, 'pua', 'pua'))
    await writeFile(join(tmpDir, 'pua', 'mama', 'SKILL.md'), '# mama')
    await writeFile(join(tmpDir, 'pua', 'pua', 'SKILL.md'), '# pua')

    const skills = await scanSkills(tmpDir, null)

    expect(skills).toHaveLength(2)
    const names = skills.map(s => s.name).sort()
    expect(names).toEqual(['pua/mama', 'pua/pua'])
    expect(skills.find(s => s.name === 'pua/mama')?.pluginName).toBe('pua')
    expect(skills.find(s => s.name === 'pua/pua')?.pluginName).toBe('pua')
  })

  it('marks plugin skills as enabled based on SKILL.md presence', async () => {
    await mkdir(join(tmpDir, 'pua', 'mama'), { recursive: true })
    await writeFile(join(tmpDir, 'pua', 'mama', 'SKILL.md.disabled'), '# mama')

    const skills = await scanSkills(tmpDir, null)

    expect(skills[0].enabled).toBe(false)
  })

  it('ignores directories with no SKILL.md files anywhere', async () => {
    await mkdir(join(tmpDir, 'empty-dir'))
    await writeFile(join(tmpDir, 'empty-dir', 'README.md'), '# not a skill')

    const skills = await scanSkills(tmpDir, null)

    expect(skills).toEqual([])
  })

  it('discovers project skills with project scope', async () => {
    const projectDir = await mkdtemp(join(tmpdir(), 'proj-test-'))
    try {
      await mkdir(join(tmpDir, 'user-skill'))
      await writeFile(join(tmpDir, 'user-skill', 'SKILL.md'), '# User')
      await mkdir(join(projectDir, 'proj-skill'))
      await writeFile(join(projectDir, 'proj-skill', 'SKILL.md'), '# Project')

      const skills = await scanSkills(tmpDir, projectDir)

      expect(skills.filter(s => s.scope === 'user')).toHaveLength(1)
      expect(skills.filter(s => s.scope === 'project')).toHaveLength(1)
      expect(skills.find(s => s.scope === 'project')?.id).toBe('project:proj-skill')
    } finally {
      await rm(projectDir, { recursive: true, force: true })
    }
  })

  it('detects symlinked skill entries', async () => {
    const targetDir = join(tmpDir, 'real-skill')
    await mkdir(targetDir)
    await writeFile(join(targetDir, 'SKILL.md'), '# Real')

    const skillsDir = join(tmpDir, 'skills')
    await mkdir(skillsDir)
    await symlink(targetDir, join(skillsDir, 'linked-skill'))

    const skills = await scanSkills(skillsDir, null)

    expect(skills).toHaveLength(1)
    expect(skills[0].isSymlink).toBe(true)
    expect(skills[0].enabled).toBe(true)
  })

  it('uses symlink path (not realpath) for plugin sub-skills under a symlinked folder', async () => {
    const targetDir = join(tmpDir, 'real-plugin')
    await mkdir(join(targetDir, 'sub-skill'), { recursive: true })
    await writeFile(join(targetDir, 'sub-skill', 'SKILL.md'), '# sub')

    const skillsDir = join(tmpDir, 'skills')
    await mkdir(skillsDir)
    const linkPath = join(skillsDir, 'linked-plugin')
    await symlink(targetDir, linkPath)

    const skills = await scanSkills(skillsDir, null)

    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe('linked-plugin/sub-skill')
    expect(skills[0].path).toBe(join(linkPath, 'sub-skill'))  // symlink path, not realpath
  })

  it('returns skills sorted by name within each scope', async () => {
    await mkdir(join(tmpDir, 'z-skill'))
    await mkdir(join(tmpDir, 'a-skill'))
    await writeFile(join(tmpDir, 'z-skill', 'SKILL.md'), '# Z')
    await writeFile(join(tmpDir, 'a-skill', 'SKILL.md'), '# A')

    const skills = await scanSkills(tmpDir, null)

    expect(skills[0].name).toBe('a-skill')
    expect(skills[1].name).toBe('z-skill')
  })
})
