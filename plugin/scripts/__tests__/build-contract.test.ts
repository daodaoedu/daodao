import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const PLUGIN_ROOT = resolve(import.meta.dirname, '..', '..')
const REPO_ROOT = resolve(PLUGIN_ROOT, '..')
const manifest = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'platforms.json'), 'utf8'))

/** Agent Skills 標準允許的 frontmatter 欄位。多一個，claude.ai 上傳會硬錯。 */
const SPEC_FIELDS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']

function frontmatterKeys(file: string): string[] {
  const m = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)
  if (!m) return []
  return m[1]
    .split('\n')
    .map((l) => l.match(/^([a-zA-Z][\w-]*):/)?.[1])
    .filter((k): k is string => Boolean(k))
}

function description(file: string): string {
  const m = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)
  if (!m) return ''
  const lines = m[1].split('\n')
  const i = lines.findIndex((l) => l.startsWith('description:'))
  if (i === -1) return ''
  const first = lines[i].slice('description:'.length).trim()
  if (!['>-', '>', '|'].includes(first)) return first.replace(/^"|"$/g, '')
  const folded: string[] = []
  for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j++) folded.push(lines[j].trim())
  return folded.join(' ')
}

function skillDirs(base: string): string[] {
  if (!existsSync(base)) return []
  return readdirSync(base)
    .filter((n) => statSync(join(base, n)).isDirectory())
    .map((n) => join(base, n))
}

describe('canonical skills', () => {
  const dirs = skillDirs(join(PLUGIN_ROOT, 'skills'))

  it('每個 skill 都在 platforms.json 宣告了能力需求', () => {
    for (const dir of dirs) {
      const name = dir.split('/').pop()!
      expect(manifest.skills[name], `platforms.json 缺少「${name}」`).toBeDefined()
    }
  })

  it('platforms.json 沒有指向不存在的 skill', () => {
    const names = new Set(dirs.map((d) => d.split('/').pop()!))
    for (const name of Object.keys(manifest.skills)) {
      expect(names.has(name), `platforms.json 宣告了不存在的 skill「${name}」`).toBe(true)
    }
  })

  it('宣告的能力都在 capabilities 字典裡', () => {
    const known = new Set(Object.keys(manifest.capabilities))
    for (const [name, spec] of Object.entries(manifest.skills) as [string, { requires: string[]; optional: string[] }][]) {
      for (const cap of [...spec.requires, ...spec.optional]) {
        expect(known.has(cap), `${name} 用了未定義的能力「${cap}」`).toBe(true)
      }
    }
  })
})

describe('Claude Code manifest', () => {
  const manifestPath = join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json')
  const plugin = JSON.parse(readFileSync(manifestPath, 'utf8'))

  // 2026-09-21：manifest 宣告 "hooks": "./hooks/hooks.json" 會讓 plugin 整個
  // "failed to load"（Duplicate hooks file detected）——hooks/hooks.json 與 skills/
  // 本來就會自動探索，再宣告一次就是重複載入。`claude plugin validate` 不會抓到，
  // 只有真的安裝才看得見，所以這裡擋住。
  it('不重複宣告會自動探索的元件路徑', () => {
    for (const key of ['hooks', 'skills', 'commands', 'agents']) {
      expect(plugin[key], `plugin.json 不該宣告預設路徑「${key}」`).toBeUndefined()
    }
  })

  it('自動探索的元件確實存在於預設位置', () => {
    expect(existsSync(join(PLUGIN_ROOT, 'hooks', 'hooks.json'))).toBe(true)
    expect(existsSync(join(PLUGIN_ROOT, 'skills'))).toBe(true)
  })

  it('name 是 kebab-case（plugin host 用它當命名空間）', () => {
    expect(plugin.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
})

describe('claude.ai 產物必須符合 Agent Skills 標準', () => {
  const target = join(PLUGIN_ROOT, 'out', 'web-plugin', 'skills')
  const limit: number = manifest.platforms['claude-ai'].descriptionLimit

  it('frontmatter 只有標準欄位', () => {
    for (const dir of skillDirs(target)) {
      const keys = frontmatterKeys(join(dir, 'SKILL.md'))
      const extra = keys.filter((k) => !SPEC_FIELDS.includes(k))
      expect(extra, `${dir.split('/').pop()} 有規格外欄位`).toEqual([])
    }
  })

  it(`description 不超過 ${limit} 字`, () => {
    for (const dir of skillDirs(target)) {
      const d = description(join(dir, 'SKILL.md'))
      expect(d.length, `${dir.split('/').pop()} description ${d.length} 字`).toBeLessThanOrEqual(limit)
    }
  })

  it('沒有殘留 ${CLAUDE_PLUGIN_ROOT}（這個平台不會展開它）', () => {
    for (const dir of skillDirs(target)) {
      expect(readFileSync(join(dir, 'SKILL.md'), 'utf8')).not.toContain('${CLAUDE_PLUGIN_ROOT}')
    }
  })

  it('只收錄能力需求被滿足的 skill', () => {
    const has: string[] = manifest.platforms['claude-ai'].has
    const shipped = new Set(skillDirs(target).map((d) => d.split('/').pop()!))
    for (const [name, spec] of Object.entries(manifest.skills) as [string, { requires: string[] }][]) {
      const satisfiable = spec.requires.every((c) => has.includes(c))
      expect(shipped.has(name), `${name} 應該${satisfiable ? '' : '不'}被收錄`).toBe(satisfiable)
    }
  })
})

describe('.agents/skills 產物', () => {
  const target = join(REPO_ROOT, '.agents', 'skills')

  it('Codex／ChatGPT 桌面版拿到全部 13 個 skill', () => {
    expect(skillDirs(target)).toHaveLength(Object.keys(manifest.skills).length)
  })

  it('沒有殘留 ${CLAUDE_PLUGIN_ROOT}', () => {
    for (const dir of skillDirs(target)) {
      expect(readFileSync(join(dir, 'SKILL.md'), 'utf8')).not.toContain('${CLAUDE_PLUGIN_ROOT}')
    }
  })

  it('dev-task 的 references 有一起帶過去（那裡沒有 plugin 載入器）', () => {
    expect(existsSync(join(target, 'dev-task', 'references', 'layout-probe.mjs'))).toBe(true)
  })
})

describe('產物與 canonical 同步', () => {
  it('pnpm plugin:check 通過（產物沒有被手改、也沒有忘記重跑）', () => {
    const r = execFileSync('pnpm', ['-s', 'plugin:check'], { cwd: REPO_ROOT, encoding: 'utf8' })
    expect(r).toContain('同步')
  })
})


describe('build 的刪除護欄', () => {
  // build 會整個刪掉 target 目錄再重寫。platforms.json 是手改的，target 打錯字
  // （或把 claude-code 的 emit 從 native 改掉，它的 target 就是 `plugin/`）
  // 會直接刪光 canonical skills。護欄必須先擋下來。
  //
  // 用 DAODAO_PLUGIN_PLATFORMS 指向暫存 manifest，不改 repo 裡的那份：
  // vitest 平行跑測試檔，改共用檔案會被別支測試讀到（那正是 2026-09-21 讓
  // zip 可重現性測試紅掉的原因）。其餘平台的 target 也一併導到暫存目錄，
  // 確保就算護欄沒攔住，也不會動到真正的產物。
  function buildWithTarget(target: string): { blocked: boolean; stderr: string } {
    const tmp = mkdtempSync(join(tmpdir(), 'daodao-guard-'))
    try {
      const m = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'platforms.json'), 'utf8'))
      for (const [id, platform] of Object.entries(m.platforms) as [string, { emit: string; target: string }][]) {
        if (platform.emit !== 'native') platform.target = join(tmp, 'out', id)
      }
      m.platforms['agents-skills'].target = target
      const manifestPath = join(tmp, 'platforms.json')
      writeFileSync(manifestPath, JSON.stringify(m, null, 2))

      execFileSync('pnpm', ['-s', 'plugin:build'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, DAODAO_PLUGIN_PLATFORMS: manifestPath },
      })
      return { blocked: false, stderr: '' }
    } catch (e: any) {
      return { blocked: true, stderr: `${e.stderr ?? ''}` }
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  }

  it('target 指向 canonical skills 會被拒絕，且 canonical 毫髮無傷', () => {
    const r = buildWithTarget('plugin/skills/')
    expect(r.blocked).toBe(true)
    expect(r.stderr).toMatch(/canonical|拒絕刪除/)
    expect(existsSync(join(PLUGIN_ROOT, 'skills', 'dev-task', 'SKILL.md'))).toBe(true)
  })

  it('target 指向 repo 根目錄會被拒絕', () => {
    expect(buildWithTarget('./').blocked).toBe(true)
    expect(existsSync(join(REPO_ROOT, 'package.json'))).toBe(true)
  })

  it('target 指向 repo 外面會被拒絕', () => {
    expect(buildWithTarget('../').blocked).toBe(true)
  })

  it('護欄測試本身不會動到 repo 的 platforms.json', () => {
    const before = readFileSync(join(PLUGIN_ROOT, 'platforms.json'), 'utf8')
    buildWithTarget('plugin/skills/')
    expect(readFileSync(join(PLUGIN_ROOT, 'platforms.json'), 'utf8')).toBe(before)
  })
})

describe('產物的相對連結必須解析得到', () => {
  // 連結改寫踩過兩次雷：(1) 把 `../../../` 一律刪掉，但 .agents/skills/<name>/
  // 跟 canonical 同深度，repo 根連結本來就是對的；(2) standalone 包沒帶 docs/
  // 與 templates/，skill 內的相對連結全指空。死連結不會報錯，agent 只會讀不到規則
  // 然後照自己的意思做事，所以這裡逐條實際解析。
  const LINK = /\]\(([^)#:]+\.(?:md|mjs|py|json|sh))\)/g

  function walkMd(dir: string): string[] {
    return readdirSync(dir).flatMap((e) => {
      const full = join(dir, e)
      if (statSync(full).isDirectory()) return walkMd(full)
      return full.endsWith('.md') ? [full] : []
    })
  }

  function brokenLinks(root: string): string[] {
    const base = join(REPO_ROOT, root)
    if (!existsSync(base)) return []
    const broken: string[] = []
    for (const file of walkMd(base)) {
      for (const m of readFileSync(file, 'utf8').matchAll(LINK)) {
        const link = m[1]
        if (link.startsWith('http') || link.startsWith('${') || link.includes('<')) continue
        if (!existsSync(resolve(dirname(file), link))) broken.push(`${relative(REPO_ROOT, file)} → ${link}`)
      }
    }
    return broken
  }

  for (const root of ['plugin/skills', 'plugin/docs', 'plugin/templates', '.agents/skills', 'plugin/out/openai-plugin', 'plugin/out/web-plugin']) {
    it(`${root} 沒有死連結`, () => {
      expect(brokenLinks(root)).toEqual([])
    })
  }

  it('standalone 包自己帶 docs 與 templates', () => {
    for (const bundle of ['plugin/out/openai-plugin', 'plugin/out/web-plugin']) {
      expect(existsSync(join(REPO_ROOT, bundle, 'docs')), `${bundle} 缺 docs`).toBe(true)
      expect(existsSync(join(REPO_ROOT, bundle, 'templates')), `${bundle} 缺 templates`).toBe(true)
    }
  })
})
