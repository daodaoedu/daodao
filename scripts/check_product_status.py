#!/usr/bin/env python3
"""
Product Status Drift Checker — 偵測 docs/product 狀態標示與程式碼現實的漂移

理念同 daodao-storage 的 check_schema_sync.py：把跨 repo 的靜默漂移變成自動偵測。
docs/product 的 PRD/FRD 狀態在功能上線後無人回寫，AI 照文件當規劃地圖會重做已
上線功能。本 script 讀 product_status_manifest.yml，對每個功能宣告的 code signal
逐一驗證，比對「文件宣稱狀態(declared)」與「程式碼實測狀態(detected)」，不符即漂移。

detected 判定：全部 signal 命中 → shipped；部分 → partial；零 → absent。
signal 命中：file 存在，且（若給 pattern）該 regex 在檔內命中。

漂移方向：
  understated  declared 低於 detected（如文件說 planned、程式碼已 shipped）—— 高風險，
               會害 AI 重做或低估 scope，是本檢查的主要獵物。
  overstated   declared 高於 detected（如文件說 shipped、程式碼卻 absent）—— 文件吹牛
               或功能被移除，也值得知道。

用法:
  python scripts/check_product_status.py                 # 人看的報告
  python scripts/check_product_status.py --verbose       # 連沒漂移的也列出
  python scripts/check_product_status.py --ci            # 有漂移時 exit code 1
  python scripts/check_product_status.py --report out.md # 另存 markdown 報告
  python scripts/check_product_status.py --projects-dir /path/to/siblings

repo 目錄解析：<projects-dir>/<repo_name>，projects-dir 預設為主 repo 的上一層
（本地 = /home/user，CI = workspace 根，各子 repo 與主 repo 平行 checkout）。
"""

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import yaml

BASE_DIR = Path(__file__).resolve().parent.parent  # 主 repo 根目錄
DEFAULT_MANIFEST = BASE_DIR / "scripts" / "product_status_manifest.yml"
DEFAULT_PROJECTS_DIR = BASE_DIR.parent  # 各子 repo 與主 repo 平行

# declared 用 planned（尚未實作）、detected 用 absent（程式碼查無），兩者同為第 0 階
RANK = {"planned": 0, "absent": 0, "partial": 1, "shipped": 2}


@dataclass
class SignalResult:
    repo: str
    file: str
    pattern: str | None
    hit: bool
    reason: str  # "hit" | "file-missing" | "pattern-miss" | "repo-missing"


@dataclass
class FeatureResult:
    name: str
    doc: str
    declared: str
    detected: str
    signals: list[SignalResult]

    @property
    def drift(self) -> str | None:
        d, r = RANK[self.declared], RANK[self.detected]
        if d == r:
            return None
        return "understated" if d < r else "overstated"


def check_signal(sig: dict, projects_dir: Path) -> SignalResult:
    repo = sig["repo"]
    rel = sig["file"]
    pattern = sig.get("pattern")
    repo_dir = projects_dir / repo
    path = repo_dir / rel

    if not repo_dir.is_dir():
        return SignalResult(repo, rel, pattern, False, "repo-missing")
    if not path.is_file():
        return SignalResult(repo, rel, pattern, False, "file-missing")
    if pattern is None:
        return SignalResult(repo, rel, pattern, True, "hit")
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return SignalResult(repo, rel, pattern, False, "file-missing")
    if re.search(pattern, text):
        return SignalResult(repo, rel, pattern, True, "hit")
    return SignalResult(repo, rel, pattern, False, "pattern-miss")


def detect_status(signals: list[SignalResult]) -> str:
    hits = sum(1 for s in signals if s.hit)
    if hits == 0:
        return "absent"
    if hits == len(signals):
        return "shipped"
    return "partial"


def evaluate(manifest: dict, projects_dir: Path) -> list[FeatureResult]:
    results: list[FeatureResult] = []
    for feat in manifest.get("features", []):
        sig_results = [check_signal(s, projects_dir) for s in feat["signals"]]
        detected = detect_status(sig_results)
        results.append(
            FeatureResult(
                name=feat["name"],
                doc=feat.get("doc", ""),
                declared=feat["declared"],
                detected=detected,
                signals=sig_results,
            )
        )
    return results


ICON = {"understated": "🔺", "overstated": "🔻", None: "✅"}


def render(results: list[FeatureResult], verbose: bool) -> str:
    drifts = [r for r in results if r.drift]
    lines: list[str] = []
    lines.append("# Product Status Drift Report\n")
    lines.append(
        f"掃描 {len(results)} 個功能，發現 **{len(drifts)}** 個漂移"
        f"（🔺understated＝文件落後程式碼、🔻overstated＝文件超前程式碼）。\n"
    )

    if drifts:
        lines.append("| | 功能 | 文件宣稱 | 程式碼實測 | 方向 |")
        lines.append("|---|------|----------|-----------|------|")
        for r in drifts:
            lines.append(
                f"| {ICON[r.drift]} | `{r.name}` | {r.declared} | **{r.detected}** | {r.drift} |"
            )
        lines.append("")
        lines.append("## 漂移細節\n")
        for r in drifts:
            lines.append(f"### {ICON[r.drift]} `{r.name}` — {r.doc}")
            lines.append(
                f"文件寫 **{r.declared}**，但程式碼實測為 **{r.detected}**。"
                + (
                    "照文件規劃會重做已上線功能——請把 PRD 狀態改對。"
                    if r.drift == "understated"
                    else "文件宣稱已完成但程式碼未達到——請確認是否被移除或誇大。"
                )
            )
            for s in r.signals:
                mark = "✓" if s.hit else "✗"
                pat = f" /{s.pattern}/" if s.pattern else ""
                lines.append(f"  - {mark} `{s.repo}/{s.file}`{pat} — {s.reason}")
            lines.append("")

    if verbose:
        clean = [r for r in results if not r.drift]
        if clean:
            lines.append("## 無漂移（文件與程式碼一致）\n")
            for r in clean:
                lines.append(f"- ✅ `{r.name}` — {r.declared} == {r.detected}")
            lines.append("")

    if not drifts:
        lines.append("🎉 沒有偵測到狀態漂移。")

    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="Detect docs/product status drift vs code")
    ap.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    ap.add_argument("--projects-dir", type=Path, default=DEFAULT_PROJECTS_DIR,
                    help="含各子 repo 的目錄（<projects-dir>/daodao-server ...）")
    ap.add_argument("--ci", action="store_true", help="有漂移時 exit code 1")
    ap.add_argument("--verbose", action="store_true", help="連無漂移的功能也列出")
    ap.add_argument("--report", type=Path, help="另存 markdown 報告到此路徑")
    args = ap.parse_args()

    if not args.manifest.is_file():
        print(f"manifest not found: {args.manifest}", file=sys.stderr)
        return 2

    manifest = yaml.safe_load(args.manifest.read_text(encoding="utf-8"))
    results = evaluate(manifest, args.projects_dir.resolve())
    report = render(results, args.verbose)
    print(report)

    if args.report:
        args.report.write_text(report + "\n", encoding="utf-8")

    drift_count = sum(1 for r in results if r.drift)
    if args.ci and drift_count:
        print(f"\n::error::偵測到 {drift_count} 個產品文件狀態漂移", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
