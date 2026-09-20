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
  "need fix": "Need Fix",
  needfix: "Need Fix",
  done: "Done",
};

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
