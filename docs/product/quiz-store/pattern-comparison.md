# 文件建議 vs 專案實際模式對比

## ❌ 不符合專案慣例的部分

### 1. **Prisma Client 實例化方式**

**文件建議**:
```typescript
// ❌ 直接在 service 中創建
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

**專案實際模式**:
```typescript
// ✅ 使用單例服務
import { prisma } from '../services/database/prisma.service';
// 或
import { prismaService } from '@/services/database/prisma.service';
const prisma = prismaService.getClient();
```

---

### 2. **Service 層導出方式**

**文件建議**:
```typescript
// ❌ 類實例導出
export class QuizService {
  async saveResult() { ... }
}
export const quizService = new QuizService();
```

**專案實際模式**:
```typescript
// ✅ 函數式導出 + 對象集合
export const saveResult = async (userId: number, data: QuizResultData): Promise<ApiResponse<QuizResultResponse>> => {
  const result = await prisma.quizResult.create({ ... });
  return createSuccessResponse({
    id: result.id,
    resultType: result.result_type,
    scores: result.scores,
    completedAt: result.completed_at
  });
};

export const getLatestResult = async (userId: number): Promise<ApiResponse<QuizResultResponse | null>> => {
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
    scores: result.scores,
    completedAt: result.completed_at
  });
};

export const quizService = {
  saveResult,
  getLatestResult
};

export default quizService;
```

---

### 3. **Service 返回類型**

**文件建議**:
```typescript
// ❌ 直接返回數據
async saveResult(userId: number, data: QuizResultData): Promise<QuizResultResponse> {
  const result = await prisma.quizResult.create({ ... });
  return { id: result.id, resultType: result.result_type, ... };
}
```

**專案實際模式**:
```typescript
// ✅ 返回標準 ApiResponse
async saveResult(userId: number, data: QuizResultData): Promise<ApiResponse<QuizResultResponse>> {
  const result = await prisma.quizResult.create({ ... });
  return createSuccessResponse({
    id: result.id,
    resultType: result.result_type,
    scores: result.scores as Record<string, number>,
    completedAt: result.completed_at
  });
}
```

---

### 4. **Controller 錯誤處理**

**文件建議**:
```typescript
// ❌ 手動 try-catch
async saveResult(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await quizService.saveResult(userId, req.body);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
```

**專案實際模式**:
```typescript
// ✅ 使用 asyncHandler 包裝
export const saveResult = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const response = await quizService.saveResult(userId, req.body);

  // 驗證響應格式
  const validatedResponse = saveQuizResultResponseSchema.parse(response);
  res.json(validatedResponse);
});
```

---

### 5. **Controller 導出方式**

**文件建議**:
```typescript
// ❌ 類實例導出
export class QuizController {
  async saveResult() { ... }
}
export const quizController = new QuizController();
```

**專案實際模式**:
```typescript
// ✅ 函數式導出
export const saveResult = asyncHandler(async (req: Request, res: Response) => { ... });
export const getLatestResult = asyncHandler(async (req: Request, res: Response) => { ... });

export const quizController = {
  saveResult,
  getLatestResult
};

export default quizController;
```

---

### 6. **Response Helper 使用**

**文件建議**:
```typescript
// ❌ 在 Controller 中構建響應
return successResponse(res, result);
```

**專案實際模式**:
```typescript
// ✅ Service 返回 ApiResponse，Controller 直接 json()
// Service 層
return createSuccessResponse(data);

// Controller 層
const response = await quizService.someMethod();
const validatedResponse = responseSchema.parse(response);
res.json(validatedResponse);
```

---

### 7. **Route 類型安全**

**文件建議**:
```typescript
// ❌ 直接使用 controller 方法
router.post('/', validate(schema), quizController.saveResult);
```

**專案實際模式**:
```typescript
// ✅ 使用 RequestHandler 類型斷言
import { RequestHandler } from 'express';

router.post('/',
  authenticate,
  validate(saveQuizResultSchema, 'body'),
  quizController.saveResult as RequestHandler
);
```

---

### 8. **認證中間件命名**

**文件建議**:
```typescript
// ❌ 使用 authenticateJWT
import { authenticateJWT } from '../middleware/auth';
router.use(authenticateJWT);
```

**專案實際模式**:
```typescript
// ✅ 使用 authenticate（簡化別名）
import { authenticate } from '@/middleware/auth';
router.use(authenticate);

// 或選項式驗證
import { authenticateWithOptions } from '@/middleware/auth';
router.use(authenticateWithOptions({ required: true, allowTemp: false }));
```

---

## ✅ 符合專案慣例的部分

1. ✅ **Zod 驗證器定義方式** - 完全符合
2. ✅ **JWT Payload 類型定義** - 結構一致
3. ✅ **路由結構** - 使用 Router() 和中間件鏈
4. ✅ **Prisma Schema 設計** - 索引和關聯設置合理
5. ✅ **API 端點設計** - RESTful 風格正確

---

## 📝 修正後的實現代碼

### 1. Service 層 (`src/services/quiz.service.ts`)

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

---

### 2. Controller 層 (`src/controllers/quiz.controller.ts`)

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

---

### 3. 驗證器 (`src/validators/quiz.validators.ts`)

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

---

### 4. 路由 (`src/routes/quiz.routes.ts`)

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

---

### 5. 類型定義 (`src/types/quiz.types.ts`)

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

---

## 🎯 關鍵差異總結

| 項目 | 文件建議 | 專案實際 | 影響 |
|------|---------|---------|------|
| **Prisma 實例化** | 直接 new | 單例服務 | ⚠️ 高：資源管理 |
| **Service 導出** | 類實例 | 函數對象 | ⚠️ 高：架構一致性 |
| **Service 返回** | 直接數據 | ApiResponse | ⚠️ 高：響應格式 |
| **Controller 包裝** | try-catch | asyncHandler | ⚠️ 中：錯誤處理 |
| **Controller 導出** | 類實例 | 函數對象 | ⚠️ 高：架構一致性 |
| **響應驗證** | 無 | Zod 驗證 | ⚠️ 中：類型安全 |
| **中間件命名** | authenticateJWT | authenticate | ⚠️ 低：命名慣例 |
| **類型斷言** | 無 | RequestHandler | ⚠️ 低：類型安全 |

---

## 📋 實施檢查清單

在實作測驗結果儲存功能時，請確認：

- [ ] 使用 `prisma` from `@/services/database/prisma.service`
- [ ] Service 函數返回 `ApiResponse<T>`
- [ ] Service 使用 `createSuccessResponse()` 構建響應
- [ ] Service 導出為函數對象 `export const serviceName = { method1, method2 }`
- [ ] Controller 使用 `asyncHandler` 包裝
- [ ] Controller 驗證響應 schema：`responseSchema.parse(response)`
- [ ] Controller 導出為函數對象
- [ ] 路由使用 `authenticate` 中間件
- [ ] 路由使用 `validate(schema, 'body')` 驗證
- [ ] 路由方法加上 `as RequestHandler` 類型斷言
- [ ] 驗證器使用 Zod 並加上 `.describe()` 和 `.meta()`
- [ ] 響應 schema 使用 `apiSuccessResponseSchema(dataSchema)`
- [ ] 類型定義放在 `src/types/` 目錄
- [ ] 錯誤使用自訂錯誤類（如 `NotFoundError`）

---

## 🔗 參考文件路徑

實作時請參考以下現有實現：

- **Prisma 服務**: `src/services/database/prisma.service.ts`
- **Service 範例**: `src/services/auth/auth.service.ts`
- **Controller 範例**: `src/controllers/auth.controller.ts`
- **Route 範例**: `src/routes/idea.routes.ts`
- **Validator 範例**: `src/validators/auth.validators.ts`
- **Type 定義**: `src/types/auth.types.ts`
- **Response Helper**: `src/utils/response-helper.ts`
- **Error Classes**: `src/middleware/error.middleware.ts`
