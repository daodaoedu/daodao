import { describe, expect, it } from "vitest";
import {
  assignSectionsToRepos,
  autoModeFor,
  buildMirrorIssueBody,
  buildMirrorLabels,
  buildMirrorTitle,
  parseClosingIssues,
  parseOpenSpecSlug,
  parseParentIssue,
  parseTasksMd,
  scopeFromLabels,
} from "../lib.js";

describe("parseOpenSpecSlug", () => {
  it("parses bare slug", () => {
    expect(parseOpenSpecSlug("OpenSpec: future-letter")).toBe("future-letter");
  });
  it("parses full path with backticks and trailing slash", () => {
    expect(parseOpenSpecSlug("OpenSpec: `openspec/changes/lighthouse/`")).toBe("lighthouse");
  });
  it("returns null when absent", () => {
    expect(parseOpenSpecSlug("FRD: https://docs.google.com/x")).toBeNull();
  });
});

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

describe("parseTasksMd", () => {
  const md = `# Tasks

## 1. daodao-server API

- [ ] 1.1 新增 endpoint
- [x] 1.2 已完成的
- [ ] 1.3 加測試

## 2. daodao-f2e 畫面

- [x] 2.1 全部完成

## 3. 雜項

- [ ] 3.1 更新文件
`;
  it("groups unchecked tasks by section, dropping done tasks and empty sections", () => {
    const sections = parseTasksMd(md);
    expect(sections).toEqual([
      { title: "1. daodao-server API", tasks: ["1.1 新增 endpoint", "1.3 加測試"] },
      { title: "3. 雜項", tasks: ["3.1 更新文件"] },
    ]);
  });
  it("returns empty for all-done files", () => {
    expect(parseTasksMd("## A\n- [x] done")).toEqual([]);
  });
});

describe("assignSectionsToRepos", () => {
  const secServer = { title: "1. daodao-server API", tasks: ["x"] };
  const secByTask = { title: "2. 畫面", tasks: ["改 daodao-f2e 的 layout"] };
  const secPlain = { title: "3. 雜項", tasks: ["更新文件"] };

  it("assigns by title mention, then task mention", () => {
    const { assigned, unassigned } = assignSectionsToRepos([secServer, secByTask], []);
    expect(assigned.get("daodao-server")).toEqual([secServer]);
    expect(assigned.get("daodao-f2e")).toEqual([secByTask]);
    expect(unassigned).toEqual([]);
  });
  it("falls back to the single repo label", () => {
    const { assigned, unassigned } = assignSectionsToRepos([secPlain], ["daodao-worker"]);
    expect(assigned.get("daodao-worker")).toEqual([secPlain]);
    expect(unassigned).toEqual([]);
  });
  it("marks unassignable with multiple repo labels and no mention", () => {
    const { unassigned } = assignSectionsToRepos([secPlain], ["daodao-server", "daodao-f2e"]);
    expect(unassigned).toEqual([secPlain]);
  });
  it("picks the first-mentioned repo when a section mentions several", () => {
    const sec = { title: "x", tasks: ["daodao-f2e 呼叫 daodao-server"] };
    const { assigned } = assignSectionsToRepos([sec], []);
    expect(assigned.get("daodao-f2e")).toEqual([sec]);
  });
});

describe("labels & modes", () => {
  it("scopeFromLabels defaults to M", () => {
    expect(scopeFromLabels(["auto", "scope:XS"])).toBe("XS");
    expect(scopeFromLabels(["auto"])).toBe("M");
  });
  it("autoModeFor inherits auto-pr but forces plan-only on high-risk repos", () => {
    expect(autoModeFor(["auto:auto-pr"], "daodao-f2e")).toBe("auto-pr");
    expect(autoModeFor(["auto:auto-pr"], "daodao-storage")).toBe("plan-only");
    expect(autoModeFor(["auto"], "daodao-f2e")).toBe("plan-only");
  });
  it("buildMirrorLabels shape", () => {
    expect(buildMirrorLabels("S", "auto-pr")).toEqual(["auto", "auto:auto-pr", "scope:S"]);
  });
});

describe("buildMirrorIssueBody", () => {
  const body = buildMirrorIssueBody({
    centralIssueNumber: 150,
    sectionTitle: "1. API",
    tasks: ["1.1 endpoint"],
    scope: "S",
    autoMode: "plan-only",
    specSlug: "lighthouse",
    repo: "daodao-storage",
  });
  it("keeps the Parent back-reference parseable", () => {
    expect(parseParentIssue(body)).toBe(150);
  });
  it("includes high-risk note and spec path", () => {
    expect(body).toContain("high-risk repo");
    expect(body).toContain("openspec/changes/lighthouse/");
    expect(body).toContain("- [ ] 1.1 endpoint");
  });
  it("mirror title combines central + section", () => {
    expect(buildMirrorTitle("燈塔", "1. API")).toBe("燈塔 — 1. API");
  });
});
