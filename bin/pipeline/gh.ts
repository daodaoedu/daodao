/**
 * Thin gh CLI wrappers for the Planning board CLI. All I/O lives here.
 */
import { execSync } from "child_process";
import { BOARD, CENTRAL_REPO, OWNER, type BoardStatus } from "./types.js";

function sh(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

// ── Board ──────────────────────────────────────────────────────────────

export interface BoardItem {
  itemId: string;
  status: string | null;
  issueNumber: number | null;
  repository: string | null;
  title: string;
}

export function setBoardStatus(itemId: string, statusName: BoardStatus): void {
  sh(
    `gh project item-edit --project-id ${BOARD.projectId} --id ${itemId} ` +
      `--field-id ${BOARD.statusFieldId} --single-select-option-id ${BOARD.statusOptions[statusName]}`
  );
}

/**
 * Lightweight board listing (id, Status, issue number/repo/title only).
 * `gh project item-list` pulls every field for every item and trips the
 * Projects rate limit after a handful of calls; this query is ~1/50 the cost.
 */
export function listBoardItemsLite(): BoardItem[] {
  const items: BoardItem[] = [];
  let after: string | null = null;
  do {
    const query = `query { organization(login: "${OWNER}") { projectV2(number: ${BOARD.projectNumber}) {
      items(first: 100${after ? `, after: "${after}"` : ""}) {
        pageInfo { hasNextPage endCursor }
        nodes { id
          fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
          content { ... on Issue { number title repository { nameWithOwner } } } } } } } }`;
    const out = sh(`gh api graphql -f query='${query}'`);
    const page = (
      JSON.parse(out) as {
        data: { organization: { projectV2: { items: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: Array<{ id: string; fieldValueByName: { name?: string } | null;
            content: { number?: number; title?: string; repository?: { nameWithOwner: string } } | null }>;
        } } } };
      }
    ).data.organization.projectV2.items;
    for (const n of page.nodes) {
      items.push({
        itemId: n.id,
        status: n.fieldValueByName?.name ?? null,
        issueNumber: n.content?.number ?? null,
        repository: n.content?.repository?.nameWithOwner ?? null,
        title: n.content?.title ?? "",
      });
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return items;
}

/**
 * Locate a central issue's item on the board with one small GraphQL call
 * (item-list over the whole board is ~50× the rate-limit cost).
 */
export function findBoardItemForIssue(
  issueNumber: number
): { itemId: string; status: string | null; url: string } | null {
  const query = `query { repository(owner: "${OWNER}", name: "${CENTRAL_REPO}") {
    issue(number: ${issueNumber}) { url projectItems(first: 20) { nodes {
      id project { number }
      fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
    } } } } }`;
  const out = sh(`gh api graphql -f query='${query}'`);
  const issue = (
    JSON.parse(out) as {
      data: {
        repository: {
          issue: {
            url: string;
            projectItems: {
              nodes: Array<{ id: string; project: { number: number }; fieldValueByName: { name?: string } | null }>;
            };
          } | null;
        };
      };
    }
  ).data.repository.issue;
  if (!issue) return null;
  const item = issue.projectItems.nodes.find((n) => n.project.number === BOARD.projectNumber);
  return item ? { itemId: item.id, status: item.fieldValueByName?.name ?? null, url: issue.url } : null;
}

/** Add a central issue to the board; returns the new item id. */
export function addBoardItem(issueUrl: string): string {
  const out = sh(
    `gh project item-add ${BOARD.projectNumber} --owner ${OWNER} --url ${issueUrl} --format json`
  );
  return (JSON.parse(out) as { id: string }).id;
}

export function removeBoardItem(itemId: string): void {
  sh(`gh project item-delete ${BOARD.projectNumber} --owner ${OWNER} --id ${itemId}`);
}

export function editIssueLabels(
  repo: string,
  num: number,
  add: string[],
  remove: string[]
): void {
  if (add.length === 0 && remove.length === 0) return;
  const flags = [
    ...add.map((l) => `--add-label "${l}"`),
    ...remove.map((l) => `--remove-label "${l}"`),
  ].join(" ");
  sh(`gh issue edit ${num} --repo ${OWNER}/${repo} ${flags}`);
}

export interface IssueLinks {
  number: number;
  state: "OPEN" | "CLOSED";
  updatedAt: string;
  labels: string[];
  prs: Array<{ ref: string; state: "open" | "merged" | "closed" }>;
}

/** One GraphQL round-trip per 50 issues: state, labels, and cross-referenced PRs. */
export function getCentralIssueLinks(numbers: number[]): Map<number, IssueLinks> {
  const result = new Map<number, IssueLinks>();
  for (let i = 0; i < numbers.length; i += 50) {
    const chunk = numbers.slice(i, i + 50);
    const fields = chunk
      .map(
        (n) => `i${n}: issue(number: ${n}) { number state updatedAt
          labels(first: 30) { nodes { name } }
          timelineItems(last: 40, itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT]) { nodes {
            ... on CrossReferencedEvent { source { __typename ... on PullRequest { number state merged repository { name } } } }
            ... on ConnectedEvent { subject { __typename ... on PullRequest { number state merged repository { name } } } }
          } } }`
      )
      .join("\n");
    const query = `query { repository(owner: "${OWNER}", name: "${CENTRAL_REPO}") { ${fields} } }`;
    const out = sh(`gh api graphql -f query='${query.replace(/'/g, "'\\''")}'`);
    const repo = (JSON.parse(out) as { data: { repository: Record<string, unknown> } }).data
      .repository;
    for (const raw of Object.values(repo)) {
      const node = raw as {
        number: number;
        state: "OPEN" | "CLOSED";
        updatedAt: string;
        labels: { nodes: Array<{ name: string }> };
        timelineItems: { nodes: Array<{ source?: PRNode; subject?: PRNode }> };
      };
      if (!node) continue;
      const prs = new Map<string, "open" | "merged" | "closed">();
      for (const t of node.timelineItems.nodes) {
        const pr = t.source ?? t.subject;
        if (!pr || pr.__typename !== "PullRequest") continue;
        const ref = `${pr.repository.name}#${pr.number}`;
        prs.set(ref, pr.merged ? "merged" : pr.state === "OPEN" ? "open" : "closed");
      }
      result.set(node.number, {
        number: node.number,
        state: node.state,
        updatedAt: node.updatedAt,
        labels: node.labels.nodes.map((l) => l.name),
        prs: Array.from(prs, ([ref, state]) => ({ ref, state })),
      });
    }
  }
  return result;
}

interface PRNode {
  __typename: string;
  number: number;
  state: "OPEN" | "CLOSED" | "MERGED";
  merged: boolean;
  repository: { name: string };
}
