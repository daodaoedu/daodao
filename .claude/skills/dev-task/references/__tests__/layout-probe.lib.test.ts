import { describe, expect, it } from "vitest";
// @ts-expect-error -- 探針是 .mjs（沒有型別宣告），這裡只測行為
import { isClippedByAncestor, isLoginWall, targetPathname } from "../layout-probe.lib.mjs";

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

  it("祖先有 overflow-x hidden／auto／scroll 就算被裁切", () => {
    for (const ox of ["hidden", "auto", "scroll"]) {
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
