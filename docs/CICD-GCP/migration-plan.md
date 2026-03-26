# DaoDao GCP + Kubernetes + ArgoCD 遷移規劃

> 版本: v1.0
> 日期: 2025-12-19
> 目標: 將 DaoDao 平台從 Linode VPS 遷移至 GCP Kubernetes，並使用 ArgoCD 實現 GitOps

---

## 目錄

1. [遷移目標](#遷移目標)
2. [當前架構 vs 目標架構](#當前架構-vs-目標架構)
3. [GCP 服務選型](#gcp-服務選型)
4. [Kubernetes 架構設計](#kubernetes-架構設計)
5. [ArgoCD 部署策略](#argocd-部署策略)
6. [資料庫遷移策略](#資料庫遷移策略)
7. [網路與安全](#網路與安全)
8. [成本估算](#成本估算)
9. [遷移步驟](#遷移步驟)
10. [風險評估與應對](#風險評估與應對)
11. [回滾計畫](#回滾計畫)

---

## 遷移目標

### 主要目標

1. **高可用性**: 使用 Kubernetes 實現服務的自動擴展和故障轉移
2. **GitOps**: 透過 ArgoCD 實現宣告式配置和自動化部署
3. **可觀測性**: 整合 GCP 監控、日誌和追蹤服務
4. **成本優化**: 利用 GKE Autopilot 或標準模式降低運維成本
5. **DevOps 最佳實踐**: CI/CD 自動化、滾動更新、金絲雀部署

### 遷移範圍

| 服務 | 當前部署 | 遷移目標 | 狀態 |
|------|---------|---------|------|
| 前端 (daodao-f2e) | Cloudflare Pages | **保持不變** | 不遷移 |
| 後端 (daodao-server) | Linode VPS | GKE | 需遷移 |
| AI後端 (daodao-ai-backend) | Linode VPS | GKE | 需遷移 |
| PostgreSQL | Linode VPS | Cloud SQL for PostgreSQL | 需遷移 |
| MongoDB | Linode VPS | GKE (StatefulSet) 或 MongoDB Atlas | 需遷移 |
| Redis | Linode VPS | Memorystore for Redis | 需遷移 |
| ClickHouse | Linode VPS | GKE (StatefulSet) | 需遷移 |
| Qdrant | Linode VPS | GKE (StatefulSet) | 需遷移 |
| 檔案儲存 (R2) | Cloudflare R2 | **保持不變** | 不遷移 |

---

## 當前架構 vs 目標架構

### 當前架構

```
┌────────────────────────────────┐
│   Cloudflare Pages (前端)      │
└────────────┬───────────────────┘
             │ HTTPS
             ▼
┌────────────────────────────────┐
│     Linode VPS (單一伺服器)     │
│  ┌──────────────────────────┐  │
│  │  daodao-server (Docker)  │  │
│  │  - Express.js + PM2      │  │
│  │  - Port: 4000            │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ daodao-ai-backend (Docker)│ │
│  │  - FastAPI + Uvicorn     │  │
│  │  - Port: 8000            │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │   資料庫 (Docker Compose) │  │
│  │  - PostgreSQL            │  │
│  │  - MongoDB               │  │
│  │  - Redis                 │  │
│  │  - ClickHouse            │  │
│  │  - Qdrant                │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

### 目標架構

```
┌─────────────────────────────────────────────────────────────────┐
│                        Google Cloud Platform                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  GKE Cluster (Kubernetes)                   │ │
│  │                                                              │ │
│  │  ┌─────────────────────┐    ┌──────────────────────────┐   │ │
│  │  │  daodao-server      │    │  daodao-ai-backend       │   │ │
│  │  │  - Deployment       │    │  - Deployment            │   │ │
│  │  │  - HPA (2-10 pods)  │    │  - HPA (2-5 pods)        │   │ │
│  │  │  - Service (ClusterIP)   │  - Service (ClusterIP)   │   │ │
│  │  └─────────────────────┘    └──────────────────────────┘   │ │
│  │                                                              │ │
│  │  ┌─────────────────────┐    ┌──────────────────────────┐   │ │
│  │  │  MongoDB            │    │  ClickHouse              │   │ │
│  │  │  - StatefulSet      │    │  - StatefulSet           │   │ │
│  │  │  - Persistent Volume│    │  - Persistent Volume     │   │ │
│  │  └─────────────────────┘    └──────────────────────────┘   │ │
│  │                                                              │ │
│  │  ┌─────────────────────┐                                    │ │
│  │  │  Qdrant             │                                    │ │
│  │  │  - StatefulSet      │                                    │ │
│  │  │  - Persistent Volume│                                    │ │
│  │  └─────────────────────┘                                    │ │
│  │                                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │              Ingress-NGINX Controller               │   │ │
│  │  │  - SSL/TLS Termination (Let's Encrypt)              │   │ │
│  │  │  - Load Balancer                                    │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    管理資料庫服務                           │ │
│  │  ┌──────────────────┐  ┌──────────────────────────────┐   │ │
│  │  │  Cloud SQL       │  │  Memorystore for Redis       │   │ │
│  │  │  - PostgreSQL 14 │  │  - 高可用性配置              │   │ │
│  │  │  - 自動備份      │  │  - 自動故障轉移              │   │ │
│  │  └──────────────────┘  └──────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      ArgoCD 部署                            │ │
│  │  - GitOps 自動化部署                                        │ │
│  │  - 多環境管理 (dev/staging/prod)                            │ │
│  │  - 自動同步和健康檢查                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   監控與日誌                                │ │
│  │  - Cloud Monitoring (Prometheus相容)                        │ │
│  │  - Cloud Logging (集中式日誌)                               │ │
│  │  - Cloud Trace (分散式追蹤)                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTPS
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Pages (前端)                        │
│                      - 保持不變                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## GCP 服務選型

### 計算服務

#### 1. Google Kubernetes Engine (GKE)

**選擇模式**: GKE Standard（標準模式）

**理由**:
- 更好的控制權和彈性
- 支援節點池 (Node Pools) 自訂配置
- 適合有狀態服務 (StatefulSet)
- 成本可控

**叢集配置**:
```yaml
叢集名稱: daodao-production-cluster
區域: asia-east1 (台灣)
Kubernetes版本: 1.28.x (穩定版本)
節點池配置:
  - 一般工作負載池:
      機器類型: e2-standard-4 (4 vCPU, 16GB RAM)
      節點數量: 3-10 (自動擴展)
      磁碟: 100GB SSD
  - 資料庫工作負載池 (可選):
      機器類型: n2-highmem-4 (4 vCPU, 32GB RAM)
      節點數量: 2-4
      磁碟: 200GB SSD
      污點: database=true:NoSchedule
```

**備選方案**: GKE Autopilot
- 優點: 完全託管、自動擴展、按 Pod 計費
- 缺點: 對有狀態服務支援有限、成本較高

### 資料庫服務

#### 1. Cloud SQL for PostgreSQL

**配置**:
```yaml
版本: PostgreSQL 14
層級: db-custom-4-16384 (4 vCPU, 16GB RAM)
儲存: 100GB SSD (自動擴展至 500GB)
高可用性: 啟用 (主-備架構)
備份:
  - 自動備份: 每日 00:00 UTC
  - 保留期限: 30天
  - PITR (時間點恢復): 啟用
區域: asia-east1
連線方式: Private IP (VPC Peering) + Cloud SQL Proxy
```

**成本優化**:
- 使用 Committed Use Discounts (1年或3年承諾使用折扣)
- 非尖峰時段縮減容量

#### 2. Memorystore for Redis

**配置**:
```yaml
版本: Redis 7.0
層級: Standard (高可用性)
容量: 5GB (可擴展)
區域: asia-east1
連線模式: Private IP
複本: 1個讀取複本
```

#### 3. MongoDB (兩種選項)

**選項 A: GKE StatefulSet (推薦)**
```yaml
部署方式: StatefulSet
副本數: 3 (Replica Set)
儲存:
  - StorageClass: pd-ssd
  - 每個副本: 100GB
  - VolumeClaimTemplate
備份: 使用 mongodump + Cloud Storage
監控: Prometheus MongoDB Exporter
```

**選項 B: MongoDB Atlas**
```yaml
供應商: MongoDB Atlas (GCP Marketplace)
層級: M10 (2GB RAM, 10GB Storage)
區域: asia-east1
優點: 完全託管、自動備份、效能洞察
缺點: 額外成本
```

#### 4. ClickHouse 和 Qdrant

**部署方式**: GKE StatefulSet + Persistent Volumes
```yaml
ClickHouse:
  副本數: 2
  儲存: 200GB SSD per replica
  資源限制:
    CPU: 2 cores
    Memory: 8GB

Qdrant:
  副本數: 2
  儲存: 50GB SSD per replica
  資源限制:
    CPU: 1 core
    Memory: 4GB
```

### 網路服務

#### 1. Cloud Load Balancing + Ingress

```yaml
類型: HTTPS Load Balancer (L7)
SSL憑證: Google-managed SSL certificates
後端: GKE Ingress-NGINX
CDN: Cloud CDN (可選)
```

#### 2. Cloud Armor (可選)

- DDoS 防護
- WAF 規則
- 速率限制

### 儲存服務

#### 1. Persistent Disks

```yaml
類型:
  - pd-ssd: 用於資料庫和高效能工作負載
  - pd-standard: 用於日誌和備份
快照: 每日自動快照
```

#### 2. Cloud Storage

```yaml
用途:
  - 資料庫備份
  - 日誌歸檔
  - ArgoCD manifests 儲存
儲存類別: Standard (亞洲多區域)
```

### 監控與日誌

#### 1. Cloud Monitoring

```yaml
整合:
  - GKE 原生整合
  - Prometheus 相容
指標保留: 6個月
告警:
  - CPU/Memory 使用率 > 80%
  - Pod 重啟次數異常
  - 磁碟空間不足
通知管道: Email, Slack, PagerDuty
```

#### 2. Cloud Logging

```yaml
日誌類型:
  - 容器日誌 (stdout/stderr)
  - 系統日誌
  - 審計日誌
保留期限: 30天 (可擴展至 Cloud Storage)
```

#### 3. Cloud Trace

```yaml
整合: OpenTelemetry
採樣率: 10%
```

---

## Kubernetes 架構設計

### 命名空間設計

```yaml
namespaces:
  - daodao-production      # 生產環境
  - daodao-staging         # 測試環境
  - daodao-dev             # 開發環境
  - argocd                 # ArgoCD 系統
  - monitoring             # Prometheus, Grafana
  - cert-manager           # SSL 憑證管理
  - ingress-nginx          # Ingress 控制器
```

### 應用程式部署清單

#### 1. daodao-server (後端服務)

**Deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: daodao-server
  namespace: daodao-production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: daodao-server
  template:
    metadata:
      labels:
        app: daodao-server
    spec:
      containers:
      - name: server
        image: your-registry/daodao-server:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: postgres-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: redis-url
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
```

**HorizontalPodAutoscaler**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: daodao-server-hpa
  namespace: daodao-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: daodao-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**Service**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: daodao-server
  namespace: daodao-production
spec:
  type: ClusterIP
  selector:
    app: daodao-server
  ports:
  - protocol: TCP
    port: 4000
    targetPort: 4000
```

#### 2. daodao-ai-backend (AI服務)

**Deployment** (類似結構，調整端口和資源):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: daodao-ai-backend
  namespace: daodao-production
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: ai-backend
        image: your-registry/daodao-ai-backend:latest
        ports:
        - containerPort: 8000
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 4000m
            memory: 8Gi
```

#### 3. MongoDB StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: daodao-production
spec:
  serviceName: mongodb
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:7.0
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          valueFrom:
            secretKeyRef:
              name: mongodb-credentials
              key: username
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-credentials
              key: password
        volumeMounts:
        - name: mongodb-data
          mountPath: /data/db
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
  volumeClaimTemplates:
  - metadata:
      name: mongodb-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: pd-ssd
      resources:
        requests:
          storage: 100Gi
```

#### 4. ClickHouse StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: clickhouse
  namespace: daodao-production
spec:
  serviceName: clickhouse
  replicas: 2
  selector:
    matchLabels:
      app: clickhouse
  template:
    metadata:
      labels:
        app: clickhouse
    spec:
      containers:
      - name: clickhouse
        image: clickhouse/clickhouse-server:23.3
        ports:
        - containerPort: 8123
          name: http
        - containerPort: 9000
          name: native
        volumeMounts:
        - name: clickhouse-data
          mountPath: /var/lib/clickhouse
        resources:
          requests:
            cpu: 1000m
            memory: 4Gi
          limits:
            cpu: 2000m
            memory: 8Gi
  volumeClaimTemplates:
  - metadata:
      name: clickhouse-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: pd-ssd
      resources:
        requests:
          storage: 200Gi
```

#### 5. Qdrant StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: qdrant
  namespace: daodao-production
spec:
  serviceName: qdrant
  replicas: 2
  selector:
    matchLabels:
      app: qdrant
  template:
    metadata:
      labels:
        app: qdrant
    spec:
      containers:
      - name: qdrant
        image: qdrant/qdrant:v1.7.3
        ports:
        - containerPort: 6333
        volumeMounts:
        - name: qdrant-data
          mountPath: /qdrant/storage
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 1000m
            memory: 4Gi
  volumeClaimTemplates:
  - metadata:
      name: qdrant-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: pd-ssd
      resources:
        requests:
          storage: 50Gi
```

### Ingress 配置

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: daodao-ingress
  namespace: daodao-production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.daodao.example.com
    - ai.daodao.example.com
    secretName: daodao-tls
  rules:
  - host: api.daodao.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: daodao-server
            port:
              number: 4000
  - host: ai.daodao.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: daodao-ai-backend
            port:
              number: 8000
```

### ConfigMaps 和 Secrets

**ConfigMap 範例**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: daodao-server-config
  namespace: daodao-production
data:
  NODE_ENV: "production"
  PORT: "4000"
  FRONTEND_URL: "https://daodao.example.com"
```

**Secret 範例** (使用 External Secrets Operator):
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: daodao-production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcpsm-secret-store
    kind: ClusterSecretStore
  target:
    name: database-credentials
  data:
  - secretKey: postgres-url
    remoteRef:
      key: daodao-postgres-url
  - secretKey: redis-url
    remoteRef:
      key: daodao-redis-url
```

---

## ArgoCD 部署策略

### ArgoCD 安裝

```bash
# 1. 建立 argocd namespace
kubectl create namespace argocd

# 2. 安裝 ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 3. 安裝 ArgoCD CLI
brew install argocd  # macOS
# 或
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64

# 4. 暴露 ArgoCD Server (LoadBalancer 或 Ingress)
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'
```

### Git Repository 結構

```
daodao-k8s-manifests/
├── README.md
├── apps/
│   ├── daodao-server/
│   │   ├── base/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── hpa.yaml
│   │   │   └── kustomization.yaml
│   │   ├── overlays/
│   │   │   ├── dev/
│   │   │   │   ├── kustomization.yaml
│   │   │   │   └── patch-replicas.yaml
│   │   │   ├── staging/
│   │   │   │   └── kustomization.yaml
│   │   │   └── production/
│   │   │       ├── kustomization.yaml
│   │   │       └── patch-resources.yaml
│   ├── daodao-ai-backend/
│   │   ├── base/
│   │   └── overlays/
│   ├── mongodb/
│   │   ├── base/
│   │   └── overlays/
│   ├── clickhouse/
│   │   ├── base/
│   │   └── overlays/
│   └── qdrant/
│       ├── base/
│       └── overlays/
├── infrastructure/
│   ├── ingress-nginx/
│   ├── cert-manager/
│   └── external-secrets/
└── argocd/
    ├── applications/
    │   ├── daodao-server.yaml
    │   ├── daodao-ai-backend.yaml
    │   ├── mongodb.yaml
    │   ├── clickhouse.yaml
    │   └── qdrant.yaml
    └── projects/
        └── daodao.yaml
```

### ArgoCD Application 定義

**daodao-server Application**:
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: daodao-server
  namespace: argocd
spec:
  project: daodao
  source:
    repoURL: https://github.com/your-org/daodao-k8s-manifests.git
    targetRevision: main
    path: apps/daodao-server/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: daodao-production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
    - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  revisionHistoryLimit: 10
```

### 部署策略

#### 1. 滾動更新 (Rolling Update)

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

#### 2. 金絲雀部署 (Canary Deployment)

使用 Argo Rollouts:
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: daodao-server
spec:
  replicas: 5
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 5m}
      - setWeight: 40
      - pause: {duration: 5m}
      - setWeight: 60
      - pause: {duration: 5m}
      - setWeight: 80
      - pause: {duration: 5m}
  template:
    spec:
      containers:
      - name: daodao-server
        image: your-registry/daodao-server:latest
```

#### 3. 藍綠部署 (Blue-Green Deployment)

```yaml
strategy:
  blueGreen:
    activeService: daodao-server-active
    previewService: daodao-server-preview
    autoPromotionEnabled: false
    scaleDownDelaySeconds: 30
```

---

## 資料庫遷移策略

### PostgreSQL 遷移

#### 方法 1: 使用 Database Migration Service (推薦)

```bash
# 1. 建立 Cloud SQL 實例
gcloud sql instances create daodao-postgres \
  --database-version=POSTGRES_14 \
  --tier=db-custom-4-16384 \
  --region=asia-east1 \
  --network=projects/YOUR_PROJECT/global/networks/default \
  --enable-bin-log \
  --backup-start-time=00:00

# 2. 使用 DMS 建立遷移任務
gcloud database-migration migration-jobs create daodao-pg-migration \
  --region=asia-east1 \
  --type=CONTINUOUS \
  --source=linode-postgres \
  --destination=daodao-postgres

# 3. 執行遷移
gcloud database-migration migration-jobs start daodao-pg-migration

# 4. 驗證資料一致性
# 5. 切換應用程式連線
# 6. 完成遷移
```

#### 方法 2: pg_dump/pg_restore

```bash
# 1. 在 Linode 匯出資料
pg_dump -h linode-host -U user -d daodao -F c -f daodao_backup.dump

# 2. 上傳到 Cloud Storage
gsutil cp daodao_backup.dump gs://daodao-backups/

# 3. 匯入到 Cloud SQL
gcloud sql import sql daodao-postgres \
  gs://daodao-backups/daodao_backup.dump \
  --database=daodao

# 4. 執行 Prisma migrations (如果需要)
pnpm run prisma:migrate:deploy
```

### MongoDB 遷移

```bash
# 1. 使用 mongodump 備份
mongodump --uri="mongodb://linode-host:27017/daodao" --out=/backup

# 2. 上傳到 Cloud Storage
gsutil -m cp -r /backup gs://daodao-backups/mongodb/

# 3. 在 GKE 建立 MongoDB StatefulSet

# 4. 使用 mongorestore 還原
kubectl exec -it mongodb-0 -n daodao-production -- \
  mongorestore --uri="mongodb://localhost:27017/daodao" /backup/daodao

# 5. 驗證資料完整性
```

### Redis 遷移

```bash
# 1. 在 Linode 建立 RDB 快照
redis-cli BGSAVE

# 2. 複製 dump.rdb 到 Cloud Storage
gsutil cp /var/lib/redis/dump.rdb gs://daodao-backups/redis/

# 3. 在 Memorystore 啟用匯入
gcloud redis instances import daodao-redis \
  gs://daodao-backups/redis/dump.rdb \
  --region=asia-east1

# 4. 更新應用程式 Redis 連線字串
```

### ClickHouse 和 Qdrant 遷移

```bash
# ClickHouse
# 1. 匯出資料
clickhouse-client --query="SELECT * FROM database.table FORMAT Native" > backup.native

# 2. 在 GKE 還原
kubectl cp backup.native clickhouse-0:/tmp/ -n daodao-production
kubectl exec -it clickhouse-0 -n daodao-production -- \
  clickhouse-client --query="INSERT INTO database.table FORMAT Native" < /tmp/backup.native

# Qdrant
# 1. 使用 Qdrant API 建立快照
curl -X POST 'http://linode-host:6333/collections/{collection}/snapshots'

# 2. 下載快照並上傳到 GKE
# 3. 使用 API 還原快照
```

---

## 網路與安全

### VPC 設計

```yaml
VPC名稱: daodao-vpc
子網路:
  - 名稱: gke-subnet
    區域: asia-east1
    IP範圍: 10.0.0.0/20
    用途: GKE 節點
  - 名稱: cloudsql-subnet
    區域: asia-east1
    IP範圍: 10.1.0.0/24
    用途: Cloud SQL Private IP
  - 名稱: memorystore-subnet
    區域: asia-east1
    IP範圍: 10.2.0.0/24
    用途: Memorystore Redis
```

### 防火牆規則

```bash
# 允許 GKE 存取 Cloud SQL
gcloud compute firewall-rules create allow-gke-to-cloudsql \
  --network=daodao-vpc \
  --allow=tcp:5432 \
  --source-ranges=10.0.0.0/20 \
  --target-tags=cloudsql

# 允許健康檢查
gcloud compute firewall-rules create allow-health-check \
  --network=daodao-vpc \
  --allow=tcp:80,tcp:443,tcp:4000,tcp:8000 \
  --source-ranges=130.211.0.0/22,35.191.0.0/16
```

### SSL/TLS 配置

**使用 cert-manager + Let's Encrypt**:

```bash
# 1. 安裝 cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# 2. 建立 ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@daodao.example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### IAM 與 RBAC

**Service Account**:
```bash
# 建立 GKE Service Account
gcloud iam service-accounts create daodao-gke-sa \
  --display-name="DaoDao GKE Service Account"

# 授予權限
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:daodao-gke-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Workload Identity 綁定
kubectl annotate serviceaccount daodao-server \
  -n daodao-production \
  iam.gke.io/gcp-service-account=daodao-gke-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

**Kubernetes RBAC**:
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: daodao-production
  name: daodao-deployer
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets"]
  verbs: ["get", "list", "update", "patch"]
```

### Secrets 管理

**使用 Google Secret Manager + External Secrets Operator**:

```bash
# 1. 安裝 External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system --create-namespace

# 2. 建立 ClusterSecretStore
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: gcpsm-secret-store
spec:
  provider:
    gcpsm:
      projectID: "YOUR_PROJECT_ID"
      auth:
        workloadIdentity:
          clusterLocation: asia-east1
          clusterName: daodao-production-cluster
          serviceAccountRef:
            name: external-secrets-sa
EOF
```

---

## 成本估算

### 每月成本預估 (USD)

| 服務 | 規格 | 預估成本 |
|------|------|---------|
| **GKE 標準叢集** | 叢集管理費 | $73 |
| **GKE 節點** | 3x e2-standard-4 (24/7) | $220 |
| **GKE 自動擴展節點** | 平均 2x e2-standard-4 | $147 |
| **Cloud SQL (PostgreSQL)** | db-custom-4-16384 + 100GB | $280 |
| **Cloud SQL HA Replica** | 備份與高可用性 | $140 |
| **Memorystore Redis** | 5GB Standard | $110 |
| **Persistent Disks (SSD)** | 700GB 總計 | $120 |
| **Load Balancer** | HTTPS LB | $18 |
| **Cloud Monitoring** | 基本監控 | $50 |
| **Cloud Logging** | 50GB/月 | $25 |
| **網路流量** | 100GB egress | $12 |
| **Cloud Storage** | 100GB 備份 | $2 |
| **預留空間** | 意外支出 | $50 |
| **總計** | | **~$1,247/月** |

### 成本優化建議

1. **使用承諾使用折扣 (CUD)**:
   - 1年承諾: 節省 25%
   - 3年承諾: 節省 52%
   - 預估節省: $300-500/月

2. **使用 Preemptible VMs**:
   - 適合開發/測試環境
   - 成本降低 80%

3. **資源調整**:
   - 非尖峰時段縮減副本數
   - 使用 Cluster Autoscaler

4. **Reserved Capacity**:
   - Cloud SQL 預留實例折扣

**優化後預估成本**: **$800-900/月**

---

## 遷移步驟

### 階段 1: 準備階段 (Week 1-2)

#### 1.1 GCP 專案設定

```bash
# 建立 GCP 專案
gcloud projects create daodao-production --name="DaoDao Production"

# 設定計費帳戶
gcloud beta billing projects link daodao-production \
  --billing-account=BILLING_ACCOUNT_ID

# 啟用 API
gcloud services enable container.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
```

#### 1.2 建立 VPC 和網路

```bash
# 建立 VPC
gcloud compute networks create daodao-vpc \
  --subnet-mode=custom \
  --bgp-routing-mode=regional

# 建立子網路
gcloud compute networks subnets create gke-subnet \
  --network=daodao-vpc \
  --region=asia-east1 \
  --range=10.0.0.0/20 \
  --enable-private-ip-google-access

gcloud compute networks subnets create cloudsql-subnet \
  --network=daodao-vpc \
  --region=asia-east1 \
  --range=10.1.0.0/24
```

#### 1.3 建立 GKE 叢集

```bash
gcloud container clusters create daodao-production-cluster \
  --region=asia-east1 \
  --network=daodao-vpc \
  --subnetwork=gke-subnet \
  --enable-ip-alias \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=5 \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --disk-size=100 \
  --disk-type=pd-ssd \
  --enable-autorepair \
  --enable-autoupgrade \
  --workload-pool=daodao-production.svc.id.goog \
  --addons=HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
  --release-channel=regular

# 取得憑證
gcloud container clusters get-credentials daodao-production-cluster \
  --region=asia-east1
```

#### 1.4 安裝基礎設施元件

```bash
# 安裝 ingress-nginx
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# 安裝 cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# 安裝 ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 安裝 External Secrets Operator
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system --create-namespace
```

### 階段 2: 資料庫設定與遷移 (Week 2-3)

#### 2.1 建立 Cloud SQL

```bash
# 建立 PostgreSQL 實例
gcloud sql instances create daodao-postgres \
  --database-version=POSTGRES_14 \
  --tier=db-custom-4-16384 \
  --region=asia-east1 \
  --network=projects/YOUR_PROJECT_ID/global/networks/daodao-vpc \
  --no-assign-ip \
  --enable-bin-log \
  --backup-start-time=00:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=2

# 建立資料庫
gcloud sql databases create daodao --instance=daodao-postgres

# 建立使用者
gcloud sql users create daodao-user \
  --instance=daodao-postgres \
  --password=SECURE_PASSWORD
```

#### 2.2 建立 Memorystore Redis

```bash
gcloud redis instances create daodao-redis \
  --size=5 \
  --region=asia-east1 \
  --network=daodao-vpc \
  --tier=standard \
  --redis-version=redis_7_0
```

#### 2.3 資料遷移

```bash
# PostgreSQL 遷移 (詳見前面章節)
# 1. pg_dump from Linode
# 2. Upload to Cloud Storage
# 3. Import to Cloud SQL
# 4. Verify data integrity
# 5. Run Prisma migrations

# MongoDB 遷移
# 1. mongodump from Linode
# 2. Deploy StatefulSet to GKE
# 3. mongorestore to GKE
# 4. Verify data

# Redis 遷移
# 1. BGSAVE on Linode
# 2. Import RDB to Memorystore
```

### 階段 3: 應用程式容器化和推送 (Week 3)

#### 3.1 建立 Artifact Registry

```bash
# 建立 Docker repository
gcloud artifacts repositories create daodao-docker \
  --repository-format=docker \
  --location=asia-east1 \
  --description="DaoDao Docker images"

# 配置 Docker 認證
gcloud auth configure-docker asia-east1-docker.pkg.dev
```

#### 3.2 建置和推送映像檔

```bash
# daodao-server
cd daodao-server
docker build -t asia-east1-docker.pkg.dev/YOUR_PROJECT_ID/daodao-docker/daodao-server:v1.0.0 .
docker push asia-east1-docker.pkg.dev/YOUR_PROJECT_ID/daodao-docker/daodao-server:v1.0.0

# daodao-ai-backend
cd daodao-ai-backend
docker build -t asia-east1-docker.pkg.dev/YOUR_PROJECT_ID/daodao-docker/daodao-ai-backend:v1.0.0 .
docker push asia-east1-docker.pkg.dev/YOUR_PROJECT_ID/daodao-docker/daodao-ai-backend:v1.0.0
```

### 階段 4: Kubernetes Manifests 準備 (Week 3-4)

#### 4.1 建立 Git Repository

```bash
# 建立新的 repository
git init daodao-k8s-manifests
cd daodao-k8s-manifests

# 建立目錄結構
mkdir -p apps/{daodao-server,daodao-ai-backend,mongodb,clickhouse,qdrant}/{base,overlays/{dev,staging,production}}
mkdir -p infrastructure/{ingress-nginx,cert-manager,external-secrets}
mkdir -p argocd/{applications,projects}
```

#### 4.2 編寫 Kubernetes Manifests

(詳見前面的 Kubernetes 架構設計章節)

#### 4.3 推送到 Git

```bash
git add .
git commit -m "Initial Kubernetes manifests"
git remote add origin https://github.com/your-org/daodao-k8s-manifests.git
git push -u origin main
```

### 階段 5: ArgoCD 設定與部署 (Week 4)

#### 5.1 設定 ArgoCD

```bash
# 取得初始密碼
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port-forward ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# 登入 ArgoCD CLI
argocd login localhost:8080

# 新增 Git repository
argocd repo add https://github.com/your-org/daodao-k8s-manifests.git \
  --username your-username \
  --password your-token
```

#### 5.2 建立 ArgoCD Applications

```bash
# 套用所有 applications
kubectl apply -f argocd/applications/
```

#### 5.3 同步應用程式

```bash
# 同步所有應用程式
argocd app sync daodao-server
argocd app sync daodao-ai-backend
argocd app sync mongodb
argocd app sync clickhouse
argocd app sync qdrant
```

### 階段 6: 測試與驗證 (Week 4-5)

#### 6.1 功能測試

```bash
# 檢查 Pods 狀態
kubectl get pods -n daodao-production

# 檢查 Services
kubectl get svc -n daodao-production

# 檢查 Ingress
kubectl get ingress -n daodao-production

# 查看日誌
kubectl logs -f deployment/daodao-server -n daodao-production
```

#### 6.2 效能測試

```bash
# 使用 Apache Bench
ab -n 10000 -c 100 https://api.daodao.example.com/health

# 使用 k6
k6 run --vus 100 --duration 30s load-test.js
```

#### 6.3 資料一致性驗證

```bash
# 比對資料庫記錄數
# Linode PostgreSQL
psql -h linode-host -U user -d daodao -c "SELECT COUNT(*) FROM users;"

# Cloud SQL
gcloud sql connect daodao-postgres --user=daodao-user
SELECT COUNT(*) FROM users;
```

### 階段 7: DNS 切換與上線 (Week 5)

#### 7.1 更新 DNS 記錄

```bash
# 取得 Load Balancer IP
kubectl get ingress daodao-ingress -n daodao-production

# 更新 DNS A 記錄
# api.daodao.example.com -> GKE_LOAD_BALANCER_IP
# ai.daodao.example.com -> GKE_LOAD_BALANCER_IP
```

#### 7.2 漸進式流量切換

```bash
# 方法 1: 使用 Cloudflare 流量分流
# 50% -> Linode VPS
# 50% -> GKE

# 方法 2: 逐步調整 DNS TTL
# 1. 降低 TTL 到 300 秒
# 2. 切換 10% 使用者
# 3. 監控 24 小時
# 4. 逐步增加到 100%
```

#### 7.3 監控與告警

```bash
# 設定 Cloud Monitoring 告警
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High CPU Usage" \
  --condition-display-name="CPU > 80%" \
  --condition-threshold-value=0.8 \
  --condition-threshold-duration=300s
```

### 階段 8: 清理與優化 (Week 6)

#### 8.1 驗證完全遷移

```bash
# 確認所有流量已切換
# 監控 Linode VPS 流量 = 0

# 確認資料庫同步已停止
# 驗證最後一筆資料時間
```

#### 8.2 清理 Linode 資源

```bash
# 1. 建立最終備份
# 2. 下載到 Cloud Storage
# 3. 停止 Linode VPS 服務
# 4. 保留 14 天觀察期
# 5. 刪除 Linode 資源
```

#### 8.3 成本優化

```bash
# 啟用 Committed Use Discounts
gcloud compute commitments create daodao-1y-commitment \
  --region=asia-east1 \
  --plan=12-month \
  --resources=vcpu=16,memory=64GB

# 調整 HPA 參數
kubectl edit hpa daodao-server-hpa -n daodao-production
```

---

## 風險評估與應對

### 高風險項目

| 風險 | 影響 | 可能性 | 應對措施 |
|------|------|-------|---------|
| **資料遷移失敗** | 高 | 中 | 1. 完整備份<br>2. 測試遷移流程<br>3. 準備回滾計畫 |
| **DNS 切換中斷** | 高 | 低 | 1. 降低 TTL<br>2. 漸進式切換<br>3. 保留舊環境 |
| **效能下降** | 中 | 中 | 1. 提前效能測試<br>2. 調整資源配置<br>3. 使用 HPA |
| **成本超支** | 中 | 高 | 1. 每日成本監控<br>2. 預算告警<br>3. 使用 CUD |
| **學習曲線** | 低 | 高 | 1. 團隊培訓<br>2. 文件準備<br>3. 逐步遷移 |

### 中風險項目

| 風險 | 影響 | 可能性 | 應對措施 |
|------|------|-------|---------|
| **ArgoCD 設定錯誤** | 中 | 中 | 1. 先在 dev 環境測試<br>2. Manual sync 初期 |
| **SSL 憑證問題** | 中 | 低 | 1. 提前測試 Let's Encrypt<br>2. 準備備用憑證 |
| **網路連線問題** | 中 | 低 | 1. 測試 VPC Peering<br>2. 驗證防火牆規則 |

---

## 回滾計畫

### 回滾觸發條件

1. **資料遺失或不一致**: 發現資料同步問題
2. **效能嚴重下降**: 回應時間 > 3秒
3. **服務不可用**: 錯誤率 > 5%
4. **成本失控**: 每日成本 > 預算 150%

### 回滾步驟

#### 快速回滾 (< 15分鐘)

```bash
# 1. DNS 切換回 Linode
# 更新 A 記錄指向 Linode IP

# 2. 通知團隊
# Slack/Email 通知

# 3. 停止 GKE 流量
kubectl scale deployment daodao-server --replicas=0 -n daodao-production
```

#### 完整回滾 (< 2小時)

```bash
# 1. 資料庫切換回 Linode
# 更新應用程式環境變數

# 2. 驗證 Linode 服務狀態
# 檢查所有服務正常運行

# 3. 資料回復 (如需要)
# 從最近備份還原

# 4. 全面測試
# 功能測試、效能測試

# 5. 正式切換 DNS
# 確認所有流量回到 Linode
```

### 回滾後檢討

```markdown
# 回滾檢討會議

## 回滾原因
- [ ] 技術問題描述
- [ ] 影響範圍
- [ ] 持續時間

## 根本原因分析
- [ ] 問題根源
- [ ] 為何未提前發現
- [ ] 測試覆蓋缺口

## 改進措施
- [ ] 技術改進
- [ ] 流程改進
- [ ] 監控增強

## 下次遷移計畫
- [ ] 調整策略
- [ ] 額外測試
- [ ] 更詳細的監控
```

---

## CI/CD 整合

### GitHub Actions 更新

**更新 daodao-server CI/CD**:

```yaml
name: Deploy to GKE

on:
  push:
    branches:
      - main

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  GKE_CLUSTER: daodao-production-cluster
  GKE_REGION: asia-east1
  IMAGE: daodao-server

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v1
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}

    - name: Set up Cloud SDK
      uses: google-github-actions/setup-gcloud@v1

    - name: Configure Docker
      run: gcloud auth configure-docker asia-east1-docker.pkg.dev

    - name: Build Docker image
      run: |
        docker build -t asia-east1-docker.pkg.dev/$PROJECT_ID/daodao-docker/$IMAGE:$GITHUB_SHA .

    - name: Push Docker image
      run: |
        docker push asia-east1-docker.pkg.dev/$PROJECT_ID/daodao-docker/$IMAGE:$GITHUB_SHA

    - name: Update Kubernetes manifest
      run: |
        cd ../daodao-k8s-manifests
        sed -i "s|image:.*|image: asia-east1-docker.pkg.dev/$PROJECT_ID/daodao-docker/$IMAGE:$GITHUB_SHA|" \
          apps/daodao-server/overlays/production/kustomization.yaml
        git add .
        git commit -m "Update image to $GITHUB_SHA"
        git push

    # ArgoCD 會自動偵測並部署新版本
```

---

## 監控儀表板

### Grafana Dashboard 範例

```yaml
# 安裝 Prometheus + Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# 關鍵指標:
# 1. Pod CPU/Memory 使用率
# 2. HTTP 請求率和錯誤率
# 3. 資料庫連線池
# 4. Redis 記憶體使用
# 5. P95/P99 回應時間
```

---

## 總結

### 遷移時程總覽

| 階段 | 週數 | 關鍵里程碑 |
|------|------|-----------|
| **準備** | Week 1-2 | GCP 設定、GKE 建立、ArgoCD 安裝 |
| **資料庫** | Week 2-3 | Cloud SQL、Memorystore、資料遷移 |
| **容器化** | Week 3 | Docker 映像檔建置與推送 |
| **部署** | Week 3-4 | Kubernetes manifests、ArgoCD 設定 |
| **測試** | Week 4-5 | 功能、效能、資料驗證 |
| **上線** | Week 5 | DNS 切換、流量遷移 |
| **優化** | Week 6 | 清理、成本優化 |

### 成功關鍵因素

1. **充分測試**: 在 staging 環境完整測試所有流程
2. **漸進式遷移**: 逐步切換流量，降低風險
3. **完整備份**: 每個階段都有可恢復的備份點
4. **監控告警**: 實時監控關鍵指標
5. **團隊培訓**: 確保團隊熟悉 Kubernetes 和 ArgoCD
6. **文件完整**: 詳細記錄所有配置和流程

### 下一步

1. 確認遷移時間表
2. 分配團隊角色和責任
3. 建立 GCP 專案並設定計費
4. 開始準備階段的工作
5. 排程每週檢討會議

---

**文件版本**: v1.0
**最後更新**: 2025-12-19
**維護者**: DevOps Team
