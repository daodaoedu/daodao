# 以功能行為為單位的證據

一個feature的使用者入口與成功終態在既有feature map維護。驗證需實際操作該入口，同時留下動作與結果，並核對儲存或背景副作用。

| 證據範圍 | 可支持的結論 | 不可替代 |
|---|---|---|
| 瀏覽器表單／點擊、實際HTTP、結果畫面 | 此入口在此角色及版本的行為 | 未操作的其他入口、OAuth或部署 |
| Worker／queue事件與持久化讀回 | 原job處理、狀態／副作用 | 使用者能從畫面完成流程 |
| 真SMTP到本機mailbox | 此SMTP邊界收件內容與實際href | Gmail／Outlook inbox或spam placement |
| 外部邊界capture／mock | 已觀察的送出內容／呼叫 | 真SMTP、外部收件或整條產品旅程 |
| Unit／直接service測試 | 被測邏輯與已覆蓋情境 | UI、真排程觸發或端到端旅程 |

替換可以存在，但要寫清位置與結論範圍。時間加速先保留原日期與原job，再讓實worker處理；用DB setter、改delay或直接呼叫deliver，只能算fixture／後端情境，不能當自然送達的user path。

## 結果紀錄

每輪至少記：feature/entry、actors及prerequisites、source版本與環境、動作、觀察值、artifact refs、substitutions與unverified。UI用實際畫面及HTTP；worker用job ID／事件／副作用；SMTP用實收message。不要為通過格式gate填「未發請求(worker)」或只有「✅PASS」。

capture動作和結果，確認可讀的第二視角（如DB row、檔案或mailbox）。需要登入的feature，登入牆只證明入口被擋；session fixture不證明OAuth。截圖只看到終態而沒有動作來源，不能獨立證明操作成功。

agent回報、檔案mtime、cached畫面、編譯成功及格式checker都是proxy。檢查原始artifact，能重跑就用同一recipe重跑。格式checker只找缺項，不替代source及live查核。

## 維護

每個受影響feature先對source，再由單一driver owner操作已Doctor的instance。沒有source漂移也要live驗一次；不可達時保存嘗試及缺失prerequisite。失敗後重做Doctor，清掉本輪殘留但保留proof。

feature-map錯誤修文件；工具無法操作現有正常功能修harness並重新live驗；產品行為錯誤作product finding，不能改map或削弱預期掩蓋。只把有source與live證據的feature列已驗；未接driver或未達路徑留未驗。

方法來源：[pstack create-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md)、[maintain-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md)、[Prove It Works](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md)。這份規範適配現有daodao驗證基礎，不複製pstack成另一套feature-map來源。
