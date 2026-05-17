#!/usr/bin/env tsx
/**
 * update-status.ts — Update a Notion page's Status field.
 *
 * Usage:
 *   pnpm tsx bin/notion-sync/update-status.ts <pageId> <status>
 *
 * Env:
 *   NOTION_API_KEY — Notion integration token
 *
 * Exit codes:
 *   0 — success
 *   1 — error (missing args, missing key, API failure)
 */

import { createNotionClient, updatePageProperty } from "./notion-client.js";

const NOTION_API_KEY = process.env["NOTION_API_KEY"] ?? "";

export async function updateNotionStatus(pageId: string, status: string): Promise<void> {
  if (!NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY not set");
  }
  const client = createNotionClient(NOTION_API_KEY);
  await updatePageProperty(client, pageId, {
    Status: { status: { name: status } },
  });
}

const isMain =
  process.argv[1]?.endsWith("update-status.ts") ||
  process.argv[1]?.endsWith("update-status");

if (isMain) {
  const [, , pageId, status] = process.argv;
  if (!pageId || !status) {
    process.stderr.write("Usage: update-status.ts <pageId> <status>\n");
    process.exit(1);
  }
  updateNotionStatus(pageId, status)
    .then(() => process.stdout.write(`[update-status] ${pageId} → ${status}\n`))
    .catch((e) => {
      process.stderr.write(`[update-status] error: ${e}\n`);
      process.exit(1);
    });
}
