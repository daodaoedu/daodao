#!/usr/bin/env tsx
/**
 * 把 plugin/out/web-plugin/skills/ 底下每個 skill 資料夾各壓成一個 zip，供 Claude.ai
 * Settings → Capabilities → Skills 上傳（一次上傳一個）。
 *
 *   pnpm plugin:zip
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PLUGIN_ROOT = resolve(import.meta.dirname, '..')
const SRC = join(PLUGIN_ROOT, 'out', 'web-plugin', 'skills')
const OUT = join(PLUGIN_ROOT, 'out', 'web-plugin-zip')

if (!existsSync(SRC)) {
  console.error('找不到 plugin/out/web-plugin/skills/，先跑 pnpm plugin:build')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })

const skills = readdirSync(SRC).filter((n) => statSync(join(SRC, n)).isDirectory())
if (skills.length === 0) {
  console.error('plugin/out/web-plugin/skills/ 底下沒有 skill 資料夾')
  process.exit(1)
}

for (const name of skills) {
  const zipPath = join(OUT, `${name}.zip`)
  // -X 去掉 macOS 的額外屬性，-r 遞迴；cwd 設在 SRC 讓 zip 內是 <name>/SKILL.md
  execFileSync('zip', ['-qrX', zipPath, name], { cwd: SRC })
  console.log(`✓ ${name}.zip`)
}

console.log(`\n${skills.length} 個 zip 在 plugin/out/web-plugin-zip/，逐一上傳到 Claude.ai Skills。`)
