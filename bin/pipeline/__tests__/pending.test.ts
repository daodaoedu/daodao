import { describe, expect, it } from "vitest";
import { pendingDecisions, type PendingCard } from "../lib.js";
import { BLOCKED_ACCEPTANCE_LABEL } from "../types.js";

const NOW = new Date("2026-10-29T03:00:00Z");
const card = (over: Partial<PendingCard>): PendingCard => ({
  number: 1,
  title: "t",
  status: "Review",
  labels: [],
  statusUpdatedAt: "2026-10-27T03:00:00Z",
  prs: [],
  subIssues: { total: 0, completed: 0 },
  comments: [],
  ...over,
});
const comment = (body: string, url: string, createdAt = "2026-10-28T00:00:00Z") => ({ body, url, createdAt });

describe("pendingDecisions", () => {
  it("Review 有開著的 PR：等 reviewer 審查合併，證據是 PR 連結", () => {
    const [d] = pendingDecisions([card({ number: 276, prs: [{ ref: "daodao-server#583", state: "open" }] })], NOW);
    expect(d).toMatchObject({ number: 276, waitsOn: "reviewer" });
    expect(d.decision).toContain("daodao-server#583");
    expect(d.evidence?.url).toBe("https://github.com/daodaoedu/daodao-server/pull/583");
  });

  it("Review 的 PR 都合併了：等工程跑 verify-deploy", () => {
    const [d] = pendingDecisions([card({ prs: [{ ref: "daodao-f2e#1090", state: "merged" }] })], NOW);
    expect(d.waitsOn).toBe("engineer");
    expect(d.decision).toContain("verify-deploy");
  });

  it("母卡的子卡還沒全關：在等子卡，不列為等人決定", () => {
    const parent = card({ prs: [{ ref: "daodao#1", state: "merged" }], subIssues: { total: 4, completed: 2 } });
    expect(pendingDecisions([parent], NOW)).toEqual([]);
  });

  it("Acceptance：等 PM，證據是最新一則請驗收留言（不是較舊的那則）", () => {
    const c = card({
      status: "Acceptance",
      comments: [
        comment("## 🙋 請驗收：舊版", "https://x/old", "2026-10-20T00:00:00Z"),
        comment("冒煙紀錄", "https://x/smoke", "2026-10-27T00:00:00Z"),
        comment("<!-- daodao:acceptance-request -->\n## 🙋 請驗收：新版", "https://x/new", "2026-10-28T00:00:00Z"),
      ],
    });
    const [d] = pendingDecisions([c], NOW);
    expect(d).toMatchObject({ waitsOn: "pm", evidence: { url: "https://x/new" } });
  });

  it("Acceptance 但掛 acceptance:blocked：改成等工程排除受阻，證據是受阻說明", () => {
    const c = card({
      status: "Acceptance",
      labels: [BLOCKED_ACCEPTANCE_LABEL],
      comments: [
        comment("## 🙋 請驗收：x", "https://x/req"),
        comment("本次驗收受阻：截圖傳不上去", "https://x/blocked", "2026-10-29T00:00:00Z"),
      ],
    });
    const [d] = pendingDecisions([c], NOW);
    expect(d).toMatchObject({ waitsOn: "engineer", evidence: { url: "https://x/blocked" } });
  });

  it("Need Fix：等工程，證據是 AC 失敗留言；找不到時說明要確認退回原因", () => {
    const withFail = card({ status: "Need Fix", comments: [comment("| AC-01 | ... | FAIL |", "https://x/fail")] });
    const without = card({ number: 342, status: "Need Fix", comments: [comment("請看一下", "https://x/other")] });
    const [a, b] = pendingDecisions([withFail, without], NOW);
    expect(a).toMatchObject({ waitsOn: "engineer", evidence: { url: "https://x/fail" } });
    expect(b.evidence).toBeNull();
    expect(b.decision).toContain("找不到 AC 失敗留言");
  });

  it("Done、In Progress 等其他欄位不列出", () => {
    expect(pendingDecisions([card({ status: "Done" }), card({ status: "In Progress" })], NOW)).toEqual([]);
  });

  it("先列等 reviewer、再等工程、最後等 PM；同一組裡等越久越前面", () => {
    const cards = [
      card({ number: 1, status: "Acceptance", statusUpdatedAt: "2026-10-20T03:00:00Z" }),
      card({ number: 2, status: "Need Fix", statusUpdatedAt: "2026-10-28T03:00:00Z" }),
      card({ number: 3, status: "Need Fix", statusUpdatedAt: "2026-10-21T03:00:00Z" }),
      card({ number: 4, prs: [{ ref: "daodao#9", state: "open" }] }),
    ];
    expect(pendingDecisions(cards, NOW).map((d) => d.number)).toEqual([4, 3, 2, 1]);
  });
});
