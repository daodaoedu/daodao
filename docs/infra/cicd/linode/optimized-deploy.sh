#!/bin/bash

# ============================================
# 島島前端 Monorepo 多環境部署腳本（優化版）
# 支援同時部署多個應用
# ============================================

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# 參數解析
# ============================================

ENVIRONMENT=${1:-dev}
APP_NAME=${2:-all}  # all, website, product
BRANCH=${3:-}

if [[ ! "$ENVIRONMENT" =~ ^(prod|dev|feature)$ ]]; then
    log_error "無效的環境參數: $ENVIRONMENT"
    echo "用法: $0 <prod|dev|feature> [all|website|product] [branch-name]"
    echo "範例:"
    echo "  $0 prod all                    # 同時部署正式環境所有應用"
    echo "  $0 prod website                # 只部署正式環境的 website"
    echo "  $0 dev product                 # 只部署測試環境的 product"
    echo "  $0 feature all update          # 同時部署功能分支所有應用"
    exit 1
fi

if [[ "$ENVIRONMENT" == "feature" && -z "$BRANCH" ]]; then
    log_error "功能分支環境需要指定分支名稱"
    echo "用法: $0 feature <all|website|product> <branch-name>"
    exit 1
fi

if [[ ! "$APP_NAME" =~ ^(all|website|product)$ ]]; then
    log_error "無效的應用名稱: $APP_NAME"
    echo "應用名稱必須是: all, website, product"
    exit 1
fi

# ============================================
# 環境變數設置
# ============================================

export DOCKER_HUB_USERNAME=${DOCKER_HUB_USERNAME:-"your-dockerhub-username"}
export COMMIT_SHA=$(git rev-parse --short HEAD)

if [[ "$ENVIRONMENT" == "feature" ]]; then
    export FEATURE_BRANCH=$BRANCH
    ENV_FILE=".env.feature"
    NETWORK="dev-daodao-network"
else
    ENV_FILE=".env.${ENVIRONMENT}"
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        NETWORK="prod-daodao-network"
    else
        NETWORK="dev-daodao-network"
    fi
fi

# 決定要部署的服務
if [[ "$APP_NAME" == "all" ]]; then
    if [[ "$ENVIRONMENT" == "feature" ]]; then
        SERVICES="website_feat product_feat"
    else
        SERVICES="website_${ENVIRONMENT} product_${ENVIRONMENT}"
    fi
    DEPLOY_MODE="parallel"  # 同時部署
else
    if [[ "$ENVIRONMENT" == "feature" ]]; then
        SERVICES="${APP_NAME}_feat"
    else
        SERVICES="${APP_NAME}_${ENVIRONMENT}"
    fi
    DEPLOY_MODE="single"  # 單一部署
fi

log_info "=========================================="
log_info "島島前端 Monorepo 部署"
log_info "=========================================="
log_info "環境: $ENVIRONMENT"
log_info "應用: $APP_NAME"
log_info "服務: $SERVICES"
log_info "部署模式: $DEPLOY_MODE"
log_info "Commit SHA: $COMMIT_SHA"
log_info "環境變數文件: $ENV_FILE"
[[ "$ENVIRONMENT" == "feature" ]] && log_info "分支: $BRANCH"
log_info "=========================================="

# ============================================
# 檢查環境變數文件
# ============================================

if [[ ! -f "$ENV_FILE" ]]; then
    log_error "環境變數文件不存在: $ENV_FILE"

    if [[ "$ENVIRONMENT" == "feature" ]]; then
        log_info "正在從模板創建 .env.feature..."
        cp .env.feature.template .env.feature
        sed -i.bak "s/{branch}/$BRANCH/g" .env.feature
        rm -f .env.feature.bak
        log_warning "請檢查並修改 .env.feature 中的配置"
    fi

    exit 1
fi

# ============================================
# 檢查後端網路是否存在
# ============================================

if ! docker network inspect "$NETWORK" &>/dev/null; then
    log_error "後端網路不存在: $NETWORK"
    log_warning "請先啟動後端服務創建網路:"
    log_warning "  cd /path/to/daodao-server && docker-compose up -d"
    exit 1
fi

log_success "後端網路檢查通過: $NETWORK"

# ============================================
# 拉取最新代碼
# ============================================

log_info "拉取最新代碼..."

if [[ "$ENVIRONMENT" == "prod" ]]; then
    git fetch origin prod
    git checkout prod
    git pull origin prod
elif [[ "$ENVIRONMENT" == "dev" ]]; then
    git fetch origin dev
    git checkout dev
    git pull origin dev
else
    git fetch origin "feat/$BRANCH"
    git checkout "feat/$BRANCH"
    git pull origin "feat/$BRANCH"
fi

log_success "代碼更新完成"

# ============================================
# 構建並部署
# ============================================

if [[ "$DEPLOY_MODE" == "parallel" ]]; then
    # ========== 同時部署模式 ==========
    log_info "=========================================="
    log_info "同時部署模式：並行構建和部署所有應用"
    log_info "=========================================="

    # 1. 並行構建所有服務
    log_info "[步驟 1/4] 並行構建 Docker 映像..."
    docker-compose build --parallel $SERVICES
    log_success "所有 Docker 映像構建完成"

    # 2. 停止舊容器（如果存在）
    log_info "[步驟 2/4] 停止舊容器..."
    for SERVICE in $SERVICES; do
        docker-compose stop $SERVICE 2>/dev/null || true
        docker-compose rm -f $SERVICE 2>/dev/null || true
    done
    log_success "舊容器已停止"

    # 3. 同時啟動所有新容器
    log_info "[步驟 3/4] 同時啟動所有新容器..."
    if [[ "$ENVIRONMENT" == "feature" ]]; then
        FEATURE_BRANCH=$BRANCH docker-compose up -d $SERVICES
    else
        docker-compose up -d $SERVICES
    fi
    log_success "所有容器已啟動"

    # 4. 等待健康檢查
    log_info "[步驟 4/4] 等待所有容器健康檢查..."

    MAX_WAIT=60
    ALL_HEALTHY=true

    for SERVICE in $SERVICES; do
        CONTAINER_NAME=$(docker-compose ps -q $SERVICE | xargs docker inspect --format='{{.Name}}' 2>/dev/null | sed 's/\///' || echo "")

        if [[ -z "$CONTAINER_NAME" ]]; then
            log_warning "無法獲取容器名稱: $SERVICE"
            ALL_HEALTHY=false
            continue
        fi

        log_info "檢查容器: $CONTAINER_NAME"
        WAIT_COUNT=0

        while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
            HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")

            if [ "$HEALTH" = "healthy" ]; then
                log_success "✓ $CONTAINER_NAME 健康檢查通過"
                break
            fi

            echo -n "."
            sleep 2
            WAIT_COUNT=$((WAIT_COUNT + 2))
        done

        echo ""

        if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
            log_warning "⚠ $CONTAINER_NAME 健康檢查超時"
            log_info "請手動檢查: docker logs $CONTAINER_NAME"
            ALL_HEALTHY=false
        fi
    done

else
    # ========== 單一部署模式 ==========
    log_info "=========================================="
    log_info "單一部署模式：部署單個應用"
    log_info "=========================================="

    SERVICE=$SERVICES

    log_info "[步驟 1/4] 構建 Docker 映像: $SERVICE"
    docker-compose build $SERVICE
    log_success "Docker 映像構建完成"

    log_info "[步驟 2/4] 停止舊容器: $SERVICE"
    docker-compose stop $SERVICE 2>/dev/null || true
    docker-compose rm -f $SERVICE 2>/dev/null || true

    log_info "[步驟 3/4] 啟動新容器: $SERVICE"
    if [[ "$ENVIRONMENT" == "feature" ]]; then
        FEATURE_BRANCH=$BRANCH docker-compose up -d $SERVICE
    else
        docker-compose up -d $SERVICE
    fi

    log_info "[步驟 4/4] 等待容器健康檢查..."
    CONTAINER_NAME=$(docker-compose ps -q $SERVICE | xargs docker inspect --format='{{.Name}}' 2>/dev/null | sed 's/\///' || echo "")

    if [[ -n "$CONTAINER_NAME" ]]; then
        WAIT_COUNT=0
        MAX_WAIT=60

        while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
            HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")

            if [ "$HEALTH" = "healthy" ]; then
                log_success "容器健康檢查通過: $CONTAINER_NAME"
                ALL_HEALTHY=true
                break
            fi

            echo -n "."
            sleep 2
            WAIT_COUNT=$((WAIT_COUNT + 2))
        done

        echo ""

        if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
            log_warning "健康檢查超時: $CONTAINER_NAME"
            ALL_HEALTHY=false
        fi
    fi
fi

# ============================================
# 清理舊映像
# ============================================

log_info "清理未使用的 Docker 映像..."
docker image prune -f

# ============================================
# 部署完成
# ============================================

log_success "=========================================="
log_success "部署完成！"
log_success "=========================================="

# 顯示容器信息
log_info "容器狀態:"
docker-compose ps $SERVICES

log_info ""
log_info "訪問地址:"
if [[ "$ENVIRONMENT" == "prod" ]]; then
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "website" ]]; then
        log_info "  Website: https://daodao.so"
    fi
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "product" ]]; then
        log_info "  Product: https://app.daodao.so"
    fi
elif [[ "$ENVIRONMENT" == "dev" ]]; then
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "website" ]]; then
        log_info "  Website: https://dev.daodao.so"
    fi
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "product" ]]; then
        log_info "  Product: https://app-dev.daodao.so"
    fi
else
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "website" ]]; then
        log_info "  Website: https://feat-$BRANCH.daodao.so"
    fi
    if [[ "$APP_NAME" == "all" || "$APP_NAME" == "product" ]]; then
        log_info "  Product: https://app-feat-$BRANCH.daodao.so"
    fi
fi

# 部署結果總結
echo ""
if [[ "$ALL_HEALTHY" == true ]]; then
    log_success "=========================================="
    log_success "✅ 所有服務部署成功且健康"
    log_success "=========================================="
else
    log_warning "=========================================="
    log_warning "⚠️  部分服務可能未完全就緒"
    log_warning "請檢查容器日誌排查問題"
    log_warning "=========================================="
    log_info "查看日誌命令:"
    for SERVICE in $SERVICES; do
        CONTAINER_NAME=$(docker-compose ps -q $SERVICE | xargs docker inspect --format='{{.Name}}' 2>/dev/null | sed 's/\///' || echo "")
        if [[ -n "$CONTAINER_NAME" ]]; then
            log_info "  docker logs -f $CONTAINER_NAME"
        fi
    done
fi

log_success "=========================================="
