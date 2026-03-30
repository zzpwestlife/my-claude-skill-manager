import express from 'express'
import { scanSkills } from '../../src/lib/scanner.js'
import { enableSkill, disableSkill, deleteSkill } from '../../src/lib/actions.js'
import { scanMcps } from '../../src/lib/mcpScanner.js'
import { enableMcp, disableMcp, deleteMcp } from '../../src/lib/mcpActions.js'
import { scanHooks } from '../../src/lib/hookScanner.js'
import { enableHook, disableHook, deleteHook } from '../../src/lib/hookActions.js'

export function createApp(
  userSkillsDir: string,
  projectSkillsDir: string | null,
  projectRoot?: string,
  pluginsDir?: string,
  userMcpFile?: string,
  projectMcpFile?: string | null,
  userSettingsFiles?: string[],
  projectSettingsFiles?: string[],
) {
  const app = express()

  app.use(express.json())

  app.get('/api/config', (_req, res) => {
    res.json({ projectRoot: projectRoot ?? null, projectSkillsDir })
  })

  app.get('/api/skills', async (_req, res) => {
    try {
      const skills = await scanSkills(userSkillsDir, projectSkillsDir, pluginsDir)
      res.json(skills)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.patch('/api/skills/:id/enable', async (req, res) => {
    // Express auto-decodes req.params.id: "user%3Apua%2Fmama" → "user:pua/mama"
    const id = req.params.id
    try {
      const skills = await scanSkills(userSkillsDir, projectSkillsDir, pluginsDir)
      const skill = skills.find(s => s.id === id)
      if (!skill) {
        res.status(404).json({ error: `Skill not found: ${id}` })
        return
      }
      await enableSkill(skill)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.patch('/api/skills/:id/disable', async (req, res) => {
    const id = req.params.id
    try {
      const skills = await scanSkills(userSkillsDir, projectSkillsDir, pluginsDir)
      const skill = skills.find(s => s.id === id)
      if (!skill) {
        res.status(404).json({ error: `Skill not found: ${id}` })
        return
      }
      await disableSkill(skill)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.delete('/api/skills/:id', async (req, res) => {
    const id = req.params.id
    try {
      const skills = await scanSkills(userSkillsDir, projectSkillsDir, pluginsDir)
      const skill = skills.find(s => s.id === id)
      if (!skill) {
        res.status(404).json({ error: `Skill not found: ${id}` })
        return
      }
      if (skill.scope === 'plugin') {
        res.status(403).json({ error: 'Plugin skills cannot be deleted here. Use the plugin manager to uninstall the plugin.' })
        return
      }
      await deleteSkill(skill)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // ── MCP routes ─────────────────────────────────────────────────────────────

  app.get('/api/mcps', async (_req, res) => {
    if (!userMcpFile) { res.json([]); return }
    try {
      const mcps = await scanMcps(userMcpFile, projectMcpFile ?? null)
      res.json(mcps)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.patch('/api/mcps/:id/enable', async (req, res) => {
    if (!userMcpFile) { res.status(404).json({ error: 'No MCP config' }); return }
    const id = req.params.id
    try {
      const mcps = await scanMcps(userMcpFile, projectMcpFile ?? null)
      const mcp = mcps.find(m => m.id === id)
      if (!mcp) { res.status(404).json({ error: `MCP server not found: ${id}` }); return }
      if (mcp.enabled) {
        res.status(409).json({ error: `MCP server "${mcp.name}" is already enabled` })
        return
      }
      await enableMcp(mcp)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.patch('/api/mcps/:id/disable', async (req, res) => {
    if (!userMcpFile) { res.status(404).json({ error: 'No MCP config' }); return }
    const id = req.params.id
    try {
      const mcps = await scanMcps(userMcpFile, projectMcpFile ?? null)
      const mcp = mcps.find(m => m.id === id)
      if (!mcp) { res.status(404).json({ error: `MCP server not found: ${id}` }); return }
      if (!mcp.enabled) {
        res.status(409).json({ error: `MCP server "${mcp.name}" is already disabled` })
        return
      }
      await disableMcp(mcp)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.delete('/api/mcps/:id', async (req, res) => {
    if (!userMcpFile) { res.status(404).json({ error: 'No MCP config' }); return }
    const id = req.params.id
    try {
      const mcps = await scanMcps(userMcpFile, projectMcpFile ?? null)
      const mcp = mcps.find(m => m.id === id)
      if (!mcp) { res.status(404).json({ error: `MCP server not found: ${id}` }); return }
      await deleteMcp(mcp)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // ── Hook routes ─────────────────────────────────────────────────────────────

  app.get('/api/hooks', async (_req, res) => {
    if (!userSettingsFiles?.length) { res.json([]); return }
    try {
      const hooks = await scanHooks(userSettingsFiles ?? [], projectSettingsFiles ?? [])
      res.json(hooks)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.patch('/api/hooks/:id/enable', async (req, res) => {
    if (!userSettingsFiles?.length) { res.status(404).json({ error: 'No settings file' }); return }
    const id = req.params.id
    try {
      const hooks = await scanHooks(userSettingsFiles ?? [], projectSettingsFiles ?? [])
      const hook = hooks.find(h => h.id === id)
      if (!hook) { res.status(404).json({ error: `Hook not found: ${id}` }); return }
      if (hook.enabled) {
        res.status(409).json({ error: 'Hook is already enabled' })
        return
      }
      await enableHook(hook)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.patch('/api/hooks/:id/disable', async (req, res) => {
    if (!userSettingsFiles?.length) { res.status(404).json({ error: 'No settings file' }); return }
    const id = req.params.id
    try {
      const hooks = await scanHooks(userSettingsFiles ?? [], projectSettingsFiles ?? [])
      const hook = hooks.find(h => h.id === id)
      if (!hook) { res.status(404).json({ error: `Hook not found: ${id}` }); return }
      if (!hook.enabled) {
        res.status(409).json({ error: 'Hook is already disabled' })
        return
      }
      await disableHook(hook)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.delete('/api/hooks/:id', async (req, res) => {
    if (!userSettingsFiles?.length) { res.status(404).json({ error: 'No settings file' }); return }
    const id = req.params.id
    try {
      const hooks = await scanHooks(userSettingsFiles ?? [], projectSettingsFiles ?? [])
      const hook = hooks.find(h => h.id === id)
      if (!hook) { res.status(404).json({ error: `Hook not found: ${id}` }); return }
      await deleteHook(hook)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  return app
}
