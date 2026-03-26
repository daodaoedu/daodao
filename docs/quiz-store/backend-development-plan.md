# 測驗結果儲存系統 - 後端開發規劃文件

## 一、需求概述

### 功能需求
- 測驗完成後要儲存結果
- 使用者可以在登入後看到他的最新的測驗結果

### 技術需求
- 與現有的 Google OAuth + JWT 認證系統整合
- 遵循項目現有的架構模式（TypeScript + Express + Prisma）
- 使用統一的 API 響應格式
- 完整的資料驗證和錯誤處理

---

## 二、資料庫設計

### 2.1 Prisma Schema 定義

在 `daodao-server/prisma/schema.prisma` 中新增以下模型：

```prisma
// 測驗定義表
model Quiz {
  id          Int      @id @default(autoincrement())
  title       String   @db.VarChar(255)
  description String?  @db.Text
  version     String   @db.VarChar(50) @default("1.0")
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  questions   QuizQuestion[]
  results     QuizResult[]

  @@map("quizzes")
}

// 測驗題目表
model QuizQuestion {
  id            Int      @id @default(autoincrement())
  quiz_id       Int
  question_text String   @db.Text
  question_type String   @db.VarChar(50) // 'single_choice', 'multiple_choice', 'scale'
  options       Json     // 題目選項（JSON 格式）
  order         Int      // 題目順序
  weight        Float?   @default(1.0) // 題目權重
  dimension     String?  @db.VarChar(100) // 維度/類別
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  quiz          Quiz     @relation(fields: [quiz_id], references: [id], onDelete: Cascade)
  answers       QuizAnswer[]

  @@map("quiz_questions")
  @@index([quiz_id])
}

// 測驗結果表
model QuizResult {
  id          Int      @id @default(autoincrement())
  user_id     Int
  quiz_id     Int
  started_at  DateTime @default(now())
  completed_at DateTime?
  total_score Float?
  scores      Json?    // 各維度分數（JSON 格式）
  status      String   @db.VarChar(50) @default("in_progress") // 'in_progress', 'completed', 'abandoned'
  metadata    Json?    // 其他元數據
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  user        users    @relation(fields: [user_id], references: [id], onDelete: Cascade)
  quiz        Quiz     @relation(fields: [quiz_id], references: [id], onDelete: Cascade)
  answers     QuizAnswer[]

  @@map("quiz_results")
  @@index([user_id])
  @@index([quiz_id])
  @@index([user_id, quiz_id])
  @@index([completed_at])
}

// 測驗答案表
model QuizAnswer {
  id              Int      @id @default(autoincrement())
  result_id       Int
  question_id     Int
  answer_value    Json     // 用戶答案（JSON 格式，支持單選、多選、量表）
  answered_at     DateTime @default(now())
  time_spent      Int?     // 答題耗時（秒）

  result          QuizResult   @relation(fields: [result_id], references: [id], onDelete: Cascade)
  question        QuizQuestion @relation(fields: [question_id], references: [id], onDelete: Cascade)

  @@map("quiz_answers")
  @@unique([result_id, question_id])
  @@index([result_id])
  @@index([question_id])
}
```

### 2.2 資料庫遷移指令

```bash
cd daodao-server
npx prisma migrate dev --name add_quiz_system
npx prisma generate
```

---

## 三、API 端點設計

### 3.1 API 路由規劃

基於項目現有的 `/api/v1/` 結構：

```
測驗管理 (僅管理員)
├── GET    /api/v1/quizzes                    # 取得所有測驗列表
├── GET    /api/v1/quizzes/:quizId            # 取得單個測驗詳情
├── POST   /api/v1/quizzes                    # 創建新測驗（管理員）
├── PUT    /api/v1/quizzes/:quizId            # 更新測驗（管理員）
└── DELETE /api/v1/quizzes/:quizId            # 刪除測驗（管理員）

測驗題目管理 (僅管理員)
├── GET    /api/v1/quizzes/:quizId/questions  # 取得測驗題目列表
├── POST   /api/v1/quizzes/:quizId/questions  # 新增題目
├── PUT    /api/v1/quizzes/:quizId/questions/:questionId  # 更新題目
└── DELETE /api/v1/quizzes/:quizId/questions/:questionId  # 刪除題目

用戶測驗結果 (認證用戶)
├── POST   /api/v1/quiz-results/start         # 開始測驗（創建新結果記錄）
├── POST   /api/v1/quiz-results/:resultId/answers  # 提交答案
├── POST   /api/v1/quiz-results/:resultId/complete # 完成測驗
├── GET    /api/v1/quiz-results/me            # 取得我的所有測驗結果
├── GET    /api/v1/quiz-results/me/latest    # 取得我的最新測驗結果 ⭐核心需求
├── GET    /api/v1/quiz-results/:resultId    # 取得單個測驗結果詳情
└── GET    /api/v1/quiz-results/:resultId/report  # 取得測驗報告

統計分析 (認證用戶)
└── GET    /api/v1/quiz-results/me/stats     # 我的測驗統計
```

### 3.2 詳細 API 規格

#### 3.2.1 開始測驗

**請求**:
```http
POST /api/v1/quiz-results/start
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "quizId": 1
}
```

**響應**:
```json
{
  "success": true,
  "data": {
    "resultId": 123,
    "quizId": 1,
    "status": "in_progress",
    "startedAt": "2025-12-18T10:30:00Z"
  },
  "timestamp": "2025-12-18T10:30:00Z"
}
```

#### 3.2.2 提交答案

**請求**:
```http
POST /api/v1/quiz-results/123/answers
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "answers": [
    {
      "questionId": 1,
      "answerValue": "option_a",
      "timeSpent": 15
    },
    {
      "questionId": 2,
      "answerValue": ["option_b", "option_c"],
      "timeSpent": 20
    },
    {
      "questionId": 3,
      "answerValue": 4,
      "timeSpent": 10
    }
  ]
}
```

**響應**:
```json
{
  "success": true,
  "data": {
    "saved": 3,
    "resultId": 123
  },
  "timestamp": "2025-12-18T10:31:00Z"
}
```

#### 3.2.3 完成測驗

**請求**:
```http
POST /api/v1/quiz-results/123/complete
Authorization: Bearer <JWT_TOKEN>
```

**響應**:
```json
{
  "success": true,
  "data": {
    "resultId": 123,
    "status": "completed",
    "completedAt": "2025-12-18T10:35:00Z",
    "totalScore": 85.5,
    "scores": {
      "learning_style": 78,
      "motivation": 92,
      "time_management": 86
    }
  },
  "timestamp": "2025-12-18T10:35:00Z"
}
```

#### 3.2.4 取得最新測驗結果 ⭐

**請求**:
```http
GET /api/v1/quiz-results/me/latest?quizId=1
Authorization: Bearer <JWT_TOKEN>
```

**響應**:
```json
{
  "success": true,
  "data": {
    "resultId": 123,
    "quizId": 1,
    "quizTitle": "學習風格測驗",
    "status": "completed",
    "startedAt": "2025-12-18T10:30:00Z",
    "completedAt": "2025-12-18T10:35:00Z",
    "totalScore": 85.5,
    "scores": {
      "learning_style": 78,
      "motivation": 92,
      "time_management": 86
    },
    "answers": [
      {
        "questionId": 1,
        "questionText": "你喜歡如何學習新知識？",
        "answerValue": "option_a",
        "answeredAt": "2025-12-18T10:30:15Z"
      }
    ]
  },
  "timestamp": "2025-12-18T10:36:00Z"
}
```

#### 3.2.5 取得我的所有測驗結果

**請求**:
```http
GET /api/v1/quiz-results/me?page=1&limit=10&quizId=1&status=completed
Authorization: Bearer <JWT_TOKEN>
```

**響應**:
```json
{
  "success": true,
  "data": [
    {
      "resultId": 123,
      "quizId": 1,
      "quizTitle": "學習風格測驗",
      "status": "completed",
      "startedAt": "2025-12-18T10:30:00Z",
      "completedAt": "2025-12-18T10:35:00Z",
      "totalScore": 85.5
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "timestamp": "2025-12-18T10:37:00Z"
}
```

---

## 四、目錄結構與檔案規劃

### 4.1 新增檔案清單

```
daodao-server/src/
├── controllers/
│   └── quiz-result.controller.ts         # 測驗結果控制器（新增）
├── routes/
│   └── quiz-result.routes.ts             # 測驗結果路由（新增）
├── services/
│   ├── quiz-result.service.ts            # 測驗結果服務（新增）
│   ├── quiz-scoring.service.ts           # 計分服務（新增）
│   └── quiz-analytics.service.ts         # 分析服務（新增，選用）
├── validators/
│   └── quiz-result.validators.ts         # 驗證器（新增）
├── types/
│   └── quiz.types.ts                     # 測驗類型定義（新增）
└── swagger/
    └── quiz-result.swagger.ts            # API 文檔定義（新增）
```

### 4.2 修改檔案清單

```
daodao-server/src/
├── app.ts                                 # 註冊新路由
└── types/express.d.ts                     # 擴展 Express Request 類型（如需要）
```

---

## 五、實現細節

### 5.1 類型定義 (`src/types/quiz.types.ts`)

```typescript
export interface QuizQuestion {
  id: number;
  quizId: number;
  questionText: string;
  questionType: 'single_choice' | 'multiple_choice' | 'scale';
  options: QuizQuestionOption[];
  order: number;
  weight?: number;
  dimension?: string;
}

export interface QuizQuestionOption {
  id: string;
  text: string;
  value: string | number;
  score?: number;
}

export interface QuizAnswer {
  questionId: number;
  answerValue: string | number | string[];
  timeSpent?: number;
}

export interface QuizResult {
  id: number;
  userId: number;
  quizId: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: Date;
  completedAt?: Date;
  totalScore?: number;
  scores?: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface QuizResultWithDetails extends QuizResult {
  quizTitle: string;
  answers: Array<{
    questionId: number;
    questionText: string;
    answerValue: string | number | string[];
    answeredAt: Date;
  }>;
}

export interface QuizStats {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  lastAttemptDate?: Date;
}
```

### 5.2 驗證器 (`src/validators/quiz-result.validators.ts`)

```typescript
import { z } from 'zod';

export const startQuizSchema = z.object({
  body: z.object({
    quizId: z.number().int().positive({
      message: 'quizId 必須是正整數'
    })
  })
});

export const submitAnswersSchema = z.object({
  params: z.object({
    resultId: z.string().regex(/^\d+$/, 'resultId 必須是數字')
  }),
  body: z.object({
    answers: z.array(
      z.object({
        questionId: z.number().int().positive(),
        answerValue: z.union([
          z.string(),
          z.number(),
          z.array(z.string())
        ]),
        timeSpent: z.number().int().min(0).optional()
      })
    ).min(1, '至少需要提交一個答案')
  })
});

export const completeQuizSchema = z.object({
  params: z.object({
    resultId: z.string().regex(/^\d+$/, 'resultId 必須是數字')
  })
});

export const getMyResultsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().default('1'),
    limit: z.string().regex(/^\d+$/).optional().default('10'),
    quizId: z.string().regex(/^\d+$/).optional(),
    status: z.enum(['in_progress', 'completed', 'abandoned']).optional()
  })
});

export const getLatestResultSchema = z.object({
  query: z.object({
    quizId: z.string().regex(/^\d+$/, 'quizId 必須是數字')
  })
});
```

### 5.3 服務層 (`src/services/quiz-result.service.ts`)

```typescript
import { PrismaClient, QuizResult as PrismaQuizResult } from '@prisma/client';
import { QuizAnswer, QuizResultWithDetails } from '../types/quiz.types';

const prisma = new PrismaClient();

export class QuizResultService {
  /**
   * 開始新的測驗
   */
  async startQuiz(userId: number, quizId: number): Promise<PrismaQuizResult> {
    // 檢查測驗是否存在且啟用
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, is_active: true }
    });

    if (!quiz) {
      throw new Error('測驗不存在或已停用');
    }

    // 創建新的測驗結果記錄
    const result = await prisma.quizResult.create({
      data: {
        user_id: userId,
        quiz_id: quizId,
        status: 'in_progress',
        started_at: new Date()
      }
    });

    return result;
  }

  /**
   * 提交答案
   */
  async submitAnswers(
    resultId: number,
    userId: number,
    answers: QuizAnswer[]
  ): Promise<{ saved: number }> {
    // 驗證結果記錄屬於該用戶
    const result = await prisma.quizResult.findFirst({
      where: { id: resultId, user_id: userId }
    });

    if (!result) {
      throw new Error('測驗結果不存在或無權限');
    }

    if (result.status !== 'in_progress') {
      throw new Error('測驗已完成，無法提交答案');
    }

    // 批次插入/更新答案
    const savePromises = answers.map(answer =>
      prisma.quizAnswer.upsert({
        where: {
          result_id_question_id: {
            result_id: resultId,
            question_id: answer.questionId
          }
        },
        create: {
          result_id: resultId,
          question_id: answer.questionId,
          answer_value: answer.answerValue,
          time_spent: answer.timeSpent,
          answered_at: new Date()
        },
        update: {
          answer_value: answer.answerValue,
          time_spent: answer.timeSpent,
          answered_at: new Date()
        }
      })
    );

    await Promise.all(savePromises);

    return { saved: answers.length };
  }

  /**
   * 完成測驗並計算分數
   */
  async completeQuiz(
    resultId: number,
    userId: number
  ): Promise<PrismaQuizResult> {
    // 驗證權限
    const result = await prisma.quizResult.findFirst({
      where: { id: resultId, user_id: userId },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      }
    });

    if (!result) {
      throw new Error('測驗結果不存在或無權限');
    }

    if (result.status === 'completed') {
      return result;
    }

    // 計算分數（調用計分服務）
    const { totalScore, scores } = await this.calculateScores(result);

    // 更新結果狀態
    const updatedResult = await prisma.quizResult.update({
      where: { id: resultId },
      data: {
        status: 'completed',
        completed_at: new Date(),
        total_score: totalScore,
        scores: scores
      }
    });

    return updatedResult;
  }

  /**
   * 取得用戶的最新測驗結果
   */
  async getLatestResult(
    userId: number,
    quizId: number
  ): Promise<QuizResultWithDetails | null> {
    const result = await prisma.quizResult.findFirst({
      where: {
        user_id: userId,
        quiz_id: quizId,
        status: 'completed'
      },
      include: {
        quiz: {
          select: {
            title: true
          }
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                question_text: true
              }
            }
          }
        }
      },
      orderBy: {
        completed_at: 'desc'
      }
    });

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      userId: result.user_id,
      quizId: result.quiz_id,
      quizTitle: result.quiz.title,
      status: result.status as any,
      startedAt: result.started_at,
      completedAt: result.completed_at || undefined,
      totalScore: result.total_score || undefined,
      scores: result.scores as any,
      answers: result.answers.map(a => ({
        questionId: a.question_id,
        questionText: a.question.question_text,
        answerValue: a.answer_value as any,
        answeredAt: a.answered_at
      }))
    };
  }

  /**
   * 取得用戶的所有測驗結果（分頁）
   */
  async getUserResults(
    userId: number,
    options: {
      page: number;
      limit: number;
      quizId?: number;
      status?: string;
    }
  ) {
    const { page, limit, quizId, status } = options;
    const skip = (page - 1) * limit;

    const where = {
      user_id: userId,
      ...(quizId && { quiz_id: quizId }),
      ...(status && { status })
    };

    const [results, total] = await Promise.all([
      prisma.quizResult.findMany({
        where,
        include: {
          quiz: {
            select: {
              title: true
            }
          }
        },
        orderBy: {
          started_at: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.quizResult.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: results.map(r => ({
        resultId: r.id,
        quizId: r.quiz_id,
        quizTitle: r.quiz.title,
        status: r.status,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        totalScore: r.total_score
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * 計算測驗分數（私有方法）
   */
  private async calculateScores(result: any): Promise<{
    totalScore: number;
    scores: Record<string, number>;
  }> {
    // 這裡實現具體的計分邏輯
    // 可以根據題目類型、權重、維度等計算

    // 簡化範例：
    let totalScore = 0;
    const dimensionScores: Record<string, { sum: number; count: number }> = {};

    for (const answer of result.answers) {
      const question = answer.question;
      const options = question.options as any[];

      // 找到對應選項的分數
      let score = 0;
      if (question.question_type === 'single_choice') {
        const option = options.find(o => o.id === answer.answer_value);
        score = option?.score || 0;
      } else if (question.question_type === 'scale') {
        score = Number(answer.answer_value) || 0;
      }

      totalScore += score * (question.weight || 1);

      // 按維度累計
      if (question.dimension) {
        if (!dimensionScores[question.dimension]) {
          dimensionScores[question.dimension] = { sum: 0, count: 0 };
        }
        dimensionScores[question.dimension].sum += score;
        dimensionScores[question.dimension].count += 1;
      }
    }

    // 計算各維度平均分
    const scores: Record<string, number> = {};
    for (const [dimension, data] of Object.entries(dimensionScores)) {
      scores[dimension] = Math.round((data.sum / data.count) * 100) / 100;
    }

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      scores
    };
  }
}

export const quizResultService = new QuizResultService();
```

### 5.4 控制器 (`src/controllers/quiz-result.controller.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';
import { quizResultService } from '../services/quiz-result.service';
import { successResponse, errorResponse } from '../utils/response-helper';
import { AuthRequest } from '../types/auth.types';

export class QuizResultController {
  /**
   * 開始測驗
   */
  async startQuiz(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { quizId } = req.body;

      const result = await quizResultService.startQuiz(userId, quizId);

      return successResponse(res, {
        resultId: result.id,
        quizId: result.quiz_id,
        status: result.status,
        startedAt: result.started_at
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 提交答案
   */
  async submitAnswers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const resultId = parseInt(req.params.resultId);
      const { answers } = req.body;

      const result = await quizResultService.submitAnswers(
        resultId,
        userId,
        answers
      );

      return successResponse(res, {
        saved: result.saved,
        resultId
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 完成測驗
   */
  async completeQuiz(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const resultId = parseInt(req.params.resultId);

      const result = await quizResultService.completeQuiz(resultId, userId);

      return successResponse(res, {
        resultId: result.id,
        status: result.status,
        completedAt: result.completed_at,
        totalScore: result.total_score,
        scores: result.scores
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 取得最新測驗結果
   */
  async getLatestResult(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const quizId = parseInt(req.query.quizId as string);

      const result = await quizResultService.getLatestResult(userId, quizId);

      if (!result) {
        return errorResponse(res, {
          code: 'NOT_FOUND',
          message: '尚無測驗結果'
        }, 404);
      }

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 取得我的所有測驗結果
   */
  async getMyResults(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const quizId = req.query.quizId
        ? parseInt(req.query.quizId as string)
        : undefined;
      const status = req.query.status as string | undefined;

      const result = await quizResultService.getUserResults(userId, {
        page,
        limit,
        quizId,
        status
      });

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

export const quizResultController = new QuizResultController();
```

### 5.5 路由 (`src/routes/quiz-result.routes.ts`)

```typescript
import { Router } from 'express';
import { quizResultController } from '../controllers/quiz-result.controller';
import { authenticateJWT } from '../middleware/auth';
import { validate } from '../middleware/validation.middleware';
import {
  startQuizSchema,
  submitAnswersSchema,
  completeQuizSchema,
  getMyResultsSchema,
  getLatestResultSchema
} from '../validators/quiz-result.validators';

const router = Router();

// 所有路由都需要認證
router.use(authenticateJWT);

// 開始測驗
router.post(
  '/start',
  validate(startQuizSchema),
  quizResultController.startQuiz
);

// 提交答案
router.post(
  '/:resultId/answers',
  validate(submitAnswersSchema),
  quizResultController.submitAnswers
);

// 完成測驗
router.post(
  '/:resultId/complete',
  validate(completeQuizSchema),
  quizResultController.completeQuiz
);

// 取得我的所有測驗結果
router.get(
  '/me',
  validate(getMyResultsSchema),
  quizResultController.getMyResults
);

// 取得我的最新測驗結果
router.get(
  '/me/latest',
  validate(getLatestResultSchema),
  quizResultController.getLatestResult
);

export default router;
```

### 5.6 註冊路由 (`src/app.ts`)

在 `src/app.ts` 中註冊新路由：

```typescript
import quizResultRoutes from './routes/quiz-result.routes';

// ... 其他路由 ...

app.use('/api/v1/quiz-results', quizResultRoutes);
```

---

## 六、實施步驟

### 階段一：資料庫設置（1 天）

1. ✅ 更新 Prisma schema
2. ✅ 執行資料庫遷移
3. ✅ 生成 Prisma 客戶端
4. ✅ 測試資料庫連接

### 階段二：核心功能開發（3-4 天）

1. ✅ 創建類型定義 (`quiz.types.ts`)
2. ✅ 創建驗證器 (`quiz-result.validators.ts`)
3. ✅ 實現服務層 (`quiz-result.service.ts`)
   - 開始測驗
   - 提交答案
   - 完成測驗
   - 取得結果
4. ✅ 實現控制器 (`quiz-result.controller.ts`)
5. ✅ 配置路由 (`quiz-result.routes.ts`)
6. ✅ 註冊路由到主應用

### 階段三：計分系統（2 天）

1. ✅ 實現計分服務 (`quiz-scoring.service.ts`)
2. ✅ 支持多維度計分
3. ✅ 計算總分與子分數

### 階段四：測試與優化（2 天）

1. ✅ 編寫單元測試
2. ✅ 編寫整合測試
3. ✅ API 端點測試
4. ✅ 性能優化
5. ✅ 錯誤處理完善

### 階段五：文檔與部署（1 天）

1. ✅ 更新 Swagger API 文檔
2. ✅ 編寫使用說明
3. ✅ 部署到測試環境
4. ✅ 前後端聯調

---

## 七、測試計劃

### 7.1 單元測試範例

```typescript
// tests/unit/quiz-result.service.test.ts
import { quizResultService } from '../../src/services/quiz-result.service';

describe('QuizResultService', () => {
  describe('startQuiz', () => {
    it('應該成功創建新的測驗結果', async () => {
      const result = await quizResultService.startQuiz(1, 1);
      expect(result).toHaveProperty('id');
      expect(result.status).toBe('in_progress');
    });

    it('當測驗不存在時應該拋出錯誤', async () => {
      await expect(
        quizResultService.startQuiz(1, 999)
      ).rejects.toThrow('測驗不存在或已停用');
    });
  });

  describe('getLatestResult', () => {
    it('應該返回最新的已完成測驗結果', async () => {
      const result = await quizResultService.getLatestResult(1, 1);
      expect(result).toHaveProperty('quizTitle');
      expect(result?.status).toBe('completed');
    });

    it('當沒有結果時應該返回 null', async () => {
      const result = await quizResultService.getLatestResult(999, 1);
      expect(result).toBeNull();
    });
  });
});
```

### 7.2 API 端點測試範例

```typescript
// tests/integration/quiz-result.api.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('Quiz Result API', () => {
  let authToken: string;
  let resultId: number;

  beforeAll(async () => {
    // 登入取得 token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = loginRes.body.data.token;
  });

  describe('POST /api/v1/quiz-results/start', () => {
    it('應該成功開始測驗', async () => {
      const res = await request(app)
        .post('/api/v1/quiz-results/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quizId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('resultId');
      resultId = res.body.data.resultId;
    });
  });

  describe('GET /api/v1/quiz-results/me/latest', () => {
    it('應該返回最新的測驗結果', async () => {
      const res = await request(app)
        .get('/api/v1/quiz-results/me/latest?quizId=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('quizTitle');
    });
  });
});
```

---

## 八、安全考量

### 8.1 權限控制
- ✅ 所有端點都需要 JWT 認證
- ✅ 用戶只能訪問自己的測驗結果
- ✅ 使用 Prisma 的 row-level 查詢過濾

### 8.2 資料驗證
- ✅ 使用 Zod schema 驗證所有輸入
- ✅ 防止 SQL 注入（Prisma ORM）
- ✅ 防止 XSS（輸入清理）

### 8.3 錯誤處理
- ✅ 統一的錯誤響應格式
- ✅ 不洩漏敏感資訊
- ✅ 記錄詳細錯誤日誌

---

## 九、性能優化

### 9.1 資料庫優化
- ✅ 適當的索引（user_id, quiz_id, completed_at）
- ✅ 使用 Prisma 的 select 減少查詢字段
- ✅ 批次操作（Promise.all）

### 9.2 快取策略（可選）
- Redis 快取測驗題目
- Redis 快取用戶最新結果
- 設置適當的 TTL

### 9.3 分頁
- 所有列表查詢都支持分頁
- 默認 limit 為 10

---

## 十、監控與日誌

### 10.1 關鍵指標
- 測驗開始數
- 測驗完成率
- 平均答題時間
- API 響應時間

### 10.2 日誌記錄
- 使用 Winston 記錄關鍵操作
- 記錄錯誤堆疊
- 記錄用戶操作審計

---

## 十一、未來擴展

### 11.1 可能的增強功能
- 測驗分享功能
- 測驗結果分析報告（圖表、PDF）
- 測驗重做功能
- 測驗草稿保存
- 測驗時間限制
- 多語言測驗支持
- 測驗版本控制

### 11.2 分析功能
- 用戶群體分析
- 測驗難度分析
- 題目效度分析

---

## 十二、相關文件

- [Prisma 文檔](https://www.prisma.io/docs)
- [Express.js 文檔](https://expressjs.com/)
- [Zod 驗證文檔](https://zod.dev/)
- [JWT 認證指南](https://jwt.io/)

---

**文件版本**: 1.0
**最後更新**: 2025-12-18
**維護者**: Backend Team
