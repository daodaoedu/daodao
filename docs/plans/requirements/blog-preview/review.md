# Blog 版型預覽交付

交付補充（2026-11-13）：保留已確認的 index.html 與四份正式中／英、深／淺 Logo 原檔，未改寫 HTML／設計。本文各節依時間追加，早期示意 Logo／英文組合已由「正式 Logo 與主站頁尾」取代；兩份淘汰的 logo-simple SVG 不是目前原型依賴，未納入此次文件包。PNG 為各階段歷史畫面，應依對應段落判讀。原型方向已獲使用者確認；正式實作與未部署／未驗收邊界見[整合規劃](../2026-11-12-seo-aeo-blog-draft.md)。

範圍：獨立 HTML 視覺原型，不修改產品、插件或部署。使用者偏好為 Medium 式精簡閱讀，保留島島青綠點綴與文字優先列表。示範圖形不是正式品牌 Logo；示範文章非核准發布稿，閱讀時間為示意。

檔案：index.html，可離線開啟；本機服務 http://127.0.0.1:8531/。列表 #list，文章 #article-0。語言／深淺色／分類／空分類可切換。Tally 只作使用者主動外連，不自動提交。

| 驗證 | 結果與限制 |
|---|---|
| JS 語法 | node --check /tmp/daodao-preview-script.js 通過 |
| 行為 | Playwright 驗列表／文章 route、EN 切換、分類空狀態、CTA href 正確；未送表單 |
| 手機 390×844 | 列表／文章深淺色無橫向 overflow；檢視文章淺色全頁及深色首屏截圖 |
| 桌面 1440×900 | 列表與文章無 overflow；已檢視列表截圖，文章截圖已保存 |
| 色彩 | 正文／次要文字／點綴對主背景，淺色 11.74／4.93／5.64，深色 13.63／8.23／9.71；不是全狀態 WCAG 認證 |
| 鍵盤 | 原生 a/button 與 focus-visible 樣式已提供；尚未做完整逐鍵驗收 |
| 產品整合 | 不適用；尚未接 Next.js、內容 repo、分析或正式發布 |
| 雙語 | 主標、列表、正文、CTA 有示範雙語；預覽操作列及部分共用導覽維持中文，非完整 i18n 驗收 |
| 部署 | 未部署，未 commit／push；僅供版型審閱 |

初次 console favicon 404 已補 data favicon；無外部字體或套件依賴。此項修正不影響已保存畫面。

素材：自製簡單 SVG 示意縮圖、候選品牌標記、示範文案。正式版需重用產品正確品牌資產，文章長度及日期由內容計算，不能沿用示意值。

## 品牌與 i18n 修正

依使用者指出的疏漏，已替換自製品牌標記為 website 現有 logo-simple.svg，深色使用 logo-simple-white.svg。保留原 SVG 色彩／比例；主要文字、點綴與背景改引用現有 globals.css 的 text-dark、logo-gray、logo-cyan、light-blue、very-light-blue、bg-dark 等色碼。文字及 CTA 使用 text-dark 語意色，不把較亮 cyan 當小字前景。先前截圖與對比數字為舊版紀錄，不能作修正後全配色證據。

共用介面補 About Dao Dao、預覽列、切換按鈕、導覽 CTA、無障礙名稱、document title；英文 About 指向 /en/about，繁中指向 /about。390×844 驗中英文×深淺色無橫向 overflow，原 SVG 全部載入；1440×900 英文亦無 overflow。已保存 mobile-en-brand.png、desktop-en-brand.png，更新 desktop-list.png。未做完整讀屏器或正式產品 i18n 驗收；英文 Logo 維持既有中文字品牌資產，未自製英文商標。

## Logo 語系補正

查核範圍未找到獨立英文 wordmark。預覽繁中使用原完整 Logo，英文使用既有圖形符號（以容器僅顯示原 SVG 圖形區）搭配可翻譯的 Dao Dao 文字，不冒稱新增官方英文商標；保留原始 SVG 不改檔。英文 copyright 同步。390×844 英文顯示與無 overflow 已回讀並保存 mobile-en-logo.png；首次讀到瀏覽器舊快取，使用 ?preview=logo-i18n 重新取得檔案後重驗成功。正式版需由設計確認此英文組合或提供核准英文素材。

## 正式 Logo 與主站頁尾

使用者補充 Logo/，已改用其中四份正式橫式 SVG（中／英、深字／白字）原檔複製，取代先前英文文字拼接。header 依語言與 theme 換圖，footer 使用對應語言白色原圖。英文品牌字為正式 DAO DAO 字形。

依使用者截圖改頁尾：重用首頁 footer 的品牌標語、About／Resources／Newsletter 分組及各語系原文，copyright 繁中「島島阿學 © 2022 - 2026」、英文「Dao Dao Learning Co., Ltd. © 2022 - 2026」。移除自創 Better learning starts with connection。預覽不接訂閱提交，僅連主站，正式版應重用 Footer 元件及真實訂閱流程。社群使用已提供官方 FB 入口；與主站既有 alias 差異保留在渠道盤點。

390×844 中英×深淺色四組 Logo source／copyright 回讀正確，無 overflow；1440×900 英文無 overflow，頁尾截圖已檢視。截圖 mobile-official-footer.png、desktop-official-footer.png。主站元件重用是正式實作要求，目前仍是獨立原型。

## 導覽去重

依使用者確認，移除 header 關於島島連結、footer 語言切換。頂部保留正式 Logo／Journal、語言、深淺色與封測入口；footer 集中關於、資源、社群、聯絡。JS 語法通過，Playwright 回讀重複控制已移除，1440／390 寬無 overflow，頂部語言切換仍同步 footer 翻譯。

## 文章格式查核

完成本輪局部修正與 12 組格式矩陣，詳見 article-format-audit.md。新增 #article-formats，作為正式 renderer 的格式覆蓋參考。正式內容日期、閱讀時間、來源、Markdown 安全與 SEO metadata 仍未實作，不把原型排版完成當成正式交付。
