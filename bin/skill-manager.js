#!/usr/bin/env node
// Entrypoint for: npm link  →  skill-manager [project-dir]
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tsxBin = join(__dirname, '../node_modules/.bin/tsx')
const serverEntry = join(__dirname, '../web/server/index.ts')

// Forward all args (project-dir, etc.) to the server
spawn(tsxBin, [serverEntry, ...process.argv.slice(2)], { stdio: 'inherit' })
