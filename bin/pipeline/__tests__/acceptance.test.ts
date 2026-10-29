import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { REQUEST_MARKER, lintAcceptanceComment } from "../acceptance.js";

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
      REQUEST_MARKER,
      "## 🙋 請驗收：x",
      "@peggy1213-create 請幫忙驗收。",
      "- 驗收步驟：",
      "  1. 登入後打開設定頁，按「儲存」，應該看到「已更新」",
      "  2. 登出再打開實踐頁，仍看得到這筆實踐",
      "  3. 主旨貼超過 500 字按儲存，應該出現紅色訊息「請求資料格式錯誤（主旨：…500 characters）」", // #292
      "  4. 用手機（或瀏覽器開發者工具設 384×500）打開我的足跡，對話框幾乎滿版", // #163
      "- 工程證據（已驗，PM 不需重做）：none",
      "- 驗完收尾：none",
    ].join("\n");
    expect(lintAcceptanceComment(body)).toEqual([]);
  });

  it("accepts Chinese-style numbering and UI words that look technical (review findings)", () => {
    const body = [
      REQUEST_MARKER,
      "## 🙋 請驗收：x",
      "@peggy1213-create 請幫忙驗收。",
      "- 驗收步驟：",
      "1、按 Log in 登入，再按「送出」", // unindented 1、 must not end the section
      "2.打開好友請求列表，應該看到加入請求", // bare 請求 is product copy
      "- 工程證據（已驗，PM 不需重做）：none",
      "- 驗完收尾：none",
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
    const body = REQUEST_MARKER + "\n## 🙋 請驗收：x\n@peggy1213-create\n- 驗收步驟：照著用\n- 工程證據（已驗，PM 不需重做）：none\n- 驗完收尾：none";
    expect(rules(body)).toEqual(["steps-missing"]);
  });

  // The PM's acceptance tool only accepts a comment with both the exact heading and the mention (#245, #346 BLOCKED).
  const handOff = (heading: string, mention: string) =>
    [REQUEST_MARKER, heading, mention, "- 驗收步驟：", "  1. 打開頁面，應該看到列表", "- 工程證據（已驗，PM 不需重做）：none", "- 驗完收尾：none"].join("\n");

  it("rejects #245/#346-style hand-off without the 「## 🙋 請驗收」 heading", () => {
    const r = rules(handOff("## ✅ dev 冒煙通過，交 PM 驗收", "@peggy1213-create 麻煩驗收："));
    expect(r).toContain("pm-heading-missing");
    expect(r).not.toContain("pm-mention-missing");
  });

  it("rejects a heading at the wrong level or without the emoji", () => {
    expect(rules(handOff("### 🙋 請驗收：x", "@peggy1213-create"))).toContain("pm-heading-missing");
    expect(rules(handOff("## 請驗收：x", "@peggy1213-create"))).toContain("pm-heading-missing");
  });

  it("rejects a hand-off without @peggy1213-create", () => {
    expect(rules(handOff("## 🙋 請驗收：x", "開發完成，請幫忙驗收。"))).toEqual(["pm-mention-missing"]);
  });

  it("accepts the hand-off once both the heading and the mention are present", () => {
    expect(lintAcceptanceComment(handOff("## 🙋 請驗收：x", "@peggy1213-create 請幫忙驗收。"))).toEqual([]);
  });

  // test-acceptance keys on the hidden marker instead of guessing the spec from wording or author role.
  it("rejects a hand-off without the hidden acceptance-request marker", () => {
    const body = handOff("## 🙋 請驗收：x", "@peggy1213-create 請幫忙驗收。").replace(REQUEST_MARKER + "\n", "");
    expect(rules(body)).toEqual(["request-marker-missing"]);
  });

  it("rejects a misspelled marker", () => {
    const body = handOff("## 🙋 請驗收：x", "@peggy1213-create").replace(REQUEST_MARKER, "<!-- daodao:acceptance-report -->");
    expect(rules(body)).toEqual(["request-marker-missing"]);
  });

  it("supports heading-style sections and allows API wording inside the engineering block", () => {
    const body = [
      REQUEST_MARKER,
      "## 🙋 請驗收：x",
      "@peggy1213-create 請幫忙驗收。",
      "### 驗收步驟",
      "1. 打開頁面，應該看到列表",
      "### 工程證據（已驗，PM 不需重做）",
      "- PUT body 與 GET 回讀：https://server-dev.daodao.so/api/v1/x",
      "### 驗完收尾",
      "到「我的實踐」刪除這次建立的實踐",
    ].join("\n");
    expect(lintAcceptanceComment(body)).toEqual([]);
  });

  // #141: the hand-off never said what to do with the practices acceptance creates.
  it("rejects a hand-off without a 「驗完收尾」 line", () => {
    const body = handOff("## 🙋 請驗收：x", "@peggy1213-create").replace("\n- 驗完收尾：none", "");
    expect(rules(body)).toEqual(["cleanup-missing"]);
  });

  it("does not count 收尾 mentioned only inside a step as the cleanup line", () => {
    const body = handOff("## 🙋 請驗收：x", "@peggy1213-create")
      .replace("\n- 驗完收尾：none", "")
      .replace("  1. 打開頁面，應該看到列表", "  1. 打開頁面，驗完收尾時記得截圖");
    expect(rules(body)).toContain("cleanup-missing");
  });

  // PM 只能 Google 登入，fixture 帳號與 dev-login 用不了：16 份 BLOCKED 報告來自交接留言指定了這類帳號
  const withAccount = (account: string) =>
    handOff("## 🙋 請驗收：x", "@peggy1213-create").replace("- 驗收步驟：", `- 測試帳號：${account}\n- 驗收步驟：`);

  it("rejects #279's account line: fixture accounts on a QA plus-address", () => {
    const r = rules(withAccount("加入頁用驗收 fixture「學員」帳號；後台用 fixture「組織管理員」帳號（都是 vincent.xu.work+fixture-… 的既有帳號）"));
    expect(r).toContain("pm-account-unusable");
  });

  it("rejects #277's account line: the fixture display name 驗收・組織管理員", () => {
    expect(rules(withAccount("管理端要用「驗收・組織管理員」（島島驗收組織）登入"))).toContain("pm-account-unusable");
  });

  it("rejects dev-login and fixture ids in the account section, including indented sub-lines", () => {
    expect(rules(withAccount("用 dev-login 登入 user 900002"))).toEqual(["pm-account-unusable", "pm-account-unusable"]);
    expect(rules(withAccount("PM 的一般使用者測試帳號\n  - 團主身分：帳號 900001"))).toEqual(["pm-account-unusable"]);
  });

  it("accepts PM test accounts, including one added to the fixture org", () => {
    expect(rules(withAccount("PM 的一般使用者測試帳號"))).toEqual([]);
    expect(rules(withAccount("PM 的 admin 測試帳號，已加進「島島驗收組織」當團主"))).toEqual([]);
  });

  // GitHub 的自動連結會把緊接在後的全形標點吃進網址，PM 點了 404（memory feedback_github_links_cjk_punct）
  const withUrlLine = (line: string) =>
    handOff("## 🙋 請驗收：x", "@peggy1213-create").replace("- 驗收步驟：", `- 測試網址：${line}\n- 驗收步驟：`);

  it("rejects a bare URL followed by full-width punctuation", () => {
    expect(rules(withUrlLine("https://app-dev.daodao.so/practices/create，登入後開始"))).toEqual(["bare-url-cjk-punct"]);
    expect(rules(withUrlLine("先開 https://app-dev.daodao.so/mine。"))).toEqual(["bare-url-cjk-punct"]);
    // #354：全形括號包住的網址，GitHub 會把「）」吃進連結
    expect(rules(withUrlLine("打開開通申請表單（https://tally.so/r/44WXdk）"))).toEqual(["bare-url-cjk-punct"]);
  });

  it("accepts Markdown links, <url>, and bare URLs followed by a space or ASCII punctuation", () => {
    expect(rules(withUrlLine("[建立實踐](https://app-dev.daodao.so/practices/create)，登入後開始"))).toEqual([]);
    expect(rules(withUrlLine("<https://app-dev.daodao.so/mine>。"))).toEqual([]);
    expect(rules(withUrlLine("https://app-dev.daodao.so/mine 登入後開始"))).toEqual([]);
    // #354：dev 冒煙段落把 href 寫在反引號裡，不會變成連結
    expect(rules(withUrlLine("連結 href `https://tally.so/r/44WXdk`、target 正確"))).toEqual([]);
  });

  it("only checks the account section: fixture wording in the engineering evidence is fine", () => {
    const body = withAccount("PM 的一般使用者測試帳號").replace(
      "- 工程證據（已驗，PM 不需重做）：none",
      "- 工程證據（已驗，PM 不需重做）：fixture 帳號 900003 以 dev-login 冒煙通過",
    );
    expect(rules(body)).toEqual([]);
  });
});
