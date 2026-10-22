import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lintAcceptanceComment } from "../acceptance.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures/acceptance");
const fixture = (name: string) => readFileSync(join(dir, name), "utf8");
const rules = (body: string) => lintAcceptanceComment(body).map((f) => f.rule);

describe("lintAcceptanceComment", () => {
  it("rejects #370's original comment: no engineering-evidence block, PM chased PUT body/GET read-back from the contract", () => {
    expect(rules(fixture("370-original.md"))).toContain("engineering-evidence-missing");
  });

  it("rejects #358's original comment (smoke table above is not linted, the hand-off part is)", () => {
    const r = rules(fixture("358-original.md"));
    expect(r).toContain("engineering-evidence-missing");
    expect(r).not.toContain("pm-step-technical"); // PUT body lives in the smoke table above the heading
  });

  it("rejects #293's original comment: sends the PM to raw API URLs", () => {
    const f = lintAcceptanceComment(fixture("293-original.md"));
    expect(f.filter((x) => x.rule === "pm-technical-url").length).toBeGreaterThanOrEqual(3);
    expect(f.map((x) => x.rule)).toContain("pm-step-technical");
  });

  it("flags every API / test term in PM steps", () => {
    const msgs = lintAcceptanceComment(fixture("api-in-steps.md"))
      .filter((f) => f.rule === "pm-step-technical")
      .map((f) => f.message);
    for (const term of ["PUT", "body", "GET", "回讀", "regression", "curl", "response"]) {
      expect(msgs.some((m) => m.includes(`「${term}`))).toBe(true);
    }
  });

  it("accepts #370 rewritten per the new template (API/test evidence only in the engineering block)", () => {
    expect(lintAcceptanceComment(fixture("370-fixed.md"))).toEqual([]);
  });

  it("does not treat ordinary Chinese UI wording as technical", () => {
    const body = [
      "## 🙋 請驗收：x",
      "- 驗收步驟：",
      "  1. 登入後打開設定頁，按「儲存」，應該看到「已更新」",
      "  2. 登出再打開實踐頁，仍看得到這筆實踐",
      "  3. 主旨貼超過 500 字按儲存，應該出現紅色訊息「請求資料格式錯誤（主旨：…500 characters）」", // #292
      "  4. 用手機（或瀏覽器開發者工具設 384×500）打開我的足跡，對話框幾乎滿版", // #163
      "- 工程證據（已驗，PM 不需重做）：none",
    ].join("\n");
    expect(lintAcceptanceComment(body)).toEqual([]);
  });

  it("accepts Chinese-style numbering and UI words that look technical (review findings)", () => {
    const body = [
      "## 🙋 請驗收：x",
      "- 驗收步驟：",
      "1、按 Log in 登入，再按「送出」", // unindented 1、 must not end the section
      "2.打開好友請求列表，應該看到加入請求", // bare 請求 is product copy
      "- 工程證據（已驗，PM 不需重做）：none",
    ].join("\n");
    expect(lintAcceptanceComment(body)).toEqual([]);
  });

  it("catches technical wording the first version missed (review findings)", () => {
    const cases = [
      "- 驗收步驟（只看畫面）：照工程用 PUT 送出\n  1. 打開頁面",
      "- 驗收步驟：\n  1. 用 Postman 打 /practices 端點，HTTP 200",
      "- 驗收步驟：\n  1. 用 SQL 查 DB 確認",
      "- 驗收步驟：\n  1. 跑 pnpm test 全過",
      "- 驗收步驟：\n  1. 確認「PUT /practices body 有 privacy」",
    ];
    for (const c of cases) {
      const body = `## 🙋 請驗收：x\n${c}\n- 工程證據（已驗，PM 不需重做）：none`;
      expect(rules(body), c).toContain("pm-step-technical");
    }
  });

  it("requires numbered steps", () => {
    const body = "## 🙋 請驗收：x\n- 驗收步驟：照著用\n- 工程證據（已驗，PM 不需重做）：none";
    expect(rules(body)).toEqual(["steps-missing"]);
  });

  it("supports heading-style sections and allows API wording inside the engineering block", () => {
    const body = [
      "## 🙋 請驗收：x",
      "### 驗收步驟",
      "1. 打開頁面，應該看到列表",
      "### 工程證據（已驗，PM 不需重做）",
      "- PUT body 與 GET 回讀：https://server-dev.daodao.so/api/v1/x",
    ].join("\n");
    expect(lintAcceptanceComment(body)).toEqual([]);
  });
});
