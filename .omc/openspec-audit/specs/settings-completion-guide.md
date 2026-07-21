# settings-completion-guide
- 涉及 repo: server (user.service/controller/route), f2e (settings-list + useSettingsCompletion)
- 對應 archived change: 無（以程式碼為準）
- 總計: 4 條 requirement / 9 個 scenario | ✅3 ⚠️1 ❓0 ❌0

## Requirement: 設定頁面完整度進度顯示（完成數/4，後端計算） → ✅
證據: daodao-server:src/services/user.service.ts:2098-2114 `getSettingsSummary` 回 `{ completed, total: 4, sections }`，`completed = Object.values(sections).filter(Boolean).length`；sections 由 getSettingsSections（line 2059）算 preferences/account/publicInfo。route daodao-server:src/routes/user.routes.ts:649 + controller line 494。前端 daodao-f2e:apps/product/src/components/settings/settings-list.tsx:108 `useSettingsCompletion()` 渲染 `{data.completed}/{data.total}`（line 128-129）。
- Scenario: 完成 Onboarding 後首次進入 → ⚠️ — total 固定 4、completed 為已完成 sections 數；但 spec「基準預設為 1（onboarding）」未在 sections 反映（sections 僅 preferences/account/publicInfo 3 項，未含 onboarding 基準 1），故剛 onboarding 完成時 completed 可能為 0 而非 1。命名/基準計法與 spec 有落差。
- Scenario: 完成並儲存一個設定區塊 → ✅ — sections 對應欄位完成即 +1，completed 動態計算。
- Scenario: 完成所有設定區塊 → ✅ — 3 sections 全 true 時 completed=3；total=4（含 onboarding 基準）→ 達 4/4 需 onboarding 計入，見上述落差。

## Requirement: 動態引導標籤（未完整時提示，完成後消失） → ✅
證據: daodao-f2e:apps/product/src/components/settings/settings-list.tsx:119-123 `data.completed < data.total` 時渲染 `settings_completion_prompt` 微文案區塊。
- Scenario: 進入設定頁、資料未完整 → ✅ — completed<total 顯示提示。
- Scenario: 儲存最後一個未完成區塊（達 4/4） → ✅ — completed===total 時條件 false，標籤消失。

## Requirement: 未完成區塊視覺指示 → ✅
證據: daodao-f2e:apps/product/src/components/settings/settings-list.tsx:148-150 `isIncomplete = data.sections[item.completionKey] === false`，傳給 SettingsItemLink（line 158）渲染指示。
- Scenario: 設定區塊有必填未填 → ✅ — sections[key]===false → isIncomplete=true。
- Scenario: 區塊完成並儲存 → ✅ — sections[key]===true → isIncomplete=false，指示消失。

## Requirement: 設定區塊儲存驗證（空白必填阻擋 + 行內錯誤） → ⚠️
證據: 各 settings 表單有 schema（如 daodao-f2e:apps/product/src/components/settings/account/schema.ts）。屬 react-hook-form/zod 慣例驗證，但未逐行確認「阻止儲存 + 行內錯誤」之實作。
- Scenario: 點擊儲存時有空白必填 → ⚠️ — 推斷由 form schema 驗證擋下，未取得阻擋+行內錯誤的具體證據。
- Scenario: 所有必填已填並儲存 → ⚠️ — 儲存後 completion 由後端重算反映，合理但未逐行驗證更新觸發。
