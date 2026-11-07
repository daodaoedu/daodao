# Acceptance 情境安排（2026-11-07 快照）

來源是當日 Planning #10 的 10 張 Acceptance 卡及各卡最新請驗收留言。此資料夾保存可驗證格式的契約，**不是逐卡 READY／正式 PM 驗收證明**。完整流程見 [情境與占用規則](../../../../plugin/skills/verify-deploy/references/acceptance-scenarios.md)。

`taskOwner: acceptance-scenario-lifecycle` 代表此次協調登記，並非接管原任務的 seed 或清理權限。所有 `reviewAt: 2026-11-08T00:00:00Z` 是此次新增的次日複查時間（check 才顯示 reviewDue，沒有自動排程／通知），不是原卡的資料到期日，亦不允許自動重建、清理或解除占用。既有較長保留安排仍有效，至少保留至各卡正式驗收。

## 共用組織14

#471 系列40／場次113–115與 #475 系列45／場次122–126 共用組織14。已用 PM306 做唯讀 API 回讀並確認兩個系列都存在；[更正 #471 舊組織清理指示](https://github.com/daodaoedu/daodao/issues/471#issuecomment-6704794332)及 [#475 保留通知](https://github.com/daodaoedu/daodao/issues/475#issuecomment-6704794816)均已發布及回讀。兩份契約都以 read 保留父層組織，不能因其中一卡通過就刪除、停權或 reset 整個組織；子資料也要先確認精確歸屬與其他依賴。

## 每卡契約

| 卡／來源 | 契約 | 使用方式 | 尚需核對的安排 |
|---|---|---|---|
| [#276](https://github.com/daodaoedu/daodao/issues/276#issuecomment-6701979592) | [276.json](276.json) | 讀取／可還原 | No shared-machine resource reservation record exists yet；Latest handoff limits scope to corrected step11; old full destructive/template scenarios must not be silently repeated |
| [#357](https://github.com/daodaoedu/daodao/issues/357#issuecomment-6703751282) | [357.json](357.json) | 讀取／可還原 | One-run local scripts rather than generic signed baseline/reservation；Program47 challenge kind seeded by controlled transaction, not evidence of normal product creation |
| [#358](https://github.com/daodaoedu/daodao/issues/358#issuecomment-6703661922) | [358.json](358.json) | 讀取／可還原 | No reviewAt timestamp in handoff (says no scheduled deletion)；Post-PASS delete consumes baseline; explicit release evidence needed before delete |
| [#452](https://github.com/daodaoedu/daodao/issues/452#issuecomment-6703866839) | [452.json](452.json) | 消耗型 | No deterministic post-submit bugReport ID in handoff; namespace tag alone must be narrowed to run/time/actor before cleanup；Submission consumes shared actor/IP rate bucket; reservation should include this side effect |
| [#345](https://github.com/daodaoedu/daodao/issues/345#issuecomment-6702110957) | [345.json](345.json) | 消耗型 | Explicit reset command not in current public handoff; local reset/seed scripts require ownership review before use；Date-dependent focus can drift; needs reviewAt and baseline assertion |
| [#463](https://github.com/daodaoedu/daodao/issues/463#issuecomment-6702020558) | [463.json](463.json) | 消耗型 | Original PM pending invitation expires soon (within6days at inventorytime)；479 generation examples31/32 already retired; not new PM-ready data |
| [#471](https://github.com/daodaoedu/daodao/issues/471#issuecomment-6685747869) | [471.json](471.json) | 消耗型 | 歷史交接的組織清理指示已更正；共用組織14需保留；一次性填答基線已消耗：目前2/6且PM306已完成，初始重播BLOCKED，保留結果不重設 |
| [#473](https://github.com/daodaoedu/daodao/issues/473#issuecomment-6702806232) | [473.json](473.json) | 消耗型 | No single executable per-card preflight/reset command in current handoff；Provider quota/cost/versionhistory are consumable state, not ordinary readonlyfixture |
| [#475](https://github.com/daodaoedu/daodao/issues/475#issuecomment-6702764726) | [475.json](475.json) | 讀取／可還原 | CONFIRMED organization14 sharedwith471; parentresource must not be removed by471cleanup；Latest475URLsretain /zh-TW while471notesredirectissue; currentroutebehaviornotcheckedbyinventory |
| [#480](https://github.com/daodaoedu/daodao/issues/480#issuecomment-6704012663) | [480.json](480.json) | 讀取／可還原 | No specialseedresource; reserveonlybrowser/account-preference writes if replaychangeslocale；FormalPMGoogle/UIacceptance remains distinct |

## ID 與證據界線

account／practice／survey 使用 external UUID；其他資料列類型使用 numeric ID，避免同一資源以不同 ID 形式漏判衝突。#345 practice467 已唯讀對應為 `e83a9fcd-db67-439b-9b45-76d69ddb7f10`，#473 practice468 對應為 `f94bfd18-d9bd-4565-97bb-c2329a35db34`。尚未產生的回報、留言／範本及一次性填答用固定 namespace，不編造遠端資料列 ID。

契約中的 UNVERIFIED 前提仍須逐項即時核對。明列的帳號／全域角色、owner 與 #475 加入狀態已另外做唯讀檢查；這不證明問卷未填、邀請仍有效、日期／時區／欄位初始值、外部 provider 額度或 Google 登入可用。工程不得執行契約文字中的命令、將歷史 READY 當成目前就緒，或在未核對歸屬時套用 reset。

#463 原 PM org16／邀請7與 #479 示範 generation 不同；已退休的示範資料不能取代原 PM 前提。#473 真 Gemini 生成是消耗型，未為盤點呼叫 provider。PM Google 登入與正式畫面驗收仍由 PM 完成。

## #471 一次性基線已消耗

2026-11-07 唯讀回讀顯示場次113有六位有效 joined 學員、完成數2/6、指定PM306的completion存在；原交接預期1/6且306尚未填答。只查completion及匿名評分聚合，未把匿名答案連到個人，也未讀取答案文字。最新PM留言曾要求還原，但在最新工程交接後沒有正式PASS紀錄；completion表無可安全判別本次操作時間的欄位，因此來源不明，可能是PM正在驗。此卡的初始提交重播標BLOCKED，不能直接刪除答案或改回1/6。須先確認PM進度，或另經授權準備保留舊結果的新一代情境；不把這個資料狀態判成產品功能FAIL。

## 本輪已檢查內容前提

詳細的檢查名稱、結果與未檢項見 [checked-predicates.json](checked-predicates.json)。於2026-11-07T09:07:53Z：276／345／357／358／463／473／475 的明列 predicates 通過；452／480 無專用 domain seed；471 的初始提交基線受阻。這是範圍明確的唯讀資料檢查，不代表全部AC、UI或正式PM驗收通過。#475十個GET的凍結值digest完全相同；#463邀請7有效至2026-11-13 09:13:07台北，仍須交驗前重查。

十張卡已登記本機共用占用簿（不含線上寫入），org14的write請求實測因471、475的read保留而BLOCKED。這只保護使用同一台機器、同一占用簿且遵循流程的任務，未整合的reset／其他機器不受程式強制攔截。

後續同帳號工程瀏覽器入口檢查：`/zh-TW/cohorts/122` 與 `/cohorts/122` 都回200，前者正確導至無前綴路徑並顯示指定場次標題，未落入登入牆。這解除了本輪入口可達性的疑問，仍未重跑完整九步日曆驗收或Google登入。#345舊helper指向32／94而非現行44／121，未執行；本輪改以精確ID的GET及SELECT核對。
