import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import type { Hook, HookScope, SettingsJson } from './hookTypes.js'

async function readSettingsJson(filePath: string): Promise<SettingsJson | null> {
  try {
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as SettingsJson
  } catch {
    return null
  }
}

function fileKey(filePath: string): string {
  // e.g. "settings.json" → "settings", "ft-settings.json" → "ft-settings"
  return basename(filePath).replace(/\.json$/, '')
}

function parseHooks(json: SettingsJson, scope: HookScope, configFile: string): Hook[] {
  const hooks: Hook[] = []
  const hooksObj = json.hooks ?? {}
  const fk = fileKey(configFile)

  for (const [eventName, matchers] of Object.entries(hooksObj)) {
    if (!Array.isArray(matchers)) continue

    matchers.forEach((matcherEntry, matcherIndex) => {
      const matcher = matcherEntry.matcher ?? ''
      const hookEntries = matcherEntry.hooks ?? []

      hookEntries.forEach((hookEntry, hookIndex) => {
        hooks.push({
          id: `${scope}:${fk}:${eventName}:${matcherIndex}:${hookIndex}`,
          scope,
          event: eventName,
          matcher,
          command: hookEntry.command,
          enabled: hookEntry.disabled !== true,
          configFile,
          matcherIndex,
          hookIndex,
        })
      })
    })
  }

  return hooks
}

export async function scanHooks(
  userFiles: string[],
  projectFiles: string[],
): Promise<Hook[]> {
  const results: Hook[] = []

  for (const f of userFiles) {
    const json = await readSettingsJson(f)
    if (json) results.push(...parseHooks(json, 'user', f))
  }

  for (const f of projectFiles) {
    const json = await readSettingsJson(f)
    if (json) results.push(...parseHooks(json, 'project', f))
  }

  return results
}
