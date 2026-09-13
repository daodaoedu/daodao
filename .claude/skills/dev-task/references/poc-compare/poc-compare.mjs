// POC 並排比對通用 runner（dev-task skill 範本；每個任務複製到 <repo>/apps/<app>/e2e-scratch/ 使用，不入版控）
//
// 用法：
//   cd <f2e worktree>/apps/product   # @playwright/test 裝在這層
//   CONFIG=$TASK/notes/poc-compare/config.mjs SIDE=both node e2e-scratch/poc-compare.mjs
//
// config.mjs 匯出 { task, poc, impl, auth, viewport, categories, checkpoints }，範例見 config.example.mjs。
// 每個 checkpoint 在 POC 與實作各跑一次 flow，full-page 截圖到 $TASK/evidence/{poc,ui}-<name>.png，
// 並用 getComputedStyle / getBoundingClientRect 量 probe 表，輸出 $TASK/notes/poc-compare/<name>-<side>.json。
// 之後跑 poc-report.py 產差異表、coverage.json、並排合成圖。
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CONFIG_PATH = process.env.CONFIG;
if (!CONFIG_PATH) { console.error("缺 CONFIG=<config.mjs>"); process.exit(1); }
const cfg = (await import(pathToFileURL(path.resolve(CONFIG_PATH)).href)).default;
const SIDE = process.env.SIDE || "both";
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null; // 只跑指定 checkpoint
const VIEWPORT = cfg.viewport || { width: 1280, height: 900 };
const EVIDENCE = path.join(cfg.task, "evidence");
const OUT = path.join(cfg.task, "notes/poc-compare");
fs.mkdirSync(EVIDENCE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------------------
// 頁面端 helper（addInitScript 注入，兩邊共用）
//   f.q(sel, i, root)        可見元素 querySelector（第 i 個）
//   f.byText(re, tag, root)  依文字找最深的可見元素（.sc-interp 回到 parent）
//   f.up(el, n)              往上 n 層
//   f.kids(el)               可見子元素
//   f.ps(el, '::before')     偽元素
//   f.probe(map)             量一組 { key: expr }
// ---------------------------------------------------------------------------
const HELPERS = `
window.__f = {
  vis(e) { if (!e) return false; if (e.classList && e.classList.contains('sr-only')) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; },
  byText(re, tag = '*', root = document, idx = 0) {
    if (!root) return null;
    const rx = new RegExp(re); const norm = (x) => (x || '').replace(/\\s+/g, ' ').trim();
    const cands = [...root.querySelectorAll(tag)].filter(e => e.tagName !== 'OPTION' && this.vis(e) && rx.test(norm(e.textContent)));
    const deepest = cands.filter(e => !cands.some(o => o !== e && e.contains(o)));
    let el = deepest[idx] || null;
    if (el && el.classList && el.classList.contains('sc-interp')) el = el.parentElement;
    return el;
  },
  q(sel, i = 0, root = document) { if (!root) return null; const list = [...root.querySelectorAll(sel)].filter(e => this.vis(e)); return list[i] || null; },
  up(el, n) { while (el && n-- > 0) el = el.parentElement; return el || null; },
  kids(el) { return el ? [...el.children].filter(c => this.vis(c)) : []; },
  ps(el, pseudo) { return el ? { __el: el, __pseudo: pseudo } : null; },
  rgb(c) { try { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillStyle = c; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')' + (d[3] < 255 ? '/' + (d[3] / 255).toFixed(2) : ''); } catch { return c; } },
  m(el) {
    if (!el) return null;
    let pseudo = null; if (el.__el) { pseudo = el.__pseudo; el = el.__el; }
    const cs = getComputedStyle(el, pseudo); const r = el.getBoundingClientRect();
    const keys = ['fontSize','fontWeight','lineHeight','letterSpacing','textAlign','textTransform','fontFamily','borderRadius','borderTopWidth','borderTopStyle','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginBottom','gap','rowGap','columnGap','gridTemplateColumns','minHeight','height','width','minWidth','maxWidth','maxHeight','boxShadow','opacity','display','position','cursor','overflowX','overflowY','alignItems'];
    const o = {}; for (const k of keys) o[k] = cs[k];
    for (const k of ['color','backgroundColor','borderTopColor']) o[k] = this.rgb(cs[k]) + ' <' + cs[k] + '>';
    if (pseudo) { o.rect = { x: 0, y: 0, w: parseFloat(cs.width) || 0, h: parseFloat(cs.height) || 0, bottom: 0 }; o.pseudo = pseudo; }
    else o.rect = { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), bottom: +r.bottom.toFixed(1) };
    o.scrollable = el.scrollHeight > el.clientHeight + 1;
    o.text = ((el.value !== undefined && el.tagName !== 'BUTTON' && el.tagName !== 'LI') ? el.value : el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80);
    if (el.placeholder) o.placeholder = el.placeholder;
    if (el.disabled) o.disabled = true;
    o.tag = el.tagName.toLowerCase();
    o.childCount = el.children ? el.children.length : 0;
    o.directText = !!(el.childNodes && [...el.childNodes].some(n => (n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && n.classList && n.classList.contains('sc-interp') && n.textContent.trim())));
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') o.directText = true;
    return o;
  },
  probe(map) { const out = {}; for (const [k, expr] of Object.entries(map)) { let el = null; try { el = (new Function('f', 'return (' + expr + ')'))(this); } catch (e) { el = null; } out[k] = this.m(el); } return out; },
};`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(side) {
  const isPoc = side === "poc";
  const base = isPoc ? cfg.poc.url : cfg.impl.url;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, locale: cfg.locale || "zh-TW" });
  if (!isPoc && cfg.auth?.cookie) {
    const token = cfg.auth.tokenFile ? fs.readFileSync(cfg.auth.tokenFile.replace(/^~/, process.env.HOME), "utf8").trim() : cfg.auth.token;
    await context.addCookies([{ name: cfg.auth.cookie, value: token, domain: cfg.auth.domain || "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  }
  await context.addInitScript(HELPERS);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
  const prefix = isPoc ? "poc" : "ui";
  const result = { side, viewport: VIEWPORT, checkpoints: {}, consoleErrors };

  // flow helper（config 的 flow 會拿到這個物件）
  const h = {
    page, side, isPoc, sleep,
    goto: async (p) => { await page.goto(p.startsWith("http") ? p : base + p, { waitUntil: "networkidle" }); await sleep(isPoc ? 800 : 1000); await page.evaluate(() => window.scrollTo(0, 0)); },
    click: async (expr) => {
      const ok = await page.evaluate((e) => { const el = (new Function("f", "return (" + e + ")"))(window.__f); if (!el) return false; el.scrollIntoView({ block: "center" }); el.click(); return true; }, expr);
      if (!ok) console.log(`  [${side}] click miss: ${expr}`);
      await sleep(450); return ok;
    },
    type: async (expr, text, { enter = false } = {}) => {
      const handle = await page.evaluateHandle((e) => (new Function("f", "return (" + e + ")"))(window.__f), expr);
      const el = handle.asElement();
      if (!el) { console.log(`  [${side}] type miss: ${expr}`); return false; }
      await el.scrollIntoViewIfNeeded(); await el.fill(""); await el.type(text, { delay: 5 });
      if (enter) await el.press("Enter");
      await sleep(400); return true;
    },
    key: async (k) => { await page.keyboard.press(k); await sleep(300); },
    top: () => page.evaluate(() => window.scrollTo(0, 0)),
    evalF: (expr) => page.evaluate((e) => (new Function("f", "return (" + e + ")"))(window.__f), expr),
    // 截圖 + 量 probe；probes: { key: exprOrObj }，exprOrObj 可為字串（兩邊同）或 { poc, impl }
    cp: async (name, probes) => {
      await sleep(350);
      await page.screenshot({ path: path.join(EVIDENCE, `${prefix}-${name}.png`), fullPage: true });
      const m = {}; for (const [k, v] of Object.entries(probes)) m[k] = typeof v === "string" ? v : v[side];
      const r = await page.evaluate((mm) => window.__f.probe(mm), m);
      const nulls = Object.entries(r).filter(([k, v]) => v === null && m[k] !== "null").map(([k]) => k);
      if (nulls.length) console.log(`  [${side}] ${name}: null probes → ${nulls.join(", ")}`);
      result.checkpoints[name] = r;
      fs.writeFileSync(path.join(OUT, `${name}-${side}.json`), JSON.stringify({ side, checkpoint: name, url: page.url(), probes: r }, null, 1));
    },
  };

  if (!isPoc && cfg.impl.login) await cfg.impl.login(h);
  for (const ck of cfg.checkpoints) {
    if (ONLY && !ONLY.includes(ck.name)) continue;
    try {
      await ck.flow(h);
      if (!isPoc && page.url().includes("/auth/login")) throw new Error("landed on /auth/login（cookie 沒設上或被 login 頁清掉）");
      await h.cp(ck.name, ck.probes);
    } catch (e) {
      console.log(`  [${side}] ERROR in ${ck.name}: ${e.message.split("\n")[0]}`);
      await page.screenshot({ path: path.join(EVIDENCE, `${prefix}-${ck.name}-failure.png`), fullPage: true }).catch(() => {});
    }
  }
  fs.writeFileSync(path.join(OUT, `all-${side}.json`), JSON.stringify(result, null, 1));
  console.log(`[${side}] done: ${Object.keys(result.checkpoints).length} checkpoints, ${consoleErrors.length} console errors`);
  await browser.close();
}

if (SIDE === "both" || SIDE === "poc") await run("poc");
if (SIDE === "both" || SIDE === "impl") await run("impl");
