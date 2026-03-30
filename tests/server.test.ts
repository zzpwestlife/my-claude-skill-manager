import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../web/server/app.js'

describe('Express server', () => {
  let tmpRoot: string
  let userDir: string

  beforeEach(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'sm-server-test-'))
    userDir = join(tmpRoot, 'user')
    await mkdir(userDir)
  })

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true })
  })

  describe('GET /api/skills', () => {
    it('returns empty array when no skills', async () => {
      const app = createApp(userDir, null)
      const res = await request(app).get('/api/skills')
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('returns skills when found', async () => {
      const skillDir = join(userDir, 'my-skill')
      await mkdir(skillDir)
      await writeFile(join(skillDir, 'SKILL.md'), '# My Skill')
      const app = createApp(userDir, null)
      const res = await request(app).get('/api/skills')
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0]).toMatchObject({
        name: 'my-skill',
        enabled: true,
        scope: 'user',
      })
    })

    it('includes description from SKILL.md frontmatter', async () => {
      const skillDir = join(userDir, 'described-skill')
      await mkdir(skillDir)
      await writeFile(
        join(skillDir, 'SKILL.md'),
        '---\nname: described-skill\ndescription: A test skill for testing.\n---\n\n# Body',
      )
      const app = createApp(userDir, null)
      const res = await request(app).get('/api/skills')
      expect(res.status).toBe(200)
      expect(res.body[0]).toMatchObject({
        name: 'described-skill',
        description: 'A test skill for testing.',
      })
    })

    it('omits description when SKILL.md has no frontmatter', async () => {
      const skillDir = join(userDir, 'plain-skill')
      await mkdir(skillDir)
      await writeFile(join(skillDir, 'SKILL.md'), '# No frontmatter here')
      const app = createApp(userDir, null)
      const res = await request(app).get('/api/skills')
      expect(res.status).toBe(200)
      expect(res.body[0].description).toBeUndefined()
    })
  })

  describe('PATCH /api/skills/:id/enable', () => {
    it('enables a disabled skill', async () => {
      const skillDir = join(userDir, 'my-skill')
      await mkdir(skillDir)
      await writeFile(join(skillDir, 'SKILL.md.disabled'), '# My Skill')
      const app = createApp(userDir, null)
      const res = await request(app).patch('/api/skills/user%3Amy-skill/enable')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
      const files = await readdir(skillDir)
      expect(files).toContain('SKILL.md')
      expect(files).not.toContain('SKILL.md.disabled')
    })

    it('returns 404 when skill not found', async () => {
      const app = createApp(userDir, null)
      const res = await request(app).patch('/api/skills/user%3Anonexistent/enable')
      expect(res.status).toBe(404)
      expect(res.body).toHaveProperty('error')
    })
  })

  describe('PATCH /api/skills/:id/disable', () => {
    it('disables an enabled skill', async () => {
      const skillDir = join(userDir, 'my-skill')
      await mkdir(skillDir)
      await writeFile(join(skillDir, 'SKILL.md'), '# My Skill')
      const app = createApp(userDir, null)
      const res = await request(app).patch('/api/skills/user%3Amy-skill/disable')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
      const files = await readdir(skillDir)
      expect(files).toContain('SKILL.md.disabled')
      expect(files).not.toContain('SKILL.md')
    })

    it('returns 404 when skill not found', async () => {
      const app = createApp(userDir, null)
      const res = await request(app).patch('/api/skills/user%3Anonexistent/disable')
      expect(res.status).toBe(404)
      expect(res.body).toHaveProperty('error')
    })
  })

  describe('DELETE /api/skills/:id', () => {
    it('deletes a standalone skill', async () => {
      const skillDir = join(userDir, 'my-skill')
      await mkdir(skillDir)
      await writeFile(join(skillDir, 'SKILL.md'), '# My Skill')
      const app = createApp(userDir, null)
      const res = await request(app).delete('/api/skills/user%3Amy-skill')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
      const dirs = await readdir(userDir)
      expect(dirs).not.toContain('my-skill')
    })

    it('returns 404 when skill not found', async () => {
      const app = createApp(userDir, null)
      const res = await request(app).delete('/api/skills/user%3Anonexistent')
      expect(res.status).toBe(404)
      expect(res.body).toHaveProperty('error')
    })
  })

  describe('URL encoding: plugin skill id with slash', () => {
    it('handles id containing slash (user:plugin/subskill)', async () => {
      const pluginDir = join(userDir, 'my-plugin')
      const subskillDir = join(pluginDir, 'sub-skill')
      await mkdir(pluginDir)
      await mkdir(subskillDir)
      await writeFile(join(subskillDir, 'SKILL.md'), '# Sub Skill')
      const app = createApp(userDir, null)
      // ID is "user:my-plugin/sub-skill", encoded: "user%3Amy-plugin%2Fsub-skill"
      const res = await request(app).patch('/api/skills/user%3Amy-plugin%2Fsub-skill/disable')
      expect(res.status).toBe(200)
    })
  })
})
