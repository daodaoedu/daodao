# 測驗結果儲存 - 簡化方案

## 核心概念

前端已經有完整的測驗系統，後端**只需要保存結果**，不需要管題目、答案、計分邏輯。

---

## 資料庫設計（最簡化）

### Prisma Schema

```prisma
// 只需要一個表
model QuizResult {
  id           Int      @id @default(autoincrement())
  user_id      Int
  result_type  String   @db.VarChar(1)  // 'L', 'C', 'A', 'D', 'O'
  scores       Json     // { "L": 10, "C": 8, "A": 12, "D": 6, "O": 9 }
  answers      Json?    // 原始答案（選用，用於未來分析）
  completed_at DateTime @default(now())

  user         users    @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("quiz_results")
  @@index([user_id])
  @@index([completed_at])
}
```

---

## API 設計（2 個端點就夠）

### 1. 保存測驗結果

**請求**:
```http
POST /api/v1/quiz-results
Authorization: Bearer <JWT_TOKEN>
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

**響應**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "resultType": "a",
    "completedAt": "2025-12-18T10:35:00Z"
  },
  "timestamp": "2025-12-18T10:35:00Z"
}
```

### 2. 取得最新測驗結果

**請求**:
```http
GET /api/v1/quiz-results/latest
Authorization: Bearer <JWT_TOKEN>
```

**響應**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "resultType": "a",
    "scores": {
      "L": 10,
      "C": 8,
      "A": 12,
      "D": 6,
      "O": 9
    },
    "completedAt": "2025-12-18T10:35:00Z"
  },
  "timestamp": "2025-12-18T10:36:00Z"
}
```

---

## 認證系統說明

### 如何識別用戶？

項目已經有完整的 JWT 認證系統，工作流程如下：

1. **用戶登入** → 後端生成 JWT Token 返回給前端
2. **前端保存 Token** → 存在 localStorage 或 cookie
3. **每次請求帶上 Token** → Header: `Authorization: Bearer <token>`
4. **後端驗證** → `authenticateJWT` 中間件自動解析 token
5. **取得用戶資訊** → `req.user` 包含用戶 ID、email、roles 等

### JWT Payload 內容

```typescript
interface UserJwtPayload {
  id: number;           // ✅ 用戶 ID（主鍵）
  email?: string;       // 郵箱
  roles?: string[];     // 角色列表
  permissions?: string[]; // 權限列表
  isTemp?: boolean;     // 是否臨時用戶
  // ... 其他欄位
}
```

### 在控制器中使用

```typescript
export class QuizController {
  async saveResult(req: Request, res: Response) {
    // ✅ 從 req.user.id 取得當前登入用戶的 ID
    const userId = req.user!.id;

    // 保存該用戶的測驗結果
    await quizService.saveResult(userId, req.body);
  }
}
```

**注意**：
- `req.user` 由 `authenticateJWT` 中間件自動填充
- 所有需要認證的路由都必須加上 `authenticateJWT` 中間件
- `!` 運算符表示我們確定 `req.user` 存在（因為通過了認證中間件）

---

## 實作代碼

### 1. 類型定義 (`src/types/quiz.types.ts`)

```typescript
/**
 * 測驗結果請求數據
 */
export interface QuizResultData {
  resultType: string;
  scores: Record<string, number>;
  answers?: Record<string, { selectedAnswer: string }>;
}

/**
 * 測驗結果響應數據
 */
export interface QuizResultResponse {
  id: number;
  resultType: string;
  scores: Record<string, number>;
  completedAt: Date;
}
```

### 2. 驗證器 (`src/validators/quiz.validators.ts`)

```typescript
import { z } from 'zod';
import { apiSuccessResponseSchema } from './common.validators';

/**
 * 測驗結果類型（單字母大寫）
 */
export const resultTypeSchema = z
  .string()
  .length(1)
  .regex(/^[LCADO]$/i, '結果類型必須是 L, C, A, D, O 其中之一')
  .transform(val => val.toUpperCase())
  .describe('測驗結果類型');

/**
 * 分數對象
 */
export const scoresSchema = z
  .record(z.string(), z.number())
  .describe('各類型分數對象');

/**
 * 答案對象（選用）
 */
export const answersSchema = z
  .record(
    z.string(),
    z.object({
      selectedAnswer: z.string()
    })
  )
  .optional()
  .describe('原始答案記錄');

/**
 * 保存測驗結果請求體
 */
export const saveQuizResultSchema = z.object({
  body: z.object({
    resultType: resultTypeSchema,
    scores: scoresSchema,
    answers: answersSchema
  }).describe('保存測驗結果請求資料')
});

/**
 * 測驗結果響應數據結構
 */
export const quizResultDataSchema = z.object({
  id: z.number().describe('結果 ID'),
  resultType: z.string().describe('結果類型'),
  scores: scoresSchema,
  completedAt: z.date().or(z.string()).describe('完成時間')
}).describe('測驗結果數據');

/**
 * 保存測驗結果響應
 */
export const saveQuizResultResponseSchema = apiSuccessResponseSchema(
  quizResultDataSchema
).describe('保存測驗結果成功響應');

/**
 * 取得測驗結果響應
 */
export const getQuizResultResponseSchema = apiSuccessResponseSchema(
  quizResultDataSchema
).describe('取得測驗結果成功響應');

// 導出類型
export type SaveQuizResultRequest = z.infer<typeof saveQuizResultSchema.shape.body>;
export type QuizResultData = z.infer<typeof quizResultDataSchema>;
```

### 3. 服務層 (`src/services/quiz.service.ts`)

```typescript
import { prisma } from './database/prisma.service';
import { createSuccessResponse } from '../utils/response-helper';
import type { ApiResponse } from '../types/api-response.types';
import type { QuizResultData, QuizResultResponse } from '../types/quiz.types';

/**
 * 保存測驗結果
 */
export const saveResult = async (
  userId: number,
  data: QuizResultData
): Promise<ApiResponse<QuizResultResponse>> => {
  const result = await prisma.quizResult.create({
    data: {
      user_id: userId,
      result_type: data.resultType.toUpperCase(),
      scores: data.scores,
      answers: data.answers || null,
      completed_at: new Date()
    }
  });

  return createSuccessResponse({
    id: result.id,
    resultType: result.result_type,
    scores: result.scores as Record<string, number>,
    completedAt: result.completed_at
  });
};

/**
 * 取得用戶最新測驗結果
 */
export const getLatestResult = async (
  userId: number
): Promise<ApiResponse<QuizResultResponse | null>> => {
  const result = await prisma.quizResult.findFirst({
    where: { user_id: userId },
    orderBy: { completed_at: 'desc' }
  });

  if (!result) {
    return createSuccessResponse(null);
  }

  return createSuccessResponse({
    id: result.id,
    resultType: result.result_type,
    scores: result.scores as Record<string, number>,
    completedAt: result.completed_at
  });
};

// 導出服務對象
export const quizService = {
  saveResult,
  getLatestResult
};

export default quizService;
```

### 4. 控制器 (`src/controllers/quiz.controller.ts`)

```typescript
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { quizService } from '../services/quiz.service';
import { NotFoundError } from '../middleware/error.middleware';
import {
  saveQuizResultResponseSchema,
  getQuizResultResponseSchema
} from '../validators/quiz.validators';

/**
 * 保存測驗結果
 */
export const saveResult = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const response = await quizService.saveResult(userId, req.body);

  // 驗證響應格式
  const validatedResponse = saveQuizResultResponseSchema.parse(response);

  res.status(201).json(validatedResponse);
});

/**
 * 取得最新測驗結果
 */
export const getLatestResult = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const response = await quizService.getLatestResult(userId);

  // 如果沒有結果，返回 404
  if (response.data === null) {
    throw new NotFoundError('尚無測驗結果');
  }

  // 驗證響應格式
  const validatedResponse = getQuizResultResponseSchema.parse(response);

  res.json(validatedResponse);
});

// 導出控制器對象
export const quizController = {
  saveResult,
  getLatestResult
};

export default quizController;
```

### 5. 路由 (`src/routes/quiz.routes.ts`)

```typescript
import { Router, RequestHandler } from 'express';
import { quizController } from '../controllers/quiz.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation.middleware';
import { saveQuizResultSchema } from '../validators/quiz.validators';

const router = Router();

// 所有測驗路由都需要認證
router.use(authenticate);

/**
 * POST /api/v1/quiz-results
 * 保存測驗結果
 */
router.post(
  '/',
  validate(saveQuizResultSchema, 'body'),
  quizController.saveResult as RequestHandler
);

/**
 * GET /api/v1/quiz-results/latest
 * 取得最新測驗結果
 */
router.get(
  '/latest',
  quizController.getLatestResult as RequestHandler
);

export default router;
```

### 6. 註冊路由 (`src/app.ts`)

```typescript
import quizRoutes from './routes/quiz.routes';

app.use('/api/v1/quiz-results', quizRoutes);
```

---

## 實施步驟

1. **資料庫遷移**（5 分鐘）
   ```bash
   cd daodao-server
   # 在 schema.prisma 加入 QuizResult 模型
   npx prisma migrate dev --name add_quiz_results
   npx prisma generate
   ```

2. **創建檔案**（15 分鐘）
   - `src/types/quiz.types.ts`
   - `src/validators/quiz.validators.ts`
   - `src/services/quiz.service.ts`
   - `src/controllers/quiz.controller.ts`
   - `src/routes/quiz.routes.ts`

3. **註冊路由**（2 分鐘）
   - 在 `src/app.ts` 加入路由

4. **測試**（10 分鐘）
   - 用 Postman 測試保存和查詢
   - 前端整合測試

**總共約 30 分鐘完成！**

---

## 前端整合範例

```typescript
// 在測驗完成時
const handleQuizComplete = async (analysis: QuizAnalysis) => {
  try {
    const response = await fetch('/api/v1/quiz-results', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resultType: analysis.resultId,
        scores: analysis.scores,
        answers: quizResult  // 原始答案
      })
    });

    const data = await response.json();
    console.log('結果已保存', data);
  } catch (error) {
    console.error('保存失敗', error);
  }
};

// 在登入後取得最新結果
const fetchLatestResult = async () => {
  try {
    const response = await fetch('/api/v1/quiz-results/latest', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    return data.data;  // { id, resultType, scores, completedAt }
  } catch (error) {
    console.error('查詢失敗', error);
  }
};
```

---

## 對比複雜方案

| 項目 | 複雜方案 | 簡化方案 |
|-----|---------|---------|
| 資料表數量 | 4 個 | 1 個 |
| API 端點 | 10+ 個 | 2 個 |
| 程式碼行數 | 800+ | 150 |
| 開發時間 | 7-10 天 | 30 分鐘 |
| 維護成本 | 高 | 低 |

---

## 何時需要複雜方案？

如果未來需要以下功能，再考慮升級：
- 多種測驗（目前只有一種）
- A/B 測試不同題目
- 題目動態更新
- 詳細的答題分析
- 管理後台修改題目

**但目前需求：保存結果 + 查詢最新結果，簡化方案完全足夠！**

---

## 📝 關鍵實作要點（專案慣例）

本文件已根據專案實際架構模式調整，以下是關鍵要點：

### 1. Prisma Client 使用方式

```typescript
// ✅ 正確：使用專案的單例服務
import { prisma } from './database/prisma.service';

// ❌ 錯誤：不要直接創建實例
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

### 2. Service 層架構

- **函數式導出**：使用獨立函數而非類
- **返回 ApiResponse**：所有 service 方法返回 `ApiResponse<T>`
- **使用 createSuccessResponse**：構建標準響應格式
- **對象集合導出**：`export const serviceName = { method1, method2 }`

### 3. Controller 層架構

- **使用 asyncHandler**：自動處理異步錯誤，無需 try-catch
- **驗證響應格式**：使用 Zod schema 驗證響應
- **直接 json()**：不使用 successResponse 輔助函數
- **函數式導出**：與 service 層一致

### 4. 驗證器設計

- **完整的 Zod Schema**：包含 `.describe()` 和錯誤訊息
- **響應 Schema**：定義並驗證 API 響應格式
- **類型導出**：使用 `z.infer` 生成 TypeScript 類型

### 5. 路由配置

- **使用 authenticate**：而非 authenticateJWT
- **RequestHandler 斷言**：`as RequestHandler` 確保類型安全
- **驗證器第二參數**：明確指定 `validate(schema, 'body')`

### 6. 錯誤處理

- **自訂錯誤類**：使用 `NotFoundError`、`BadRequestError` 等
- **拋出而非返回**：在 controller 中 throw error
- **全域錯誤處理**：由 globalErrorHandler 統一處理

### 7. 實作檢查清單

實作前請確認：

- [ ] Prisma 從 `@/services/database/prisma.service` 導入
- [ ] Service 返回 `ApiResponse<T>` 類型
- [ ] Controller 使用 `asyncHandler` 包裝
- [ ] Controller 驗證響應：`schema.parse(response)`
- [ ] 路由方法加上 `as RequestHandler`
- [ ] 驗證器包含響應 schema 定義
- [ ] 錯誤使用自訂錯誤類（throw new NotFoundError()）

---

## 🔗 參考專案現有實現

建議實作前先參考這些文件：

- **Prisma 服務**: `daodao-server/src/services/database/prisma.service.ts`
- **Service 範例**: `daodao-server/src/services/auth/auth.service.ts`
- **Controller 範例**: `daodao-server/src/controllers/auth.controller.ts`
- **Route 範例**: `daodao-server/src/routes/idea.routes.ts`
- **Validator 範例**: `daodao-server/src/validators/auth.validators.ts`

完整的模式對比請參考：`doc/quiz-store/pattern-comparison.md`
