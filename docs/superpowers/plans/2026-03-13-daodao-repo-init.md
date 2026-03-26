# daodao 知識庫 Git Repo 初始化計畫

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 `/Users/xiaoxu/Projects/daodao/` 初始化為 git repo，統一管理 `doc/`、`openspec/`、`docs/` 三個目錄的版控。

**Architecture:** 根目錄 init 為 git repo，透過 `.gitignore` 排除已有獨立 git repo 的子目錄（`daodao-*`），只追蹤產品文件與 spec 相關檔案。`nginx.conf` 因為屬於 infra 範疇，移到 `docs/infra/` 歸檔保存。

**Tech Stack:** git

---

## 目前目錄結構

```
/Users/xiaoxu/Projects/daodao/
├── daodao-ai-backend/   ← 獨立 git repo，排除
├── daodao-f2e/          ← 獨立 git repo，排除
├── daodao-server/       ← 獨立 git repo，排除
├── daodao-storage/      ← 獨立 git repo，排除
├── docs/                ← 要納入版控：PRD、FRD、research、CICD、bug 紀錄、superpowers plans...
├── openspec/            ← 要納入版控：spec-driven 工作流（changes、specs）
└── nginx.conf           ← 移到 docs/infra/ 後納入版控
```

---

## Task 1：移動 nginx.conf 到 docs/infra/

**Files:**
- Move: `nginx.conf` → `docs/infra/nginx.conf`

- [ ] **Step 1：建立 docs/infra/ 目錄並移動檔案**

```bash
mkdir -p /Users/xiaoxu/Projects/daodao/docs/infra
mv /Users/xiaoxu/Projects/daodao/nginx.conf /Users/xiaoxu/Projects/daodao/docs/infra/nginx.conf
```

- [ ] **Step 2：確認移動成功**

```bash
ls /Users/xiaoxu/Projects/daodao/docs/infra/
ls /Users/xiaoxu/Projects/daodao/nginx.conf 2>&1  # 應該顯示 No such file
```

---

## Task 2：git init 並建立 .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1：在根目錄執行 git init**

```bash
cd /Users/xiaoxu/Projects/daodao && git init
```

Expected output: `Initialized empty Git repository in /Users/xiaoxu/Projects/daodao/.git/`

- [ ] **Step 2：建立 .gitignore**

內容如下，排除各獨立 repo 子目錄與 macOS 垃圾檔：

```
# 獨立 git repo — 不追蹤
daodao-ai-backend/
daodao-f2e/
daodao-server/
daodao-storage/

# macOS
.DS_Store
**/.DS_Store

# Claude Code
.claude/

# 編輯器
.idea/
.vscode/
*.swp
*.swo
```

- [ ] **Step 3：確認 .gitignore 生效**

```bash
git -C /Users/xiaoxu/Projects/daodao status
```

確認 `daodao-*/` 子目錄不出現在 untracked files。

---

## Task 3：初次 commit

- [ ] **Step 1：stage 所有要追蹤的檔案**

```bash
cd /Users/xiaoxu/Projects/daodao
git add .gitignore docs/ openspec/
```

- [ ] **Step 2：確認 staged 內容正確**

```bash
git status
git diff --staged --stat
```

確認清單：
- `.gitignore` ✓
- `docs/**` ✓（PRD、FRD、CICD、bug、infra/nginx.conf、superpowers plans...）
- `openspec/changes/**` ✓、`openspec/config.yaml` ✓
- `daodao-*/` **不出現** ✓

- [ ] **Step 3：執行初次 commit**

```bash
git commit -m "init: 建立產品知識庫 repo

追蹤 doc/（PRD、FRD、research、infra）、
openspec/（spec-driven 工作流）、
docs/（superpowers plans）。"
```

- [ ] **Step 4：確認 commit 成功**

```bash
git log --oneline -1
```

---

## 完成後的結構

```
/Users/xiaoxu/Projects/daodao/     ← git repo（產品大腦）
├── .gitignore
├── docs/
│   ├── infra/
│   │   └── nginx.conf
│   ├── CICD-GCP/
│   ├── Onboarding PRD.md
│   ├── superpowers/plans/
│   └── ...
├── openspec/
│   ├── config.yaml
│   ├── changes/
│   └── specs/
daodao-ai-backend/   ← 獨立 repo（不變）
daodao-f2e/          ← 獨立 repo（不變）
daodao-server/       ← 獨立 repo（不變）
daodao-storage/      ← 獨立 repo（不變）
```

---

## 完整全局圖（供參考）

| Repo | 定位 |
|------|------|
| `daodao/` | 產品大腦：doc + openspec |
| `daodao-infra/` | 基礎設施（nginx、server init）|
| `daodao-server/` | 後端 API |
| `daodao-f2e/` | 前端 |
| `daodao-ai-backend/` | AI 後端 |
| `daodao-storage/` | DB + 備份 |
