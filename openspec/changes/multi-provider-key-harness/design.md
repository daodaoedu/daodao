## Overview

本變更以「Provider Adapter + Key Harness」為核心，將設定分成 **User Scope** 與 **Admin Scope**：
- User Scope：使用者貼入 key 後，僅在該使用者 session 生效
- Admin Scope：平台管理員維護全域預設 provider 設定，供未提供 user key 時使用

系統維持既有業務流程，只替換底層模型呼叫層與設定治理邏輯。

## Current Repo Mapping

- 已在 monorepo：`projects/daodao-f2e`、`projects/daodao-server`、`projects/daodao-ai-backend`、`projects/daodao-storage`、`projects/daodao-admin-ui`、`projects/daodao-worker`

## Architecture

1. **User Harness Layer (`projects/daodao-f2e`)**
   - Provider selector（OpenAI / Anthropic / Google ...）
   - API key input（masked + paste）
   - Session clear action

2. **Admin Config Layer (`projects/daodao-admin-ui` + `projects/daodao-server`)**
   - Default provider 設定
   - Allowed models 白名單
   - Fallback policy（primary/secondary provider）

3. **Runtime Adapter Layer (`projects/daodao-ai-backend` + `projects/daodao-worker`)**
   - `ProviderAdapter` 介面
   - `OpenAIAdapter`, `AnthropicAdapter`, `GoogleAdapter`
   - request/response normalization
   - source-aware routing（user key 優先，否則 admin default）

4. **Security Layer**
   - user key 記憶體暫存（session scope）
   - admin key 儲存於受保護祕密管理機制（不回傳前端）
   - log redaction（永不輸出原始 key）
   - TTL / clear action（離開或登出即清除 user key）

5. **Quota & Billing Layer**
   - admin quota policy（日/月上限、軟硬限制）
   - user BYOK quota（由 provider 端實際限制）
   - billing_source 標記（user/admin）

6. **Observability Layer**
   - metrics: provider, model, latency_ms, status, config_source(user/admin), billing_source(user/admin)
   - error taxonomy: auth/quota/model/network/unknown

## Routing Rules

1. 若 user session 有有效 provider + key，走 user scope
2. 否則走 admin 預設 provider 與政策
3. 若 user key 無效或配額不足，依產品策略：
   - 策略 A：回退到 admin quota（若管理員允許）
   - 策略 B：直接回傳錯誤，要求使用者更新 key
4. 若 admin primary 失敗且符合策略，切 secondary provider
5. 每次請求都打上 `config_source` 與 `billing_source` 標記供追蹤

## Data Flow

1. 使用者在前端貼上 key（可選）
2. 前端送出 provider + model + request（不持久化 key）
3. Runtime 判斷 user scope 是否可用
4. 可用則以 user key 初始化 adapter；否則載入 admin scope 設定
5. adapter 呼叫供應商 API，回傳統一格式
6. 記錄 metrics（不包含敏感資訊）

## Security & Privacy

- User key 不寫入資料庫（Phase 1）
- Admin key 只能由後端祕密管理存取，禁止下發到 client
- API key 不寫入 persistent logs
- 回傳錯誤訊息經過 sanitize，避免外露 request payload
- 嚴格 RBAC：只有 admin 角色可修改 admin scope 設定與配額政策

## Rollout Plan

- Phase 1: OpenAI + Anthropic adapter，User Harness（session key）
- Phase 2: Admin Config UI + fallback policy
- Phase 3: Google adapter + provider health check
- Phase 4: 可選「加密暫存」與 per-user secure vault（需額外資安審查）

## Risks

- user/admin scope 與 quota 歸屬定義不清造成行為與成本混亂
- 各供應商參數語義差異導致回應品質不一致
- 錯誤碼 mapping 不完整造成 UX 不穩定
- 若 key 被誤記錄到第三方監控會有資安風險

## Mitigations

- 明確定義 routing precedence 並加上 contract tests
- 建立 adapter contract tests
- 建立錯誤碼對照表與 fallback 文案
- 對 logging middleware 做 redaction 單元測試與 CI gate
