# 訂閱系統實施規劃

## 專案概覽

**目標**: 實現 DaoDao 平台的訂閱管理系統，支援四級訂閱方案（Free、Basic、Premium、Enterprise）

**當前狀態**:
- ✅ 數據庫架構已完成
- ✅ 文檔設計完整
- ❌ API 端點未實現
- ❌ 業務邏輯未編碼
- ❌ 支付集成未實現

---

## 一、現狀分析

### 1.1 已完成的工作

#### 數據庫層面
- ✅ `subscription_plan` 表（訂閱方案）
- ✅ `user_subscription` 表（用戶訂閱）
- ✅ `subscription_status` 枚舉類型
- ✅ Prisma Schema 定義完整
- ✅ 索引優化 (user_id, status)

#### 文檔層面
- ✅ API 契約規範 (`subscription-api.yaml`)
- ✅ 四級訂閱方案定義
- ✅ 功能權限映射 (`subscription-permission-rules.md`)
- ✅ 增強數據模型設計 (`subscription-enhanced-data-model.md`)
- ✅ 權限系統整合方案 (`subscription-permission-integration.md`)

### 1.2 需要實現的功能

#### 核心功能
1. ❌ 訂閱方案管理（CRUD）
2. ❌ 用戶訂閱管理
3. ❌ 功能權限檢查
4. ❌ 使用量追蹤系統
5. ❌ 訂閱狀態驗證中間件
6. ❌ 支付網關整合
7. ❌ 訂閱數據初始化

#### 增強功能
1. ❌ 使用量統計和分析
2. ❌ 訂閱升級/降級邏輯
3. ❌ 自動續訂處理
4. ❌ 試用期管理
5. ❌ 發票生成
6. ❌ 管理後台介面

---

## 二、架構調整建議

### 2.1 數據庫架構優化

#### 需要新增的表

```sql
-- 1. 訂閱功能配置表
CREATE TABLE subscription_features (
    id SERIAL PRIMARY KEY,
    plan_id INT REFERENCES subscription_plan(id) ON DELETE CASCADE,
    feature_code VARCHAR(100) NOT NULL,
    feature_name VARCHAR(200) NOT NULL,
    limit_value INT,                    -- NULL 表示無限制
    limit_type VARCHAR(20),             -- 'count', 'storage', 'api_calls'
    reset_period VARCHAR(20),           -- 'daily', 'monthly', 'never'
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, feature_code)
);

-- 2. 使用量追蹤表
CREATE TABLE usage_tracking (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    feature_code VARCHAR(100) NOT NULL,
    current_usage INT DEFAULT 0,
    limit_value INT,
    reset_period VARCHAR(20),
    last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, feature_code, period_start)
);
CREATE INDEX idx_usage_tracking_user_feature ON usage_tracking(user_id, feature_code);

-- 3. 訂閱歷史記錄表
CREATE TABLE subscription_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INT REFERENCES user_subscription(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,        -- 'created', 'upgraded', 'downgraded', 'canceled', 'renewed'
    from_plan_id INT REFERENCES subscription_plan(id),
    to_plan_id INT REFERENCES subscription_plan(id),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_subscription_history_user ON subscription_history(user_id);

-- 4. 支付記錄表
CREATE TABLE subscription_payments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INT REFERENCES user_subscription(id) ON DELETE SET NULL,
    plan_id INT REFERENCES subscription_plan(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50),       -- 'stripe', 'paypal'
    transaction_id VARCHAR(255) UNIQUE,
    status VARCHAR(20) NOT NULL,        -- 'pending', 'completed', 'failed', 'refunded'
    metadata JSONB,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payments_user ON subscription_payments(user_id);
CREATE INDEX idx_payments_status ON subscription_payments(status);
```

#### 需要修改的表

```sql
-- 修改 subscription_plan 表，增加必要欄位
ALTER TABLE subscription_plan ADD COLUMN IF NOT EXISTS interval VARCHAR(20) DEFAULT 'monthly';  -- 'monthly', 'yearly'
ALTER TABLE subscription_plan ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE subscription_plan ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE subscription_plan ADD COLUMN IF NOT EXISTS trial_days INT DEFAULT 0;
ALTER TABLE subscription_plan ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 修改 user_subscription 表
ALTER TABLE user_subscription ADD COLUMN IF NOT EXISTS trial_end_date DATE;
ALTER TABLE user_subscription ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE;
ALTER TABLE user_subscription ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP;
ALTER TABLE user_subscription ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 添加狀態
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trial';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'expired';
```

### 2.2 Prisma Schema 更新

需要在 `daodao-server/prisma/schema.prisma` 中同步這些變更。

### 2.3 清理遺留文件

**重要**: 項目中存在遺留的 `models/subscriptionPlan.js` Sequelize 模型文件，但該文件未被使用。建議在開始實施前刪除此文件，避免混淆。

```bash
rm /Users/xiaoxu/Projects/daodao/daodao-server/models/subscriptionPlan.js
```

**注意**: 訂閱系統將完全使用 Prisma ORM，不使用 Sequelize。

---

## 三、實施計劃

### Phase 1: 數據層準備（優先級：最高）

#### 任務清單
1. [ ] 創建數據庫遷移腳本
   - 新增表：subscription_features, usage_tracking, subscription_history, subscription_payments
   - 修改現有表：subscription_plan, user_subscription
   - 更新枚舉類型

2. [ ] 初始化訂閱方案數據
   - 創建初始化腳本 `080_insert_subscription_plans.sql`
   - 插入四個訂閱方案（Free, Basic, Premium, Enterprise）
   - 配置每個方案的功能限制（subscription_features）

3. [ ] 更新 Prisma Schema
   - 同步新增的表和欄位
   - 定義關聯關係
   - 生成 Prisma Client

**預期產出**:
- 完整的數據庫架構
- 初始訂閱方案數據
- 更新的 Prisma Schema

---

### Phase 2: 核心業務邏輯（優先級：最高）

#### 2.1 創建 TypeScript 類型定義

**檔案**: `src/types/subscription.types.ts`

```typescript
export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELED = 'canceled',
  TRIAL = 'trial',
  EXPIRED = 'expired'
}

export enum SubscriptionTier {
  FREE = 'Free',
  BASIC = 'Basic',
  PREMIUM = 'Premium',
  ENTERPRISE = 'Enterprise'
}

export enum FeatureLimitType {
  COUNT = 'count',
  STORAGE = 'storage',
  API_CALLS = 'api_calls'
}

export enum ResetPeriod {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  NEVER = 'never'
}

export interface SubscriptionFeature {
  featureCode: string;
  featureName: string;
  limitValue: number | null;
  limitType: FeatureLimitType;
  resetPeriod: ResetPeriod;
  enabled: boolean;
}

export interface UsageInfo {
  currentUsage: number;
  limitValue: number | null;
  resetPeriod: ResetPeriod;
  periodStart: Date;
  periodEnd: Date;
}

export interface SubscriptionCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number | null;
}
```

#### 2.2 創建訂閱服務層

**檔案**: `src/services/subscription.service.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import {
  SubscriptionStatus,
  SubscriptionFeature,
  UsageInfo,
  SubscriptionCheckResult,
  ResetPeriod
} from '../types/subscription.types';

export class SubscriptionService {
  constructor(private prisma: PrismaClient) {}

  // 獲取用戶當前訂閱
  async getUserSubscription(userId: number) {
    return await this.prisma.user_subscription.findFirst({
      where: {
        user_id: userId,
        status: SubscriptionStatus.ACTIVE,
        end_date: { gte: new Date() }
      },
      include: {
        subscription_plan: {
          include: {
            subscription_features: true
          }
        }
      }
    });
  }

  // 檢查功能是否可用
  async checkFeatureAccess(
    userId: number,
    featureCode: string,
    increment: number = 1
  ): Promise<SubscriptionCheckResult> {
    // 1. 獲取用戶訂閱
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      return { allowed: false, reason: 'No active subscription' };
    }

    // 2. 檢查功能是否在方案中
    const feature = subscription.subscription_plan.subscription_features.find(
      f => f.feature_code === featureCode && f.enabled
    );

    if (!feature) {
      return { allowed: false, reason: 'Feature not available in plan' };
    }

    // 3. 無限制功能
    if (feature.limit_value === null) {
      return { allowed: true };
    }

    // 4. 檢查使用量
    const usage = await this.getUsage(userId, featureCode);

    if (usage.currentUsage + increment > (feature.limit_value || 0)) {
      return {
        allowed: false,
        reason: 'Usage limit exceeded',
        currentUsage: usage.currentUsage,
        limit: feature.limit_value
      };
    }

    // 5. 更新使用量
    await this.incrementUsage(userId, featureCode, increment);

    return {
      allowed: true,
      currentUsage: usage.currentUsage + increment,
      limit: feature.limit_value
    };
  }

  // 獲取使用量
  async getUsage(userId: number, featureCode: string): Promise<UsageInfo> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription');
    }

    const feature = subscription.subscription_plan.subscription_features.find(
      f => f.feature_code === featureCode
    );

    if (!feature) {
      throw new Error('Feature not found');
    }

    const now = new Date();
    const { start, end } = this.getResetPeriod(feature.reset_period, now);

    let usage = await this.prisma.usage_tracking.findUnique({
      where: {
        user_id_feature_code_period_start: {
          user_id: userId,
          feature_code: featureCode,
          period_start: start
        }
      }
    });

    if (!usage) {
      usage = await this.prisma.usage_tracking.create({
        data: {
          user_id: userId,
          feature_code: featureCode,
          current_usage: 0,
          limit_value: feature.limit_value,
          reset_period: feature.reset_period,
          period_start: start,
          period_end: end,
          last_reset_at: now
        }
      });
    }

    return {
      currentUsage: usage.current_usage,
      limitValue: usage.limit_value,
      resetPeriod: feature.reset_period as ResetPeriod,
      periodStart: usage.period_start,
      periodEnd: usage.period_end
    };
  }

  // 增加使用量
  async incrementUsage(
    userId: number,
    featureCode: string,
    increment: number = 1
  ): Promise<void> {
    const usage = await this.getUsage(userId, featureCode);

    await this.prisma.usage_tracking.update({
      where: {
        user_id_feature_code_period_start: {
          user_id: userId,
          feature_code: featureCode,
          period_start: usage.periodStart
        }
      },
      data: {
        current_usage: { increment },
        updated_at: new Date()
      }
    });
  }

  // 計算重置週期
  private getResetPeriod(
    resetPeriod: string,
    date: Date
  ): { start: Date; end: Date } {
    const start = new Date(date);
    const end = new Date(date);

    switch (resetPeriod) {
      case ResetPeriod.DAILY:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case ResetPeriod.MONTHLY:
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case ResetPeriod.NEVER:
        start.setFullYear(2000, 0, 1);
        end.setFullYear(2099, 11, 31);
        break;
    }

    return { start, end };
  }

  // 創建訂閱
  async createSubscription(userId: number, planId: number, trialDays?: number) {
    const plan = await this.prisma.subscription_plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const status = trialDays && trialDays > 0
      ? SubscriptionStatus.TRIAL
      : SubscriptionStatus.ACTIVE;

    const trialEndDate = trialDays ? new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;

    return await this.prisma.user_subscription.create({
      data: {
        user_id: userId,
        plan_id: planId,
        status,
        start_date: startDate,
        end_date: endDate,
        trial_end_date: trialEndDate,
        auto_renew: true
      }
    });
  }

  // 升級/降級訂閱
  async changeSubscription(userId: number, newPlanId: number) {
    const currentSubscription = await this.getUserSubscription(userId);

    if (!currentSubscription) {
      throw new Error('No active subscription');
    }

    // 記錄歷史
    await this.prisma.subscription_history.create({
      data: {
        user_id: userId,
        subscription_id: currentSubscription.id,
        action: newPlanId > currentSubscription.plan_id! ? 'upgraded' : 'downgraded',
        from_plan_id: currentSubscription.plan_id,
        to_plan_id: newPlanId
      }
    });

    // 更新訂閱
    return await this.prisma.user_subscription.update({
      where: { id: currentSubscription.id },
      data: {
        plan_id: newPlanId,
        updated_at: new Date()
      }
    });
  }

  // 取消訂閱
  async cancelSubscription(userId: number) {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      throw new Error('No active subscription');
    }

    return await this.prisma.user_subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        auto_renew: false,
        canceled_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  // 獲取所有訂閱方案
  async getAllPlans() {
    return await this.prisma.subscription_plan.findMany({
      where: { is_active: true },
      include: {
        subscription_features: {
          where: { enabled: true }
        }
      },
      orderBy: { price: 'asc' }
    });
  }

  // 獲取用戶使用統計
  async getUserUsageStats(userId: number) {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      return null;
    }

    const features = subscription.subscription_plan.subscription_features;
    const usageStats = [];

    for (const feature of features) {
      try {
        const usage = await this.getUsage(userId, feature.feature_code);
        usageStats.push({
          featureCode: feature.feature_code,
          featureName: feature.feature_name,
          currentUsage: usage.currentUsage,
          limit: usage.limitValue,
          resetPeriod: usage.resetPeriod,
          periodEnd: usage.periodEnd
        });
      } catch (error) {
        // Skip features without usage tracking
      }
    }

    return {
      plan: subscription.subscription_plan.name,
      status: subscription.status,
      startDate: subscription.start_date,
      endDate: subscription.end_date,
      usage: usageStats
    };
  }
}
```

#### 2.3 創建訂閱中間件

**檔案**: `src/middleware/subscription.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from '../services/subscription.service';
import { SubscriptionTier } from '../types/subscription.types';

const prisma = new PrismaClient();
const subscriptionService = new SubscriptionService(prisma);

// 檢查訂閱層級
export const requireSubscription = (minTier: SubscriptionTier) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const subscription = await subscriptionService.getUserSubscription(userId);

      if (!subscription) {
        return res.status(403).json({
          error: 'No active subscription',
          requiredTier: minTier
        });
      }

      const tierOrder = [
        SubscriptionTier.FREE,
        SubscriptionTier.BASIC,
        SubscriptionTier.PREMIUM,
        SubscriptionTier.ENTERPRISE
      ];

      const userTierIndex = tierOrder.indexOf(subscription.subscription_plan.name as SubscriptionTier);
      const requiredTierIndex = tierOrder.indexOf(minTier);

      if (userTierIndex < requiredTierIndex) {
        return res.status(403).json({
          error: 'Insufficient subscription tier',
          currentTier: subscription.subscription_plan.name,
          requiredTier: minTier
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// 檢查功能使用限制
export const checkUsageLimit = (featureCode: string, increment: number = 1) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await subscriptionService.checkFeatureAccess(
        userId,
        featureCode,
        increment
      );

      if (!result.allowed) {
        return res.status(403).json({
          error: result.reason,
          currentUsage: result.currentUsage,
          limit: result.limit,
          featureCode
        });
      }

      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// 驗證訂閱狀態
export const validateSubscriptionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription) {
      // 自動分配免費方案
      const freePlan = await prisma.subscription_plan.findFirst({
        where: { name: SubscriptionTier.FREE }
      });

      if (freePlan) {
        await subscriptionService.createSubscription(userId, freePlan.id);
      }
    }

    next();
  } catch (error) {
    console.error('Subscription validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

#### 任務清單

1. [ ] 創建類型定義 (`subscription.types.ts`)
2. [ ] 實現訂閱服務 (`subscription.service.ts`)
3. [ ] 實現訂閱中間件 (`subscription.middleware.ts`)
4. [ ] 編寫單元測試
5. [ ] 編寫集成測試

---

### Phase 3: API 端點實現（優先級：高）

#### 3.1 用戶端 API

**檔案**: `src/routes/subscription.routes.ts`

```typescript
import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateSubscriptionStatus } from '../middleware/subscription.middleware';

const router = Router();
const controller = new SubscriptionController();

// 所有路由需要認證
router.use(authenticate);

// 獲取所有訂閱方案
router.get('/plans', controller.getPlans);

// 獲取當前用戶訂閱狀態
router.get('/current', validateSubscriptionStatus, controller.getCurrentSubscription);

// 獲取使用統計
router.get('/usage', controller.getUsageStats);

// 檢查功能可用性
router.post('/check-feature', controller.checkFeature);

// 創建訂閱
router.post('/subscribe', controller.createSubscription);

// 升級/降級訂閱
router.put('/change', controller.changeSubscription);

// 取消訂閱
router.post('/cancel', controller.cancelSubscription);

export default router;
```

**檔案**: `src/controllers/subscription.controller.ts`

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from '../services/subscription.service';

const prisma = new PrismaClient();
const subscriptionService = new SubscriptionService(prisma);

export class SubscriptionController {
  // 獲取所有訂閱方案
  async getPlans(req: Request, res: Response) {
    try {
      const plans = await subscriptionService.getAllPlans();
      res.json({ plans });
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({ error: 'Failed to get plans' });
    }
  }

  // 獲取當前訂閱
  async getCurrentSubscription(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const subscription = await subscriptionService.getUserSubscription(userId);

      if (!subscription) {
        return res.status(404).json({ error: 'No active subscription' });
      }

      res.json({ subscription });
    } catch (error) {
      console.error('Get current subscription error:', error);
      res.status(500).json({ error: 'Failed to get subscription' });
    }
  }

  // 獲取使用統計
  async getUsageStats(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const stats = await subscriptionService.getUserUsageStats(userId);

      if (!stats) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      res.json(stats);
    } catch (error) {
      console.error('Get usage stats error:', error);
      res.status(500).json({ error: 'Failed to get usage stats' });
    }
  }

  // 檢查功能可用性
  async checkFeature(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { featureCode } = req.body;

      if (!featureCode) {
        return res.status(400).json({ error: 'Feature code is required' });
      }

      const result = await subscriptionService.checkFeatureAccess(
        userId,
        featureCode,
        0 // 不增加使用量，僅檢查
      );

      res.json(result);
    } catch (error) {
      console.error('Check feature error:', error);
      res.status(500).json({ error: 'Failed to check feature' });
    }
  }

  // 創建訂閱
  async createSubscription(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { planId, trialDays } = req.body;

      if (!planId) {
        return res.status(400).json({ error: 'Plan ID is required' });
      }

      const subscription = await subscriptionService.createSubscription(
        userId,
        planId,
        trialDays
      );

      res.status(201).json({ subscription });
    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  }

  // 更改訂閱
  async changeSubscription(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { newPlanId } = req.body;

      if (!newPlanId) {
        return res.status(400).json({ error: 'New plan ID is required' });
      }

      const subscription = await subscriptionService.changeSubscription(
        userId,
        newPlanId
      );

      res.json({ subscription });
    } catch (error) {
      console.error('Change subscription error:', error);
      res.status(500).json({ error: 'Failed to change subscription' });
    }
  }

  // 取消訂閱
  async cancelSubscription(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const subscription = await subscriptionService.cancelSubscription(userId);
      res.json({ subscription });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  }
}
```

#### 3.2 管理員 API

**檔案**: `src/routes/admin/subscription.routes.ts`

```typescript
import { Router } from 'express';
import { AdminSubscriptionController } from '../controllers/admin/subscription.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/permission.middleware';

const router = Router();
const controller = new AdminSubscriptionController();

router.use(authenticate);
router.use(requireRole('admin'));

// 方案管理
router.post('/plans', controller.createPlan);
router.get('/plans', controller.getAllPlans);
router.put('/plans/:planId', controller.updatePlan);
router.delete('/plans/:planId', controller.deletePlan);

// 功能管理
router.post('/plans/:planId/features', controller.addFeature);
router.put('/features/:featureId', controller.updateFeature);
router.delete('/features/:featureId', controller.deleteFeature);

// 使用分析
router.get('/usage-analytics', controller.getUsageAnalytics);
router.get('/users/:userId/usage', controller.getUserUsage);

// 訂閱管理
router.get('/subscriptions', controller.getAllSubscriptions);
router.put('/subscriptions/:subscriptionId', controller.updateSubscription);

export default router;
```

#### 任務清單

1. [ ] 實現用戶端路由和控制器
2. [ ] 實現管理員路由和控制器
3. [ ] 添加請求驗證（使用 Joi 或 Zod）
4. [ ] 添加 API 文檔（Swagger/OpenAPI）
5. [ ] 編寫 API 測試

---

### Phase 4: 支付整合（優先級：中）

#### 4.1 Stripe 整合

**建議使用 Stripe** 作為主要支付提供商。

**檔案**: `src/services/payment.service.ts`

```typescript
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from './subscription.service';

export class PaymentService {
  private stripe: Stripe;
  private subscriptionService: SubscriptionService;

  constructor(private prisma: PrismaClient) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    this.subscriptionService = new SubscriptionService(prisma);
  }

  // 創建支付意圖
  async createPaymentIntent(userId: number, planId: number) {
    const plan = await this.prisma.subscription_plan.findUnique({
      where: { id: planId }
    });

    if (!plan || !plan.price) {
      throw new Error('Invalid plan');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(Number(plan.price) * 100), // 轉換為分
      currency: plan.currency.toLowerCase(),
      metadata: {
        userId: userId.toString(),
        planId: planId.toString()
      }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  }

  // 處理 Webhook
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const userId = parseInt(paymentIntent.metadata.userId);
    const planId = parseInt(paymentIntent.metadata.planId);

    // 記錄支付
    await this.prisma.subscription_payments.create({
      data: {
        user_id: userId,
        plan_id: planId,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        payment_method: 'card',
        payment_provider: 'stripe',
        transaction_id: paymentIntent.id,
        status: 'completed',
        paid_at: new Date()
      }
    });

    // 創建或更新訂閱
    const existingSubscription = await this.subscriptionService.getUserSubscription(userId);

    if (existingSubscription) {
      await this.subscriptionService.changeSubscription(userId, planId);
    } else {
      await this.subscriptionService.createSubscription(userId, planId);
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const userId = parseInt(paymentIntent.metadata.userId);
    const planId = parseInt(paymentIntent.metadata.planId);

    await this.prisma.subscription_payments.create({
      data: {
        user_id: userId,
        plan_id: planId,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        payment_provider: 'stripe',
        transaction_id: paymentIntent.id,
        status: 'failed'
      }
    });
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    // 處理 Stripe 訂閱更新
  }

  private async handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    // 處理 Stripe 訂閱取消
  }
}
```

#### 任務清單

1. [ ] 安裝 Stripe SDK (`npm install stripe`)
2. [ ] 實現支付服務
3. [ ] 創建 Webhook 端點
4. [ ] 配置 Stripe Webhook
5. [ ] 實現退款邏輯
6. [ ] 添加支付測試

**環境變數**:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### Phase 5: 權限系統整合（優先級：中）

#### 修改現有權限中間件

**檔案**: `src/middleware/permission.middleware.ts`

需要在現有權限檢查基礎上增加訂閱檢查：

```typescript
// 原有的權限檢查邏輯
+ import { checkUsageLimit, requireSubscription } from './subscription.middleware';

// 組合權限檢查
export const checkPermission = (
  permission: string,
  tier?: SubscriptionTier,
  feature?: string
) => {
  return [
    authenticate,
    requirePermission(permission),
    tier ? requireSubscription(tier) : (req, res, next) => next(),
    feature ? checkUsageLimit(feature) : (req, res, next) => next()
  ];
};
```

#### 在業務路由中應用

```typescript
// 示例：項目創建端點
router.post(
  '/projects',
  checkPermission('project:create', SubscriptionTier.FREE, 'project:create'),
  projectController.create
);

// 示例：私有項目功能
router.post(
  '/projects/:id/private',
  checkPermission('project:private', SubscriptionTier.BASIC),
  projectController.makePrivate
);
```

#### 任務清單

1. [ ] 修改權限中間件
2. [ ] 更新所有需要訂閱檢查的路由
3. [ ] 添加功能代碼常量文件
4. [ ] 更新權限文檔

---

### Phase 6: 定時任務（優先級：低）

#### 6.1 訂閱過期檢查

**檔案**: `src/jobs/subscription.jobs.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { SubscriptionStatus } from '../types/subscription.types';

const prisma = new PrismaClient();

// 每日檢查過期訂閱
export async function checkExpiredSubscriptions() {
  const now = new Date();

  const expiredSubscriptions = await prisma.user_subscription.updateMany({
    where: {
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      end_date: { lt: now }
    },
    data: {
      status: SubscriptionStatus.EXPIRED,
      updated_at: now
    }
  });

  console.log(`Expired ${expiredSubscriptions.count} subscriptions`);
}

// 重置每日使用量
export async function resetDailyUsage() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);

  await prisma.usage_tracking.updateMany({
    where: {
      reset_period: 'daily',
      period_end: { lte: yesterday }
    },
    data: {
      current_usage: 0,
      last_reset_at: new Date()
    }
  });

  console.log('Daily usage reset completed');
}

// 重置每月使用量
export async function resetMonthlyUsage() {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  lastMonth.setDate(1);

  await prisma.usage_tracking.updateMany({
    where: {
      reset_period: 'monthly',
      period_end: { lte: lastMonth }
    },
    data: {
      current_usage: 0,
      last_reset_at: new Date()
    }
  });

  console.log('Monthly usage reset completed');
}
```

#### 6.2 使用 node-cron

```typescript
// src/index.ts
import cron from 'node-cron';
import { checkExpiredSubscriptions, resetDailyUsage, resetMonthlyUsage } from './jobs/subscription.jobs';

// 每天凌晨 1 點檢查過期訂閱
cron.schedule('0 1 * * *', checkExpiredSubscriptions);

// 每天凌晨 2 點重置每日使用量
cron.schedule('0 2 * * *', resetDailyUsage);

// 每月 1 號凌晨 3 點重置每月使用量
cron.schedule('0 3 1 * *', resetMonthlyUsage);
```

#### 任務清單

1. [ ] 安裝 node-cron (`npm install node-cron @types/node-cron`)
2. [ ] 實現定時任務
3. [ ] 配置任務調度
4. [ ] 添加任務日誌
5. [ ] 編寫任務測試

---

### Phase 7: 前端整合（優先級：低）

#### 7.1 訂閱頁面

- 訂閱方案展示頁面
- 訂閱購買流程
- 訂閱管理頁面
- 使用量儀表板

#### 7.2 Stripe Elements

使用 Stripe Elements 實現安全的支付表單。

#### 任務清單

1. [ ] 設計訂閱頁面 UI
2. [ ] 實現 Stripe Elements
3. [ ] 創建使用量儀表板
4. [ ] 添加訂閱升級提示

---

### Phase 8: 測試與優化（優先級：中）

#### 8.1 測試策略

```typescript
// 單元測試
- SubscriptionService 測試
- PaymentService 測試
- 中間件測試

// 集成測試
- API 端點測試
- 支付流程測試
- 權限整合測試

// E2E 測試
- 完整訂閱流程
- 升級/降級流程
- 取消流程
```

#### 8.2 性能優化

1. [ ] 添加 Redis 緩存訂閱數據
2. [ ] 優化數據庫查詢
3. [ ] 添加數據庫索引
4. [ ] 實現查詢批處理

#### 8.3 監控與日誌

1. [ ] 添加訂閱事件日誌
2. [ ] 監控支付失敗率
3. [ ] 追蹤使用量異常
4. [ ] 設置告警

---

## 四、功能代碼映射

### 4.1 功能代碼常量

**檔案**: `src/constants/features.ts`

```typescript
export const FEATURES = {
  // 項目功能
  PROJECT_CREATE: 'project:create',
  PROJECT_PRIVATE: 'project:private',
  PROJECT_COLLABORATION: 'project:collaboration',
  PROJECT_ANALYTICS: 'project:analytics',

  // 資源功能
  RESOURCE_CREATE: 'resource:create',
  RESOURCE_SEARCH_ADVANCED: 'resource:search_advanced',
  RESOURCE_BULK_OPERATIONS: 'resource:bulk_operations',
  RESOURCE_EXPORT: 'resource:export',

  // 創意功能
  IDEA_CREATE: 'idea:create',
  IDEA_COLLABORATION: 'idea:collaboration',
  IDEA_ANALYTICS: 'idea:analytics',

  // 系統功能
  SYSTEM_API_ACCESS: 'system:api_access',
  SYSTEM_STORAGE: 'system:storage',
  SYSTEM_PRIORITY_SUPPORT: 'system:priority_support',

  // 師徒功能
  MENTOR_BECOME: 'mentor:become',
  MENTOR_STUDENTS: 'mentor:students',

  // 導出功能
  EXPORT_DATA: 'export:data',
  EXPORT_ANALYTICS: 'export:analytics'
} as const;

export type FeatureCode = typeof FEATURES[keyof typeof FEATURES];
```

### 4.2 訂閱方案初始數據

**檔案**: `daodao-storage/init-scripts-refactored/080_insert_subscription_plans.sql`

```sql
-- 插入訂閱方案
INSERT INTO subscription_plan (name, description, price, currency, interval, is_active, trial_days)
VALUES
  ('Free', '適合個人使用者的免費方案', 0.00, 'USD', 'monthly', TRUE, 0),
  ('Basic', '適合小型團隊的基礎方案', 9.99, 'USD', 'monthly', TRUE, 14),
  ('Premium', '適合成長團隊的進階方案', 19.99, 'USD', 'monthly', TRUE, 14),
  ('Enterprise', '適合大型組織的企業方案', 49.99, 'USD', 'monthly', TRUE, 0);

-- 插入功能配置
INSERT INTO subscription_features (plan_id, feature_code, feature_name, limit_value, limit_type, reset_period, enabled)
SELECT
  sp.id,
  'project:create',
  '創建項目',
  CASE sp.name
    WHEN 'Free' THEN 3
    WHEN 'Basic' THEN 10
    WHEN 'Premium' THEN NULL
    WHEN 'Enterprise' THEN NULL
  END,
  'count',
  'never',
  TRUE
FROM subscription_plan sp;

INSERT INTO subscription_features (plan_id, feature_code, feature_name, limit_value, limit_type, reset_period, enabled)
SELECT
  sp.id,
  'resource:create',
  '創建資源（每月）',
  CASE sp.name
    WHEN 'Free' THEN 5
    WHEN 'Basic' THEN 20
    WHEN 'Premium' THEN 100
    WHEN 'Enterprise' THEN NULL
  END,
  'count',
  'monthly',
  TRUE
FROM subscription_plan sp;

-- ... 繼續為所有功能添加配置 ...
```

---

## 五、風險與挑戰

### 5.1 技術風險

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 支付整合複雜性 | 高 | 使用成熟的 Stripe SDK，參考官方文檔 |
| 使用量追蹤準確性 | 中 | 使用事務確保數據一致性，添加重試機制 |
| 高併發下性能問題 | 中 | 使用 Redis 緩存，優化數據庫查詢 |
| 數據遷移風險 | 低 | 編寫詳細遷移腳本，先在測試環境驗證 |

### 5.2 業務風險

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 定價策略不當 | 高 | 市場調研，A/B 測試 |
| 用戶流失 | 高 | 提供試用期，平滑的升級路徑 |
| 法律合規問題 | 中 | 添加服務條款，隱私政策 |
| 退款糾紛 | 低 | 明確退款政策，自動化退款流程 |

---

## 六、時間表與里程碑

### 里程碑 1: 核心功能完成
- Phase 1: 數據層準備
- Phase 2: 核心業務邏輯
- **交付物**: 可運行的訂閱檢查和使用量追蹤

### 里程碑 2: API 完成
- Phase 3: API 端點實現
- Phase 5: 權限系統整合
- **交付物**: 完整的訂閱 API

### 里程碑 3: 支付整合
- Phase 4: 支付整合
- **交付物**: 可接受真實支付的系統

### 里程碑 4: 生產就緒
- Phase 6: 定時任務
- Phase 8: 測試與優化
- **交付物**: 生產環境部署

---

## 七、部署檢查清單

### 環境配置
- [ ] 配置 Stripe API 密鑰
- [ ] 配置 Webhook 端點
- [ ] 設置 Redis 緩存
- [ ] 配置定時任務

### 數據庫
- [ ] 運行所有遷移腳本
- [ ] 初始化訂閱方案數據
- [ ] 驗證索引創建
- [ ] 備份策略

### 安全
- [ ] API 速率限制
- [ ] 輸入驗證
- [ ] SQL 注入防護
- [ ] XSS 防護
- [ ] CSRF 防護

### 監控
- [ ] 錯誤追蹤（Sentry）
- [ ] 性能監控
- [ ] 支付監控
- [ ] 日誌聚合

---

## 八、參考資源

### 技術文檔
- [Stripe API 文檔](https://stripe.com/docs/api)
- [Prisma 文檔](https://www.prisma.io/docs)
- [Node-cron 文檔](https://github.com/node-cron/node-cron)

### 現有文檔
- `/doc/subscription/subscription-api.yaml`
- `/doc/subscription/subscription-permission-rules.md`
- `/doc/subscription/subscription-enhanced-data-model.md`
- `/doc/subscription/subscription-permission-integration.md`

---

## 九、總結

訂閱系統的架構設計已經非常完善，目前需要的是**系統性的實施**。建議按照以下優先級推進：

**第一階段（核心）**:
1. 完成數據庫遷移和初始化
2. 實現核心業務邏輯（SubscriptionService）
3. 實現訂閱中間件

**第二階段（API）**:
4. 實現用戶端 API
5. 實現管理員 API
6. 整合權限系統

**第三階段（支付）**:
7. Stripe 支付整合
8. Webhook 處理

**第四階段（優化）**:
9. 定時任務
10. 測試與優化
11. 前端整合

整個訂閱系統的實施需要**系統化、階段性**推進，確保每個階段都有可交付的成果，並充分測試後再進入下一階段。
