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
