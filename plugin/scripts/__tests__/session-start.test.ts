import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const HOOK = resolve(import.meta.dirname, '..', '..', 'hooks', 'session-start.sh')
const scratch: string[] = []

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true })
})

/** 建一個假的 monorepo root：worktrees/<task>/task.md，checkout=true 時多一個帶 .git 檔的 repo 目錄。 */
function fakeRoot(tasks: { name: string; taskMd?: string; checkout?: boolean }[]) {
  const root = mkdtempSync(join(tmpdir(), 'daodao-session-start-'))
  scratch.push(root)
  for (const t of tasks) {
    const dir = join(root, 'worktrees', t.name)
    mkdirSync(dir, { recursive: true })
    if (t.taskMd !== undefined) writeFileSync(join(dir, 'task.md'), t.taskMd)
    if (t.checkout) {
      mkdirSync(join(dir, 'daodao-f2e'))
      writeFileSync(join(dir, 'daodao-f2e', '.git'), 'gitdir: /nowhere\n')
    }
  }
  return root
}

function runHook(cwd: string) {
  const home = mkdtempSync(join(tmpdir(), 'daodao-session-start-home-'))
  scratch.push(home)
  return execFileSync('bash', [HOOK], {
    input: '',
    env: { ...process.env, HOME: home, CLAUDE_WORKING_DIRECTORY: cwd },
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

describe('session-start：任務清單', () => {
  it('Status 讀 task-template 的「## Status」下一行，不是內文裡任意含 Status: 的句子', () => {
    const root = fakeRoot([
      {
        name: '183-challenge-card-fixes',
        checkout: true,
        taskMd: '# Task\n\n## Status\nimplementing\n\n## 驗證\n- 徽章 Status: ended（MOCKED）看文字\n',
      },
    ])
    const out = runHook(root)
    expect(out).toContain('183-challenge-card-fixes → implementing')
    expect(out).not.toContain('MOCKED')
  })

  it('舊格式「Status: xxx」單行仍讀得到', () => {
    const root = fakeRoot([{ name: 'legacy-task', checkout: true, taskMd: 'Status: verified\n' }])
    expect(runHook(root)).toContain('legacy-task → verified')
  })

  it('只列還有程式碼 checkout 的任務；只剩紀錄的任務收成一行數量', () => {
    const root = fakeRoot([
      { name: '300-active', checkout: true, taskMd: '## Status\nin-review\n' },
      { name: '138-merged-a', taskMd: '## Status\nin-review\n' },
      { name: '150-merged-b', taskMd: '## Status\nmerged\n' },
    ])
    const out = runHook(root)
    expect(out).toContain('進行中的任務 (1)')
    expect(out).toContain('300-active → in-review')
    expect(out).not.toContain('138-merged-a')
    expect(out).toContain('另有 2 個任務只剩紀錄')
  })

  it('有 checkout 但沒有 task.md 時標示出來', () => {
    const root = fakeRoot([{ name: 'probe-fix', checkout: true }])
    expect(runHook(root)).toContain('probe-fix → (no task.md)')
  })
})

describe('session-start：狀態詞後面的備註', () => {
  it('只顯示開頭的狀態詞，不把備註黏在一起', () => {
    const root = mkdtempSync(join(tmpdir(), 'daodao-session-start-'))
    scratch.push(root)
    const dir = join(root, 'worktrees', '295-challenge-space-fixes')
    mkdirSync(join(dir, 'daodao-f2e'), { recursive: true })
    writeFileSync(join(dir, 'daodao-f2e', '.git'), 'gitdir: /nowhere\n')
    writeFileSync(join(dir, 'task.md'), '## Status\nverified（停在 commit 前：未 commit／push）\n')
    const out = runHook(root)
    expect(out).toContain('295-challenge-space-fixes → verified\n')
  })
})
