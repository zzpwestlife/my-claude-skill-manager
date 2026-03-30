import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import open from 'open'
import express from 'express'
import { createApp } from './app.js'

const PORT = parseInt(process.env.PORT ?? '3000', 10)

const userSkillsDir = join(homedir(), '.claude', 'skills')
const projectSkillsDir = join(process.cwd(), '.claude', 'skills')

const app = createApp(userSkillsDir, projectSkillsDir)

// Serve built frontend in production (when dist/web/ exists)
const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '../../dist/web')

if (existsSync(distDir)) {
  app.use(express.static(distDir))
  // SPA fallback: serve index.html for any non-API route
  app.get('*', (_req, res) => {
    res.sendFile(join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`
  console.log(`Skill Manager running at ${url}`)
  // Only auto-open when running as main web server (not as API-only in dev mode)
  if (!process.env.PORT) {
    void open(url)
  }
})
