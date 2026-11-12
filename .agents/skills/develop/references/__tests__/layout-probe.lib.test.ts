import { describe, expect, it } from "vitest";
// @ts-expect-error -- 探針是 .mjs（沒有型別宣告），這裡只測行為
import { cornerSampleInset, horizontalOverflow, isClippedByAncestor, isHorizontallyOutside, isLoginWall, targetPathname } from "../layout-probe.lib.mjs";

describe("horizontalOverflow", () => {
  it("經典捲軸下仍抓到超出可用寬度的3px（#473）", () => {
    expect(horizontalOverflow(378, 375)).toBe(3);
  });

  it("內容符合經典捲軸或overlay可用寬度時沒有溢出", () => {
    expect(horizontalOverflow(375, 375)).toBe(0);
    expect(horizontalOverflow(390, 390)).toBe(0);
    expect(horizontalOverflow(350, 375)).toBe(0);
  });

  it("不把真實1px document溢出當矩形四捨五入", () => {
    expect(horizontalOverflow(376, 375)).toBe(1);
  });
});

describe("isHorizontallyOutside", () => {
  it("右界是clientWidth，不是包含捲軸的innerWidth", () => {
    expect(isHorizontallyOutside({ left: 66, right: 378.39 }, 375)).toBe(true);
  });

  it("保留1px矩形誤差容忍，但不放過左右真正出界", () => {
    expect(isHorizontallyOutside({ left: -1, right: 376 }, 375)).toBe(false);
    expect(isHorizontallyOutside({ left: -1.1, right: 375 }, 375)).toBe(true);
    expect(isHorizontallyOutside({ left: 0, right: 376.1 }, 375)).toBe(true);
    expect(isHorizontallyOutside({ left: 0, right: 390 }, 390)).toBe(false);
  });
});

describe("targetPathname", () => {
  it("去掉 locale 前綴與 query", () => {
    expect(targetPathname("/zh-TW/auth/error")).toBe("/auth/error");
    expect(targetPathname("/en/settings")).toBe("/settings");
    expect(targetPathname("/zh-TW/practices/copy-success?practiceId=abc")).toBe(
      "/practices/copy-success"
    );
  });

  it("沒有 locale 前綴時原樣保留", () => {
    expect(targetPathname("/settings")).toBe("/settings");
  });
});

describe("isLoginWall", () => {
  // daodao#239：/auth/* 底下的目標頁本身不是登入牆
  it("目標頁就在 /auth/ 底下時不算登入牆", () => {
    expect(isLoginWall("/auth/error", "/zh-TW/auth/error")).toBe(false);
    expect(isLoginWall("/auth/onboarding", "/zh-TW/auth/onboarding")).toBe(false);
    expect(isLoginWall("/auth/verify-email/pending", "/zh-TW/auth/verify-email/pending")).toBe(
      false
    );
  });

  // daodao#166：真的被導去登入頁還是要擋下來
  it("被導去登入頁仍判為登入牆", () => {
    expect(isLoginWall("/auth/login", "/zh-TW/settings")).toBe(true);
    expect(isLoginWall("/auth/login", "/zh-TW/auth/error")).toBe(true);
    expect(isLoginWall("/login", "/zh-TW/practices/create")).toBe(true);
    expect(isLoginWall("/sign-in", "/zh-TW/practices/create")).toBe(true);
  });

  it("正常落在目標頁不算登入牆", () => {
    expect(isLoginWall("/settings", "/zh-TW/settings")).toBe(false);
    expect(isLoginWall("/settings/", "/zh-TW/settings")).toBe(false);
    expect(isLoginWall("/practices/copy-success", "/zh-TW/practices/copy-success?practiceId=x")).toBe(
      false
    );
  });

  it("被導去其他非登入頁不算登入牆（由落點欄人工核對）", () => {
    expect(isLoginWall("/", "/zh-TW/auth/onboarding")).toBe(false);
  });
});

describe("isClippedByAncestor", () => {
  const el = (overflowX: string, parent: unknown = null) => ({ overflowX, parentElement: parent });
  const getOverflowX = (n: { overflowX: string }) => n.overflowX;

  it("祖先有 overflow-x hidden／clip／auto／scroll 就算被裁切", () => {
    for (const ox of ["hidden", "clip", "auto", "scroll"]) {
      const body = el("visible");
      const wrapper = el(ox, body);
      const target = el("visible", wrapper);
      expect(isClippedByAncestor(target, getOverflowX, body)).toBe(true);
    }
  });

  it("一路到 stopAt 都沒有裁切祖先就是真的出界", () => {
    const body = el("visible");
    const mid = el("visible", body);
    const target = el("visible", mid);
    expect(isClippedByAncestor(target, getOverflowX, body)).toBe(false);
  });

  it("不把 stopAt 自身的 overflow 算進去", () => {
    const body = el("hidden");
    const target = el("visible", body);
    expect(isClippedByAncestor(target, getOverflowX, body)).toBe(false);
  });

  it("沒有 parent 時回 false", () => {
    expect(isClippedByAncestor(el("visible"), getOverflowX, null)).toBe(false);
  });
});

describe("cornerSampleInset", () => {
  // 取樣點 (i, i) 在半徑 R 的圓角內 ⇔ (R − i)·√2 ≤ R
  const insideCorner = (i: number, r: number) => (r - i) * Math.SQRT2 <= r;

  // daodao#524：24px 圓角的抽屜，固定內縮 6px 會落在圓角外、量到背後遮罩
  it("圓角較大時內縮到圓角內，取樣點不會落在圓角外", () => {
    const inset = cornerSampleInset([24, 0, 24, 0], 420, 900);
    expect(insideCorner(inset, 24)).toBe(true);
    expect(insideCorner(6, 24)).toBe(false);
  });

  it("沒有圓角或圓角很小時維持最小內縮 6px", () => {
    expect(cornerSampleInset([0, 0, 0, 0], 300, 200)).toBe(6);
    expect(cornerSampleInset([8, 8, 8, 8], 300, 200)).toBe(6);
  });

  it("pill 樣式的超大半徑以邊長一半為上限，取樣點仍在浮層內", () => {
    const inset = cornerSampleInset([9999, 9999, 9999, 9999], 120, 40);
    expect(insideCorner(inset, 20)).toBe(true);
    expect(inset).toBeLessThan(20);
  });

  it("無法解析的半徑視為 0", () => {
    expect(cornerSampleInset([Number.NaN, Number.NaN, 0, 0], 300, 200)).toBe(6);
  });
});
