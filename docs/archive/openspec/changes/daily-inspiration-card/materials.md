# Materials: 情境化書摘素材庫（v2 擴充研究）

> 本檔為 `daily-inspiration-card` 的素材研究產出：定義「使用者狀態情境」分類法，並收集對應書摘。
> design 附錄 A 的首批 40 條為 v1（依 theme 分類）；本檔為 v2 擴充（依**情境**分類，共 89 條），供 Phase 2 情境選句（design 6.4）與素材庫持續擴充使用。
> 收集方式：2026-07-22 以網路搜尋彙整繁中書摘/書評來源，每條附來源連結。**所有條目上線前需人工校對**（見「編輯守則」）。

## 1. 使用者狀態情境分類法

依產品內可觀測的訊號定義八種情境。這是「素材 → 使用者當下狀態」的對應層，比 v1 的 theme（主題）更貼近選句決策：

| 代碼 | 情境 | 產品內訊號（可程式判斷） | 對應觸點 | v1 theme 對應 |
|------|------|--------------------------|----------|---------------|
| A | 起步期 | 實踐建立後 ≤ 7 天 / 首次打卡 | 打卡回饋、onboarding 信 | action, habit |
| B | 持續期里程碑 | 連續打卡達 7/21/30/66 天 | 打卡回饋（里程碑優先權最高） | habit, neuroplasticity |
| C | 中斷後回歸 | 上次打卡距今 ≥ 3 天後再打卡 | 打卡回饋 | mindset（自我慈悲） |
| D | 低潮/挫折 | 打卡 mood 為負向 | 打卡回饋 | mindset, reflection |
| E | 拖延/沒動力 | 實踐建立後久未首打；提醒信情境 | 提醒信（Phase 3）、首頁卡 | discipline, action |
| F | 成就/慶祝 | 打卡完成當下（預設情境） | 打卡回饋 | habit |
| G | 焦慮/壓力 | 打卡 note/mood 含壓力訊號 | 打卡回饋 | neuroplasticity, mindset |
| H | 迷惘/找方向 | 無 active 實踐、瀏覽多不行動 | 首頁卡、onboarding 信 | mindset |

**選句決策優先序**（同時命中多情境時）：B 里程碑 > C 回歸 > D 低潮 > G 焦慮 > A 起步 > F 成就（預設）。E、H 屬非打卡觸點。

**MVP 的落點**：MVP 只用 theme 隨機（design 3.5）；本分類法供 Phase 2 實作情境選句時直接取用。DB 層擴充建議：`daily_inspirations` 加 `context_codes VARCHAR[]`（一條素材可對應多情境），或以 mapping 表處理——實作時再定，不影響 MVP schema。

## 2. 編輯守則（上線前必讀）

1. **引用格式**：標「逐字」者多為出版社授權書摘或金句站的通行譯文，**並非經手核對的原書頁面**——UI 一律以「摘自《書名》」呈現，不用引號直引格式；除非編輯已對過原書。標「詮釋」者用「整理自《書名》」。
2. **書名正名**（v1 附錄 A 需一併修正）：
   - 《紀律等於自由》→ 台版正式書名《**自律就是自由**：輕鬆取巧純屬謊言，唯有紀律才是王道》（經濟新潮社）
   - 《習慣的威力》→ 台版《**為什麼我們這樣生活，那樣工作？**》（大塊文化）
   - Kristin Neff《Self-Compassion》→ 繁中新版《**自我慈悲**》（馬可孛羅 2026/03，林資香譯）；舊版《寬容，讓自己更好》（天下文化）
3. **書中引用他人語**需標明轉引：拳王阿里語（《執行長日記》引）、喬丹語（《心態致勝》引）、Marilyn Ferguson 語（《與成功有約》引）、病人自述（《改變是大腦的天性》書中個案）。
4. **來源語系**：少數條目來自簡中/港繁來源（已轉台灣繁中用語，表中標註）；港譯「靜觀」= 台灣慣用「正念」。
5. **譯者參考**（校對時查原書用）：《Rewire》梁永安；《改變是大腦的天性》洪蘭（遠流）；《心流》張瓊懿（行路）；《也許你該找人聊聊》朱怡康（行路）；《深度工作力》吳國卿（時報）。

## 3. 情境素材庫（89 條）

格式：素材文案 | 書名 / 作者 | 類型（逐字＝來源頁逐字引文；詮釋＝重點整理） | 來源

### A. 起步期（9 條）

| # | 素材 | 出處 | 類型 | 來源 |
|---|------|------|------|------|
| A1 | 任何新習慣都應該能在兩分鐘內啟動。想看書，不要設定一天看一小時，而是「每天睡前翻開書本讀一頁」——把門檻降到最低，讓行動自然發生。 | 原子習慣 / James Clear | 詮釋 | [9niche](https://9niche.com/guide/atomic-habits/) |
| A2 | 「秘訣就是在覺得費力之前停止。」維持動力的關鍵，是執行「難度恰到好處」的任務：想維持運動習慣，就先從下班後換上運動鞋開始。 | 原子習慣 / James Clear | 逐字 | [znrao](https://znrao.com/atomic-habits/) |
| A3 | 習慣越小越好，小到不會失敗。把「每天做 50 個伏地挺身」改成「每天做 2 個」——簡單到你沒有理由說不，但一旦開始，你通常會做超過 2 個。 | 設計你的小習慣 / BJ Fogg | 詮釋 | [9niche](https://9niche.com/guide/tiny-habits/) |
| A4 | 「行為是你馬上或某一特定時點可以做的事。你可以打開書本讀五頁。反之，你無法隨時達成某個志向或結果——你只能長期進行某個對的具體行為達到志向和結果。」 | 設計你的小習慣 / BJ Fogg | 逐字 | [partialface](https://partialface.com/2025/01/design-your-small-habits/) |
| A5 | 「世事難料，我們會生病、休假、有突發狀況。我們的目的不是完美、而是持續。讓習慣保持下去，不管它有多小，都要在你的日常慣例中扎根。」 | 設計你的小習慣 / BJ Fogg | 逐字 | [partialface](https://partialface.com/2025/01/design-your-small-habits/) |
| A6 | 完成微小行為後要「立刻慶祝」——心裡說一句「我做得好棒」也算。習慣的養成不取決於重複次數，而取決於情緒；微小成功帶來的喜悅感，才是持續改變的最強動力。 | 設計你的小習慣 / BJ Fogg | 詮釋 | [seanreads](https://seanreads.com/tiny-habits-the-small-changes-that-change-everything/) |
| A7 | 「不管那件事有多麼微不足道，你都是朝正確的方向邁進。」第一步應該是五分鐘內能完成的簡單小事——先跨出一小步就行了。 | 拖延心理學 / Jane B. Burka、Lenora M. Yuen | 逐字 | [閱讀前哨站](https://readingoutpost.com/procrastination-book/) |
| A8 | 你的成功將取決於對待小事的態度。務必從小處下功夫——豐田的 Kaizen 哲學正是強調持續的微小改善，而非一步登天。 | 執行長日記 / Steven Bartlett | 詮釋 | [17rich](https://blog.17rich.com/the-diary-of-a-ceo/) |
| A9 | 建立新習慣要選定一個簡單的提示（把慢跑衣放在床頭）與清楚的獎酬（記錄里程數的成就感），提示訊號還必須誘發對獎酬的渴望，習慣迴路才會轉起來。 | 為什麼我們這樣生活，那樣工作 / Charles Duhigg | 詮釋 | [pixnet](https://dailyjoe.pixnet.net/blog/posts/16117921130) |

### B. 持續期里程碑（11 條）

| # | 素材 | 出處 | 類型 | 來源 |
|---|------|------|------|------|
| B1 | 「每天進步 1%，一年後你會進步 37 倍；每天退步 1%，一年後你會弱化到趨近於 0。」微小的進步在當下看似不起眼，拉長時間看差距大得驚人。 | 原子習慣 / James Clear | 逐字 | [leapahead](https://www.leapaheadapp.com/zh-TW/blog/atomic-habits-quotes-3) |
| B2 | 「習慣是自我改善的複利。就如同金錢藉由複利增長，習慣的效果也會隨著你重複執行而加倍。」 | 原子習慣 / James Clear | 逐字 | [leapahead](https://www.leapaheadapp.com/zh-TW/blog/atomic-habits-quotes-4) |
| B3 | 「每一次你選擇執行某個習慣，都是在為你想要成為的那個人投下一票。」真正的行為改變是身分認同的轉變——你能堅持下去，是因為習慣成了你身分的一部分。 | 原子習慣 / James Clear | 逐字 | [leapahead](https://www.leapaheadapp.com/zh-TW/blog/atomic-habits-quotes-3) |
| B4 | 「當你覺得自己沒有進展時，其實你只是還沒跨越『潛能之谷』。你的努力並沒有白費，只是被儲存起來了。」竹子頭五年幾乎看不見生長，卻在第六週內長高九十呎。 | 原子習慣 / James Clear | 逐字 | [leapahead](https://www.leapaheadapp.com/zh-TW/blog/atomic-habits-quotes-4) |
| B5 | 養成一個習慣需要多少天？重點不在時間，而在次數。21 天內你可以做 10 次，也可以做 200 次，兩者會導致截然不同的習慣養成結果。 | 原子習慣 / James Clear | 詮釋 | [vocus](https://vocus.cc/article/6711ce8efd89780001e24c8f) |
| B6 | 「人們每天的活動中，超過 40% 是習慣使然，而非來自決定。」每個習慣看似微小，時日一久，卻對健康、效率與人生幸福有極大影響。 | 為什麼我們這樣生活，那樣工作 / Charles Duhigg | 逐字 | [technice](https://www.technice.com.tw/charging-station/book-digest/221857/) |
| B7 | 人們養成規律運動的習慣後，儘管只是一週一次，也能潛移默化改變其他多項不相關的生活模式：吃得較健康、產能更高、對家人更有耐心。運動是能擴散的「核心習慣」。 | 為什麼我們這樣生活，那樣工作 / Charles Duhigg | 詮釋 | [blogspot](http://chennienyi.blogspot.com/2017/07/charles-duhigg.html) |
| B8 | 核心習慣的力量來自「小成功」：利用每一次的小成功帶給自己信心與穩定，第一步改變起了連鎖反應，讓其他好習慣跟著生根定型。 | 為什麼我們這樣生活，那樣工作 / Charles Duhigg | 詮釋 | [vocus](https://vocus.cc/article/636a25f7fd89780001412d1c) |
| B9 | 建立習慣就像一張紙，一旦被摺過，之後就容易摺成同樣的摺。假如相信自己能夠改變，只要養成習慣，改變就會成真——這就是習慣真正的力量。 | 為什麼我們這樣生活，那樣工作 / Charles Duhigg | 詮釋 | [hamr-lab](https://hamr-lab.com/power-of-habbit/) |
| B10 | 「我討厭訓練的每一分鐘，但我告訴自己『別放棄，堅持這一時半刻，往後的人生才能當個冠軍』。」（書中引拳王阿里語） | 執行長日記 / Steven Bartlett | 逐字（轉引） | [jabysreadingoasis](https://jabysreadingoasis.com/the-diary-of-a-ceo/) |
| B11 | 微小改變的成功會讓信心提升，持續做的動機大增：從用牙線清一顆牙，自然長成清潔整口牙。小成功會帶來更多改變，常常超乎人的預期。 | 設計你的小習慣 / BJ Fogg | 詮釋 | [rolingchen](https://rolingchen.github.io/blog/210712_br_tiny_habits/) |

### C. 中斷後回歸（10 條）

| # | 素材 | 出處 | 類型 | 來源 |
|---|------|------|------|------|
| C1 | 毀掉你的絕對不會是第一個錯誤，而是後續的一錯再錯。錯過一次是意外，錯過兩次，很可能就開啟了另一個壞習慣。 | 原子習慣 / James Clear | 逐字（繁中版頁 228） | [vocus](https://vocus.cc/article/69d5d63efd8978000162c019) |
| C2 | 贏家與輸家的區別就在於：輸家會一錯再錯，贏家會快速反彈。如果錯過一天，要儘快回到正軌。 | 原子習慣 / James Clear | 逐字 | [vocus](https://vocus.cc/article/69d5d63efd8978000162c019) |
| C3 | 不要繳白卷，不要讓虧損侵蝕你的複利。懶得動的日子與狀態不佳的練習，讓你維持住先前狀態好的日子裡積攢下來的複利。 | 原子習慣 / James Clear | 逐字 | [pixnet](https://ryanhuang13.pixnet.net/blog/posts/9561929306) |
| C4 | 重點不在於練習時發生的事，而在於成為不會錯過練習的那種人。進健身房五分鐘也許不會改善體能，卻可以強化你的身分認同。 | 原子習慣 / James Clear | 逐字 | [pixnet](https://ryanhuang13.pixnet.net/blog/posts/9561929306) |
| C5 | 世事難料，我們會生病、休假、有突發狀況。我們的目的不是完美、而是持續。讓習慣保持下去，不管它有多小，都要在日常慣例中扎根。 | 設計你的小習慣 / BJ Fogg | 逐字 | [partialface](https://partialface.com/2025/01/design-your-small-habits/) |
| C6 | 善待自己：犯錯或失敗時，能夠鼓勵、支持、保護自己，而不是批判、數落；給自己溫暖、無條件接受自己，而不是攻擊、嘲諷自己。 | 自我疼惜的 51 個練習 / Kristin Neff、Christopher Germer | 逐字（書介） | [readmoo](https://share.readmoo.com/book/896967) |
| C7 | 當我們想起痛苦是人類共同經驗時，每個痛苦時刻就會轉化為與他人連結的時刻，不再覺得自己孤單地承受痛苦。 | 自我疼惜的 51 個練習 / Kristin Neff、Christopher Germer | 逐字（書介） | [readmoo](https://share.readmoo.com/book/896967) |
| C8 | 觀照痛苦，用寬容軟化心中這份苦，承認並接受「人都是會失敗的」，進而放下不切實際的完美期待，避開沒完沒了的自責。 | 自我慈悲（舊版：寬容，讓自己更好）/ Kristin Neff | 逐字（書介） | [天下文化](https://bookzone.cwgv.com.tw/book/BBP323) |
| C9 | 犯錯或失敗對人類而言是極為普遍的事。你和其他人一樣，都會失敗、都不完美，無須因一次挫敗而怪責、懲罰自己——這正是「共通人性」給我們善待自己的理由。 | 自我慈悲 / Kristin Neff | 詮釋 | [treehole](https://treehole.hk/psychology/%E8%87%AA%E6%88%91%E9%97%9C%E6%87%B7/) |
| C10 | 用「我還不會」取代「我做不到」，用「我學到了什麼？」取代「我又失敗了」——成長心態者把中斷與失誤視為過程中的資訊，而非對自己的定罪。 | 心態致勝 / Carol Dweck | 詮釋 | [kdchang](https://www.kdchang.com/blog/reading-notes-mindset-the-new-psychology-of-success) |

### D. 低潮/挫折（10 條）

| # | 素材 | 出處 | 類型 | 來源 |
|---|------|------|------|------|
| D1 | 我投籃沒中的次數超過九千次，輸掉的比賽將近三百場。有二十六次，我被託付投出決定勝負的一球，但沒有命中。（書中引喬丹語，說明擁抱失敗） | 心態致勝 / Carol Dweck | 逐字（轉引，天下文化授權書摘） | [關鍵評論網](https://www.thenewslens.com/article/66135) |
| D2 | 挫折會激勵成長心態者，對他們有益，有警示作用。定型心態下，挫折會讓你感覺身上被貼滿標籤。 | 心態致勝 / Carol Dweck | 逐字（授權書摘） | [關鍵評論網](https://www.thenewslens.com/article/66135) |
| D3 | 定型心態追求的是「證明自己」，成長心態追求的是「改善自己」；失敗只是過程中的一個資訊，越困難的任務越有學習價值。 | 心態致勝 / Carol Dweck | 詮釋 | [vocus](https://vocus.cc/article/69dc373efd897800016760a2) |
| D4 | 人生高峰不見得由天生聰明智商高的人征服，而是由堅持不懈、撐過難關、重新嘗試的人攻頂。（書中引登山家艾德・維思特斯語） | 恆毅力 / Angela Duckworth | 逐字（轉引） | [pchome](https://mypaper.pchome.com.tw/readyou/post/1381352409) |
| D5 | 恆毅力較高的人抱持的希望和運氣無關，而和「再次爬起來」的信念有關。日本有句諺語：「跌倒七次，要爬起來八次。」 | 恆毅力 / Angela Duckworth | 逐字 | [pchome](https://mypaper.pchome.com.tw/readyou/post/1381352409) |
| D6 | 寫作的挑戰，是正視你寫得有多糟，然後去睡覺；隔天醒來，拿出來加以改善，改到還可以，再改到還不錯，幸運的話改到好。如果你能做到那樣，那就成功了。（書中訪談作家科茨語） | 恆毅力 / Angela Duckworth | 逐字（轉引） | [閱讀前哨站](https://readingoutpost.com/grit/) |
| D7 | 樂觀的人會將挫折解讀為需要更加努力的警訊，而不是斷定他們缺乏成功的條件。 | 恆毅力 / Angela Duckworth | 逐字 | [vocus](https://vocus.cc/article/674f1caffd89780001acdbd1) |
| D8 | 走得慢沒關係，只要沒有放棄，就已經是種勇敢。熱情讓我們願意開始，控制感讓我們在困難中不會完全失控。 | 恆毅力 / Angela Duckworth | 詮釋 | [哇賽心理學](https://onyourpsy.com/grit-book-review/) |
| D9 | 痛苦＋反省＝進步。嘗試與痛苦帶來的教訓，能使人成長；感到痛苦時，應該痛定思考，反省自己從中學得的教訓。 | 原則 / Ray Dalio | 逐字 | [blogspot](https://philog8sophia.blogspot.com/2023/02/ray-dalio.html) |
| D10 | 如果你沒有經歷過失敗，就說明你沒有努力突破極限；如果你在痛苦時就能好好反思，你就能夠快速地學習和進化。 | 原則 / Ray Dalio | 逐字（簡中轉繁） | [duomi](https://www.duomi.vip/%e7%97%9b%e8%8b%a6%e5%8a%a0%e5%8f%8d%e6%80%9d%e7%ad%89%e4%ba%8e%e8%bf%9b%e6%ad%a5/) |

### E. 拖延/沒動力（10 條）

| # | 素材 | 出處 | 類型 | 來源 |
|---|------|------|------|------|
| E1 | 「紀律等於自由。如果你希望生活擁有自由，不管是財務自由、更多空閒時間，還是不受疾病之苦，唯有透過紀律才能實現這些目標。」 | 自律就是自由 / Jocko Willink | 逐字 | [TechOrange](https://techorange.com/2018/12/10/seals-teaches-work-tips/) |
| E2 | 「如果希望心理素質變得更堅強，很簡單，就來真的。連想都不要想。」變得更堅強就是下定決心變得更堅強——從下決定的那一刻開始，不管從多小的事下手都好。 | 自律就是自由 / Jocko Willink | 逐字 | [TechOrange](https://techorange.com/2018/12/10/seals-teaches-work-tips/) |
| E3 | 「輕鬆取巧純屬謊言，唯有紀律才是王道。」捷徑根本是假的；守紀律不但不會失去自由，反而能擺脫「拖、懶、慢」的擺布，找到真正屬於自己的自由。 | 自律就是自由 / Jocko Willink | 逐字 | [博客來](https://www.books.com.tw/booksComment/getCommemt/0010797182) |
| E4 | 你的藉口會毀掉你。當你把失敗歸咎於外部因素時，你也同時交出了「修復問題」的能力；如果問題是因為我，那我就有能力修復它——這才是拿回主導權的自由。 | 自律就是自由 / Jocko Willink | 詮釋 | [vocus](https://vocus.cc/article/694e008dfd89780001abf481) |
| E5 | 「動機就像你的酒肉朋友，適合通宵狂歡，但卻無法依賴他送你去機場。」動機有高有低、無時無刻在波動，成功的關鍵不是增強動機，而是降低行為的難度。 | 設計你的小習慣 / BJ Fogg | 逐字 | [partialface](https://partialface.com/2025/01/design-your-small-habits/) |
| E6 | 紀律是成功的終極秘訣。對有紀律的人來說，任何方法都有效；沒有紀律，任何方法都起不了作用。培養紀律的第三個要素：盡量降低行動時會遇到的障礙和成本。 | 執行長日記 / Steven Bartlett | 詮釋 | [hijc](https://hijc.tw/books-the-diary-of-a-ceo/) |
| E7 | 一旦你真正意識到人生本質上是一段有限的時間，你就會開始自動排序什麼重要、什麼不重要，產生內在驅動力，去建立有意義的規律行為。 | 執行長日記 / Steven Bartlett | 詮釋 | [jabysreadingoasis](https://jabysreadingoasis.com/the-diary-of-a-ceo/) |
| E8 | 「你沒有比別人更好的意志力，你只是打造了更好的環境。」與其每天跟惰性拔河，不如把環境打造成不費力就能做出正確選擇的樣子。 | 原子習慣 / James Clear | 逐字 | [leapahead](https://www.leapaheadapp.com/zh-TW/blog/atomic-habits-quotes-3) |
| E9 | 「十秒行動」：從 10 秒就能完成的具體行動開始——把書翻開到要讀的那一頁就好。簡單的行動會刺激大腦伏隔核分泌多巴胺，而多巴胺正是行動力的來源。 | 一本書終結你的拖延症 / 大平信孝 | 詮釋 | [evolvingvillage](https://evolvingvillage.com/terminate-procrastination-by-a-book/) |
| E10 | 「拖延的傾向既不是壞習慣，也不是品格缺失，而是一種由恐懼引發的心理症候群。」比起強者懂得先求有再求好，被完美主義綁架的人因為太怕結果不如意，乾脆選擇逃避。 | 拖延心理學 / Jane B. Burka、Lenora M. Yuen | 逐字 | [閱讀前哨站](https://readingoutpost.com/procrastination-book/) |

### F. 成就/慶祝（11 條）

| # | 素材 | 出處 | 類型 | 來源 |
|---|------|------|------|------|
| F1 | 創造習慣的是情緒。不是重複，不是頻率，不是魔法，而是情緒。當你設計行為以養成某習慣時，你要設計的重點其實是情緒。 | 設計你的小習慣 / BJ Fogg | 逐字（導讀摘要） | [大師輕鬆讀](https://master60.com.tw/index-bookmeta.php?v=770) |
| F2 | 立即慶祝：完成新小行為後立刻做任何能創造正面情緒的事情，像是對自己說「我做得不錯！」——這是習慣 ABC 三步驟的最後一步。 | 設計你的小習慣 / BJ Fogg | 逐字（授權書摘） | [風傳媒](https://www.storm.mg/article/3621437) |
| F3 | 無論成功有多小，你都要加以慶祝。慶祝會釋放多巴胺而令你感覺良好，大腦必定會注意到，並將你的新行為標記為應要重複的習慣。 | 設計你的小習慣 / BJ Fogg | 逐字（導讀摘要） | [大師輕鬆讀](https://master60.com.tw/index-bookmeta.php?v=770) |
| F4 | 及時慶祝是習慣的肥料。多巴胺只在完成行為的當下能被大腦處理，所以一定要在做完的當下馬上慶祝，不能拖太久。 | 設計你的小習慣 / BJ Fogg | 詮釋 | [evolvingvillage](https://evolvingvillage.com/tiny-habits/) |
| F5 | 小嬰兒學走路時，每跨出一步全家人都為他歡呼，滿滿的「慶祝」訊號讓他很快學會走路——正面情緒創造習慣，大人也一樣需要為自己歡呼。 | 設計你的小習慣 / BJ Fogg | 詮釋 | [evolvingvillage](https://evolvingvillage.com/tiny-habits/) |
| F6 | 對鏡中的自己微笑，為自己創造了一個新習慣而感到高興——完成再小的行動，都值得為自己感到高興。 | 設計你的小習慣 / BJ Fogg | 逐字（書摘練習） | [風傳媒](https://www.storm.mg/article/3621437) |
| F7 | 每天都進步 1%，一年後，你會進步 37 倍。你的一點小改變，將會產生複利效應，如滾雪球般帶來豐碩的人生成果。 | 原子習慣 / James Clear | 逐字（書摘） | [vocus](https://vocus.cc/article/628e0a31fd8978000162ae0c) |
| F8 | 當完成一個習慣，立即給自己一個獎賞，讓大腦記住這個美好的時刻；用習慣追蹤器記錄執行狀況，累積成就感與自信心。 | 原子習慣 / James Clear | 詮釋 | [vocus](https://vocus.cc/article/628e0a31fd8978000162ae0c) |
| F9 | 每一天都有進展，即使只是一點小勝利，都會對感受和表現造成影響——最能激勵情緒與動機的，就是在有意義的工作中取得進展。 | 進展法則（HBR〈小進展大力量〉）/ Teresa Amabile、Steven Kramer | 逐字（HBR 繁中版） | [HBR](https://www.hbrtaiwan.com/article/11674/the-power-of-small-wins) |
| F10 | 「我找出事情不對的原因了。我鬆了一口氣，非常開心，因為這是我一個小型的里程碑。」——研究中一位工程師的日記，小小向前一步就能引發極大的正面效應。 | 進展法則 / Teresa Amabile、Steven Kramer | 逐字（HBR 繁中版） | [HBR](https://www.hbrtaiwan.com/article/11674/the-power-of-small-wins) |
| F11 | 成功，是因為灌注熱情；卓越，是因為堅持不懈。是你的恆毅力，而非運氣，讓你發揮極致，成就精彩人生。 | 恆毅力 / Angela Duckworth | 逐字（書介文案） | [pchome](https://mypaper.pchome.com.tw/readyou/post/1381352409) |

### G. 焦慮/壓力（14 條）

| # | 素材 | 出處 | 類型 | 來源 |
|---|------|------|------|------|
| G1 | 長期壓力下，大腦會啟動「低電量模式」：理性思考的前額葉被限速，警報中樞杏仁核卻變得興奮。焦慮時無法自律不是意志力薄弱，而是大腦為了保命拒絕耗電的「改變」指令——第一步是先透過睡眠與減壓把硬體修好。 | Rewire-神經可塑性 / Nicole Vignola | 詮釋 | [閱讀前哨站](https://readingoutpost.com/rewire/) |
| G2 | 「生理性嘆息」是最簡單的情緒重開機：用鼻子深吸一口氣、快吸滿時再補一個短促吸氣，然後用嘴巴慢慢把氣全部吐出。第二次短吸能撐開因壓力塌陷的肺泡，讓迷走神經傳訊號給大腦：「警報解除」。 | Rewire-神經可塑性 / Nicole Vignola | 詮釋 | [閱讀前哨站](https://readingoutpost.com/rewire/) |
| G3 | 思緒亂成一團時別在桌前死撐，出門走走。行走時眼球自然左右掃描產生「視流」，啟動負責注意力的額頂葉網絡——它與製造焦慮的杏仁核互斥。當你動起眼睛觀察世界，大腦就沒空焦慮。 | Rewire-神經可塑性 / Nicole Vignola | 詮釋 | [閱讀前哨站](https://readingoutpost.com/rewire/) |
| G4 | 運動時肌肉像天然製藥廠，分泌「希望分子」直達大腦：BDNF 像大腦的肥料，修復腦細胞、提升學習力；IGF-1 像焦慮橡皮擦，幫忙洗去壓力與負面記憶。心累時起身動一動，不是偷懶，是替大腦回充。 | Rewire-神經可塑性 / Nicole Vignola | 詮釋 | [閱讀前哨站](https://readingoutpost.com/rewire/) |
| G5 | 「重複＋注意力＋刻意＝持久的改變。」想改寫焦慮與負面迴路，三個元素缺一不可：光是重複不夠，要帶著覺察執行；戒不掉舊習慣往往不是決心不夠，而是還沒鋪好另一條新迴路可以走。 | Rewire-神經可塑性 / Nicole Vignola | 逐字（公式）+ 詮釋 | [transcendentreader](https://transcendentreaderblog.com/rewire/) |
| G6 | 「我們所做的一切都是在學習，每一次失敗都是擺脫失敗的一個機會。」當我們用知識賦予自己力量，就會奪回控制權，看出自己可以打破舊有模式。 | Rewire-神經可塑性 / Nicole Vignola | 逐字 | [readtulip](https://readtulip.com/rewire/) |
| G7 | 「睡眠是我們最大的優化工具，所有的新記憶和學習都會在睡眠期間得到鞏固。」睡不好的日子，別急著責備自己效率差——先把睡眠還給大腦，改變才有本錢發生。 | Rewire-神經可塑性 / Nicole Vignola | 逐字 + 詮釋 | [vocus](https://vocus.cc/article/670ad70efd897800017f9cb5) |
| G8 | 「腦是一個有機體，可以改變它自己的結構和功能，只要還活著，年紀再大仍能不斷改變。」神經可塑性推翻了「大腦成年後定型」的百年教條——你此刻的焦慮迴路，並不是你的終身設定。 | 改變是大腦的天性 / Norman Doidge | 逐字（書介）+ 詮釋 | [buybook](https://www.buybook.tw/book-0010397168.htm) |
| G9 | 大腦的法則是「用進廢退」：越常被觸發的迴路越牢固，專心能固化神經元連結，睡眠幫助鞏固學習與記憶。我們的每一個經驗都在改變大腦的連接——今天的小練習，都是在鋪明天的新迴路。 | 改變是大腦的天性 / Norman Doidge | 詮釋 | [lex.idv](https://www.lex.idv.tw/%E5%A4%A7%E8%85%A6%E7%9A%84%E5%8F%AF%E5%A1%91%E6%80%A7%EF%BC%8C%E5%9C%A8%E3%80%8A%E6%94%B9%E8%AE%8A%E6%98%AF%E5%A4%A7%E8%85%A6%E7%9A%84%E5%A4%A9%E6%80%A7%E3%80%8B/) |
| G10 | 「可塑性的矛盾」：讓我們能夠改變的機制，同樣是讓負面思考與壞習慣固化的機制。焦慮不是性格缺陷，而是被反覆練習出來的迴路——因此它也可以被反向練習、被改寫。 | 改變是大腦的天性 / Norman Doidge | 詮釋（簡中來源轉繁） | [douban](https://book.douban.com/subject/3143337/blockquotes) |
| G11 | 「我不能控制它的發生，我只能控制我對它的反應。過去，我曾花了很多時間去擔憂我不能控制的事，現在我只擔憂我可以控制並可以影響結果的事。」（書中個案語） | 改變是大腦的天性 / Norman Doidge | 逐字（轉引，簡中轉繁） | [douban](https://book.douban.com/subject/3143337/blockquotes) |
| G12 | 「痛跟苦不一樣，人都有痛的時候，可是你不一定得那麼苦。」既然死抓著受苦的感覺不放，也許我們正從中得到什麼——看見這點，是放手的開始。 | 也許你該找人聊聊 / Lori Gottlieb | 逐字 + 詮釋 | [readmoo](https://share.readmoo.com/book/963467) |
| G13 | 「心理治療追求的是自我同理（我也是人），而非自我評價（我是好人還是壞人？）。」壓力大時我們最常做的是自我攻擊；先練習像對待朋友那樣，對自己說話。 | 也許你該找人聊聊 / Lori Gottlieb | 逐字 + 詮釋 | [vocus](https://vocus.cc/article/631ed8c6fd8978000152ad88) |
| G14 | 「疼惜自己不代表忽視責任。忽視自己不但無法讓你從經驗中學到更多，反而只會讓你更苦。」疼惜自己才能更全面地看見自己：會學習、調整和成長，不是只有好或壞的一面。 | 也許你該找人聊聊 2 / Lori Gottlieb | 逐字 | [yabook](https://yabook.blog/post/13784.html) |

### H. 迷惘/找方向（14 條）

| # | 素材 | 出處 | 類型 | 來源 |
|---|------|------|------|------|
| H1 | 「幸福不是突然發生的，它不是運氣好或隨機出現的，也不能用金錢購買或以權力換取。幸福無關乎外在條件，而是取決於我們如何詮釋它——是需要憑個人的力量去醞釀、培養與捍衛的。」 | 心流 / Mihaly Csikszentmihalyi | 逐字 | [誠品](https://meet.eslite.com/tw/tc/article/202409020004) |
| H2 | 「最美好的時刻，是發生在一個人有意地將身體或心智能力發揮到極限，完成某件有難度或有價值的事時。」迷惘時與其等待熱情降臨，不如挑一件略高於現有能力的事，全力投入看看。 | 心流 / Mihaly Csikszentmihalyi | 逐字 + 詮釋 | [jujuchu](https://jujuchu.com/flow/) |
| H3 | 「心流，就是一個人全神貫注於某件事而渾然忘我的境界，這經驗是那麼的美好，以致於有人會為了擁有它不惜付出代價。」不論男女老少、來自什麼文化，人們對這種最優體驗的描述都是一樣的。 | 心流 / Mihaly Csikszentmihalyi | 逐字 | [誠品](https://meet.eslite.com/tw/tc/article/202409020004) |
| H4 | 「最優體驗是需要靠我們自己締造的」——它需要個人的努力與創造力，以及隨時隨地掌控意識的能力。有了追求個人目標的能力，即使平淡無奇的例行工作，也可以變得有意義、有樂趣。 | 心流 / Mihaly Csikszentmihalyi | 逐字 + 詮釋 | [jujuchu](https://jujuchu.com/flow/) |
| H5 | 「掌控生命從來就不是件容易的事，有時候痛苦更是無法避免。但長遠來看，這些經驗的累積可以產生一種駕馭感——一種得以參與決定生命內容的感受，這大概就是我們可以想像最貼近幸福的感受了。」 | 心流 / Mihaly Csikszentmihalyi | 逐字 | [誠品](https://meet.eslite.com/tw/tc/article/202409020004) |
| H6 | 深度工作的定義：「在免於干擾的專注狀態下進行工作。將我們的認知能力推向極限，而這種努力可以創造新價值、改進你的技術，並且是他人無法模仿的。」這種工作非你莫屬，別人無法輕易取代。 | 深度工作力 / Cal Newport | 逐字 + 詮釋 | [transcendentreader](https://transcendentreaderblog.com/deep-work/) |
| H7 | 「高品質的工作＝花費的時間 × 專注的程度。」高品質的工作不是花越多時間越好；若工作時間相同，比別人更專注，你產出的品質就更好——專注本身就是槓桿。 | 深度工作力 / Cal Newport | 逐字（公式）+ 詮釋 | [transcendentreader](https://transcendentreaderblog.com/deep-work/) |
| H8 | 「深度生活就是好生活，不管你從什麼角度來看。」當我們真正學會專心在當下的工作，便也能專注地活在生活的每一刻——深度不只是生產力技巧，更是一種生活方式。 | 深度工作力 / Cal Newport | 逐字 + 詮釋 | [blogspot](https://lovelovereading.blogspot.com/2021/12/deep-work-deep-work.html) |
| H9 | 「當人類深深沉浸在富挑戰性的事物時，似乎最能展現最佳狀態。」 | 深度工作力 / Cal Newport | 逐字 | [大師輕鬆讀](http://www.master60.com.tw/master-quote.php?id=227) |
| H10 | 「做深度工作和集中注意力的能力是一種技能，像任何其他技能一樣，需要時間來發展和訓練。」不知道要學什麼的時候，先鍛鍊「能專注」這個底層能力——它會跟著你進入任何領域。 | 深度工作力 / Cal Newport | 逐字 + 詮釋 | [閱讀前哨站](https://readingoutpost.com/deep-work/) |
| H11 | 「如果你讓心智在醒著的時候都做有意義的事，你一天結束時會感覺更充實，第二天會更輕鬆，勝過你一連幾個小時讓心智處於半清醒而沒有計畫的網路漫遊。」 | 深度工作力 / Cal Newport | 逐字 | [閱讀前哨站](https://readingoutpost.com/deep-work/) |
| H12 | 以終為始：每件事的結果都經歷兩次創造——先在心中構思，再付諸行動。從自己想要的結果開始往回推，就能更清楚知道現在該學什麼、做什麼；而指引抉擇的核心，是根據價值觀訂定的個人原則。 | 與成功有約（高效能人士的七個習慣）/ Stephen Covey | 詮釋 | [pieceofclare](https://pieceofclare.com/the-7-habits-of-highly-effective-people-begin-with-the-end-in-mind/) |
| H13 | 「蓋棺論定時，你希望獲得的評價，才是你心目中真正渴望的目標。」想像自己的喪禮上，希望別人怎麼描述你的一生——這是釐清人生方向最鋒利的一個問題。 | 與成功有約 / Stephen Covey | 逐字 + 詮釋 | [閱讀前哨站](https://readingoutpost.com/the-7-habits/) |
| H14 | 「做下去才會懂，有時候你必須放膽一試，在明瞭一件事的意義之前先去經驗它。」失去意義感時，行動往往先於領悟——意義是在做的過程中浮現的，不是想清楚才出發。 | 也許你該找人聊聊 2 / Lori Gottlieb | 逐字 + 詮釋 | [yabook](https://yabook.blog/post/13784.html) |

## 4. 書單總覽

**v1 已有（8 本）**：執行長日記、原子習慣、與成功有約（高效能人士的七個習慣）、富有的習慣、原則、自律就是自由、改變是大腦的天性、Rewire-神經可塑性

**v2 新增（11 本/篇）**：設計你的小習慣（Tiny Habits）、為什麼我們這樣生活，那樣工作？（習慣的威力）、心態致勝、恆毅力、自我慈悲（含《自我疼惜的 51 個練習》）、心流、深度工作力、也許你該找人聊聊（1+2）、拖延心理學、一本書終結你的拖延症、進展法則（HBR）

**素材分佈**：A 起步 9、B 里程碑 11、C 回歸 10、D 低潮 10、E 拖延 10、F 慶祝 11、G 焦慮 14、H 迷惘 14 = **89 條**（v1 40 條 + v2 89 條 = 素材庫共 129 條）
