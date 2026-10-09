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
import { dirname, join, relative, resolve } from 'node:path'

const PLUGIN_ROOT = resolve(import.meta.dirname, '..')
const REPO_ROOT = resolve(PLUGIN_ROOT, '..')
const OUT = join(PLUGIN_ROOT, 'out', 'release')
const STAGE = join(PLUGIN_ROOT, 'out', '.stage')

/**
 * 固定時間戳。刻意不用 1980-01-01：那正好是 ZIP 格式的時間下界，只要時區一位移
 * 就會掉到界外被 clamp，而 clamp 行為隨實作而異。2000-01-01 離界夠遠。
 *
 * 另外 `touch -t` 吃的是本機時區，不強制 TZ=UTC 的話，macOS（UTC+8）與 CI（UTC）
 * 會把同一份內容存成不同的時間戳，sha256 自然對不起來。
 */
const EPOCH = '200001010000'

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

/**
 * 以 git 追蹤的檔案為準，不是掃工作目錄。
 *
 * 掃工作目錄會把本機殘留一起打包——2026-09-21 就是本機的
 * `hooks/__pycache__/*.pyc` 混進去，導致本機打的包比 CI 多一個檔案，
 * 跨機器 sha256 永遠對不起來。`git ls-files` 拿到的就是這個 commit 的內容，
 * 本機與 CI 必然一致，.gitignore 擋掉的東西也自然不會進來。
 */
const tracked = execFileSync('git', ['ls-files', '-z', '--', 'plugin'], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
})
  .split('\0')
  .filter(Boolean)
  .map((p) => relative('plugin', p))
  // out/ 是各平台產物，不進自己的包（會套娃，也讓包變大）
  .filter((p) => p !== '' && !p.startsWith('..') && !p.startsWith('out/'))
  .sort()

if (tracked.length === 0) throw new Error('git ls-files 沒有列出任何 plugin/ 檔案')

for (const rel of tracked) {
  const dest = join(STAGE, 'plugin', rel)
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(join(PLUGIN_ROOT, rel), dest)
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
execFileSync('touch', ['-t', EPOCH, ...staged.sort()], { env: { ...process.env, TZ: 'UTC' } })

// ---------------------------------------------------------------- zip

mkdirSync(OUT, { recursive: true })
const zipPath = join(OUT, zipName)
rmSync(zipPath, { force: true })
// -X 去掉平台額外屬性，-D 不存目錄條目（少一組時間戳變數，解壓時目錄照樣會建），
// -9 最高壓縮；排序後逐檔加入讓條目順序固定。
const entries = staged
  .filter((f) => statSync(f).isFile())
  .sort()
  .map((f) => relative(STAGE, f))
execFileSync('zip', ['-qX9D', zipPath, ...entries], { cwd: STAGE, env: { ...process.env, TZ: 'UTC' } })

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
