# showcase-search
- 涉及 repo: ai-backend (practices endpoints) / f2e (靈感 Tab UI)
- 對應 archived change: docs-product-recommend / 無明確
- 總計: 6 條 requirement / 12 個 scenario | ✅4 ⚠️4 ❌0 ❓4

## Requirement: Keyword search API → ✅
證據: ai-backend:src/services/practice/practice.py:_build_base_query — keyword 以 ILIKE pattern 比對 Practice.title、practice_action、tag(EntityTag→Tag.name)、resource(Resource.name)、checkin note
- Scenario: 關鍵字匹配標題 → ✅ — `Practice.title.ilike` + `practice_action.ilike` (practice.py 基礎查詢)
- Scenario: 關鍵字匹配標籤 → ✅ — tag_exists 子查詢 Tag.name.ilike(pattern)
- Scenario: 延遲分享 check-in 不被索引 → ✅ — checkin_exists 排除 `privacy_status==DELAYED & status==ACTIVE`（practice.py，~brewing 條件）
- Scenario: 空結果顯示引導文案 → ❓ — 後端僅回空陣列；f2e 未找到精確文案「成為第一個領航者」（showcase 元件 grep 不到該字串）

## Requirement: Search suggestions → ⚠️
證據: ai-backend GET /practices/suggestions (users.py:28) → get_search_suggestions(practice.py:73)
- Scenario: 取得搜尋建議 → ⚠️ — 後端回傳 `popular_keywords`（practice.py:125），但**spec 與 f2e 期望 `trending_keywords`**（showcase-hooks.ts:142、ShowcaseSearchBar.tsx:25）→ **欄位名不一致，前端取不到熱門關鍵字**
- Scenario: 登入者取得個人化標籤 → ✅ — interest_tags 依 profile.skills/interests + user.tag_list 匹配 Tag.name.ilike（practice.py:109-123）

## Requirement: Filter by tags → ⚠️
證據: ai-backend _apply_filters：tags → 解析 tag_ids → `EntityTag.tag_id.in_(tag_ids)`；f2e showcase-hooks.ts:99 送 `tags[]`
- Scenario: 單標籤篩選 → ✅ — in_(tag_ids) 對單標籤正確
- Scenario: 多標籤 AND 篩選 → ⚠️ — **實作為 OR 邏輯（`tag_id IN (...)` 命中任一即符合），非 spec 要求的 AND（同時含兩標籤）**

## Requirement: Filter by duration → ✅
證據: _apply_filters：`duration_days >= duration_min` 且 `<= duration_max`（practice.py）
- Scenario: 篩選 7 天實踐 → ✅ — min=max=7 → duration_days==7

## Requirement: Filter by status → ✅
證據: _apply_filters：`Practice.status == status`；另 _remove_unwanted_status 排除 draft/archived/not_started/private（practice.py）
- Scenario: 篩選進行中練習 → ✅ — status=active
- Scenario: 組合篩選 AND 邏輯 → ⚠️ — tags+status+duration 串接於同 query，但 tags 部分為 OR（見上），三維組合非完全 AND
- Scenario: 組合篩選空結果 → ❓ — 後端回空；前端引導文案未確認（同上）

## Requirement: Default sort by newest update → ✅
證據: ai-backend users.py:135 `sort_by` 預設 "newest_updated"；f2e showcase-hooks.ts:92 `sort_by ?? "newest_updated"`
- Scenario: 最新打卡排最前 → ❓ — 預設排序參數正確，但「check-in 後立即更新 practice updated_at 並置頂」需執行時驗證（依賴 updated_at 觸發）
- Scenario: 延遲分享完成後出現在最新且解鎖 → ❓ — sort 參數有，但 is_brewing 解鎖（completed 後）行為需執行驗證；未在此服務見明確 is_brewing 計算
