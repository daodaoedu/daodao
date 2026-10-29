/**
 * Feature map audit (pure parsing; git reads live in feature-map-audit.ts).
 *
 * plugin/docs/feature-map/<surface>/<feature>.md cite code as `path:line` and selectors as
 * data-testid values, against the dev revision named in the file's 「依據版本」 line. The map is
 * only updated by hand when a UI PR remembers to, so citations drift (#419 found 236 commits of
 * drift in one pass). This finds citations that no longer resolve on current dev.
 */

export type FeatureSurface = "web" | "admin" | "app";

export type FeatureDoc = {
  surface: FeatureSurface;
  /** Repo named in 「依據版本」, e.g. daodao-f2e; null when the line is missing. */
  repo: string | null;
  baseSha: string | null;
  citations: Array<{ path: string; line: number; endLine: number; docLine: number }>;
  testIds: Array<{ id: string; docLine: number }>;
};

const CITATION_RE =
  /((?:apps|packages|src|app|components|hooks|services|providers|utils|constants|i18n|lib)\/[A-Za-z0-9_./()\[\]@+-]+\.(?:tsx?|jsx?|json|mjs|css)):(\d+)(?:[-–](\d+))?/g;
const TESTID_RE = /getByTestId\(\s*['"]([^'"]+)['"]|data-testid=\\?["']([^"'\\]+)/g;
const VERSION_RE = /依據版本：\s*(daodao-[\w-]+)\s+([0-9a-f]{7,40})/;

export function parseFeatureDoc(markdown: string, surface: FeatureSurface): FeatureDoc {
  const doc: FeatureDoc = { surface, repo: null, baseSha: null, citations: [], testIds: [] };
  markdown.split("\n").forEach((text, i) => {
    const docLine = i + 1;
    const v = text.match(VERSION_RE);
    if (v && !doc.repo) {
      doc.repo = v[1];
      doc.baseSha = v[2];
    }
    for (const m of text.matchAll(CITATION_RE)) {
      const line = Number(m[2]);
      doc.citations.push({ path: m[1], line, endLine: m[3] ? Number(m[3]) : line, docLine });
    }
    for (const m of text.matchAll(TESTID_RE)) {
      const id = m[1] ?? m[2];
      // Template ids like template-<templateId> or `${x}` are built at runtime; nothing to grep for
      if (/[<>{}$]/.test(id)) continue;
      doc.testIds.push({ id, docLine });
    }
  });
  return doc;
}

/** Repo-relative paths to try for a citation, in order (docs write paths relative to different roots). */
export function candidatePaths(surface: FeatureSurface, path: string): string[] {
  if (surface === "admin") return [path];
  if (surface === "app") return [path, `apps/mobile/${path}`];
  return [path, `apps/product/src/${path}`, `apps/product/${path}`];
}

export type FeatureMapFinding = {
  kind: "missing-file" | "line-out-of-range" | "missing-testid" | "no-version";
  docLine: number;
  detail: string;
};

/**
 * @param lineCount returns the file's line count at the audited ref, or null when it does not exist
 * @param testIdExists whether the id string appears anywhere in the repo at the audited ref
 */
export function checkFeatureDoc(
  doc: FeatureDoc,
  lineCount: (path: string) => number | null,
  testIdExists: (id: string) => boolean,
): FeatureMapFinding[] {
  const findings: FeatureMapFinding[] = [];
  if (!doc.repo) findings.push({ kind: "no-version", docLine: 1, detail: "缺「依據版本：<repo> <sha>」，無法判斷要對哪個 repo 檢查" });
  for (const c of doc.citations) {
    const resolved = candidatePaths(doc.surface, c.path)
      .map((p) => ({ p, n: lineCount(p) }))
      .find((x) => x.n !== null);
    if (!resolved) {
      findings.push({ kind: "missing-file", docLine: c.docLine, detail: `${c.path} 不存在` });
    } else if (c.endLine > resolved.n!) {
      findings.push({ kind: "line-out-of-range", docLine: c.docLine, detail: `${c.path}:${c.endLine} 超出檔案長度（${resolved.n} 行）` });
    }
  }
  const seen = new Set<string>();
  for (const t of doc.testIds) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    if (!testIdExists(t.id)) findings.push({ kind: "missing-testid", docLine: t.docLine, detail: `data-testid「${t.id}」在程式碼找不到` });
  }
  return findings;
}
