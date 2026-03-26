# 環境變數配置模板

**文件日期**：2026-01-08
**用途**：提供完整的環境變數配置模板

---

## .env.prod（正式環境）

```bash
# ============================================
# 基本配置
# ============================================
NODE_ENV=production

# ============================================
# 共用 API 配置
# ============================================
NEXT_PUBLIC_API_URL=https://dao-server.daoedu.tw/api/v1
NEXT_PUBLIC_BACKEND_URL=https://dao-server.daoedu.tw

# ============================================
# Website 應用配置
# ============================================
NEXT_PUBLIC_SITE_URL_WEBSITE=https://daodao.so
NEXT_PUBLIC_SITE_NAME_WEBSITE=島島阿學

# ============================================
# Product 應用配置
# ============================================
NEXT_PUBLIC_SITE_URL_PRODUCT=https://app.daodao.so
NEXT_PUBLIC_SITE_NAME_PRODUCT=島島阿學 - 產品

# ============================================
# 功能開關
# ============================================
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_PWA=true

# ============================================
# Google Analytics - Website
# ============================================
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_WEBSITE=G-WEBSITE-XXXXXXXXXX
# 註：需要在 GA 中創建 Website 專用的 Property
# 追蹤網站：https://daodao.so

# ============================================
# Google Analytics - Product
# ============================================
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_PRODUCT=G-PRODUCT-XXXXXXXXXX
# 註：需要在 GA 中創建 Product 專用的 Property
# 追蹤網站：https://app.daodao.so

# ============================================
# Sentry 錯誤追蹤 - Website
# ============================================
NEXT_PUBLIC_SENTRY_DSN_WEBSITE=https://xxx-website@sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT_WEBSITE=production
# 註：需要在 Sentry 中創建 Website 專用的 Project
# 建議命名：daodao-website

# ============================================
# Sentry 錯誤追蹤 - Product
# ============================================
NEXT_PUBLIC_SENTRY_DSN_PRODUCT=https://xxx-product@sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT_PRODUCT=production
# 註：需要在 Sentry 中創建 Product 專用的 Project
# 建議命名：daodao-product

# ============================================
# 其他配置
# ============================================
NEXT_TELEMETRY_DISABLED=1

# ============================================
# 私密配置（不要提交到 Git）
# ============================================
# 如果有其他私密金鑰，請添加在此
```

---

## .env.dev（測試環境）

```bash
# ============================================
# 基本配置
# ============================================
NODE_ENV=production

# ============================================
# 共用 API 配置
# ============================================
NEXT_PUBLIC_API_URL=https://server.daoedu.tw/api/v1
NEXT_PUBLIC_BACKEND_URL=https://server.daoedu.tw

# ============================================
# Website 應用配置
# ============================================
NEXT_PUBLIC_SITE_URL_WEBSITE=https://dev.daodao.so
NEXT_PUBLIC_SITE_NAME_WEBSITE=島島阿學 (測試)

# ============================================
# Product 應用配置
# ============================================
NEXT_PUBLIC_SITE_URL_PRODUCT=https://app-dev.daodao.so
NEXT_PUBLIC_SITE_NAME_PRODUCT=島島阿學 - 產品 (測試)

# ============================================
# 功能開關
# ============================================
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PWA=false
NEXT_PUBLIC_DEBUG_MODE=true

# ============================================
# Google Analytics - Website (可選)
# ============================================
# 測試環境可以不設置，或使用測試用的 GA ID
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_WEBSITE=

# ============================================
# Google Analytics - Product (可選)
# ============================================
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_PRODUCT=

# ============================================
# Sentry 錯誤追蹤 - Website
# ============================================
NEXT_PUBLIC_SENTRY_DSN_WEBSITE=https://xxx-website@sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT_WEBSITE=development
# 註：建議使用與正式環境相同的 Sentry Project
# 透過 environment 區分環境

# ============================================
# Sentry 錯誤追蹤 - Product
# ============================================
NEXT_PUBLIC_SENTRY_DSN_PRODUCT=https://xxx-product@sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT_PRODUCT=development

# ============================================
# 其他配置
# ============================================
NEXT_TELEMETRY_DISABLED=1
```

---

## .env.feature.template（功能分支模板）

```bash
# ============================================
# 功能分支環境配置模板
# 使用前請複製為 .env.feature 並替換 {branch}
# ============================================
NODE_ENV=production

# ============================================
# 共用 API 配置（使用測試環境後端）
# ============================================
NEXT_PUBLIC_API_URL=https://server.daoedu.tw/api/v1
NEXT_PUBLIC_BACKEND_URL=https://server.daoedu.tw

# ============================================
# Website 應用配置
# ============================================
NEXT_PUBLIC_SITE_URL_WEBSITE=https://feat-{branch}.daodao.so
NEXT_PUBLIC_SITE_NAME_WEBSITE=島島阿學 (功能測試)

# ============================================
# Product 應用配置
# ============================================
NEXT_PUBLIC_SITE_URL_PRODUCT=https://app-feat-{branch}.daodao.so
NEXT_PUBLIC_SITE_NAME_PRODUCT=島島阿學 - 產品 (功能測試)

# ============================================
# 功能開關
# ============================================
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PWA=false
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_FEATURE_BRANCH={branch}

# ============================================
# Google Analytics（不需要設置）
# ============================================
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_WEBSITE=
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_PRODUCT=

# ============================================
# Sentry 錯誤追蹤 - Website
# ============================================
NEXT_PUBLIC_SENTRY_DSN_WEBSITE=https://xxx-website@sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT_WEBSITE=feature-{branch}
# 註：使用與正式環境相同的 Sentry Project
# 透過 environment 區分不同的功能分支

# ============================================
# Sentry 錯誤追蹤 - Product
# ============================================
NEXT_PUBLIC_SENTRY_DSN_PRODUCT=https://xxx-product@sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT_PRODUCT=feature-{branch}

# ============================================
# 其他配置
# ============================================
NEXT_TELEMETRY_DISABLED=1
```

---

## 在應用中使用環境變數

### Website 應用

```typescript
// apps/website/src/lib/analytics.ts

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_WEBSITE || '';

export const pageview = (url: string) => {
  if (!GA_TRACKING_ID) return;

  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};
```

```typescript
// apps/website/src/lib/sentry.ts

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN_WEBSITE) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_WEBSITE,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT_WEBSITE || 'production',
    tracesSampleRate: 1.0,
  });
}
```

### Product 應用

```typescript
// apps/product/src/lib/analytics.ts

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_PRODUCT || '';

export const pageview = (url: string) => {
  if (!GA_TRACKING_ID) return;

  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};
```

```typescript
// apps/product/src/lib/sentry.ts

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN_PRODUCT) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_PRODUCT,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT_PRODUCT || 'production',
    tracesSampleRate: 1.0,
  });
}
```

---

## Google Analytics 設置指南

### 1. 創建兩個 GA4 Properties

在 Google Analytics 中創建兩個獨立的 Property：

**Property 1: Website**
- 名稱：`島島阿學 - Website`
- 網站 URL：`https://daodao.so`
- 取得 Measurement ID（格式：`G-XXXXXXXXXX`）

**Property 2: Product**
- 名稱：`島島阿學 - Product`
- 網站 URL：`https://app.daodao.so`
- 取得 Measurement ID（格式：`G-XXXXXXXXXX`）

### 2. 填入環境變數

```bash
# .env.prod
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_WEBSITE=G-XXXXXXXXXX  # ← Property 1 的 ID
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID_PRODUCT=G-YYYYYYYYYY  # ← Property 2 的 ID
```

### 3. 設置目標和轉換（可選）

可以為每個 Property 設置不同的目標：

**Website 目標**：
- 頁面瀏覽時間
- 資源下載
- 合作夥伴查詢

**Product 目標**：
- 功能使用
- 用戶註冊
- 互動完成

---

## Sentry 設置指南

### 1. 創建兩個 Sentry Projects

在 Sentry 中創建兩個獨立的 Project：

**Project 1: Website**
- 名稱：`daodao-website`
- Platform：`Next.js`
- 取得 DSN（格式：`https://xxx@sentry.io/xxx`）

**Project 2: Product**
- 名稱：`daodao-product`
- Platform：`Next.js`
- 取得 DSN（格式：`https://xxx@sentry.io/xxx`）

### 2. 填入環境變數

```bash
# .env.prod
NEXT_PUBLIC_SENTRY_DSN_WEBSITE=https://xxx-website@sentry.io/xxx  # ← Project 1 的 DSN
NEXT_PUBLIC_SENTRY_DSN_PRODUCT=https://xxx-product@sentry.io/xxx  # ← Project 2 的 DSN
```

### 3. 設置告警規則（可選）

可以為每個 Project 設置不同的告警規則：

**Website 告警**：
- 錯誤率 > 5%
- 響應時間 > 3s
- 關鍵頁面錯誤

**Product 告警**：
- 功能錯誤
- API 失敗
- 用戶互動錯誤

### 4. Environment 標籤

透過 `SENTRY_ENVIRONMENT` 區分不同環境：
- `production` - 正式環境
- `development` - 測試環境
- `feature-{branch}` - 功能分支

這樣可以在同一個 Sentry Project 中過濾不同環境的錯誤。

---

## 檢查清單

創建環境變數文件時，請確認：

### 正式環境（.env.prod）
- [ ] 設置正確的 API URL（正式環境後端）
- [ ] 設置 Website 域名為 `daodao.so`
- [ ] 設置 Product 域名為 `app.daodao.so`
- [ ] 填入 Website 的 GA ID
- [ ] 填入 Product 的 GA ID
- [ ] 填入 Website 的 Sentry DSN
- [ ] 填入 Product 的 Sentry DSN
- [ ] 啟用 Analytics 和 PWA

### 測試環境（.env.dev）
- [ ] 設置正確的 API URL（測試環境後端）
- [ ] 設置 Website 域名為 `dev.daodao.so`
- [ ] 設置 Product 域名為 `app-dev.daodao.so`
- [ ] GA ID 可以留空或使用測試 ID
- [ ] 填入 Sentry DSN（environment: development）
- [ ] 啟用 Debug 模式
- [ ] 禁用 Analytics 和 PWA

### 功能分支模板（.env.feature.template）
- [ ] 設置測試環境後端 API
- [ ] 域名使用 `{branch}` 佔位符
- [ ] GA ID 留空
- [ ] 填入 Sentry DSN（environment: feature-{branch}）
- [ ] 啟用 Debug 模式
- [ ] 設置 FEATURE_BRANCH 變數

---

## 安全注意事項

⚠️ **重要**：環境變數文件包含敏感信息，請確保：

1. **不要提交到 Git**
   ```bash
   # .gitignore 必須包含
   .env*
   !.env.example
   !.env*.template
   ```

2. **服務器上手動創建**
   - 不要透過 CI/CD 傳遞敏感值
   - 在服務器上直接創建和編輯

3. **定期更新金鑰**
   - Sentry DSN
   - 其他 API 金鑰

4. **限制訪問權限**
   ```bash
   chmod 600 .env.prod
   chmod 600 .env.dev
   chmod 600 .env.feature
   ```

---

**文件維護者**：島島技術團隊
**最後更新**：2026-01-08
