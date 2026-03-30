import { readFile } from 'node:fs/promises'
import type { McpServer, McpScope, McpJson, McpServerConfig } from './mcpTypes.js'

async function readMcpJson(filePath: string): Promise<McpJson | null> {
  try {
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as McpJson
  } catch {
    return null
  }
}

function parseServers(
  json: McpJson,
  scope: McpScope,
  configFile: string,
): McpServer[] {
  const enabledMap = json.mcpServers ?? {}
  const disabledMap = json._disabledMcpServers ?? {}

  const servers: McpServer[] = []

  // Add enabled servers
  for (const [name, cfg] of Object.entries(enabledMap)) {
    servers.push(configToServer(name, cfg, scope, true, configFile))
  }

  // Add disabled servers only if not already in enabled (dedup: enabled wins)
  for (const [name, cfg] of Object.entries(disabledMap)) {
    if (!(name in enabledMap)) {
      servers.push(configToServer(name, cfg, scope, false, configFile))
    }
  }

  return servers.sort((a, b) => a.name.localeCompare(b.name))
}

function configToServer(
  name: string,
  cfg: McpServerConfig,
  scope: McpScope,
  enabled: boolean,
  configFile: string,
): McpServer {
  return {
    id: `${scope}:${name}`,
    name,
    scope,
    enabled,
    command: cfg.command,
    args: cfg.args,
    env: cfg.env,
    type: cfg.type,
    url: cfg.url,
    configFile,
  }
}

export async function scanMcps(
  userFile: string,
  projectFile: string | null,
): Promise<McpServer[]> {
  const results: McpServer[] = []

  const userJson = await readMcpJson(userFile)
  if (userJson) results.push(...parseServers(userJson, 'user', userFile))

  if (projectFile) {
    const projectJson = await readMcpJson(projectFile)
    if (projectJson) results.push(...parseServers(projectJson, 'project', projectFile))
  }

  return results
}
