#!/usr/bin/env node
/**
 * Routine A: Notion → GitHub Issue sync
 *
 * Usage:
 *   pnpm tsx bin/notion-sync/sync.ts [--dry-run]
 *
 * Env:
 *   NOTION_API_KEY   — Notion integration token
 *   NOTION_DB_ID     — Notion database ID
 *   GITHUB_TOKEN     — GitHub token (consumed by gh CLI)
 *   MIGRATION_MODE   — set to "relaxed" to use fallback values for missing fields
 */

import { execSync } from "child_process";
import { existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  createNotionClient,
  queryDatabase,
  updatePageProperty,
  extractProperty,
  fetchPageContent,
} from "./notion-client.js";
import {
  validateDatabaseSchema,
  assertSchemaValid,
} from "./schema-validate.js";
import { findExistingIssue, buildNotionLabel } from "./dedup.js";
import {
  NotionRowSchema,
  RELAXED_FALLBACKS,
  HIGH_RISK_REPOS,
  TARGET_REPOS,
  type NotionRow,
  type TargetRepo,
  type AutoMode,
  type Scope,
} from "./types.js";

const DRY_RUN = process.argv.includes("--dry-run");
const MIGRATION_MODE = process.env["MIGRATION_MODE"] ?? "";
const IS_RELAXED = MIGRATION_MODE === "relaxed";

const NOTION_API_KEY = process.env["NOTION_API_KEY"] ?? "";
const NOTION_DB_ID =
  process.env["NOTION_DB_ID"] ?? "3549cc8126978036803af61048468bde";

// Per-run limits (Risk #12)
const MAX_NEW_ISSUES_PER_RUN = 5;

function log(msg: string): void {
  process.stdout.write(`[notion-sync] ${msg}\n`);
}

function warn(msg: string): void {
  process.stderr.write(`[notion-sync] WARN: ${msg}\n`);
}

function shortId(pageId: string): string {
  return pageId.replace(/-/g, "").slice(0, 8);
}

interface ParseResult {
  row: NotionRow | null;
  warnings: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePage(page: any): ParseResult {
  const warnings: string[] = [];
  const id = page.id as string;
  const sid = shortId(id);

  const title = (extractProperty(page, "Task name") as string) ?? "";
  const status = (extractProperty(page, "Status") as string) ?? "";
  const syncToGitHub = extractProperty(page, "Sync to GitHub") as boolean | null;
  let autoMode = extractProperty(page, "Auto Mode") as string | null;
  let scope = extractProperty(page, "Scope") as string | null;
  const targetRepoRaw = extractProperty(page, "Target Repo") as string[] | string | null;
  const acceptanceCriteria = extractProperty(page, "Acceptance Criteria") as string | null;
  const githubIssueUrl = extractProperty(page, "GitHub Issue") as string | null;
  const labelsProp = extractProperty(page, "Labels") as string[] | null;

  // Normalise Target Repo: accept both legacy single string and new multi_select array
  const targetRepoArr: string[] = Array.isArray(targetRepoRaw)
    ? targetRepoRaw
    : targetRepoRaw
    ? [targetRepoRaw]
    : [];
  let targetRepos = targetRepoArr.filter((r) => TARGET_REPOS.includes(r as TargetRepo));

  // Validate required fields, apply relaxed fallbacks if needed
  if (!autoMode) {
    if (IS_RELAXED) {
      autoMode = RELAXED_FALLBACKS.autoMode;
      warnings.push(`Auto Mode missing — using fallback: ${autoMode}`);
    } else {
      process.stderr.write(
        `[notion-sync] FAIL: page ${id} missing "Auto Mode"\n`
      );
      process.exit(1);
    }
  }

  if (!scope) {
    if (IS_RELAXED) {
      scope = RELAXED_FALLBACKS.scope;
      warnings.push(`Scope missing — using fallback: ${scope}`);
    } else {
      process.stderr.write(`[notion-sync] FAIL: page ${id} missing "Scope"\n`);
      process.exit(1);
    }
  }

  if (targetRepos.length === 0) {
    if (IS_RELAXED) {
      targetRepos = RELAXED_FALLBACKS.targetRepos as string[];
      warnings.push(`Target Repo missing/invalid — using fallback: ${targetRepos.join(", ")}`);
    } else {
      process.stderr.write(
        `[notion-sync] FAIL: page ${id} missing/invalid "Target Repo"\n`
      );
      process.exit(1);
    }
  }

  const parsed = NotionRowSchema.safeParse({
    pageId: id,
    shortId: sid,
    title,
    status,
    syncToGitHub: syncToGitHub ?? false,
    autoMode,
    scope,
    targetRepos,
    acceptanceCriteria: acceptanceCriteria ?? undefined,
    githubIssueUrl: githubIssueUrl ?? undefined,
    labels: labelsProp ?? [],
  });

  if (!parsed.success) {
    warn(`page ${id} parse error: ${parsed.error.message}`);
    return { row: null, warnings };
  }

  return { row: parsed.data, warnings };
}

function buildIssueBody(row: NotionRow, targetRepo: string, fallbackWarnings: string[], pageBody?: string): string {
  const notionUrl = `https://www.notion.so/daodaolearn/${row.pageId.replace(/-/g, "")}`;
  const warningBlock =
    fallbackWarnings.length > 0
      ? `\n> ⚠️ 此 issue 由 fallback 預設值產生（relaxed mode）：${fallbackWarnings.join("；")}\n`
      : "";
  const highRiskNote = HIGH_RISK_REPOS.includes(targetRepo as TargetRepo)
    ? "\n> ⚠️ high-risk repo，自動執行限制為 plan-only\n"
    : "";
  const bodyBlock = pageBody ? `\n${pageBody}\n` : "";
  const acBlock = row.acceptanceCriteria
    ? `\n## Acceptance Criteria\n\n${row.acceptanceCriteria}\n`
    : "";

  return `<!-- managed by Routine A -->
${warningBlock}${highRiskNote}
## Description

${row.title}
${bodyBlock}${acBlock}
## Notion

${notionUrl}

---
*Auto-created by notion-sync. Notion page ID: \`${row.pageId}\`*
`;
}

function buildUmbrellaBody(row: NotionRow, subIssues: Array<{ repo: string; url: string }>, fallbackWarnings: string[], pageBody?: string): string {
  const notionUrl = `https://www.notion.so/daodaolearn/${row.pageId.replace(/-/g, "")}`;
  const warningBlock =
    fallbackWarnings.length > 0
      ? `\n> ⚠️ 此 issue 由 fallback 預設值產生（relaxed mode）：${fallbackWarnings.join("；")}\n`
      : "";
  const subIssueList = subIssues.map((i) => `- [ ] ${i.url}`).join("\n");
  const bodyBlock = pageBody ? `\n${pageBody}\n` : "";
  const acBlock = row.acceptanceCriteria
    ? `\n## Acceptance Criteria\n\n${row.acceptanceCriteria}\n`
    : "";

  return `<!-- managed by Routine A (umbrella) -->
${warningBlock}
## Description

${row.title}
${bodyBlock}
## Sub-issues

${subIssueList}
${acBlock}
## Notion

${notionUrl}

---
*Auto-created by notion-sync. Notion page ID: \`${row.pageId}\`*
`;
}

const VISUAL_KEYWORDS_ZH = ["排版", "間距", "樣式", "畫面", "手機", "響應式", "字型", "顏色", "圖示"];
const VISUAL_KEYWORDS_EN = ["layout", "spacing", "style", "css", "margin", "padding", "font", "color", "colour", "template", "mobile", "responsive", "email", "rwd", "icon", " ui "];

function isVisualTask(row: NotionRow): boolean {
  const haystack = `${row.title} ${row.acceptanceCriteria ?? ""}`.toLowerCase();
  return (
    VISUAL_KEYWORDS_ZH.some((k) => haystack.includes(k)) ||
    VISUAL_KEYWORDS_EN.some((k) => haystack.includes(k))
  );
}

function buildLabels(row: NotionRow, targetRepo: string, fallbackWarnings: string[]): string[] {
  const labels: string[] = [
    buildNotionLabel(row.shortId),
    "auto",
    row.autoMode === "manual" ? "manual" : `auto:${row.autoMode}`,
    `scope:${row.scope}`,
    `target-repo:${targetRepo}`,
  ];

  // High-risk repos: force plan-only regardless of Auto Mode
  if (
    HIGH_RISK_REPOS.includes(targetRepo as TargetRepo) &&
    row.autoMode !== "manual"
  ) {
    const idx = labels.indexOf("auto:auto-pr");
    if (idx !== -1) labels[idx] = "auto:plan-only";
  }

  if (fallbackWarnings.length > 0) {
    // Already noted in body; no extra label needed
  }

  if (isVisualTask(row)) {
    labels.push("visual");
  }

  return [...new Set(labels)];
}

function ghCreateIssue(repo: string, title: string, body: string, labels: string[]): string | null {
  const labelArgs = labels.map((l) => `--label "${l}"`).join(" ");

  // Ensure dynamic labels exist (ignore failures)
  for (const [lname, ldesc] of [
    [`notion:${labels.find(l => l.startsWith("notion:")) ?? ""}`, `Notion page`],
    ...labels.filter(l => l.startsWith("target-repo:")).map(l => [l, `Target repo`]),
  ] as [string, string][]) {
    if (!lname) continue;
    try {
      execSync(
        `gh label create "${lname}" --repo daodaoedu/${repo} --color "e4e669" --description "${ldesc}" --force`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      );
    } catch (e: unknown) {
      const msg = (e as { stderr?: Buffer })?.stderr?.toString?.() ?? String(e);
      warn(`gh label create "${lname}" in ${repo} failed: ${msg}`);
    }
  }

  const tmpFile = join(tmpdir(), `notion-sync-${Date.now()}.md`);
  try {
    writeFileSync(tmpFile, body, "utf-8");
    const output = execSync(
      `gh issue create --repo daodaoedu/${repo} --title "${title.replace(/"/g, '\\"')}" --body-file "${tmpFile}" ${labelArgs}`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return output.trim();
  } catch (err: unknown) {
    const spawnErr = err as { stderr?: Buffer };
    const stderr = spawnErr?.stderr?.toString?.() ?? "";
    warn(`gh issue create failed in ${repo}: ${stderr || err}`);
    return null;
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

async function createIssuesForRow(
  row: NotionRow,
  fallbackWarnings: string[],
  dryRun: boolean,
  pageBody?: string
): Promise<{ created: boolean; notionUrl: string | null }> {
  const isMulti = row.targetRepos.length > 1;

  if (dryRun) {
    for (const repo of row.targetRepos) {
      const labels = buildLabels(row, repo, fallbackWarnings);
      log(`[dry-run] would create issue in daodaoedu/${repo}: "${row.title}" labels=${labels.join(",")}`);
    }
    if (isMulti) log(`[dry-run] would create umbrella issue in daodaoedu/daodao`);
    return { created: false, notionUrl: null };
  }

  const subIssues: Array<{ repo: string; url: string }> = [];
  let anyNew = false;

  for (const repo of row.targetRepos) {
    const existing = findExistingIssue(repo, row.shortId);
    if (existing) {
      log(`⏭️ issue already exists in ${repo} (#${existing.number}) — skip`);
      subIssues.push({ repo, url: `https://github.com/daodaoedu/${repo}/issues/${existing.number}` });
      continue;
    }

    const body = buildIssueBody(row, repo, fallbackWarnings, pageBody);
    const labels = buildLabels(row, repo, fallbackWarnings);
    const url = ghCreateIssue(repo, row.title, body, labels);
    if (url) {
      log(`✅ ${repo} → ${url}`);
      subIssues.push({ repo, url });
      anyNew = true;
    } else {
      warn(`❌ failed to create issue in ${repo}`);
    }
  }

  if (subIssues.length === 0) return { created: false, notionUrl: null };

  // Single repo: write sub-issue URL directly to Notion
  if (!isMulti) {
    return { created: anyNew, notionUrl: subIssues[0]!.url };
  }

  // Multi-repo: create umbrella issue in daodao monorepo
  const umbrellaBody = buildUmbrellaBody(row, subIssues, fallbackWarnings, pageBody);
  const umbrellaLabels = [
    buildNotionLabel(row.shortId),
    "auto",
    row.autoMode === "manual" ? "manual" : `auto:${row.autoMode}`,
    `scope:${row.scope}`,
  ];
  const umbrellaUrl = ghCreateIssue("daodao", row.title, umbrellaBody, umbrellaLabels);
  if (umbrellaUrl) {
    log(`✅ umbrella → ${umbrellaUrl}`);
    return { created: anyNew, notionUrl: umbrellaUrl };
  }

  // Fallback: write first sub-issue URL if umbrella failed
  return { created: anyNew, notionUrl: subIssues[0]!.url };
}

async function writeBackNotionUrl(
  client: ReturnType<typeof createNotionClient>,
  pageId: string,
  url: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    log(`[dry-run] would write back GitHub Issue URL to Notion page ${pageId}`);
    return;
  }
  await updatePageProperty(client, pageId, {
    "GitHub Issue": { url },
  });
}

async function main(): Promise<void> {
  if (DRY_RUN) log("dry-run mode enabled");

  // Check for pause file (repo root, works both locally and in CI)
  if (existsSync(join(process.cwd(), ".automation-paused"))) {
    log("⏸️ .automation-paused present — exiting");
    process.exit(0);
  }

  // Check secrets without exposing them
  if (!NOTION_API_KEY) {
    warn("Notion API key not set — cannot sync. Exiting with 0 (dry-run compatible).");
    process.exit(0);
  }

  let client: ReturnType<typeof createNotionClient>;
  try {
    client = createNotionClient(NOTION_API_KEY);
  } catch (err) {
    warn(`Failed to create Notion client: ${err}`);
    process.exit(0);
  }

  // Schema validation (skip in dry-run with fake DB ID)
  if (!DRY_RUN) {
    try {
      const validation = await validateDatabaseSchema(client, NOTION_DB_ID);
      if (!IS_RELAXED) {
        assertSchemaValid(validation);
      } else if (!validation.valid) {
        warn(
          `DB schema incomplete (relaxed mode — continuing): missing ${validation.missing.join(", ")}`
        );
      }
    } catch (err) {
      warn(`Schema validation failed: ${err}`);
      if (!IS_RELAXED) process.exit(1);
    }
  }

  // Query pages ready for sync
  let pages;
  try {
    pages = await queryDatabase(client, NOTION_DB_ID, {
      and: [
        {
          property: "Status",
          status: { equals: "Ready for Dev" },
        },
        {
          property: "Sync to GitHub",
          checkbox: { equals: true },
        },
      ],
    });
  } catch (err) {
    warn(`Failed to query Notion DB: ${err}`);
    process.exit(0);
  }

  log(`found ${pages.length} pages ready for sync`);

  let newCount = 0;

  for (const page of pages) {
    if (newCount >= MAX_NEW_ISSUES_PER_RUN) {
      warn(
        `reached per-run limit (${MAX_NEW_ISSUES_PER_RUN}) — remaining pages will be processed next run`
      );
      break;
    }

    const { row, warnings: fallbackWarnings } = parsePage(page);
    if (!row) continue;

    // Skip manual mode for auto dispatch (still creates issue without auto label)
    if (row.autoMode === "manual") {
      log(`page ${row.shortId} is manual mode — syncing issue without auto label`);
    }

    let pageBody: string | undefined;
    try {
      const content = await fetchPageContent(client, row.pageId);
      if (content) pageBody = content;
    } catch (err) {
      warn(`failed to fetch page body for ${row.shortId}: ${err}`);
    }

    const { created, notionUrl } = await createIssuesForRow(
      row,
      fallbackWarnings,
      DRY_RUN,
      pageBody
    );

    if (created && notionUrl) {
      newCount++;
      await writeBackNotionUrl(client, row.pageId, notionUrl, DRY_RUN);
    }
  }

  log(`done — created ${newCount} new issue(s)`);
}

main().catch((err) => {
  process.stderr.write(`[notion-sync] unexpected error: ${err}\n`);
  process.exit(1);
});
