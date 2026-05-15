#!/usr/bin/env node
/**
 * One-time migration: add "PR Open" status option to Notion DB Status field.
 * (GitHub PR URL field was already added via MCP on 2026-05-16)
 *
 * Usage:
 *   NOTION_API_KEY=<key> pnpm tsx bin/notion-sync/migrate-add-github-pr-field.ts [--dry-run]
 */

import {
  createNotionClient,
  retrieveDatabase,
  updateDatabase,
} from "./notion-client.js";

const DRY_RUN = process.argv.includes("--dry-run");
const NOTION_API_KEY = process.env["NOTION_API_KEY"] ?? "";
const NOTION_DB_ID =
  process.env["NOTION_DB_ID"] ?? "3549cc8126978036803af61048468bde";

function log(msg: string): void {
  process.stdout.write(`[migrate] ${msg}\n`);
}

async function main(): Promise<void> {
  if (!NOTION_API_KEY) {
    process.stderr.write("[migrate] NOTION_API_KEY not set\n");
    process.exit(1);
  }

  const client = createNotionClient(NOTION_API_KEY);
  const db = await retrieveDatabase(client, NOTION_DB_ID);
  const props = (db as { properties: Record<string, unknown> }).properties;

  // GitHub PR field — already added via MCP, just verify
  if ("GitHub PR" in props) {
    log("✅ GitHub PR property already exists");
  } else {
    log("⚠️ GitHub PR property missing — was it added via MCP?");
  }

  // Add "PR Open" to Status options (in_progress group)
  const statusProp = props["Status"] as {
    type: string;
    status?: {
      options: Array<{ id?: string; name: string; color: string }>;
      groups: Array<{ id?: string; name: string; option_ids: string[] }>;
    };
  } | undefined;

  if (!statusProp || statusProp.type !== "status" || !statusProp.status) {
    log("⚠️ Status property not found or not status type — skipping");
    return;
  }

  const existing = statusProp.status.options.map((o) => o.name);
  if (existing.includes("PR Open")) {
    log("✅ PR Open status option already exists — nothing to do");
    return;
  }

  log(`Current status options: ${existing.join(", ")}`);
  log('Adding "PR Open" to in_progress group...');

  if (DRY_RUN) {
    log('[dry-run] would add "PR Open" option');
    return;
  }

  const newOption = { name: "PR Open", color: "orange" };
  const updatedOptions = [...statusProp.status.options, newOption];

  // Add to in_progress group (use a temp id — Notion assigns a real one)
  const updatedGroups = statusProp.status.groups.map((g) =>
    g.name === "In progress"
      ? { ...g, option_ids: [...g.option_ids, "__pr_open__"] }
      : g
  );

  try {
    await updateDatabase(client, NOTION_DB_ID, {
      Status: {
        status: {
          options: updatedOptions,
          groups: updatedGroups,
        },
      },
    });
    log('✅ "PR Open" status option added');
  } catch (err) {
    log(`⚠️ API failed: ${err}`);
    log('   Please add "PR Open" manually in Notion (Status field → In progress group)');
  }

  log("Migration complete.");
}

main().catch((err) => {
  process.stderr.write(`[migrate] unexpected error: ${err}\n`);
  process.exit(1);
});
