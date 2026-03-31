---
name: example
description: |
  这是一个示例 Skill。
  你可以通过 skill-manager 的可视化界面对它进行管理（启用、禁用、删除等操作）。
  
  当你激活这个 skill 时，Claude Code 会获取以下能力：
  1. 理解这个目录的特定规范。
  2. 自动运行这个 skill 提供的某些工具。
version: "1.0.0"
disable-model-invocation: true
---

# 示例 Skill: example

这是一个提供给 `skill-manager` 测试与展示用的本地 Project Skill 示例。

## 功能介绍
本 Skill 主要用于在 Claude Manager 的 Web UI 中展示多行 `description` 的折叠/展开效果，以及本地 Project 维度的 Skill 管理。

## 使用场景
1. 演示如何在本地 `.claude/skills/` 目录下创建一个有效的 Skill。
2. 验证开启/禁用操作对 `SKILL.md` 重命名的影响。


