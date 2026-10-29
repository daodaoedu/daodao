import { describe, expect, it } from "vitest";

// @ts-expect-error — CJS 腳本沒有型別宣告
import { duplicateIds, nextId } from "../review-knowledge.cjs";

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
