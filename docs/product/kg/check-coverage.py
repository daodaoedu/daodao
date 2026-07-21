#!/usr/bin/env python3
"""KG 覆蓋檢查（schema.md §5）。用法：python3 check-coverage.py"""
import os, re, sys, glob

KG = os.path.dirname(os.path.abspath(__file__))

def parse_frontmatter(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not m:
        return None
    fm, cur = {}, None
    for line in m.group(1).splitlines():
        if re.match(r"^\s*-\s+", line) and cur:
            fm[cur].append(line.split("-", 1)[1].strip())
            continue
        kv = re.match(r"^([\w-]+):\s*(.*)$", line)
        if not kv:
            continue
        k, v = kv.group(1), kv.group(2).strip()
        if v.startswith("[") and v.endswith("]"):
            fm[k] = [x.strip() for x in v[1:-1].split(",") if x.strip()]
        elif v == "":
            fm[k], cur = [], k
            continue
        else:
            fm[k] = v
        cur = None
    return fm

nodes = {}
for path in glob.glob(os.path.join(KG, "*", "*.md")):
    fm = parse_frontmatter(path)
    if fm and "id" in fm:
        fm["_path"] = os.path.relpath(path, KG)
        nodes[fm["id"]] = fm

def ids(fm, key):
    v = fm.get(key, [])
    return v if isinstance(v, list) else [v]

def by_type(t):
    return [n for n in nodes.values() if n.get("type") == t]

issues = 0
def report(title, items):
    global issues
    print(f"\n## {title}")
    if not items:
        print("  (無)")
    for it in items:
        issues += 1
        print(f"  - {it}")

# 0. 斷邊：引用不存在的節點
edge_keys = ["personas", "solved_today_by", "addressed_by", "evidence", "evidences",
             "belongs_to", "pursues", "pays_at", "anchored_by", "targets", "has_pain",
             "derived_from", "serves", "reaches", "for", "monetizes", "built_on", "monetized_by"]
broken = []
for n in nodes.values():
    for k in edge_keys:
        for ref in ids(n, k):
            if re.match(r"^(persona|pain|jtbd|goal|payment|segment|competitor|channel|exam|signal|org|feature|valueprop)-", ref) and ref not in nodes:
                broken.append(f"{n['id']} .{k} → {ref}（不存在）")
report("斷邊", broken)

# 1. PainPoint 缺 addressed_by → 產品缺口
report("產品缺口：PainPoint 無 addressed_by",
       [f"{n['id']}（severity: {n.get('severity','?')}）" for n in by_type("PainPoint") if not ids(n, "addressed_by")])

# 2. Feature 未被任何 PainPoint/ValueProp 指到 → 過度設計候選
referenced = set()
for n in by_type("PainPoint"):
    referenced.update(ids(n, "addressed_by"))
for n in by_type("ValueProp"):
    referenced.update(ids(n, "built_on"))
report("過度設計候選：Feature 未被指到",
       [f"{n['id']}（status: {n.get('status','?')}）" for n in by_type("Feature") if n["id"] not in referenced])

# 3. Persona 少於 3 個 evidenced PainPoint → 研究欠債
for p in by_type("Persona"):
    cnt = sum(1 for n in by_type("PainPoint")
              if p["id"] in ids(n, "personas") and n.get("confidence") == "evidenced")
    if cnt < 3:
        report(f"研究欠債：{p['id']} 只有 {cnt} 個 evidenced PainPoint", [p["_path"]])

# 4. Organization 缺 targets → BD 降優先（excluded 豁免）
report("BD 降優先：Organization 缺 targets",
       [n["id"] for n in by_type("Organization")
        if n.get("contact_state") != "excluded" and not ids(n, "targets")])

# 5. evidenced 但沒有 evidence 邊的 PainPoint
report("標 evidenced 但無 evidence 邊的 PainPoint",
       [n["id"] for n in by_type("PainPoint") if n.get("confidence") == "evidenced" and not ids(n, "evidence")])

# 統計
print("\n## 節點統計")
from collections import Counter
for t, c in sorted(Counter(n.get("type", "?") for n in nodes.values()).items()):
    print(f"  {t}: {c}")
print(f"  總計: {len(nodes)}，發現問題: {issues}")
