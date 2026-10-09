#!/usr/bin/env python3
"""POC 並排比對報告產生器（dev-task skill 範本）。

用法：python3 poc-report.py --task $TASK [--config $TASK/notes/poc-compare/config.mjs]

讀 $TASK/notes/poc-compare/<checkpoint>-poc.json / -impl.json，輸出：
  report-tables.md   每檢查點一張差異表（✅ 一致 / ❌ 量到差異 / ⚠️ 量到但視覺等價或無法直接比）
  diff-items.json    所有差異列 + 影響分數（給整理差異摘要用）
  coverage.json      probe 類別涵蓋率（required / present / missing / na），pre-pr-gate 會讀
  evidence/compare-<checkpoint>.png  左 POC / 右實作 的同寬、頂端對齊合成圖（給 Google 文件與肉眼核對）
"""
import argparse, glob, json, os, re, sys
from collections import defaultdict

ap = argparse.ArgumentParser()
ap.add_argument("--task", required=True)
ap.add_argument("--config", default=None, help="config.mjs（讀 categories.required / na；沒給就用預設 9 類）")
ap.add_argument("--no-composite", action="store_true")
args = ap.parse_args()
TASK = args.task
OUT = os.path.join(TASK, "notes/poc-compare")
EVIDENCE = os.path.join(TASK, "evidence")
DEFAULT_CATEGORIES = ["shell", "card", "button", "input", "dialog", "table", "badge", "filter", "empty"]

# --- categories 設定：從 config.mjs 粗略抽（不執行 JS）---------------------------------------------
required, na, aliases = DEFAULT_CATEGORIES, {}, {}
cfg_path = args.config or os.path.join(OUT, "config.mjs")
if os.path.exists(cfg_path):
    src = open(cfg_path, encoding="utf-8").read()
    m = re.search(r"required\s*:\s*\[([^\]]*)\]", src)
    if m: required = re.findall(r'"([a-zA-Z]+)"', m.group(1)) or required
    m = re.search(r"na\s*:\s*\{([^}]*)\}", src, re.S)
    if m:
        for k, v in re.findall(r'(\w+)\s*:\s*"([^"]*)"', m.group(1)): na[k] = v
    # aliases: { shell: ["aside","nav","page"], ... } — probe key 前綴不照標準類別命名時的對應表
    m = re.search(r"aliases\s*:\s*\{(.*?)\n\s*\}", src, re.S)
    if m:
        for k, arr in re.findall(r'(\w+)\s*:\s*\[([^\]]*)\]', m.group(1)):
            for a in re.findall(r'"([^"]+)"', arr): aliases[a] = k

PROPS = [("fontSize", "字級"), ("fontWeight", "字重"), ("letterSpacing", "字距"), ("color", "字色"), ("backgroundColor", "底色"),
         ("border", "邊框"), ("borderRadius", "圓角"), ("paddingTop", "padding-top"), ("paddingRight", "padding-right"),
         ("paddingBottom", "padding-bottom"), ("paddingLeft", "padding-left"), ("gap", "gap"), ("gridTemplateColumns", "grid 欄"),
         ("minWidth", "min-width"), ("maxWidth", "max-width"), ("maxHeight", "max-height"), ("boxShadow", "陰影"), ("opacity", "透明度"),
         ("scrollable", "內捲"), ("mono", "等寬字")]
FULLWIDTH = re.compile(r"(input|textarea|select|search|\.grid$|\.list$|\.card$|\.table$|\.header$|\.row$|^row$|^card$|^grid$|^table$|^main$|^aside$|container|\.bar$|\.box$|panel|\.track$|\.seg|\.footer$|\.body$|\.nav$|\.scroll$|indicator|overlay)", re.I)
BUTTONISH = re.compile(r"btn|button|input|select|tab|pill|badge|chip|option|cancel|next|prev|draft|edit|more|close|restore|delete|save|test|add|generate|remove|copy|archive|check|lock|icon|indicator|toggle", re.I)
CONTENT_DRIVEN = re.compile(r"^(main|body|content|grid|table|modal|aside)$|container|\.(list|grid|table|body|scroll|card|panel|modal|box|section|content|row|header|head|headRow|footer)$|^(row|card|grid|body|footer|header)$|labelRow|inputRow|btnRow|titleRow", re.I)

def strip(v): return re.sub(r" <.*?>$", "", str(v)) if v is not None else None
def px(v):
    m = re.match(r"^(-?[\d.]+)px$", v or ""); return float(m.group(1)) if m else None
def norm(p, v, m):
    if v is None: return None
    if p == "scrollable": return "是" if v else "否"
    v = strip(v)
    if p == "borderRadius":
        try:
            nums = [float(x.rstrip("px")) for x in v.split()]
            if all(n >= 9000 for n in nums): return "full"
            if len(set(nums)) == 1: return f"{nums[0]:g}px"
            return " ".join("full" if n >= 9000 else f"{n:g}px" for n in nums)
        except ValueError: return v
    if p == "boxShadow": return "none" if v == "none" or re.match(r"^(rgba\(0, 0, 0, 0\) 0px 0px 0px 0px(, )?)+$", v) else v
    if p == "gap": return "0px" if v in ("normal", "normal normal") else v.split()[0]
    if p == "letterSpacing" and v == "normal": return "0px"
    if p == "minWidth" and v in ("auto", "0px"): return "0"
    if p == "mono":
        fam = (m.get("fontFamily") or "").lower(); return "是" if ("mono" in fam or "courier" in fam) else "否"
    return v
def border(m):
    w, st, c = m.get("borderTopWidth", "0px"), m.get("borderTopStyle", "none"), strip(m.get("borderTopColor", ""))
    return "none" if (w == "0px" or st == "none") else f"{w} {c}"
def rgb_tuple(v):
    m = re.match(r"^rgb\((\d+),(\d+),(\d+)\)(?:/([\d.]+))?$", v or "")
    return None if not m else (int(m.group(1)), int(m.group(2)), int(m.group(3)), float(m.group(4)) if m.group(4) else 1.0)
def color_eq(a, b):
    ta, tb = rgb_tuple(a), rgb_tuple(b)
    if ta is None or tb is None: return a == b
    return all(abs(x - y) <= 4 for x, y in zip(ta[:3], tb[:3])) and abs(ta[3] - tb[3]) < 0.02
def transparent_or_white(v):
    t = rgb_tuple(v); return t is not None and (t[3] == 0 or t[:3] == (255, 255, 255))
def border_eq(a, b):
    if a == b: return True
    if a == "none" or b == "none":
        other = b if a == "none" else a
        t = rgb_tuple(other.split(" ", 1)[1]) if " " in other else None
        return t is not None and t[3] == 0
    wa, ca = a.split(" ", 1); wb, cb = b.split(" ", 1)
    return wa == wb and color_eq(ca, cb)
def eq(p, a, b):
    if a == b: return True
    if p in ("color", "backgroundColor"): return color_eq(a, b)
    if p == "border": return border_eq(a, b)
    pa, pb = px(a), px(b)
    if pa is not None and pb is not None: return abs(pa - pb) <= 1
    if p == "gridTemplateColumns":
        ta, tb = a.split(), b.split()
        return len(ta) == len(tb) and all(px(x) is not None and px(y) is not None and abs(px(x) - px(y)) <= 1 for x, y in zip(ta, tb))
    return False

def load(cp, side):
    p = os.path.join(OUT, f"{cp}-{side}.json")
    return json.load(open(p))["probes"] if os.path.exists(p) else None

cps = sorted({os.path.basename(f).rsplit("-poc.json", 1)[0] for f in glob.glob(os.path.join(OUT, "*-poc.json")) if not os.path.basename(f).startswith("all-")})
tables, items = [], []
totals = {"probes": 0, "ok": 0, "bad": 0, "warn": 0, "missing": 0}
present = set()
for cp in cps:
    A, B = load(cp, "poc"), load(cp, "impl")
    if A is None or B is None: continue
    rows, n_ok = [], 0
    for k in A:
        pre = k.split(".")[0]; present.add(aliases.get(pre, pre))
        ma, mb = A.get(k), B.get(k)
        if ma is None and mb is None: continue
        totals["probes"] += 1
        if ma is None or mb is None:
            rows.append((k, "存在", "—" if ma is None else "有", "有" if ma is None else "—", "⚠️")); totals["missing"] += 1
            items.append({"cp": cp, "key": k, "prop": "存在", "poc": "—" if ma is None else "有", "impl": "有" if ma is None else "—", "status": "⚠️"})
            continue
        diffs = []
        is_full = bool(FULLWIDTH.search(k)); buttonish = bool(BUTTONISH.search(k))
        text_same = (ma.get("text") or "") == (mb.get("text") or "")
        has_text = (ma.get("directText") and len(ma.get("text") or "") > 1) or (mb.get("directText") and len(mb.get("text") or "") > 1)
        fixed_h = abs(ma["rect"]["h"] - mb["rect"]["h"]) <= 1; fixed_w = abs(ma["rect"]["w"] - mb["rect"]["w"]) <= 1
        for p, label in PROPS:
            if p in ("fontSize", "fontWeight", "color", "letterSpacing", "mono") and not has_text: continue
            x, y = (border(ma), border(mb)) if p == "border" else (norm(p, ma.get(p), ma), norm(p, mb.get(p), mb))
            if p == "minWidth" and not re.search(r"table|dialog|modal|select|list|card|filter|export|input", k, re.I): continue
            if p == "maxWidth" and not re.search(r"dialog|modal|panel|container|subtitle|desc|search", k, re.I): continue
            if p in ("maxHeight", "scrollable") and not re.search(r"dialog|modal|panel|body|list|menu", k, re.I): continue
            if x is None and y is None: continue
            if eq(p, x, y): continue
            if p == "gridTemplateColumns": st = "⚠️" if len(x.split()) == len(y.split()) else "❌"
            elif p in ("boxShadow", "opacity", "letterSpacing", "mono"): st = "⚠️"
            elif p == "backgroundColor" and transparent_or_white(x) and transparent_or_white(y): st = "⚠️"
            elif p in ("paddingTop", "paddingBottom") and fixed_h and buttonish: st = "⚠️"
            elif p in ("paddingLeft", "paddingRight") and fixed_w and fixed_h and buttonish and not has_text: st = "⚠️"
            elif p == "gap" and ma.get("childCount", 0) <= 1 and mb.get("childCount", 0) <= 1: st = "⚠️"
            else: st = "❌"
            diffs.append((p, label, x, y, st))
        ra, rb = ma["rect"], mb["rect"]
        if abs(ra["h"] - rb["h"]) > 1:
            content_driven = bool(CONTENT_DRIVEN.search(k)); small_text = has_text and not buttonish and abs(ra["h"] - rb["h"]) <= 4
            st = "⚠️" if (content_driven or small_text or (not text_same and not is_full)) else "❌"
            if st == "❌" or not content_driven: diffs.append(("h", "高度", f"{ra['h']:g}px", f"{rb['h']:g}px", st))
        if abs(ra["w"] - rb["w"]) > 1 and is_full: diffs.append(("w", "寬度", f"{ra['w']:g}px", f"{rb['w']:g}px", "❌"))
        if not diffs: n_ok += 1; totals["ok"] += 1
        else:
            for p, label, x, y, st in diffs:
                rows.append((k, label, x, y, st)); items.append({"cp": cp, "key": k, "prop": label, "poc": x, "impl": y, "status": st})
                totals["bad" if st == "❌" else "warn"] += 1
    lines = [f"### {cp}", "", f"probe {len([k for k in A if A[k] or B.get(k)])} 個，完全一致 {n_ok} 個。", "", "| 項目 | POC | 實作 | 狀態 |", "|---|---|---|---|"]
    ok_keys = [k for k in A if A.get(k) and B.get(k) and not any(r[0] == k for r in rows)]
    if ok_keys: lines.append(f"| ✅ 一致：{'、'.join('`'+k+'`' for k in ok_keys)} | — | — | ✅ |")
    lines += [f"| `{k}` {label} | {x} | {y} | {st} |" for k, label, x, y, st in rows]
    tables.append("\n".join(lines))

def score(i):
    p, a, b = i["prop"], i["poc"], i["impl"]
    d = abs((px(a) or 0) - (px(b) or 0))
    if p in ("存在", "grid 欄", "內捲"): return 3
    if p == "寬度": return 3 if d > 8 else 1
    if p in ("字色", "底色", "字重", "邊框", "透明度"): return 2
    if p == "字級": return 2 if d >= 2 else 1
    if p == "圓角": return 2 if d >= 4 or "full" in (a + b) else 1
    if p.startswith("padding") or p in ("gap", "高度", "max-height"): return 2 if d >= 6 else 1
    return 1
for i in items: i["score"] = score(i) if i["status"] == "❌" else 0

os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, "report-tables.md"), "w").write("\n\n".join(tables) + "\n")
json.dump({"totals": totals, "items": items}, open(os.path.join(OUT, "diff-items.json"), "w"), ensure_ascii=False, indent=1)
missing = [c for c in required if c not in present and c not in na]
coverage = {"required": required, "present": sorted(present), "na": na, "missing": missing, "checkpoints": cps}
json.dump(coverage, open(os.path.join(OUT, "coverage.json"), "w"), ensure_ascii=False, indent=1)

# --- 並排合成圖：同寬縮放、頂端對齊、上方標題列 ---------------------------------------------------------
if not args.no_composite:
    try:
        from PIL import Image, ImageDraw
        W = 640
        for cp in cps:
            a, b = os.path.join(EVIDENCE, f"poc-{cp}.png"), os.path.join(EVIDENCE, f"ui-{cp}.png")
            if not (os.path.exists(a) and os.path.exists(b)): continue
            ia, ib = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
            ia = ia.resize((W, round(ia.height * W / ia.width))); ib = ib.resize((W, round(ib.height * W / ib.width)))
            H = max(ia.height, ib.height); gap, head = 16, 36
            out = Image.new("RGB", (W * 2 + gap, H + head), "white"); d = ImageDraw.Draw(out)
            d.rectangle([0, 0, W * 2 + gap, head], fill=(15, 48, 54)); d.text((12, 10), f"POC · {cp}", fill="white"); d.text((W + gap + 12, 10), f"IMPL · {cp}", fill="white")  # PIL 預設字型無 CJK，用 ASCII
            out.paste(ia, (0, head)); out.paste(ib, (W + gap, head)); d.rectangle([W, head, W + gap, H + head], fill=(205, 235, 232))
            out.save(os.path.join(EVIDENCE, f"compare-{cp}.png"))
    except ImportError:
        print("（沒有 Pillow，略過合成圖：pip3 install pillow）", file=sys.stderr)

print(json.dumps(totals, ensure_ascii=False))
print("coverage:", "OK" if not missing else f"缺 {missing}", "| na:", na or "-")
bad = [i for i in items if i["status"] == "❌"]
groups = defaultdict(list)
for i in bad: groups[(i["cp"], i["key"])].append(i)
for (cp, k), lst in sorted(groups.items(), key=lambda kv: -sum(x["score"] for x in kv[1]))[:40]:
    print(f"[{sum(x['score'] for x in lst):>2}] {cp} · {k}: " + "; ".join(f"{x['prop']} {x['poc']}→{x['impl']}" for x in lst))
