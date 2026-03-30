import { readdir, readFile, stat, realpath } from 'node:fs/promises'
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

async function readSkillDescription(dir: string): Promise<string | undefined> {
  let content: string
  try {
    content = await readFile(join(dir, 'SKILL.md'), 'utf-8')
  } catch {
    try {
      content = await readFile(join(dir, 'SKILL.md.disabled'), 'utf-8')
    } catch {
      return undefined
    }
  }

  // Extract YAML frontmatter between first --- pair
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) return undefined
  const lines = fmMatch[1].split('\n')

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^description:\s*(.*)$/)
    if (!m) continue
    const val = m[1].trim()
    if (val === '|' || val === '>') {
      // Block scalar: return first non-empty indented line
      for (let j = i + 1; j < lines.length; j++) {
        const trimmed = lines[j].trim()
        if (trimmed) return trimmed
      }
      return undefined
    }
    return val || undefined
  }
  return undefined
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
      const description = await readSkillDescription(realDir)
      skills.push({
        id: `${scope}:${entry.name}`,
        name: entry.name,
        scope,
        enabled: enabledState,
        path: entryPath,
        isSymlink,
        description,
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
          const description = await readSkillDescription(childPath)
          skills.push({
            id: `${scope}:${skillName}`,
            name: skillName,
            pluginName: entry.name,
            scope,
            enabled: childState,
            path: childPath,
            isSymlink: false,
            description,
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
