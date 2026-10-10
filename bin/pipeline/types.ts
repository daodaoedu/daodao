export const CENTRAL_REPO = "daodao";
export const OWNER = "daodaoedu";

// Planning board (org project 10) — IDs are stable unless the project is recreated
export const BOARD = {
  projectNumber: 10,
  projectId: "PVT_kwDOBTLl0c4Bgxef",
  statusFieldId: "PVTSSF_lADOBTLl0c4Bgxefzhfvwto",
  statusOptions: {
    Todo: "f75ad846",
    "Ready for Dev": "c9e0e5d5",
    "In Progress": "47fc9ee4",
    Review: "f25bace1",
    // Added in the web settings page on 2026-10-09 (the API cannot create options)
    Acceptance: "4f45350c",
    "Need Fix": "bb831d2b",
    Done: "98236657",
  },
} as const;

export type BoardStatus = keyof typeof BOARD.statusOptions;

/** CLI aliases → canonical Status name (case-insensitive, `-`/`_`/space interchangeable). */
export const STATUS_ALIASES: Record<string, BoardStatus> = {
  todo: "Todo",
  ready: "Ready for Dev",
  "ready for dev": "Ready for Dev",
  "in progress": "In Progress",
  wip: "In Progress",
  review: "Review",
  "in review": "Review",
  accept: "Acceptance",
  acceptance: "Acceptance",
  "need fix": "Need Fix",
  needfix: "Need Fix",
  done: "Done",
};

/** PM who owns the Acceptance column: `set <n> accept` assigns them, audit checks it. */
export const PM_LOGIN = "peggy1213-create";

/**
 * Cards with no change a PM can observe in dev (tooling, CI, dev-only endpoints, zero-diff refactors,
 * backend internals): labelled at card creation; after dev smoke passes they close straight to Done.
 */
export const ENGINEERING_ACCEPTANCE_LABEL = "acceptance:engineering";

/** Service Level Expectation for Acceptance (Kanban Guide 2025.5): business days in Asia/Taipei. */
export const ACCEPTANCE_SLE_BUSINESS_DAYS = 2;

/** Labels from the retired Routine A／B dispatch era — should not remain on active cards. */
export const DEAD_LABELS = [
  "auto",
  "auto:plan-only",
  "auto:auto-pr",
  "needs-spec",
  "dispatched",
  "spec-pending",
  "human-coding",
  "manual",
] as const;
