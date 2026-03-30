import { rename, rm, unlink, realpath } from 'node:fs/promises'
import { join } from 'node:path'
import type { Skill } from './types.js'

async function resolveDir(skill: Skill): Promise<string> {
  return skill.isSymlink ? await realpath(skill.path) : skill.path
}

export async function enableSkill(skill: Skill): Promise<void> {
  const dir = await resolveDir(skill)
  await rename(join(dir, 'SKILL.md.disabled'), join(dir, 'SKILL.md'))
}

export async function disableSkill(skill: Skill): Promise<void> {
  const dir = await resolveDir(skill)
  await rename(join(dir, 'SKILL.md'), join(dir, 'SKILL.md.disabled'))
}

export async function deleteSkill(skill: Skill): Promise<void> {
  if (skill.isSymlink) {
    await unlink(skill.path)
    return
  }

  if (skill.pluginName) {
    // Only remove the SKILL.md (or its disabled variant); leave dir and other files
    try { await unlink(join(skill.path, 'SKILL.md')) } catch { /* not present */ }
    try { await unlink(join(skill.path, 'SKILL.md.disabled')) } catch { /* not present */ }
    return
  }

  await rm(skill.path, { recursive: true, force: true })
}
