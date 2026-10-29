#!/usr/bin/env node
/**
 * Read-only audit of plugin/docs/feature-map against current dev: every cited `path:line` still
 * exists and every data-testid can still be found. Reads sub-repos through `git show`／`git grep`
 * on a ref (default origin/dev), so stale local checkouts under projects/ do not matter.
 *
 * Usage:
 *   pnpm -s tsx bin/pipeline/feature-map-audit.ts [--fetch] [--ref origin/dev] [--json]
 *
 * Exit 0 = every citation resolves, 1 = some do not, 2 = usage error.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { checkFeatureDoc, parseFeatureDoc, type FeatureMapFinding, type FeatureSurface } from "./feature-map.js";

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const refIdx = argv.indexOf("--ref");
const ref = refIdx >= 0 ? argv[refIdx + 1] ?? "origin/dev" : "origin/dev";
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const mapDir = path.join(root, "plugin", "docs", "feature-map");

const git = (repoDir: string, args: string[]) => {
  try {
    return execFileSync("git", ["-C", repoDir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 });
  } catch {
    return null;
  }
};

const repoDirs = new Map<string, string>();
const repoDir = (repo: string) => {
  if (!repoDirs.has(repo)) {
    const dir = path.join(root, "projects", repo);
    if (argv.includes("--fetch")) git(dir, ["fetch", "-q", "origin", ref.replace(/^origin\//, "")]);
    repoDirs.set(repo, dir);
  }
  return repoDirs.get(repo)!;
};

const lineCache = new Map<string, number | null>();
const testIdCache = new Map<string, boolean>();

type Result = { file: string; repo: string | null; baseSha: string | null; head: string | null; changedSinceBase: number | null; findings: FeatureMapFinding[] };
const results: Result[] = [];

for (const surface of ["web", "admin", "app"] as FeatureSurface[]) {
  const dir = path.join(mapDir, surface);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const file = path.join(dir, name);
    const doc = parseFeatureDoc(fs.readFileSync(file, "utf8"), surface);
    const rdir = doc.repo ? repoDir(doc.repo) : null;
    const lineCount = (p: string) => {
      const key = `${doc.repo}:${p}`;
      if (!lineCache.has(key)) {
        // cat-file, not show: `git show <ref>:app/practices/[id]/index.tsx` exits 0 with empty output when the path is missing
        const out = rdir ? git(rdir, ["cat-file", "-p", `${ref}:${p}`]) : null;
        lineCache.set(key, out === null ? null : out.split("\n").length - (out.endsWith("\n") ? 1 : 0));
      }
      return lineCache.get(key)!;
    };
    const testIdExists = (id: string) => {
      const key = `${doc.repo}:${id}`;
      if (!testIdCache.has(key)) testIdCache.set(key, rdir !== null && git(rdir, ["grep", "-q", "-F", id, ref, "--"]) !== null);
      return testIdCache.get(key)!;
    };
    const findings = checkFeatureDoc(doc, lineCount, testIdExists);
    // How many commits touched the cited files since the map was written: a hint the text may be stale
    let changedSinceBase: number | null = null;
    if (rdir && doc.baseSha && doc.citations.length) {
      const paths = [...new Set(doc.citations.map((c) => c.path))].flatMap((p) =>
        ["", "apps/product/src/", "apps/product/", "apps/mobile/"].map((pre) => pre + p),
      );
      const out = git(rdir, ["rev-list", "--count", `${doc.baseSha}..${ref}`, "--", ...paths]);
      changedSinceBase = out === null ? null : Number(out.trim());
    }
    const head = rdir ? git(rdir, ["rev-parse", "--short=8", ref])?.trim() ?? null : null;
    results.push({ file: path.relative(root, file), repo: doc.repo, baseSha: doc.baseSha, head, changedSinceBase, findings });
  }
}

const broken = results.reduce((n, r) => n + r.findings.length, 0);
if (json) {
  console.log(JSON.stringify({ ref, results }, null, 2));
} else {
  console.log(`檢查 ${results.length} 份 feature map（對 ${ref}）`);
  for (const r of results) {
    const drift = r.changedSinceBase ? `；引用的檔案在 ${r.baseSha}..${r.head} 之間被改了 ${r.changedSinceBase} 次` : "";
    if (!r.findings.length && !r.changedSinceBase) continue;
    console.log(`\n${r.findings.length ? "❌" : "⚠️"} ${r.file}（${r.repo ?? "?"} ${r.baseSha ?? "?"}${drift}）`);
    for (const f of r.findings) console.log(`   第 ${f.docLine} 行 ${f.kind}：${f.detail}`);
  }
  const drifted = results.filter((r) => r.changedSinceBase).length;
  console.log(`\n共 ${broken} 個失效引用；${drifted} 份的引用檔案在撰寫後有變更（內容可能過時，建議抽查）`);
}
process.exit(broken ? 1 : 0);
