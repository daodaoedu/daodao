# Blog repo 與正式 CTA 查核

時點補充（2026-11-13）：本文保留 2026-11-12 的查核／交接紀錄與當時限制；目前工程交付與未完成驗收統一見[整合規劃的工程交付快照](2026-11-12-seo-aeo-blog-draft.md)。歷史「未建立／未開工」不是現況聲明，PR／本機驗證也不等於已部署。

日期：2026-11-12。範圍：唯讀 repo／公開頁面查核，不改部署、不發信、不建立活動。此報告承接整合規劃 v0.5；不是正式功能驗收。

## 結論

1. 建議新增專用純內容 repo（名稱候選 daodao-blog-content），保留舊 daodao-blog 歷史；不直接覆蓋舊 Notion 專案。這是本次查核後的建議，未建立新 repo，名稱未核准。
2. 主站 /blog、/en/blog 的架構方向不變；舊網址移轉單獨盤點，不能從舊首頁 redirect 推論所有舊文章已正確遷移。
3. 自助 CTA 尚未具備正式可用證據。匿名公開取得 lighthouse／programs 回 404，local dev 程式的權限契約亦要求登入與組織成員資格。不能將一般註冊當成新帶領者可直接開團。
4. Demo 路徑是已確認產品方向，但目前有界查核未找到專用預約頁或日程工具。現有聯絡信箱只能證明聯絡方式，不能回報預約成功。

## A. 舊 repo／網域

| 查核 | 結果 | 證據界線 |
|---|---|---|
| daodaoedu/daodao-blog repo | 未 archived，default main，homepage https://blog.daoedu.tw/，API pushed_at 2024-09-29T05:21:48Z | 舊 repo 並非空庫；日期是 API 快照，不證明沒其他外部部署 |
| site.config.ts | name 島島阿學多元學習社群，domain blog.daoedu.tw，Notion root 設定 | 只確認舊內容來源與域名設定，未查取 Notion 私有內容 |
| readme.md | Next.js Notion Starter Kit，Notion CMS／react-notion-x | 不能直接當核准 Markdown 庫使用 |
| .github/workflows/build.yml | push／PR 跑 Node16、yarn install、yarn build | 此 workflow 沒有 deploy 步驟；不排除 Hosting 直接串接 Git |
| GitHub deployments API | 空陣列 | 不能證明 Cloudflare／Vercel 沒有外部整合 |
| https://blog.daoedu.tw/ | Groundlane finalUrl=https://daodao.so/，HTTP 200 | 有導向主站現象，未取得各 hop 的 status，不宣稱 301 |
| https://blog.daoedu.tw/sitemap.xml | finalUrl=https://daodao.so/sitemap.xml，HTTP 200，14 主站 URL | 這不是舊文清單 |
| infra/nginx/conf.d/content.conf | server_name blog.daodao.so，proxy_pass daodao_blog | local infra 設定不是部署證據 |
| https://blog.daodao.so/ | Groundlane DNS 無回答 | 此次工具解析失敗，不宣稱所有網路均無 DNS |

尚缺：Hosting 實際專案綁定、舊文章完整 URL／內容及素材權利、外部連結與索引資料。可從舊 Notion 公開資料、歷史 sitemap／內容清單與 Search Console 查候選，存檔後決定哪些遷入、redirect 或保留；不全部重導首頁。不因現站首頁可開就退役 repo 或解除 Hosting。

選項：新純內容庫最容易維持新 schema／編輯權限，舊庫唯讀保存；若要求沿用 daodao-blog，需先核對外部 Hosting 綁定並設明確遷移版本。兩者均不要求獨立 Blog 網站。

## B. 正式入口

| 候選入口 | 查核結果 | 規劃影響 |
|---|---|---|
| daodao.so 首頁／about | 可讀，主要仍個人學習定位，有註冊與學習資源入口；有界頁面未見 Demo 預約入口 | 首頁及 Blog 需對齊帶領者定位；一般註冊不計團主啟用 |
| app.daodao.so/lighthouse | render auto 最終 /en/lighthouse 404；另 /zh-TW/lighthouse HTTP 路徑最終 /lighthouse 404 | 暫不可用作經驗證的直接建立活動 CTA |
| app.daodao.so/lighthouse/programs | render never HTTP 404 | 不能只因 dev 有檔案就宣稱正式已部署 |
| app.daodao.so/lighthouse/access-required | render auto 最終 /en/lighthouse/access-required 404 | 尚未取得正式組織申請入口 |
| dev middleware.ts | 無 auth_token 導登入並保留 redirect；組織 API data 非空才 allowed，無組織導 access-required | 僅確認 code 契約，不證明 prod 相同；需正式登入／非成員／成員旅程 |
| dev access-required | 文案要求聯絡組織管理者加入，畫面提供回首頁 | 不是公開自助建立組織流程 |
| 專用 Demo 工具／頁面 | website 與 apps/packages 有界搜尋未見 calendly、cal.com、預約 demo 等結果；公開讀取頁未見預約連結 | 未找到不等於整個組織沒有，仍需確認現有對外預約工具 |

檢視版本：f2e dev cb266b844382dc568f820ff7ec7b05107562e516。未登入正式站、未建立 fixtures 或讀取私有教學資料。公開 HTTP／Reader 檢查不是瀏覽器已登入操作驗收。

## C. 建議的 CTA 契約

- 已有組織權限者：確認正式功能後連到具體操作；未登入時保留目的地，無權限時提供明確協助，而非反覆登入。
- 新帶領者／需要協助者：連 Demo 預約入口。尚未有預約頁前，contact@daodao.so 可作「聯絡團隊了解導入」候選；mailto 點擊只記聯絡意圖，不能標預約成功，寄出／收件亦未在本次驗證。
- 內容 schema 記 cta_kind、target 與適用前提；writer 不自行編造 CTA URL。publisher 驗證網址狀態，涉及登入權限另引用操作驗收證據。
- Demo 漏斗：CTA click → booking confirmed → demo held → 活動啟用，前兩者需要預約系統可回讀證據。若只有外連點擊，報告只能到點擊。
- 自助漏斗：CTA click → 登入返回 → 權限通過 → 發布活動 → 受邀成員實際參與；有效事件與觀察窗仍需產品及分析映射。

## D. 後續工作

1. 以新純內容庫為建議方案，先完成建庫預覽與舊庫依賴盤點，不在本輪建立或覆寫。
2. 確認正式 lighthouse 發布狀態與有權限帳號可用性，再做已登入操作；未通過前不在文章承諾直接開團。
3. 查明現有 Demo 預約工具；如果沒有，提出可審閱入口方案，不自行新增服務或寄信。
4. 版型預覽可先用示例文章與明示尚待設定的 CTA，不讓示例按鈕觸發真實發布／寄送。

來源：GitHub repo API、repo 內 site.config.ts／readme.md／workflow、local infra content.conf、f2e middleware.ts／access-required 及公開 Groundlane HTTP。未變更遠端 Issue 或 repo。



## 使用者補充官方社群後的新線索

LinkedIn 公開貼文提到燈塔免費體驗登記，連結在留言。本輪未讀到留言中的 URL，需確認是等候名單、體驗申請或 Demo 預約。前文未找到入口僅限先前網站與程式範圍，不代表組織沒有外部登記入口。見品牌渠道盤點文件。


## 入口第一項確認：封測申請

使用者提供 https://tally.so/r/44WXdk，已讀公開說明與可見欄位。這是免費封測意願申請，後續寄邀請，非 Demo 時段預約。建議 CTA「申請免費封測」；點擊事件只表示導向表單，提交成功需 Tally 回執／整合可回讀證據後另計。未送表單、未驗證邀請開通；Demo 入口仍獨立待確認。


## 最新使用者確認（優先於前文候選方案）

- 沿用 daodaoedu/daodao-blog 改純內容庫，新版分支不保留舊 Notion 網站程式；不另建 daodao-blog-content，不刪除 repo 或改寫 Git 歷史。尚未執行切換，Hosting 綁定仍需查核。
- 免費封測與需 Demo 者皆先填 https://tally.so/r/44WXdk，後續由團隊聯絡安排，沒有新增獨立預約入口。
- 帶領者啟用觀察窗為註冊後 30 天內；條件仍為活動已發布，且至少一位受邀非帶領者成員完成一次實際參與。
