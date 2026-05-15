#!/usr/bin/env node
/**
 * One-time migration: add "GitHub PR" URL property and "In Review" status option to Notion DB.
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
  const props = (db as { properties: Record<string, { type: string }> }).properties;

  // ── 1. Add "GitHub PR" URL property ──────────────────────────────────────
  if ("GitHub PR" in props) {
    log("✅ GitHub PR property already exists — skipping");
  } else {
    log("Adding GitHub PR URL property...");
    if (!DRY_RUN) {
      await updateDatabase(client, NOTION_DB_ID, {
        "GitHub PR": { url: {} },
      });
      log("✅ GitHub PR URL property added");
    } else {
      log("[dry-run] would add GitHub PR URL property");
    }
  }

  // ── 2. Add "In Review" status option ────────────────────────────────────
  const statusProp = props["Status"] as {
    type: string;
    status?: {
      options: Array<{ id: string; name: string; color: string }>;
      groups: Array<{ id: string; name: string; option_ids: string[] }>;
    };
  } | undefined;

  if (!statusProp || statusProp.type !== "status" || !statusProp.status) {
    log("⚠️ Status property not found or not a status type — skipping");
  } else {
    const existing = statusProp.status.options.map((o) => o.name);
    if (existing.includes("In Review")) {
      log("✅ In Review status option already exists — skipping");
    } else {
      log(`Current status options: ${existing.join(", ")}`);
      log("Adding In Review status option to In progress group...");

      const inProgressGroup = statusProp.status.groups.find(
        (g) => g.name === "In progress"
      );

      if (!inProgressGroup) {
        log("⚠️ In progress group not found — please add In Review manually in Notion");
      } else if (!DRY_RUN) {
        const newOption = { name: "In Review", color: "blue" };
        const updatedOptions = [...statusProp.status.options, newOption];
        const updatedGroups = statusProp.status.groups.map((g) =>
          g.name === "In progress"
            ? { ...g, option_ids: [...g.option_ids, "in-review-placeholder"] }
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
          log("✅ In Review status option added");
        } catch (err) {
          log(`⚠️ Could not add status option via API: ${err}`);
          log("   Please add In Review manually in Notion under the In progress group");
        }
      } else {
        log("[dry-run] would add In Review status option");
      }
    }
  }

  log("Migration complete.");
}

main().catch((err) => {
  process.stderr.write(`[migrate] unexpected error: ${err}\n`);
  process.exit(1);
});
