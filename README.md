# Skill Manager

Claude Code Skills 的可视化管理工具 —— 在浏览器中启用、禁用、删除、批量操作 skills，支持用户/项目/插件三个作用域。

## 环境要求

- Node.js 18+
- npm 9+
- 已安装 Claude Code（skills 默认存放在 `~/.claude/skills/`）

---

## 安装

```bash
git clone <repo-url>
cd skill-manager
npm install && npm run build:web && npm link
```

之后在任意目录使用：

```bash
# 查看当前目录对应项目的 skills
skill-manager

# 查看指定项目的 skills
skill-manager /path/to/my-project

# 指定端口
PORT=8080 skill-manager
```

### 开发模式（前端热更新）

```bash
npm run dev:web
```

API 服务运行在 port 3001，Vite 开发服务器运行在 port 5173，访问 `http://localhost:5173`。

---

## 功能说明

### Skill 列表

所有 skills 按作用域分为三个区块，每个区块均可折叠/展开：

- **USER SKILLS** —— `~/.claude/skills/` 下的 skills
- **PROJECT SKILLS** —— 当前项目 `.claude/skills/` 下的 skills
- **PLUGIN SKILLS** —— `~/.claude/plugins/` 下已安装插件中的 skills

每个区块标题显示已启用和已禁用的数量，例如：`USER SKILLS  27 enabled · 1 disabled`。

点击区块标题（▼/▶）可折叠/展开该区块。

### 启用 / 禁用

点击每行的拨动开关即可切换状态。

底层操作：
- 禁用 → 将 `SKILL.md` 重命名为 `SKILL.md.disabled`
- 启用 → 将 `SKILL.md.disabled` 重命名回 `SKILL.md`

**Plugin Skills 的多副本同步**：Claude Code 从多个路径加载同一个插件 skill（`cache/`、`marketplaces/`、顶层插件目录），enable/disable 操作会同步更新所有副本，确保 Claude Code 不再加载已禁用的 skill。

### Skill 说明（description）

若 `SKILL.md` 的 YAML frontmatter 中包含 `description` 字段，会在 skill 名称下方显示。点击可展开/折叠完整内容。

单行描述：

```yaml
---
name: my-skill
description: 一句话说明这个 skill 的用途。
---
```

多行描述（YAML 块标量）：

```yaml
---
name: my-skill
description: |
  折叠时显示第一行。
  展开后显示完整内容。
---
```

没有 `description` 字段的 skill 不显示描述区域。

### 搜索

顶部搜索框实时按名称过滤，三个区块同步筛选。

### 删除

点击行尾的垃圾桶图标，弹出确认对话框后执行删除。**删除操作会永久移除 skill 目录，不可撤销。**

Plugin Skills 不支持删除（需通过 Claude Code 插件管理器卸载插件），删除按钮隐藏。

### 批量操作

勾选每行左侧的复选框可选中多个 skills；点击区块标题处的复选框可全选/全不选当前区块（支持半选状态）。

选中 1 个及以上时，页面底部弹出操作栏：

| 按钮 | 说明 | 灰掉条件 |
|------|------|----------|
| **Enable** | 批量启用所有选中的已禁用 skills | 选中的全部已启用 |
| **Disable** | 批量禁用所有选中的已启用 skills | 选中的全部已禁用 |
| **Delete** | 弹出确认框，列出所有选中 skills 后批量删除 | 永远可点 |
| **✕** | 清空选中 | — |

所有批量操作使用 `Promise.allSettled` 并行执行，部分失败时对应行显示错误提示（3 秒后自动消失），成功的操作照常生效。

---

## Skills 目录结构

### User / Project Skills

每个 skill 是一个包含 `SKILL.md`（启用）或 `SKILL.md.disabled`（禁用）的目录：

```
~/.claude/skills/
├── my-skill/
│   └── SKILL.md              ← 已启用
├── old-skill/
│   └── SKILL.md.disabled     ← 已禁用
└── my-plugin/                ← 插件目录（含子 skills）
    ├── sub-skill-a/
    │   └── SKILL.md
    └── sub-skill-b/
        └── SKILL.md
```

插件目录（内含多个子 skill 目录）会被自动识别，子 skill 在 UI 中显示为 `plugin-name/sub-skill-name`。

支持 symlink，broken symlink 会被静默跳过。

### Plugin Skills

插件 skills 来自 `~/.claude/plugins/installed_plugins.json` 中记录的已安装插件。每个插件可能在以下位置同时存有 skill 文件，Skill Manager 全部纳入管理：

```
~/.claude/plugins/
├── cache/<marketplace>/<plugin>/<version>/
│   ├── skills/<skill-name>/SKILL.md     ← 主要位置
│   └── variants/<variant>/SKILL.md      ← 变体（同一 skill 的备用入口）
├── marketplaces/<marketplace>/
│   ├── skills/<skill-name>/SKILL.md     ← marketplace 副本
│   ├── variants/<variant>/SKILL.md      ← marketplace 变体
│   └── SKILL.md                         ← marketplace 根目录直接 skill
└── <plugin-id>/
    └── skills/<skill-name>/SKILL.md     ← 顶层本地副本
```

**重要**：Claude Code 可能从上述任意位置加载同一个 plugin skill。若只禁用 `cache/` 中的副本而 `marketplaces/` 副本仍活跃，Claude Code 依然会加载该 skill。Skill Manager 的 enable/disable 操作会自动同步所有副本。

### Plugin Skills 数量与 Claude Code 不一致

这是预期行为，不是 bug：

- Claude Code 将包含多个 sub-skills 的插件目录（如 `pua/`）计为 1 条
- Skill Manager 将每个 sub-skill（`pua-en`、`pua-ja`、`shot` 等）单独显示
- 因此 Skill Manager 显示的数量通常多于 Claude Code 的 `/skills` 计数

---

## 注意事项

| 场景 | 说明 |
|------|------|
| 修改了后端代码（`src/`、`web/server/`） | 需要重启服务器 |
| 修改了前端代码（`web/client/`） | 需要重新 `npm run build:web`，再重启服务器；开发模式下自动热更新 |
| 查看其他项目的 Project Skills | 传入项目路径参数：`skill-manager /path/to/project` |
| 删除操作 | 永久删除，无法恢复，请通过确认弹框仔细核对 |
| Plugin Skills 删除 | 不支持，需通过 Claude Code 插件管理器（`/plugins`）卸载 |
| description 字段 | 可选，没有也不影响任何功能 |
| disable 后 Claude Code 仍显示 | 刷新 Claude Code 或重启会话；Plugin Skills disable 后需 Claude Code 重新加载 |

---

## 运行测试

```bash
npm test
```

测试覆盖 Express API 的全部端点：skill 扫描、启用/禁用/删除、description 字段提取（含块标量和禁用 skill）。

---

## 命令速查

| 命令 | 说明 |
|------|------|
| `skill-manager` | 全局安装后，查看当前目录的 skills |
| `skill-manager <path>` | 查看指定项目的 skills |
| `npm run web` | 本地启动生产服务器 |
| `npm run web -- <path>` | 本地启动并指定项目目录 |
| `npm run dev:web` | 启动开发模式（前端热更新） |
| `npm run build:web` | 构建前端到 `dist/web/` |
| `npm test` | 运行测试 |
| `npm run test:watch` | 监听模式运行测试 |
