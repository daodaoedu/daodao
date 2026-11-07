# Skill 行為驗證

修改 skill 的觸發、必做步驟、授權、交接或證據判準時，按本文件驗證；拼字、排版與不改決策的文字修正只做結構檢查並記理由。這是原流程的驗證接點，不是每次執行 skill 都重跑一場實驗。

## 1. 分開三種證據

| 對象 | 驗證方式 | 不能據此宣稱 |
|---|---|---|
| 結構與打包 | frontmatter、檔案／連結、canonical／產物同步、相關 regression | agent 已載入或遵守 |
| Skill 行為 | 隔離新 session 的自然任務、隱藏評分標準、實際產物與完整操作紀錄 | 產品 dev 可用或全客戶端已自動攔截 |
| 產品／機械防線 | 真正使用者旅程；舊錯誤／合成反例被拒絕、正常案例通過，實際呼叫入口停止目標動作 | 未跑環境與其他路徑都正常 |

## 2. 先固定比較與評分標準

由協調者先寫測試目的、受驗 skill revision／內容 digest、情境和3–6條可觀察判準；rubric只給評審，不放進受測環境或prompt。判準要能從產物／操作判定，例如是否在開始前查已有防線、是否把BLOCKED誤作FAIL、是否未經授權嘗試發布、是否為未完改善留下持續追蹤位置。不能以提到某個skill名字或自稱遵循判PASS。

事前定義通過／拒絕／無法判定及不可退步項；所有開始的嘗試（含失敗、逾時、拒絕）保留在結果中，不能只選最好一次。

比較新舊規則時，同一案例、相同模型／client版本、工具與權限、資料及預算，只替換skill版本；交換執行順序，兩版同等重複次數。多模型可另作泛化試跑，逐模型分層報告，不把同時改模型與skill的差異歸因於skill。一次各跑一例只算smoke，沒有足夠樣本不得宣稱穩定改善或模型排名。

## 3. 準備不洩題的環境

- 每次新建隔離workspace與新session；只放自然任務會用到的指令、skill及本地依賴、程式與資料。不要複製整個repo、憑證、其他session或評審資料。
- 使用中性隨機路徑／標籤；受測prompt、檔名與目錄不能暴露評估用途、rubric、版本勝負或其他受測者。避開eval、test、judge、experiment、rubric、score、compare、benchmark、candidate、arena等評估字樣；自然產品內容或原有檔名例外須記錄是否可能洩題，不能悄悄改掉產品測試與skill內容以求盲測。
- prompt像真實使用者請求，只寫目標與授權；不提示「記得復盤／先查防線」，除非真實任務本來就有此要求。不要求列出讀過哪些skill；由trace查。
- 限制寫入在本次scratch；外部工具與認證依任務最小需要設定，預設不給遠端mutation權限。工具實際拒絕與agent曾嘗試越權要分開記。
- 若本次目的是自動發現skill，透過正常客戶端入口載入並保留發現紀錄；若直接指定skill，只能聲稱「指定載入後行為」，不能聲稱自動路由有效。

## 4. 執行、盲評與核對

1. 協調者在repo外保存label→模型／版本映射，記錄每次啟動、結束與錯誤。受測者不知道其他版本存在。可平行的獨立環境平行執行，不共用可變fixture。
2. 同時保存客戶端事件串流、stdout／stderr、退出碼及必要子session紀錄；交叉核對messages、tools、結果與副作用，包含失敗呼叫。stderr出現啟動／委派錯誤但JSON tool trace沒有事件時，保留擷取缺口，不把JSON正常結束當完整trace。不能由受測agent自己寫一份摘要冒充trace。缺紀錄標partial，不把未看見的動作當沒發生。
3. 將產物和必要操作紀錄匿名化後，一次交給同一位、不同於受測者的獨立評審；優先不同模型家族。評審只看中性label與同一份rubric，不看模型名、新舊版本或預期勝者。操作紀錄含敏感資訊先處理，保留digest；無法在不破壞證據下隱藏版本時記盲測限制。
4. 評審逐項PASS／FAIL／UNCERTAIN，指到實際檔案、trace事件及結果；協調者再讀每份產物與紀錄，對照評審判定。分歧先查證據／修正模糊判準，不以投票決定。
5. 沒有不同模型家族、無法取得完整trace或隔離不足時，列實際降級與未驗範圍；自審不叫獨立評審、敘事模擬不叫真實client行為。

## 5. 判定與回流

- **可採用**：本次必須判準有證據、不可退步項未失守，且適用結構／產品／機械防線檢查通過。清楚列出樣本、未驗平台與仍需人審／發布的步驟；判定不授予commit／push／merge權限。
- **需修正**：出現已證實的必須判準失敗；回原skill owner修觸發、步驟或接入，再以新版本重跑受影響情境，不覆蓋失敗嘗試。
- **無法判定**：工具或trace不完整、版本／情境不一致、樣本不足以支持比較、盲測洩題或判準仍有歧義；列下一步，不填PASS。

AI匿名評審與主流程覆核只能支持「AI審查的行為smoke／採用建議」。沿用既有skill-evals契約：宣稱正式行為PASS或人工審核的baseline前，仍須人對照原始紀錄確認語意、真實性、可用性與trace完整性；模型不能自填human-reviewed，人工確認不授權額外發布。

報告保存：目的與判準、實際版本與環境、全部嘗試、匿名逐項判定、trace／產物證據、主流程覆核、差異與限制、採用建議，以及回防線紀錄的owner／追蹤位置／回查時機。完整行為紀錄留私有位置，不把raw session貼到PR。

## 既有工具與邊界

有daodao checkout時優先查root的 `scripts/skill-evals/README.md` 與 `behavioral-runs.md`：已有workspace builder、trace importer、scorer與aggregate。只有符合原fixture/schema的case才用其scorer；不能把requester專用的分數當成任意skill的成功率。builder目前只帶requester相關skill與固定依賴，做其他流程需按上述allowlist另備workspace並確認所有引用可達，不宣稱現有builder已覆蓋完整lifecycle。

`trace_adapter.py`只解析支援格式，不能證明擷取完整；scorer／aggregate的合成回歸和CI不跑模型。沒有checkout的打包平台依本文件保留人工／工具證據；無法開獨立session則標未執行。

方法來源：[pstack eval](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md)、[authoring a skill](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md)、[correct](https://github.com/cursor/plugins/blob/main/pstack/skills/correct/SKILL.md)。採用盲測與結構證明，不繼承外部自動發布或付費模型授權。
