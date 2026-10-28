#!/usr/bin/env tsx
/**
 * 把 plugin 版號往上加，並重跑 build 讓產物裡的版號一起更新。
 *
 *   pnpm plugin:bump           patch（0.1.0 → 0.1.1）
 *   pnpm plugin:bump minor     0.1.0 → 0.2.0
 *   pnpm plugin:bump major     0.1.0 → 1.0.0
 *   pnpm plugin:bump 1.2.3     直接指定
 *
 * 日常發版不用跑這支：release workflow 以 plugin.json 的 major.minor 加上 run number
 * 自動產生版號，合進 main 就發。只有要升 minor／major 時才需要手動 bump。
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PLUGIN_ROOT = resolve(import.meta.dirname, '..')
const REPO_ROOT = resolve(PLUGIN_ROOT, '..')
const MANIFEST = join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json')

const raw = readFileSync(MANIFEST, 'utf8')
const meta = JSON.parse(raw)
const current: string = meta.version

const arg = process.argv[2] ?? 'patch'

function next(version: string, kind: string): string {
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!m) throw new Error(`現有版號不是 x.y.z：${version}`)
  const [major, minor, patch] = m.slice(1).map(Number)
  if (kind === 'major') return `${major + 1}.0.0`
  if (kind === 'minor') return `${major}.${minor + 1}.0`
  if (kind === 'patch') return `${major}.${minor}.${patch + 1}`
  throw new Error(`不認得的參數「${kind}」，用 patch／minor／major 或直接給 x.y.z`)
}

const version = next(current, arg)
if (version === current) {
  console.error(`版號沒變（${current}），release workflow 會跳過發佈。`)
  process.exit(1)
}

// 只換版號那一行，保留原本的排版與欄位順序
writeFileSync(MANIFEST, raw.replace(/("version":\s*)"[^"]+"/, `$1"${version}"`))

console.log(`${current} → ${version}`)
execFileSync('pnpm', ['-s', 'plugin:build'], { cwd: REPO_ROOT, stdio: 'inherit' })

console.log(`
接下來：
  1. git add -A && 走正常 commit → PR → merge main
  2. plugin-release.yml 會打包、建 release plugin-v${version}、驗 sha256
  3. 使用者端：marketplace 有開 autoUpdate，session 啟動後十分鐘內背景更新，
     會提示跑 /reload-plugins；想立刻更新就 /plugin update daodao@daodao
`)
