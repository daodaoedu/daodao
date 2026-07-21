---
id: feature-weekly-report
type: Feature
status: live
doc: docs/product/weekly-report/學習週報 PRD.md
confidence: evidenced
updated: 2026-07-12
---

學習週報：每週一固定推送的個人化回顧，把使用者一週的「隱形努力」轉成「可見進度」，並附共鳴數與新追蹤者等社交反饋。

GTM 敘事角色：週報是承諾架構的核心回饋機制，主打「給中斷者返回路徑而非負罪感」，是提升完成率與回流率的排程觸點。

狀態註記：schema §4 標為 live，且程式碼有對應信號（daodao-server 內 email/notification-weekly-template.ts 週報信模板、generate-email-template-sql.ts）。惟 prd/learning-ecosystem.md 敘事段落（line 168）仍把學習週報列在「規劃中」——研判為該策略文件未回寫，此處以 schema 與程式碼信號為準採 **live**。
