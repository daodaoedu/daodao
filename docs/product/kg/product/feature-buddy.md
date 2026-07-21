---
id: feature-buddy
type: Feature
status: building
doc: docs/product/buddy/prd.md
confidence: evidenced
updated: 2026-07-12
---

Buddy：兩名使用者結為學習夥伴，互相加油、同步進度的重承諾機制，是「守望相助」與火苗設計的基礎關係。

GTM 敘事角色：Buddy 把單向的圍觀升級為雙向的責任綁定，是提升回流率、對抗「動機脆弱棄坑」的核心工具。

狀態註記：schema §4 標為 planned，但依 scripts/product_status_manifest.yml（declared: partial）與 docs/product/buddy/prd.md「目前實作狀態」段落，後端請求收發已上線（POST /practices/:id/buddy-requests、PATCH /buddy-requests/:id、GET /buddy-requests 及三種通知），而配對推薦、每日聚合通知、前端 buddy service 尚未做——故此處以實測為準改標 **building**。後續規劃見 openspec/changes/buddy-ember/。
