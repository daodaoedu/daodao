# quick-reactions
- 涉及 repo: server (reactions API) / f2e (ReactionBar + comment-section)
- 對應 archived change: batch-reactions-api（部分）
- 總計: 5 條 requirement / 11 個 scenario | ✅9 ⚠️2 ❌0 ❓0

## Requirement: 四種反應類型 → ✅
證據: f2e PICKER_REACTIONS = ["useful","fire","touched","curious"]（reaction-type.ts:73）；server REACTION_TYPE_VALUES（types/reaction.types.ts:18）；email template touched/fire/useful/curious
- Scenario: 取得反應類型清單 → ✅ — REACTION_CONFIG 含 label+emoji+placeholder；server 計數依 REACTION_TYPE_VALUES 列出（reaction.service.ts:279）。註：f2e ReactionType 另含 encourage/sameHere（picker 子集仍為規格 4 種）

## Requirement: 每用戶每目標限單一反應（Toggle）→ ✅
證據: server upsertReaction 透過 prisma.reactions.upsert + DB unique constraint 保證唯一（reaction.service.ts:82）；target_type enum 含 'practice'（validators:10）
- Scenario: 觸發反應 → ✅ — upsert 新增記錄並回傳更新計數（service:68-99）
- Scenario: 切換至不同反應 → ✅ — upsert 同一 (user,target) 唯一鍵 → 覆蓋為新 type；f2e handleToggle else 分支呼叫 upsertReaction（use-card-reactions.ts:52）
- Scenario: 取消已選反應 → ✅ — f2e isSelected→removeReaction（use-card-reactions.ts:47-50）；server deleteMany（service:216）

## Requirement: 反應計數聚合顯示 → ✅
證據: server 聚合 countMap + latestActorName（reaction.service.ts:265-283）回傳各 type count 與 currentUserReaction；f2e reaction-aggregate-label.tsx
- Scenario: 單一用戶反應 → ✅ — count===1 顯示「{name} {label}」（reaction-aggregate-label.tsx:25-30）
- Scenario: 多用戶同類反應聚合 → ✅ — count>1 顯示「{latestActorName} 與其他 N 人…」（line 12 範例註解 + 33+）
- Scenario: 無反應 → ✅ — count===0 return null（line 20），不顯示名稱

## Requirement: 反應與留言框聯動 → ⚠️
證據: f2e comment-section.tsx:532 `t(REACTION_CONFIG[r].placeholder)`、:539 `el.focus()`；placeholder 對應 i18n（zh-TW.json:5506-5514 完全符合規格文案）
- Scenario: 點擊反應後聚焦留言框 → ✅ — el.focus() 並注入對應 placeholder 文字
- Scenario: 切換反應更新 Placeholder → ⚠️ — placeholder 文字以 newlyAdded 反應「join 串接」注入 textarea 內容（comment-section.tsx:532），非單純替換 input placeholder 屬性；切換時是否完全不殘留舊文字需執行驗證（line 676 selected 時 placeholder attr 設為空）

## Requirement: Reaction Bar 顯示位置 → ✅
證據: f2e reaction-bar.tsx 渲染 PICKER 四按鈕（onReactionClick）；reaction-section.tsx:70 onReactionClick={handleToggle}；comment-section 提供留言入口
- Scenario: 卡片上顯示 Reaction Bar → ✅ — reaction-bar 為 practice/check-in 卡片組件，含四反應按鈕；留言數計數由 comment-section/view-all-comments-button 提供
