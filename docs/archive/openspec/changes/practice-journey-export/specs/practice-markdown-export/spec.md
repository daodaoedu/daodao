## ADDED Requirements

### Requirement: Markdown 導出狀態限制
Markdown 導出功能 SHALL 在實踐狀態為 `completed` 或 `archived` 時可使用。
狀態為 `active`、`not_started`、`draft` 的實踐 SHALL NOT 提供 Markdown 導出。
（PDF 有額外限制：`archived` 不可導出 PDF；但 Markdown 無此限制，以便封存後仍可保留文字紀錄。）

#### Scenario: 完成狀態顯示 Markdown 導出選項
- **WHEN** 使用者瀏覽狀態為 `completed` 的實踐詳情頁
- **THEN** 系統 SHALL 顯示「導出 Markdown」選項

#### Scenario: 封存狀態仍可導出 Markdown
- **WHEN** 使用者瀏覽狀態為 `archived` 的實踐詳情頁
- **THEN** 系統 SHALL 顯示「導出 Markdown」選項（但不顯示「導出 PDF」）

#### Scenario: 進行中狀態不可導出
- **WHEN** 使用者瀏覽狀態為 `active` 或 `not_started` 的實踐詳情頁
- **THEN** 系統 SHALL NOT 顯示任何導出選項

---

### Requirement: Markdown 檔案含 YAML front matter
導出的 Markdown 檔案 SHALL 在文件開頭包含 YAML front matter，包含以下欄位：
`title`、`author`、`start_date`、`end_date`、`duration_days`、`exported_at`、`source_url`、`verified`

#### Scenario: Front matter 格式正確
- **WHEN** 使用者觸發 Markdown 導出
- **THEN** 生成的 `.md` 檔案 SHALL 以 `---` 開頭，包含所有必要欄位，並以 `---` 結尾

#### Scenario: source_url 為永久有效連結
- **WHEN** Markdown 檔案被匯入筆記軟體（如 Obsidian）
- **THEN** `source_url` 欄位的連結 SHALL 能正確導向原始實踐頁面

#### Scenario: verified 欄位反映驗證狀態
- **WHEN** 實踐符合高品質門檻（持續 ≥ 14 天且 Insightful ≥ 3）
- **THEN** front matter 的 `verified` 欄位 SHALL 為 `true`，否則 SHALL 為 `false`

---

### Requirement: Markdown 包含完整實踐內容
導出的 Markdown SHALL 包含：實踐標題、行動描述、所有 Check-ins（依時間升序）、最終覆盤、專業見證指標。

#### Scenario: Check-in 時序排列
- **WHEN** 使用者觸發 Markdown 導出
- **THEN** 所有 Check-ins SHALL 依 `checkin_date` 升序排列

#### Scenario: 圖片以相對路徑引用
- **WHEN** Check-in 包含圖片
- **THEN** Markdown 中 SHALL 以相對路徑 `./images/` 引用圖片，例如 `![](./images/2026-02-22(1).jpg)`

#### Scenario: 0 筆 Check-in 時仍可導出
- **WHEN** 實踐狀態為 `completed` 但無任何 Check-in 紀錄
- **THEN** 系統 SHALL 仍生成 Markdown，Check-in 區塊顯示為空（不報錯）

#### Scenario: 無覆盤時省略覆盤區塊
- **WHEN** 實踐無最終覆盤內容
- **THEN** Markdown SHALL 省略覆盤標題與內容，不顯示空白區段

---

### Requirement: 圖片另存為 JPG 並以 ZIP 打包
含圖片的實踐導出 SHALL 打包為 ZIP 檔案，包含 `.md` 文件與 `images/` 資料夾。

#### Scenario: ZIP 結構正確
- **WHEN** 實踐含有圖片的 Check-in 並觸發 Markdown 導出
- **THEN** 下載的 ZIP SHALL 包含：根目錄的 `.md` 檔案，以及 `images/` 子資料夾內的所有圖片（.jpg 格式）

#### Scenario: 無圖片時直接下載 .md
- **WHEN** 實踐所有 Check-ins 均無圖片
- **THEN** 系統 SHALL 直接下載單一 `.md` 檔案，不打包 ZIP

---

### Requirement: 圖片檔名規範
Markdown 圖片資料夾內的圖片 SHALL 以 `[打卡日期-(數字)]` 命名，例如 `2026-02-22(1).jpg`。

#### Scenario: 同日多張圖片編號正確
- **WHEN** 同一 Check-in 含 3 張圖片，日期為 2026-02-22
- **THEN** 圖片檔名 SHALL 分別為 `2026-02-22(1).jpg`、`2026-02-22(2).jpg`、`2026-02-22(3).jpg`

---

### Requirement: Markdown 導出預設檔名規範
Markdown ZIP（或 .md）檔案 SHALL 以 `[DaoDao_主題實踐]_[主題名]_[使用者名]_[完成日期]` 命名。

#### Scenario: 預設檔名格式正確
- **WHEN** Markdown 導出觸發下載
- **THEN** 下載檔案的預設名稱 SHALL 符合規範，例如 `[DaoDao_主題實踐]_學習 React_小明_2026-03-01.zip`

#### Scenario: 主題名含特殊字元時自動 sanitize
- **WHEN** 主題名稱含有檔名非法字元（如 `/` `:` `?` `*` `\` `"` `<` `>`）
- **THEN** 系統 SHALL 將這些字元替換為 `-`，例如主題名 `React/Vue 比較` 產生 `[DaoDao_主題實踐]_React-Vue 比較_小明_2026-03-01.zip`
