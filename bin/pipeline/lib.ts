/**
 * Pure helpers for the GitHub board pipeline (no I/O — unit-testable).
 *
 * Only Routine C (board-sync) remains; Routine A／B helpers were retired on
 * 2026-09-20 (#241). Historical prompts and templates live under
 * docs/archive/automation/.
 */
import { CENTRAL_REPO, OWNER } from "./types.js";

const PARENT_RE = new RegExp(`Parent:\\s*${OWNER}/${CENTRAL_REPO}#(\\d+)`, "i");
const CLOSING_RE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;

/** Extract the central issue number from a mirror issue body ("Parent: daodaoedu/daodao#N"). */
export function parseParentIssue(body: string): number | null {
  const m = PARENT_RE.exec(body);
  return m ? parseInt(m[1]!, 10) : null;
}

/** Extract issue numbers referenced with closing keywords in a PR body. */
export function parseClosingIssues(body: string): number[] {
  const nums = new Set<number>();
  let m: RegExpExecArray | null;
  CLOSING_RE.lastIndex = 0;
  while ((m = CLOSING_RE.exec(body)) !== null) nums.add(parseInt(m[1]!, 10));
  return Array.from(nums);
}

export function buildProgressComment(done: number, total: number): string {
  return `⏳ Sub-repo 進度：${done}/${total}`;
}

export function buildAllDoneComment(mirrorUrls: string[]): string {
  return `✅ 所有 sub-repo 任務完成：
${mirrorUrls.map((u) => `- ${u}`).join("\n")}

Board 已移 Done，待驗收後請手動 close。`;
}
