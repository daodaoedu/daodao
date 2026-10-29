import { describe, expect, it } from "vitest";
import { candidatePaths, checkFeatureDoc, parseFeatureDoc } from "../feature-map.js";

const WEB_DOC = [
  "# 建立實踐",
  "",
  "- 介面：Web（apps/product）",
  "- 依據版本：daodao-f2e 70155dce（2026-10-29）",
  "| 模板卡片 | `getByRole('button')` | apps/product/src/app/[locale]/practices/create/page.tsx:220 |",
  "| 完成新增 | `getByRole('button')` | apps/product/src/components/wizard-page.tsx:299-307 |",
  "| 時間軸 | `getByTestId('home-timeline-summary')` | apps/product/src/components/home.tsx:12 |",
  "| 模板卡 | `getByTestId('template-<templateId>')` | - |",
  "| 已取消的 | `[data-testid=\"timeline-node\"]` | - |",
].join("\n");

describe("parseFeatureDoc", () => {
  it("讀出依據版本、每一筆 path:line（含範圍）與 data-testid，並記下在文件的第幾行", () => {
    const doc = parseFeatureDoc(WEB_DOC, "web");
    expect(doc).toMatchObject({ repo: "daodao-f2e", baseSha: "70155dce" });
    expect(doc.citations).toEqual([
      { path: "apps/product/src/app/[locale]/practices/create/page.tsx", line: 220, endLine: 220, docLine: 5 },
      { path: "apps/product/src/components/wizard-page.tsx", line: 299, endLine: 307, docLine: 6 },
      { path: "apps/product/src/components/home.tsx", line: 12, endLine: 12, docLine: 7 },
    ]);
    expect(doc.testIds.map((t) => t.id)).toEqual(["home-timeline-summary", "timeline-node"]);
  });

  it("執行時才組出來的 testid（template-<templateId>）不列入檢查", () => {
    expect(parseFeatureDoc(WEB_DOC, "web").testIds.map((t) => t.id)).not.toContain("template-<templateId>");
  });
});

describe("candidatePaths", () => {
  it("app 的路徑是相對 apps/mobile 寫的，先試原樣再試 apps/mobile/", () => {
    expect(candidatePaths("app", "app/practices/[id]/index.tsx")).toEqual([
      "app/practices/[id]/index.tsx",
      "apps/mobile/app/practices/[id]/index.tsx",
    ]);
  });
  it("admin 的路徑是相對 admin-ui 根目錄，只試原樣", () => {
    expect(candidatePaths("admin", "src/pages/FeedbackPage.tsx")).toEqual(["src/pages/FeedbackPage.tsx"]);
  });
});

describe("checkFeatureDoc", () => {
  const files: Record<string, number> = {
    "apps/product/src/app/[locale]/practices/create/page.tsx": 300,
    "apps/product/src/components/wizard-page.tsx": 302,
  };
  const lineCount = (p: string) => files[p] ?? null;

  it("檔案不存在、行號超出檔案長度、testid 找不到，各回報一筆", () => {
    const findings = checkFeatureDoc(parseFeatureDoc(WEB_DOC, "web"), lineCount, (id) => id === "timeline-node");
    expect(findings.map((f) => [f.kind, f.docLine])).toEqual([
      ["line-out-of-range", 6], // 299-307 但檔案只有 302 行
      ["missing-file", 7],
      ["missing-testid", 7],
    ]);
  });

  it("全部都對得上時沒有 finding", () => {
    const all: Record<string, number> = { ...files, "apps/product/src/components/home.tsx": 40, "apps/product/src/components/wizard-page.tsx": 400 };
    expect(checkFeatureDoc(parseFeatureDoc(WEB_DOC, "web"), (p) => all[p] ?? null, () => true)).toEqual([]);
  });

  // 2026-10-29：app 檔案寫成 app/practices/[id]/index.tsx，實際在 apps/mobile/ 底下
  it("用第二個候選路徑找到檔案時不算失效", () => {
    const doc = parseFeatureDoc("- 依據版本：daodao-f2e 6034e986\n| x | y | app/practices/[id]/index.tsx:432 |", "app");
    const findings = checkFeatureDoc(doc, (p) => (p === "apps/mobile/app/practices/[id]/index.tsx" ? 826 : null), () => true);
    expect(findings).toEqual([]);
  });

  it("沒有依據版本時回報 no-version", () => {
    const doc = parseFeatureDoc("| x | y | src/a.ts:1 |", "admin");
    expect(checkFeatureDoc(doc, () => 10, () => true).map((f) => f.kind)).toEqual(["no-version"]);
  });
});
