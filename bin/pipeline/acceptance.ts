/**
 * Lint for the 「請驗收」 hand-off comment (plugin/templates/issue-status-comment.md).
 *
 * PM steps must be things the PM can do and see on screen. API payloads / read-backs,
 * regression tests, CI and logs belong in the 「工程證據（已驗，PM 不需重做）」 block —
 * #370 and #358 were bounced as BLOCKED because the PM was asked for PUT bodies,
 * GET read-backs and regression test output. #293 sent the PM to a raw API URL.
 */

export type AcceptanceLintFinding = { line: number; rule: string; message: string };

/** Terms that never belong in PM steps. Tested against each step line. */
export const PM_STEP_FORBIDDEN: ReadonlyArray<{ label: string; re: RegExp }> = [
  { label: "HTTP 方法", re: /\b(?:GET|PUT|POST|PATCH|DELETE)\b/ },
  { label: "API", re: /\bAPI\b|\bendpoints?\b|端點|\/api\/|\bPostman\b/i },
  { label: "body", re: /\bbody\b/i },
  // Bare 請求 is product copy (好友請求、加入請求), so only the English word counts here.
  { label: "request", re: /\brequests?\b/i },
  { label: "response", re: /\bresponses?\b|status code|狀態碼|\bHTTP\s*\d{3}\b/i },
  { label: "payload", re: /\bpayload\b|送出內容|回傳的原始資料/i },
  { label: "回讀", re: /回讀|read-?back/i },
  {
    label: "regression test",
    re: /regression|回歸測試|單元測試|unit test|測試輸出|test job|\b(?:pnpm|npm|yarn)\s+(?:run\s+)?test\b|\bvitest\b|\bjest\b|\bpytest\b/i,
  },
  { label: "CI", re: /\bCI\b|GitHub Actions/ },
  { label: "curl", re: /\bcurl\b/i },
  // 「資料庫錯誤」 can be what the PM sees on screen (#179), so only DB／SQL count.
  { label: "DB", re: /\bDB\b|\bSQL\b/ },
  // Devtools for a viewport size is something the PM can do (#163), so only console／network count.
  // "Log in／Log out" are UI labels, not logs.
  { label: "log", re: /\blogs?\b(?![\s-]*(?:in|out)\b)|console|network 分頁|網路請求/i },
  { label: "JSON 欄位", re: /"[A-Za-z_]+"\s*:/ },
];

/**
 * A bare URL running into full-width punctuation: GitHub's autolink swallows the 「，」「。」 into the
 * link, so the PM gets a 404 (memory feedback_github_links_cjk_punct). Markdown links and <url> are fine:
 * the URL stops at the closing `)` or `>` before any punctuation.
 */
const BARE_URL_CJK = /https?:\/\/[^\s<>()\[\]]*?[（）、，。：；！？「」]/;

/** Technical URLs the PM should never be sent to (anywhere outside the engineering block). */
const TECH_URL = /https?:\/\/(?:server-dev\.|server\.|[^\s)]*\/api\/)[^\s)]*/i;

/**
 * The PM's acceptance tool only treats a comment as the spec when the same comment has
 * both this exact heading and the PM mention; otherwise it reports BLOCKED (#245, #346).
 */
const REQUIRED_HEADING = /^## 🙋 請驗收/;
export const PM_MENTION = "@peggy1213-create";

/**
 * Hidden marker the acceptance tool (plugin/skills/test-acceptance) keys on, so it does not have
 * to guess which comment is the spec from visible wording or the author's role.
 */
export const REQUEST_MARKER = "<!-- daodao:acceptance-request -->";
const REQUEST_MARKER_RE = /<!--\s*daodao:acceptance-request\s*-->/;

const ENGINEERING_HEADER =/^(?:\s*[-*]\s*|#{1,6}\s+)\**工程證據/;
const STEPS_HEADER = /^(?:\s*[-*]\s*|#{1,6}\s+)\**驗收步驟/;
/** #141's hand-off had no cleanup line, so the PM could not tell whether to delete the practices it created. */
const CLEANUP_HEADER = /^(?:\s*[-*]\s*|#{1,6}\s+)\**驗完收尾/;
const ACCOUNT_HEADER = /^(?:\s*[-*]\s*|#{1,6}\s+)\**測試帳號/;

/**
 * Accounts the PM cannot sign in with: the PM only has Google login, while fixture accounts
 * (#323, ids 900001–900003, display names 「驗收・組織管理員」 etc.) and QA plus-addresses only work
 * through the engineers' dev-login. 16 BLOCKED reports came from hand-offs naming them (#277, #279).
 * 「島島驗收組織」 alone is fine: the PM's own account can be added to the fixture org.
 */
const PM_UNUSABLE_ACCOUNT: ReadonlyArray<{ label: string; re: RegExp }> = [
  { label: "fixture 帳號", re: /fixture|驗收・(?:組織管理員|教練|學員)/i },
  { label: "QA plus 別名信箱", re: /\+(?:qa|fixture)[\w-]*@|[\w.]+\+[\w-]+@/i },
  { label: "dev-login", re: /dev-?login/i },
  { label: "fixture 帳號 ID", re: /\b9000\d\d\b/ },
];

/** Numbered step: `1. x`, `1.x`, `1、x`, `1) x`. */
const STEP_LINE = /^\s*\d+[.)、．]\s*\S/;

/** 「」 normally wraps on-screen copy; keep its content when it smuggles in HTTP / URL paths. */
const QUOTED_TECH = /\b(?:GET|PUT|POST|PATCH|DELETE)\b|\/|\bcurl\b|\bbody\b/i;

/** A line that starts a new top-level item (ends the current section). */
function isTopLevelBoundary(line: string): boolean {
  if (/^\s+\S/.test(line)) return false; // indented → still inside
  if (line.trim() === "") return false;
  if (STEP_LINE.test(line)) return false; // non-indented numbered step
  return true;
}

/** Line indexes belonging to the section whose header line matches `header`. */
function sectionLines(lines: string[], header: RegExp): { headerIdx: number; idx: number[] } | null {
  const headerIdx = lines.findIndex((l) => header.test(l));
  if (headerIdx < 0) return null;
  const idx: number[] = [];
  const isHeading = /^#{1,6}\s/.test(lines[headerIdx]);
  for (let i = headerIdx + 1; i < lines.length; i++) {
    // Heading-style section runs to the next heading or the ✅／❌ footer; bullet-style to the next top-level line.
    if (isHeading ? /^(?:#{1,6}\s|[✅❌])/.test(lines[i]) : isTopLevelBoundary(lines[i])) break;
    idx.push(i);
  }
  return { headerIdx, idx };
}

/**
 * #395 specified only 「手機寬度」. Check the PM's numbered step itself, not the
 * engineering evidence or a preceding desktop step. This checks written prerequisites,
 * not whether the browser was actually resized or the assertions were performed.
 */
function hasMobileWithoutViewport(step: string): boolean {
  const text = step.replace(/「[^」]*」/g, "").replace(/\*\*/g, "");
  const pair = /(?<!\d)[1-9]\d*\s*(?:px)?\s*[×xX]\s*[1-9]\d*(?!\d)(?:\s*(?:CSS\s*)?px)?/i;
  const named = /(?:寬(?:度)?|width)\s*(?:設為|為|[:：=])?\s*[1-9]\d*\s*(?:px)?[，,、\s]*(?:高(?:度)?|height)\s*(?:設為|為|[:：=])?\s*[1-9]\d*\s*(?:px)?/i;
  let requiresMobile = false;
  for (const match of text.matchAll(/手機|行動版|響應式|\bmobile\b|\bresponsive\b/gi)) {
    const before = text.slice(0, match.index).trimEnd();
    const after = text.slice(match.index + match[0].length);
    // Exclusions are narrow: 「手機不需登入」 still requests mobile testing.
    if (/(?:不驗|不測|(?:不需(?:要)?|無需|不用|不必)(?:驗收?|驗證|測試)?|略過|排除)(?:使用|用|再|進行)?$/.test(before) ||
        /^(?:版|尺寸|檢視)?(?:(?:不需(?:要)?|無需|不用|不必)(?:重測|驗收|驗證|測試)|不(?:驗收|測試|重測)|不適用|由工程(?:驗|提供))/.test(after)) continue;
    requiresMobile = true;
    // A later desktop clause cannot supply the missing mobile dimensions.
    const mobileClause = after.split(/桌面|\bdesktop\b/i)[0];
    if (pair.test(mobileClause) || named.test(mobileClause)) return false;
    // Also allow 「設390×866（手機）」, without borrowing a desktop-labelled pair.
    const precedingClause = before.split(/[。；;\n]/).at(-1) ?? "";
    if (!/桌面|\bdesktop\b/i.test(precedingClause) &&
        new RegExp(`${pair.source}[\\s（(]*$`, "i").test(precedingClause)) return false;
  }
  return requiresMobile;
}

/** Text the PM reads as an instruction: drop on-screen copy in 「」, `code`, Markdown bold and URLs. */
function instructionText(line: string): string {
  return line
    .replace(/「[^」]*」/g, "「」")
    .replace(/`[^`]*`/g, "")
    .replace(/\*\*/g, "")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/https?:\/\/\S+/g, "");
}

/**
 * #216: 「應該看到 24 個模板」 on the shared dev list; someone added one the next day and the PM failed
 * a working page. An expectation verb followed by an absolute count of listed items. Template rule:
 * shared data takes relative wording (「比原本多 1 筆」), so a step with relative wording is fine.
 */
// 條／項 are left out: they mostly count fixed UI copy (「提示框裡有 6 條建議」, #163), not listed data.
const FIXED_COUNT =
  /(?:看到|看得到|顯示|列出|出現|只剩|剩下|剩|總共|一共|共|剛好|合計|有)\s*(\d+)\s*(?:個|筆|則|篇|張|位|人|封|列|份|場|組|堂|門|團|間|家|本|支|題|期)/;
/**
 * Relative wording, or data prepared only for this hand-off (「QA401 PM 主場次」「專用實踐」): other tests do
 * not touch it, so its count is stable. Shared lists (後台模板列表) must not use either escape.
 */
const RELATIVE_COUNT = /比(?:原本|剛才|之前|操作前|先前|一開始)|多出?\s*\d|少了?\s*\d|增加|減少|[+＋]\s*\d/;
/** Checked on the raw step: the dedicated name is usually quoted (「QA401 PM 主場次」). */
const DEDICATED_DATA = /\bQA\d+|專用/;

/**
 * #218: 「之後不會再收到新手任務系列信」 can only be judged on a later day; the hand-off gave no date,
 * so the PM had to schedule a second visit on their own. Same-session 「登入之後」 is not deferred.
 */
// A time word only counts when the same clause goes on to look again: 「3 天後再打開」, not a date to
// pick (「開始日選 3 天後的實踐」) or data described (「跨日結束日期」「當次日期時間」).
const DEFERRED_OBSERVATION =
  /(?:隔天|隔日|(?<![當每前])次日|翌日|明天|明早|隔週|下週|過夜|過幾天|幾(?:天|小時)後|\d+\s*(?:天|日|小時|週|周|個月)(?:之|以)?後)[^，,。；;：:\n]*?(?:再|才|回來|打開|開啟|查看|看|收到|登入|檢查|確認)|(?:之後|以後|往後|接下來)(?:也|都)?(?:不會再|不再|才會)/;
/** The marker and the date the template asks for: 「隔日觀察（2026-11-28 上午）：…」. */
const DEFERRED_MARKER = /隔日觀察|跨日觀察/;
const OBSERVATION_DATE = /\d{4}-\d{1,2}-\d{1,2}|(?<![\d/])\d{1,2}\/\d{1,2}(?![\d/])|\d{1,2}月\d{1,2}日/;

/**
 * Lint one comment body. Only the part from the 「請驗收」 heading onwards is checked when
 * present (smoke tables posted in the same comment may legitimately mention PUT/GET).
 * Returned line numbers are 1-based relative to the full body.
 */
export function lintAcceptanceComment(body: string): AcceptanceLintFinding[] {
  const all = body.replace(/\r\n/g, "\n").split("\n");
  const start = Math.max(0, all.findIndex((l) => /^#{1,6}\s.*請驗收/.test(l)));
  const lines = all.slice(start);
  const at = (i: number) => start + i + 1;
  const findings: AcceptanceLintFinding[] = [];

  const headingIdx = all.findIndex((l) => REQUIRED_HEADING.test(l));
  if (headingIdx < 0) {
    findings.push({
      line: 1,
      rule: "pm-heading-missing",
      message: "缺標題「## 🙋 請驗收：<功能一句話>」：PM 驗收工具只認這個標題，沒有會判 BLOCKED（#245、#346）",
    });
  }
  if (!body.includes(PM_MENTION)) {
    findings.push({
      line: headingIdx >= 0 ? headingIdx + 1 : 1,
      rule: "pm-mention-missing",
      message: `缺「${PM_MENTION}」：PM 驗收工具要求同一則留言同時有請驗收標題與這個標記，沒有會判 BLOCKED（#245、#346）`,
    });
  }

  if (!REQUEST_MARKER_RE.test(body)) {
    findings.push({
      line: 1,
      rule: "request-marker-missing",
      message: `缺隱藏標記「${REQUEST_MARKER}」：PM 驗收工具（test-acceptance）靠它找出這則請驗收留言，放在留言第一行`,
    });
  }

  const steps =sectionLines(lines, STEPS_HEADER);
  const stepIdx = steps ? steps.idx.filter((i) => STEP_LINE.test(lines[i])) : [];
  if (!steps || stepIdx.length === 0) {
    findings.push({
      line: steps ? at(steps.headerIdx) : at(0),
      rule: "steps-missing",
      message: "找不到「驗收步驟」或底下沒有編號步驟",
    });
  }

  if (steps) {
    for (let n = 0; n < stepIdx.length; n++) {
      const i = stepIdx[n];
      const end = stepIdx[n + 1] ?? ((steps.idx.at(-1) ?? i) + 1);
      if (hasMobileWithoutViewport(lines.slice(i, end).join("\n"))) {
        findings.push({
          line: at(i),
          rule: "mobile-viewport-missing",
          message: "手機／響應式驗收缺明確視窗尺寸：在同一編號步驟寫出手機寬×高（例如390×866 CSS px，或寬度390、高度866）；不能沿用桌面尺寸或工程證據（#395）",
        });
      }
      const stepLines = Array.from({ length: end - i }, (_, k) => i + k);
      const stepText = stepLines.map((j) => instructionText(lines[j])).join("\n");
      if (!RELATIVE_COUNT.test(stepText) && !DEDICATED_DATA.test(stepLines.map((j) => lines[j]).join("\n"))) {
        for (const j of stepLines) {
          const m = instructionText(lines[j]).match(FIXED_COUNT);
          if (m) {
            findings.push({
              line: at(j),
              rule: "pm-step-fixed-count",
              message: `PM 步驟寫死數量「${m[0]}」：dev 是共用環境，數量會被其他測試改動（#216 寫 24 個、PM 看到 25 個判 FAIL）。改成相對寫法（「比原本多 1 筆」「列表和你剛建立的一致」），數字只放工程證據並註明哪天取的值`,
            });
          }
        }
      }
      if (!(DEFERRED_MARKER.test(stepText) && OBSERVATION_DATE.test(stepText))) {
        const j = stepLines.find((k) => DEFERRED_OBSERVATION.test(instructionText(lines[k])));
        if (j !== undefined) {
          findings.push({
            line: at(j),
            rule: "deferred-observation-unmarked",
            message: `PM 步驟要隔一段時間才看得到結果（「${instructionText(lines[j]).match(DEFERRED_OBSERVATION)![0]}」），但沒標「隔日觀察」與日期：在同一編號步驟寫「隔日觀察（YYYY-MM-DD 上午）：…」，讓 PM 先排好第二次查看（#218）`,
          });
        }
      }
    }
    // The header line itself counts too (`- 驗收步驟：用 PUT 送出…`).
    for (const i of [steps.headerIdx, ...steps.idx]) {
      // Text inside 「」 is on-screen copy the PM reads (e.g. #292's error「請求資料格式錯誤」), not an instruction.
      const text = lines[i].replace(/「([^」]*)」/g, (q, inner: string) => (QUOTED_TECH.test(inner) ? q : "「」"));
      for (const { label, re } of PM_STEP_FORBIDDEN) {
        const m = text.match(re);
        if (m) {
          findings.push({
            line: at(i),
            rule: "pm-step-technical",
            message: `PM 驗收步驟出現「${m[0]}」（${label}）：PM 步驟只寫畫面上的操作與預期，API／測試／log 移到「工程證據（已驗，PM 不需重做）」`,
          });
        }
      }
    }
  }

  const eng = sectionLines(lines, ENGINEERING_HEADER);
  if (!eng) {
    findings.push({
      line: at(0),
      rule: "engineering-evidence-missing",
      message:
        "缺「工程證據（已驗，PM 不需重做）」區塊：列出 API 回讀、regression test 等工程證據連結，沒有就寫 none，讓 PM 知道哪些不必自己驗",
    });
  }

  if (!lines.some((l) => CLEANUP_HEADER.test(l))) {
    findings.push({
      line: at(0),
      rule: "cleanup-missing",
      message: "缺「驗完收尾」：寫出驗收建立的資料要刪除、封存或保留，不會建立資料就寫 none（#141 PM 不知道要不要刪測試實踐）",
    });
  }

  const account = sectionLines(lines, ACCOUNT_HEADER);
  if (account) {
    for (const i of [account.headerIdx, ...account.idx]) {
      for (const { label, re } of PM_UNUSABLE_ACCOUNT) {
        const m = lines[i].match(re);
        if (m) {
          findings.push({
            line: at(i),
            rule: "pm-account-unusable",
            message: `測試帳號出現「${m[0]}」（${label}）：PM 只能 Google 登入，用不了 fixture 帳號與 dev-login。改寫成 PM 的 admin／一般使用者測試帳號；需要團主、團友身分就先把 PM 帳號加進組織或場次，並寫明加在哪裡（#277、#279）`,
          });
        }
      }
    }
  }

  lines.forEach((text, i) => {
    // `code` spans are not autolinked, so a URL inside backticks is safe
    const m = text.replace(/`[^`]*`/g, "").match(BARE_URL_CJK);
    if (m) {
      findings.push({
        line: at(i),
        rule: "bare-url-cjk-punct",
        message: `裸網址後面直接接全形標點（${m[0].slice(-1)}）：GitHub 會把標點吃進連結，PM 點了是 404。改成 [說明文字](網址)`,
      });
    }
  });

  const engSet = new Set(eng ? [eng.headerIdx, ...eng.idx] : []);
  lines.forEach((text, i) => {
    if (engSet.has(i)) return;
    const m = text.match(TECH_URL);
    if (m) {
      findings.push({
        line: at(i),
        rule: "pm-technical-url",
        message: `給 PM 的段落出現技術網址 ${m[0]}：只給畫面網址，API 網址放工程證據`,
      });
    }
  });

  return findings;
}

/**
 * Warnings (not errors): text quoted with 「」 in the PM steps should be on-screen copy that exists in
 * the f2e locale files. Hand-offs quoting stale or mistyped copy sent the PM chasing text that never
 * appears (#279「本期參與者」, #182, #369). Quotes can also be user input (a practice name the step
 * types in), so this only warns.
 *
 * @param localeValues every string value from the zh-TW locale JSON files
 */
export function lintQuotedCopy(body: string, localeValues: string[]): AcceptanceLintFinding[] {
  const all = body.replace(/\r\n/g, "\n").split("\n");
  const start = Math.max(0, all.findIndex((l) => /^#{1,6}\s.*請驗收/.test(l)));
  const lines = all.slice(start);
  const steps = sectionLines(lines, STEPS_HEADER);
  if (!steps || localeValues.length === 0) return [];
  // ICU placeholders ({count}, {name}) stand for any text, so 「已排入 3 封邀請信」 matches 「已排入 {count} 封邀請信」
  // Anchored, and only for values with real literal text: a bare 「{count}」 would otherwise match every quote
  const patterns = localeValues
    .filter((v) => /\{[^}]+\}/.test(v) && v.replace(/\{[^}]+\}/g, "").trim().length >= 2)
    .map((v) => new RegExp(`^${v.split(/\{[^}]+\}/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".+?")}$`));
  const found = (q: string) => localeValues.some((v) => v.includes(q)) || patterns.some((re) => re.test(q));
  const findings: AcceptanceLintFinding[] = [];
  for (const i of [steps.headerIdx, ...steps.idx]) {
    for (const m of lines[i].matchAll(/「([^」]{2,})」/g)) {
      const q = m[1].trim();
      // URLs, paths and long free text are not single UI strings
      if (/https?:|\/|`/.test(q) || q.length > 60) continue;
      // A quote may join several UI strings with … (「請求資料格式錯誤（主旨：…500 characters）」); check each piece
      const pieces = q.split(/[…⋯]+/).map((p) => p.trim()).filter((p) => p.length >= 2);
      const missing = pieces.filter((p) => !found(p));
      if (missing.length) {
        findings.push({
          line: start + i + 1,
          rule: "quoted-copy-not-in-locale",
          message: `步驟引用的文案「${missing.join("…")}」在 f2e zh-TW locale 找不到：確認是畫面上的實際文字（不是舊文案或打錯）；若是使用者輸入的內容可以忽略`,
        });
      }
    }
  }
  return findings;
}

/**
 * Fixture health (#323): daodao-storage `.github/workflows/acceptance-fixture-health.yml` runs
 * `health.py check` daily and, when unhealthy, opens or comments on a daodaoedu/daodao issue with this
 * exact title (health.ISSUE_TITLE). The issue stays open until someone resets the fixture and closes it.
 */
export const FIXTURE_HEALTH_ISSUE_TITLE = "[驗收 fixture] 每日健康檢查失敗";
/** Daily schedule plus slack: a green run older than this no longer says anything about today. */
export const FIXTURE_HEALTH_MAX_AGE_MS = 36 * 3600 * 1000;

export type FixtureHealth = { state: "healthy" } | { state: "unhealthy" | "unknown"; reason: string };
/** Latest completed health run; `unhealthyStepFailed` = its 「Fail the run when unhealthy」 step ran and failed. */
export type FixtureHealthRun = { createdAt: string; conclusion: string; unhealthyStepFailed: boolean; url?: string };

/**
 * Names and URLs of the fixture rows in daodao-storage scripts/acceptance_fixtures/manifest.json
 * (org 「島島驗收組織（fixture）」, reserved ids 900000–900999). #179／#180 sent the PM into an org that
 * had been suspended; a hand-off built on the fixture is only as good as the fixture's current state.
 */
const FIXTURE_REFERENCE = /島島驗收組織|驗收燈塔(?:系列|場次)|驗收共同挑戰|驗收・(?:組織管理員|教練|學員)|\/900\d{3}(?!\d)/;

export function referencesAcceptanceFixture(body: string): boolean {
  return FIXTURE_REFERENCE.test(body);
}

export function deriveFixtureHealth(
  openIssues: ReadonlyArray<{ number: number; title: string }>,
  latestRun: FixtureHealthRun | null,
  now: Date,
): FixtureHealth {
  const open = openIssues.find((i) => i.title === FIXTURE_HEALTH_ISSUE_TITLE);
  if (open) return { state: "unhealthy", reason: `健康檢查 bug #${open.number} 仍 open（reset 修好後要手動關）` };
  if (!latestRun) return { state: "unknown", reason: "找不到 acceptance-fixture-health 的已完成 run" };
  if (latestRun.unhealthyStepFailed) return { state: "unhealthy", reason: `最新健康檢查 run 判定不健康${latestRun.url ? `：${latestRun.url}` : ""}` };
  const age = now.getTime() - Date.parse(latestRun.createdAt);
  if (latestRun.conclusion !== "success")
    return { state: "unknown", reason: `最新健康檢查 run 沒跑到檢查結果（conclusion=${latestRun.conclusion}，例如 Actions 未啟動）${latestRun.url ? `：${latestRun.url}` : ""}` };
  if (!(age >= 0 && age <= FIXTURE_HEALTH_MAX_AGE_MS)) return { state: "unknown", reason: `最近一次通過的健康檢查是 ${latestRun.createdAt}，超過 36 小時` };
  return { state: "healthy" };
}

/** AC-02 of #326: a hand-off that relies on the fixture is not posted unless the fixture is known healthy. */
export function lintFixtureHealth(body: string, health: FixtureHealth): AcceptanceLintFinding[] {
  if (!referencesAcceptanceFixture(body) || health.state === "healthy") return [];
  const line = body.replace(/\r\n/g, "\n").split("\n").findIndex((l) => FIXTURE_REFERENCE.test(l)) + 1;
  return [
    health.state === "unhealthy"
      ? {
          line,
          rule: "fixture-unhealthy",
          message: `留言用到驗收 fixture，但 fixture 目前不健康（${health.reason}）：先依 daodao-storage scripts/acceptance_fixtures/README.md 跑 reset、確認健康檢查通過再發（#179、#180）`,
        }
      : {
          line,
          rule: "fixture-health-unknown",
          message: `留言用到驗收 fixture，但無法確認 fixture 健康（${health.reason}）：重跑 daodao-storage 的 acceptance-fixture-health workflow 並確認通過再發`,
        },
  ];
}
