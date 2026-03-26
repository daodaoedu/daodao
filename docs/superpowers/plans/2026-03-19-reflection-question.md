# Reflection Question Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在打卡表單新增「反思問題」功能，使用者可透過開關啟用，開啟後顯示隨機反思問題卡片，可換題，輔助寫出更有深度的打卡紀錄。

**Architecture:** 新增 `use-reflection-question` hook 管理 25 題問題清單與換題邏輯，新增 `ReflectionQuestion` 元件顯示問題卡片與開關，插入 `check-in-sheet.tsx` 的 TagSelector 與 DescriptionField 之間。

**Tech Stack:** React, TypeScript, Tailwind CSS, react-hook-form (不需後端)

---

## File Map

| 動作 | 路徑 | 職責 |
|------|------|------|
| Create | `daodao-f2e/apps/product/src/components/check-in/form/hooks/use-reflection-question.ts` | 問題清單、當前索引、換題邏輯 |
| Create | `daodao-f2e/apps/product/src/components/check-in/form/components/reflection-question.tsx` | 問題卡片 UI + 開關 |
| Modify | `daodao-f2e/apps/product/src/components/check-in/form/check-in-sheet.tsx` | 加入 ReflectionQuestion 元件 |

---

## Task 1: 建立 `use-reflection-question` hook

**Files:**
- Create: `daodao-f2e/apps/product/src/components/check-in/form/hooks/use-reflection-question.ts`

- [ ] **Step 1: 建立 hook 檔案**

```ts
import { useState } from "react";

const REFLECTION_QUESTIONS = [
  "今天做了什麼讓你有點小得意的事？",
  "有什麼事讓你「原來如此！」？",
  "今天最順手的一件事是？",
  "有沒有什麼事讓你忍不住想跟人說？",
  "今天卡在哪裡，後來怎麼過的？",
  "有什麼事做完之後感覺還不錯？",
  "今天學到最有趣的一件事是？",
  "有沒有讓你想繼續探索的東西？",
  "今天有沒有讓你小小驚訝的瞬間？",
  "最想記住今天的哪個片刻？",
  "你今天做了什麼「過去的你」做不到的事？",
  "今天有什麼事想明天繼續？",
  "有沒有什麼比想像中簡單的事？",
  "今天的練習，你給自己打幾分？為什麼？",
  "如果今天是一個表情符號，你會選哪個？",
  "今天有沒有什麼事讓你笑了？",
  "有什麼事做到一半，還想繼續做？",
  "今天的你和昨天的你，有什麼不一樣？",
  "有沒有什麼事，做了之後覺得「還好有做」？",
  "今天有沒有碰到讓你印象深刻的人或事？",
  "有什麼事做起來比你預期的還好玩？",
  "今天你最專注的時刻是？",
  "如果要把今天濃縮成一個畫面，是哪個？",
  "有什麼小事讓你覺得今天沒白費？",
  "今天的練習，有沒有讓你想起什麼以前的事？",
];

function pickRandom(excludeIndex: number): number {
  const candidates = REFLECTION_QUESTIONS.map((_, i) => i).filter(
    (i) => i !== excludeIndex
  );
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export const useReflectionQuestion = () => {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * REFLECTION_QUESTIONS.length)
  );

  const nextQuestion = () => {
    setIndex((current) => pickRandom(current));
  };

  return {
    question: REFLECTION_QUESTIONS[index],
    nextQuestion,
  };
};
```

- [ ] **Step 2: 確認 TypeScript 無錯誤**

```bash
cd daodao-f2e && pnpm tsc --noEmit -p apps/product/tsconfig.json 2>&1 | head -20
```

Expected: 無錯誤（或只有既有錯誤，非新增）

---

## Task 2: 建立 `ReflectionQuestion` 元件

**Files:**
- Create: `daodao-f2e/apps/product/src/components/check-in/form/components/reflection-question.tsx`

- [ ] **Step 1: 建立元件**

```tsx
import { cn } from "@daodao/ui/lib/utils";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useReflectionQuestion } from "../hooks/use-reflection-question";

/**
 * 反思問題卡片元件
 * 含開關（預設關閉）、問題顯示、換一題按鈕
 */
export const ReflectionQuestion = () => {
  const [enabled, setEnabled] = useState(false);
  const { question, nextQuestion } = useReflectionQuestion();

  return (
    <div className="mb-3">
      {/* 開關列 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            enabled ? "bg-logo-gray" : "bg-gray-200"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
        <span className="text-sm text-gray-500">反思問題</span>
      </div>

      {/* 問題卡片 */}
      {enabled && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm text-text-dark">{question}</p>
          <button
            type="button"
            onClick={nextQuestion}
            className="flex shrink-0 items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            換一題
          </button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: 確認 TypeScript 無錯誤**

```bash
cd daodao-f2e && pnpm tsc --noEmit -p apps/product/tsconfig.json 2>&1 | head -20
```

Expected: 無錯誤

---

## Task 3: 整合進 `check-in-sheet.tsx`

**Files:**
- Modify: `daodao-f2e/apps/product/src/components/check-in/form/check-in-sheet.tsx`

目前「想法分享」區塊結構：
```tsx
<div className="mb-8">
  <h3 className="text-base font-medium mb-3 text-text-dark">想法分享</h3>
  <TagSelector form={form} />
  <DescriptionField form={form} />
</div>
```

- [ ] **Step 1: 加入 import**

在 `check-in-sheet.tsx` 的 import 區塊加入：
```tsx
import { ReflectionQuestion } from "./components/reflection-question";
```

- [ ] **Step 2: 插入元件**

將「想法分享」區塊改為：
```tsx
<div className="mb-8">
  <h3 className="text-base font-medium mb-3 text-text-dark">想法分享</h3>
  <TagSelector form={form} />
  <ReflectionQuestion />
  <DescriptionField form={form} />
</div>
```

- [ ] **Step 3: 確認 TypeScript 無錯誤**

```bash
cd daodao-f2e && pnpm tsc --noEmit -p apps/product/tsconfig.json 2>&1 | head -20
```

Expected: 無錯誤

- [ ] **Step 4: 瀏覽器手動驗證**

啟動 dev server，開啟打卡 Sheet，確認：
1. 預設看不到反思問題
2. 切換開關後顯示問題卡片
3. 點「換一題」後問題更換，且不重複出現同一題
4. 關閉開關後卡片消失
5. 表單仍可正常提交

- [ ] **Step 5: Commit**

Stage the files:
```bash
git add daodao-f2e/apps/product/src/components/check-in/form/hooks/use-reflection-question.ts \
        daodao-f2e/apps/product/src/components/check-in/form/components/reflection-question.tsx \
        daodao-f2e/apps/product/src/components/check-in/form/check-in-sheet.tsx
```

然後使用 `format-commit` skill 產生 commit message（專案規定）。
