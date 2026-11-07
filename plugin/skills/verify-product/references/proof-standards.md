# 產品 driver 的證據與維護

動作／結果、artifact、替換、第二視角與各邊界可支持的結論，只在[共用驗證配方](../../../docs/verification-recipe.md#證據邊界)維護。本文件補產品driver特有的條件，不另定一套PASS或發布規則。

一個feature的入口、角色與成功終態在既有feature map維護。driver應從該入口操作，不以直接service取代使用者路徑。

時間加速先保留原日期與原job，再讓實worker處理；用DB setter、改delay或直接呼叫deliver，只能算fixture／後端情境，不能當自然送達的user path。SMTP進本機mailbox、capture與真實inbox各自依共用配方限縮結論。

## 維護

每個受影響feature先對source，再由單一driver owner操作已Doctor的instance。沒有source漂移也要live驗一次；不可達時保存嘗試及缺失prerequisite。失敗後重做Doctor，清掉本輪殘留但保留proof。

feature-map錯誤修文件；工具無法操作現有正常功能修harness並重新live驗；產品行為錯誤作product finding，不能改map或削弱預期掩蓋。只把有source與live證據的feature列已驗；未接driver或未達路徑留未驗。

方法來源：[pstack create-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md)、[maintain-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md)、[Prove It Works](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-prove-it-works/SKILL.md)。這份規範適配現有daodao驗證基礎，不複製pstack成另一套feature-map來源。
