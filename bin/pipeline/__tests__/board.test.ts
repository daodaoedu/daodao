import { describe, expect, it } from "vitest";
import {
  auditCards,
  prTargets,
  businessDaysSince,
  classifyReturnComment,
  resolveStatus,
  type AuditCard,
} from "../lib.js";
import {
  BLOCKED_ACCEPTANCE_LABEL,
  DEAD_LABELS,
  ENGINEERING_ACCEPTANCE_LABEL,
  PM_LOGIN,
  STATUS_ALIASES,
} from "../types.js";

const NOW = new Date("2026-09-20T00:00:00Z");
const card = (over: Partial<AuditCard>): AuditCard => ({
  number: 1,
  title: "t",
  status: "Todo",
  issueState: "OPEN",
  labels: [],
  updatedAt: "2026-09-19T00:00:00Z",
  statusUpdatedAt: "2026-09-19T00:00:00Z",
  assignees: [],
  prs: [],
  ...over,
});
const problems = (c: AuditCard) => auditCards([c], DEAD_LABELS, NOW).map((f) => f.problem);

describe("resolveStatus", () => {
  it("maps aliases case-insensitively with -/_/space interchangeable", () => {
    expect(resolveStatus("wip", STATUS_ALIASES)).toBe("In Progress");
    expect(resolveStatus("In-Progress", STATUS_ALIASES)).toBe("In Progress");
    expect(resolveStatus("need_fix", STATUS_ALIASES)).toBe("Need Fix");
    expect(resolveStatus("READY", STATUS_ALIASES)).toBe("Ready for Dev");
    expect(resolveStatus("accept", STATUS_ALIASES)).toBe("Acceptance");
    expect(resolveStatus("Acceptance", STATUS_ALIASES)).toBe("Acceptance");
    expect(resolveStatus("bogus", STATUS_ALIASES)).toBeNull();
  });
});

const pr = (ref: string, state: "open" | "merged" | "closed", linked = false) => ({ ref, state, linked });

describe("auditCards", () => {
  it("is quiet for a consistent card", () => {
    expect(problems(card({ status: "Review", prs: [pr("daodao-f2e#1", "open")] }))).toEqual([]);
    expect(problems(card({ status: "Done", issueState: "CLOSED" }))).toEqual([]);
  });

  it("flags a card with no Status at all", () => {
    expect(problems(card({ status: null }))).toContain("卡片沒有 Status");
  });

  it("flags Done with open issue, and a closed issue in any open-state column", () => {
    expect(problems(card({ status: "Done" }))).toContain("Done 但 issue 仍 open");
    for (const status of ["Todo", "Ready for Dev", "In Progress", "Review", "Acceptance", "Need Fix"]) {
      expect(problems(card({ status, issueState: "CLOSED" }))).toContain(
        `issue 已 close 但卡在 ${status}`
      );
    }
  });

  it("sends a card with an open PR to Review, per the dev-task finish contract", () => {
    const findings = auditCards(
      [card({ status: "Todo", prs: [pr("daodao-f2e#1008", "open")] })],
      DEAD_LABELS,
      NOW
    );
    const openPr = findings.find((f) => f.problem.startsWith("有 open PR"));
    expect(openPr?.suggest).toBe("移 Review");
  });

  it("flags merged-and-stale only after staleDays", () => {
    const merged = [pr("daodao-f2e#973", "merged")];
    const fresh = card({ status: "In Progress", prs: merged, updatedAt: "2026-09-19T00:00:00Z" });
    const stale = card({ status: "In Progress", prs: merged, updatedAt: "2026-09-05T00:00:00Z" });
    expect(problems(fresh).some((x) => x.startsWith("PR 全 merged"))).toBe(false);
    expect(problems(stale).some((x) => x.startsWith("PR 全 merged"))).toBe(true);
    // an open PR alongside merged ones means work is still flowing
    const mixed = card({ status: "In Progress", prs: [...merged, pr("daodao-server#9", "open")], updatedAt: "2026-09-05T00:00:00Z" });
    expect(problems(mixed).some((x) => x.startsWith("PR 全 merged"))).toBe(false);
  });

  it("ignores a central-repo PR that only mentions the card, but counts a linked one", () => {
    const mention = card({ status: "Todo", prs: [pr("daodao#215", "merged")], updatedAt: "2026-08-19T00:00:00Z" });
    expect(problems(mention)).toEqual([]);
    // root-only work (workflow/CLI changes) links its PR, so the card must still be caught
    const linked = card({ status: "Todo", prs: [pr("daodao#243", "merged", true)], updatedAt: "2026-08-19T00:00:00Z" });
    expect(problems(linked).some((x) => x.startsWith("PR 全 merged"))).toBe(true);
  });

  it("counts a central-repo PR whose Refs line targets the card (closing keywords skip acceptance, #364)", () => {
    const refs = card({ number: 364, status: "Todo", updatedAt: "2026-08-19T00:00:00Z",
      prs: [{ ref: "daodao#365", state: "merged", linked: false, targets: [364] }] });
    expect(problems(refs).some((x) => x.startsWith("PR 全 merged"))).toBe(true);
    const other = card({ number: 364, status: "Todo", updatedAt: "2026-08-19T00:00:00Z",
      prs: [{ ref: "daodao#366", state: "merged", linked: false, targets: [300] }] });
    expect(problems(other)).toEqual([]);
  });

  it("flags dead labels and human-driving left on Done", () => {
    expect(problems(card({ labels: ["needs-spec", "bug"] }))).toContain("死 label：needs-spec");
    expect(problems(card({ status: "Done", issueState: "CLOSED", labels: ["human-driving"] }))).toContain(
      "Done 仍掛 human-driving"
    );
  });

  it("sends a Review card whose PRs all merged a while ago to post-merge-wrapup", () => {
    const merged = [pr("daodao-f2e#973", "merged")];
    const stale = card({ status: "Review", prs: merged, statusUpdatedAt: "2026-09-05T00:00:00Z" });
    const fresh = card({ status: "Review", prs: merged, statusUpdatedAt: "2026-09-19T00:00:00Z" });
    const waiting = card({ status: "Review", prs: [pr("daodao-f2e#974", "open")], statusUpdatedAt: "2026-09-05T00:00:00Z" });
    // a status comment refreshes issue updatedAt but must not reset the Review clock
    const commented = card({ status: "Review", prs: merged, statusUpdatedAt: "2026-09-05T00:00:00Z", updatedAt: "2026-09-19T23:00:00Z" });
    const f = auditCards([stale], DEAD_LABELS, NOW).find((x) => x.problem.startsWith("PR 全 merged"));
    expect(f?.suggest).toContain("post-merge-wrapup");
    expect(problems(fresh).some((x) => x.startsWith("PR 全 merged"))).toBe(false);
    expect(problems(waiting).some((x) => x.startsWith("PR 全 merged"))).toBe(false);
    expect(problems(commented).some((x) => x.startsWith("PR 全 merged"))).toBe(true);
  });
});

describe("engineering acceptance (no PM)", () => {
  const eng = [ENGINEERING_ACCEPTANCE_LABEL];

  it("flags an engineering card sitting in Acceptance: it should close after dev smoke", () => {
    const c = card({ status: "Acceptance", labels: eng, assignees: [PM_LOGIN], prs: [pr("daodao#1", "merged")] });
    const f = auditCards([c], DEAD_LABELS, NOW);
    expect(f.map((x) => x.problem)).toContain(`工程驗收卡（${ENGINEERING_ACCEPTANCE_LABEL}）不需進 Acceptance`);
    // PM assignment / SLE rules do not apply to it
    expect(f.map((x) => x.problem).some((x) => x.startsWith("Acceptance 未指派") || x.includes("未驗收"))).toBe(false);
  });

  it("suggests closing instead of handing to PM when a merged engineering card is stale in Review", () => {
    const c = card({ status: "Review", labels: eng, prs: [pr("daodao#1", "merged", true)], statusUpdatedAt: "2026-09-05T00:00:00Z" });
    const f = auditCards([c], DEAD_LABELS, NOW).find((x) => x.problem.startsWith("PR 全 merged"));
    expect(f?.suggest).toContain("關 issue");
    expect(f?.suggest).not.toContain("Acceptance");
  });
});

describe("Acceptance column", () => {
  // 2026-09-20 is a Sunday; Taipei is UTC+8
  const accepted = (statusUpdatedAt: string, assignees = [PM_LOGIN]) =>
    card({ status: "Acceptance", statusUpdatedAt, assignees, prs: [pr("daodao-f2e#1", "merged")] });

  it("counts business days in Asia/Taipei, skipping weekends", () => {
    // Fri 09-18 10:00 Taipei → Sun 09-20: no business day has passed
    expect(businessDaysSince("2026-09-18T02:00:00Z", NOW)).toBe(0);
    // Wed 09-16 → Sun 09-20: Thu, Fri
    expect(businessDaysSince("2026-09-16T02:00:00Z", NOW)).toBe(2);
    // Mon 09-14 → Sun 09-20: Tue, Wed, Thu, Fri
    expect(businessDaysSince("2026-09-14T02:00:00Z", NOW)).toBe(4);
    // 23:30 UTC on Thu 09-17 is already Fri 09-18 in Taipei
    expect(businessDaysSince("2026-09-17T23:30:00Z", NOW)).toBe(0);
  });

  it("is quiet for an assigned card within the SLE", () => {
    expect(problems(accepted("2026-09-16T02:00:00Z"))).toEqual([]);
  });

  it("flags a card past the 2-business-day SLE", () => {
    const f = auditCards([accepted("2026-09-14T02:00:00Z")], DEAD_LABELS, NOW);
    expect(f.map((x) => x.problem)).toContain("Acceptance 已 4 個工作天未驗收（SLE 2）");
    expect(f[0].suggest).toContain(PM_LOGIN);
  });

  it("flags a card not assigned to the PM", () => {
    expect(problems(accepted("2026-09-18T02:00:00Z", ["vincentxuu"]))).toContain(
      `Acceptance 未指派 PM（${PM_LOGIN}）`
    );
  });

  it("does not apply Acceptance rules to other columns", () => {
    expect(problems(card({ status: "Review", statusUpdatedAt: "2026-09-01T00:00:00Z", prs: [pr("daodao-f2e#1", "open")] }))).toEqual([]);
  });

});

describe("parent cards", () => {
  const parent = (over: Partial<AuditCard>) =>
    card({ subIssues: { total: 3, completed: 1 }, prs: [pr("daodao-f2e#1", "merged")], ...over });

  it("flags a closed parent that still has open sub-issues", () => {
    expect(problems(parent({ status: "Done", issueState: "CLOSED" }))).toContain("母卡已 close，仍有 2 張子卡未關");
    expect(problems(parent({ status: "Done", issueState: "CLOSED", subIssues: { total: 3, completed: 3 } }))).toEqual([]);
  });

  it("flags a parent handed to the PM before its sub-issues are closed", () => {
    const f = problems(parent({ status: "Acceptance", assignees: [PM_LOGIN] }));
    expect(f).toContain("母卡在 Acceptance，仍有 2 張子卡未關");
    expect(problems(parent({ status: "Acceptance", assignees: [PM_LOGIN], subIssues: { total: 3, completed: 3 } }))).toEqual([]);
  });

  it("tells a stale merged parent in Review to wait for its sub-issues", () => {
    const f = auditCards([parent({ status: "Review", statusUpdatedAt: "2026-09-05T00:00:00Z" })], DEAD_LABELS, NOW);
    expect(f.find((x) => x.problem.startsWith("PR 全 merged"))?.suggest).toContain("等 2 張子卡關閉");
  });

  it("flags a third level: a sub-issue that has its own sub-issues", () => {
    const f = problems(card({ status: "Done", issueState: "CLOSED", parent: 150, subIssues: { total: 2, completed: 2 } }));
    expect(f).toContain("第三層：本卡是 #150 的子卡，底下又有 2 張子卡");
    expect(problems(card({ parent: 150 }))).toEqual([]);
  });

  it("does not ask a PR-less parent in Review for a PR", () => {
    expect(problems(card({ status: "Review", prs: [], subIssues: { total: 2, completed: 1 } }))).toEqual([]);
    expect(problems(card({ status: "Review", prs: [] }))).toContain("Review 但沒有關聯 PR");
  });

  it("flags sub-issues opened outside the central repo", () => {
    const f = problems(card({ subIssues: { total: 1, completed: 0 }, foreignSubIssues: ["daodao-f2e#1032"] }));
    expect(f).toContain("子卡不在中央 repo：daodao-f2e#1032");
  });
});

describe("sub-repo PR targets", () => {
  it("reads targets from the title marker and Refs/Closes lines, not from prose", () => {
    expect(prTargets("refactor(onboarding): 移除新手任務 — daodao#218", "DB 清理另卡 [daodaoedu/daodao#244](https://github.com/daodaoedu/daodao/issues/244)")).toEqual([218]);
    expect(prTargets("fix: x", "Closes daodaoedu/daodao#239\n- 無關的 bug：[daodao#257](u)")).toEqual([239]);
    expect(prTargets("fix: y", "Refs daodaoedu/daodao#293\nRefs daodaoedu/daodao#250")).toEqual([293, 250]);
    expect(prTargets("feat(chat): 對齊 FRD", "沒有標記")).toEqual([]);
  });

  it("does not count a PR that explicitly targets other cards", () => {
    const followUp = card({ number: 244, status: "Todo", updatedAt: "2026-09-01T00:00:00Z",
      prs: [{ ref: "daodao-server#490", state: "merged", linked: false, targets: [218] }] });
    expect(problems(followUp)).toEqual([]);
    // legacy PRs without any marker still count
    const legacy = card({ number: 166, status: "In Progress", updatedAt: "2026-09-01T00:00:00Z",
      prs: [{ ref: "daodao-f2e#985", state: "merged", linked: false, targets: [] }] });
    expect(problems(legacy).some((x) => x.startsWith("PR 全 merged"))).toBe(true);
    const own = card({ number: 293, status: "Todo", prs: [{ ref: "daodao-server#517", state: "open", linked: false, targets: [293, 250] }] });
    expect(problems(own).some((x) => x.startsWith("有 open PR"))).toBe(true);
  });
});

// Shapes taken from the 2026-10-14 board, when 17 cards sat in Need Fix but only 7 were AC failures (#338)
describe("Need Fix triage (#338)", () => {
  const OCT14 = new Date("2026-10-14T04:00:00Z");
  const audit = (c: AuditCard) => auditCards([c], DEAD_LABELS, OCT14);
  const PM_BLOCKED_250 = [
    "# 驗收說明",
    "## 本次驗收未完成：發現問題或測試受阻",
    "@vincentxuu 本次驗收無法完成，請協助確認測試環境的存取方式。導覽回報 `net::ERR_BLOCKED_BY_CLIENT`，頁籤停在 `about:blank`。",
    "- 整體結果：BLOCKED。",
    "- 狀態處理：本次更新說明後改為 Need Fix，請協助排除驗收阻擋。測試結果仍為 BLOCKED，尚未觀察到產品 FAIL。",
    "| 1／期待結果：非 UUID | 瀏覽器開啟 `/users/no-such-user/followers` | HTTP 400 | 導覽工具回報 ERR_BLOCKED_BY_CLIENT | BLOCKED |",
  ].join("\n");
  const PM_FAIL_236 = [
    "# 驗收說明",
    "## 依照本次「請驗收」說明完成驗收，發現問題",
    "- 整體結果：**FAIL**（第 1 步指定的「已儲存」提示未出現）",
    "| 1／AC-01、AC-06 | PE01 主旨加上「【PM 驗收】」並按「儲存」 | 顯示「已儲存」 | 未觀察到「已儲存」提示 | **FAIL**（儲存回饋） |",
    "## 失敗與阻擋",
    "- 其餘必要功能檢查無阻擋。",
  ].join("\n");

  it("classifies return comments: AC failure, blocked acceptance, or neither", () => {
    expect(classifyReturnComment(PM_FAIL_236)).toBe("ac-fail");
    expect(classifyReturnComment(PM_BLOCKED_250)).toBe("blocked");
    expect(classifyReturnComment("截圖無法上傳，請協助")).toBe("blocked");
    expect(classifyReturnComment("驗收時想順便把 /mine 的文案也改掉")).toBe("other");
    expect(classifyReturnComment("AC-02 PASS")).toBe("other");
  });

  it("does not let blocked wording, the hand-off, or the label name override a real failure", () => {
    // product failures that mention 無法 are still failures
    expect(classifyReturnComment("AC-02 未通過：使用者無法完成報名")).toBe("ac-fail");
    // a mixed report: one row really failed, another could not be run
    expect(classifyReturnComment("| AC-01 | … | FAIL |\n| AC-02 | … | BLOCKED |")).toBe("ac-fail");
    // fail word and AC ID on different lines is not a return
    expect(classifyReturnComment("對照 AC-01\n圖例：❌ 未通過")).toBe("other");
    // the 「🙋 請驗收」 hand-off lists AC IDs, ❌ and the label — it is never a return
    const handoff = "## 🙋 請驗收：x\n1. 點儲存（對應 AC-01）\n❌ 有 AC 沒過 → …\n⏸ 測不了 → 加 `acceptance:blocked`";
    expect(classifyReturnComment(handoff)).toBe("other");
    expect(classifyReturnComment("已排除，拔掉 acceptance:blocked")).toBe("other");
  });

  it("#250: a blocked acceptance moved to Need Fix goes back to Acceptance with acceptance:blocked", () => {
    const f = audit(card({ number: 250, status: "Need Fix", statusUpdatedAt: "2026-10-12T15:00:00Z",
      comments: [{ createdAt: "2026-10-12T14:49:14Z", body: PM_BLOCKED_250 }] }));
    const hit = f.find((x) => x.problem === "Need Fix 的退回是驗收受阻，不是 AC 失敗");
    expect(hit?.suggest).toContain(BLOCKED_ACCEPTANCE_LABEL);
  });

  it("#236: Need Fix for over 24 hours with no return comment", () => {
    const f = audit(card({ number: 236, status: "Need Fix", statusUpdatedAt: "2026-10-11T02:00:00Z", comments: [] }));
    const hit = f.find((x) => x.problem.startsWith("Need Fix 已 74 小時，沒有「哪條 AC 失敗＋看到什麼」的退回留言"));
    expect(hit?.suggest).toContain("另開卡");
  });

  it("is quiet for a Need Fix card whose return names the failing AC, or that is under 24 hours", () => {
    const failed = card({ number: 236, status: "Need Fix", statusUpdatedAt: "2026-10-11T02:00:00Z",
      comments: [{ createdAt: "2026-10-11T01:50:00Z", body: PM_FAIL_236 }] });
    expect(audit(failed)).toEqual([]);
    const fresh = card({ status: "Need Fix", statusUpdatedAt: "2026-10-13T12:00:00Z", comments: [] });
    expect(audit(fresh)).toEqual([]);
    // a fail comment from an earlier round (long before this move) does not count
    const old = card({ status: "Need Fix", statusUpdatedAt: "2026-10-11T02:00:00Z",
      comments: [{ createdAt: "2026-09-20T00:00:00Z", body: PM_FAIL_236 }] });
    expect(audit(old).some((x) => x.problem.includes("沒有「哪條 AC 失敗"))).toBe(true);
  });

  it("#141: a parent whose sub-issues are all closed is due for smoke and PM acceptance", () => {
    const f = audit(card({ number: 141, status: "Need Fix", statusUpdatedAt: "2026-09-15T00:00:00Z",
      subIssues: { total: 3, completed: 3 }, prs: [pr("daodao-f2e#952", "merged")] }));
    const hit = f.find((x) => x.problem === "母卡的 3 張子卡已全關，母卡仍在 Need Fix");
    expect(hit?.suggest).toContain("移 Acceptance");
    // still waiting on a sub-issue → no such finding
    const waiting = audit(card({ number: 141, status: "Review", subIssues: { total: 4, completed: 3 }, prs: [pr("daodao-f2e#952", "merged")] }));
    expect(waiting.some((x) => x.problem.startsWith("母卡的"))).toBe(false);
    // engineering parent closes instead of going to the PM
    const eng = audit(card({ status: "Review", labels: [ENGINEERING_ACCEPTANCE_LABEL], subIssues: { total: 2, completed: 2 } }));
    expect(eng.find((x) => x.problem.startsWith("母卡的"))?.suggest).toContain("關 issue");
  });

  it("#212／#279: a closed issue still sitting in Need Fix is reported (regression)", () => {
    for (const n of [212, 279]) {
      const f = audit(card({ number: n, status: "Need Fix", issueState: "CLOSED", statusUpdatedAt: "2026-10-14T02:00:00Z" }));
      expect(f.map((x) => x.problem)).toContain("issue 已 close 但卡在 Need Fix");
      expect(f.some((x) => x.problem.includes("沒有「哪條 AC 失敗"))).toBe(false);
    }
  });

  it("flags acceptance:blocked left for more than 48 hours", () => {
    const blocked = (addedAt: string) =>
      card({ status: "Acceptance", assignees: [PM_LOGIN], statusUpdatedAt: "2026-10-13T00:00:00Z",
        labels: [BLOCKED_ACCEPTANCE_LABEL], labelAddedAt: { [BLOCKED_ACCEPTANCE_LABEL]: addedAt } });
    expect(audit(blocked("2026-10-11T00:00:00Z")).map((x) => x.problem)).toContain(`${BLOCKED_ACCEPTANCE_LABEL} 已 76 小時未排除`);
    expect(audit(blocked("2026-10-13T00:00:00Z")).some((x) => x.problem.includes(BLOCKED_ACCEPTANCE_LABEL))).toBe(false);
  });
});
