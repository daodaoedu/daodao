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
  let targetRepo = extractProperty(page, "Target Repo") as string | null;
  const acceptanceCriteria = extractProperty(page, "Acceptance Criteria") as string | null;
  const githubIssueUrl = extractProperty(page, "GitHub Issue") as string | null;
  const labelsProp = extractProperty(page, "Labels") as string[] | null;

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

  if (!targetRepo || !TARGET_REPOS.includes(targetRepo as TargetRepo)) {
    if (IS_RELAXED) {
      targetRepo = RELAXED_FALLBACKS.targetRepo;
      warnings.push(
        `Target Repo missing/invalid — using fallback: ${targetRepo}`
      );
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
    targetRepo,
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

function buildIssueBody(row: NotionRow, fallbackWarnings: string[], pageBody?: string): string {
  const notionUrl = `https://www.notion.so/daodaolearn/${row.pageId.replace(/-/g, "")}`;
  const warningBlock =
    fallbackWarnings.length > 0
      ? `\n> ⚠️ 此 issue 由 fallback 預設值產生（relaxed mode）：${fallbackWarnings.join("；")}\n`
      : "";
  const highRiskNote = HIGH_RISK_REPOS.includes(row.targetRepo as TargetRepo)
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

function buildLabels(row: NotionRow, fallbackWarnings: string[]): string[] {
  const labels: string[] = [
    buildNotionLabel(row.shortId),
    "auto",
    row.autoMode === "manual" ? "manual" : `auto:${row.autoMode}`,
    `scope:${row.scope}`,
    `target-repo:${row.targetRepo}`,
  ];

  // High-risk repos: force plan-only regardless of Auto Mode
  if (
    HIGH_RISK_REPOS.includes(row.targetRepo as TargetRepo) &&
    row.autoMode !== "manual"
  ) {
    // Replace auto:auto-pr with auto:plan-only if present
    const idx = labels.indexOf("auto:auto-pr");
    if (idx !== -1) labels[idx] = "auto:plan-only";
  }

  if (fallbackWarnings.length > 0) {
    // Already noted in body; no extra label needed
  }

  return [...new Set(labels)];
}

async function createOrUpdateIssue(
  row: NotionRow,
  fallbackWarnings: string[],
  dryRun: boolean,
  pageBody?: string
): Promise<{ created: boolean; issueUrl: string | null }> {
  const existing = findExistingIssue(row.targetRepo, row.shortId);

  if (existing) {
    log(`issue already exists for ${row.shortId} (#${existing.number}) — skip`);
    return { created: false, issueUrl: null };
  }

  const body = buildIssueBody(row, fallbackWarnings, pageBody);
  const labels = buildLabels(row, fallbackWarnings);
  const labelArgs = labels.map((l) => `--label "${l}"`).join(" ");

  if (dryRun) {
    log(`[dry-run] would create issue in daodaoedu/${row.targetRepo}: "${row.title}" labels=${labels.join(",")}`);
    return { created: false, issueUrl: null };
  }

  // Ensure dynamic labels exist (ignore failures)
  for (const [lname, ldesc] of [
    [`notion:${row.shortId}`, `Notion page ${row.shortId}`],
    [`target-repo:${row.targetRepo}`, `Target repo ${row.targetRepo}`],
  ] as [string, string][]) {
    try {
      execSync(
        `gh label create "${lname}" --repo daodaoedu/${row.targetRepo} --color "e4e669" --description "${ldesc}" --force`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      );
    } catch { /* already exists or no permission — continue */ }
  }

  // Write body to temp file to avoid shell-escaping issues
  const tmpFile = join(tmpdir(), `notion-sync-${row.shortId}.md`);
  try {
    writeFileSync(tmpFile, body, "utf-8");
    const output = execSync(
      `gh issue create --repo daodaoedu/${row.targetRepo} --title "${row.title.replace(/"/g, '\\"')}" --body-file "${tmpFile}" ${labelArgs} --json url`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const { url } = JSON.parse(output.trim());
    log(`created issue: ${url}`);
    return { created: true, issueUrl: url as string };
  } catch (err) {
    warn(`failed to create issue for ${row.shortId}: ${err}`);
    return { created: false, issueUrl: null };
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
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

    const { created, issueUrl } = await createOrUpdateIssue(
      row,
      fallbackWarnings,
      DRY_RUN,
      pageBody
    );

    if (created && issueUrl) {
      newCount++;
      await writeBackNotionUrl(client, row.pageId, issueUrl, DRY_RUN);
    }
  }

  log(`done — created ${newCount} new issue(s)`);
}

main().catch((err) => {
  process.stderr.write(`[notion-sync] unexpected error: ${err}\n`);
  process.exit(1);
});
