/**
 * Thin gh CLI wrappers for the board pipeline. All I/O lives here.
 */
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { BOARD, OWNER } from "./types.js";

function sh(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

export function warn(prefix: string, msg: string): void {
  process.stderr.write(`[${prefix}] WARN: ${msg}\n`);
}

// ── Board ──────────────────────────────────────────────────────────────

export interface BoardItem {
  itemId: string;
  status: string | null;
  issueNumber: number | null;
  repository: string | null;
  title: string;
}

export function listBoardItems(): BoardItem[] {
  const output = sh(
    `gh project item-list ${BOARD.projectNumber} --owner ${OWNER} --format json --limit 200`
  );
  const parsed = JSON.parse(output) as {
    items: Array<{
      id: string;
      status?: string;
      title?: string;
      content?: { type?: string; number?: number; repository?: string; title?: string };
    }>;
  };
  return parsed.items.map((it) => ({
    itemId: it.id,
    status: it.status ?? null,
    issueNumber: it.content?.number ?? null,
    repository: it.content?.repository ?? null,
    title: it.content?.title ?? it.title ?? "",
  }));
}

export function setBoardStatus(itemId: string, statusName: keyof typeof BOARD.statusOptions): void {
  sh(
    `gh project item-edit --project-id ${BOARD.projectId} --id ${itemId} ` +
      `--field-id ${BOARD.statusFieldId} --single-select-option-id ${BOARD.statusOptions[statusName]}`
  );
}

// ── Issues ─────────────────────────────────────────────────────────────

export interface IssueDetail {
  number: number;
  nodeId: string;
  title: string;
  body: string;
  state: string;
  labels: string[];
  url: string;
}

export function getIssue(repo: string, num: number): IssueDetail | null {
  try {
    const output = sh(
      `gh issue view ${num} --repo ${OWNER}/${repo} --json id,number,title,body,state,labels,url`
    );
    const d = JSON.parse(output) as {
      id: string; number: number; title: string; body: string; state: string;
      labels: Array<{ name: string }>; url: string;
    };
    return {
      number: d.number,
      nodeId: d.id,
      title: d.title,
      body: d.body ?? "",
      state: d.state,
      labels: d.labels.map((l) => l.name),
      url: d.url,
    };
  } catch {
    return null;
  }
}

export function createIssue(
  repo: string,
  title: string,
  body: string,
  labels: string[]
): string | null {
  const labelArgs = labels.map((l) => `--label "${l}"`).join(" ");
  const tmpFile = join(tmpdir(), `pipeline-${Date.now()}-${Math.random().toString(36).slice(2)}.md`);
  try {
    writeFileSync(tmpFile, body, "utf-8");
    return sh(
      `gh issue create --repo ${OWNER}/${repo} --title "${title.replace(/"/g, '\\"')}" ` +
        `--body-file "${tmpFile}" ${labelArgs}`
    );
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer })?.stderr?.toString?.() ?? String(err);
    warn("gh", `issue create failed in ${repo}: ${stderr}`);
    return null;
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

export function addLabels(repo: string, num: number, labels: string[]): void {
  const args = labels.map((l) => `--add-label "${l}"`).join(" ");
  sh(`gh issue edit ${num} --repo ${OWNER}/${repo} ${args}`);
}

export function commentIssue(repo: string, num: number, body: string): void {
  const tmpFile = join(tmpdir(), `pipeline-comment-${Date.now()}.md`);
  try {
    writeFileSync(tmpFile, body, "utf-8");
    sh(`gh issue comment ${num} --repo ${OWNER}/${repo} --body-file "${tmpFile}"`);
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

export function closeIssue(repo: string, num: number, comment: string): void {
  sh(
    `gh issue close ${num} --repo ${OWNER}/${repo} --comment "${comment.replace(/"/g, '\\"')}"`
  );
}

export function getIssueComments(
  repo: string,
  num: number
): Array<{ body: string; createdAt: string }> {
  try {
    const output = sh(
      `gh issue view ${num} --repo ${OWNER}/${repo} --json comments --jq '[.comments[] | {body, createdAt}]'`
    );
    return JSON.parse(output) as Array<{ body: string; createdAt: string }>;
  } catch {
    return [];
  }
}

/** Best-effort: attach mirror issue as a native sub-issue of the central issue. */
export function addSubIssue(parentNodeId: string, childNodeId: string): boolean {
  try {
    sh(
      `gh api graphql -H "GraphQL-Features: sub_issues" ` +
        `-f query='mutation($p: ID!, $c: ID!) { addSubIssue(input: {issueId: $p, subIssueId: $c}) { issue { id } } }' ` +
        `-f p='${parentNodeId}' -f c='${childNodeId}'`
    );
    return true;
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer })?.stderr?.toString?.() ?? String(err);
    warn("gh", `addSubIssue failed: ${stderr}`);
    return false;
  }
}

/** Find issues in a repo whose body references the central issue (exact-matched by caller). */
export function searchIssuesByParent(
  repo: string,
  centralIssueNumber: number
): Array<{ number: number; title: string; state: string; url: string; body: string }> {
  try {
    const output = sh(
      `gh issue list --repo ${OWNER}/${repo} --state all ` +
        `--search "\\"Parent: ${OWNER}/daodao#${centralIssueNumber}\\" in:body" ` +
        `--json number,title,state,url,body --limit 100`
    );
    return JSON.parse(output) as Array<{
      number: number; title: string; state: string; url: string; body: string;
    }>;
  } catch {
    return [];
  }
}

// ── PRs ────────────────────────────────────────────────────────────────

export interface MergedPR {
  repo: string;
  number: number;
  title: string;
  url: string;
  body: string;
}

export function listMergedAutoPRs(repo: string, sinceIso: string): MergedPR[] {
  try {
    const output = sh(
      `gh pr list --repo ${OWNER}/${repo} --state merged --label auto ` +
        `--json number,title,mergedAt,url,body --limit 100 ` +
        `--jq '[.[] | select(.mergedAt >= "${sinceIso}")]'`
    );
    const prs = JSON.parse(output) as Array<{
      number: number; title: string; url: string; body: string;
    }>;
    return prs.map((pr) => ({ repo, ...pr, body: pr.body ?? "" }));
  } catch {
    return [];
  }
}
