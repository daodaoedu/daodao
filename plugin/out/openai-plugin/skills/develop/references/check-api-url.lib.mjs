// check-api-url 的純函式：packages/config/generated/env.ts 的 API URL 要指向這次任務要驗的 server。
// turbo 跑 lint／typecheck 時會觸發 generate:env，它照 f2e 根目錄 .env.local 重新產生 env.ts；
// 那份 .env.local 是從 projects/ 複製來的 http://localhost:4000，所以手動改過的 port 會被蓋回去，
// 瀏覽器驗證就連到錯的 server、被導去登入頁（task 138、152、189、295）。

/** generated/env.ts 內 `"KEY": "value"` 的值；找不到回 null。 */
export const readGeneratedValue = (text, key) => {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`));
  return m ? m[1] : null;
};

/** dotenv 檔裡最後一個生效的 KEY=value（略過註解、去掉引號與行尾註解）；找不到回 null。 */
export const readDotenvValue = (text, key) => {
  let value = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(new RegExp(`^(?:export\\s+)?${key}\\s*=\\s*(.*)$`));
    if (m) value = m[1].replace(/\s+#.*$/, "").replace(/^(['"])(.*)\1$/, "$2");
  }
  return value;
};

const normalize = (url) => (url ?? "").replace(/\/+$/, "");

/**
 * @param {{ generated: string|null, expected: string, dotenv: string|null }} input
 *   generated：env.ts 現在的值；expected：任務要驗的 server；dotenv：f2e 根目錄 .env.local 的值
 * @returns {{ ok: boolean, messages: string[] }}
 */
export const compareApiUrl = ({ generated, expected, dotenv }) => {
  const regen = `cd packages/config && NEXT_PUBLIC_API_URL=${expected} pnpm generate:env`;
  const messages = [];
  let ok = true;
  if (generated === null) {
    ok = false;
    messages.push(`packages/config/generated/env.ts 不存在或沒有 NEXT_PUBLIC_API_URL：先產生一次：${regen}`);
  } else if (normalize(generated) !== normalize(expected)) {
    ok = false;
    messages.push(`generated/env.ts 指向 ${generated}，不是這次要驗的 ${expected}；瀏覽器會連到錯的 server。重新產生：${regen}`);
  } else {
    messages.push(`generated/env.ts 指向 ${expected}，正確`);
  }
  // 根目錄 .env.local 跟要驗的 server 不同時，下次 lint／typecheck 觸發 generate:env 又會被蓋回去
  if (dotenv !== null && normalize(dotenv) !== normalize(expected)) {
    messages.push(
      `注意：f2e 根目錄 .env.local 寫的是 ${dotenv}，下次跑 lint／typecheck 會把 env.ts 蓋回這個值。把 worktree 這份 .env.local 改成 NEXT_PUBLIC_API_URL=${expected}（只影響這個任務）`,
    );
  }
  return { ok, messages };
};
