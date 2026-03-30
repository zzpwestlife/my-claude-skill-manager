import { readdir, readFile, stat, realpath } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { join } from 'node:path'
import type { Skill, SkillScope } from './types.js'

interface InstalledPlugin {
  installPath: string
}

interface InstalledPluginsJson {
  plugins: Record<string, InstalledPlugin[]>
}

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
    if (val.startsWith('|') || val.startsWith('>')) {
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

// Recursively find all directories named `skillName` that contain a SKILL.md or SKILL.md.disabled
async function findSkillPathsByName(dir: string, skillName: string, depth = 0): Promise<string[]> {
  if (depth > 8) return []
  let entries: Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const found: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const entryPath = join(dir, entry.name)
    if (entry.name === skillName) {
      if (await getEnabledState(entryPath) !== null) found.push(entryPath)
      // don't recurse into skill dirs
    } else {
      found.push(...await findSkillPathsByName(entryPath, skillName, depth + 1))
    }
  }
  return found
}

async function scanPluginSkills(pluginsDir: string): Promise<Skill[]> {
  const jsonPath = join(pluginsDir, 'installed_plugins.json')
  let json: InstalledPluginsJson
  try {
    json = JSON.parse(await readFile(jsonPath, 'utf-8')) as InstalledPluginsJson
  } catch {
    return []
  }

  const skills: Skill[] = []

  for (const [pluginKey, installs] of Object.entries(json.plugins)) {
    if (!installs || installs.length === 0) continue
    const installPath = installs[0].installPath
    const pluginId = pluginKey.split('@')[0]
    // marketplaceId is the part after '@', e.g. "pua-skills" from "pua@pua-skills"
    const marketplaceId = pluginKey.includes('@') ? pluginKey.split('@')[1] : null

    // Gather all copies of a named skill from marketplaces/, top-level dirs, and variants/
    const gatherExtraPaths = async (skillName: string, primaryPath: string): Promise<string[]> => {
      const extra: string[] = []
      const seen = new Set<string>([primaryPath])

      const addIfSkill = async (dir: string) => {
        if (seen.has(dir)) return
        seen.add(dir)
        if (await getEnabledState(dir) !== null) extra.push(dir)
      }

      const addVariants = async (parentDir: string) => {
        let varEntries: Dirent[]
        try { varEntries = await readdir(join(parentDir, 'variants'), { withFileTypes: true }) }
        catch { return }
        for (const e of varEntries) {
          if (e.isDirectory()) await addIfSkill(join(parentDir, 'variants', e.name))
        }
      }

      if (marketplaceId) {
        const mktDir = join(pluginsDir, 'marketplaces', marketplaceId)
        // Named copies in marketplace (e.g. marketplaces/pua-skills/skills/pua-en/)
        for (const p of await findSkillPathsByName(mktDir, skillName)) await addIfSkill(p)
        // Marketplace root may itself be a skill dir (e.g. marketplaces/last30days-skill/SKILL.md)
        await addIfSkill(mktDir)
        // Marketplace variants/ (e.g. marketplaces/last30days-skill/variants/open/)
        await addVariants(mktDir)
      }

      // Top-level plugin dir (e.g. ~/.claude/plugins/pua/)
      const topLevelDir = join(pluginsDir, pluginId)
      if (topLevelDir !== installPath) {
        for (const p of await findSkillPathsByName(topLevelDir, skillName)) await addIfSkill(p)
      }

      // Cache variants/ (e.g. cache/.../2.9.5/variants/open/)
      await addVariants(installPath)

      return extra
    }

    const addSkill = async (id: string, name: string, primaryPath: string): Promise<void> => {
      const primaryState = await getEnabledState(primaryPath)
      if (primaryState === null) return
      const description = await readSkillDescription(primaryPath)
      const extraPaths = await gatherExtraPaths(name, primaryPath)
      // enabled = true if the primary copy OR any extra copy has an active SKILL.md
      let enabled = primaryState
      if (!enabled) {
        for (const ep of extraPaths) {
          if (await getEnabledState(ep) === true) { enabled = true; break }
        }
      }
      skills.push({
        id,
        name,
        pluginName: pluginId,
        scope: 'plugin',
        enabled,
        path: primaryPath,
        extraPaths: extraPaths.length > 0 ? extraPaths : undefined,
        isSymlink: false,
        description,
      })
    }

    // Case 2: check skills/ subdirectory first — preferred over root SKILL.md
    let subSkillsFound = false
    let entries: Dirent[]
    try {
      entries = await readdir(join(installPath, 'skills'), { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        await addSkill(`plugin:${pluginId}/${entry.name}`, entry.name, join(installPath, 'skills', entry.name))
        subSkillsFound = true
      }
    } catch {
      // no skills/ subdirectory
    }

    // Case 1: root install path is itself a skill — only when no skills/ sub-skills exist
    if (!subSkillsFound) {
      await addSkill(`plugin:${pluginId}`, pluginId, installPath)
    }
  }

  return skills.sort((a, b) => {
    const byPlugin = (a.pluginName ?? '').localeCompare(b.pluginName ?? '')
    return byPlugin !== 0 ? byPlugin : a.name.localeCompare(b.name)
  })
}

export async function scanSkills(
  userDir: string,
  projectDir: string | null,
  pluginsDir?: string,
): Promise<Skill[]> {
  const userSkills = await scanDirectory(userDir, 'user')
  const projectSkills = projectDir ? await scanDirectory(projectDir, 'project') : []
  const pluginSkills = pluginsDir ? await scanPluginSkills(pluginsDir) : []
  return [...userSkills, ...projectSkills, ...pluginSkills]
}
