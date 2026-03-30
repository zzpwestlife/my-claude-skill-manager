import { readdir, stat, realpath } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join } from 'node:path'
import type { Skill, SkillScope } from './types.js'

async function pathExists(p: string): Promise<boolean> {
  try { await stat(p); return true } catch { return false }
}

async function isDirectory(p: string): Promise<boolean> {
  try { return (await stat(p)).isDirectory() } catch { return false }
}

async function getEnabledState(dir: string): Promise<boolean | null> {
  if (await pathExists(join(dir, 'SKILL.md'))) return true
  if (await pathExists(join(dir, 'SKILL.md.disabled'))) return false
  return null
}

async function scanDirectory(dir: string, scope: SkillScope): Promise<Skill[]> {
  let entries: Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const skills: Skill[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue

    const entryPath = join(dir, entry.name)
    const isSymlink = entry.isSymbolicLink()

    let realDir: string
    try {
      realDir = isSymlink ? await realpath(entryPath) : entryPath
    } catch {
      continue // broken symlink
    }

    if (!(await isDirectory(realDir))) continue

    const enabledState = await getEnabledState(realDir)

    if (enabledState !== null) {
      // Standalone skill
      skills.push({
        id: `${scope}:${entry.name}`,
        name: entry.name,
        scope,
        enabled: enabledState,
        path: entryPath,
        isSymlink,
      })
    } else {
      // Check if it's a plugin folder with child skills
      let children: Dirent[]
      try {
        children = await readdir(realDir, { withFileTypes: true })
      } catch {
        continue
      }

      for (const child of children) {
        if (!child.isDirectory()) continue
        const childPath = join(entryPath, child.name)
        const childState = await getEnabledState(childPath)
        if (childState !== null) {
          const skillName = `${entry.name}/${child.name}`
          skills.push({
            id: `${scope}:${skillName}`,
            name: skillName,
            pluginName: entry.name,
            scope,
            enabled: childState,
            path: childPath,
            isSymlink: false,
          })
        }
      }
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name))
}

export async function scanSkills(
  userDir: string,
  projectDir: string | null
): Promise<Skill[]> {
  const userSkills = await scanDirectory(userDir, 'user')
  const projectSkills = projectDir ? await scanDirectory(projectDir, 'project') : []
  return [...userSkills, ...projectSkills]
}
