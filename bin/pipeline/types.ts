export const CENTRAL_REPO = "daodao";
export const OWNER = "daodaoedu";

export const SUB_REPOS = [
  "daodao-server",
  "daodao-f2e",
  "daodao-ai-backend",
  "daodao-storage",
  "daodao-admin-ui",
  "daodao-infra",
  "daodao-mcp",
  "daodao-worker",
] as const;

export type SubRepo = (typeof SUB_REPOS)[number];

// High-risk repos that are forced to plan-only regardless of the central card's auto mode
export const HIGH_RISK_REPOS: readonly SubRepo[] = [
  "daodao-storage",
  "daodao-infra",
];

export type AutoMode = "plan-only" | "auto-pr";
export type Scope = "XS" | "S" | "M" | "L";

// Planning board (org project 10) — IDs are stable unless the project is recreated
export const BOARD = {
  projectNumber: 10,
  projectId: "PVT_kwDOBTLl0c4Bgxef",
  statusFieldId: "PVTSSF_lADOBTLl0c4Bgxefzhfvwto",
  statusOptions: {
    Todo: "f75ad846",
    "In Progress": "47fc9ee4",
    "Ready for Dev": "c9e0e5d5",
    Done: "98236657",
  },
} as const;

export interface TaskSection {
  title: string;
  tasks: string[];
}
