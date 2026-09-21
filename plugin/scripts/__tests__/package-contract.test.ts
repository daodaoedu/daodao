import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const PLUGIN_ROOT = resolve(import.meta.dirname, '..', '..')
const REPO_ROOT = resolve(PLUGIN_ROOT, '..')
const RELEASE = join(PLUGIN_ROOT, 'out', 'release')

const version: string = JSON.parse(readFileSync(join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), 'utf8')).version
const zipPath = join(RELEASE, `daodao-plugin-${version}.zip`)

function pack() {
  execFileSync('pnpm', ['-s', 'plugin:package'], { cwd: REPO_ROOT, encoding: 'utf8' })
  return {
    sha: createHash('sha256').update(readFileSync(zipPath)).digest('hex'),
    // -v 會帶出每個條目的時間戳、CRC 與壓縮後大小；sha 不合時用它指出到底哪裡變了，
    // 光看兩個 hash 不同沒辦法除錯（2026-09-21 就卡在這：本機過、Linux 紅）。
    listing: execFileSync('unzip', ['-v', zipPath], { encoding: 'utf8' }),
  }
}

function firstDifferingLines(a: string, b: string, max = 6): string {
  const la = a.split('\n')
  const lb = b.split('\n')
  const out: string[] = []
  for (let i = 0; i < Math.max(la.length, lb.length) && out.length < max; i++) {
    if (la[i] !== lb[i]) out.push(`  run1: ${la[i] ?? '<無>'}\n  run2: ${lb[i] ?? '<無>'}`)
  }
  return out.join('\n') || '  （條目清單完全相同——差異在壓縮資料或檔頭）'
}

let first = { sha: '', listing: '' }
let second = { sha: '', listing: '' }
let firstSha = ''

beforeAll(() => {
  first = pack()
  second = pack()
  firstSha = first.sha
}, 60_000)

describe('release zip', () => {
  // 可重現是 sha256 釘住的前提：CI 打的包，本機要能打出一模一樣的來驗。
  it('同一份原始碼打兩次得到同一個 sha256', () => {
    expect(second.sha, `zip 不可重現，差異處：\n${firstDifferingLines(first.listing, second.listing)}`).toBe(first.sha)
  })

  // Claude Code 只在 zip 頂層、或單一頂層資料夾底下找 .claude-plugin/，再深一層就裝不起來。
  it('.claude-plugin/plugin.json 在單一頂層資料夾底下', () => {
    const listing = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' }).trim().split('\n')
    const manifest = listing.filter((p) => p.endsWith('.claude-plugin/plugin.json'))
    expect(manifest).toEqual(['plugin/.claude-plugin/plugin.json'])

    const topLevels = new Set(listing.map((p) => p.split('/')[0]))
    expect([...topLevels]).toEqual(['plugin'])
  })

  // 2026-09-21：本機打的包比 CI 多一個 hooks/__pycache__/*.pyc，跨機器 sha256 因此
  // 永遠對不起來。改成以 git ls-files 為準後，本機殘留（.pyc、.DS_Store、編輯器暫存）
  // 就不可能混進去。這條測試守住「包內容 = commit 內容」。
  it('只含 git 追蹤的檔案，沒有本機殘留', () => {
    const tracked = new Set(
      execFileSync('git', ['ls-files', '--', 'plugin'], { cwd: REPO_ROOT, encoding: 'utf8' })
        .split('\n')
        .filter(Boolean),
    )
    const inZip = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' }).trim().split('\n')
    const untracked = inZip.filter((p) => !tracked.has(p))
    expect(untracked, '包裡有 git 沒追蹤的檔案').toEqual([])
  })

  it('不含產物目錄（會讓包變大又互相套娃）', () => {
    const listing = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    expect(listing).not.toMatch(/^plugin\/out\//m)
    expect(listing).not.toMatch(/node_modules/)
  })

  it('skills、hooks、templates 都在包裡', () => {
    const listing = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    expect(listing).toContain('plugin/skills/dev-task/SKILL.md')
    expect(listing).toContain('plugin/hooks/hooks.json')
    expect(listing).toContain('plugin/hooks/pre-pr-gate.sh')
    expect(listing).toContain('plugin/templates/central-issue.md')
  })
})

describe('release marketplace.json', () => {
  const mp = () => JSON.parse(readFileSync(join(RELEASE, 'marketplace.json'), 'utf8'))

  it('用 archive 來源——安裝不需要 git 或 npm，也不 clone monorepo', () => {
    expect(mp().plugins[0].source.source).toBe('archive')
  })

  it('archive URL 是 HTTPS（Claude Code 拒絕 http 與 loopback）', () => {
    expect(mp().plugins[0].source.url).toMatch(/^https:\/\//)
  })

  it('sha256 對得上實際的 zip', () => {
    expect(mp().plugins[0].source.sha256).toBe(firstSha)
  })

  it('宣告 version，否則改了 zip 使用者不會收到更新', () => {
    expect(mp().plugins[0].version).toBe(version)
  })
})

describe('settings 指向不需要 clone 的來源', () => {
  const settings = JSON.parse(readFileSync(join(REPO_ROOT, '.claude', 'settings.json'), 'utf8'))
  const mpRelease = () => JSON.parse(readFileSync(join(RELEASE, 'marketplace.json'), 'utf8'))

  it('marketplace 是 url 來源，不是 github/git（那兩種會 clone 整個 repo）', () => {
    expect(settings.extraKnownMarketplaces.daodao.source.source).toBe('url')
    expect(settings.extraKnownMarketplaces.daodao.source.url).toMatch(/^https:\/\//)
  })

  // repo 根的 marketplace.json 是「網頁平台」實際讀的檔案：claude.ai 的
  // 「Add marketplace → from a repository」與 ChatGPT 工作區的 Import marketplace
  // 都直接讀它。所以它必須跟 settings 指的散佈 marketplace 同名，本機開發則用
  // `--scope local` 覆蓋（local 設定優先於 project 設定）。
  it('repo marketplace 與散佈用的同名——本機開發靠 local scope 覆蓋', () => {
    const repo = JSON.parse(readFileSync(join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'))
    expect(repo.name).toBe('daodao')
    expect(Object.keys(settings.extraKnownMarketplaces)).toContain('daodao')
  })

  it('repo marketplace 同時列出完整版與網頁版', () => {
    const repo = JSON.parse(readFileSync(join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'))
    const byName = Object.fromEntries(repo.plugins.map((p: { name: string }) => [p.name, p]))
    expect(Object.keys(byName).sort()).toEqual(['daodao', 'daodao-web'])
    expect(byName['daodao'].source).toBe('./plugin')
    expect(byName['daodao-web'].source).toBe('./plugin/out/web-plugin')
  })

  it('repo marketplace 的來源都是相對路徑（網頁平台同步 repo 後才解析得到）', () => {
    const repo = JSON.parse(readFileSync(join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'))
    for (const plugin of repo.plugins) {
      expect(typeof plugin.source, `${plugin.name} 的 source 必須是相對路徑字串`).toBe('string')
      expect(plugin.source.startsWith('./')).toBe(true)
    }
  })

  it('網頁版 plugin 存在、是合法 manifest、且不含 hooks（ChatGPT 有 MCP/hooks 會被標 Desktop only）', () => {
    const web = join(REPO_ROOT, 'plugin', 'out', 'web-plugin')
    expect(existsSync(join(web, '.claude-plugin', 'plugin.json'))).toBe(true)
    expect(existsSync(join(web, 'skills'))).toBe(true)
    expect(existsSync(join(web, 'hooks'))).toBe(false)
    expect(existsSync(join(web, '.mcp.json'))).toBe(false)
    expect(existsSync(join(web, 'mcp.json'))).toBe(false)
  })

  // 第三方 marketplace 的 autoUpdate 預設是「關」的——沒開的話使用者裝完就凍在
  // 當下那版，之後所有修正都收不到，而且沒有任何提示。
  it('marketplace 有開 autoUpdate，否則使用者永遠停在安裝當下那版', () => {
    expect(settings.extraKnownMarketplaces.daodao.autoUpdate).toBe(true)
  })

  // version 是 archive 來源的更新訊號：宣告了 version 就以它為準，
  // 只換 zip 不 bump，已安裝的人會一直用舊快取。
  it('版號在 canonical 與各平台產物之間一致', () => {
    const web = JSON.parse(
      readFileSync(join(REPO_ROOT, 'plugin', 'out', 'web-plugin', '.claude-plugin', 'plugin.json'), 'utf8'),
    )
    const openai = JSON.parse(
      readFileSync(join(REPO_ROOT, 'plugin', 'out', 'openai-plugin', 'plugin.json'), 'utf8'),
    )
    expect(web.version).toBe(version)
    expect(openai.version).toBe(version)
    expect(mpRelease().plugins[0].version).toBe(version)
  })

  it('release workflow 遇到已發佈的版號會跳過，不覆蓋已釘 sha256 的資產', () => {
    const wf = readFileSync(join(REPO_ROOT, '.github', 'workflows', 'plugin-release.yml'), 'utf8')
    expect(wf).toContain('gh release view')
    expect(wf).toMatch(/exists.*==.*'false'/)
  })

  it('release workflow 存在且會產生 settings 指到的那個資產', () => {
    const wf = readFileSync(join(REPO_ROOT, '.github', 'workflows', 'plugin-release.yml'), 'utf8')
    expect(existsSync(join(REPO_ROOT, '.github', 'workflows', 'plugin-release.yml'))).toBe(true)
    expect(wf).toContain('marketplace.json')
    expect(settings.extraKnownMarketplaces.daodao.source.url).toContain('releases/latest/download/marketplace.json')
  })
})
