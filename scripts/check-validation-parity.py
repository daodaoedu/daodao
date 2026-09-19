#!/usr/bin/env python3
"""前端手寫驗證規則 vs server OpenAPI 規則的對齊檢查（驗證規則對齊 signal）。

背景：#188「無法建立場次」——f2e 的 HTML `pattern="[a-z0-9-]+"` 在瀏覽器以 v flag 編譯是無效正則，
被整個忽略；server 的 zod 規則是 `^[a-z0-9]+(?:-[a-z0-9]+)*$`，使用者輸入大寫就 400，而前端
把 400 吞成通用訊息。沒有任何閘門比對過「前端擋什麼」和「後端擋什麼」。

這支腳本做三件事：
1. 從變更的 .ts/.tsx 檔抓出手寫驗證規則：HTML `pattern=` 屬性、`/^...$/` 錨定 regex 常數
2. 每個 HTML pattern 用 node 以 `v` flag 編譯（瀏覽器就是這樣編的）——編不過 = INVALID
3. 每條規則對照 openapi.json 裡所有 `pattern` 值——找得到 = MATCH；找不到 = UNMATCHED，
   除非 task.md 的核心旅程矩陣已把該規則文字列為 BE 規則來源（= DOCUMENTED）

Exit code：有 INVALID → 1；`--strict` 時 UNMATCHED（未 DOCUMENTED）也 → 1；其餘 0。
這是 signal，不是契約證明：MATCH 只代表文字一致，仍要在核心旅程矩陣用真實／錯誤輸入送出驗證。

用法：
  python3 scripts/check-validation-parity.py --repo <f2e-worktree> [--base origin/dev]
      [--openapi <openapi.json>] [--task-md <task.md>] [--files a.tsx b.tsx] [--strict] [--json]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable

SOURCE_EXT = (".ts", ".tsx")
EXCLUDE_PATH = re.compile(r"(\.test\.|\.spec\.|__tests__/|/generated/|\.d\.ts$|/node_modules/)")

# pattern="..."  /  pattern='...'  /  pattern={"..."}  /  pattern={CONST}
HTML_PATTERN_ATTR = re.compile(
    r"""\bpattern\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\}|\{\s*([A-Za-z_$][\w$]*)\s*\})"""
)
# const NAME = "..."  (字串常數，供 pattern={NAME} 解析)
STRING_CONST = re.compile(r"""\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:"([^"\n]*)"|'([^'\n]*)')""")
# 錨定 regex 字面值：/^...$/flags（驗證規則幾乎都錨定；非錨定的多半是 replace/split，噪音）
ANCHORED_REGEX = re.compile(r"/(\^(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n\[])*\$)/([a-z]*)")


_JS_SIMPLE_ESCAPES = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}


def decode_js_string(source: str) -> str:
    """把 JS 字串字面值的原始碼文字還原成執行期字串（"[a-z\\\\-]+" → [a-z\\-]+）。
    只處理 JS 字串常數與 pattern={"..."}；JSX 屬性 pattern="..." 不做轉義處理（那不是 JS 字串）。"""

    def repl(m: re.Match[str]) -> str:
        esc = m.group(1)
        if esc.startswith("u{"):
            return chr(int(esc[2:-1], 16))
        if esc[0] == "u":
            return chr(int(esc[1:], 16))
        if esc[0] == "x":
            return chr(int(esc[1:], 16))
        return _JS_SIMPLE_ESCAPES.get(esc, esc)

    return re.sub(r"\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)", repl, source, flags=re.S)


@dataclass
class Rule:
    file: str
    line: int
    kind: str  # html-pattern | regex-literal
    source: str  # 規則原文（HTML pattern 字串或 regex source）
    name: str = ""  # 常數名（有的話）
    flags: str = ""  # regex 字面值的 flags（i 會改變語意）
    status: str = "UNCHECKED"  # INVALID | MATCH | DOCUMENTED | UNMATCHED | UNCHECKED
    detail: str = ""
    matched_openapi: str = ""


@dataclass
class Report:
    rules: list[Rule] = field(default_factory=list)
    openapi_path: str = ""
    openapi_pattern_count: int = 0
    node_available: bool = False
    files_scanned: int = 0

    def counts(self) -> dict[str, int]:
        out: dict[str, int] = {}
        for r in self.rules:
            out[r.status] = out.get(r.status, 0) + 1
        return out


def normalize(pattern: str) -> str:
    """去掉錨定與非捕獲群組差異，讓 `^a(?:-b)*$` 與 `a(-b)*` 視為同一條規則。"""
    p = pattern.strip()
    if p.startswith("^"):
        p = p[1:]
    if p.endswith("$") and not p.endswith("\\$"):
        p = p[:-1]
    p = p.replace("(?:", "(")
    return p


def line_of(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def extract_rules(text: str, file: str) -> list[Rule]:
    rules: list[Rule] = []
    consts: dict[str, str] = {}
    for m in STRING_CONST.finditer(text):
        consts[m.group(1)] = decode_js_string(m.group(2) if m.group(2) is not None else m.group(3))

    for m in HTML_PATTERN_ATTR.finditer(text):
        # group 1/2：JSX 屬性字串（不轉義）；group 3/4：pattern={"..."} 的 JS 字串（要轉義）
        literal = next((g for g in m.groups()[:2] if g is not None), None)
        if literal is None:
            js_literal = next((g for g in m.groups()[2:4] if g is not None), None)
            literal = decode_js_string(js_literal) if js_literal is not None else None
        name = m.group(5) or ""
        if literal is None and name:
            if name not in consts:
                rules.append(Rule(file, line_of(text, m.start()), "html-pattern", "", name=name, status="UNCHECKED",
                                  detail=f"pattern={{{name}}} 的常數不在同檔，無法解析"))
                continue
            literal = consts[name]
        if literal is None:
            continue
        rules.append(Rule(file, line_of(text, m.start()), "html-pattern", literal, name=name))

    for m in ANCHORED_REGEX.finditer(text):
        src = m.group(1)
        # 找同一行的常數名（const X_PATTERN = /.../）
        line_start = text.rfind("\n", 0, m.start()) + 1
        head = text[line_start:m.start()]
        cm = re.search(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$", head)
        rules.append(Rule(file, line_of(text, m.start()), "regex-literal", src,
                          name=cm.group(1) if cm else "", flags=m.group(2)))
    return rules


def load_openapi_patterns(obj: object) -> set[str]:
    found: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                if k == "pattern" and isinstance(v, str):
                    found.add(v)
                else:
                    walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(obj)
    return found


def compile_with_node(patterns: Iterable[str]) -> dict[str, str] | None:
    """用 node 以 v flag 編譯（瀏覽器對 pattern 屬性的行為），失敗再試 u flag 回報訊息。回傳 {pattern: error 或 ''}。"""
    node = shutil.which("node")
    items = list(dict.fromkeys(patterns))
    if not node or not items:
        return None if not node else {}
    script = (
        "const ps=JSON.parse(process.argv[1]);const out={};"
        "for(const p of ps){try{new RegExp('^(?:'+p+')$','v');out[p]=''}"
        "catch(e){out[p]=String(e.message)}}"
        "process.stdout.write(JSON.stringify(out));"
    )
    try:
        proc = subprocess.run([node, "-e", script, json.dumps(items)], capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if proc.returncode != 0:
        return None
    try:
        return json.loads(proc.stdout or "{}")
    except json.JSONDecodeError:
        return None


def classify(rules: list[Rule], openapi_patterns: set[str], task_md_text: str,
             compile_results: dict[str, str] | None) -> None:
    normalized_openapi = {normalize(p): p for p in openapi_patterns}
    for r in rules:
        if r.status == "UNCHECKED" and not r.source:
            continue
        if r.kind == "html-pattern":
            if compile_results is None:
                r.status = "UNCHECKED"
                r.detail = "node 不可用，未編譯"
                continue
            err = compile_results.get(r.source)
            if err:
                r.status = "INVALID"
                r.detail = f"瀏覽器（v flag）拒絕此 pattern，會整個忽略前端驗證：{err}"
                continue
        key = normalize(r.source)
        if key in normalized_openapi and "i" in r.flags:
            r.status = "UNMATCHED"
            r.matched_openapi = normalized_openapi[key]
            r.detail = (f"文字同 openapi `{normalized_openapi[key]}` 但前端帶 i flag（不分大小寫）、server 分大小寫："
                        "大寫輸入前端放行、server 400")
        elif key in normalized_openapi:
            r.status = "MATCH"
            r.matched_openapi = normalized_openapi[key]
        elif task_md_text and (r.source in task_md_text or key in task_md_text):
            r.status = "DOCUMENTED"
            r.detail = "openapi 無同文規則，但 task.md 已列為規則來源（請確認 BE 規則欄有 file:line）"
        else:
            r.status = "UNMATCHED"
            r.detail = "openapi.json 找不到同一條規則：前端擋的和後端擋的可能不一樣，請在核心旅程矩陣填 BE 規則來源並用錯誤輸入實測"


def resolve_base(repo: Path, base: str) -> str:
    """`auto`：remote HEAD → origin/dev → origin/main，取第一個存在的；不寫死 origin/dev（daodao-worker 等 repo 預設是 main）。"""
    if base != "auto":
        return base
    candidates: list[str] = []
    try:
        head = subprocess.run(["git", "-C", str(repo), "symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"],
                              capture_output=True, text=True, check=False).stdout.strip()
        if head:
            candidates.append(head)
    except OSError:
        pass
    candidates += ["origin/dev", "origin/main"]
    for c in candidates:
        ok = subprocess.run(["git", "-C", str(repo), "rev-parse", "--verify", "-q", f"{c}^{{commit}}"],
                            capture_output=True, text=True, check=False).returncode == 0
        if ok:
            return c
    return "origin/dev"


def changed_files(repo: Path, base: str) -> list[Path]:
    base = resolve_base(repo, base)
    cmds = [
        ["git", "-C", str(repo), "diff", "--name-only", f"{base}...HEAD"],
        ["git", "-C", str(repo), "diff", "--name-only", "HEAD"],
        ["git", "-C", str(repo), "ls-files", "--others", "--exclude-standard"],
    ]
    names: list[str] = []
    for cmd in cmds:
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, check=False).stdout
        except OSError:
            out = ""
        names.extend(l.strip() for l in out.splitlines() if l.strip())
    seen: list[Path] = []
    for n in dict.fromkeys(names):
        p = repo / n
        if p.suffix in SOURCE_EXT and not EXCLUDE_PATH.search("/" + n) and p.is_file():
            seen.append(p)
    return seen


def find_openapi(repo: Path) -> Path | None:
    candidates = [
        repo / "packages" / "api" / "openapi.json",  # daodao-f2e 由 sync-openapi 同步的副本
        repo.parent / "daodao-server" / "openapi.json",  # 同一任務資料夾的 server worktree
    ]
    cur = repo
    for _ in range(4):
        cur = cur.parent
        candidates.append(cur / "projects" / "daodao-server" / "openapi.json")
    for c in candidates:
        if c.is_file():
            return c
    return None


def run(args: argparse.Namespace) -> tuple[Report, int]:
    repo = Path(args.repo).resolve()
    report = Report()
    files = [Path(f) if os.path.isabs(f) else repo / f for f in args.files] if args.files else changed_files(repo, args.base)
    report.files_scanned = len(files)

    rules: list[Rule] = []
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        rel = str(f.relative_to(repo)) if f.is_relative_to(repo) else str(f)
        rules.extend(extract_rules(text, rel))

    openapi_patterns: set[str] = set()
    openapi_path = Path(args.openapi) if args.openapi else find_openapi(repo)
    if openapi_path and openapi_path.is_file():
        try:
            openapi_patterns = load_openapi_patterns(json.loads(openapi_path.read_text(encoding="utf-8")))
            report.openapi_path = str(openapi_path)
        except (OSError, json.JSONDecodeError):
            report.openapi_path = f"{openapi_path}（讀取失敗）"
    report.openapi_pattern_count = len(openapi_patterns)

    task_md_text = ""
    if args.task_md and Path(args.task_md).is_file():
        task_md_text = Path(args.task_md).read_text(encoding="utf-8")

    html_sources = [r.source for r in rules if r.kind == "html-pattern" and r.source]
    compiled = compile_with_node(html_sources)
    report.node_available = compiled is not None
    classify(rules, openapi_patterns, task_md_text, compiled)
    report.rules = rules

    counts = report.counts()
    code = 0
    if counts.get("INVALID"):
        code = 1
    elif args.strict and counts.get("UNMATCHED"):
        code = 1
    return report, code


def render(report: Report) -> str:
    lines = [
        f"驗證規則對齊 signal：掃描 {report.files_scanned} 個變更檔，找到 {len(report.rules)} 條前端規則；"
        f"openapi pattern {report.openapi_pattern_count} 條（{report.openapi_path or '未找到 openapi.json'}）；"
        f"node {'可用' if report.node_available else '不可用（HTML pattern 未編譯）'}",
    ]
    if not report.rules:
        lines.append("（沒有手寫驗證規則）")
        return "\n".join(lines)
    lines.append("")
    lines.append("| 狀態 | 檔案:行 | 類型 | 規則 | 說明 |")
    lines.append("|---|---|---|---|---|")
    order = {"INVALID": 0, "UNMATCHED": 1, "DOCUMENTED": 2, "UNCHECKED": 3, "MATCH": 4}
    for r in sorted(report.rules, key=lambda x: (order.get(x.status, 9), x.file, x.line)):
        icon = {"INVALID": "❌", "UNMATCHED": "⚠️", "DOCUMENTED": "📝", "UNCHECKED": "❔", "MATCH": "✅"}[r.status]
        src = (r.name + " = " if r.name else "") + (r.source or "")
        detail = r.detail or (f"對到 openapi `{r.matched_openapi}`" if r.matched_openapi else "")
        lines.append(f"| {icon} {r.status} | {r.file}:{r.line} | {r.kind} | `{src}` | {detail} |")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--repo", required=True, help="前端 repo／worktree 路徑")
    ap.add_argument("--base", default="auto", help="比對基準；auto = remote HEAD → origin/dev → origin/main（預設）")
    ap.add_argument("--openapi", help="openapi.json 路徑（預設自動尋找）")
    ap.add_argument("--task-md", help="task.md 路徑；矩陣已記錄的規則視為 DOCUMENTED")
    ap.add_argument("--files", nargs="*", help="指定檔案（略過 git diff）")
    ap.add_argument("--strict", action="store_true", help="UNMATCHED 也回傳非零")
    ap.add_argument("--json", action="store_true", help="輸出 JSON")
    args = ap.parse_args(argv)
    report, code = run(args)
    if args.json:
        print(json.dumps({**asdict(report), "counts": report.counts(), "exit": code}, ensure_ascii=False, indent=2))
    else:
        print(render(report))
    return code


if __name__ == "__main__":
    sys.exit(main())
