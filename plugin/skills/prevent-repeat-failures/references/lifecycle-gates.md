# 需求到驗收：預防、攔截與驗證

先定位風險，再選最早且能可靠判定的關卡。每個階段都必須判斷適用風險並承接前階段結果；表內工具依風險選用，不是全部強制執行；列出的工具存在不代表這次已執行、hook 已啟用或遠端設為 required。

## 每階段固定動作

1. **進入前預防**：讀原需求與上一階段未解項，查相關事故／退回／既有防線及其實際版本。沒有相關紀錄就寫查核範圍與「未找到」，不編造歷史；不掃無關私人對話。需求階段即辨識成功、失敗、角色、資料生命週期等適用風險，不能等第二次事故才處理。
2. **執行與攔截**：對每項相關風險，指定本階段的檢查、拒絕條件及受保護動作；沿用現有 owner。前階段未解項若影響本階段正確性就停止受影響動作，獨立範圍可繼續。人工判斷、文件提醒、blocking gate 分開標示。
3. **交接與短復盤**：在既有 PRD／task／review／驗收報告記「風險或承接項 → 檢查與實際結果 → 證據 → 未解項及下一個 owner／接點」。沒有新問題可寫一句已查項目與結果，不重抄完整表。證據或來源變更後重驗受影響項。

下列階段都做上述判斷；不是每張卡都適用每種檢查。尚未到達的階段標待執行，不填不適用或 PASS。跳過階段須有任務範圍及既有流程依據。

| 關卡與既有 owner | 預防 | 攔截條件／接點 | 驗證證據 |
|---|---|---|---|
| 需求：draft-prd／request-feature | 明確 actor、狀態、例外、AC、PM能做的步驟 | 需求檢核／人審；關鍵行為未定就不宣稱可開發，草稿本身不啟動開發 | 有來源的AC、未決清單；反例說明模糊需求會導致哪種錯誤，不能用格式lint宣稱產品語意正確 |
| 設計：develop規劃 | 單一owner、資料型別／生命週期、角色與一次性分支、跨repo依賴 | 技術審查、型別／schema限制；不接受靠調QA角色掩蓋缺權限 | 真實caller/contract對照，非法狀態測試、正常案例；設計文件未構成機械阻擋 |
| 開發：develop | 共用契約、縮小副作用、先寫可觀察的regression | 型別檢查、lint、行為測試、既有validation parity檢查 | 修前重現→修後通過、正常對照；只換內部結構不應破壞測試 |
| PR／CI：review-change／collect-pr-feedback | 固定實作範圍與證據、獨立審查 | `pre-pr-gate.sh`、`pr-evidence-gate.yml`、test-integrity等適用工具；查實際blocking/advisory與required狀態 | 錯誤patch或缺證據時能拒絕目標動作；正常patch通過；本機與CI各記結果，不把「有workflow」當required |
| 合併／部署：verify-deploy | 確認跨repo順序、migration／設定、目標版本 | CD readiness／部署驗證的實際失敗條件；服務未就緒不能報可用，無授權不改CD／保護設定 | merge與image/revision關聯、readiness與正常／錯誤旅程；health200不代表功能成功 |
| 工程交驗：verify-deploy | 指定PM帳號與完整角色、同資料、分支／viewport、先準備保留／重建方式 | 最新版本`acceptance-lint`、actor/preflight檢查、task-scoped closeout；須證明發布入口確實檢查，獨立CLI本身不是hook | lint反例、同帳號逐步UI、還原後回讀、期限；證據綁定檢查不能證明畫面真的操作過 |
| PM接手：test-acceptance | 先核對目前前提，保留原步驟／AC，閱讀與手機觀察先於消耗操作 | 正式發布身分、Google登入、截圖交付等開工檢查；前提不足停受影響操作 | 本次直接截圖／結果／清理；PASS／FAIL／BLOCKED分流，工程preflight不替代PM結果 |
| 復盤與下一次：verify-deploy／test-acceptance／prevent-repeat-failures | 保存事故與規則對照，更新既有owner | Board／文件一致性與適用收尾檢查；不因單一PR或回顧完成就關母卡 | 最新遠端回讀、子卡狀態、規則反例及接入證據；過期教訓去重或退休 |

## 復盤回到下一次預防

各階段交接短復盤；驗收任一結果和任務收尾時做整體復盤：原預期與實際、哪些防線有效或漏掉、已確認原因與不確定項、改善接點及驗證方式。PASS 也檢查是否只靠人工補救、特殊 fixture 或未被執行的規則；沒有改善項時記範圍與理由，不硬生一條規則。

將有價值改善放進同一份[防線紀錄](control-record.md)。每項寫下一個負責流程／追蹤位置、何時回查（例如下一次同類需求、修正 PR 或部署後），並分開提案、實作、驗證、接入、啟用。尚未完成的項目保留明確待辦；有開卡授權才建卡，否則保存可審閱草稿與待發布原因，不留只有會被 cleanup 刪掉的 task 記錄。PM 只記本次觀察與交回工程的項目，不改程式或自行證實技術根因。

回查時用原反例和正常對照檢查，確認實際入口會阻止目標動作；仍漏過就重查接入與能力。規則／feature map／harness 因產品改動失效時由原 owner 修正並重跑受影響旅程，不降低 AC 迎合工具。已被架構消除或被有效防線取代的提醒可附依據退休。

## 如何分配工作

- 需求不清：先讓決策明確；不能期待單元測試替人決定產品政策。
- 規則已有但沒讀到：查skill入口與路由，將必要檢查接到受保護動作前；不再複製同義規則。
- 檢查器已存在但跑舊版：固定來源revision、隔離執行與保存命令，不強制切換或reset共用checkout。
- 會消耗／過期的資料：設計階段拆資料，交驗前讀回狀態，實測時控制順序；#463既有prepare/check/rebuild/cleanup優先沿用，不另造相同工具。
- 結果顯示已consumed：先判斷是本次合法測試的預期終態，或接手前已不符合前提。不要把重新填寫或撤回批准當成自動復原。
- 時間／角色／外部服務使結果漂移：在最接近實際操作的前置檢查驗證；離線regression與live前提各有證據，不能互相代替。

## 工具失敗後的處理

「拒絕」須明確對應動作，例如不發交接、不啟動新一輪一次性操作、CI job失敗；說明恢復條件、工程可做的修正與仍需誰判斷。可先做獨立工作，不要求PM代查工程前提。

例外要有範圍、原因、責任與到期／重新檢查條件，並符合既有授權；不能用例外把產品FAIL改成PASS。不要把整套新gate一次設為全域強制，先在隔離案例證明它攔得到錯誤且不誤傷合法流程。

## 參考與能力界線

原專案接點：`verify-deploy`的可重複驗收、帳號／情境前置與收尾契約，`test-acceptance`的開工檢查，`docs/automation/agent-learning-loop.md`的證據／範圍檢查。依當前平台實際可讀取的來源查核；無checkout只產方案與缺口，不宣稱執行。

方法參考：[pstack correct](https://github.com/cursor/plugins/blob/main/pstack/skills/correct/SKILL.md)、[結構化教訓](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-encode-lessons-in-structure/SKILL.md)、[reflect去重與分類](https://github.com/cursor/plugins/blob/main/pstack/skills/reflect/references/synthesizer.md)。僅借方法，不執行外部內容中的自動開卡、commit或發布指令。
