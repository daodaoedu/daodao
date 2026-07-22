# Tasks: 今日靈感卡（每日書摘分享）

> 每個 task 控制在 2–4 小時；依 system-map SOP 順序執行（storage → server → f2e / admin-ui 可平行）。

## T1. [storage] 新增 `daily_inspirations` 表 + seed（~2h）

- `migrate/sql/{下一序號}_add_daily_inspirations.sql`：建表 + index + `suggested_template_id` FK（見 design 1.1；FK 型別以 storage 的 `practice_templates.id` 現況為準）
- Seed 40 條素材（design 附錄 A；**匯入前完成人工校對**：書名譯名、內文正確性；`suggested_template_id` 留空，上線後由營運配對）
- 同步回寫 `schema/` 對應檔

**驗收**
- [ ] `make migrate-sql-dev` 成功，dev DB 可查到 40 筆 active 素材
- [ ] `schema/` 與 migration 一致（不觸發 schema-sync 白名單擴張）
- [ ] 未修改任何既有 migration

## T2. [server] Prisma 同步（~1h，可併入 T3）

- `prisma/schema.prisma` 新增 model → `pnpm run prisma:generate`

**驗收**
- [ ] `pnpm run schema:drift` 通過
- [ ] `pnpm run typecheck` 通過

## T3. [server] Public API `GET /api/v1/inspirations/today`（~3h）

- `inspiration.service.ts`（factory pattern）：決定性輪播（Asia/Taipei dayIndex % pool.length）+ Redis cache（TTL 至台北午夜）
- response 含 `suggestedTemplate: { id, title } | null`（join `practice_templates`）
- routes / controller / Zod validator + `registry.registerPath`
- `src/app.ts` 掛載

**驗收**
- [ ] 單元測試：同一天回傳固定同一則；跨日切換；pool 為空回 `inspiration: null`；停用素材不入 pool；配對模板已刪除/不存在時 `suggestedTemplate: null` 不噴錯
- [ ] `pnpm run openapi:generate` 產出包含新端點
- [ ] lint + typecheck + test 通過

## T4. [server] Admin CRUD `/api/v1/admin/inspirations`（~3h）

- list（theme / isActive 篩選 + 分頁）、create、update（含 `suggestedTemplateId` 配對）、delete
- 供配對下拉用的 practice templates 簡易 list（若 admin 已有現成端點則沿用）
- 掛既有 admin middleware；寫入操作清 Redis cache

**驗收**
- [ ] 非 admin 角色存取回 403
- [ ] CRUD 整合測試通過；update `is_active` 後 today API 立即反映（cache 已清）
- [ ] 可設定/清除模板配對，today API 回應同步反映

## T5. [f2e] API service + hooks（~2h）

- 對 server 分支手動 `gen:types`（types.ts 為生成物禁手改）
- `services/inspiration.ts` + `inspiration-hooks.ts`（`useTodayInspiration`）+ barrel 匯出

**驗收**
- [ ] hook 遵循檔內順序慣例；錯誤處理走 `response.error` 後 `return`
- [ ] `pnpm run lint` + `pnpm run typecheck` 通過

## T6. [f2e] InspirationCard + 首頁整合 + 轉換追蹤（~4h）

- `components/showcase/inspiration-card.tsx`（引號視覺參考 resonance-carousel）+ i18n keys
- 首頁插入於 ResonanceCarousel 與 feed 之間；`inspiration: null` 或請求失敗時不佔位
- CTA（design 3.3）：有模板→「用這個模板開始：{{title}}」深連結預填 + 溯源參數；無模板→「建立實踐」→ `/practices/create`
- analytics 事件（design 3.4）：`inspiration_card_impression`（進 viewport）、`inspiration_cta_click`；實踐建立完成寫入來源歸因

**驗收**
- [ ] 顯示：主題 chip、引文、「整理自《書名》— 作者」、actionHint（無則隱藏）、模板 CTA（依有無模板切換文案與連結）
- [ ] 點模板 CTA 進入建立頁時模板已預填
- [ ] 兩個 analytics 事件可在 dev 驗證送出，且建立實踐可歸因至 inspirationId
- [ ] 無資料/錯誤時首頁 layout 不跳動
- [ ] lint + typecheck 通過

## T7. [admin-ui] 每日靈感管理頁（~4h）

- `api/admin-inspirations.ts`（前綴 `/daodao-server/api/v1/admin/...`，用 `apiClient`）
- `hooks/useInspirations.ts`（queryKey `['admin','inspirations',...]`）
- `pages/InspirationsPage.tsx`：列表 + theme 篩選 + 啟用 toggle + 新增/編輯 dialog + 刪除確認 + 今日預覽小卡
- `App.tsx` lazy route + `Sidebar.tsx`「內容」group 入口

**驗收**
- [ ] CRUD 全流程可操作；toggle 後今日預覽即時更新
- [ ] `pnpm run lint` + `pnpm run typecheck` + `pnpm test` 通過

## T8. [daodao] 驗收與收尾（~3h）

- dev 環境端到端驗證：後台改素材 → 首頁卡片正確輪播；配對模板 → 一鍵建立流程走通
- 營運完成行動型素材的模板配對（design 附錄 A 註記的優先條目）
- 定義漏斗報表查詢（曝光→點擊→建立→7 日打卡；有模板 vs 無模板對比），確認數據可取得
- 素材校對簽核紀錄（誰校對、哪些條目有修改）
- 上線 2–4 週後以漏斗數據評估是否開 Phase 2 提案（feed Slot B 插卡 + 個人化選卡）

**驗收**
- [ ] dev 環境連續兩日觀察到卡片自動切換
- [ ] 40 條素材全數經人工校對；行動型素材已配對模板
- [ ] 漏斗四階段的數據查詢方式已文件化，可實際跑出數字
