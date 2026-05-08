import { z } from "zod";

export const TARGET_REPOS = [
  "daodao-server",
  "daodao-f2e",
  "daodao-ai-backend",
  "daodao-storage",
  "daodao-admin-ui",
  "daodao-infra",
  "daodao-mcp",
  "daodao-worker",
] as const;

export type TargetRepo = (typeof TARGET_REPOS)[number];

// High-risk repos that are forced to plan-only regardless of Auto Mode
export const HIGH_RISK_REPOS: readonly TargetRepo[] = [
  "daodao-storage",
  "daodao-infra",
];

export const AutoModeSchema = z.enum(["plan-only", "auto-pr", "manual"]);
export type AutoMode = z.infer<typeof AutoModeSchema>;

export const ScopeSchema = z.enum(["XS", "S", "M", "L"]);
export type Scope = z.infer<typeof ScopeSchema>;

export const TargetRepoSchema = z.enum(TARGET_REPOS);

export const NotionRowSchema = z.object({
  pageId: z.string(),
  shortId: z.string(), // first 8 chars of pageId (no hyphens)
  title: z.string().min(1),
  status: z.string(),
  syncToGitHub: z.boolean(),
  autoMode: AutoModeSchema,
  scope: ScopeSchema,
  targetRepo: TargetRepoSchema,
  acceptanceCriteria: z.string().optional(),
  githubIssueUrl: z.string().url().optional().nullable(),
  labels: z.array(z.string()).default([]),
});

export type NotionRow = z.infer<typeof NotionRowSchema>;

export const RELAXED_FALLBACKS = {
  autoMode: "plan-only" as AutoMode,
  scope: "M" as Scope,
  targetRepo: "daodao-f2e" as TargetRepo,
};
