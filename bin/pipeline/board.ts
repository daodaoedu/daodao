#!/usr/bin/env node
/**
 * Planning board (org project 10) status CLI — the manual counterpart of Routine C.
 *
 * Usage:
 *   pnpm tsx bin/pipeline/board.ts set <issue#> <status> [--category <類別>] [--add-label x]... [--remove-label y]... [--dry-run]
 *   pnpm tsx bin/pipeline/board.ts category <issue#> <類別> [--dry-run]
 *   pnpm tsx bin/pipeline/board.ts remove <issue#> [--dry-run]
 *   pnpm tsx bin/pipeline/board.ts audit [--json] [--stale-days <n>]
 *   pnpm tsx bin/pipeline/board.ts pending [--json]   # 唯讀：Review／Acceptance／Need Fix 各卡在等誰決定什麼，附最新證據連結
 *
 * Status accepts aliases: todo | ready | wip / "in progress" | review | accept / acceptance |
 * needfix / "need fix" | done.
 * 類別 accepts 產品功能 | 產品 Bug | 工程流程 | 技術債／維運 | 清單／報告 and short aliases
 * (功能/feature, bug, 工程/eng, 技術債/維運/debt, 清單/報告/list); see CATEGORY_ALIASES.
 * `set` adds the issue to the board first if it is not there yet; `set <n> accept` also
 * assigns the PM (PM_LOGIN) so the card shows up in their queue.
 * Called by develop (start → In Progress, finish → Review), verify-deploy
 * (dev smoke passed → Acceptance, failed → Need Fix), collect-pr-feedback (→ Need Fix)
 * and request-feature (→ Todo). Done comes from the PM closing the issue (built-in workflow).
 */
import { auditCards, pendingDecisions, resolveCategory, resolveStatus, type AuditCard, type PendingCard } from "./lib.js";
import {
  addBoardItem,
  addIssueAssignees,
  editIssueLabels,
  findBoardItemForIssue,
  getCentralIssueLinks,
  getIssueAssignees,
  getIssueComments,
  listBoardItemsLite,
  removeBoardItem,
  setBoardCategory,
  setBoardStatus,
} from "./gh.js";
import {
  BOARD,
  CATEGORY_ALIASES,
  CENTRAL_REPO,
  DEAD_LABELS,
  OWNER,
  PM_LOGIN,
  STATUS_ALIASES,
  type BoardCategory,
  type BoardStatus,
} from "./types.js";

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

/** Resolve a 類別 argument or exit before anything is written. */
function categoryArg(input: string): BoardCategory {
  const category = resolveCategory(input, CATEGORY_ALIASES) as BoardCategory | null;
  if (!category) die(`類別「${input}」不存在，可用：${Object.keys(BOARD.categoryOptions).join(" | ")}`);
  return category;
}

function cmdSet(): void {
  const num = parseInt(argv[1] ?? "", 10);
  const statusName = resolveStatus(argv[2] ?? "", STATUS_ALIASES) as BoardStatus | null;
  if (!num || !statusName) {
    die(`usage: board.ts set <issue#> <status>  (status ∈ ${Object.keys(BOARD.statusOptions).join(" | ")})`);
  }
  if (!BOARD.statusOptions[statusName]) {
    die(`Status「${statusName}」還沒有 option id：先到 board 設定頁新增選項，再填進 bin/pipeline/types.ts`);
  }
  const categoryInput = optValues("--category")[0];
  const category = categoryInput === undefined ? null : categoryArg(categoryInput);
  const add = optValues("--add-label");
  const remove = optValues("--remove-label");
  const assign = statusName === "Acceptance" ? [PM_LOGIN] : [];

  let item = findItem(num);
  const tag = DRY_RUN ? "[dry-run] " : "";
  if (!item) {
    console.log(`${tag}#${num} 不在 board，先加入`);
    if (!DRY_RUN) {
      const url = `https://github.com/${OWNER}/${CENTRAL_REPO}/issues/${num}`;
      item = { itemId: addBoardItem(url), status: null, category: null, url };
    }
  }
  // Assign first: if it fails the card has not moved, so Acceptance never sits without its PM
  if (assign.length) {
    console.log(`${tag}#${num} assignees +[${assign.join(",")}]`);
    if (!DRY_RUN) addIssueAssignees(CENTRAL_REPO, num, assign);
  }
  console.log(`${tag}#${num} ${item?.status ?? "(none)"} → ${statusName}`);
  if (!DRY_RUN && item) setBoardStatus(item.itemId, statusName);
  if (category) {
    console.log(`${tag}#${num} 類別 ${item?.category ?? "(none)"} → ${category}`);
    if (!DRY_RUN && item) setBoardCategory(item.itemId, category);
  }

  if (add.length || remove.length) {
    console.log(`${tag}#${num} labels +[${add.join(",")}] -[${remove.join(",")}]`);
    if (!DRY_RUN) editIssueLabels(CENTRAL_REPO, num, add, remove);
  }
  if (!DRY_RUN) {
    const after = findItem(num);
    if (after?.status !== statusName) die(`回讀失敗：#${num} 目前 status=${after?.status}`);
    if (category && after.category !== category) die(`回讀失敗：#${num} 目前類別=${after.category}`);
    const assignees = assign.length ? getIssueAssignees(CENTRAL_REPO, num) : [];
    const missing = assign.filter((a) => !assignees.includes(a));
    if (missing.length) die(`回讀失敗：#${num} 未指派 ${missing.join(",")}`);
    console.log(
      `#${num} 回讀 OK：${after.status}${category ? `，類別 ${category}` : ""}${assign.length ? `，assignee 含 ${assign.join(",")}` : ""}`
    );
  }
}

function cmdCategory(): void {
  const num = parseInt(argv[1] ?? "", 10);
  if (!num || !argv[2]) die(`usage: board.ts category <issue#> <類別>  (類別 ∈ ${Object.keys(BOARD.categoryOptions).join(" | ")})`);
  const category = categoryArg(argv[2]);
  const item = findItem(num);
  if (!item) die(`#${num} 不在 board：用 board.ts set ${num} todo --category ${category} 加入`);
  console.log(`${DRY_RUN ? "[dry-run] " : ""}#${num} 類別 ${item.category ?? "(none)"} → ${category}`);
  if (DRY_RUN) return;
  setBoardCategory(item.itemId, category);
  const after = findItem(num);
  if (after?.category !== category) die(`回讀失敗：#${num} 目前類別=${after?.category}`);
  console.log(`#${num} 回讀 OK：類別 ${category}`);
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
  // Return comments are only judged for Need Fix cards (#338)
  const comments = getIssueComments(
    items.filter((it) => it.status === "Need Fix").map((it) => it.issueNumber!)
  );
  const cards: AuditCard[] = items.map((it) => {
    const l = links.get(it.issueNumber!);
    return {
      number: it.issueNumber!,
      title: it.title,
      status: it.status,
      issueState: l?.state ?? "OPEN",
      labels: l?.labels ?? [],
      assignees: l?.assignees ?? [],
      subIssues: l?.subIssues,
      parent: l?.parent,
      foreignSubIssues: l?.foreignSubIssues,
      updatedAt: l?.updatedAt ?? new Date(0).toISOString(),
      statusUpdatedAt: it.statusUpdatedAt,
      category: it.category,
      prs: l?.prs ?? [],
      comments: comments.get(it.issueNumber!),
      labelAddedAt: l?.labelAddedAt,
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

const WAITS_ON_LABEL = { reviewer: "等 reviewer", engineer: "等工程", pm: "等 PM" } as const;

function cmdPending(): void {
  const columns = ["Review", "Acceptance", "Need Fix"];
  const items = listBoardItemsLite().filter(
    (it) => it.issueNumber !== null && (it.repository ?? "").endsWith(`/${CENTRAL_REPO}`) && columns.includes(it.status ?? "")
  );
  const nums = items.map((it) => it.issueNumber!);
  const links = getCentralIssueLinks(nums);
  const comments = getIssueComments(nums, 30);
  const cards: PendingCard[] = items.map((it) => {
    const l = links.get(it.issueNumber!);
    return {
      number: it.issueNumber!,
      title: it.title,
      status: it.status,
      labels: l?.labels ?? [],
      statusUpdatedAt: it.statusUpdatedAt,
      prs: l?.prs ?? [],
      subIssues: l?.subIssues ?? { total: 0, completed: 0 },
      comments: comments.get(it.issueNumber!) ?? [],
    };
  });
  const decisions = pendingDecisions(cards, new Date());
  if (argv.includes("--json")) {
    console.log(JSON.stringify({ total: cards.length, decisions }, null, 2));
    return;
  }
  console.log(`Review／Acceptance／Need Fix 共 ${cards.length} 張，${decisions.length} 張在等人決定`);
  for (const who of ["reviewer", "engineer", "pm"] as const) {
    const rows = decisions.filter((d) => d.waitsOn === who);
    if (!rows.length) continue;
    console.log(`\n### ${WAITS_ON_LABEL[who]}（${rows.length}）\n`);
    console.log("| # | 欄位 | 等了幾個工作天 | 要決定什麼 | 證據 |");
    console.log("|---|---|---|---|---|");
    for (const d of rows) {
      const ev = d.evidence ? `[${d.evidence.label}](${d.evidence.url})` : "—";
      console.log(`| #${d.number} ${d.title.slice(0, 24)} | ${d.status} | ${d.waitingDays ?? "?"} | ${d.decision} | ${ev} |`);
    }
  }
}

switch (cmd) {
  case "set":
    cmdSet();
    break;
  case "category":
    cmdCategory();
    break;
  case "remove":
    cmdRemove();
    break;
  case "audit":
    cmdAudit();
    break;
  case "pending":
    cmdPending();
    break;
  default:
    die("usage: board.ts <set|category|remove|audit|pending> ...");
}
