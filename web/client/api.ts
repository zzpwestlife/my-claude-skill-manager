import type { Skill } from '../../src/lib/types.js'
import type { McpServer } from '../../src/lib/mcpTypes.js'

export type { Skill }
export type { McpServer }

async function apiFetch(method: string, path: string): Promise<Response> {
  const res = await fetch(path, { method })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res
}

export interface Config {
  projectRoot: string | null
  projectSkillsDir: string | null
}

export async function fetchConfig(): Promise<Config> {
  const res = await apiFetch('GET', '/api/config')
  return res.json() as Promise<Config>
}

export async function fetchSkills(): Promise<Skill[]> {
  const res = await apiFetch('GET', '/api/skills')
  return res.json() as Promise<Skill[]>
}

export async function enableSkill(id: string): Promise<void> {
  await apiFetch('PATCH', `/api/skills/${encodeURIComponent(id)}/enable`)
}

export async function disableSkill(id: string): Promise<void> {
  await apiFetch('PATCH', `/api/skills/${encodeURIComponent(id)}/disable`)
}

export async function deleteSkill(id: string): Promise<void> {
  await apiFetch('DELETE', `/api/skills/${encodeURIComponent(id)}`)
}

export async function fetchMcps(): Promise<McpServer[]> {
  const res = await apiFetch('GET', '/api/mcps')
  return res.json() as Promise<McpServer[]>
}

export async function enableMcp(id: string): Promise<void> {
  await apiFetch('PATCH', `/api/mcps/${encodeURIComponent(id)}/enable`)
}

export async function disableMcp(id: string): Promise<void> {
  await apiFetch('PATCH', `/api/mcps/${encodeURIComponent(id)}/disable`)
}

export async function deleteMcp(id: string): Promise<void> {
  await apiFetch('DELETE', `/api/mcps/${encodeURIComponent(id)}`)
}
