<!-- daodao-delivery:central-<N> -->

## 開發結果：<目前語意狀態>

schemaVersion: 1
templateVersion: 1

- 中央 Issue／本子 Issue：<完整 refs + URLs>
- Run ID／run URL／stage／sequence／state version：<值>
- 事件 key：<issue + run + stage + sequence>；最後更新：<ISO 時間>
- 模式／writer／reviewer：<local|auto / provider / 獨立 reviewer>
- Lease owner／fencing token：<值；未啟用則明列限制>
- 契約版本／acceptance key／spec digest／POC digest：<值>
- 需求／POC／OpenSpec 或 AC snapshot：<URLs>

| Repo | 子 Issue | Base／head SHA | PR／狀態 | 驗證與部署狀態 |
|---|---|---|---|---|
| <repo> | <URL> | <完整 SHAs> | <URL／狀態> | <結果、backend image/schema、smoke> |

- AC：<pass X/Y；fail、blocked、not-run、N/A 理由清單>
- 驗收報告／manifest／截圖與 POC 並排：<URLs、digests>
- 後端串接：<結果、request → response → 同 ID 回讀／reload 證據>
- 品質與獨立 review：<checks、finding disposition、未解 blocker>
- POC 差異：<none 或差異與具權限批准 record、適用版本>
- 人工驗收：<pending/approved/rejected、批准者／時間／GitHub record／acceptance key>
- 額度：<Claude／Codex 各自狀態、觀測時間、用盡錯誤與接手方式>
- Workers AI：<estimated/actual Neurons、unknown 則明列；budget stop／下次 reset／paid fallback 是否發生>
- 未完成／阻塞：<none 或原因、責任人、保留成果 URL、下一步>
- 回報同步：<pending/synced/report-pending；Issue/Drive 回讀確認時間>
- 下一步：<責任人、具體操作；不要把待驗收或已合併寫成 Done>

<!-- 手動使用：將 marker 的 N 換為中央 Issue 號碼，更新同一摘要。子 Issue 留言也引用同一中央編號。未來 reporter 必須驗證最新 run/state version/fencing token 並回讀；本範本尚未提供 upsert/outbox/reconciler。 -->
