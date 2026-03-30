export type SkillScope = 'user' | 'project'

export type Skill = {
  id: string           // unique key e.g. "user:pua/mama"
  name: string         // display name e.g. "pua/mama" or "web-access"
  pluginName?: string  // set when skill lives inside a plugin folder e.g. "pua"
  scope: SkillScope
  enabled: boolean     // true = SKILL.md exists, false = SKILL.md.disabled exists
  path: string         // absolute path to the skill directory
  isSymlink: boolean   // true if the ~/.claude/skills/ entry is a symlink
}
