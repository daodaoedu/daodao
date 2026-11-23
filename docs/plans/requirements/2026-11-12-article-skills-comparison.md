# 公開文章相關 Skills 比較

時點補充（2026-11-13）：本文保留 2026-11-12 的查核／交接紀錄與當時限制；目前工程交付與未完成驗收統一見[整合規劃的工程交付快照](2026-11-12-seo-aeo-blog-draft.md)。歷史「未建立／未開工」不是現況聲明，PR／本機驗證也不等於已部署。

日期：2026-11-12。用途：補充島島 Blog Skills 設計。僅查閱公開原始檔，未安裝、執行或證明效能。查核使用 Groundlane；本文描述讀到的設計，不把 Skill 的行銷或研究數字當已驗證事實。索引先查看 skills.sh，再搜尋候選並讀原始 SKILL.md。共七份，來自四個 repo；不是七個獨立團隊的共識。

## 候選與設計

| Skill | 來源 | 實際怎麼做 | 島島可借用 | 限制 |
|---|---|---|---|---|
| content-research-writer | ComposioHQ/awesome-claude-skills | 研究、大綱、開頭、逐節回饋、引文、完整稿審查在同一入口；研究與稿件分檔 | article-writer 包含搜尋與來源整理；可迭代大綱 | 問題清單較多，範例數字／名人引語不可視為查證材料；沒有正式發布契約 |
| article-writing | affaan-m/ECC | 簡短入口，先受眾與用途、每節一個任務、以證據／例子開場，重用品牌聲音資料 | 寫作入口保持輕量，避免每次重新分析品牌 | 主要根據提供的來源，不等於完整搜尋／事實驗證；依賴 brand-voice 能力，不能直接假定島島已有 |
| content-strategy | coreyhaines31/marketingskills | 先讀產品行銷脈絡，顧客問題→意圖／階段→主題群→優先排序；寫前說清比現有結果多了什麼 | 品牌共用文件；選題先看老師／帶領者真問題及新增價值 | 是規劃任務；比例、分數權重、標題數與研究數字不是島島標準 |
| copy-editing | 同上 | 先分重建／保留原聲音／局部修改，再按清楚、語氣、相關性、證據、具體性等維度編修；局部修改跳過全套掃描 | 小修改只改指定範圍；分項審稿；缺事實標 NEED | 轉換文案導向，情緒強化、風險承諾與自評分數不宜硬套教學文章；具體化不等於可自行加數字 |
| social | 同上 | 長文拆成可獨立理解的片段，按平台改寫；產草稿，排程／發布另有明確授權 | social-content 保留原文與核准版本，依 LinkedIn／Threads 任務讀模板 | 發文頻率、平台偏好及數據需另查；不搬入主動私訊等未授權工作 |
| ai-seo | 同上 | 問題對應 references；品牌／競品可見度盤點、抓取、內容結構、第三方資訊與追蹤 | 固定問題樣本；分開引用、推薦、描述正確性；按需查規則 | 多項平台行為、固定字數與可見度百分比未在本次逐項查證，不採為發布 gate 或效果承諾 |
| fact-check | The-AI-Alliance/semiont-newsroom-kb | 每條 Claim 聚合支持／反駁來源、來源關係、信心與編輯建議；實作依賴 Semiont SDK 與服務 | 主張→支持／反證→結論→修訂的證據表 | 是既有語料／服務內的查核流程，不代表自行搜尋全網；不為借用此模型而引入服務與容器 |

## 對島島設計的結論

保留 article-writer、social-content、blog-publisher 三個入口；不是照搬某套 Skills 數量。規劃與單篇創作、寫作與發布的目的不同，應維持邊界。

article-writer 包含單篇必要的搜尋：讀既有品牌／內容→確認讀者問題→搜尋候選→讀一手來源→大綱與新增價值→雙語稿→查證／結構／可讀性審查。既有修訂、翻譯、查證、審稿與潤稿按模式載入參考，不每次強制全跑。全站關鍵字策略、固定 AEO 測量與 Search Console 月報不必每篇執行，也不宣稱已含量化搜尋資料。

三者共用受眾／品牌聲音、內容契約、素材權利與來源準則；研究／查核資料與可發布正文分開。publisher 仍依本地內容 schema、腳本與 CI 執行版本核准、建置、部署、回讀；本輪未找到可直接取代島島雙 repo 發布契約的現成閉環。

保留不確定性與相反來源，不用「有參考資料」代替事實查證。推薦可借用的流程，不推薦未驗證的指標門檻、績效增幅或平台黑箱規則。若未來單獨審稿使用頻繁，再評估拆 article-review，不因外部 repo 拆很多就提前照搬。

## 已讀原始檔

1. https://github.com/ComposioHQ/awesome-claude-skills/blob/master/content-research-writer/SKILL.md
2. https://github.com/affaan-m/ECC/blob/main/skills/article-writing/SKILL.md
3. https://github.com/coreyhaines31/marketingskills/blob/main/skills/content-strategy/SKILL.md
4. https://github.com/coreyhaines31/marketingskills/blob/main/skills/copy-editing/SKILL.md
5. https://github.com/coreyhaines31/marketingskills/blob/main/skills/social/SKILL.md
6. https://github.com/coreyhaines31/marketingskills/blob/main/skills/ai-seo/SKILL.md
7. https://github.com/The-AI-Alliance/semiont-newsroom-kb/blob/main/skills/fact-check/SKILL.md

閱讀界線：七份 SKILL.md 均取得 HTTP 200、完整未截斷文字（ai-seo／social 首次擷取截斷後補取完整）；未讀完各自所有 references、未跑腳本。social-content 舊路徑 404，已核對目前 social 路徑，不當成工具失效。未以安裝量／星數證明內容可靠，也未做安裝推薦或安全認證。
