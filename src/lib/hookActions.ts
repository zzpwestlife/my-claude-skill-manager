import { readFile, writeFile } from 'node:fs/promises'
import type { Hook, SettingsJson, SettingsHookEntry } from './hookTypes.js'

async function readSettingsJson(filePath: string): Promise<SettingsJson> {
  try {
    return JSON.parse(await readFile(filePath, 'utf-8')) as SettingsJson
  } catch {
    return {}
  }
}

async function writeSettingsJson(filePath: string, json: SettingsJson): Promise<void> {
  await writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8')
}

function getEntry(json: SettingsJson, hook: Hook): SettingsHookEntry | undefined {
  return json.hooks?.[hook.event]?.[hook.matcherIndex]?.hooks?.[hook.hookIndex]
}

export async function enableHook(hook: Hook): Promise<void> {
  const json = await readSettingsJson(hook.configFile)
  const entry = getEntry(json, hook)
  if (!entry) return
  delete entry.disabled
  await writeSettingsJson(hook.configFile, json)
}

export async function disableHook(hook: Hook): Promise<void> {
  const json = await readSettingsJson(hook.configFile)
  const entry = getEntry(json, hook)
  if (!entry) return
  entry.disabled = true
  await writeSettingsJson(hook.configFile, json)
}

export async function deleteHook(hook: Hook): Promise<void> {
  const json = await readSettingsJson(hook.configFile)
  const matchers = json.hooks?.[hook.event]
  if (!matchers) return

  const matcherEntry = matchers[hook.matcherIndex]
  if (!matcherEntry) return

  matcherEntry.hooks.splice(hook.hookIndex, 1)

  if (matcherEntry.hooks.length === 0) {
    matchers.splice(hook.matcherIndex, 1)
  }

  if (matchers.length === 0) {
    delete json.hooks![hook.event]
  }

  await writeSettingsJson(hook.configFile, json)
}
