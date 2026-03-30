import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import open from 'open'
import express from 'express'
import { createApp } from './app.js'

const PORT = parseInt(process.env.PORT ?? '3000', 10)

// Accept optional project directory as first CLI argument:
//   skill-manager /path/to/my-project
// Falls back to cwd if not provided.
const projectArg = process.argv[2]
const projectRoot = projectArg ? resolve(projectArg) : process.cwd()

const userSkillsDir = join(homedir(), '.claude', 'skills')
const projectSkillsDir = join(projectRoot, '.claude', 'skills')
const pluginsDir = join(homedir(), '.claude', 'plugins')

const app = createApp(userSkillsDir, projectSkillsDir, projectRoot, pluginsDir)

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
  console.log(`  User skills:    ${userSkillsDir}`)
  console.log(`  Project root:   ${projectRoot}${existsSync(projectSkillsDir) ? '' : '  (no .claude/skills found)'}`)
  // Only auto-open when running as main web server (not as API-only in dev mode)
  if (!process.env.PORT) {
    void open(url)
  }
})
