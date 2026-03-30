import express from 'express'
import { scanSkills } from '../../src/lib/scanner.js'
import { enableSkill, disableSkill, deleteSkill } from '../../src/lib/actions.js'

export function createApp(
  userSkillsDir: string,
  projectSkillsDir: string | null,
) {
  const app = express()

  app.use(express.json())

  app.get('/api/skills', async (_req, res) => {
    try {
      const skills = await scanSkills(userSkillsDir, projectSkillsDir)
      res.json(skills)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  app.patch('/api/skills/:id/enable', async (req, res) => {
    // Express auto-decodes req.params.id: "user%3Apua%2Fmama" → "user:pua/mama"
    const id = req.params.id
    try {
      const skills = await scanSkills(userSkillsDir, projectSkillsDir)
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
      const skills = await scanSkills(userSkillsDir, projectSkillsDir)
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
      const skills = await scanSkills(userSkillsDir, projectSkillsDir)
      const skill = skills.find(s => s.id === id)
      if (!skill) {
        res.status(404).json({ error: `Skill not found: ${id}` })
        return
      }
      await deleteSkill(skill)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  return app
}
