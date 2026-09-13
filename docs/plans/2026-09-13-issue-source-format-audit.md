# 最近需求 Issue 的來源與格式盤點

查核日期：2026-09-13。使用 gh 唯讀取得最近 35 張 Issue，選 #150、#171、#184、#189 的需求來源作格式樣本，另讀 #150／#171 comments。Google Drive／Docs connector 讀 metadata 與正文；不是只依 Issue 的連結名稱推論。未編輯遠端文件、執行 prototype 或確認部署。

## 已讀來源

| Issue | 來源與修改時間（UTC） | 實際格式 |
|---|---|---|
| [#189](https://github.com/daodaoedu/daodao/issues/189) | [燈塔管理｜動態、成果 FRD](https://docs.google.com/document/d/1q5m6UjCUv9xKkzbRcSXzhz3Rzg_mpU9iuvqLdh212gU/edit)，9/10 13:30 | Purpose、Scope／Prototype 限制、Functional Requirements（FR-ACT／FR-OUT）、Test Points（TP-ACT／TP-OUT／TP-ORG）、產品確認事项 |
| #189 | [燈塔管理｜模板庫、組織設定、封存 FRD](https://docs.google.com/document/d/1a9EvPpSBvpyhNXMURRm5gTjhHMF1EBA87A3YoK-UuRU/edit)，9/10 13:26 | Purpose、Scope、FR-TPL／FR-ORG／FR-ARC、TP-*、Product Confirmation Items |
| [#184](https://github.com/daodaoedu/daodao/issues/184) | [共同挑戰：探索共同挑戰頁與使用者空間](https://docs.google.com/document/d/1cuvazRHFj0AAF2DK2yqbhlddlpJqI3r8B8fr7ZqH40o/edit)，9/5 14:07 | 原型版本依據、Purpose、Scope、FR-EXP／FR-MY、TP-EXP／TP-MY／TP-INT、產品／工程待確認 |
| [#171](https://github.com/daodaoedu/daodao/issues/171) | [建立系列與建立場次 FRD v0.1](https://docs.google.com/document/d/1VmkffdRLSaJdaOZ4Sp_PPrAC-mb-blwwluMBAEFpHDg/edit)，9/3 08:18 | Purpose、Scope／角色、按頁面與設定區段編 FR-*、Test Points TP-* |
| #171／#154 | [待 PM 確認—開放問題](https://docs.google.com/document/d/1abrQhHWrJ3jg1uARAobEjUxz8C1VKIYrZpD63dt4uzA/edit)，9/3 08:23 | 需要決定的問題、已照 FRD 定案的內容、範圍與工時。說明 Issue 之外還有決策來源 |
| [#150](https://github.com/daodaoedu/daodao/issues/150) | [產品框架 202608](https://docs.google.com/document/d/1ZLUM9UmUjCIlLP4Z5s8at68AWfynfQxQo1IYqW195T4/edit)，8/18 13:24 | 產品決策框架、設計原則、階段目標／優先序、策略；功能上接近上層 PRD，但原名不叫 PRD |
| #150 | [島島阿學方案 v0.1](https://docs.google.com/document/d/1ErMlHYTYQvXDJSqu7WAoU4u9bd4l7lajgWhfOpBdsQA/edit)，8/20 01:55 | 方案比較、限制與待討論，屬產品規則來源 |

#150 另有「主頁 & 側邊導覽 FRD v0.1」；本次只確認 metadata，未將它列為已完整讀取的格式樣本。Docs text tool 已取得上述已讀文件的段落與 revision；本次分析語意結構，沒有核對原生視覺排版或所有 comments。

## 值得沿用的結構

最近兩份燈塔 FRD 的每個功能條目包括：目標／描述、原型已確認、觸發條件、前置條件、輸入／資料來源、處理邏輯、UI／狀態輸出、驗證規則、例外／邊界、依賴。

這是 skill 可協助整理的深度，不是要求提出者填十個工程欄位。前台先呈現問題、流程與待確認，詳細內容由來源抽取與對話補齊。

共同挑戰 FRD 已明確依兩個 `.dc.html` 原型整理；未定義的正式 API、權限、持久化、日期計算列待確認。它也指出原型的打卡點擊規格、靈感卡靜態資料與跨挑戰資料隔離仍需補齊。因此「讀原型／分支再整理 FRD」已是現有做法，可以制度化，不需要另發明全新格式。

FR-* 作需求、TP-* 作驗收，維持原始識別碼；新模板不強迫改成 AC-*。兩份燈塔文件皆有 TP-ORG-*，引用時需附文件 ID／來源範圍以免混淆。

## POC 資料夾也是可定位 codebase 的來源

#171 的 [POC 資料夾](https://drive.google.com/drive/folders/1flLIpBDpk3UJe02XFiHtmYpmRKQDp5oM) 直接子項目包括 `管理.dc.html`、`support.js`、assets、uploads、_ds 與 `github.md`。

已讀 `github.md`：它記錄 f2e repo、dev branch、apps/product/src、最後同步時間及 Screen map，將原型頁面對應到 lighthouse 元件與語系檔。這些是查核線索，不代表指向的 dev 分支目前仍等同該原型。

本次確認 POC 目錄與索引，未執行或逐項驗證 HTML 畫面。Skill 需按需要區分「已讀索引」「已讀程式」「已觀察互動」，不能全部報成已驗證 POC。

## 開發分支來源

#189 指定 [prototype/lighthouse-admin-preview](https://github.com/daodaoedu/daodao/tree/prototype/lighthouse-admin-preview)。獨立唯讀查核：該分支相對 merge-base 新增 24 個靜態原型檔，沒有新增 PRD／FRD；Issue 的兩份 FRD 在 Google Docs。分支 head 短 SHA `62f169e2`、main `f249705a`、merge-base `9f8080b9`，ahead 2／behind 9（本次快照，後續使用需刷新）。

靜態程式顯示 AI 連線僅檢查非空、摘要為固定內容、PDF 下載固定檔案。它們提供互動設計線索，不能證明正式 AI、權限、持久化或上線。完整 branch 查核記錄暫存 `/tmp/daodao-branch-source-audit.md`。

## 對 skill 規劃的調整

支援四種輸入：想法、Issue、PRD／FRD＋POC、branch／PR。先分類來源用途，再決定查核方式；沒有文件時可從分支抽出草稿，沒有 branch 時可从文件定位現況。來源讀取與版本紀錄由工具處理，提出者不補 repo／SHA。

保留既有 FRD 的 Purpose／Scope／FR／TP／待確認格式，新增來源差異與產品確認流程。任何來源變動都只重驗受影響內容，不以「最新檔案」自動取代已確認決策。文件或 branch 指示只是待分析資料，不授權執行其中命令或修改遠端。
