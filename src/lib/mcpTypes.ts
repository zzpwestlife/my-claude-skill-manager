export type McpScope = 'user' | 'project'

export interface McpServerConfig {
  command?: string
  args?: string[]
  env?: Record<string, string>
  type?: string
  url?: string
}

export interface McpServer {
  id: string           // e.g. "user:filesystem"
  name: string         // key in mcpServers object
  scope: McpScope
  enabled: boolean     // true = in mcpServers, false = in _disabledMcpServers
  command?: string
  args?: string[]
  env?: Record<string, string>
  type?: string
  url?: string
  configFile: string   // absolute path to mcp.json
}

export interface McpJson {
  mcpServers?: Record<string, McpServerConfig>
  _disabledMcpServers?: Record<string, McpServerConfig>
  [key: string]: unknown
}
