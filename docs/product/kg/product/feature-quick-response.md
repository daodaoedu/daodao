---
id: feature-quick-response
type: Feature
status: live
doc: docs/product/quick-response/frd.md
confidence: evidenced
updated: 2026-07-12
---

快速回應：對他人打卡送出低摩擦的預設反應（如送花），並可連動留言框，是平台最輕量的鼓勵互動。

GTM 敘事角色：快速回應是降低互動門檻的社交潤滑劑——外部圍觀者即使不留言也能給出鼓勵，滿足打卡者「學習被看見」的需求，是回應率這個生態指標的第一道抓手（見 prd/learning-ecosystem.md「放大」章節）。狀態依 scripts/product_status_manifest.yml 標記為 shipped（實作於 daodao-server/src/routes/reaction.routes.ts 與 daodao-f2e/packages/api/src/services/reaction.ts），與 schema §4 一致。
