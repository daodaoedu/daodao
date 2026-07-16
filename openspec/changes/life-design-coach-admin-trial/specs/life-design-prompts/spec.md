## ADDED Requirements

### Requirement: 學習生活設計 prompt 種入
ai-backend 啟動時 SHALL 將兩個 prompt 冪等種入 `system_prompts` 表：`name='life_design_coach'`（多輪教練版，來源 `src/services/prompts/life_design_coach_system.txt`）與 `name='life_design'`（Phase 1 單次生成版，來源 `src/services/prompts/life_design_system.txt`）。兩者 SHALL 以 `is_active=False` 種入，且 name 已存在時 SHALL 跳過不覆蓋（與既有 seed 行為一致）。

#### Scenario: 首次啟動 seed
- **WHEN** ai-backend 啟動且 `system_prompts` 無 `life_design_coach` / `life_design` 紀錄
- **THEN** 系統 SHALL 各插入一筆（`is_active=False`, `version=1`），內容與對應 txt 檔一致

#### Scenario: 已存在則跳過
- **WHEN** ai-backend 重啟且兩筆紀錄已存在（含 admin 已編輯過的版本）
- **THEN** 系統 SHALL 不覆蓋 DB 內容

#### Scenario: 不影響現有 active prompt
- **WHEN** seed 完成
- **THEN** `insight` 等既有 prompt 的 `is_active` 狀態 SHALL 不受影響（新 prompt 不觸發 `deactivate_others`）

### Requirement: prompt 內容與設計文件一致
兩個 txt 檔的內容 SHALL 取自 `daodao` repo `docs/product/life-design-coach/` 對應文件的 prompt 正文（code block 內文）：`coach-prompt.md` → `life_design_coach_system.txt`、`phase1-single-shot-prompt.md` 的 System Prompt 段 → `life_design_system.txt`。文件為 source of truth；試行期間若 admin 於 UI 迭代出更好的版本，SHALL 回寫更新設計文件。

#### Scenario: 內容驗證
- **WHEN** 比對 txt 檔與設計文件的 prompt 正文
- **THEN** 兩者 SHALL 一致（允許因去除 markdown code fence 產生的首尾空白差異）

### Requirement: 沿用既有 prompt 管理能力
兩個 prompt SHALL 可透過既有 admin system-prompts CRUD（`GET/POST/PUT/DELETE /api/v1/admin/system-prompts`）檢視與編輯，編輯 content 時 version SHALL 自動 +1（既有行為，不需新開發，本 requirement 作為驗收確認）。

#### Scenario: admin 迭代 prompt
- **WHEN** admin 於 SystemPromptsPage 編輯 `life_design_coach` 的 content 並儲存
- **THEN** 系統 SHALL 更新內容且 version +1；playground 下一輪以 `system_prompt_id` 指定時 SHALL 取得新內容
