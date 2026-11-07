#!/usr/bin/env tsx
/** Self-contained single-skill archives for manual Claude.ai uploads. */
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const PLUGIN_ROOT = resolve(import.meta.dirname, '..')
const WEB = join(PLUGIN_ROOT, 'out', 'web-plugin')
const SRC = join(WEB, 'skills')
const OUT = join(PLUGIN_ROOT, 'out', 'web-plugin-zip')

type Resource = { source: string; target: string; mode: number }

function collect(source: string, target: string): Resource[] {
  const stat = lstatSync(source)
  if (stat.isSymbolicLink()) throw new Error(`不打包 symbolic link：${relative(WEB, source)}`)
  if (stat.isDirectory()) {
    return readdirSync(source).sort().flatMap(name => collect(join(source, name), join(target, name)))
  }
  if (!stat.isFile()) throw new Error(`不支援的打包檔案：${relative(WEB, source)}`)
  return [{ source: resolve(source), target, mode: stat.mode & 0o777 }]
}

function rewriteLinks(text: string, file: Resource, resources: Map<string, string>): string {
  return text.replace(/\[([^\]]*)\]\(([^)\n]+)\)/g, (whole, label: string, link: string) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(link)) return whole
    const parts = link.match(/^([^?#]*)([?#].*)?$/)
    if (!parts || !parts[1]) return whole
    const source = resolve(dirname(file.source), parts[1])
    const suffix = parts[2] ?? ''
    const target = resources.get(source)
    if (!target) {
      const missing = relative(WEB, source).replaceAll('\\', '/')
      return `**${label}**（\`${missing}${suffix}\`，未隨此 skill 出貨）`
    }
    const rewritten = relative(dirname(file.target), target).replaceAll('\\', '/')
    return `[${label}](${rewritten}${suffix})`
  })
}

if (!existsSync(SRC)) {
  console.error('找不到 plugin/out/web-plugin/skills/，先跑 pnpm plugin:build')
  process.exit(1)
}

const skills = readdirSync(SRC).filter(name => lstatSync(join(SRC, name)).isDirectory()).sort()
if (skills.length === 0) {
  console.error('plugin/out/web-plugin/skills/ 底下沒有 skill 資料夾')
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })

for (const name of skills) {
  const staging = mkdtempSync(join(OUT, '.stage-'))
  try {
    const root = join(staging, name)
    const files = collect(join(SRC, name), root)
    // Keep one skill at the archive root; shared support files belong inside it.
    for (const support of ['docs', 'templates']) {
      const source = join(WEB, support)
      if (existsSync(source)) files.push(...collect(source, join(root, 'shared', support)))
    }
    const targets = new Set<string>()
    for (const file of files) {
      if (targets.has(file.target)) throw new Error(`打包路徑重複：${relative(root, file.target)}`)
      targets.add(file.target)
    }
    const resources = new Map(files.map(file => [file.source, file.target]))
    for (const file of files) {
      mkdirSync(dirname(file.target), { recursive: true })
      const bytes = readFileSync(file.source)
      const content = file.source.endsWith('.md') ? rewriteLinks(bytes.toString('utf8'), file, resources) : bytes
      writeFileSync(file.target, content, { mode: file.mode })
    }
    const archive = join(staging, `${name}.zip`)
    execFileSync('zip', ['-qrX', archive, name], { cwd: staging })
    // Replace, never update: entries removed from the source cannot linger.
    renameSync(archive, join(OUT, `${name}.zip`))
    console.log(`✓ ${name}.zip`)
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

for (const file of readdirSync(OUT)) {
  if (file.endsWith('.zip') && !skills.includes(file.slice(0, -4))) rmSync(join(OUT, file))
}
console.log(`\n${skills.length} 個 zip 在 plugin/out/web-plugin-zip/，逐一上傳到 Claude.ai Skills。`)
