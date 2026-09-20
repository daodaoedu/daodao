import { describe, expect, it } from "vitest";
import {
  buildAllDoneComment,
  buildProgressComment,
  parseClosingIssues,
  parseParentIssue,
} from "../lib.js";

describe("parseParentIssue", () => {
  it("parses the Parent line", () => {
    expect(parseParentIssue("## Links\n\nParent: daodaoedu/daodao#150\n")).toBe(150);
  });
  it("returns null without a Parent line", () => {
    expect(parseParentIssue("Closes #3")).toBeNull();
  });
});

describe("parseClosingIssues", () => {
  it("collects closes/fixes/resolves refs, deduped", () => {
    expect(parseClosingIssues("Closes #12\nfixes #7, resolves #12")).toEqual([12, 7]);
  });
  it("ignores plain refs", () => {
    expect(parseClosingIssues("see #12")).toEqual([]);
  });
});

describe("board-sync comments", () => {
  it("buildProgressComment reports done/total", () => {
    expect(buildProgressComment(1, 3)).toBe("⏳ Sub-repo 進度：1/3");
  });
  it("buildAllDoneComment lists mirror urls and keeps the issue open for驗收", () => {
    const body = buildAllDoneComment([
      "https://github.com/daodaoedu/daodao-server/issues/1",
      "https://github.com/daodaoedu/daodao-f2e/issues/2",
    ]);
    expect(body).toContain("✅ 所有 sub-repo 任務完成");
    expect(body).toContain("- https://github.com/daodaoedu/daodao-server/issues/1");
    expect(body).toContain("- https://github.com/daodaoedu/daodao-f2e/issues/2");
    expect(body).toContain("待驗收後請手動 close");
  });
});
