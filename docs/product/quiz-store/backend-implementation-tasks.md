# 測驗結果儲存 - 後端實施任務清單

> 基於 `backend-simple-plan.md` 和數據庫表 `640_create_table_quiz_results.sql`

## 📋 任務總覽

本文件列出實現測驗結果儲存功能所需的所有後端任務。此功能採用簡化方案：**前端處理測驗邏輯，後端只負責保存和查詢結果**。

---

## 🗂️ 任務分類

### 階段一：資料庫準備 ✅
- [x] **任務 1.1**: 數據庫表已創建
  - 文件：`daodao-storage/init-scripts-refactored/640_create_table_quiz_results.sql`
  - 狀態：已完成（SQL 腳本已存在）

- [ ] **任務 1.2**: 從數據庫同步 Prisma Schema
  - 命令：`cd daodao-server && npx prisma db pull`
  - 操作：從 PostgreSQL 數據庫同步 `quiz_results` 表結構到 schema.prisma
  - 優先級：🔥 高（必須先完成）
  - 注意：確保數據庫已執行 `640_create_table_quiz_results.sql` 腳本

- [ ] **任務 1.3**: 生成 Prisma Client
  - 命令：`cd daodao-server && pnpm run prisma:generate`
  - 依賴：任務 1.2
  - 優先級：🔥 高

---

### 階段二：類型定義
- [ ] **任務 2.1**: 創建測驗類型定義文件
  - 文件：`daodao-server/src/types/quiz.types.ts`
  - 內容：
    - `QuizResultData` - 請求數據接口
    - `QuizResultResponse` - 響應數據接口
  - 依賴：無
  - 優先級：🔥 高

---

### 階段三：驗證層
- [ ] **任務 3.1**: 創建 Zod 驗證器
  - 文件：`daodao-server/src/validators/quiz.validators.ts`
  - 內容：
    - `resultTypeSchema` - 結果類型驗證（L/C/A/D/O）
    - `scoresSchema` - 分數對象驗證
    - `answersSchema` - 答案對象驗證（可選）
    - `saveQuizResultSchema` - 保存請求驗證
    - `quizResultDataSchema` - 響應數據驗證
    - `saveQuizResultResponseSchema` - 保存響應驗證
    - `getQuizResultResponseSchema` - 查詢響應驗證
  - 依賴：任務 2.1
  - 優先級：🔥 高

---

### 階段四：服務層
- [ ] **任務 4.1**: 創建測驗服務
  - 文件：`daodao-server/src/services/quiz.service.ts`
  - 內容：
    - `saveResult(userId, data)` - 保存測驗結果
    - `getLatestResult(userId)` - 獲取最新結果
    - 導出 `quizService` 對象
  - 依賴：任務 1.3, 2.1
  - 優先級：🔥 高
  - 注意事項：
    - 從 `@/services/database/prisma.service` 導入 prisma
    - 返回 `ApiResponse<T>` 類型
    - 使用 `createSuccessResponse` 構建響應

---

### 階段五：控制器層
- [ ] **任務 5.1**: 創建測驗控制器
  - 文件：`daodao-server/src/controllers/quiz.controller.ts`
  - 內容：
    - `saveResult(req, res)` - 保存測驗結果
    - `getLatestResult(req, res)` - 獲取最新結果
    - 導出 `quizController` 對象
  - 依賴：任務 3.1, 4.1
  - 優先級：🔥 高
  - 注意事項：
    - 使用 `asyncHandler` 包裝
    - 從 `req.user!.id` 獲取用戶 ID
    - 使用 Zod schema 驗證響應
    - 無結果時拋出 `NotFoundError`

---

### 階段六：路由層
- [ ] **任務 6.1**: 創建測驗路由
  - 文件：`daodao-server/src/routes/quiz.routes.ts`
  - 內容：
    - `POST /` - 保存測驗結果（需要認證）
    - `GET /latest` - 獲取最新結果（需要認證）
  - 依賴：任務 5.1
  - 優先級：🔥 高
  - 注意事項：
    - 使用 `authenticate` 中間件
    - 使用 `validate` 中間件驗證請求
    - 控制器方法需 `as RequestHandler` 類型斷言

---

### 階段七：路由註冊
- [ ] **任務 7.1**: 在 app.ts 註冊路由
  - 文件：`daodao-server/src/app.ts`
  - 操作：
    1. 導入 `quizRoutes`
    2. 註冊到 `/api/v1/quizResults`
    3. 添加 console.log 確認訊息
  - 位置：在其他路由註冊之後（約 line 228 之後）
  - 依賴：任務 6.1
  - 優先級：🔥 高

---

### 階段八：測試與驗證
- [ ] **任務 8.1**: 類型檢查
  - 命令：`cd daodao-server && pnpm run typecheck`
  - 依賴：所有代碼任務完成
  - 優先級：中

- [ ] **任務 8.2**: Lint 檢查
  - 命令：`cd daodao-server && pnpm run lint`
  - 依賴：所有代碼任務完成
  - 優先級：中

- [ ] **任務 8.3**: 啟動開發服務器
  - 命令：`cd daodao-server && pnpm run dev`
  - 驗證：檢查路由是否正確註冊
  - 依賴：任務 8.1, 8.2
  - 優先級：🔥 高

- [ ] **任務 8.4**: API 端點測試
  - 工具：Postman / Thunder Client / curl
  - 測試用例：
    1. POST `/api/v1/quizResults` - 保存測驗結果
    2. GET `/api/v1/quizResults/latest` - 獲取最新結果
    3. 未認證訪問測試（應返回 401）
    4. 無效數據測試（應返回驗證錯誤）
  - 依賴：任務 8.3
  - 優先級：🔥 高

---

## 📝 詳細實施指南

### 任務 1.2: 從數據庫同步 Prisma Schema

使用 Prisma 的數據庫同步功能從現有數據庫表生成 schema：

**步驟**：

1. **確認數據庫表已存在**
   ```bash
   # 確保已執行 SQL 初始化腳本
   # 檢查 daodao-storage/init-scripts-refactored/640_create_table_quiz_results.sql
   ```

2. **從數據庫同步 Schema**
   ```bash
   cd daodao-server
   npx prisma db pull
   ```

3. **驗證生成的模型**

   打開 `prisma/schema.prisma`，確認已生成 `quiz_results` 模型：
   ```prisma
   model quiz_results {
     id           Int      @id @default(autoincrement())
     user_id      Int
     result_type  String   @db.VarChar(1)
     scores       Json
     answers      Json?
     completed_at DateTime @default(now()) @db.Timestamptz(6)

     users        users    @relation(fields: [user_id], references: [id], onDelete: Cascade)

     @@index([user_id], map: "idx_quiz_results_user_id")
     @@index([completed_at], map: "idx_quiz_results_completed_at")
     @@index([result_type], map: "idx_quiz_results_result_type")
   }
   ```

4. **處理 users 模型關聯**

   如果 `users` 模型中沒有反向關聯，需要手動添加：
   ```prisma
   model users {
     // ... 其他欄位
     quiz_results  quiz_results[]  // 添加這行
   }
   ```

**注意**：
- `prisma db pull` 會根據數據庫現有結構自動生成 schema
- 生成後檢查關聯關係是否正確
- 接下來運行 `pnpm run prisma:generate` 生成 TypeScript 類型

---

### 任務 2.1: 創建類型定義

參考文件：`backend-simple-plan.md` 第 150-171 行

**關鍵點**：
- 使用 TypeScript interface
- 分離請求和響應類型
- 與驗證器保持一致

---

### 任務 3.1: 創建驗證器

參考文件：`backend-simple-plan.md` 第 173-247 行

**關鍵點**：
- 使用 Zod schema
- 提供 `.describe()` 說明
- 添加自定義錯誤訊息
- 導出 TypeScript 類型：`z.infer`
- resultType 自動轉大寫：`.transform(val => val.toUpperCase())`

---

### 任務 4.1: 創建服務

參考文件：`backend-simple-plan.md` 第 249-312 行

**關鍵點**：
- 從 `@/services/database/prisma.service` 導入 prisma
- 函數式導出，不使用類
- 返回 `ApiResponse<T>`
- 使用 `createSuccessResponse`
- JSON 欄位需要類型斷言：`as Record<string, number>`

**範例結構**：
```typescript
import { prisma } from '@/services/database/prisma.service';
import { createSuccessResponse } from '@/utils/response-helper';

export const saveResult = async (userId: number, data: QuizResultData) => {
  // 實現邏輯
  return createSuccessResponse(result);
};

export const quizService = {
  saveResult,
  getLatestResult
};
```

---

### 任務 5.1: 創建控制器

參考文件：`backend-simple-plan.md` 第 314-366 行

**關鍵點**：
- 使用 `asyncHandler` 包裝（自動處理錯誤）
- 從 `req.user!.id` 獲取用戶 ID
- 使用 Zod schema 驗證響應
- 拋出自定義錯誤：`throw new NotFoundError()`
- 函數式導出

**範例結構**：
```typescript
import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error.middleware';

export const saveResult = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const response = await quizService.saveResult(userId, req.body);
  const validated = saveQuizResultResponseSchema.parse(response);
  res.status(201).json(validated);
});

export const quizController = {
  saveResult,
  getLatestResult
};
```

---

### 任務 6.1: 創建路由

參考文件：`backend-simple-plan.md` 第 368-402 行

**關鍵點**：
- 使用 `authenticate` 而非 `authenticateJWT`
- 使用 `validate(schema, 'body')` 驗證
- 控制器方法需 `as RequestHandler` 類型斷言
- 所有路由都需要認證

**範例結構**：
```typescript
import { Router, RequestHandler } from 'express';
import { authenticate } from '@/middleware/auth';
import { validate } from '@/middleware/validation.middleware';

const router = Router();

// 全局認證
router.use(authenticate);

router.post(
  '/',
  validate(saveQuizResultSchema, 'body'),
  quizController.saveResult as RequestHandler
);

export default router;
```

---

### 任務 7.1: 註冊路由

參考文件：`backend-simple-plan.md` 第 404-410 行

在 `src/app.ts` 中添加：

```typescript
// 1. 導入路由（約 line 36 附近）
import quizRoutes from './routes/quiz.routes';

// 2. 註冊路由（約 line 228 之後，在其他 v1 路由之後）
app.use('/api/v1/quizResults', quizRoutes);
console.log('📝 v1 測驗結果路由已註冊 - 可在 /api/v1/quizResults 訪問');
```

**位置建議**：放在 `practiceRoutes` 之後，`db-info` 路由之前

---

## 🧪 測試用例

### 測試 1: 保存測驗結果

**請求**：
```http
POST http://localhost:3000/api/v1/quizResults
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json

{
  "resultType": "a",
  "scores": {
    "L": 10,
    "C": 8,
    "A": 12,
    "D": 6,
    "O": 9
  },
  "answers": {
    "1": { "selectedAnswer": "A" },
    "2": { "selectedAnswer": "L" }
  }
}
```

**預期響應** (201 Created)：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "resultType": "A",
    "completedAt": "2026-01-07T10:30:00.000Z"
  },
  "timestamp": "2026-01-07T10:30:00.000Z"
}
```

---

### 測試 2: 獲取最新結果

**請求**：
```http
GET http://localhost:3000/api/v1/quizResults/latest
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**預期響應** (200 OK)：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "resultType": "A",
    "scores": {
      "L": 10,
      "C": 8,
      "A": 12,
      "D": 6,
      "O": 9
    },
    "completedAt": "2026-01-07T10:30:00.000Z"
  },
  "timestamp": "2026-01-07T10:30:00.000Z"
}
```

---

### 測試 3: 未認證訪問

**請求**：
```http
POST http://localhost:3000/api/v1/quizResults
Content-Type: application/json

{
  "resultType": "a",
  "scores": { "L": 10 }
}
```

**預期響應** (401 Unauthorized)：
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未授權訪問"
  },
  "timestamp": "2026-01-07T10:30:00.000Z"
}
```

---

### 測試 4: 無效數據

**請求**：
```http
POST http://localhost:3000/api/v1/quizResults
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json

{
  "resultType": "X",
  "scores": { "L": "invalid" }
}
```

**預期響應** (400 Bad Request)：
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "數據驗證失敗",
    "details": {
      "resultType": "結果類型必須是 L, C, A, D, O 其中之一",
      "scores.L": "Expected number, received string"
    }
  },
  "timestamp": "2026-01-07T10:30:00.000Z"
}
```

---

## ⚠️ 重要注意事項

### 專案架構慣例
根據 `backend-simple-plan.md` 第 512-582 行，以下是必須遵循的專案慣例：

1. **Prisma Client 導入**
   ```typescript
   // ✅ 正確
   import { prisma } from '@/services/database/prisma.service';

   // ❌ 錯誤
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   ```

2. **Service 層模式**
   - 使用函數式導出，不使用類
   - 返回 `ApiResponse<T>` 類型
   - 使用 `createSuccessResponse` 構建響應
   - 對象集合導出：`export const serviceName = { method1, method2 }`

3. **Controller 層模式**
   - 使用 `asyncHandler` 自動處理錯誤
   - 驗證響應格式：`schema.parse(response)`
   - 直接使用 `res.json()`，不使用額外的 helper
   - 拋出錯誤而非返回錯誤響應

4. **路由配置**
   - 使用 `authenticate` 而非 `authenticateJWT`
   - 控制器方法需 `as RequestHandler` 類型斷言
   - 驗證器第二參數明確指定：`validate(schema, 'body')`

5. **錯誤處理**
   - 使用自定義錯誤類：`NotFoundError`, `BadRequestError` 等
   - 在 controller 中 throw error，由全局錯誤處理器統一處理

### Path Aliases
專案配置了以下路徑別名（參考 CLAUDE.md）：
- `@/*` → `src/*`
- `@types/*` → `src/types/*`
- `@services/*` → `src/services/*`

### 開發流程
1. 修改 Prisma schema 後必須運行 `pnpm run prisma:generate`
2. 提交代碼前運行 `pnpm run typecheck` 和 `pnpm run lint`
3. 使用 `pnpm run dev` 啟動開發服務器

---

## 📚 參考文件

### 專案內部文件
- **後端方案**：`doc/quiz-store/backend-simple-plan.md`
- **數據庫腳本**：`daodao-storage/init-scripts-refactored/640_create_table_quiz_results.sql`
- **專案指南**：`daodao-server/CLAUDE.md`

### 參考實現
- **Prisma 服務**：`daodao-server/src/services/database/prisma.service.ts`
- **Service 範例**：`daodao-server/src/services/auth/auth.service.ts`
- **Controller 範例**：`daodao-server/src/controllers/auth.controller.ts`
- **Route 範例**：`daodao-server/src/routes/idea.routes.ts`
- **Validator 範例**：`daodao-server/src/validators/auth.validators.ts`

---

## 📊 進度追蹤

| 階段 | 任務數 | 完成數 | 進度 |
|------|--------|--------|------|
| 階段一：資料庫準備 | 3 | 1 | 33% |
| 階段二：類型定義 | 1 | 0 | 0% |
| 階段三：驗證層 | 1 | 0 | 0% |
| 階段四：服務層 | 1 | 0 | 0% |
| 階段五：控制器層 | 1 | 0 | 0% |
| 階段六：路由層 | 1 | 0 | 0% |
| 階段七：路由註冊 | 1 | 0 | 0% |
| 階段八：測試驗證 | 4 | 0 | 0% |
| **總計** | **13** | **1** | **8%** |

---

## ✅ 實施檢查清單

### 在開始實施前

- [ ] 已閱讀 `backend-simple-plan.md` 了解業務邏輯
- [ ] 已查看 `640_create_table_quiz_results.sql` 了解數據結構
- [ ] 已閱讀 `CLAUDE.md` 了解專案架構
- [ ] 已查看參考實現文件了解代碼風格
- [ ] 已安裝所有依賴：`pnpm install`
- [ ] 數據庫已正確配置並可連接
- [ ] 已有有效的 JWT token 用於測試
- [ ] **已創建功能分支**：`git checkout -b feature/quiz-results-backend`

### 實施過程中

- [ ] 每完成一個階段，運行 `pnpm run typecheck`
- [ ] Prisma schema 修改後立即運行 `pnpm run prisma:generate`
- [ ] 代碼遵循專案架構慣例（參考第 512-582 行）
- [ ] 所有函數都有 JSDoc 註釋
- [ ] 使用 Path aliases (`@/*`) 而非相對路徑
- [ ] **按階段提交代碼**：使用有意義的 commit message
- [ ] **Commit message 遵循規範**：`feat(quiz): <description>`

### 實施完成後

- [ ] 所有類型檢查通過
- [ ] Lint 檢查通過
- [ ] 開發服務器成功啟動
- [ ] 所有 API 端點測試通過
- [ ] 錯誤情況正確處理（401, 404, 400）
- [ ] 響應格式符合標準 `ApiResponse<T>`
- [ ] **推送到遠端**：`git push -u origin feature/quiz-results-backend`
- [ ] **創建 Pull Request**：包含完整的變更說明和測試結果

---

## 🎯 預期成果

完成所有任務後，應達成以下目標：

1. ✅ 數據庫表 `quiz_results` 可通過 Prisma 訪問
2. ✅ 提供 2 個 API 端點：
   - `POST /api/v1/quizResults` - 保存測驗結果
   - `GET /api/v1/quizResults/latest` - 獲取最新結果
3. ✅ 完整的類型安全（TypeScript + Zod）
4. ✅ 標準化的 API 響應格式
5. ✅ 完善的錯誤處理
6. ✅ JWT 認證保護
7. ✅ 符合專案架構慣例

---

## 🌳 Git 工作流程

### 推薦分支名稱

```bash
feature/quiz-results-backend
```

或者更具體的命名：

```bash
feature/add-quiz-results-api
feature/quiz-results-storage
feat/quiz-results-endpoints
```

### 創建功能分支

```bash
# 從 main/dev 分支創建新分支
git checkout main  # 或 dev
git pull origin main
git checkout -b feature/quiz-results-backend
```

### Commit Message 建議

按照實施階段，建議分階段提交：

#### 階段一：數據庫和 Schema

```bash
git add prisma/schema.prisma generated/
git commit -m "feat(quiz): add quiz_results model to Prisma schema

- Sync quiz_results table from database using prisma db pull
- Add quiz_results relation to users model
- Generate Prisma client types
- Refs: doc/quiz-store/backend-implementation-tasks.md
"
```

#### 階段二-三：類型定義和驗證器

```bash
git add src/types/quiz.types.ts src/validators/quiz.validators.ts
git commit -m "feat(quiz): add quiz types and Zod validators

- Create QuizResultData and QuizResultResponse interfaces
- Add Zod schemas for request validation (resultType, scores, answers)
- Add response validation schemas
- Support result types: L, C, A, D, O
"
```

#### 階段四：服務層

```bash
git add src/services/quiz.service.ts
git commit -m "feat(quiz): implement quiz result service

- Add saveResult() to save quiz results to database
- Add getLatestResult() to fetch user's latest quiz result
- Use Prisma client and standardized ApiResponse format
- Handle JSON serialization for scores and answers
"
```

#### 階段五-六：控制器和路由

```bash
git add src/controllers/quiz.controller.ts src/routes/quiz.routes.ts
git commit -m "feat(quiz): add quiz result controller and routes

- Implement saveResult and getLatestResult controllers
- Add POST /api/v1/quizResults endpoint
- Add GET /api/v1/quizResults/latest endpoint
- Apply JWT authentication middleware
- Add Zod validation middleware
"
```

#### 階段七：路由註冊

```bash
git add src/app.ts
git commit -m "feat(quiz): register quiz routes in app

- Mount quiz routes at /api/v1/quizResults
- Add startup logging for quiz endpoints
"
```

#### 最終提交（如果需要修正）

```bash
git add .
git commit -m "fix(quiz): address code review comments

- Fix TypeScript type issues
- Update error handling
- Add missing JSDoc comments
"
```

### 完整的工作流程

```bash
# 1. 創建分支
git checkout -b feature/quiz-results-backend

# 2. 實施功能（按階段提交）
# ... 開發過程 ...

# 3. 確保所有測試通過
pnpm run typecheck
pnpm run lint
pnpm run dev  # 手動測試 API

# 4. 推送到遠端
git push -u origin feature/quiz-results-backend

# 5. 創建 Pull Request
gh pr create --title "feat: add quiz results backend API" --body "
## 摘要
實現測驗結果儲存功能後端 API

## 變更內容
- ✅ Prisma schema 更新（quiz_results 模型）
- ✅ 類型定義和驗證器（Zod schemas）
- ✅ 服務層實現（saveResult, getLatestResult）
- ✅ 控制器和路由配置
- ✅ JWT 認證保護

## API 端點
- POST /api/v1/quizResults - 保存測驗結果
- GET /api/v1/quizResults/latest - 獲取最新結果

## 測試
- [x] TypeScript 類型檢查通過
- [x] ESLint 檢查通過
- [x] 手動測試所有端點（Postman）
- [x] 認證測試（401）
- [x] 驗證測試（400）

## 參考文件
- doc/quiz-store/backend-simple-plan.md
- doc/quiz-store/backend-implementation-tasks.md
"
```

### Commit Message 規範

專案使用 Conventional Commits 格式：

**格式**：
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 類型**：
- `feat`: 新功能
- `fix`: 錯誤修復
- `docs`: 文檔更新
- `refactor`: 代碼重構
- `test`: 測試相關
- `chore`: 構建/工具相關

**Scope 範圍**：
- `quiz`: 測驗功能相關
- `api`: API 相關
- `db`: 數據庫相關
- `types`: 類型定義相關

**範例**：
```bash
feat(quiz): add quiz results storage API
fix(quiz): correct result type validation
docs(quiz): update API documentation
refactor(quiz): simplify service layer logic
```

---

## 🚀 下一步

完成後端實施後，可以進行：

1. **前端整合**：參考 `backend-simple-plan.md` 第 442-483 行
2. **單元測試**：為 service 和 controller 編寫測試
3. **API 文檔**：生成 OpenAPI 文檔（`pnpm run openapi:generate`）
4. **部署準備**：更新 Docker 配置和環境變數

---

**預估完成時間**：30-45 分鐘（不含測試）
**難度等級**：⭐⭐ 中等
**前置知識**：TypeScript, Express.js, Prisma, Zod
