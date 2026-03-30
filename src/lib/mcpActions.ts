import { readFile, writeFile } from 'node:fs/promises'
import type { McpServer, McpJson, McpServerConfig } from './mcpTypes.js'

async function readMcpJson(filePath: string): Promise<McpJson> {
  try {
    return JSON.parse(await readFile(filePath, 'utf-8')) as McpJson
  } catch {
    return {}
  }
}

async function writeMcpJson(filePath: string, json: McpJson): Promise<void> {
  await writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8')
}

export async function enableMcp(server: McpServer): Promise<void> {
  const json = await readMcpJson(server.configFile)
  const disabled = json._disabledMcpServers ?? {}
  const cfg = disabled[server.name] as McpServerConfig | undefined
  if (!cfg) return
  delete disabled[server.name]
  json._disabledMcpServers = disabled
  json.mcpServers = { ...(json.mcpServers ?? {}), [server.name]: cfg }
  await writeMcpJson(server.configFile, json)
}

export async function disableMcp(server: McpServer): Promise<void> {
  const json = await readMcpJson(server.configFile)
  const enabled = json.mcpServers ?? {}
  const cfg = enabled[server.name] as McpServerConfig | undefined
  if (!cfg) return
  delete enabled[server.name]
  json.mcpServers = enabled
  json._disabledMcpServers = { ...(json._disabledMcpServers ?? {}), [server.name]: cfg }
  await writeMcpJson(server.configFile, json)
}

export async function deleteMcp(server: McpServer): Promise<void> {
  const json = await readMcpJson(server.configFile)
  if (json.mcpServers) delete json.mcpServers[server.name]
  if (json._disabledMcpServers) delete json._disabledMcpServers[server.name]
  await writeMcpJson(server.configFile, json)
}
