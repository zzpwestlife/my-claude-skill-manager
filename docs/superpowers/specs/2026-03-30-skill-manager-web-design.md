# Skill Manager Web UI — Design Spec

**Date:** 2026-03-30
**Status:** Approved

## Overview

A local web UI for managing Claude Code skills. Runs as a Node.js HTTP server (`npm run web`), opens in the browser at `http://localhost:3000`. Provides the same list/enable/disable/delete functionality as the TUI, with a richer visual interface including search/filter.

---

## Goals

- List all skills (user scope + project scope) in a browser UI
- Enable / disable individual skills via toggle switch
- Delete skills with confirmation modal
- Search/filter skills by name (client-side, real-time)
- One command to start: `npm run web` (opens browser automatically)

## Non-Goals

- Installing skills from marketplaces
- Managing plugin packages (only individual skills)
- Authentication or multi-user support
- Remote access (localhost only)

---

## Architecture

**Single process:** Express server handles both the REST API and serves the Vite-built React frontend as static files.

```
skill-manager/
├── src/                          # Existing TUI (unchanged)
│   └── lib/
│       ├── types.ts              # Shared ✅
│       ├── scanner.ts            # Shared ✅
│       └── actions.ts            # Shared ✅
│
├── web/
│   ├── server/
│   │   └── index.ts              # Express server: REST API + static file serving
│   └── client/
│       ├── index.html            # Vite entry point
│       ├── main.tsx              # React mount point
│       ├── App.tsx               # Root component — state, data fetching
│       ├── api.ts                # Typed fetch wrappers for REST endpoints
│       └── components/
│           ├── SkillRow.tsx      # Single skill row: name + scope badge + toggle + delete
│           ├── SectionHeader.tsx # "USER SKILLS (n)" / "PROJECT SKILLS (n)" headings
│           ├── SearchBar.tsx     # Search input, filters client-side
│           └── ConfirmModal.tsx  # Delete confirmation dialog
│
├── vite.config.ts                # Dev: proxy /api → Express on port 3001
└── package.json                  # new scripts: web, dev, build:web
```

**Reuse strategy:** `web/server/index.ts` imports `src/lib/scanner.ts` and `src/lib/actions.ts` directly. Zero duplicated logic.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| HTTP server | Express 4 |
| Frontend build | Vite 5 |
| Frontend framework | React 18 |
| Styling | Tailwind CSS v3 |
| Language | TypeScript 5 |
| Dev runner | tsx (already installed) |

---

## REST API

Base path: `/api`

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/api/skills` | Scan and return all skills | `Skill[]` |
| `PATCH` | `/api/skills/:id/enable` | Enable a skill | `{ ok: true }` |
| `PATCH` | `/api/skills/:id/disable` | Disable a skill | `{ ok: true }` |
| `DELETE` | `/api/skills/:id` | Delete a skill | `{ ok: true }` |

**`:id`** is the skill's `id` field (e.g. `user:pua%2Fmama` — URL-encoded). The server decodes it before lookup.

**Error format:** All errors return `{ error: string }` with the appropriate HTTP status code (400 for bad request, 404 for skill not found, 500 for filesystem errors).

**Skill lookup:** The server calls `scanSkills()` on each `GET /api/skills` request (no in-memory cache — files can change externally). For `PATCH`/`DELETE`, the server scans first, finds the skill by `id`, then calls the appropriate action.

---

## Frontend Components

### `App.tsx`
- State: `skills: Skill[]`, `loading: boolean`, `error: string | null`, `search: string`, `confirmSkill: Skill | null`
- On mount: `GET /api/skills` → populate `skills`
- After any mutation (toggle / delete): re-fetch `GET /api/skills`
- Passes filtered skills (by `search`) to `SkillRow` list

### `SearchBar.tsx`
- Controlled `<input>` bound to `search` state in `App`
- Placeholder: "Search skills..."
- No API calls — filters in-memory

### `SectionHeader.tsx`
- Props: `title: string`, `count: number`
- Renders: `USER SKILLS (18)` or `PROJECT SKILLS (0)`

### `SkillRow.tsx`
- Props: `skill: Skill`, `onToggle: () => void`, `onDelete: () => void`
- Toggle switch: green when `skill.enabled`, gray when disabled
- Clicking toggle → calls `onToggle` → parent calls `PATCH /enable` or `/disable`
- Delete icon button → calls `onDelete` → parent sets `confirmSkill`
- Shows `user` / `project` scope badge

### `ConfirmModal.tsx`
- Props: `skill: Skill`, `onConfirm: () => void`, `onCancel: () => void`
- Shown when `confirmSkill !== null`
- "Delete {skill.name}?" + "This cannot be undone."
- [Delete] (red) + [Cancel] buttons

### `api.ts`
```ts
export async function fetchSkills(): Promise<Skill[]>
export async function enableSkill(id: string): Promise<void>
export async function disableSkill(id: string): Promise<void>
export async function deleteSkill(id: string): Promise<void>
```
All functions throw on non-ok HTTP responses.

---

## UI Layout

```
┌─────────────────────────────────────────────────┐
│  🔧 Skill Manager                               │
│  ┌───────────────────────────────────────────┐  │
│  │ 🔍 Search skills...                       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  USER SKILLS (18)                               │
│  ┌───────────────────────────────────────────┐  │
│  │ superpowers/brainstorming  [user]  ●━━  🗑 │  │
│  │ pua/pua                    [user]  ●━━  🗑 │  │
│  │ pua/mama          disabled [user]  ○━━  🗑 │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  PROJECT SKILLS (0)                             │
│  ┌───────────────────────────────────────────┐  │
│  │  (none found)                             │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Color scheme:** Dark background (gray-900), white text, green toggle = enabled, gray toggle = disabled, red delete button.

---

## Scripts (package.json additions)

```json
"web": "node --import tsx/esm web/server/index.ts",
"dev:web": "concurrently \"npm run web:api\" \"vite\"",
"web:api": "PORT=3001 node --import tsx/esm web/server/index.ts",
"build:web": "vite build",
"preview:web": "vite preview"
```

`npm run web` — production mode: serves built frontend + API on port 3000, opens browser automatically.

---

## Dev Workflow

```bash
# Development (hot reload):
npm run dev:web     # Vite dev server (5173) + Express API (3001)

# Production:
npm run build:web   # Build frontend to dist/web/
npm run web         # Serve everything on port 3000
```

`vite.config.ts` proxies `/api/*` → `http://localhost:3001` during dev.

---

## Error Handling

- API errors: show inline error message below the affected row (auto-dismiss after 3s)
- Network error on initial load: show full-page error state with "Retry" button
- Toggle/delete errors: keep current UI state unchanged, show inline error message

---

## New Dependencies

```json
"dependencies": {
  "express": "^4.18.0",
  "open": "^10.0.0"
},
"devDependencies": {
  "@types/express": "^4.17.0",
  "vite": "^5.0.0",
  "@vitejs/plugin-react": "^4.0.0",
  "tailwindcss": "^3.4.0",
  "autoprefixer": "^10.4.0",
  "postcss": "^8.4.0",
  "concurrently": "^8.0.0"
}
```
