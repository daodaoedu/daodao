#!/usr/bin/env node
// 版面探針：對每條 route × 每個寬度量三件事，任一 ❌ 就 exit 1。
//   1. 登入牆   — 導頁後 pathname 落在 /auth/、/login、/signin → 這張截圖不是證據（#166 的 bug-report 截圖就是登入頁）
//   2. 橫向溢出 — document.documentElement.scrollWidth > innerWidth（#233：settings 用 w-screen 疊在 md:pl-[132px] 上，每頁多 132px）
//   3. 出界元素 — main／[role=dialog]／aside 內可見元素 right > innerWidth 或 left < 0
// 從 cwd 的 node_modules 找 playwright／@playwright/test（f2e 在 $TASK/daodao-f2e/apps/product 底下跑，admin-ui 在 repo 根）。
//
// 用法：
//   node <daodao-root>/.claude/skills/dev-task/references/layout-probe.mjs \
//     --base http://localhost:3001 --routes /zh-TW/settings,/zh-TW/settings/bug-report \
//     [--cookie "auth_token=<token>"] [--cookie-domain localhost] [--widths 390,1024,1440] \
//     [--out ../evidence/verify-layout-probe]
// 產出：<out>.md（貼進 task.md「驗證」區塊）、<out>.json、<out>-<width>-<route>.png
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]?.startsWith("--") || arr[i + 1] === undefined ? "true" : arr[i + 1]]);
    return acc;
  }, []),
);
const base = args.base;
const routes = (args.routes || "").split(",").map((s) => s.trim()).filter(Boolean);
if (!base || routes.length === 0) {
  console.error("需要 --base <url> 與 --routes <a,b,c>");
  process.exit(2);
}
const widths = (args.widths || "390,1024,1440").split(",").map((w) => parseInt(w, 10));
const out = args.out || "verify-layout-probe";
const cookieDomain = args["cookie-domain"] || new URL(base).hostname;
const cookies = [];
if (args.cookie && args.cookie !== "true") {
  const [name, ...rest] = args.cookie.split("=");
  const secure = base.startsWith("https");
  cookies.push({ name, value: rest.join("="), domain: cookieDomain, path: "/", secure, sameSite: secure ? "None" : "Lax" });
}

const require = createRequire(path.join(process.cwd(), "package.json"));
let chromium;
for (const mod of ["playwright", "@playwright/test", "playwright-core"]) {
  try { ({ chromium } = require(mod)); break; } catch {}
}
if (!chromium) {
  console.error("cwd 的 node_modules 找不到 playwright／@playwright/test：f2e 請在 apps/product 底下跑，admin-ui 在 repo 根");
  process.exit(2);
}

const { isLoginWall, isClippedByAncestor } = await import(new URL("./layout-probe.lib.mjs", import.meta.url).href);

const rows = [];
const browser = await chromium.launch();
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, deviceScaleFactor: 1 });
  if (cookies.length) await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  for (const route of routes) {
    const row = { width, route, status: "✅", problems: [] };
    try {
      await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(800);
      // dev server 首次編譯該頁時 auth 還沒 resolve，會先被丟到登入頁；重載一次就正常。
      // 真的沒有有效 cookie 的話重載後仍然停在登入頁，照樣標 ❌。
      if (isLoginWall(new URL(page.url()).pathname, route)) {
        await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(2000);
      }
      const r = await page.evaluate((clipSrc) => {
        const isClipped = new Function("return " + clipSrc)();
        const vw = innerWidth;
        const sw = document.documentElement.scrollWidth;
        let widest = null;
        const offscreen = [];
        for (const el of document.querySelectorAll("body *")) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const desc = `${el.tagName.toLowerCase()}.${(el.className?.toString() || "").trim().split(/\s+/).slice(0, 6).join(".")}`;
          if (rect.right > vw + 1 && (!widest || rect.right > widest.right)) widest = { desc, left: Math.round(rect.left), right: Math.round(rect.right) };
          if ((rect.right > vw + 1 || rect.left < -1) && el.closest("main, [role=dialog], aside")) {
            // 被祖先的 overflow 裁切（hidden／auto／scroll，例如水平捲動的卡片列或滿版裝飾圖）就不會被使用者看到，
            // 也不會造成頁面橫向捲動；只有「一路到 body 都沒有裁切祖先」的才是真的出界。
            if (!isClipped(el, (a) => getComputedStyle(a).overflowX, document.body)) {
              offscreen.push({ desc, left: Math.round(rect.left), right: Math.round(rect.right) });
            }
          }
        }
        return { pathname: location.pathname, vw, sw, widest, offscreen: offscreen.slice(0, 5), offscreenCount: offscreen.length };
      }, isClippedByAncestor.toString());
      row.pathname = r.pathname;
      row.scrollWidth = r.sw;
      row.viewport = r.vw;
      if (isLoginWall(r.pathname, route)) row.problems.push(`登入牆：落在 ${r.pathname}，此頁未被驗證`);
      if (r.sw > r.vw + 1) row.problems.push(`橫向溢出 ${r.sw - r.vw}px（最寬元素 ${r.widest?.desc} left=${r.widest?.left} right=${r.widest?.right}）`);
      if (r.offscreenCount) row.problems.push(`出界元素 ${r.offscreenCount} 個：` + r.offscreen.map((o) => `${o.desc}[${o.left},${o.right}]`).join("；"));
    } catch (e) {
      row.problems.push(`導頁失敗：${e.message.split("\n")[0]}`);
    }
    if (row.problems.length) row.status = "❌";
    const shot = `${out}-${width}-${route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")}.png`;
    try { await page.screenshot({ path: shot }); row.screenshot = shot; } catch {}
    rows.push(row);
    console.log(`${row.status} ${width} ${route} ${row.problems.join(" | ")}`);
  }
  await ctx.close();
}
await browser.close();

const md = [
  "### 版面探針",
  `<!-- layout-probe.mjs ${new Date().toISOString()} base=${base} -->`,
  "| 寬度 | route | 落點 | scrollWidth / viewport | 結果 | 問題 | 截圖 |",
  "|---|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.width} | ${r.route} | ${r.pathname ?? "—"} | ${r.scrollWidth ?? "—"} / ${r.viewport ?? "—"} | ${r.status} | ${r.problems.join("；") || "—"} | ${r.screenshot ? path.basename(r.screenshot) : "—"} |`),
  "",
].join("\n");
fs.writeFileSync(`${out}.md`, md);
fs.writeFileSync(`${out}.json`, JSON.stringify(rows, null, 1));
const failed = rows.filter((r) => r.status === "❌").length;
console.log(`\n${rows.length} 組，${failed} 組 ❌ → ${out}.md`);
process.exit(failed ? 1 : 0);
