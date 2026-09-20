#!/usr/bin/env node
/**
 * Planning board (org project 10) status CLI — the manual counterpart of Routine C.
 *
 * Usage:
 *   pnpm tsx bin/pipeline/board.ts set <issue#> <status> [--add-label x]... [--remove-label y]... [--dry-run]
 *   pnpm tsx bin/pipeline/board.ts remove <issue#> [--dry-run]
 *   pnpm tsx bin/pipeline/board.ts audit [--json] [--stale-days <n>]
 *
 * Status accepts aliases: todo | ready | wip / "in progress" | review | needfix / "need fix" | done.
 * `set` adds the issue to the board first if it is not there yet.
 * Called by dev-task (start → In Progress, finish → Review), post-merge-wrapup (→ Done),
 * collect-pr-feedback (→ Need Fix) and gh-card (→ Todo).
 */
import { auditCards, resolveStatus, type AuditCard } from "./lib.js";
import {
  addBoardItem,
  editIssueLabels,
  findBoardItemForIssue,
  getCentralIssueLinks,
  listBoardItemsLite,
  removeBoardItem,
  setBoardStatus,
} from "./gh.js";
import { BOARD, CENTRAL_REPO, DEAD_LABELS, OWNER, STATUS_ALIASES, type BoardStatus } from "./types.js";

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const cmd = argv[0];

function optValues(flag: string): string[] {
  const vals: string[] = [];
  argv.forEach((a, i) => {
    if (a === flag && argv[i + 1]) vals.push(argv[i + 1]!);
  });
  return vals;
}

function die(msg: string): never {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

const findItem = findBoardItemForIssue;

function cmdSet(): void {
  const num = parseInt(argv[1] ?? "", 10);
  const statusName = resolveStatus(argv[2] ?? "", STATUS_ALIASES) as BoardStatus | null;
  if (!num || !statusName) {
    die(`usage: board.ts set <issue#> <status>  (status ∈ ${Object.keys(BOARD.statusOptions).join(" | ")})`);
  }
  const add = optValues("--add-label");
  const remove = optValues("--remove-label");

  let item = findItem(num);
  const tag = DRY_RUN ? "[dry-run] " : "";
  if (!item) {
    console.log(`${tag}#${num} 不在 board，先加入`);
    if (!DRY_RUN) {
      const url = `https://github.com/${OWNER}/${CENTRAL_REPO}/issues/${num}`;
      item = { itemId: addBoardItem(url), status: null, url };
    }
  }
  console.log(`${tag}#${num} ${item?.status ?? "(none)"} → ${statusName}`);
  if (!DRY_RUN && item) setBoardStatus(item.itemId, statusName);

  if (add.length || remove.length) {
    console.log(`${tag}#${num} labels +[${add.join(",")}] -[${remove.join(",")}]`);
    if (!DRY_RUN) editIssueLabels(CENTRAL_REPO, num, add, remove);
  }
  if (!DRY_RUN) {
    const after = findItem(num);
    if (after?.status !== statusName) die(`回讀失敗：#${num} 目前 status=${after?.status}`);
    console.log(`#${num} 回讀 OK：${after.status}`);
  }
}

function cmdRemove(): void {
  const num = parseInt(argv[1] ?? "", 10);
  if (!num) die("usage: board.ts remove <issue#>");
  const item = findItem(num);
  if (!item) die(`#${num} 不在 board`);
  console.log(`${DRY_RUN ? "[dry-run] " : ""}#${num} 從 board 移除（issue 保留）`);
  if (!DRY_RUN) removeBoardItem(item.itemId);
}

function cmdAudit(): void {
  const staleDays = parseInt(optValues("--stale-days")[0] ?? "3", 10);
  const items = listBoardItemsLite().filter(
    (it) => it.issueNumber !== null && (it.repository ?? "").endsWith(`/${CENTRAL_REPO}`)
  );
  const links = getCentralIssueLinks(items.map((it) => it.issueNumber!));
  const cards: AuditCard[] = items.map((it) => {
    const l = links.get(it.issueNumber!);
    return {
      number: it.issueNumber!,
      title: it.title,
      status: it.status,
      issueState: l?.state ?? "OPEN",
      labels: l?.labels ?? [],
      updatedAt: l?.updatedAt ?? new Date(0).toISOString(),
      prs: l?.prs ?? [],
    };
  });
  const findings = auditCards(cards, DEAD_LABELS, new Date(), staleDays);

  if (argv.includes("--json")) {
    console.log(JSON.stringify({ total: cards.length, findings }, null, 2));
    return;
  }
  const counts: Record<string, number> = {};
  for (const c of cards) counts[c.status ?? "(none)"] = (counts[c.status ?? "(none)"] ?? 0) + 1;
  console.log(`Board：${cards.length} 張　${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" / ")}`);
  if (findings.length === 0) {
    console.log("✅ 沒有狀態落差");
    return;
  }
  console.log(`\n⚠️  ${findings.length} 項落差\n`);
  console.log("| # | Board | 問題 | 建議 |");
  console.log("|---|---|---|---|");
  for (const f of findings) {
    console.log(`| #${f.number} ${f.title.slice(0, 24)} | ${f.status ?? "(none)"} | ${f.problem} | ${f.suggest} |`);
  }
}

switch (cmd) {
  case "set":
    cmdSet();
    break;
  case "remove":
    cmdRemove();
    break;
  case "audit":
    cmdAudit();
    break;
  default:
    die("usage: board.ts <set|remove|audit> ...");
}
