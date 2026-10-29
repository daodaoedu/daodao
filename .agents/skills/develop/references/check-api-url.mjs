#!/usr/bin/env node
// 瀏覽器驗證前檢查 f2e 的 API URL：generated/env.ts 要指向這次任務要驗的 server，不一致就停下（exit 1）。
// 每次跑完 lint／typecheck、起 dev server 或跑版面探針之前都跑一次。
//
// 用法：
//   node plugin/skills/develop/references/check-api-url.mjs --f2e "$TASK/daodao-f2e" --expect http://localhost:<server port>
//   （連 server-dev 時 --expect https://server-dev.daodao.so）
// exit 0 = 正確；1 = 指向別的 server 或還沒產生（印出重新產生的指令）；2 = 用法錯誤
import fs from "node:fs";
import path from "node:path";
import { compareApiUrl, readDotenvValue, readGeneratedValue } from "./check-api-url.lib.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]?.startsWith("--") || arr[i + 1] === undefined ? "true" : arr[i + 1]]);
    return acc;
  }, []),
);
const f2e = args.f2e;
const expected = args.expect;
if (!f2e || f2e === "true" || !fs.existsSync(path.join(f2e, "packages", "config")) || !expected || expected === "true") {
  console.error("用法：check-api-url.mjs --f2e <daodao-f2e checkout> --expect <這次要驗的 server URL>");
  process.exit(2);
}
const KEY = "NEXT_PUBLIC_API_URL";
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);

const generatedText = read(path.join(f2e, "packages", "config", "generated", "env.ts"));
const dotenvText = read(path.join(f2e, ".env.local"));
const { ok, messages } = compareApiUrl({
  generated: generatedText === null ? null : readGeneratedValue(generatedText, KEY),
  expected,
  dotenv: dotenvText === null ? null : readDotenvValue(dotenvText, KEY),
});
messages.forEach((m, i) => console.log(`${i === 0 ? (ok ? "✅" : "❌") : "⚠️ "} ${m}`));
process.exit(ok ? 0 : 1);
