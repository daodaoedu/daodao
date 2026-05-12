## 1. Spec & Interface

- [ ] 1.1 定義 `ProviderAdapter` 介面與標準請求/回應格式
- [ ] 1.2 產出 provider capability matrix（支援模型、token 參數、streaming）
- [ ] 1.3 定義錯誤 taxonomy 與 mapping 規格
- [ ] 1.4 定義 user scope / admin scope 權限與 routing precedence 規格
- [ ] 1.5 定義 quota 與 billing 歸屬規則（admin 基礎額度 / user BYOK 額度）

## 2. Backend Runtime

- [ ] 2.1 在 `daodao-ai-backend` 實作 OpenAIAdapter
- [ ] 2.2 在 `daodao-ai-backend` 實作 AnthropicAdapter
- [ ] 2.3 實作 adapter router（依 provider 動態分派）
- [ ] 2.4 實作 source-aware routing（user key 優先，admin fallback）
- [ ] 2.5 實作 key redaction 與 sanitize middleware
- [ ] 2.6 實作 quota-aware routing（user quota -> optional admin fallback）

## 3. User Harness (daodao-f2e)

- [ ] 3.1 新增 provider selector 與 key input（session scope）
- [ ] 3.2 新增 model selector（依 provider 動態更新）
- [ ] 3.3 新增連線測試與錯誤提示 UX
- [ ] 3.4 新增 clear key 動作與 session 結束清除流程

## 4. Admin Config (`projects/daodao-admin-ui` + `projects/daodao-server`)

- [ ] 4.1 在 `projects/daodao-server` 新增管理 API：default provider 設定
- [ ] 4.2 在 `projects/daodao-server` 新增 allowed models 白名單設定
- [ ] 4.3 在 `projects/daodao-server` 新增 fallback policy 設定（primary/secondary）
- [ ] 4.4 在 `projects/daodao-server` 新增 RBAC 與審計欄位（誰在何時改了什麼）
- [ ] 4.5 在 `projects/daodao-server` 新增 admin 基礎額度設定（日/月配額、回退是否允許）
- [ ] 4.6 在 `projects/daodao-admin-ui` 實作對應管理頁與表單流程

## 5. Tests

- [ ] 5.1 為 adapter 共用邏輯建立單元測試（成功/失敗/timeout）
- [ ] 5.2 為錯誤 mapping 建立 regression tests
- [ ] 5.3 為 redaction middleware 建立安全測試（log 不含原始 key）
- [ ] 5.4 為 routing precedence 建立測試（user scope vs admin scope）
- [ ] 5.5 為 admin RBAC 建立權限測試
- [ ] 5.6 為 quota 與 billing_source 建立測試（user/admin 計量分流）

## 6. Observability & Rollout

- [ ] 6.1 新增 provider/model/latency/error/config_source/billing_source 指標
- [ ] 6.2 設定 feature flag，先內部開啟
- [ ] 6.3 撰寫上線與回滾手冊
