# 文章排版與格式查核

時點補充（2026-11-13）：以下為原型當日格式實測，保留原結果與限制；正式 renderer／SEO 的後續工程交付見[整合規劃](../2026-11-12-seo-aeo-blog-draft.md)，不將原型測試當成正式站部署驗收。

日期：2026-11-12。受驗：本機獨立 HTML 預覽 index.html；不代表正式 Next.js／Markdown renderer 已驗收。使用者已確認列表／文章整體方向，本輪僅針對格式與可用性作局部補強。

## 判定

適合作為正式實作基準：單欄、限制正文寬度、清楚 H1／H2／H3、足夠行高與段落間距、低干擾 CTA。沒有唯一最佳字級／行高；本次數值是經實際畫面檢查的設計選擇，不是 WCAG 強制值。

修正前有兩個可重現問題：320×800 CSS px 頁寬 357px；加入長網址／pre 的格式測試後頁寬 4346px。已修 320px 導覽配置、長字換行與區塊內捲動。沒有用整頁 overflow:hidden 隱藏問題。

## 已完成

- 保留桌面正文 692px、19px 字級；手機 18px。中文行高 2.05（桌面）／1.95（手機），英文 1.85。正文改 rem，英文使用 Georgia 系列襯線 fallback；不是每個作業系統字型渲染完全相同的保證。
- article 語意、單一可見 H1、CTA 改 H2；各正文 H3 屬於 H2 子節。文章跳轉後焦點移到標題；提供第一個可 Tab 的 skip link，Enter 可聚焦主要內容。
- 正文連結加底線，不只靠顏色；長網址換行。pre/code 保留必要格式並局部捲動。
- 有序／無序／巢狀清單、引用、粗體／斜體、分隔線、inline code 有一致樣式。
- 比較表用 table／caption／th scope，窄螢幕容器局部捲動，可鍵盤聚焦；正式 renderer 必須輸出同等 wrapper。
- 圖片限制最大寬度、保留比例；格式範例使用有尺寸、alt、lazy loading 與 figcaption 的正式 Logo 作可用素材示意。正式文章圖說不得用來代替必要 alt。
- 新增「格式範例」僅在預覽操作列出現，不要求正式產品增加此入口。

## 驗證結果

| 項目 | 證據／結果 |
|---|---|
| 12 組布局 | 320×800、390×844、1440×900 CSS px，各測中英×深淺色，格式範例無整頁橫向 overflow |
| 表格／程式區塊 | 320／390 表格容器 scrollWidth 大於 clientWidth；頁面仍無 overflow。桌面表格不需橫捲，長程式區塊局部捲動 |
| 自訂文字間距 | 320px 格式頁暫時套 line-height 1.5、paragraph 2em、letter .12em、word .16em，無整頁 overflow；未宣稱完整全站 WCAG 認證 |
| 文字放大 | 320px，root font-size 200%，正文變 36px，無整頁 overflow；這是 root 字級壓力測試，不冒稱瀏覽器 400% zoom 真實操作 |
| 實際鍵盤 | Playwright Tab 聚焦 skip link，Enter 後 activeElement=MAIN#article；不是只有程式 focus 檢查 |
| 對比 | 瀏覽器實際色值轉 sRGB 計算：淺色正文／連結 7.37、圖說／摘要 6.42、表頭／pre 7.23、CTA 7.37；深色各樣本最低 10.69。只涵蓋所列元件，不是所有狀態認證 |
| 語法 | node --check 內嵌 JS 通過 |
| 視覺 | 已檢視 article-formats-mobile.png（390×844），桌面英文保存 article-formats-desktop-en.png；先前正常文章淺／深色亦有截圖 |

## 正式 renderer 仍需完成

1. 正確輸出已核准 Markdown，禁止任意腳本／不安全 HTML；本原型的內建字串不是可直接重用的不可信內容解析器。
2. 日期採真實 published／updated，time datetime 與 Intl 語系格式；閱讀時間從實際正文計算。現有示範值不構成正式 metadata。
3. 實際文章須驗真實長標題、來源連結、翻譯一致、圖片／表格／註腳與失效資源。引文需來源支持，圖說／摘要不得放大正文主張。
4. 目錄依長文需要顯示、支援標題錨點；分享與 canonical／hreflang／Article schema 仍需整合，不以排版通過當 SEO 完成。
5. 跨瀏覽器、OS 字型、實際手機與讀屏器仍待正式實作驗證。此輪未提供完整無障礙符合性聲明。

## 依據

- https://www.w3.org/WAI/WCAG22/Understanding/reflow.html ：320 CSS px reflow 與寬表格等例外。已讀相關開頭與例外，輸出有截斷，不宣稱全文讀完。
- https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html ：需容許使用者覆寫間距，不代表預設一定採該數值。已讀 SC 與 intent，輸出有截斷。
- https://www.w3.org/WAI/tutorials/page-structure/headings/ ：按語意巢狀標題與避免無故跳級，已讀完整擷取。
- https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md ：語意、skip link、focus、長內容、圖片尺寸與局部閱讀格式檢查，已讀完整擷取。

未提交、未部署、未送 Tally；修改僅本機原型與文件。
