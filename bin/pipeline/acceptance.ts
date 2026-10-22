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
  { label: "API", re: /\bAPI\b|\bendpoints?\b|\/api\//i },
  { label: "body", re: /\bbody\b/i },
  { label: "request", re: /\brequests?\b|請求/i },
  { label: "response", re: /\bresponses?\b|status code|狀態碼/i },
  { label: "payload", re: /\bpayload\b|送出內容|回傳的原始資料/i },
  { label: "回讀", re: /回讀|read-?back/i },
  { label: "regression test", re: /regression|回歸測試|單元測試|unit test|測試輸出|test job/i },
  { label: "CI", re: /\bCI\b/ },
  { label: "curl", re: /\bcurl\b/i },
  // Devtools for a viewport size is something the PM can do (#163), so only console／network count.
  { label: "log", re: /\blogs?\b|console|network 分頁|網路請求/i },
  { label: "JSON 欄位", re: /"[A-Za-z_]+"\s*:/ },
];

/** Technical URLs the PM should never be sent to (anywhere outside the engineering block). */
const TECH_URL = /https?:\/\/(?:server-dev\.|server\.|[^\s)]*\/api\/)[^\s)]*/i;

const ENGINEERING_HEADER = /^(?:\s*[-*]\s*|#{1,6}\s+)\**工程證據/;
const STEPS_HEADER = /^(?:\s*[-*]\s*|#{1,6}\s+)\**驗收步驟/;

/** A line that starts a new top-level item (ends the current section). */
function isTopLevelBoundary(line: string): boolean {
  if (/^\s+\S/.test(line)) return false; // indented → still inside
  if (line.trim() === "") return false;
  if (/^\d+[.)、]\s/.test(line)) return false; // non-indented numbered step
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

  const steps = sectionLines(lines, STEPS_HEADER);
  const stepIdx = steps ? steps.idx.filter((i) => /^\s*\d+[.)、]\s/.test(lines[i])) : [];
  if (!steps || stepIdx.length === 0) {
    findings.push({
      line: steps ? at(steps.headerIdx) : at(0),
      rule: "steps-missing",
      message: "找不到「驗收步驟」或底下沒有編號步驟",
    });
  }

  if (steps) {
    for (const i of steps.idx) {
      // Text inside 「」 is on-screen copy the PM reads (e.g. #292's error「請求資料格式錯誤」), not an instruction.
      const text = lines[i].replace(/「[^」]*」/g, "「」");
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
