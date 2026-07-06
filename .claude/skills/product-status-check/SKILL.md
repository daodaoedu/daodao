---
name: product-status-check
description: 規劃或實作任何 product 功能前，先用程式碼驗證 docs/product 的狀態標示是否為真。docs/product 的 PRD/FRD 狀態普遍落後於程式碼——直接照文件規劃會重做一個早就上線的功能。Use before planning a feature, estimating scope, writing an OpenSpec change, or answering "這功能做了沒". Triggered by keywords: PRD, FRD, 規劃, 這功能, 還沒做, 規劃中, roadmap, scope, plan feature.
---

# product-status-check

## 為什麼有這份 skill（給下一個模型的一句話）

`docs/product/**` 底下的 PRD/FRD 是在**規劃當下**寫的，功能上線後**沒有人回頭改它的狀態**。
所以文件寫「規劃中 / 待實作 / Phase 1」時，程式碼裡那個功能**可能早就上線了**。

如果你照文件當地圖去規劃或報 scope，你會做出兩種錯誤之一：

1. **重做已上線的功能**（最貴的錯——浪費整輪實作，還可能覆蓋掉正在運作的東西）。
2. **給錯的現狀判斷**（使用者問「這做了沒」，你照文件答「還沒」，其實有）。

2026-07-06 的實地盤點：至少六個功能「文件說規劃中、程式碼已上線」——快速回應（6 種 reaction）、兩層留言含 @mention、關注／連結、複製實踐、靈感牆 feed、許願池＋公開 Roadmap。這不是特例，是系統性現象。

## 鐵則

> **`docs/product` 的狀態標示一律當成「未知」，不是「未完成」。動工前必須用程式碼查一次。**
> 文件與程式碼衝突時，以程式碼為準——這也是各 repo CLAUDE.md 的既有工作守則。

## 60 秒驗證法（動工前必跑）

一個功能只要「後端路由 ＋ API service ＋ 前端頁面」三者都在，就是**已上線**，無論 PRD 怎麼寫。逐 repo 查：

| 要查什麼 | 去哪查 | 指令 |
|----------|--------|------|
| **server 端點** | `daodao-server/src/routes/<domain>.routes.ts` | `grep -n "router\." src/routes/<domain>.routes.ts` |
| **ai-backend 端點** | `daodao-ai-backend/src/routers/*.py` | `grep -rn "@router" src/routers/` |
| **worker 端點** | `daodao-worker/src/` | 看 zod-openapi 路由定義 |
| **f2e API 層** | `daodao-f2e/packages/api/src/services/` | `ls` 找 `<domain>.ts` + `<domain>-hooks.ts` |
| **f2e 頁面** | `daodao-f2e/apps/product/src/app/[locale]/` | `find ... -type d`，找對應路由 |
| **DB 資料表** | `daodao-storage/schema/` 與 `migrate/sql/` | 表存在 ≠ 功能上線；表在但 API 空＝只做了一半 |

判讀：
- 路由 ＋ service ＋ 頁面都在 → **已上線**。文件若說規劃中，回頭修文件。
- 只有 DB schema、沒有 API／頁面 → **做了一半**（訂閱系統就是這型：schema 完成、API／支付全空）。
- 路由存在但 `docs/product` 完全沒有對應資料夾 → **孤兒功能**，沒人在產品面維護（如 `mentor.routes.ts`）。動它之前先問使用者定位。

## 查完之後要做的事

1. **修正文件**：文件狀態與現實不符時，順手把該 PRD/FRD 的狀態改對（既有工作守則：以現實為準並修正文件）。至少在你的 plan／回覆裡明講「文件寫 X，程式碼實為 Y，以 Y 為準」。
2. **快照會腐爛，別信舊的**：功能上線狀態的最新一次全面盤點在 `docs/product/prd/learning-ecosystem.md`（八層生態＋通電度，校準日 2026-07-06）。超過數週的任何快照都要重跑上面的驗證法，不要照抄。
3. **跨 repo 別漏**：一個 product 功能通常橫跨 storage→server→ai-backend→f2e。判斷「上線」要看整條鏈，任一段缺就是半成品。跨 repo 連鎖見 `.claude/skills/system-map`（各子 repo 內）。

## 邊界

- 這份 skill 只解決「狀態是否為真」。功能**該怎麼設計**仍讀 PRD/FRD 的內文——內文的需求描述與設計決策通常是有效的，失真的只有「狀態」。
- 純工程 repo 文件（各 repo 的 `codebase-map`、`system-map`）有明確維護規範且較新，不在本 skill 的懷疑範圍；本 skill 專指 `daodao/docs/product/**` 的產品狀態標示。
