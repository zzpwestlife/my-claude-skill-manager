export type HookScope = 'user' | 'project'

export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Stop'
  | 'Notification'
  | 'UserPromptSubmit'
  | 'SubagentStop'

export interface Hook {
  id: string            // "user:PreToolUse:0:0" (scope:event:matcherIdx:hookIdx)
  scope: HookScope
  event: string         // HookEvent or unknown future events
  matcher: string       // e.g. "Bash", "Edit", "" means any tool
  command: string
  enabled: boolean      // false when hook entry has disabled: true
  configFile: string    // absolute path to settings.json
  matcherIndex: number  // index in the event's array
  hookIndex: number     // index in the matcher's hooks array
}

export interface SettingsHookEntry {
  type?: string
  command: string
  disabled?: boolean
  [key: string]: unknown
}

export interface SettingsHookMatcher {
  matcher?: string
  hooks: SettingsHookEntry[]
}

export interface SettingsJson {
  hooks?: Record<string, SettingsHookMatcher[]>
  [key: string]: unknown
}
