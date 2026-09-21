#!/usr/bin/env node
// 版面 rect 對照：對每條 route × 每個寬度，量 wrapper（main 的父層，或最外層帶 min-height 的捲動容器）、
// wrapper 的每個直接子元素、以及 main 的 getBoundingClientRect 與關鍵 computedStyle。
//
// 用途是「零視覺差異」的 refactor：改前在 base 版跑一次存 baseline，改後跑一次，再用 rect-diff.py 比對。
// layout-probe 只看「有沒有溢出」，這支看「版面有沒有變」——抽共用元件、換 className 這類任務要的是後者。
// 肉眼看截圖對 padding／寬度極不可靠（daodao#233 的 132px 六個月沒人發現），一律用數字。
//
// 從 cwd 的 node_modules 找 playwright／@playwright/test（f2e 在 apps/product 底下跑）。
//
// 用法：
//   node <daodao-root>/.claude/skills/dev-task/references/rect-probe.mjs \
//     --out <out.json> --base http://localhost:3001 \
//     --routes-file <routes.json>            # [{ "path": "/zh-TW/settings", "auth": "user" }, ...]
//     [--cookie-file-user notes/tok.txt] [--cookie-file-temp notes/tok-temp.txt]
//     [--widths 1440,1024,390] [--label "改前 <sha>"] [--head <sha>]
//
// routes.json 的 auth 可為 "user"（預設 token）、"temp"（新用戶 token）、"none"（不帶 cookie）——
// onboarding 之類的頁面對已完成註冊的使用者會被導走，要用對應身分才量得到目標頁。
//
// 比對：python3 <daodao-root>/.claude/skills/dev-task/references/rect-diff.py baseline.json after.json


import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(path.join(process.cwd(), "package.json"));
let chromium;
for (const mod of ["playwright", "@playwright/test", "playwright-core"]) {
  try { ({ chromium } = require(mod)); break; } catch {}
}
if (!chromium) {
  console.error("cwd 的 node_modules 找不到 playwright／@playwright/test：f2e 請在 apps/product 底下跑，admin-ui 在 repo 根");
  process.exit(2);
}
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]?.startsWith("--") || arr[i + 1] === undefined ? "true" : arr[i + 1]]);
    return acc;
  }, []),
);
const out = args.out;
const base = args.base || "http://localhost:3001";
if (!out || !args["routes-file"]) {
  console.error("需要 --out <out.json> 與 --routes-file <routes.json>");
  process.exit(2);
}
const readTok = (f) => { try { return fs.readFileSync(f, "utf8").trim(); } catch { return null; } };
const tok = readTok(args["cookie-file-user"] || "");
const tokTemp = readTok(args["cookie-file-temp"] || "");
const cookieFor = { user: tok, temp: tokTemp, none: null };
const ROUTES = JSON.parse(fs.readFileSync(args["routes-file"], "utf8"));
const WIDTHS = (args.widths || "1440,1024,390").split(",").map((w) => parseInt(w, 10));
const cookieDomain = args["cookie-domain"] || new URL(base).hostname;

const b = await chromium.launch();
const result = { label: args.label || "", at: new Date().toISOString(), head: args.head || null, base, rows: [] };
const errors = [];
for (const width of WIDTHS) {
  for (const { path: route, auth } of ROUTES) {
    const ctx = await b.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, deviceScaleFactor: 1 });
    const cookieVal = cookieFor[auth];
    if (cookieVal) await ctx.addCookies([{ name: "auth_token", value: cookieVal, domain: cookieDomain, path: "/" }]);
    const p = await ctx.newPage();
    p.on("console", (m) => { if (m.type() === "error") errors.push(`${width} ${route} ${m.text().slice(0, 160)}`); });
    await p.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
    await p.waitForTimeout(2000);
    // dev server 首次編譯該頁時 auth 尚未 resolve 會被丟到 /auth/login，重載一次即可（非目標頁的落點一律重試）
    if (/\/(auth\/login|auth\/signin)(\/|$)/.test(new URL(p.url()).pathname)) {
      await p.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
      await p.waitForTimeout(2500);
    }
    const m = await p.evaluate(() => {
      const r = (el) => { const q = el.getBoundingClientRect(); return { x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height) }; };
      const cs = (el, keys) => Object.fromEntries(keys.map((k) => [k, getComputedStyle(el)[k]]));
      const main = document.querySelector("main");
      // 這些頁多數沒有 <main>：改抓最外層帶 min-h-screen 的 wrapper
      const wrapper = main?.parentElement
        ?? [...document.querySelectorAll("body div")].find((el) => {
          const cs = getComputedStyle(el);
          return cs.minHeight !== "0px" && cs.overflowY === "auto" && el.getBoundingClientRect().width > 0;
        });
      if (!wrapper) return { pathname: location.pathname, error: "no wrapper" };
      return {
        pathname: location.pathname,
        scrollWidth: document.documentElement.scrollWidth,
        wrapper: {
          tag: wrapper.tagName.toLowerCase(), className: wrapper.className, rect: r(wrapper),
          style: cs(wrapper, ["position", "zIndex", "overflowX", "overflowY", "minHeight", "width", "backgroundColor"]),
          parentClass: wrapper.parentElement?.className ?? null,
        },
        children: [...wrapper.children].map((c) => ({ tag: c.tagName.toLowerCase(), className: c.className, rect: r(c), position: getComputedStyle(c).position })),
        main: main ? { className: main.className, rect: r(main), style: cs(main, ["maxWidth", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "marginLeft", "marginRight"]) } : null,
      };
    });
    result.rows.push({ width, route, auth, ...m });
    console.log(`${width} ${route} → ${m.pathname} sw=${m.scrollWidth} wrapper=${JSON.stringify(m.wrapper?.rect)}`);
    await ctx.close();
  }
}
await b.close();
result.consoleErrors = errors;
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log(`寫入 ${out}；console errors: ${errors.length}`);
