# 發布、重試與回復

發布 runner 由 #536 提供；查該卡已合併版本及其 README／help，不依賴私人絕對路徑或猜旗標。實際整合可用前本模式不執行部署。

1. 確認有效授權覆蓋 content commit、push、觸發、目標環境；不擴到 production、社群送出或無關 product。
2. 驗證清楚的 content SHA、已核准 frontend SHA、私人核准證據與可信任前次發布 baseline，呼叫同一 validator。缺一語或 stale digest 在發布前停止。
3. 呼叫既有 runner，保存工作 ID／artifact digest／雙 SHA。等待同一個確實仍在跑的 handle；timeout 先查狀態，不重送相同 mutation。
4. 抓取、格式、build 或部署失敗立即停止；不能以空站或 force bypass 覆蓋可用版本。已 commit 不代表已部署，重試不增加重複文章。
5. 回讀目標環境兩語文章、圖片、metadata 與部署版本；可用但版本錯也算失敗。併發舊工作不得覆蓋新版本，使用 runner 的序列化／版本檢查，勿自行另造 lock。
6. 已授權回復時透過 runner 恢復上一組受驗 frontend/content 配對，重做回讀。沒有回復權限或 runner 不支援時交付確切狀態與恢復條件，不擅改線上內容。

報告格式：各階段 status（not-run/running/pass/fail/blocked）、實際版本、工作 URL、錯誤、仍可讀的上一版本。失敗不是 published；未知不是 pass。
