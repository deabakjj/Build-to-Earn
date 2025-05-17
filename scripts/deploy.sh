#!/bin/bash

# DIY 크래프팅 월드 배포 스크립트
# Description: 다양한 환경으로의 자동 배포를 수행합니다.

set -e

# 색깔 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 사용법 출력
usage() {
    echo "사용법: $0 <environment>"
    echo "환경 옵션:"
    echo "  development  - 개발 환경"
    echo "  staging      - 스테이징 환경"
    echo "  production   - 프로덕션 환경"
    exit 1
}

# 인자 확인
if [ $# -eq 0 ]; then
    usage
fi

ENVIRONMENT=$1

# 유효한 환경 확인
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "유효하지 않은 환경: $ENVIRONMENT"
    usage
fi

# 배포 시작
echo -e "${BLUE}"
echo "============================================"
echo "  DIY 크래프팅 월드 배포 시작"
echo "  환경: $ENVIRONMENT"
echo "============================================"
echo -e "${NC}"

# 1. 코드 빌드
log_info "코드 빌드 중..."
npm run build
log_success "빌드 완료"

# 2. 테스트 실행
if [ "$ENVIRONMENT" == "production" ]; then
    log_info "프로덕션 배포 전 테스트 실행 중..."
    npm run test
    npm run test:e2e
    log_success "모든 테스트 통과"
fi

# 3. 환경별 설정 로드
log_info "환경 설정 로드 중..."
case $ENVIRONMENT in
    development)
        export NODE_ENV=development
        DEPLOY_URL="https://dev.build-to-earn.com"
        DOCKER_REGISTRY="dev.registry.build-to-earn.com"
        ;;
    staging)
        export NODE_ENV=staging
        DEPLOY_URL="https://staging.build-to-earn.com"
        DOCKER_REGISTRY="staging.registry.build-to-earn.com"
        ;;
    production)
        export NODE_ENV=production
        DEPLOY_URL="https://build-to-earn.com"
        DOCKER_REGISTRY="registry.build-to-earn.com"
        ;;
esac

# 4. Docker 이미지 빌드
log_info "Docker 이미지 빌드 중..."
docker-compose -f docker-compose.yml -f docker-compose.$ENVIRONMENT.yml build
log_success "Docker 이미지 빌드 완료"

# 5. Docker 이미지 태그 및 푸시
log_info "Docker 이미지 태그 및 푸시 중..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERSION="v1.0.0-$TIMESTAMP"

services=("frontend" "backend" "game-server" "season-management" "security-system" "analytics-system")

for service in "${services[@]}"; do
    docker tag build-to-earn_$service:latest $DOCKER_REGISTRY/$service:$VERSION
    docker tag build-to-earn_$service:latest $DOCKER_REGISTRY/$service:latest
    docker push $DOCKER_REGISTRY/$service:$VERSION
    docker push $DOCKER_REGISTRY/$service:latest
    log_success "$service 이미지 푸시 완료"
done

# 6. Kubernetes 배포 (프로덕션용)
if [ "$ENVIRONMENT" == "production" ]; then
    log_info "Kubernetes 배포 중..."
    kubectl apply -f infrastructure/kubernetes/namespace.yaml
    kubectl apply -f infrastructure/kubernetes/$ENVIRONMENT/
    kubectl set image deployment/frontend frontend=$DOCKER_REGISTRY/frontend:$VERSION
    kubectl set image deployment/backend backend=$DOCKER_REGISTRY/backend:$VERSION
    kubectl set image deployment/game-server game-server=$DOCKER_REGISTRY/game-server:$VERSION
    log_success "Kubernetes 배포 완료"
fi

# 7. Docker Compose 배포 (개발/스테이징용)
if [ "$ENVIRONMENT" != "production" ]; then
    log_info "Docker Compose 배포 중..."
    docker-compose -f docker-compose.yml -f docker-compose.$ENVIRONMENT.yml down
    docker-compose -f docker-compose.yml -f docker-compose.$ENVIRONMENT.yml up -d
    log_success "Docker Compose 배포 완료"
fi

# 8. 데이터베이스 마이그레이션
log_info "데이터베이스 마이그레이션 실행 중..."
npm run migrate:$ENVIRONMENT
log_success "데이터베이스 마이그레이션 완료"

# 9. 스마트 컨트랙트 배포/검증
if [ "$ENVIRONMENT" == "production" ]; then
    log_info "스마트 컨트랙트 배포/검증 중..."
    cd smart-contracts
    npm run deploy:mainnet
    npm run verify:mainnet
    cd ..
    log_success "스마트 컨트랙트 배포/검증 완료"
fi

# 10. 헬스 체크
log_info "배포 헬스 체크 수행 중..."
sleep 10  # 서비스 시작 대기

# Frontend 체크
if curl -f $DEPLOY_URL > /dev/null 2>&1; then
    log_success "Frontend 헬스 체크 통과"
else
    log_error "Frontend 헬스 체크 실패"
    exit 1
fi

# Backend API 체크
if curl -f $DEPLOY_URL/api/health > /dev/null 2>&1; then
    log_success "Backend API 헬스 체크 통과"
else
    log_error "Backend API 헬스 체크 실패"
    exit 1
fi

# Game Server 체크
if curl -f $DEPLOY_URL:8080/health > /dev/null 2>&1; then
    log_success "Game Server 헬스 체크 통과"
else
    log_error "Game Server 헬스 체크 실패"
    exit 1
fi

# 11. 로그 및 모니터링 확인
log_info "로그 확인..."
docker-compose logs --tail=50 backend
docker-compose logs --tail=50 game-server

# 12. 슬랙 알림 (설정된 경우)
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    log_info "슬랙에 배포 완료 알림 전송 중..."
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ $ENVIRONMENT 환경에 새로운 버전($VERSION)이 배포되었습니다.\"}" \
        $SLACK_WEBHOOK_URL
fi

# 13. 배포 완료
echo -e "\n${GREEN}"
echo "============================================"
echo "  배포 완료!"
echo "============================================"
echo -e "${NC}"

log_info "배포 정보:"
echo "  - 환경: $ENVIRONMENT"
echo "  - 버전: $VERSION"
echo "  - URL: $DEPLOY_URL"
echo "  - 배포 시간: $(date)"
echo ""
log_info "다음 단계:"
echo "  1. 웹 브라우저에서 $DEPLOY_URL 접속하여 확인"
echo "  2. 모니터링 대시보드에서 메트릭 확인"
echo "  3. 로그 파일 모니터링"
echo ""
log_success "배포가 성공적으로 완료되었습니다! 🚀"

# 14. 백업 생성 (프로덕션용)
if [ "$ENVIRONMENT" == "production" ]; then
    log_info "자동 백업 생성 중..."
    ./scripts/backup.sh --auto
    log_success "백업 생성 완료"
fi

# 15. 성능 모니터링 시작
if [ "$ENVIRONMENT" == "production" ]; then
    log_info "성능 모니터링 시작..."
    ./scripts/performance-test.sh --post-deploy
fi

exit 0
