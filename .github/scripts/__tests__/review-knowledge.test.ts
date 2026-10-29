import { describe, expect, it } from "vitest";

// @ts-expect-error — CJS 腳本沒有型別宣告
import { duplicateIds, nextId, recordErrors } from "../review-knowledge.cjs";

type Rec = { id: string };
const rec = (id: string): Rec => ({ id });

describe("nextId", () => {
  it("取現有最大編號 +1，而非筆數 +1", () => {
    // 回歸案例：FP-0059~0061 曾經斷號，db.length + 1 會算出 FP-0062 撞到既有紀錄
    const db = [
      ...Array.from({ length: 58 }, (_, i) => rec(`FP-${String(i + 1).padStart(4, "0")}`)),
      rec("FP-0062"),
      rec("FP-0063"),
      rec("FP-0064"),
    ];
    expect(db.length).toBe(61);
    expect(nextId(db)).toBe("FP-0065");
  });

  it("沒有斷號時等同筆數 +1", () => {
    const db = [rec("FP-0001"), rec("FP-0002")];
    expect(nextId(db)).toBe("FP-0003");
  });

  it("空 db 從 FP-0001 開始", () => {
    expect(nextId([])).toBe("FP-0001");
  });

  it("不受紀錄排列順序影響", () => {
    const db = [rec("FP-0003"), rec("FP-0001"), rec("FP-0002")];
    expect(nextId(db)).toBe("FP-0004");
  });
});

describe("duplicateIds", () => {
  it("回報重複的 ID", () => {
    const db = [rec("FP-0001"), rec("FP-0002"), rec("FP-0001"), rec("FP-0002"), rec("FP-0003")];
    expect(duplicateIds(db)).toEqual(["FP-0001", "FP-0002"]);
  });

  it("沒有重複時回傳空陣列", () => {
    expect(duplicateIds([rec("FP-0001"), rec("FP-0002")])).toEqual([]);
  });
});

describe("recordErrors", () => {
  const ok = {
    pattern: "C", source: "local", engine: "claude", repo: "daodao-f2e", pr: "1107",
    finding: "第二次點擊可能不捲動", why: "自承無法確認；實測兩次都捲動",
    sample: "| 🟡 Medium | `a.tsx:1` | 第二次點擊可能不捲動 | 確認 |", expected: "drop",
  };

  it("完整參數沒有錯誤", () => {
    expect(recordErrors(ok)).toEqual([]);
  });

  it("擋下 --finding 沒帶值（parseArgs 給 true，曾寫出 finding:true 的紀錄）", () => {
    expect(recordErrors({ ...ok, finding: true }).join()).toMatch(/--finding 必須是非空文字/);
  });

  it("沒有 sample 也沒說明原因時擋下", () => {
    const { sample: _s, expected: _e, ...noSample } = ok;
    const errors = recordErrors(noSample).join();
    expect(errors).toMatch(/缺 --sample/);
    expect(errors).toMatch(/缺 --expected/);
  });

  it("有 sample 沒 expected 時擋下：這種紀錄 test 不會跑到", () => {
    const { expected: _e, ...noExpected } = ok;
    expect(recordErrors(noExpected).join()).toMatch(/缺 --expected/);
  });

  it("用 --no-sample 寫明原因時可以不帶 sample", () => {
    const { sample: _s, expected: _e, ...noSample } = ok;
    expect(recordErrors({ ...noSample, "no-sample": "CI structured finding，沒有表格列" })).toEqual([]);
  });

  it("--no-sample 沒寫原因、或跟 sample 一起用時擋下", () => {
    const { sample: _s, expected: _e, ...noSample } = ok;
    expect(recordErrors({ ...noSample, "no-sample": true }).join()).toMatch(/--no-sample 要寫原因/);
    expect(recordErrors({ ...ok, "no-sample": "x" }).join()).toMatch(/不能和 --sample/);
  });

  it("pr 允許 0（人工造的 fixture），不允許非數字", () => {
    expect(recordErrors({ ...ok, pr: "0" })).toEqual([]);
    expect(recordErrors({ ...ok, pr: true }).join()).toMatch(/--pr 必須是數字/);
  });
});
