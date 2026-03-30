import type { Skill } from '../../src/lib/types.js'

export type { Skill }

async function apiFetch(method: string, path: string): Promise<Response> {
  const res = await fetch(path, { method })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res
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
