#!/usr/bin/env tsx
// Model router for routine dispatch (plan §5.5).
// Routes each pipeline stage to the appropriate Claude model.
// Also provides ADR injection helper.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

export type Stage =
  | "dispatch"  // label-based routing in state.ts → Haiku (fast, cheap)
  | "handler"   // XS/S code writing → Sonnet
  | "spec"      // M/L openspec generation → Opus (deep reasoning)
  | "reviewer"  // council reviewer-agent → Sonnet (independent context)
  | "judge";    // council judge-agent → Haiku (structured verdict)

export const MODEL_MAP: Record<Stage, string> = {
  dispatch: "claude-haiku-4-5-20251001",
  handler:  "claude-sonnet-4-6",
  spec:     "claude-opus-4-7",
  reviewer: "claude-sonnet-4-6",
  judge:    "claude-haiku-4-5-20251001",
};

/** Returns the model ID for the given pipeline stage. */
export function routeModel(stage: Stage): string {
  const model = MODEL_MAP[stage];
  if (!model) throw new Error(`model-router: unknown stage "${stage}"`);
  return model;
}

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const MONOREPO_ROOT = resolve(SCRIPT_DIR, "../..");

function safeRead(filePath: string): string {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

/**
 * Builds a prompt fragment for ADR injection (plan §5.5).
 * Given a repo name and optional OpenSpec change-id, returns relevant context:
 *   - openspec/changes/<changeId>/proposal.md (if exists)
 *   - openspec/specs/<area>/spec.md (inferred from issue body)
 *   - docs/adr/*.md matching target repo name
 */
export function buildAdrFragment(options: {
  repo: string;
  changeId?: string;
  issueNum?: string;
}): string {
  const { repo, changeId, issueNum } = options;
  const fragments: string[] = [];

  // 1. OpenSpec proposal for this change
  if (changeId) {
    const proposalPath = join(
      MONOREPO_ROOT,
      "openspec",
      "changes",
      changeId,
      "proposal.md"
    );
    const proposal = safeRead(proposalPath);
    if (proposal) {
      fragments.push(`## OpenSpec Proposal (${changeId})\n\n${proposal}`);
    }
  }

  // 2. Related domain spec — infer area from issue body if available
  if (issueNum) {
    try {
      const issueJson = execSync(
        `gh issue view ${issueNum} --repo daodaoedu/${repo} --json body`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      );
      const body = (JSON.parse(issueJson) as { body: string }).body ?? "";
      // Look for <!-- area: <name> --> annotation or "area:" prefix in body
      const areaMatch = body.match(/(?:<!--\s*area:\s*|area:\s*)(\S+)/i);
      if (areaMatch) {
        const area = areaMatch[1]!;
        const specPath = join(
          MONOREPO_ROOT,
          "openspec",
          "specs",
          area,
          "spec.md"
        );
        const spec = safeRead(specPath);
        if (spec) {
          fragments.push(`## OpenSpec Domain Spec (${area})\n\n${spec}`);
        }
      }
    } catch {
      // gh not available or issue missing — skip
    }
  }

  // 3. ADR files tagged for this repo
  const adrDir = join(MONOREPO_ROOT, "docs", "adr");
  if (existsSync(adrDir)) {
    try {
      const adrFiles = readdirSync(adrDir).filter((f) => f.endsWith(".md"));
      for (const file of adrFiles) {
        const content = safeRead(join(adrDir, file));
        if (content.toLowerCase().includes(repo.toLowerCase())) {
          fragments.push(`## ADR: ${file}\n\n${content}`);
        }
      }
    } catch {
      // docs/adr not readable
    }
  }

  if (fragments.length === 0) return "";
  return `---\n# Context Injected by model-router\n\n${fragments.join("\n\n---\n\n")}\n---`;
}

// CLI entrypoint
const isMain =
  process.argv[1]?.endsWith("model-router.ts") ||
  process.argv[1]?.endsWith("model-router");

if (isMain) {
  const [, , cmd, ...args] = process.argv;
  if (cmd === "route") {
    const stage = args[0] as Stage;
    console.log(routeModel(stage));
  } else if (cmd === "adr") {
    const [repo, changeId, issueNum] = args;
    console.log(buildAdrFragment({ repo: repo!, changeId, issueNum }));
  } else {
    console.error(
      "Usage: model-router.ts <route <stage> | adr <repo> [changeId] [issueNum]>"
    );
    process.exit(1);
  }
}
