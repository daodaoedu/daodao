# 近期驗收受阻與防錯機制整理（2026-11-07）

## 範圍與證據界線

- 事件範圍：2026-10-22～2026-11-07，本輪追蹤的 #357、#358、#463、#471，另以 #276、#345、#473、#475 區分其他失敗類型；不是整個專案所有歷史事故的統計。
- 最後查核：2026-11-07 16:28（Asia/Taipei）。已讀取八卡當時的 Issue、完整留言及 Planning #10 狀態，並確認相關流程 PR 的合併狀態。
- 本報告沒有重跑產品 UI、API、資料還原或寄信。下文「已處理」指有後續工程紀錄，不把工程宣告改寫成這次新驗證。
- 八卡當時均 OPEN／Acceptance，最新交接後尚無正式 PM PASS。工程同帳號 dev-login、部署成功、工具 READY 與正式 PM Google／畫面驗收分開陳述。
- 以下三個層次分開：**預防**是較早設計掉錯誤；**攔截**是錯誤前提出現時實際停止流程；**驗證**是證明行為或攔截器有效的執行證據。

## 先分清事件性質

| 卡片 | 原事件類型 | 可確認的事實 | 不能推導的結論 |
|---|---|---|---|
| #358 | PM 明確 BLOCKED | App 入口不可操作，並要求 PM 提供 API／regression 證據；當次未觀察到範圍內產品失敗 | 網頁存檔 PASS 不能代替原生 App；後來排除 App 範圍不代表 App 已正式 PM 驗收 |
| #463 | PM 資料前提受阻 | 誤批准後邀請／申請被消耗，並嘗試新增 owner 復原；取消分支失去基準 | 最後 owner 無法移除不是此次已證實的產品 bug |
| #471 | PM 前提與證據交付受阻 | 問卷一次性狀態已消耗；手機尺寸未定；必要截圖無法附上 | 其他畫面通過不等於手機、再次提交或報告交付通過 |
| #276 | PM 正式 FAIL，後續更正交接 | PM 看到站內確認，舊步驟承諾原生提醒；正式架構允許依導航類型提示 | 不能刪去歷史 FAIL，也不能把更正文字直接當 PM PASS |
| #357 | 工程交接缺口 | 舊邀請與指定 PM 同帳號／同資料未重新確認，11/04 查核明載尚未交接就緒 | 不是一筆新的 PM FAIL，也不能只因在 Acceptance 就認定資料可用 |
| #345 | 工程前提受阻與產品情境缺陷 | 先有組織停權 403；後確認多組織取 first org 而非場次 org | 單組織／另一工程帳號通過不能證明原多組織旅程通過 |
| #473 | PM 錯誤通報／dev 服務配置產品故障 | 實際摘要回「AI 服務尚未設定」，後查為服務間 URL／認證缺失 | Gemini 連線測試或健康檢查成功不能證明摘要完整生成與保存 |
| #475 | 工程 dev 冒煙 FAIL | 390px 跨日日期與時間沒有符合 AC-003 的同行版面 | 不是 PM 已退回；本機修正通過不能推導 dev 已修復 |

## 原因、責任與多階段防線

### 1. 驗收契約要求了 PM 做不到或原需求未承諾的事

**事件與證據**：#358 的 App／API／regression 項目被交給 PM；#276 將瀏覽器上一頁一律寫成原生提醒，且把步驟 11 混稱 AC-11。

- 原始紀錄：[358 PM BLOCKED](https://github.com/daodaoedu/daodao/issues/358#issuecomment-6341485245)、[276 PM FAIL](https://github.com/daodaoedu/daodao/issues/276#issuecomment-6700219679)。
- 工程責任：保留原 AC，明分 PM 畫面操作、工程證據與當時不適用範圍；核對正式需求對提示行為的要求，不把實作外觀變成未確認的需求。
- **最早預防：需求／驗收設計**。確認可操作的平台、帳號、可見結果；對應原 AC 而不是用步驟號重編需求。
- **實際攔截：交接文字 lint＋規格對照**。`acceptance-lint` 可拒絕工程專用帳號或 API／測試混入 PM 步驟；不能機械判斷「原生提醒」是否誤述需求，該部分須做來源對照。
- **驗證**：工程依最終草稿，以指定同帳號、同資料逐步觀察；正式 PM 另依更新規格重驗。
- 已做：[358 更新交接](https://github.com/daodaoedu/daodao/issues/358#issuecomment-6703661922)只交網頁範圍；[276 更正交接](https://github.com/daodaoedu/daodao/issues/276#issuecomment-6701979592)保留歷史 FAIL、改成符合導航契約的預期並重播。
- 剩餘：兩卡仍待正式 PM 結果；新規則應補「需求與步驟映射」的例子，不重複新增已有的帳號／API 步驟 lint。

### 2. 一次性資料在必要觀察完成前被消耗

**事件與證據**：#463 的取消分支被誤批准；#471 已提交問卷後才需要手機與重測觀察。

- 原始紀錄：[463 PM 前提受阻](https://github.com/daodaoedu/daodao/issues/463#issuecomment-6700995791)、[471 PM 前提受阻](https://github.com/daodaoedu/daodao/issues/471#issuecomment-6673331008)。
- 工程責任：在驗收設計時列初始狀態、會消耗資料的操作、相依步驟、獨立資料與重建責任；PM 操作前按原分支確認前提，誤消耗即停止，不自行新增 owner 修補狀態。
- **最早預防：測試資料與流程設計**。取消與批准用不同資料；手機、閱讀、必填、取消先做；成功提交／批准排在使用該前提的觀察之後。不可安全重設時，工程與 PM 用不同具名資料。
- **實際攔截：資料狀態檢查**。#463 `check` 已核對角色、組織、成員、pending 邀請、待批准申請與有效期限；不滿足不能 READY。問卷目前沒有對等的專用一次性狀態 adapter。
- **驗證**：拿已批准／已填答的歷史錯誤案例證明會被擋；拿正確待處理狀態證明可繼續；重播後還原並回讀，不憑「已重建」文字放行。
- 已做：[463 受控還原](https://github.com/daodaoedu/daodao/issues/463#issuecomment-6702016752)、[471 新交接與還原證據](https://github.com/daodaoedu/daodao/issues/471#issuecomment-6685747869)；[PR #479](https://github.com/daodaoedu/daodao/pull/479)提供獨立 generation、cancel／approve、`prepare/check/rebuild/cleanup`。
- 剩餘：#463 工具是專用工具；將消耗型契約推廣到 #471 是具體候選。需接入交驗判定，缺有效報告、帳號／資料不符或非 READY 應停止，而不只是多存一份 JSON。
- 邊界：PM 正常提交後變為 consumed 是預期終態；不得自動覆寫 PM 答案、倒改歷史交驗結果，或把 consumed 當產品 FAIL。#463 歷史受控資料還原也不是日後任意清空 accepted／approved 欄位的通用做法。

### 3. 手機環境未定，以及執行了過時的檢查器

**事件與證據**：#471 的 PM 報告明載未給 viewport；後續專案紀錄另指出共享 root 曾使用未含手機尺寸規則的舊 linter。

- 原始紀錄：[471 手機項未完成](https://github.com/daodaoedu/daodao/issues/471#issuecomment-6673331008)；版本教訓見[可重複驗收：最新 gate](../../plugin/docs/repeatable-acceptance.md#使用最新交接檢查)。
- 工程責任：在對應手機編號步驟寫完整寬×高 CSS px；來源未定時依既有規則實跑預設尺寸後補入，不把選尺寸的工程準備丟給 PM。
- **最早預防：驗收條件整理／版面實作**。手機尺寸、必要頁面、可見預期在凍結草稿前確定。
- **實際攔截：最新 `acceptance-lint`**。已有 `mobile-viewport-missing`；尺寸須在同一步，不能借桌面、別步或工程報告的數字。發布前 fetch main，在隔離 checkout 跑該版 gate 並保存 revision；fetch／檢查失敗不回退舊版放行。
- **驗證**：舊缺尺寸文字須失敗，補齊同一步尺寸才通過；畫面實跑另記實際 viewport，lint 不證明瀏覽器真的已縮放。
- 已做：[471 更新交接](https://github.com/daodaoedu/daodao/issues/471#issuecomment-6685747869)補兩頁手機尺寸與同帳號重播；最新版規則已有上述兩道要求。
- 剩餘：不是再新增一條手機提醒；應確認呼叫的是最新檢查器，且保存執行證據。

### 4. 必要截圖無法交付

**事件與證據**：[471 PM 回報](https://github.com/daodaoedu/daodao/issues/471#issuecomment-6673331008)明載當時無法附上必要截圖，因此沒有發布報告或移卡。

- 操作端責任：使用正式驗收客戶端，在第一個產品測試前確認所需截圖能進入報告；工程提供的圖片不能證明 PM 的交付路徑現在已可用。
- **最早預防：驗收環境準備**。先檢查可操作瀏覽器、正確身份與附件能力，再消耗一次性資料。
- **實際攔截：test-acceptance 開工檢查／證據檢查**。必要圖片不可交付時，不發布缺圖 PASS，不因登入或工具問題判產品 FAIL。
- **驗證**：在本次實際客戶端取得所需畫面、貼入可發布留言，發布後核對顯示正常；不能只用「工具可用」作證。
- 已做：現行 [test-acceptance](../../plugin/skills/test-acceptance/SKILL.md)已把直接截圖交付與發布確認列入流程。
- 剩餘：截至本報告沒有看到該原 PM 環境的更新後圖片交付實測／正式報告；**不能把這項列成已證實修復**。資料與尺寸處理完成，不自動解除這個獨立證據缺口。

### 5. 同帳號、角色與組織情境未查到底

**事件與證據**：#357 舊邀請與同 PM 前提尚未重驗；#345 先遇停權組織，之後發現多組織取錯範本來源。

- 原始紀錄：[357 明列待完成](https://github.com/daodaoedu/daodao/issues/357#issuecomment-6632386819)、[345 停權前提](https://github.com/daodaoedu/daodao/issues/345#issuecomment-6554924062)、[345 多組織診斷](https://github.com/daodaoedu/daodao/issues/345#issuecomment-6577631704)。
- 工程責任：需求／權限設計先定真實角色與範圍；不能因另一帳號或單組織可用就代替原情境，亦不改角色來湊測試前提。
- **最早預防：權限契約與實作設計**。資料以場次實際組織為準；避免 first organization 代替當前目的地；帳號 registry 只是預期名單，不是即時權限證據。
- **實際攔截：actor preflight＋情境重播**。新工具核對 external ID、email、完整角色集合、指定組織與已加入場次；缺欄位、讀取失敗或不符即 BLOCKED。owner／coach 權限仍須另證。
- **驗證**：錯 UUID／錯角色／停權／不在場次須被擋；多組織需實際從正確場次操作並讀回；指定 PM 完整 UI 步驟另外重播。
- 已做：[357 專用資料新交接](https://github.com/daodaoedu/daodao/issues/357#issuecomment-6703751282)、[345 修復與同 PM 證據](https://github.com/daodaoedu/daodao/issues/345#issuecomment-6702110660)；[PR #484](https://github.com/daodaoedu/daodao/pull/484)已合併帳號與情境唯讀檢查。
- 剩餘：actor preflight 是人工執行步驟，**不是已強制的 hook**；PASS 不證明 Google 登入、帳號啟用、owner／coach 或正式 PM 操作。不得重複建一個只比帳號名稱的檢查器。

### 6. 服務健康／部署成功與真實業務旅程之間有缺口

**背景事件，不計成 PM BLOCKED**：#473 的 AI 連線測試成功，實際摘要仍不能產生；#475 本機通過後，dev 390px 跨日版面仍違反 AC。

- 原始紀錄：[473 PM 錯誤通報](https://github.com/daodaoedu/daodao/issues/473#issuecomment-6663809371)、[475 工程 dev FAIL](https://github.com/daodaoedu/daodao/issues/475#issuecomment-6702231030)。
- 工程責任：跨服務 URL／認證與真實資料形狀在設計、CI 契約測試、部署後業務冒煙逐層核對；視覺需使用最可能暴露問題的原 AC 情境與尺寸。
- **最早預防：服務契約／UI 情境設計**。把「可連線」與「可生成、完整、可保存」分開；把跨日與窄螢幕放進驗收例子。
- **實際攔截：部署後原通報路徑＋正常／錯誤路徑**。readiness 不替代真摘要；本機候選不替代 dev 修正。冒煙違反 AC 時不得交驗。
- **驗證**：真實生成後刷新仍可讀，模型失敗不覆寫 current；實際 dev 窄螢幕同行／不溢出。故障注入與真供應商呼叫分別記錄。
- 已做：[473 新交接](https://github.com/daodaoedu/daodao/issues/473#issuecomment-6702806232)記錄 dev 配置與完整性修正；[475 修正後交接](https://github.com/daodaoedu/daodao/issues/475#issuecomment-6702764726)保留舊 FAIL 並附修正版 dev 重驗。
- 剩餘：兩卡正式 PM 結果仍待完成；不把 provider 健康、CI 綠或 HTTP 200 合併成整體驗收通過。

## 已有機制與真正要補的部分

| 機制 | 截至本報告的已確認狀態 | 能攔什麼／不能證明什麼 |
|---|---|---|
| `acceptance-lint`＋最新 gate revision | 已在目前 main；有手機尺寸、帳號與工程步驟分流檢查 | 攔可辨識的文字缺項；不證明資料或 UI 可用 |
| [PR #478](https://github.com/daodaoedu/daodao/pull/478) closeout | 2026-11-07 已合併 | 檢查同草稿、重播、還原、保留與交接證據綁定；不是每個客戶端都已信任並自動執行的證據 |
| [PR #479](https://github.com/daodaoedu/daodao/pull/479) fixture lifecycle | 2026-11-07 已合併；[後續真收信→READY 證據](https://github.com/daodaoedu/daodao/issues/463#issuecomment-6702756134)已補 | #463 專用取消／批准獨立資料、狀態與期限檢查；不代表所有問卷／邀請類型都已涵蓋 |
| [PR #484](https://github.com/daodaoedu/daodao/pull/484) actor preflight | 2026-11-07 已合併 | 精確身份、角色集合及指定情境；不證明 Google、active、owner／coach 或畫面可用 |
| [可重複驗收](../../plugin/docs/repeatable-acceptance.md) | main 已有 | 明訂分支、獨立資料、消耗順序、尺寸與重設證據；文字存在不等於執行被強制 |

優先候選為 **#471 問卷一次性狀態 adapter 與交驗攔截點**：沿用既有 preflight／closeout，讓錯帳號、錯問卷、已提交、不可填答或缺必要證據在新一輪交驗前失敗；以真實受阻案例做負向測試。純閱讀卡不強制套一次性重設欄位。

其餘需要判斷的教訓，例如需求是否錯誤承諾原生提醒、操作者是否應被要求登入另一人的 PM 專用帳號，應在既有入口給明確例子與責任界線；不宣稱 schema 能自行理解所有對話角色。

## 執行此回顧時應保留的界線

- 修復資料前提、工程重播通過、發布交接與 PM 正式 PASS 是四個不同事實。
- 單一歷史事件保留來源，不虛報為重複類；明確風險可在需求／設計時先預防，不必等第二次事故。跨事件反覆出現的同類錯誤優先共用機制；已有有效機制則查執行／版本，不再疊加同義規則。
- 每個新增攔截器要列出最早適用階段、實際呼叫點、攔截結果、原錯誤會失敗的證據、修正後可通過與不適用案例。
- 未執行測試、尚未接上執行入口、未確認客戶端 hook 信任或只寫了建議，一律明示；不要把新 skill 本身當作這些攔截器都已落地。
