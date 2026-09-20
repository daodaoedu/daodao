# layout-probe 出界判定的手動回歸 fixture

`layout-probe.mjs` 需要 playwright（root repo 沒有這個依賴），所以出界判定改用這兩個 fixture 手動回歸；
純邏輯部分（`isLoginWall`、`isClippedByAncestor`）有 `../layout-probe.lib.test.ts` 的 vitest 覆蓋。

```bash
(cd "$(git rev-parse --show-toplevel)/.claude/skills/dev-task/references/__tests__/fixtures" && python3 -m http.server 8899 &)
# 在任何有 playwright 的 checkout 底下跑（例如 daodao-f2e/apps/product）
node <daodao-root>/.claude/skills/dev-task/references/layout-probe.mjs \
  --base http://localhost:8899 --routes /real-overflow.html,/clipped-overflow.html --widths 390 \
  --out /tmp/fixture-probe
```

預期：`real-overflow.html` ❌（`出界元素 1 個`）、`clipped-overflow.html` ✅。
修改前的版本兩條都會 ❌——那正是 daodao#239 在 `/practices/create` 踩到的 false positive
（89 個「出界」元素全部被水平捲動容器或頁面 wrapper 的 `overflow-hidden` 裁切，頁面 `scrollWidth === innerWidth`）。
