import { readFile } from 'node:fs/promises'
import type { Hook, HookScope, SettingsJson } from './hookTypes.js'

async function readSettingsJson(filePath: string): Promise<SettingsJson | null> {
  try {
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as SettingsJson
  } catch {
    return null
  }
}

function parseHooks(json: SettingsJson, scope: HookScope, configFile: string): Hook[] {
  const hooks: Hook[] = []
  const hooksObj = json.hooks ?? {}

  for (const [eventName, matchers] of Object.entries(hooksObj)) {
    if (!Array.isArray(matchers)) continue

    matchers.forEach((matcherEntry, matcherIndex) => {
      const matcher = matcherEntry.matcher ?? ''
      const hookEntries = matcherEntry.hooks ?? []

      hookEntries.forEach((hookEntry, hookIndex) => {
        hooks.push({
          id: `${scope}:${eventName}:${matcherIndex}:${hookIndex}`,
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
  userFile: string,
  projectFile: string | null,
): Promise<Hook[]> {
  const results: Hook[] = []

  const userJson = await readSettingsJson(userFile)
  if (userJson) results.push(...parseHooks(userJson, 'user', userFile))

  if (projectFile) {
    const projectJson = await readSettingsJson(projectFile)
    if (projectJson) results.push(...parseHooks(projectJson, 'project', projectFile))
  }

  return results
}
