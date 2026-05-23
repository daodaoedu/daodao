# Feature Ideation Studio：功能發想與互動原型預覽

這份文件給 PM、產品設計與營運閱讀，說明後台新增的「功能發想工坊」要解決什麼問題、怎麼用、邊界在哪。對應 OpenSpec change：`add-feature-ideation-studio`。

## 1. 一句話

Feature Ideation Studio 讓 PM / 設計師在後台用自然語言描述功能構想，由 AI **以 daodao 真實專案程式碼為基礎**做改動，建置出**可互動的 UI 原型預覽**，並能產生**唯讀分享網址**給團隊或利害關係人直接點開試用。

它不是憑空生成 mockup，而是「在現有 daodao app 上套用這個構想，會長什麼樣、能不能互動」。

## 2. 解決什麼問題

| 痛點 | 現況 | Studio 之後 |
|---|---|---|
| 想法難溝通 | 靠文字 / 靜態 wireframe / Figma，無法操作 | 真實可互動的原型，點得動、跑得起來 |
| 驗證成本高 | 要排工程、開分支、實作、部署才看得到 | 後台對話即可產生預覽，不需工程介入 |
| 原型不像真產品 | 通用樣板，與實際元件 / 資料脫節 | 以真實 codebase、元件、設計系統、資料結構為基礎 |
| 不好分享 | 截圖、口頭描述、要對方裝環境 | 一條唯讀網址，任何人點開即試用 |

## 3. 怎麼用（PM / 設計師流程）

1. **建立想法專案**：填標題與功能構想，選 base branch（預設 daodao-f2e `main`）。系統自動切出一個與 main 隔離的工作區。
2. **描述構想**：用自然語言說要做什麼，例如「在實踐詳情頁加一個『相似實踐』推薦區塊」。
3. **看預覽**：AI 在真實 codebase 上改動並建置，成功後在後台以沙箱 iframe 顯示**可互動**的原型，可切桌機 / 平板 / 手機尺寸。
4. **迭代**：對結果繼續對話（「改放右側」「加縮圖」「換個顏色」），每一輪產生新版本，舊版本與預覽都保留。
5. **分享**：對滿意的版本產生**唯讀分享網址**，貼給團隊或受測者。連結釘選該版本，之後再怎麼改都不影響已分享的內容。
6. **交棒工程**：對採用的版本按「交棒工程」,系統把原型改動打包成一個 GitHub issue(掛 `auto` label,給 AI 自動接手),原型分支則作唯讀參考。AI 以原型為**參考另起乾淨分支**正式實作、開自己的 PR,走既有人工驗收關卡。

## 4. 分享網址

| 可見性 | 誰能看 | 用途 |
|---|---|---|
| 公開唯讀（預設） | 任何人有連結即可，唯讀、免登入 | 給外部利害關係人、受測者 |
| 團隊限定 | 需登入且為 daodao 成員 | 內部敏感原型 |

連結可設**到期時間**、**隨時撤銷**，並能看到**瀏覽次數**。建置失敗的版本不能分享。

## 5. 交棒給工程（AI 接手開發）

分享網址是給人**看行為**用的,刻意不含程式碼。工程師要**接手實作**走的是另一條路:

- 後台每個版本都存了**完整 diff**(改了哪些檔案)、原型**分支 ref**、`base_commit`、build log,登入後台的版本詳情即可檢視。
- 對採用的版本按「**交棒工程**」,系統會:
  1. 把原型分支以唯讀參考 ref(`feature-idea/<專案>/<版本>`)推上去當對照
  2. 開一個 **GitHub issue 並掛 `auto` label**,內含:構想原文、diff、分支 ref、preview 連結、**邊界註記**(哪些是 mock、要補哪些 test / 真實 API / edge case)
  3. issue 流入既有 remote agent pipeline,**AI 以原型為參考、另起乾淨分支**正式實作並開自己的 PR
- **為什麼不直接把原型分支開 PR 合併?** 原型含 mock 資料、品質不保證上線。採「參考重做」讓 AI 拿到具體起點,卻仍產出乾淨、可上線、經人工驗收的程式碼。

| 路徑 | 看到什麼 | 給誰 |
|---|---|---|
| 分享網址 | 可互動 preview(無程式碼) | 外部利害關係人、受測者 |
| 後台版本詳情 | diff、build log、分支 ref | 登入的 daodao 成員 |
| 交棒工程 → issue | 構想 + diff + 參考分支 + 邊界 | AI agent 接手正式實作 |

## 6. 邊界與安全（重要）

- **永不動到 main / 生產**：所有改動都在隔離工作區，原型分支不會自動合併。交棒工程只開 issue + 推唯讀參考分支,不針對原型分支開 PR、不自動合併,後續正式實作由 AI 另起乾淨分支並經人工驗收。
- **預覽是沙箱**：preview 用 mock / 唯讀資料，不連生產 API、不帶後台 session。
- **原型 ≠ 可上線程式碼**：Studio 用來溝通與驗證；採用後仍需正規工程實作。
- **以策展脈絡為準**：AI 只用既有元件目錄、設計 token 與資料實體 schema，不臆造不存在的元件或欄位。

## 7. 與 Workflow / Skill 的關係

| 工具 | 負責 | 預覽的是 |
|---|---|---|
| AI Workflow（NLP Generator） | 描述自動化需求 → 產生 Workflow draft | **流程結構**（trigger / nodes / edges） |
| Feature Ideation Studio | 描述功能構想 → 改真實 codebase | **可互動的真實產品 UI** |

兩者互補：Studio 驗證「功能長怎樣、好不好用」；Workflow 驗證「自動化流程怎麼跑」。Phase 2 規劃讓本質是自動化的構想，可從 Studio 交棒給 Workflow Generator。

## 8. Phase 規劃

- **Phase 1**：手動觸發、單一 base branch（f2e `main`）、前端改動為主、mock 資料預覽、公開唯讀分享連結、版本歷史、**交棒工程把採用版本打包成 AI 開發 issue（參考重做）**。
- **Phase 2**：交棒 Workflow Generator、把採用 diff 升級成 OpenSpec proposal 草稿、團隊協作留言、以最新 base 重建工作區、跨 server 改動、handoff 自動回填 PR 連結。

## 9. 深入閱讀

- 系統設計與資料模型：`openspec/changes/add-feature-ideation-studio/design.md`
- 使用者需求（spec）：`openspec/changes/add-feature-ideation-studio/specs/feature-ideation-studio/spec.md`、`.../prototype-preview-share/spec.md`
- 實作 checklist：`openspec/changes/add-feature-ideation-studio/tasks.md`
