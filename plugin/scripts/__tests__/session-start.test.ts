import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const HOOK = resolve(import.meta.dirname, '..', '..', 'hooks', 'session-start.sh')
const scratch: string[] = []

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true })
})

/**
 * 建一個假的 monorepo root：worktrees/<task>/task.md，checkout=true 時多一個帶 .git 檔的 repo 目錄。
 * ageDays 把 task.md（沒有 task.md 時是任務資料夾）的修改時間設成幾天前。
 */
function fakeRoot(tasks: { name: string; taskMd?: string; checkout?: boolean; ageDays?: number }[]) {
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
    if (t.ageDays !== undefined) {
      const when = new Date(Date.now() - t.ageDays * 86_400_000)
      utimesSync(t.taskMd !== undefined ? join(dir, 'task.md') : dir, when, when)
    }
  }
  return root
}

/** 輸出裡逐列的任務名稱（「   <name> → <status>」那幾行），依輸出順序。 */
function listedTasks(out: string) {
  return out
    .split('\n')
    .map((line) => /^ {3}(\S+) → /.exec(line)?.[1])
    .filter((name): name is string => Boolean(name))
}

function runHook(cwd: string, args: string[] = []) {
  const home = mkdtempSync(join(tmpdir(), 'daodao-session-start-home-'))
  scratch.push(home)
  return execFileSync('bash', [HOOK, ...args], {
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

describe('session-start：只逐列真正在進行的任務', () => {
  it('終態（merged-…-closed、complete、completed、done、closed）不逐列，只計數；單純 merged 仍列出', () => {
    const root = fakeRoot([
      { name: '401-open', checkout: true, taskMd: '## Status\nin-review\n' },
      { name: '402-merged-only', checkout: true, taskMd: '## Status\nmerged\n' },
      { name: '403-acceptance', checkout: true, taskMd: '## Status\nAcceptance — 等PM範本驗收\n' },
      { name: '411-t', checkout: true, taskMd: '## Status\nmerged-dev-engineering-accepted-closed\n' },
      { name: '412-t', checkout: true, taskMd: '## Status\ncomplete — dev-deployed/engineering-accepted/issue-closed\n' },
      { name: '413-t', checkout: true, taskMd: 'Status: completed-all-four-prs-merged\n' },
      { name: '414-t', checkout: true, taskMd: '## Status\nDone — 使用者確認改工程驗收\n' },
      { name: '415-t', checkout: true, taskMd: '- Status: closed-engineering-accepted\n' },
    ])
    const out = runHook(root)
    expect(listedTasks(out).sort()).toEqual(['401-open', '402-merged-only', '403-acceptance'])
    expect(out).toContain('進行中的任務 (3)')
    expect(out).toContain('另有 5 個任務已結案')
  })

  it('清單項格式「- Status: xxx」讀得到狀態', () => {
    const root = fakeRoot([{ name: '548-feed', checkout: true, taskMd: '# Task\n\n- Issue: 548\n- Status: in-review\n' }])
    expect(runHook(root)).toContain('548-feed → in-review')
  })

  it('task.md 超過 14 天沒動的不逐列，但有計數', () => {
    const root = fakeRoot([
      { name: '500-fresh', checkout: true, taskMd: '## Status\nimplementing\n', ageDays: 1 },
      { name: '501-edge', checkout: true, taskMd: '## Status\nin-review\n', ageDays: 13 },
      { name: '502-old', checkout: true, taskMd: '## Status\nin-review\n', ageDays: 15 },
      { name: '503-older', checkout: true, taskMd: '## Status\nverified\n', ageDays: 90 },
    ])
    const out = runHook(root)
    expect(listedTasks(out)).toEqual(['500-fresh', '501-edge'])
    expect(out).toContain('另有 2 個任務超過 14 天沒動')
  })

  it('14 天內有動的超過 30 個時只列最近動過的 30 個，其餘計數', () => {
    const tasks = Array.from({ length: 35 }, (_, i) => ({
      name: `task-${String(i + 1).padStart(2, '0')}`,
      checkout: true,
      taskMd: '## Status\nin-review\n',
      // task-01 最近（1 小時前），task-35 最舊（35 小時前）
      ageDays: (i + 1) / 24,
    }))
    const out = runHook(fakeRoot(tasks))
    const listed = listedTasks(out)
    expect(listed).toHaveLength(30)
    expect(listed[0]).toBe('task-01')
    expect(listed[29]).toBe('task-30')
    expect(listed).not.toContain('task-31')
    expect(out).toContain('另有 5 個也在 14 天內有動')
  })

  it('沒有 task.md 的資料夾不會讓 hook 壞掉：舊的計入沒動、無 checkout 的計入只剩紀錄', () => {
    const root = fakeRoot([
      { name: '600-active', checkout: true, taskMd: '## Status\nimplementing\n' },
      { name: 'no-md-recent', checkout: true },
      { name: 'no-md-old', checkout: true, ageDays: 40 },
      { name: 'no-md-no-checkout' },
    ])
    const out = runHook(root)
    expect(listedTasks(out).sort()).toEqual(['600-active', 'no-md-recent'])
    expect(out).toContain('no-md-recent → (no task.md)')
    expect(out).toContain('另有 1 個任務超過 14 天沒動')
    expect(out).toContain('另有 1 個任務只剩紀錄')
    expect(out).not.toMatch(/unbound variable|syntax error|No such file/)
  })

  it('最後給總數與查完整清單的指令；--all-tasks 列出被收起來的任務', () => {
    const root = fakeRoot([
      { name: '700-active', checkout: true, taskMd: '## Status\nimplementing\n' },
      { name: '701-old', checkout: true, taskMd: '## Status\nin-review\n', ageDays: 30 },
      { name: '702-closed', checkout: true, taskMd: '## Status\ndone\n' },
    ])
    const out = runHook(root)
    expect(out).toContain('共 3 個任務資料夾')
    expect(out).toContain(`bash "${HOOK}" --all-tasks`)
    expect(listedTasks(runHook(root, ['--all-tasks'])).sort()).toEqual(['700-active', '701-old', '702-closed'])
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

/** 建真的 git repo：plugin/skills 有兩個 commit，origin/main 指向較新那個；HEAD 停在 headAtOld 指定的位置。 */
function gitRoot(headAtOld: boolean) {
  const root = mkdtempSync(join(tmpdir(), 'daodao-session-start-git-'))
  scratch.push(root)
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@localhost', ...args], { cwd: root, encoding: 'utf8' })
  git('init', '-q', '-b', 'main')
  mkdirSync(join(root, 'plugin', 'skills', 'review-change'), { recursive: true })
  writeFileSync(join(root, 'plugin', 'skills', 'review-change', 'SKILL.md'), 'old models\n')
  git('add', '.')
  git('commit', '-q', '-m', 'old')
  const oldSha = git('rev-parse', 'HEAD').trim()
  writeFileSync(join(root, 'plugin', 'skills', 'review-change', 'SKILL.md'), 'new models\n')
  git('commit', '-q', '-am', 'new')
  git('update-ref', 'refs/remotes/origin/main', 'HEAD')
  if (headAtOld) git('checkout', '-q', '-b', 'docs/stale-branch', oldSha)
  return root
}

describe('session-start：工作樹 skill 正本落後 main', () => {
  it('分支落後 origin/main 的 plugin/skills 時提示改用已安裝 plugin', () => {
    const out = runHook(gitRoot(true))
    expect(out).toContain('工作樹的 plugin/skills 落後 origin/main 1 個 commit（branch=docs/stale-branch）')
    expect(out).toContain('Skill tool daodao:<name>')
  })

  it('與 origin/main 同步時不提示', () => {
    expect(runHook(gitRoot(false))).not.toContain('落後 origin/main')
  })
})
