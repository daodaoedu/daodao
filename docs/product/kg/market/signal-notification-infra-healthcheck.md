---
id: signal-notification-infra-healthcheck
type: Signal
confidence: evidenced
source_url: docs/product/gtm/retention-diagnosis.md（§2，daodao-server 通知系統健檢，附 file:line）
observed_date: 2026-07-10
evidences: [pain-lonely-exam-prep]
updated: 2026-07-12
---
# 通知鏈路已建、零密度空轉（產品側健檢）

2026-07-10 對 daodao-server 的通知系統實作健檢結論：回應→通知事件→email digest→週報整條鏈路皆已上線（`reaction.service.ts:111`、`notification.queue.ts:145`、`notification-weekly.worker.ts` 等），**「有人回應了你但你不知道」的假設不成立**——管子是好的，裡面沒有水。

這是一則有程式碼佐證的內部信號（故標 evidenced），佐證備考孤獨的解法在**團內密度與人肉保底回應（營運）**，不在通知工程。支持 [[pain-lonely-exam-prep]] 的解方判斷。
