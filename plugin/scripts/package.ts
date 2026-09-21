#!/usr/bin/env tsx
/**
 * 打包成可直接下載的 zip，並產生指向它的 marketplace.json。
 *
 *   pnpm plugin:package                本機打包，marketplace 指向 latest release
 *   pnpm plugin:package --url <url>    指定 archive URL（CI 用，指向這次 release 的實際位址）
 *
 * 為什麼要這個：marketplace 從 GitHub repo 安裝會 git clone 整個 monorepo（12MB）
 * 只為了拿 plugin（163KB）。archive source 是單純的 HTTPS 下載，不需要 git 也不需要 npm。
 *
 * zip 刻意做成可重現的：所有檔案時間戳統一、條目排序、不帶額外屬性，
 * 所以同一份 commit 在本機與 CI 打出來的 sha256 會一致，可以自己驗 CI 的產物。
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const PLUGIN_ROOT = resolve(import.meta.dirname, '..')
const OUT = join(PLUGIN_ROOT, 'out', 'release')
const STAGE = join(PLUGIN_ROOT, 'out', '.stage')

/** 固定時間戳（1980-01-01 是 zip 格式能表示的最早時間）。 */
const EPOCH = '198001010000'

/** 不進 zip 的東西：產物、其他平台的包、node 垃圾。 */
const EXCLUDE = new Set(['out', 'node_modules', '.DS_Store'])

const meta = JSON.parse(readFileSync(join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), 'utf8'))
const version: string = meta.version
const zipName = `daodao-plugin-${version}.zip`

const args = process.argv.slice(2)
const urlIdx = args.indexOf('--url')
const archiveUrl =
  urlIdx !== -1
    ? args[urlIdx + 1]
    : `https://github.com/daodaoedu/daodao/releases/download/plugin-v${version}/${zipName}`

// ---------------------------------------------------------------- stage

rmSync(STAGE, { recursive: true, force: true })
mkdirSync(join(STAGE, 'plugin'), { recursive: true })

for (const entry of readdirSync(PLUGIN_ROOT)) {
  if (EXCLUDE.has(entry)) continue
  cpSync(join(PLUGIN_ROOT, entry), join(STAGE, 'plugin', entry), { recursive: true })
}

// 統一時間戳，讓 zip 可重現
const staged: string[] = []
;(function walk(dir: string) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    staged.push(full)
    if (statSync(full).isDirectory()) walk(full)
  }
})(join(STAGE, 'plugin'))
execFileSync('touch', ['-t', EPOCH, ...staged.sort()])

// ---------------------------------------------------------------- zip

mkdirSync(OUT, { recursive: true })
const zipPath = join(OUT, zipName)
rmSync(zipPath, { force: true })
// -X 去掉 macOS 額外屬性，-9 最高壓縮，排序後逐檔加入讓條目順序固定
const entries = staged
  .sort()
  .map((p) => relative(STAGE, p))
execFileSync('zip', ['-qX9', zipPath, ...entries], { cwd: STAGE })

const bytes = readFileSync(zipPath)
const sha256 = createHash('sha256').update(bytes).digest('hex')

// ---------------------------------------------------------------- marketplace.json

const marketplace = {
  name: 'daodao',
  owner: { name: 'daodaoedu', url: 'https://github.com/daodaoedu' },
  description: '島島阿學開發流程 plugin。archive 來源，安裝不需要 git 或 npm。',
  plugins: [
    {
      name: meta.name,
      displayName: meta.displayName,
      description: meta.description,
      version,
      category: 'workflow',
      source: { source: 'archive', url: archiveUrl, sha256 },
    },
  ],
}
writeFileSync(join(OUT, 'marketplace.json'), `${JSON.stringify(marketplace, null, 2)}\n`)

rmSync(STAGE, { recursive: true, force: true })

const kb = (bytes.length / 1024).toFixed(0)
console.log(`✓ ${zipName}  ${kb} KB`)
console.log(`  sha256  ${sha256}`)
console.log(`  archive ${archiveUrl}`)
console.log(`\n產物在 plugin/out/release/，兩個檔案都要上傳成 release asset。`)

if (!existsSync(join(OUT, 'marketplace.json'))) process.exit(1)
