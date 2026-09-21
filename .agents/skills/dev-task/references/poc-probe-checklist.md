# POC probe 基本清單

`poc-compare` 的 probe 表最少要涵蓋下列類別，每類在每個檢查點至少一個元素；量 `fontSize / fontWeight / lineHeight / color / backgroundColor / border* / borderRadius / padding* / gap / gridTemplateColumns / width / height / maxHeight / boxShadow / opacity`。

| 類別 | 必量元素 | #189 漏掉的教訓 |
|---|---|---|
| 頁面殼層 | aside 寬／padding、nav 選中態、品牌列、頁面容器 padding、eyebrow／h1／副標 | 側欄品牌列沒列 probe |
| 卡片 | 外框、圓角、padding、標題／meta 字級、grid 欄數／gap、**同列高度是否拉齊** | 卡片 stretch |
| 按鈕 | **每一種變體各一**：頁面主要鈕、modal footer 主／次鈕、確認框取消／危險鈕、小型操作鈕（恢復／刪除）、icon 鈕 | 全部歸「設計系統」放過 |
| 輸入元件 | input／textarea／select／date／checkbox：高、邊框色、圓角、padding、placeholder 色、focus 態 | — |
| 對話框 | **遮罩顏色與 alpha**、面板寬／圓角／padding／陰影、**max-height 與內容是否需要捲動**、header／footer 高、關閉鈕樣式 | 遮罩 0.7 vs 0.3、精靈內捲 |
| 表格 | 容器是否貼齊卡片、表頭底色／底線／圓角、grid 模板、min-width、列 padding、首欄字重、分組列 | 表格內縮 24px |
| 膠囊／標籤／狀態 | 類型膠囊、草稿標籤、tag chip、統計卡數字字重 | 膠囊 12/600 vs 13/400 |
| 篩選列 | 是否換行、各控件高／圓角、gap | 篩選列換成兩行 |
| 空／載入／錯誤態 | 文案位置、字級、色 | — |
| 響應式 | 390px 下 scrollWidth、同一 probe 表在窄寬再跑一次 | — |

流程提醒：
- 量之前**重啟 dev server**：Turbopack HMR 會卡住舊碼，#189 第一輪量到的是修正前的頁面
- 兩邊資料不同時，只比結構／樣式；需要的資料自己暫插（記 id、量完刪）
- probe 抓不到的（hover、transition、陰影方向）用並排截圖肉眼補
- 產出並排圖時把兩張截圖裁成同高、頂端對齊，不然 Google 文件裡上下錯位很難看
