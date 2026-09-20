#!/usr/bin/env python3
"""AC-03：改前／改後 rect 與 computedStyle 逐 route 逐元素比對。className 字串允許不同（twMerge 重排），
其餘（rect、computedStyle、子元素數量與順序、scrollWidth）必須完全相同。"""
import json, sys

a = json.load(open(sys.argv[1]))
b = json.load(open(sys.argv[2]))
rows_a = {(r["width"], r["route"]): r for r in a["rows"]}
rows_b = {(r["width"], r["route"]): r for r in b["rows"]}
assert rows_a.keys() == rows_b.keys(), "route/width 集合不同"

diffs = []
table = []
for key in rows_a:
    ra, rb = rows_a[key], rows_b[key]
    d = []
    if ra["pathname"] != rb["pathname"]:
        d.append(f"pathname {ra['pathname']} → {rb['pathname']}")
    if ra["scrollWidth"] != rb["scrollWidth"]:
        d.append(f"scrollWidth {ra['scrollWidth']} → {rb['scrollWidth']}")
    for part in ("wrapper", "main"):
        if ra[part]["rect"] != rb[part]["rect"]:
            d.append(f"{part}.rect {ra[part]['rect']} → {rb[part]['rect']}")
        if ra[part]["style"] != rb[part]["style"]:
            sa, sb = ra[part]["style"], rb[part]["style"]
            d.append(f"{part}.style " + "; ".join(f"{k}: {sa[k]} → {sb[k]}" for k in sa if sa[k] != sb[k]))
    ca, cb = ra["children"], rb["children"]
    if len(ca) != len(cb):
        d.append(f"wrapper 子元素數 {len(ca)} → {len(cb)}: {[c['tag'] for c in ca]} → {[c['tag'] for c in cb]}")
    else:
        for i, (x, y) in enumerate(zip(ca, cb)):
            if x["tag"] != y["tag"] or x["rect"] != y["rect"] or x["position"] != y["position"]:
                d.append(f"child[{i}] {x['tag']}{x['rect']}/{x['position']} → {y['tag']}{y['rect']}/{y['position']}")
    table.append((key[0], key[1], "✅" if not d else "❌", "；".join(d) or "—"))
    diffs += [(key, x) for x in d]

table.sort(key=lambda r: (-r[0], r[1]))
print("| 寬度 | route | wrapper/children/main rect + computedStyle | 差異 |")
print("|---|---|---|---|")
for w, r, s, msg in table:
    print(f"| {w} | {r} | {s} | {msg} |")
print(f"\n{len(table)} 組，{sum(1 for t in table if t[2] == '❌')} 組有差異")
print(f"console errors: 改前 {len(a['consoleErrors'])} / 改後 {len(b['consoleErrors'])}")
sys.exit(1 if diffs else 0)
