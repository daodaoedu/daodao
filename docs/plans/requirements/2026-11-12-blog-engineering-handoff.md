# Blog 工程交接規格草案

時點補充（2026-11-13）：本文保留 2026-11-12 的查核／交接紀錄與當時限制；目前工程交付與未完成驗收統一見[整合規劃的工程交付快照](2026-11-12-seo-aeo-blog-draft.md)。歷史「未建立／未開工」不是現況聲明，PR／本機驗證也不等於已部署。

日期：2026-11-12。主規格：[整合規劃](2026-11-12-seo-aeo-blog-draft.md)。本文件承接已確認決策，不新增產品範圍；欄位命名與工程方案為待實作驗證的建議。未建立子 Issue，未開工改正式程式。

## 固定基準

- 視覺：blog-preview/index.html 的列表、文章與格式範例；正式版使用原始 Logo 素材與主站 Footer。
- 受眾：帶領學習的人；老師與社群負責人是情境，不先拆兩群。
- 繁中 /blog、/blog/<slug>；英文 /en/blog、/en/blog/<slug>。
- daodao-f2e/apps/website 負責網站；daodao-blog 改純內容庫，不保留新版分支的舊 Notion 網站程式，不改寫 Git 歷史。
- Skills 正本 plugin/skills/；模板目標 plugin/templates/blog/；草案先存 blog-editorial-drafts/，避免未驗證產物進 plugin。
- EN／繁中核准後同批發布。申請封測與需 Demo 均先到 https://tally.so/r/44WXdk，由團隊聯絡。自助操作須有正式可用證據。
- 啟用：註冊後 30 天內，活動已發布且一位受邀非帶領者成員實際參與。未滿 30 天的 cohort 標示仍在觀察。

## 1. 內容結構與欄位候選

```text
articles/zh-tw/<slug>.md
articles/en/<slug>.md
images/<article-id>/...
```

| 欄位 | 規則 |
|---|---|
| id | 同一篇各語版本共用穩定 ID；不從標題臨時重算 |
| lang | zh-TW 或 en；對應資料夾 |
| slug | 英文 kebab-case，不含斜線或 ..；每語唯一，發布後穩定 |
| title / description | 必填、符合正文，不預設硬字數門檻；超長另做渲染檢查 |
| author_id | 對應可維護作者／團隊資料；不捏造資歷 |
| published_at | 首次正式發布時間，後續修訂保留 |
| updated_at | 可選，實質修訂時間，不因建置重刷 |
| topic / tags | 使用受控主題與可維護標籤；空主題不自動產索引頁 |
| cover | 可選；有圖時必有可解析路徑、alt 或明確裝飾標示，尺寸讀取產生 |
| cta.kind | beta_application 或 direct_action；一篇一個主要 CTA |
| cta.target_id | 對應共用入口清單，不讓 writer 猜網址或寫任意目的地 |
| sources | 外部事實來源；格式與正文參考資料的一致性由驗證器檢查，真偽由查核處理 |

雙語配對以 id＋lang 判斷；缺一語、重複語言、失效圖片或 CTA 驗證不通過即拒絕該批。CTA direct_action 尚無正式驗證的目標不可啟用；Beta URL 可先列已確認公開入口，但提交與邀請成功仍須另外驗證。

核准不靠 approved:true。工作區核准紀錄應對應確切檔案與內容 digest；正式內容庫版本與部署配對可追溯。核准紀錄、私人研究材料不混進公開文章資源。

日期值、slug 與欄位資料驗證在共用 schema 實作；renderer／CI／publisher 共同呼叫同一套 validator。plugin 提供規格說明與呼叫方式，不另複製可漂移的機器 schema。

## 2. Renderer 與 UI

- 靜態列舉兩語的所有文章；初始 HTML 有正文、連結及 metadata。
- 將示範的 innerHTML 替換成經明確安全策略的 Markdown renderer，不直接接收原型字串注入作法。
- 覆蓋 H2/H3、段落、清單、引用、連結、figure／caption、局部可捲動表格、pre／inline code；圖表與影片未確認需求，不先新增任意執行能力。
- 正文 rem 字級、窄螢幕換行、使用者字距覆寫與鍵盤操作沿格式實測契約。320、390、1440 CSS px，兩語、深淺色必驗。
- 日期使用 Intl 與 time datetime；閱讀時間根據實際正文計算，語言差異的估算方式透明，不沿用示範數字。
- 主站 Footer 正式元件重用；header 不再加關於入口，語言切換只留 header，正式需支援同篇互切。
- 分類空狀態、無封面、缺圖、404、長標題、長網址、雙語不對應等狀態明列驗證。

## 3. 發布契約

1. 已核准雙語內容版本進內容正式分支；發布權限依現有 commit／push 規則，不因 skill 被觸發而擴權。
2. 建置流程接受確切 content SHA，配對已核准正式 frontend SHA。不得從可移動分支任意帶入 dev 變更。
3. 同一驗證器檢查內容與資源；產出 website、sitemap、canonical、hreflang、OG 與可見正文一致的 Article／Breadcrumb。
4. 僅發布 website，記錄 build ID、image/artifact digest、前端與內容 SHA；來源缺失或格式錯誤直接失敗，不輸出空站覆蓋。
5. 具體部署成功後回讀兩語文章、圖片、metadata 與版本，最後才回報 published。content committed、build passed、deployed、smoke passed 是不同狀態。
6. 併發發布採版本／佇列規則，舊工作不得覆蓋新版本；重試同版本不重複新增文章。
7. 回復上一組受驗版本後也做正式回讀。遷移舊 repo 前檢查 Hosting 綁定，避免新內容結構觸發舊 Notion 建置。

不使用現有 force-deploy 跳 CI 路徑作正常文章發布。正式切換方案由 infra／f2e 當前流程設計，需真實測試後才認可。

## 4. Skills 及模板交付

article-writer：新稿／修訂／翻譯／查證／審稿／潤稿按模式讀 references。先搜必要來源，留研究與主張證據表；對既有品牌資料不重問。查證、結構、可讀性與雙語一致性分開記錄。只審稿時不改稿，不自行 commit。

social-content：以核准文章版本為輸入，依 LinkedIn／Threads 等已要求平台產草稿；不新增原文未支持的成效或用戶故事，不自行發文或排程。

blog-publisher：預檢與正式發布分開，依已有授權提交、觸發、等待與回讀；錯誤定位及停止點明確，不改寫文章或修網站功能來假裝發布成功。

模板草案：article-brief、how-to、case-study、comparison；結構可依文章調整，欄位規則只有一份。三個 Skills、references、模板及腳本均需證明 plugin 各平台產物有包含，路徑不依賴私人工作區。

## 5. 建議開發單位與依賴

以下為交接拆解，不是已發布子卡或啟動排程。

| 單位 | 主要位置 | 完成證據 | 依賴 |
|---|---|---|---|
| A 內容庫遷移與契約 | daodao-blog／schema 所有者待技術設計 | 舊綁定盤點、可讀雙語測試內容、正反例驗證 | 無 |
| B Blog renderer 與 UI | daodao-f2e/apps/website | 真實內容格式、語系、狀態與版型矩陣 | A |
| C SEO 與站點檔案 | f2e website／站點索引 | HTML／canonical／alternates／OG／schema／sitemap 回讀 | A、B |
| D 跨 repo 發布與回復 | f2e CI／infra／blog | 雙 SHA、受控發布、失敗／併發／重試／回復證據 | A、B、C |
| E 三 Skills 與模板 | daodao plugin 正本 | plugin:build／check、真實任務行為驗證 | A；publisher 整合依 D |
| F 獲客與啟用追蹤 | 現有 analytics／產品事件 | 來源、Tally 邊界、帶領者／學員分流與 30 天 cohort | 既有事件盤點；B |
| G 首篇核准與正式驗收 | 內容庫＋網站＋plugin | 雙語核准、實際發布、mobile／desktop、完整回讀 | A～F 適用項 |

尚無新基準數據，不承諾搜尋量或 AI 引用增幅。最後須同步 #531 的網址、受眾、repo 沿用、Skills 歸屬與頁尾策略，遠端尚未更新。
