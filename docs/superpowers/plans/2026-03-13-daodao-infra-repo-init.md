# daodao-infra Git Repo 初始化計畫

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 `/Users/xiaoxu/Projects/daodao-infra/` git repo，將 nginx container 從 `daodao-server/` 獨立出來，由 `daodao-infra` 自行管理。推送 nginx.conf 變更後透過 GitHub Actions 自動 SSH 進 VPS 並 reload。

**Architecture:** `daodao-infra` 擁有自己的 `docker-compose.yaml`，定義 nginx service 並加入 `prod-daodao-network`、`dev-daodao-network`（external）。VPS 上有 `daodao-infra` 的 clone，CI/CD 執行 `git pull` + `nginx -s reload`（zero downtime）。初次部署用 `docker compose up -d`。

**Tech Stack:** git、GitHub Actions、Docker Compose、nginx

---

## 架構圖

```
VPS
├── /root/daodao-infra/         ← git clone of daodao-infra
│   ├── docker-compose.yaml     ← nginx service 定義
│   └── nginx/nginx.conf        ← config（git pull 更新）
│
├── /root/daodao-server/        ← git clone of daodao-server（現有）
│   └── docker-compose.yaml     ← 移除 nginx service（本次變更）
│
Docker networks（external）
├── prod-daodao-network         ← nginx + prod_app 都在這
└── dev-daodao-network          ← nginx + dev_app 都在這
```

CI/CD 流程：
```
push nginx/nginx.conf to main
  → GitHub Actions
  → SSH root@LINODE_INSTANCE_IP
  → git -C /root/daodao-infra pull
  → docker exec nginx nginx -t
  → docker exec nginx nginx -s reload
```

---

## 需要的 GitHub Secrets

與 `daodao-server` 使用相同的 secret 名稱，可直接沿用（同一個 VPS）。

| Secret 名稱 | 說明 |
|-------------|------|
| `LINODE_INSTANCE_IP` | VPS IP（與 daodao-server 共用） |
| `LINODE_SSH_PRIVATE_KEY` | SSH 私鑰（與 daodao-server 共用） |

SSH user 固定為 `root`（hardcoded，不用 secret），VPS 路徑固定為 `/root/daodao-infra`。

---

## 目錄結構（目標）

```
/Users/xiaoxu/Projects/daodao-infra/
├── .gitignore
├── README.md
├── docker-compose.yaml         ← nginx service
├── maintenance.html            ← Cloudflare Pages 維護頁
├── nginx/
│   └── nginx.conf
└── .github/
    └── workflows/
        └── deploy-nginx.yml
```

---

## Task 1：建立 repo 目錄結構與 git init

- [ ] **Step 1：建立目錄**

```bash
mkdir -p /Users/xiaoxu/Projects/daodao-infra/nginx
mkdir -p /Users/xiaoxu/Projects/daodao-infra/.github/workflows
```

- [ ] **Step 2：git init**

```bash
cd /Users/xiaoxu/Projects/daodao-infra && git init
```

Expected output: `Initialized empty Git repository in /Users/xiaoxu/Projects/daodao-infra/.git/`

---

## Task 2：建立 .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1：建立 .gitignore**

```
# macOS
.DS_Store
**/.DS_Store

# 編輯器
.idea/
.vscode/
*.swp
*.swo

# 敏感檔案（永遠不進版控）
*.pem
*.key
*.crt
.env
.env.*
```

---

## Task 3：建立 docker-compose.yaml（nginx service）

**Files:**
- Create: `docker-compose.yaml`

nginx 加入 `prod-daodao-network` 和 `dev-daodao-network`，與 `daodao-server` 的服務互通。

- [ ] **Step 1：建立 docker-compose.yaml**

```yaml
services:
  nginx:
    image: nginx:latest
    container_name: nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - prod-daodao-network
      - dev-daodao-network

networks:
  prod-daodao-network:
    external: true
  dev-daodao-network:
    external: true
```

---

## Task 4：移動 nginx.conf

**Files:**
- Copy: `../daodao/nginx.conf` → `nginx/nginx.conf`

- [ ] **Step 1：複製 nginx.conf**

```bash
cp /Users/xiaoxu/Projects/daodao/nginx.conf /Users/xiaoxu/Projects/daodao-infra/nginx/nginx.conf
```

- [ ] **Step 2：確認內容正確**

```bash
diff /Users/xiaoxu/Projects/daodao/nginx.conf /Users/xiaoxu/Projects/daodao-infra/nginx/nginx.conf
```

Expected: 無輸出（完全相同）

---

## Task 5：從 daodao-server 移除 nginx service

**Files:**
- Modify: `../daodao-server/docker-compose.yaml`

> **注意：** 這步驟要在 VPS 上的 nginx 已由 `daodao-infra` 接管後才執行，避免服務中斷。

- [ ] **Step 1：移除 nginx service 區塊**

從 `daodao-server/docker-compose.yaml` 中刪除：

```yaml
# 刪除這整個 service 定義：
  nginx:
    image: nginx:latest
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    environment:
      - APP_ENV=${APP_ENV}
    depends_on:
      - prod_app
      - production_app
      - dev_app
    networks:
      - prod-daodao-network
      - dev-daodao-network
```

- [ ] **Step 2：確認 docker-compose 語法正確**

```bash
docker compose -f /Users/xiaoxu/Projects/daodao/daodao-server/docker-compose.yaml config --quiet
```

Expected: 無錯誤輸出

- [ ] **Step 3：commit 到 daodao-server**

```bash
cd /Users/xiaoxu/Projects/daodao/daodao-server
git add docker-compose.yaml
git commit -m "chore: 移除 nginx service（改由 daodao-infra 管理）"
```

---

## Task 6：建立 GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/deploy-nginx.yml`

- [ ] **Step 1：建立 workflow 檔案**

```yaml
name: Deploy nginx config to VPS

concurrency:
  group: deploy-nginx-${{ github.ref }}
  cancel-in-progress: true

on:
  push:
    branches:
      - main
    paths:
      - 'nginx/nginx.conf'
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy nginx.conf
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Syntax check (local docker)
        run: |
          docker run --rm \
            -v ${{ github.workspace }}/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
            nginx:latest nginx -t

      - name: Pull latest & reload nginx on VPS
        env:
          LINODE_INSTANCE_IP: ${{ secrets.LINODE_INSTANCE_IP }}
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.LINODE_SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H $LINODE_INSTANCE_IP >> ~/.ssh/known_hosts

          ssh -o StrictHostKeyChecking=no \
              -o ServerAliveInterval=30 \
              -o ServerAliveCountMax=3 \
              root@$LINODE_INSTANCE_IP << 'ENDSSH'
            set -e
            export APP_DIR=/root/daodao-infra

            echo "==> Pulling latest config..."
            git -C $APP_DIR pull

            echo "==> Testing nginx config..."
            docker exec nginx nginx -t

            echo "==> Reloading nginx..."
            docker exec nginx nginx -s reload

            echo "==> Done."
          ENDSSH
```

---

## Task 7：建立 README.md

- [ ] **Step 1：建立 README.md**

```markdown
# daodao-infra

島島基礎設施配置。

## 服務

### nginx（reverse proxy）

管理所有進入 VPS 的 HTTP/HTTPS 流量，路由到各 Docker 服務。

- config：`nginx/nginx.conf`
- networks：`prod-daodao-network`、`dev-daodao-network`

## 部署流程

### 初次啟動（VPS）

```bash
git clone git@github.com:<org>/daodao-infra.git /root/daodao-infra
cd /root/daodao-infra
docker compose up -d
```

### 更新 nginx config

推送 `nginx/nginx.conf` 變更到 `main`，GitHub Actions 自動：

1. 本地語法驗證（`docker run nginx -t`）
2. VPS `git pull`
3. `docker exec nginx nginx -t`
4. `docker exec nginx nginx -s reload`（zero downtime）

## GitHub Secrets 設定

與 `daodao-server` 使用相同 secret 名稱，直接沿用：

| Secret | 說明 |
|--------|------|
| `LINODE_INSTANCE_IP` | VPS IP |
| `LINODE_SSH_PRIVATE_KEY` | SSH 私鑰 |

## 相關 Repo

| Repo | 說明 |
|------|------|
| daodao/ | 產品大腦：docs + openspec |
| daodao-server/ | 後端 API |
| daodao-f2e/ | 前端 |
| daodao-ai-backend/ | AI 後端 |
| daodao-storage/ | DB + 備份 |
```

---

## Task 8：初次 commit

- [ ] **Step 1：stage 所有檔案**

```bash
cd /Users/xiaoxu/Projects/daodao-infra
git add .gitignore README.md docker-compose.yaml nginx/ .github/
```

- [ ] **Step 2：確認 staged 內容**

```bash
git status
git diff --staged --stat
```

確認清單：
- `.gitignore` ✓
- `README.md` ✓
- `docker-compose.yaml` ✓
- `nginx/nginx.conf` ✓
- `.github/workflows/deploy-nginx.yml` ✓
- 無 `.pem`、`.key`、`.env` ✓

- [ ] **Step 3：初次 commit**

```bash
git commit -m "init: 建立 daodao-infra repo，nginx 從 daodao-server 獨立"
```

---

## Task 9：設定 GitHub Remote 與 Secrets

- [ ] **Step 1：在 GitHub 建立 daodao-infra repo（手動）**

GitHub → New repository → `daodao-infra`、Private、不勾選初始化

- [ ] **Step 2：設定 remote 並推送**

```bash
cd /Users/xiaoxu/Projects/daodao-infra
git remote add origin git@github.com:<org>/daodao-infra.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3：設定 GitHub Secrets（手動）**

GitHub repo → Settings → Secrets and variables → Actions → New repository secret：
- `LINODE_INSTANCE_IP`（值與 daodao-server 相同）
- `LINODE_SSH_PRIVATE_KEY`（值與 daodao-server 相同）

---

## Task 10：維護頁面與 Cloudflare 停機保底

**目的：** 切換 nginx 期間（< 1 分鐘）若有請求進來，Cloudflare 自動顯示維護頁，避免使用者看到裸錯誤。

**Files:**
- Create: `maintenance.html`

- [ ] **Step 1：建立 maintenance.html**

直接在 `daodao-infra/` 建立 `maintenance.html`（內容參考 `daodao-f2e/packages/assets/images/island/maintenance.html`）。

- [ ] **Step 2：commit 並 push**

```bash
cd /Users/xiaoxu/Projects/daodao-infra
git add maintenance.html
git commit -m "feat: 加入維護頁面"
git push
```

- [ ] **Step 3：部署到 Cloudflare Pages（手動）**

Cloudflare Dashboard → Workers & Pages → Create → Pages → **Connect to Git**：
- 授權 GitHub，選擇 `daodao-infra` repo
- Framework preset: `None`
- Build command: 留空
- Build output directory: `/`
- Deploy

取得 URL：`https://daodao-infra.pages.dev/maintenance.html`

- [ ] **Step 4：設定 Cloudflare Custom Error Page（手動）**

Cloudflare Dashboard → 選擇 domain → **Custom Pages** → **500 Class Errors** → Customize：
- 填入 URL：`https://daodao-infra.pages.dev/maintenance.html`
- 儲存

> 設定完成後，只要 origin（nginx）掛掉，Cloudflare 就自動顯示維護頁。

---

## Task 11：VPS 初次部署

> 執行順序：先用 `daodao-infra` 啟動 nginx，再從 `daodao-server` 移除舊的 nginx（Task 5）。

- [ ] **Step 1：SSH 進 VPS**

```bash
ssh root@<LINODE_INSTANCE_IP>
```

- [ ] **Step 2：停止並移除舊的 nginx container**

```bash
docker stop nginx && docker rm nginx
```

- [ ] **Step 3：設定 VPS Deploy Key（首次）**

在 VPS 上產生 SSH key 並加到 GitHub repo：

```bash
# 在 VPS 上執行
ssh-keygen -t ed25519 -C "daodao-infra-vps" -f ~/.ssh/daodao_infra_deploy -N ""
cat ~/.ssh/daodao_infra_deploy.pub
```

複製 public key → GitHub `daodao-infra` repo → Settings → **Deploy keys** → Add deploy key：
- Title: `VPS Deploy Key`
- Key: 貼上 public key
- 勾選 **Allow write access**: 不需要（read-only 即可）

設定 SSH config：
```bash
cat >> ~/.ssh/config << 'EOF'
Host github-daodao-infra
  HostName github.com
  User git
  IdentityFile ~/.ssh/daodao_infra_deploy
EOF
```

- [ ] **Step 4：clone daodao-infra**

```bash
git clone git@github-daodao-infra:<org>/daodao-infra.git /root/daodao-infra
```

- [ ] **Step 5：啟動 nginx**

```bash
cd /root/daodao-infra
docker compose up -d
```

- [ ] **Step 6：確認 nginx 正常運作**

```bash
docker ps | grep nginx
curl -s -o /dev/null -w "%{http_code}" http://localhost
```

Expected: nginx container 狀態 Up，HTTP 回應正常

---

## Task 12：驗證 CI/CD

- [ ] **Step 1：本地修改 nginx.conf（加一行 comment）**

```bash
echo "# test deploy $(date)" >> /Users/xiaoxu/Projects/daodao-infra/nginx/nginx.conf
```

- [ ] **Step 2：commit 並 push**

```bash
cd /Users/xiaoxu/Projects/daodao-infra
git add nginx/nginx.conf
git commit -m "test: 驗證 CI/CD 自動部署"
git push
```

- [ ] **Step 3：觀察 GitHub Actions 執行結果**

GitHub → Actions，確認三步驟全部 Pass：
1. `Syntax check (local docker)`
2. `Pull latest & reload nginx on VPS`（log 出現 `Done.`）

- [ ] **Step 4：還原測試變更**

```bash
git revert HEAD --no-edit
git push
```

---

## 完成後的全局圖

| Repo | 定位 |
|------|------|
| `daodao/` | 產品大腦：docs + openspec |
| `daodao-infra/` | 基礎設施：nginx（獨立 container，自動部署） |
| `daodao-server/` | 後端 API（不再管 nginx） |
| `daodao-f2e/` | 前端 |
| `daodao-ai-backend/` | AI 後端 |
| `daodao-storage/` | DB + 備份 |
