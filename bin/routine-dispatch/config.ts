#!/usr/bin/env tsx
/**
 * Loader for bin/pipeline.config.json — the pipeline's single source of truth.
 *
 * All TS scripts import from here; bash scripts read the JSON directly with jq.
 * Do NOT hard-code repo lists, model IDs, caps, or quality commands anywhere else.
 *
 * CLI: pnpm tsx bin/routine-dispatch/config.ts <high-risk|repos|json>
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface QualityCommands {
  fix: string | null;
  lint: string | null;
  typecheck: string | null;
  test: string | null;
}

export interface RepoConfig {
  defaultBranch: string;
  install: string | null;
  quality: QualityCommands;
}

export interface ScopeCap {
  maxFiles: number;
  maxDiffLines: number;
}

export interface PipelineConfig {
  version: number;
  org: string;
  monorepo: string;
  workRoot: string;
  highRiskRepos: string[];
  repos: Record<string, RepoConfig>;
  models: Record<string, string>;
  scopeCaps: Record<string, ScopeCap>;
  quotas: {
    fetchPerRepo: number;
    operatePerRound: number;
    prPatrolPerRound: number;
    verifyAttempts: number;
  };
}

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
export const CONFIG_PATH = resolve(SCRIPT_DIR, "..", "pipeline.config.json");

let cached: PipelineConfig | null = null;

export function loadConfig(): PipelineConfig {
  if (cached) return cached;
  const raw = readFileSync(CONFIG_PATH, "utf8");
  const cfg = JSON.parse(raw) as PipelineConfig;
  if (!cfg.org || !cfg.repos || !Array.isArray(cfg.highRiskRepos)) {
    throw new Error(`config: ${CONFIG_PATH} missing required fields`);
  }
  cached = cfg;
  return cfg;
}

export function highRiskRepos(): readonly string[] {
  return loadConfig().highRiskRepos;
}

export function repoNames(): string[] {
  return Object.keys(loadConfig().repos);
}

// CLI entrypoint
const isMain =
  process.argv[1]?.endsWith("config.ts") || process.argv[1]?.endsWith("config");

if (isMain) {
  const cmd = process.argv[2] ?? "json";
  if (cmd === "high-risk") {
    console.log(highRiskRepos().join("\n"));
  } else if (cmd === "repos") {
    console.log(repoNames().join("\n"));
  } else if (cmd === "json") {
    console.log(JSON.stringify(loadConfig(), null, 2));
  } else {
    console.error("Usage: config.ts <high-risk|repos|json>");
    process.exit(1);
  }
}
