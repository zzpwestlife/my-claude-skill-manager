export type SkillScope = 'user' | 'project' | 'plugin'

export type Skill = {
  id: string           // unique key e.g. "user:pua/mama"
  name: string         // display name e.g. "pua/mama" or "web-access"
  pluginName?: string  // set when skill lives inside a plugin folder e.g. "pua"
  scope: SkillScope
  enabled: boolean     // true = SKILL.md exists, false = SKILL.md.disabled exists
  path: string         // absolute path to the skill directory (primary / cache copy)
  extraPaths?: string[] // additional copies (marketplaces, top-level) that must stay in sync
  isSymlink: boolean   // true if the ~/.claude/skills/ entry is a symlink
  description?: string // first line of SKILL.md frontmatter description, if present
}
