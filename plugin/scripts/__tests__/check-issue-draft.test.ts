import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SCRIPT = resolve(import.meta.dirname, '..', '..', 'templates', 'check-issue-draft.py')
// #445 開卡時的原文：涉及 repo 是看名字猜的 admin-ui，實際頁面在 daodao-f2e
const ISSUE_445 = readFileSync(resolve(import.meta.dirname, 'fixtures', 'central-issue-445.md'), 'utf8')
const REPO_LINE = '- 涉及 repo：`daodao-admin-ui`；無 API 或部署順序相依'

function check(draft: string) {
  const dir = mkdtempSync(join(tmpdir(), 'issue-draft-'))
  writeFileSync(join(dir, 'draft.md'), draft)
  return spawnSync('python3', [SCRIPT, '--template', 'central', join(dir, 'draft.md')], { encoding: 'utf8' })
}

describe('開卡草稿檢查：涉及 repo 要有依據', () => {
  it('只寫 repo 名稱、沒有依據的草稿被擋下（#445 的情況）', () => {
    expect(ISSUE_445).toContain(REPO_LINE)
    const r = check(ISSUE_445)
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('涉及 repo')
  })

  it('附上程式碼路徑當依據就通過', () => {
    const r = check(
      ISSUE_445.replace(
        REPO_LINE,
        '- 涉及 repo：`daodao-f2e`（依據：`apps/product/src/app/[locale]/(lighthouse)/lighthouse/layout.tsx`）；無 API 或部署順序相依',
      ),
    )
    expect(r.stdout).toBe('')
    expect(r.status).toBe(0)
  })

  it('查不到時寫待確認也通過，不逼人猜', () => {
    const r = check(ISSUE_445.replace(REPO_LINE, '- 涉及 repo：待確認：網頁版讀不到程式碼，feature map 也沒有這個功能'))
    expect(r.stdout).toBe('')
    expect(r.status).toBe(0)
  })

  it('依據後面是空的不算', () => {
    const r = check(ISSUE_445.replace(REPO_LINE, '- 涉及 repo：`daodao-f2e`（依據：）'))
    expect(r.status).toBe(1)
  })

  it('整份草稿沒有涉及 repo 這一行也擋下', () => {
    const r = check(ISSUE_445.replace(`${REPO_LINE}\n`, ''))
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('涉及 repo')
  })
})
