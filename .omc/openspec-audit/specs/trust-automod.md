# trust-automod
- 涉及 repo: admin-ui (UI) / daodao-server (API + worker) / daodao-storage (migration)
- 對應 archived change: 無直接對應（新功能，migration 044）
- 總計: 17 條 requirement / 36 個 scenario | ✅5 ⚠️9 ❌2 ❓1

> 重大發現：migration `044_create_trust_automod_tables.sql` 建立 `trust_level_configs` 時用的是**獨立欄位**（read_count/post_count/days_visited/likes_given/likes_received），但 server service 與 trust-level worker 全部查詢 **`promotion_criteria` jsonb 欄位**。全 storage repo grep 不到 `promotion_criteria` 欄位定義 → 晉升條件讀寫/評估在執行時會失敗。標 ⚠️ 的等級設定相關 requirement 多受此影響。
> 第二重大發現：AutoMod 規則、詞庫、ML 偵測、使用者名稱黑名單、社群檢舉門檻全部只有「管理員 CRUD 設定」，**沒有任何 enforcement** — grep 不到內容建立/改名流程呼叫這些規則（無 moderateContent/checkContent/automod_rules 在 content 流程的引用）。處置動作（靜默刪除/警告/禁言/自動隱藏）皆未實際套用。

## Requirement: 信任等級定義 → ⚠️
證據: daodao-storage:migrate/sql/044_create_trust_automod_tables.sql:18-58 — trust_level_configs 4 級種子(0新手/1基本/2成員/3常客)；user_trust_levels.level DEFAULT 0
- Scenario: 新使用者註冊→Lv0 → ⚠️ — user_trust_levels DEFAULT 0 存在，但未見註冊流程主動 INSERT 一筆 user_trust_levels；靠 default(查無記錄視為 0) 而非註冊時建立
- Scenario: 檢視等級定義 → ✅ — admin-ui:src/pages/TrustLevelsPage.tsx 顯示四等級；server getTrustConfig 回傳

## Requirement: 等級晉升條件設定 → ⚠️
證據: daodao-server:src/services/admin-trust.service.ts:45-78 updateTrustConfig 寫 promotion_criteria jsonb
- Scenario: 設定 Lv1 晉升條件 → ⚠️ — service 寫/讀 `promotion_criteria` jsonb，但 migration 044 無此欄位（為獨立欄位），schema 不符，執行會錯
- Scenario: 停用特定條件 → ❌ — 無「個別啟用/停用單一指標」機制；criteria 僅數值，無 enabled flag

## Requirement: 自動晉升評估 → ⚠️
證據: daodao-server:src/queues/trust-level.worker.ts meetsPromotionCriteria + 每用戶評估升級
- Scenario: 使用者達到 Lv1 條件 → ⚠️ — worker 邏輯存在（從高到低找滿足等級），但讀 config.promotion_criteria，受同一 schema 不符風險
- Scenario: 僅部分達標不晉升 → ⚠️ — meetsPromotionCriteria 要求全部指標達標(AND)，邏輯正確，但同樣依賴不存在的欄位

## Requirement: 自動降級機制 → ⚠️
證據: daodao-server:src/queues/trust-level.worker.ts:GRACE_PERIOD_DAYS=14, isInGracePeriod
- Scenario: 活動低於門檻觸發降級 → ⚠️ — worker 會直接把等級設為 targetLevel(可能降級)，但**沒有 spec 描述的「14 天降級寬限期標記」流程**；grace period 是用 updated_at 判定「升降後 14 天不再調整」，與 spec「進入寬限期、寬限期內恢復可取消」語意不同
- Scenario: 寬限期內恢復活動取消降級 → ❌ — 無「標記降級待定 → 寬限內恢復則取消」邏輯；worker 直接升降，無 pending 降級狀態
- Scenario: 寬限期屆滿降級 → ⚠️ — 直接降級存在，但非經由 spec 的寬限到期流程；migration 有 grace_period_until 欄位但 worker 未使用它

## Requirement: 手動覆寫信任等級 → ⚠️
證據: daodao-server:src/services/admin-trust.service.ts:overrideUserTrustLevel 寫 history reason='manual'；route PATCH /users/:userId/trust-level (requireSuperAdmin)
- Scenario: 手動提升等級記錄管理員/時間/原因 → ⚠️ — 寫入 trust_level_history(from/to/reason='manual', created_at)，但**未記錄操作者帳號**，也未接收/儲存「覆寫原因」文字（history.reason 僅 'auto'/'manual' enum，非自由文字）
- Scenario: 手動鎖定不受自動降級 → ❌ — 無「手動鎖定 flag」；worker 不檢查是否手動覆寫，下次評估仍會自動升降覆蓋手動結果

## Requirement: 等級對應功能權限設定 → ⚠️
證據: daodao-storage:044:trust_level_configs.unlocked_abilities TEXT[] 種子(limited_posts/invite_others/recategorize...)
- Scenario: 檢視等級功能對照表(矩陣) → ⚠️ — unlocked_abilities 可讀，但未確認 admin-ui 以矩陣表格呈現功能開關（TrustLevelsPage 主要顯示分布/歷史）
- Scenario: 調整 Lv1 功能後生效 → ⚠️ — updateTrustConfig 可寫 unlockedAbilities，但**無任何地方消費 unlocked_abilities 來實際 gate 功能**（無 enforcement）

## Requirement: 信任等級分佈與異動紀錄 → ✅
證據: daodao-server:src/services/admin-trust.service.ts:getTrustDistribution(各級 user_count) + getTrustHistory(JOIN users, ORDER created_at DESC)；admin-ui:src/pages/TrustLevelsPage.tsx:30,104 顯示 distribution + recent promotions/demotions
- Scenario: 檢視等級分佈 → ⚠️ — 後端回傳 level/name/userCount；圖表呈現(長條/圓餅)未在 page grep 到明確 chart 元件，僅 distribution.map
- Scenario: 檢視近期異動(時間倒序) → ✅ — getTrustHistory ORDER BY created_at DESC，含 userName/fromLevel/toLevel/createdAt

## Requirement: 自訂群組與權限覆寫 → ⚠️
證據: daodao-server:src/services/admin-trust.service.ts:createUserGroup/listUserGroups/group_permissions；routes /user-groups CRUD
- Scenario: 建立自訂群組賦予權限 → ⚠️ — createUserGroup + group_permissions 寫入存在，但**無「使用者加入群組後實際獲得權限」的 enforcement**（無權限合併計算消費點）
- Scenario: 群組權限與等級權限合併取較寬鬆 → ❌ — grep 不到任何權限合併/取聯集的計算邏輯

## Requirement: 關鍵字過濾管理 → ✅
證據: daodao-server:src/services/admin-automod.service.ts:listRules/createRule/updateRule/deleteRule；automod_rules.match_mode CHECK IN (exact,wildcard,contains)
- Scenario: 新增過濾關鍵字「廣告*」 → ⚠️ — 可儲存 pattern+match_mode，但**無實際比對引擎套用 prefix/suffix/contains 到內容**（純設定）
- Scenario: 使用包含匹配 → ⚠️ — 同上，contains 可存但無 enforcement
- Scenario: 編輯現有關鍵字 → ✅ — updateRule 支援改 pattern/matchMode

## Requirement: 預設敏感詞庫 → ✅
證據: daodao-storage:044 automod_word_lists 種子(不雅用語/色情內容/垃圾訊息, is_enabled FALSE)；service listWordLists/toggleWordList
- Scenario: 啟用預設詞庫 → ⚠️ — toggleWordList 切 is_enabled，但詞庫納入審核「範圍」無 enforcement
- Scenario: 停用預設詞庫 → ⚠️ — 同上，僅 toggle 狀態

## Requirement: 違規動作設定 → ⚠️
證據: daodao-storage:044 automod_rules.action CHECK IN(delete,warn,timeout)+timeout_minutes；service createRule 接收 action
- Scenario: 設定靜默刪除 → ⚠️ — 可設 action='delete'，但無「匹配後自動移除且不通知」執行
- Scenario: 設定自動禁言 30 分 → ⚠️ — 可設 timeout_minutes，但無自動禁言執行/禁言通知

## Requirement: ML 垃圾訊息偵測 → ⚠️
證據: daodao-server:src/services/admin-automod.service.ts:getSpamDetectionStatus/toggleSpamDetection(community_mod_config spam_detection_enabled)
- Scenario: 啟用 ML 偵測 → ❌ — 僅 toggle 設定旗標，**無任何 ML 模型/掃描實作**
- Scenario: 停用 ML 偵測 → ⚠️ — toggle 旗標存在，但因無掃描實作，停用無實質作用

## Requirement: 使用者名稱黑名單 → ⚠️
證據: daodao-server:src/services/admin-automod.service.ts:listUsernameBlocklist/addBlockedUsername/removeBlockedUsername；username_blocklist 表
- Scenario: 新增黑名單詞彙 → ⚠️ — 可新增至表，但**註冊/改名流程未檢查 username_blocklist**（無 enforcement，grep 不到註冊處引用）
- Scenario: 既有使用者名稱命中黑名單列出 → ❌ — 無「列出受影響既有使用者」功能

## Requirement: 審核動作日誌 → ⚠️
證據: daodao-server:src/services/admin-automod.service.ts:getActionLog(automod_action_log JOIN users ORDER created_at DESC)；admin-ui AutoModPage useAutoModLog
- Scenario: 檢視審核日誌 → ⚠️ — 讀取/顯示日誌存在，但因無 enforcement，automod_action_log **不會被寫入**（無寫入點 grep 結果）
- Scenario: 篩選特定規則(ML)日誌 → ❓ — getActionLog 只有 limit/offset，未見 rule_name/類型篩選參數

## Requirement: 社群自治檢舉機制 → ⚠️
證據: daodao-server:src/services/admin-automod.service.ts:getCommunityModConfig/updateCommunityModConfig(flag_threshold)；content_flags 表
- Scenario: 達到檢舉門檻自動隱藏 → ❌ — 無「N 位 Lv2+ 檢舉 → 自動隱藏 + 通知發文者」邏輯；content_flags 無自動累積/觸發隱藏的寫入流程
- Scenario: 低信任等級檢舉不計入 → ❌ — 無檢舉計數時的信任等級過濾邏輯
- Scenario: 修改檢舉門檻 → ✅ — updateCommunityModConfig 寫 flag_threshold（但因無自動隱藏，門檻無消費點）

## Requirement: 檢舉待審佇列 → ⚠️
證據: daodao-server:src/services/admin-automod.service.ts:getFlagQueue(content_flags WHERE pending ORDER priority,flag_count DESC)；processFlagAction
- Scenario: 檢視檢舉佇列(優先分數排序) → ⚠️ — 有 ORDER BY priority+flag_count，但 priority 是固定 enum 欄位，**非 spec 要求的「基於檢舉人數+檢舉者信任等級+違規嚴重度」動態加權分數**
- Scenario: 高等級使用者檢舉優先度較高 → ❌ — 無依檢舉者信任等級加權計算；content_flags 不記錄各檢舉者等級
