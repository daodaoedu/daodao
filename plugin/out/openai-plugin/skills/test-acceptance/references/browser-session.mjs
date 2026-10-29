#!/usr/bin/env node
// 驗收用的常駐瀏覽器：一個指令起瀏覽器、之後每一步各自連回同一個分頁，邊看結果邊決定下一步。
// 2026-10-29 #141、#357 草稿實跑時臨時寫的做法，整理成固定工具（pstack create-verification-skill 的 Helpers）。
// 從 cwd 的 node_modules 找 playwright／@playwright/test／playwright-core（同 develop 的 layout-probe.mjs）。
//
// 用法：
//   # 1. 起瀏覽器（放背景跑，直到 stop）
//   node plugin/skills/test-acceptance/references/browser-session.mjs start [--port 9333] [--headed] [--executable <path>]
//   # 2. 注入登入 cookie 與 zh-TW 語系（token 檔只放 token；用完刪掉）
//   node .../browser-session.mjs login --token-file <檔案> [--port 9333]
//   # 3. 每一步寫成一個 .mjs，default export async ({ page, ctx, out }) => 回傳要看的值
//   node .../browser-session.mjs step <step.mjs> --out <證據資料夾> [--port 9333]
//   # 4. 收尾
//   node .../browser-session.mjs stop [--port 9333]
//
// step 檔範例：
//   export default async ({ page, out }) => {
//     await page.goto("https://app-dev.daodao.so/practices/create", { waitUntil: "networkidle" });
//     await page.screenshot({ path: `${out}/01-create.png` });
//     return { url: page.url() };
//   };
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const [cmd, ...rest] = process.argv.slice(2);
const positional = rest.filter((a, i) => !a.startsWith("--") && !(rest[i - 1] || "").startsWith("--"));
const args = Object.fromEntries(
  rest.reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]?.startsWith("--") || arr[i + 1] === undefined ? "true" : arr[i + 1]]);
    return acc;
  }, []),
);
const port = args.port || "9333";
const endpoint = `http://127.0.0.1:${port}`;

const require = createRequire(path.join(process.cwd(), "package.json"));
let chromium;
for (const mod of ["playwright", "@playwright/test", "playwright-core"]) {
  try { ({ chromium } = require(mod)); break; } catch {}
}
if (!chromium) {
  console.error("cwd 的 node_modules 找不到 playwright：在有裝 playwright 的資料夾（例如 daodao-f2e/apps/product）底下跑");
  process.exit(2);
}

async function connect() {
  const browser = await chromium.connectOverCDP(endpoint).catch(() => null);
  if (!browser) {
    console.error(`連不到 ${endpoint}：先跑 start`);
    process.exit(2);
  }
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find((p) => !p.url().startsWith("about:")) || ctx.pages()[0] || (await ctx.newPage());
  return { browser, ctx, page };
}

if (cmd === "start") {
  // 不在這裡設 locale：connectOverCDP 拿到的是預設 context，語系靠 login 寫 NEXT_LOCALE cookie
  const browser = await chromium.launch({
    headless: args.headed !== "true",
    ...(args.executable && args.executable !== "true" ? { executablePath: args.executable } : {}),
    args: [`--remote-debugging-port=${port}`],
  });
  console.log(`瀏覽器已啟動：${endpoint}（Ctrl+C 或 stop 結束）`);
  // stop 關掉瀏覽器後這個程序也要結束，否則會一直掛在背景
  browser.on("disconnected", () => process.exit(0));
  setInterval(() => {}, 1 << 30);
} else if (cmd === "login") {
  const file = args["token-file"];
  if (!file || file === "true") {
    console.error("需要 --token-file <檔案>");
    process.exit(2);
  }
  const { browser, ctx, page } = await connect();
  await ctx.addCookies([
    { name: "auth_token", value: fs.readFileSync(file, "utf8").trim(), domain: ".daodao.so", path: "/", secure: true, sameSite: "Lax" },
    { name: "NEXT_LOCALE", value: "zh-TW", domain: "app-dev.daodao.so", path: "/" },
  ]);
  await page.setViewportSize({ width: Number(args.width || 1280), height: Number(args.height || 900) });
  console.log("已寫入登入 cookie 與 NEXT_LOCALE=zh-TW；開頁後確認登入者是對的測試帳號");
  await browser.close();
} else if (cmd === "step") {
  const file = positional[0];
  const out = args.out && args.out !== "true" ? args.out : ".";
  if (!file) {
    console.error("需要 step 檔路徑");
    process.exit(2);
  }
  fs.mkdirSync(out, { recursive: true });
  const { browser, ctx, page } = await connect();
  // 加時間戳避開 import 快取：同一個 step 檔改完重跑要讀到新版
  const mod = await import(`${pathToFileURL(path.resolve(file)).href}?t=${Date.now()}`);
  try {
    const result = await mod.default({ page, ctx, out });
    if (result !== undefined) console.log(typeof result === "string" ? result : JSON.stringify(result, null, 1));
  } catch (e) {
    // 只印前幾行：playwright 的 call log 很長，關鍵是哪個 locator、等什麼
    console.log("ERR", String(e.message).split("\n").slice(0, 6).join("\n"));
    process.exitCode = 1;
  }
  await browser.close();
} else if (cmd === "stop") {
  const { browser } = await connect();
  const cdp = await browser.newBrowserCDPSession();
  await cdp.send("Browser.close").catch(() => {});
  console.log("瀏覽器已關閉");
} else {
  console.error("用法：browser-session.mjs start | login --token-file <f> | step <step.mjs> --out <dir> | stop");
  process.exit(2);
}
