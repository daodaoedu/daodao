import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SCRIPT = resolve(import.meta.dirname, '..', '..', 'skills', 'develop', 'references', 'verify-report', 'upload-report.py')

function rewrite(html: string, lsjson: unknown[]) {
  const dir = mkdtempSync(join(tmpdir(), 'verify-report-'))
  writeFileSync(join(dir, 'report.html'), html)
  writeFileSync(join(dir, 'ids.json'), JSON.stringify(lsjson))
  return spawnSync('python3', [SCRIPT, 'rewrite', '--html', join(dir, 'report.html'), '--ids', join(dir, 'ids.json')], {
    encoding: 'utf8',
  })
}

describe('verify report 上傳腳本：截圖網址替換', () => {
  const lsjson = [
    { Name: 'a.png', ID: 'ID_A', IsDir: false },
    { Name: 'b c.png', ID: 'ID_B', IsDir: false },
  ]

  it('evidence/ 的截圖換成 Drive 嵌入網址，其他內容不動', () => {
    const r = rewrite(`<h3>登入</h3><img src="evidence/a.png" width="480"><img src='evidence/b c.png'><a href="evidence/a.png">原圖</a>`, lsjson)
    expect(r.status).toBe(0)
    expect(r.stdout).toBe(
      `<h3>登入</h3><img src="https://drive.google.com/uc?export=view&id=ID_A" width="480"><img src='https://drive.google.com/uc?export=view&id=ID_B'><a href="evidence/a.png">原圖</a>`,
    )
  })

  it('引用了沒上傳的截圖就失敗並列出檔名，不產出缺圖的報告', () => {
    const r = rewrite('<img src="evidence/a.png"><img src="evidence/missing.png">', lsjson)
    expect(r.status).not.toBe(0)
    expect(r.stdout).toBe('')
    expect(r.stderr).toContain('missing.png')
  })
})
