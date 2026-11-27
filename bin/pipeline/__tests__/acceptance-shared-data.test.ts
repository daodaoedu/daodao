import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  FIXTURE_HEALTH_ISSUE_TITLE,
  deriveFixtureHealth,
  lintAcceptanceComment,
  lintFixtureHealth,
  referencesAcceptanceFixture,
} from "../acceptance.js";

// daodao#326: the three checks #379 left out — fixed shared-data counts (#216), next-day
// observation without a marked date (#218), and fixture health before posting (#179／#180).
const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures/acceptance");
const fixture = (name: string) => readFileSync(join(dir, name), "utf8");
/** The flagged lines' text, so a test asserts which step was blocked and by which rule. */
const flagged = (body: string, rule: string) =>
  lintAcceptanceComment(body)
    .filter((f) => f.rule === rule)
    .map((f) => body.split("\n")[f.line - 1]);
/** A passing hand-off (#370 rewritten per the template) with extra PM steps appended. */
const withSteps = (...steps: string[]) =>
  fixture("370-fixed.md").replace(
    "- 對照的 AC：",
    `${steps.map((s, i) => `  ${6 + i}. ${s}`).join("\n")}\n- 對照的 AC：`,
  );

describe("AC-01: the original #216／#218／#293 hand-offs are blocked by the rule for their actual problem", () => {
  it("#216: blocks step 2's fixed 「24 個模板」 on the shared dev list (PM saw 25 and failed it)", () => {
    expect(flagged(fixture("216-original.md"), "pm-step-fixed-count")).toEqual([
      expect.stringContaining("應該看到 24 個模板"),
    ]);
  });

  it("#218: blocks step 5's 「之後不會再收到新手任務系列信」, a next-day check with no marked date", () => {
    expect(flagged(fixture("218-original.md"), "deferred-observation-unmarked")).toEqual([
      expect.stringContaining("不會再收到新手任務系列信"),
    ]);
  });

  it("#293: still blocked for sending the PM to API URLs", () => {
    const rules = lintAcceptanceComment(fixture("293-original.md")).map((f) => f.rule);
    expect(rules).toContain("pm-technical-url");
    expect(rules).toContain("pm-step-technical");
  });

  it("blocks the Need Fix reproduction: both problems added to an otherwise passing hand-off", () => {
    const body = withSteps(
      "進島島驗收組織的範本列表，應該剛好看到 3 個範本",
      "隔天早上再打開信箱，應該收到一封提醒信",
    );
    expect(flagged(body, "pm-step-fixed-count")).toEqual([expect.stringContaining("剛好看到 3 個範本")]);
    expect(flagged(body, "deferred-observation-unmarked")).toEqual([expect.stringContaining("隔天早上再打開信箱")]);
  });
});

describe("fixed shared-data count", () => {
  it("accepts the template's relative wording", () => {
    for (const step of [
      "回到列表，應該比原本多 1 筆",
      "刪掉剛才那筆後，列表比操作前少 1 筆",
      "按「新增」後列表增加 1 個範本",
    ]) {
      expect(flagged(withSteps(step), "pm-step-fixed-count"), step).toEqual([]);
    }
  });

  it("does not treat inputs, step numbers, sizes, durations or quoted copy as a data count", () => {
    for (const step of [
      "天數輸入 45、頻率輸入 1-3，完成建立",
      "回到第 2 步的頁面，按「儲存」",
      "手機 390×844 CSS px 打開頁面，對話框幾乎滿版",
      "每次時間選 25 分鐘，應該顯示「一次 25 分鐘」",
      "應該看到「已排入 3 封邀請信」",
    ]) {
      expect(flagged(withSteps(step), "pm-step-fixed-count"), step).toEqual([]);
    }
  });

  it("accepts counts of fixed UI copy and of data prepared only for this hand-off (recent hand-offs #163／#401)", () => {
    for (const step of [
      "點「想對未來的自己說」旁邊的 ?，提示框裡有 6 條建議",
      "在「QA401 PM 主場次」那一列按「編輯場次資源」，應看到 3 筆資源",
      "改用學員帳號開啟上方專用實踐，應立即看到 3 筆帶鎖頭的共用資源",
    ]) {
      expect(flagged(withSteps(step), "pm-step-fixed-count"), step).toEqual([]);
    }
  });

  it("blocks other fixed counts of listed data", () => {
    for (const step of ["打開成員頁，應該顯示 12 位成員", "通知列表共 5 則通知", "列表只剩 2 筆實踐"]) {
      expect(flagged(withSteps(step), "pm-step-fixed-count"), step).toHaveLength(1);
    }
  });
});

describe("next-day observation", () => {
  it("accepts a step marked 「隔日觀察」 with the date to check", () => {
    for (const step of [
      "隔日觀察（2026-11-28 上午）：隔天早上打開信箱，應該收到提醒信",
      "隔日觀察（11/28 起）：之後不會再收到新手任務系列信",
    ]) {
      expect(flagged(withSteps(step), "deferred-observation-unmarked"), step).toEqual([]);
    }
  });

  it("blocks a step that has only the marker or only the date", () => {
    expect(flagged(withSteps("隔日觀察：隔天打開信箱，應該收到提醒信"), "deferred-observation-unmarked")).toHaveLength(1);
    expect(flagged(withSteps("2026-11-28 隔天打開信箱，應該收到提醒信"), "deferred-observation-unmarked")).toHaveLength(1);
  });

  it("blocks other wordings that need a later visit", () => {
    for (const step of ["3 天後再打開實踐頁，應該看到提醒", "明天早上打開首頁，應該看到新的推薦", "過幾天再看信箱，應該收到週報"]) {
      expect(flagged(withSteps(step), "deferred-observation-unmarked"), step).toHaveLength(1);
    }
  });

  it("does not flag same-session wording", () => {
    for (const step of [
      "登入之後打開設定頁，應該看到已更新",
      "儲存之後重新整理，名稱沒變",
      "之後回到首頁，應該只看到一個「＋」按鈕",
      // dates to pick and data described, from recent hand-offs (#163, #212, #475, #521)
      "選「自訂日期」，今天到後天都不能選，最早只能選 3 天後",
      "再建立一筆開始日選 3 天後的實踐，回到「個人實踐」",
      "重新查看彈窗；跨日結束日期完整可讀",
      "名稱使用 QA521-PM新建-加上當次日期時間",
    ]) {
      expect(flagged(withSteps(step), "deferred-observation-unmarked"), step).toEqual([]);
    }
  });
});

describe("AC-02: fixture health", () => {
  const usesFixture = withSteps("用你的帳號打開島島驗收組織的範本頁，按「新增範本」");

  it("knows when a hand-off depends on the fixture org", () => {
    expect(referencesAcceptanceFixture(usesFixture)).toBe(true);
    expect(referencesAcceptanceFixture(withSteps("打開 [驗收燈塔場次](https://app-dev.daodao.so/lighthouse/cohorts/900001)"))).toBe(true);
    expect(referencesAcceptanceFixture(fixture("370-fixed.md"))).toBe(false);
  });

  it("refuses to post a fixture hand-off while the fixture is unhealthy", () => {
    const findings = lintFixtureHealth(usesFixture, { state: "unhealthy", reason: "#999 open" });
    expect(findings.map((f) => f.rule)).toEqual(["fixture-unhealthy"]);
    expect(findings[0].message).toContain("#999 open");
  });

  it("refuses when the health is unknown (check did not run)", () => {
    expect(lintFixtureHealth(usesFixture, { state: "unknown", reason: "job not started" }).map((f) => f.rule)).toEqual([
      "fixture-health-unknown",
    ]);
  });

  it("allows a fixture hand-off when healthy, and ignores health for hand-offs not using the fixture", () => {
    expect(lintFixtureHealth(usesFixture, { state: "healthy" })).toEqual([]);
    expect(lintFixtureHealth(fixture("370-fixed.md"), { state: "unhealthy", reason: "x" })).toEqual([]);
  });

  describe("deriveFixtureHealth (storage acceptance-fixture-health workflow + its bug issue)", () => {
    const now = new Date("2026-11-27T09:00:00Z");
    const run = (createdAt: string, conclusion: string, unhealthyStepFailed = false) => ({ createdAt, conclusion, unhealthyStepFailed });

    it("is unhealthy while the workflow's bug issue is open, even after a green run", () => {
      const h = deriveFixtureHealth([{ number: 999, title: FIXTURE_HEALTH_ISSUE_TITLE }], run("2026-11-27T00:40:00Z", "success"), now);
      expect(h.state).toBe("unhealthy");
    });

    it("is unhealthy when the latest run reached its 「fail when unhealthy」 step", () => {
      expect(deriveFixtureHealth([], run("2026-11-27T00:40:00Z", "failure", true), now).state).toBe("unhealthy");
    });

    it("is healthy after a green run within the last day and a half", () => {
      expect(deriveFixtureHealth([], run("2026-11-27T00:40:00Z", "success"), now)).toEqual({ state: "healthy" });
    });

    it("is unknown when the job never started (2026-11 billing), the last green run is stale, or there is no run", () => {
      expect(deriveFixtureHealth([], run("2026-11-27T00:40:00Z", "failure"), now).state).toBe("unknown");
      expect(deriveFixtureHealth([], run("2026-11-25T00:40:00Z", "success"), now).state).toBe("unknown");
      expect(deriveFixtureHealth([], null, now).state).toBe("unknown");
    });

    it("ignores open issues with other titles", () => {
      expect(deriveFixtureHealth([{ number: 1, title: "其他 bug" }], run("2026-11-27T00:40:00Z", "success"), now).state).toBe("healthy");
    });
  });
});

describe("AC-03: a qualifying recent hand-off still passes", () => {
  it("accepts #370 rewritten per the template with no new findings", () => {
    expect(lintAcceptanceComment(fixture("370-fixed.md"))).toEqual([]);
  });
});
