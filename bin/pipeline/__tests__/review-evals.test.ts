import { describe, expect, it } from "vitest";
import {
  buildEvalsRow,
  classifyFindings,
  commitFilesFromPages,
  commitsAfterReviewedHead,
  fileWasTouched,
  hasAuthorReply,
  insertEvalsRow,
  normalizeCommentPages,
  parseDays,
  parseReviewFindings,
  selectLatestBotReview,
} from "../review-evals.js";

const REVIEW_BODY = `## Code Review

### 問題

| 嚴重度 | 檔案 | 問題 | 建議 |
|--------|------|------|------|
| 🔴 High | \`.github/scripts/retrieve-context.sh\` | Incomplete scope：漏掉同類呼叫點 | 補齊 |
| 🟡 Medium | \`src/lib/sdk.ts:42\` | 效能疑慮 | 加 cache |
| 🟢 Low | \`README.md\` | 風格 | 可忽略 |

### 總結

一句話。`;

const HEAD_A = "a".repeat(40);
const HEAD_B = "b".repeat(40);
const snapshotBody = (headSha: string, body = REVIEW_BODY) =>
  `${body}\n\n<!-- daodao-ai-code-review -->\n<!-- daodao-ai-code-review-head:${headSha} -->`;

describe("parseReviewFindings", () => {
  it("parses severity, file, and incomplete-scope flag from the table", () => {
    const f = parseReviewFindings(REVIEW_BODY);
    expect(f).toHaveLength(3);
    expect(f[0]).toEqual({
      severity: "High",
      file: ".github/scripts/retrieve-context.sh",
      incompleteScope: true,
    });
    expect(f[1]!.severity).toBe("Medium");
    expect(f[2]!.incompleteScope).toBe(false);
  });
  it("returns empty for no-issue reviews", () => {
    expect(parseReviewFindings("## Code Review\n\n✅ 沒有發現明顯問題")).toEqual([]);
  });
});

describe("fileWasTouched", () => {
  it("matches exact path, ./ prefix, :line suffix, and unique basename", () => {
    expect(fileWasTouched("src/lib/sdk.ts:42", ["src/lib/sdk.ts"])).toBe(true);
    expect(fileWasTouched("./src/a.ts", ["src/a.ts"])).toBe(true);
    expect(fileWasTouched("sdk.ts", ["src/lib/sdk.ts"])).toBe(true);
    expect(fileWasTouched("src/other.ts", ["src/lib/sdk.ts"])).toBe(false);
    expect(fileWasTouched("", ["src/lib/sdk.ts"])).toBe(false);
  });

  it("does not treat a different path or ambiguous basename as fixed", () => {
    expect(fileWasTouched("src/a/index.ts", ["src/b/index.ts"])).toBe(false);
    expect(fileWasTouched("index.ts", ["src/a/index.ts", "src/b/index.ts"])).toBe(false);
  });
});

describe("hasAuthorReply", () => {
  const comments = [
    { createdAt: "2026-08-21T10:01:00Z", login: "reviewer" },
    { createdAt: "2026-08-21T10:02:00Z", login: "github-actions[bot]" },
  ];

  it("does not count third-party or bot comments as an author reply", () => {
    expect(hasAuthorReply(comments, "2026-08-21T10:00:00Z", "author")).toBe(false);
  });

  it("counts only the PR author's later comment", () => {
    expect(
      hasAuthorReply(
        [...comments, { createdAt: "2026-08-21T10:03:00Z", login: "author" }],
        "2026-08-21T10:00:00Z",
        "author"
      )
    ).toBe(true);
  });
});

describe("selectLatestBotReview", () => {
  const botReview = {
    body: snapshotBody(HEAD_A),
    createdAt: "2026-08-21T10:00:00Z",
    updatedAt: "2026-08-21T12:00:00Z",
    login: "github-actions[bot]",
  };

  it("uses the reviewed head position for commits and updatedAt for author replies", () => {
    const selected = selectLatestBotReview([botReview], "2026-08-21T00:00:00Z");
    expect(selected?.updatedAt).toBe("2026-08-21T12:00:00Z");
    expect(selected?.headSha).toBe(HEAD_A);

    const commits = commitsAfterReviewedHead(
      [
        { oid: "before", date: "2026-08-21T13:00:00Z" },
        { oid: HEAD_A, date: "2026-08-21T10:00:00Z" },
        { oid: "after", date: "2026-08-21T09:00:00Z" },
      ],
      selected!.headSha
    );
    expect(commits?.map((commit) => commit.oid)).toEqual(["after"]);
    expect(
      hasAuthorReply(
        [
          { createdAt: "2026-08-21T11:00:00Z", login: "author" },
          { createdAt: "2026-08-21T12:01:00Z", login: "author" },
        ],
        selected!.updatedAt,
        "author"
      )
    ).toBe(true);
    expect(
      hasAuthorReply(
        [{ createdAt: "2026-08-21T11:00:00Z", login: "author" }],
        selected!.updatedAt,
        "author"
      )
    ).toBe(false);
  });

  it("ignores a newer fake human review even when it copies the marker", () => {
    const fakeHumanReview = {
      ...botReview,
      body: snapshotBody(HEAD_B),
      createdAt: "2026-08-21T13:00:00Z",
      updatedAt: "2026-08-21T13:00:00Z",
      login: "attacker",
    };
    expect(
      selectLatestBotReview([botReview, fakeHumanReview], "2026-08-21T00:00:00Z")
    ).toEqual({ ...botReview, headSha: HEAD_A });
  });

  it("selects by updatedAt rather than API array order", () => {
    const newer = {
      ...botReview,
      body: snapshotBody(HEAD_B),
      updatedAt: "2026-08-21T13:00:00Z",
    };
    expect(
      selectLatestBotReview([newer, botReview], "2026-08-21T00:00:00Z")?.headSha
    ).toBe(HEAD_B);
  });

  it("excludes snapshots updated before the lookback", () => {
    expect(
      selectLatestBotReview([botReview], "2026-08-21T12:30:00Z")
    ).toBeUndefined();
  });

  it("keeps the latest finding snapshot when a newer snapshot is clean", () => {
    const clean = {
      ...botReview,
      body: snapshotBody(HEAD_B, "## Code Review\n\n✅ 沒有發現明顯問題"),
      updatedAt: "2026-08-21T13:00:00Z",
    };
    expect(
      selectLatestBotReview([botReview, clean], "2026-08-21T00:00:00Z")?.headSha
    ).toBe(HEAD_A);
  });

  it("rejects bot comments without both dedicated markers", () => {
    expect(
      selectLatestBotReview([
        { ...botReview, body: "## Code Review\n\n| High | unrelated |" },
      ], "2026-08-21T00:00:00Z")
    ).toBeUndefined();
    expect(
      selectLatestBotReview([
        { ...botReview, body: `${REVIEW_BODY}\n<!-- daodao-ai-code-review -->` },
      ], "2026-08-21T00:00:00Z")
    ).toBeUndefined();
    expect(
      selectLatestBotReview([
        { ...botReview, body: snapshotBody("A".repeat(40)) },
      ], "2026-08-21T00:00:00Z")
    ).toBeUndefined();
  });

  it("returns undefined when the reviewed head is absent from PR commits", () => {
    expect(commitsAfterReviewedHead([{ oid: "before" }, { oid: "after" }], HEAD_A))
      .toBeUndefined();
  });
});

describe("paginated GitHub responses", () => {
  it("flattens issue comments while preserving created and updated timestamps", () => {
    expect(
      normalizeCommentPages([
        [{
          body: "first",
          created_at: "2026-08-21T10:00:00Z",
          updated_at: "2026-08-21T12:00:00Z",
          user: { login: "github-actions[bot]" },
        }],
        [{
          body: "second",
          created_at: "2026-08-21T13:00:00Z",
          updated_at: "2026-08-21T13:00:00Z",
          user: { login: "author" },
        }],
      ])
    ).toEqual([
      {
        body: "first",
        createdAt: "2026-08-21T10:00:00Z",
        updatedAt: "2026-08-21T12:00:00Z",
        login: "github-actions[bot]",
      },
      {
        body: "second",
        createdAt: "2026-08-21T13:00:00Z",
        updatedAt: "2026-08-21T13:00:00Z",
        login: "author",
      },
    ]);
  });

  it("flattens commit file pages without relying on gh --jq", () => {
    expect(
      commitFilesFromPages([
        { files: [{ filename: "src/a.ts" }] },
        { files: [{ filename: "src/b.ts" }] },
      ])
    ).toEqual(["src/a.ts", "src/b.ts"]);
  });
});

describe("classifyFindings", () => {
  const findings = parseReviewFindings(REVIEW_BODY);
  it("fixed when touched, replied when author responded, else silent", () => {
    expect(classifyFindings(findings, ["src/lib/sdk.ts"], false)).toEqual({
      fixed: 1, replied: 0, silent: 2,
    });
    expect(classifyFindings(findings, [], true)).toEqual({
      fixed: 0, replied: 3, silent: 0,
    });
    expect(classifyFindings(findings, [], false)).toEqual({
      fixed: 0, replied: 0, silent: 3,
    });
  });
});

describe("buildEvalsRow", () => {
  it("computes acceptance rate", () => {
    const row = buildEvalsRow("2026-08-21T00:00:00Z", {
      repo: "all", prsWithReview: 2, findings: 4, high: 1, incompleteScope: 1,
      fixed: 3, replied: 1, silent: 0,
    });
    expect(row).toBe("| 2026-08-21 | 2 | 4 | 1 | 1 | 3 | 1 | 0 | 75% |");
  });
  it("0% when no findings", () => {
    expect(
      buildEvalsRow("2026-08-21T00:00:00Z", {
        repo: "all", prsWithReview: 0, findings: 0, high: 0, incompleteScope: 0,
        fixed: 0, replied: 0, silent: 0,
      })
    ).toContain("| 0% |");
  });
});

describe("insertEvalsRow", () => {
  it("inserts into the review-evals table rather than an earlier table", () => {
    const content = `# Evals

| Other | Table |
|---|---|
| old | value |

## AI Review 接受率（weekly）<!-- review-evals -->

| 週 | findings |
|---|---|
| 2026-08-20 | 1 |
`;
    const updated = insertEvalsRow(content, "| 2026-08-21 | 2 |");
    expect(updated.indexOf("| old | value |")).toBeLessThan(
      updated.indexOf("| 2026-08-21 | 2 |")
    );
    expect(updated.indexOf("| 2026-08-21 | 2 |")).toBeLessThan(
      updated.indexOf("| 2026-08-20 | 1 |")
    );
  });

  it("replaces the same UTC date row instead of duplicating it", () => {
    const content = `# Evals

## AI Review 接受率（weekly）<!-- review-evals -->

| 週 | findings |
|---|---|
| 2026-08-21 | old |
| 2026-08-20 | 1 |
`;
    const updated = insertEvalsRow(content, "| 2026-08-21 | new |");
    expect(updated.match(/\| 2026-08-21 \|/g)).toHaveLength(1);
    expect(updated).toContain("| 2026-08-21 | new |");
    expect(updated).not.toContain("| 2026-08-21 | old |");
  });
});

describe("parseDays", () => {
  it("defaults to seven and accepts a bounded positive integer", () => {
    expect(parseDays(["node", "script"])).toBe(7);
    expect(parseDays(["node", "script", "--days", "30"])).toBe(30);
  });

  it.each(["0", "-1", "91", "abc", ""])("rejects invalid value %j", (value) => {
    expect(() => parseDays(["node", "script", "--days", value])).toThrow(
      "between 1 and 90"
    );
  });
});
