import { describe, expect, it } from "vitest";
// @ts-expect-error -- 檢查腳本是 .mjs（沒有型別宣告），這裡只測行為
import { compareApiUrl, readDotenvValue, readGeneratedValue } from "../check-api-url.lib.mjs";

const GENERATED = `export const env = {
  "NEXT_PUBLIC_SITE_URL": "http://localhost:3001",
  "NEXT_PUBLIC_API_URL": "http://localhost:4000",
} as const;`;

describe("readGeneratedValue", () => {
  it("讀出 generated/env.ts 的值", () => {
    expect(readGeneratedValue(GENERATED, "NEXT_PUBLIC_API_URL")).toBe("http://localhost:4000");
  });
  it("沒有這個 key 時回 null", () => {
    expect(readGeneratedValue(GENERATED, "NEXT_PUBLIC_MISSING")).toBeNull();
  });
});

describe("readDotenvValue", () => {
  it("取最後一個生效的設定，略過註解行", () => {
    const text = "NEXT_PUBLIC_API_URL=http://localhost:4000\n# NEXT_PUBLIC_API_URL=https://server-dev.daodao.so\nNEXT_PUBLIC_API_URL=http://localhost:4010\n";
    expect(readDotenvValue(text, "NEXT_PUBLIC_API_URL")).toBe("http://localhost:4010");
  });
  it("去掉引號與行尾註解，也認 export 前綴", () => {
    expect(readDotenvValue('export NEXT_PUBLIC_API_URL="http://localhost:4010" # worktree', "NEXT_PUBLIC_API_URL")).toBe("http://localhost:4010");
  });
  it("只有註解掉的設定時回 null", () => {
    expect(readDotenvValue("# NEXT_PUBLIC_API_URL=https://server-dev.daodao.so", "NEXT_PUBLIC_API_URL")).toBeNull();
  });
});

describe("compareApiUrl", () => {
  // task 189：lint 把 generated/env.ts 蓋回 localhost:4000，worktree 的 server 在 4010
  it("env.ts 被蓋回別的 port：不通過，訊息附重新產生的指令", () => {
    const r = compareApiUrl({ generated: "http://localhost:4000", expected: "http://localhost:4010", dotenv: "http://localhost:4000" });
    expect(r.ok).toBe(false);
    expect(r.messages[0]).toContain("NEXT_PUBLIC_API_URL=http://localhost:4010 pnpm generate:env");
  });

  it("env.ts 正確、但根目錄 .env.local 還是舊 port：通過，同時提醒下次 lint 會被蓋回去", () => {
    const r = compareApiUrl({ generated: "http://localhost:4010", expected: "http://localhost:4010", dotenv: "http://localhost:4000" });
    expect(r.ok).toBe(true);
    expect(r.messages[1]).toContain("下次跑 lint／typecheck 會把 env.ts 蓋回");
  });

  it("env.ts 與 .env.local 都指向要驗的 server：通過且沒有提醒；結尾斜線不算差異", () => {
    const r = compareApiUrl({ generated: "http://localhost:4010/", expected: "http://localhost:4010", dotenv: "http://localhost:4010" });
    expect(r).toEqual({ ok: true, messages: [expect.stringContaining("正確")] });
  });

  it("env.ts 還沒產生：不通過", () => {
    expect(compareApiUrl({ generated: null, expected: "http://localhost:4010", dotenv: null }).ok).toBe(false);
  });
});
