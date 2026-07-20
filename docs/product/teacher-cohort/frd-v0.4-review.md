# FRD「夥伴帳號 × 活動主題實踐 v0.3」review 與 v0.4 修訂建議

> 產出日：2026-07-20。依據：v0.3 FRD 全文、本資料夾 `prd.md`（2026-07-16 定案的陪跑教練台 PRD）、業界七個代表性服務的架構實查。
> 總評：**架構正確（Event×Cohort 兩層＋Template 與業界主流同構），但三個核心名詞撞名、參與者保護比 PRD 定案弱、有一處內部矛盾。**

## 一、業界對照與命名依據

七個服務的分層對照（2026-07-20 實查）：

| FRD 概念 | Maven | Canvas LMS | Moodle | Circle.so | Skool | Paperbell |
|---|---|---|---|---|---|---|
| 夥伴帳號 | Expert / Instructor | Account／Sub-account | 站台管理者 | Community owner | Group owner | Coach 帳號 |
| Event（課程線） | **Course** | Course＋Term | Course category | Space Group | Classroom | Package |
| Cohort Tag（梯次） | **Cohort**（帶起訖日） | **Section** | **Cohort**（選課單位） | Space（兼存取邊界） | —（無梯次概念） | Client engagement |
| Template | 課綱隨 Course 走 | **Blueprint Course** | Course backup/restore | — | — | Package 設定 |
| 參與者 | Student | **Enrollment**（一等公民物件） | Participant | Member | Member | Client |
| 名單邀請 | 報名制 | SIS 批次匯入 | Cohort 批次選課 | 邀請連結＋email | 邀請連結 | 客戶自助購買 |

關鍵發現：

1. **FRD 結構＝Maven 標準模式**（Course→Cohort：課程線無時間、梯次有起訖與名單），架構驗證通過。反例是 Teachable/Thinkific——無一等公民 cohort，開新梯只能複製整個課程，導致內容改版改 N 份、學員資料散落。FRD 把梯次做成一等公民、Template 獨立於梯次，正確避開此坑。
2. **Moodle 的定義可直接引用**：「cohort 為選課/名單目的而存在，group 只存在於課程內做互動分組」——Cohort Tag 正是前者。
3. **Canvas 把參與關係做成一等公民（Enrollment，含狀態機）**：對應 FRD 7.3.4 的邀請狀態。實作建議把 enrollment 當獨立物件（invited→joined→exited），不要只做 join table。
4. **Template 語意是 Thinkific 複製式、非 Canvas Blueprint 同步式**（7.4.4 編輯不追溯）——較簡單安全，維持，但文件應註明「刻意不做 Blueprint 式同步」。
5. **Circle 的 Space 同時是內容容器與存取邊界**——與本產品「梯次＝可見性 gating 單位」的心智模型同構，業界已驗證使用者能懂。
6. 「歸屬由使用者決定」（FRD 5.2）在業界**無直接對應**（多數平台報名即全可見）——這是島島的差異化設計，應在文件標明是有意識的選擇。

## 二、命名修訂建議（三個都是撞名問題）

| FRD 名詞 | 問題 | 建議 |
|---|---|---|
| **Event** | 業界 Event 一律指行事曆單次活動（Circle event space、Eventbrite、Luma）；且**島島內部已撞名**——daodao-server admin 已有整套 `/api/v1/admin/events`（活動管理/RSVP/報到） | 改叫 **Program**（中文「系列」/「課程線」；Maven 用 Course、Disco 用 Product）。資料表 `programs`，完全避開既有 events |
| **Cohort Tag** | 「Tag」業界語意是標籤（多對多、無實體），但此物有名單、起訖日、可加入——是容器非標籤。且 7.2.1 限英文命名、7.6.4 又顯示給參與者，中文使用者會看到英文代碼 | 叫 **Cohort**（中文「梯次」；使用者端顯示用「陪跑營」語言，見 prd.md 詞彙定案）。欄位拆 `slug`（英數，給系統/網址）＋`display_name`（自由文字，給人看） |
| **夥伴帳號** | 雙重撞名：SaaS 業界 Partner 指經銷/整合夥伴；**站內「夥伴」已被 Buddy 功能佔用**（找夥伴、`practice_buddy_requests`） | 對外叫 **主辦方/合作方**，個人角色用市場驗證過的「教練」（見 prd.md 詞彙定案的實查依據）；內部實體 `organizer` 或 `partner_org`，使用者端文案避開「夥伴」二字 |

無撞名問題、維持即可：參與者、草稿、個人實踐/活動實踐、歸屬。

## 三、與 PRD 定案衝突、需拍板的五項

1. **單筆內容明細「可見（本階段）」且無「僅自己」勾選（第 8 節）**。PRD 已定案：單則打卡可設「僅自己」、計入存在隱藏內容——防止參與者自我審查、打卡降級為交差文。工程成本一個 boolean，保護的是打卡真實性（本產品最貴的資產）。建議進本階段，不要等。
2. **無退出機制＋歸屬變更須連繫官方（7.8.1）——與 5.2 內部矛盾**。5.2 說「由夥伴單方決定會破壞 autonomy」，7.8.1 卻讓參與者連退出都要寫信客服。加入靠同意、退出靠客服，不對稱站不住。建議：至少提供「轉為個人實踐」自助操作（等同退出該梯次的可見範圍）。
3. **加入方式僅 email 名單、無邀請連結（7.6.1）**。(a) 夥伴上傳第三方 email，名單來源同意責任須明文歸夥伴，否則個資風險在島島；(b) 無連結則臨時加入者（現場工作坊、社群跳進來的）全被擋。建議連結＋名單並存，名單保留給既有學員批次遷入。
4. **完全沒有同儕維度**。參與者彼此不可見、無活動牆——結構是單向匯報工具。參與者端價值剩「收到範本＋被看見」，陪伴感歸零，傷北極星（活動結束後轉自主用戶）。若本階段刻意減法，至少列入第 12 節後續，勿讓單向匯報成為最終形狀。
5. **獨立 admin site vs 做在 product app**。PRD 原規劃 f2e `/coach` 路由區；FRD 要第三個獨立介面。獨立的好處是權限乾淨、體驗專注；代價是多養一個載體（現有 website/product/mobile＋admin-ui 四個）。中間解：用 daodao-admin-ui 的殼＋partner 角色與獨立入口，但 admin-ui 角色白名單（admin/superadmin）硬編碼，須動 auth 層。影響工程量最大，建議與工程共同評估。

## 四、FRD 缺漏、建議補進 v0.4

1. **生命週期**：梯次結束後夥伴可見性未定義。可直接搬 PRD 的三層存續：名冊層（誰參加過哪幾期）永久、內容層期滿唯讀 90 天後消失、離開後（現況層）永不可見。名冊層同時支撐跨梯次回流邀請（平台中介發送、夥伴始終拿不到 email）。
2. **儀表板設計原則（7.9 目前只有視角、無指標約束）**：島島指標鐵律（量流動不量壓力、不做缺勤排名/連續天數/時長）必須寫進 FRD，否則實作必然長成點名表——這是規格文件該擋的滑坡。
3. **路徑 A 啟用時的同意文案**：7.7.3 只規範路徑 B；路徑 A 草稿預設歸屬梯次，啟用當下更需要「此實踐的資訊將提供給活動方」說明＋顯眼的「改為個人」選項。
4. **發起者自己加入統計（3.4）**：夥伴以個人身份加入自己的梯次會灌水聚合統計，建議標記或排除發起者。

## 五、與 repo PRD 的合流建議

本資料夾 `prd.md` 與 FRD v0.3 為平行文件，建議合流方式：

- **結構以 FRD 為準**（Program／Cohort／Template／草稿分層較細），`prd.md` 的單層 cohort 模型升級為兩層。
- **保護與原則以 PRD 為準**：三層存續生命週期、僅自己勾選、儀表板指標鐵律、退出自助、期末匯出逐學員 opt-in、平台中介再連繫。
- **詞彙以 PRD 的市場實查為準**（教練/陪跑營/學員，見 prd.md 詞彙定案節），FRD 的名詞依第二節修訂。
- PRD 中尚未出現在 FRD 的功能（AI 鼓勵草稿、需要關心名單、期末成果匯出、模板頁導流）列入 FRD 第 12 節 roadmap。
