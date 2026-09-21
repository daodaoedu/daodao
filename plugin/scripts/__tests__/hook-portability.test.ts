import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const HOOKS = resolve(import.meta.dirname, '..', '..', 'hooks')
const scratch: string[] = []

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true })
})

/** 跑一支 hook，回傳 exit code 與合併輸出。stdin 一律給（空字串代表沒有）。 */
function runHook(script: string, opts: { env?: Record<string, string>; stdin?: string; cwd?: string }) {
  try {
    const stdout = execFileSync('bash', [join(HOOKS, script)], {
      input: opts.stdin ?? '',
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { code: 0, out: stdout }
  } catch (e: any) {
    return { code: e.status as number, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

/** 印出正規化後的三個變數，用來比對兩種 harness 輸入是否等價。 */
function probeNormalize(opts: { env?: Record<string, string>; stdin?: string }) {
  const script = `
set -uo pipefail
source "${HOOKS}/lib.sh"
hook_normalize_input
printf 'NAME=%s\\n' "$HOOK_TOOL_NAME"
printf 'INPUT=%s\\n' "$(printf '%s' "$HOOK_TOOL_INPUT" | jq -cS . 2>/dev/null || printf '%s' "$HOOK_TOOL_INPUT")"
`
  try {
    return execFileSync('bash', ['-c', script], {
      input: opts.stdin ?? '',
      env: { ...process.env, ...opts.env },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (e: any) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`
  }
}

describe('hook_normalize_input：Claude Code 與 Codex 兩種輸入要等價', () => {
  const toolInput = { file_path: '/tmp/x.ts', content: 'const a = 1' }

  it('env var（Claude Code）與 stdin 事件（Codex）解析出同一組值', () => {
    const viaEnv = probeNormalize({
      env: { CLAUDE_TOOL_NAME: 'Write', CLAUDE_TOOL_INPUT: JSON.stringify(toolInput) },
    })
    const viaStdin = probeNormalize({
      stdin: JSON.stringify({ tool_name: 'Write', tool_input: toolInput }),
    })

    expect(viaEnv).toContain('NAME=Write')
    expect(viaEnv.trim()).toBe(viaStdin.trim())
  })

  it('camelCase 的 Codex 欄位也認得', () => {
    const out = probeNormalize({ stdin: JSON.stringify({ toolName: 'Edit', toolInput: toolInput }) })
    expect(out).toContain('NAME=Edit')
    expect(out).toContain('"file_path":"/tmp/x.ts"')
  })

  it('兩邊都沒給輸入時不爆炸（unbound variable 迴歸）', () => {
    const out = probeNormalize({})
    expect(out).not.toContain('unbound variable')
    expect(out).toContain('NAME=')
  })
})

describe('pre-pr-gate：兩種 harness 下都要真的擋', () => {
  function fakeTask(status: string) {
    const root = mkdtempSync(join(tmpdir(), 'daodao-gate-'))
    scratch.push(root)
    const repoDir = join(root, 'worktrees', '999-fake', 'daodao-f2e')
    mkdirSync(repoDir, { recursive: true })
    writeFileSync(join(root, 'worktrees', '999-fake', 'task.md'), `Status: ${status}\n\n## 驗證\n\n- [ ] 還沒驗\n`)
    return repoDir
  }

  const prCommand = { command: 'gh pr create --title x' }

  it('Claude Code 輸入：未 verified 的任務發 PR 會被擋（exit 2）', () => {
    const cwd = fakeTask('in-progress')
    const r = runHook('pre-pr-gate.sh', {
      cwd,
      env: { CLAUDE_TOOL_NAME: 'Bash', CLAUDE_TOOL_INPUT: JSON.stringify(prCommand), CLAUDE_WORKING_DIRECTORY: cwd },
    })
    expect(r.code).toBe(2)
    expect(r.out).toContain('Status')
  })

  it('Codex 輸入：同一個任務、同一個指令，也要擋（exit 2）', () => {
    const cwd = fakeTask('in-progress')
    const r = runHook('pre-pr-gate.sh', {
      cwd,
      stdin: JSON.stringify({ tool_name: 'Bash', tool_input: prCommand, cwd }),
    })
    expect(r.code).toBe(2)
    expect(r.out).toContain('Status')
  })

  it('不是發 PR 的指令一律放行', () => {
    const cwd = fakeTask('in-progress')
    const r = runHook('pre-pr-gate.sh', {
      cwd,
      stdin: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'ls -la' }, cwd }),
    })
    expect(r.code).toBe(0)
  })
})
