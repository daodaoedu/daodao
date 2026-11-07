import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')
const roots: string[] = []
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })))

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'daodao-skill-zip-'))
  roots.push(root)
  const plugin = join(root, 'plugin')
  const web = join(plugin, 'out/web-plugin')
  function file(path: string, content: string | Buffer) {
    const target = join(web, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
  mkdirSync(join(plugin, 'scripts'), { recursive: true })
  copyFileSync(join(REPO_ROOT, 'plugin/scripts/zip.ts'), join(plugin, 'scripts/zip.ts'))
  writeFileSync(join(root, 'package.json'), '{"type":"module"}')
  file('skills/alpha/SKILL.md', '# Alpha\n[shared](../../docs/shared.md#phase)\n[template](../../templates/example.md)\n[other](../beta/SKILL.md#hidden)\n[repo](../../../REVIEW.md#policy)\n[web](https://example.org/help#safe)\n')
  file('skills/alpha/references/details.md', '[nested](../../../docs/shared.md#phase)\n')
  file('docs/shared.md', '# Phase\n[template](../templates/example.md)\n[own](../skills/alpha/references/details.md)\n[unshipped](../skills/beta/SKILL.md#hidden)\n')
  file('templates/example.md', '[back](../docs/shared.md#phase)\n')
  file('skills/beta/SKILL.md', '# Other skill\n')
  file('secret.private', 'not shipped')
  const executable = Buffer.from('#!/usr/bin/env node\nconst x="[literal](../../../docs/shared.md#phase)";\n')
  file('skills/alpha/scripts/tool.cjs', executable)
  const zip = join(plugin, 'out/web-plugin-zip/alpha.zip')
  const run = () => execFileSync('pnpm', ['-s', 'exec', 'tsx', join(plugin, 'scripts/zip.ts')], { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const read = (path: string) => execFileSync('unzip', ['-p', zip, path], { encoding: 'utf8' })
  const entries = () => execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n')
  return { root, web, file, zip, run, read, entries, executable }
}

describe('manual skill upload archives', () => {
  it('ships shared documents/templates with working rewritten links, including nested references and fragments', () => {
    const f = fixture()
    f.run()
    const extracted = join(f.root, 'extracted')
    mkdirSync(extracted)
    execFileSync('unzip', ['-q', f.zip, '-d', extracted])
    const docs = ['alpha/SKILL.md', 'alpha/references/details.md']
    const shared = f.entries().find(path => path.endsWith('/docs/shared.md'))
    expect(shared).toBeDefined()
    docs.push(shared!)
    docs.push(f.entries().find(path => path.endsWith('/templates/example.md'))!)
    for (const doc of docs) {
      const text = readFileSync(join(extracted, doc), 'utf8')
      for (const match of text.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
        if (/^[a-z][a-z\d+.-]*:/i.test(match[1])) continue
        expect(existsSync(resolve(dirname(join(extracted, doc)), match[1])), `${doc}: ${match[1]}`).toBe(true)
      }
    }
    expect(f.read('alpha/SKILL.md')).toMatch(/\[shared\]\([^)]*shared\.md#phase\)/)
    expect(f.read('alpha/references/details.md')).toMatch(/\[nested\]\([^)]*shared\.md#phase\)/)
  })

  it('downgrades links to unshipped skills/repo files while preserving external links and fragment context', () => {
    const f = fixture()
    f.run()
    const text = f.read('alpha/SKILL.md')
    expect(text).not.toContain('[other](')
    expect(text).not.toContain('[repo](')
    expect(text).toContain('SKILL.md#hidden')
    expect(text).toContain('REVIEW.md#policy')
    expect(text).toContain('[web](https://example.org/help#safe)')
  })

  it('keeps executable bytes and only includes the selected skill plus allowed shared resources', () => {
    const f = fixture()
    f.run()
    const bytes = execFileSync('unzip', ['-p', f.zip, 'alpha/scripts/tool.cjs'])
    expect(bytes).toEqual(f.executable)
    const names = f.entries()
    expect(names.every(path => path === 'alpha/' || path.startsWith('alpha/'))).toBe(true)
    expect(names.some(path => path.includes('/beta/') || path.includes('secret.private'))).toBe(false)
  })

  it('rebuilds archives without entries deleted from the source', () => {
    const f = fixture()
    f.file('skills/alpha/references/retired.md', '# Old\n')
    f.run()
    expect(f.entries()).toContain('alpha/references/retired.md')
    rmSync(join(f.web, 'skills/alpha/references/retired.md'))
    f.run()
    expect(f.entries()).not.toContain('alpha/references/retired.md')
  })

  it('rejects symbolic links instead of following them into unrelated private files', () => {
    const f = fixture()
    symlinkSync(join(f.web, 'secret.private'), join(f.web, 'skills/alpha/scripts/leak.cjs'))
    expect(() => f.run()).toThrow()
  })
})
