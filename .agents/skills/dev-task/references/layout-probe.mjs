#!/usr/bin/env node
// 版面探針：對每條 route × 每個寬度量三件事，任一 ❌ 就 exit 1。
//   0. 錯誤頁   — 導頁 HTTP ≥ 400（打錯 route 量到 404 頁會全 ✅）
//   1. 登入牆   — 導頁後 pathname 落在 /auth/、/login、/signin → 這張截圖不是證據（#166 的 bug-report 截圖就是登入頁）
//   2. 橫向溢出 — document.documentElement.scrollWidth > innerWidth（#233：settings 用 w-screen 疊在 md:pl-[132px] 上，每頁多 132px）
//   3. 出界元素 — main／[role=dialog]／aside 內可見元素 right > innerWidth 或 left < 0
//   4. 浮層裁切（有給 --open 才量）— 點開觸發元素後，每個可見浮層（[role=menu|listbox|dialog]、radix popper）
//      被 overflow 祖先裁掉、超出 viewport、或取樣點被別的元素蓋住 → ❌（#214：sidebar overflow-hidden 切掉帳號選單右半）
// 從 cwd 的 node_modules 找 playwright／@playwright/test（f2e 在 $TASK/daodao-f2e/apps/product 底下跑，admin-ui 在 repo 根）。
//
// 用法：
//   node plugin/skills/dev-task/references/layout-probe.mjs \
//     --base http://localhost:3001 --routes /zh-TW/settings,/zh-TW/settings/bug-report \
//     [--cookie "auth_token=<token>"] [--cookie-domain localhost] [--widths 390,1024,1440] \
//     [--out ../evidence/verify-layout-probe] \
//     [--open 'button[aria-label="帳號選單"]||[data-testid=filter-trigger]']   # 以 || 分隔；每個 route 依序點開量測
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

const openers = args.open && args.open !== "true" ? args.open.split("||").map((s) => s.trim()).filter(Boolean) : [];
const openerSeen = new Set();

// 在頁面內執行：量目前可見浮層的裁切／出界／遮擋。無浮層回傳 null
const FLOATING = "[role=menu],[role=listbox],[role=dialog],[data-radix-popper-content-wrapper] > *";
// 點擊前先標記已存在的浮層，量測時排除，避免常駐 dialog 冒充「點開的浮層」
// 只標「已經看得到」的：display:none／尚未展開的手刻選單點擊前就在 DOM 裡，標了會讓點開後量不到（#214 review 後實測）
const markExisting = (sel) => {
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.opacity !== "0") el.setAttribute("data-probe-preexisting", "");
  }
};
const measureFloating = (sel) => {
  const desc = (el) => `${el.tagName.toLowerCase()}.${(el.className?.toString() || "").trim().split(/\s+/).slice(0, 4).join(".")}`;
  const layers = [...document.querySelectorAll(sel)]
    .filter((el) => !el.closest("[data-probe-preexisting]"))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.opacity !== "0";
    })
    // 只去重同一個 radix popper 的 wrapper／content；dialog 裡的非 Portal 選單仍要各自量
    .filter((el, i, arr) => {
      const popper = el.closest("[data-radix-popper-content-wrapper]");
      return !arr.some((other, j) => j !== i && popper && other.contains(el) && other.closest("[data-radix-popper-content-wrapper]") === popper);
    });
  if (!layers.length) return null;
  const issues = [];
  for (const el of layers) {
    const r = el.getBoundingClientRect();
    const name = `${el.getAttribute("role") || "popper"} ${desc(el)}`;
    for (let a = el.parentElement, from = el; a && a !== document.documentElement; from = a, a = a.parentElement) {
      // fixed 定位的層脫離一般 overflow 祖先（transform 祖先的例外不處理），往上不再算裁切
      if (getComputedStyle(from).position === "fixed") break;
      const cs = getComputedStyle(a);
      if (!/hidden|clip|auto|scroll/.test(cs.overflowX + cs.overflowY)) continue;
      const ar = a.getBoundingClientRect();
      const cut = { left: ar.left - r.left, right: r.right - ar.right, top: ar.top - r.top, bottom: r.bottom - ar.bottom };
      const sides = Object.entries(cut).filter(([, v]) => v > 1).map(([k, v]) => `${k} ${Math.round(v)}px`);
      if (sides.length) { issues.push(`${name} 被 ${desc(a)}（overflow ${cs.overflowX}/${cs.overflowY}）裁掉 ${sides.join("、")}`); break; }
    }
    if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) {
      issues.push(`${name} 超出 viewport [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
    }
    const inset = 6;
    const pts = [
      [(r.left + r.right) / 2, (r.top + r.bottom) / 2],
      [r.left + inset, r.top + inset], [r.right - inset, r.top + inset],
      [r.left + inset, r.bottom - inset], [r.right - inset, r.bottom - inset],
    ].filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight);
    const covered = pts
      .map(([x, y]) => ({ x, y, hit: document.elementFromPoint(x, y) }))
      .filter(({ hit }) => hit && !el.contains(hit));
    if (covered.length) {
      issues.push(`${name} ${covered.length}/${pts.length} 取樣點被遮住（${[...new Set(covered.map((c) => desc(c.hit)))].slice(0, 2).join("；")}）`);
    }
  }
  return { count: layers.length, issues };
};

const LOGIN_WALL = /\/(auth|login|signin|sign-in)(\/|$)/;
const rows = [];
const browser = await chromium.launch();
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, deviceScaleFactor: 1 });
  if (cookies.length) await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  for (const route of routes) {
    const row = { width, route, status: "✅", problems: [], notes: [], openShots: [] };
    try {
      const resp = await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
      if (resp && resp.status() >= 400) row.problems.push(`HTTP ${resp.status()}：route 不存在或錯誤頁，這組沒有量到目標頁`);
      await page.waitForTimeout(800);
      const r = await page.evaluate(() => {
        const vw = innerWidth;
        const sw = document.documentElement.scrollWidth;
        let widest = null;
        const offscreen = [];
        for (const el of document.querySelectorAll("body *")) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const desc = `${el.tagName.toLowerCase()}.${(el.className?.toString() || "").trim().split(/\s+/).slice(0, 6).join(".")}`;
          if (rect.right > vw + 1 && (!widest || rect.right > widest.right)) widest = { desc, left: Math.round(rect.left), right: Math.round(rect.right) };
          if ((rect.right > vw + 1 || rect.left < -1) && el.closest("main, [role=dialog], aside")) offscreen.push({ desc, left: Math.round(rect.left), right: Math.round(rect.right) });
        }
        return { pathname: location.pathname, vw, sw, widest, offscreen: offscreen.slice(0, 5), offscreenCount: offscreen.length };
      });
      row.pathname = r.pathname;
      row.scrollWidth = r.sw;
      row.viewport = r.vw;
      if (LOGIN_WALL.test(r.pathname)) row.problems.push(`登入牆：落在 ${r.pathname}，此頁未被驗證`);
      if (r.sw > r.vw + 1) row.problems.push(`橫向溢出 ${r.sw - r.vw}px（最寬元素 ${r.widest?.desc} left=${r.widest?.left} right=${r.widest?.right}）`);
      if (r.offscreenCount) row.problems.push(`出界元素 ${r.offscreenCount} 個：` + r.offscreen.map((o) => `${o.desc}[${o.left},${o.right}]`).join("；"));
      for (const [i, sel] of openers.entries()) {
        const target = page.locator(sel).first();
        if (!(await target.isVisible().catch(() => false))) {
          row.notes.push(`--open ${sel} 此寬度不可見，略過`);
          continue;
        }
        openerSeen.add(sel);
        await page.evaluate(markExisting, FLOATING);
        try { await target.click({ timeout: 10000 }); } catch (e) {
          row.problems.push(`--open ${sel} 點擊失敗：${e.message.split("\n")[0]}`);
          continue;
        }
        await page.waitForTimeout(400); // 等進場動畫（zoom-in-95）結束再量
        const f = await page.evaluate(measureFloating, FLOATING);
        if (!f) row.problems.push(`--open ${sel} 點了沒有出現可量的浮層（role=menu|listbox|dialog／radix popper）`);
        else for (const issue of f.issues) row.problems.push(`浮層：${issue}`);
        const openShot = `${out}-${width}-${route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")}-open${i + 1}.png`;
        try { await page.screenshot({ path: openShot }); row.openShots.push(openShot); } catch {}
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
        // 導走了、或 Esc 關不掉（手刻浮層）→ 重新載入，下一個 opener／下一組才不會帶著開著的浮層量
        const stillOpen = await page.evaluate((s) => !!document.querySelector(s.split(",").map((x) => `${x}:not([data-probe-preexisting])`).join(",")), "[role=menu],[role=listbox],[role=dialog]");
        if (stillOpen || new URL(page.url()).pathname !== r.pathname) await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
        await page.evaluate(() => { for (const el of document.querySelectorAll("[data-probe-preexisting]")) el.removeAttribute("data-probe-preexisting"); });
      }
    } catch (e) {
      row.problems.push(`導頁失敗：${e.message.split("\n")[0]}`);
    }
    if (row.problems.length) row.status = "❌";
    const shot = `${out}-${width}-${route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")}.png`;
    try { await page.screenshot({ path: shot }); row.screenshot = shot; } catch {}
    rows.push(row);
    console.log(`${row.status} ${width} ${route} ${[...row.problems, ...row.notes].join(" | ")}`);
  }
  await ctx.close();
}
await browser.close();

const neverOpened = openers.filter((sel) => !openerSeen.has(sel));
const md = [
  "### 版面探針",
  `<!-- layout-probe.mjs ${new Date().toISOString()} base=${base}${openers.length ? ` open=${JSON.stringify(openers)}` : ""} -->`,
  "| 寬度 | route | 落點 | scrollWidth / viewport | 結果 | 問題 | 截圖 |",
  "|---|---|---|---|---|---|---|",
  // selector 在所有寬度都找不到：表格要留 ❌，發 PR 閘門只看表格
  ...neverOpened.map((sel) => `| 全部 | --open | — | — | ❌ | --open ${sel} 在所有寬度都找不到可見目標（selector 打錯就等於沒量） | — |`),
  ...rows.map((r) => `| ${r.width} | ${r.route} | ${r.pathname ?? "—"} | ${r.scrollWidth ?? "—"} / ${r.viewport ?? "—"} | ${r.status} | ${[...r.problems, ...r.notes].join("；") || "—"} | ${[r.screenshot, ...r.openShots].filter(Boolean).map((f) => path.basename(f)).join("<br>") || "—"} |`),
  "",
].join("\n");
fs.writeFileSync(`${out}.md`, md);
fs.writeFileSync(`${out}.json`, JSON.stringify(rows, null, 1));
if (neverOpened.length) console.error(`--open 在所有寬度都找不到可見目標：${neverOpened.join("、")}（selector 打錯就等於沒量）`);
const failed = rows.filter((r) => r.status === "❌").length + neverOpened.length;
console.log(`\n${rows.length} 組，${failed} 組 ❌ → ${out}.md`);
process.exit(failed ? 1 : 0);
