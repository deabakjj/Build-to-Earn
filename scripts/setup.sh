#!/bin/bash

# DIY 크래프팅 월드 초기 설정 스크립트
# Description: 개발 환경을 위한 초기 설정을 수행합니다.

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

# 제목 출력
echo -e "${BLUE}"
echo "============================================"
echo "  DIY 크래프팅 월드 초기 설정"
echo "============================================"
echo -e "${NC}"

# 1. Node.js 버전 확인
log_info "Node.js 버전 확인 중..."
node_version=$(node -v | cut -d'v' -f2)
required_version="16.0.0"

if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" = "$required_version" ]; then
    log_success "Node.js $node_version 설치됨"
else
    log_error "Node.js v16.0.0 이상이 필요합니다. 현재 버전: v$node_version"
    exit 1
fi

# 2. npm 버전 확인
log_info "npm 버전 확인 중..."
npm_version=$(npm -v)
log_success "npm $npm_version 설치됨"

# 3. Git 버전 확인
log_info "Git 버전 확인 중..."
if command -v git &> /dev/null; then
    git_version=$(git --version)
    log_success "$git_version 설치됨"
else
    log_error "Git이 설치되어 있지 않습니다."
    exit 1
fi

# 4. Docker 확인
log_info "Docker 설치 확인 중..."
if command -v docker &> /dev/null; then
    docker_version=$(docker --version)
    log_success "$docker_version 설치됨"
else
    log_warning "Docker가 설치되어 있지 않습니다. 로컬 개발 모드로만 실행 가능합니다."
fi

# 5. MongoDB 확인
log_info "MongoDB 설치 확인 중..."
if command -v mongod &> /dev/null; then
    mongo_version=$(mongod --version | head -n 1)
    log_success "MongoDB 설치됨"
else
    log_warning "MongoDB가 설치되어 있지 않습니다. Docker를 사용하거나 별도로 설치하세요."
fi

# 6. Redis 확인
log_info "Redis 설치 확인 중..."
if command -v redis-server &> /dev/null; then
    redis_version=$(redis-server --version)
    log_success "Redis 설치됨"
else
    log_warning "Redis가 설치되어 있지 않습니다. Docker를 사용하거나 별도로 설치하세요."
fi

# 7. 프로젝트 디렉토리 생성
log_info "프로젝트 디렉토리 구조 생성 중..."
directories=(
    "frontend"
    "backend"
    "game-server"
    "smart-contracts"
    "season-management"
    "security-system"
    "analytics-system"
    "mobile-system"
    "ai-system"
    "infrastructure"
    "docs"
    "logs"
    "backups"
)

for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        log_success "디렉토리 생성: $dir"
    fi
done

# 8. 환경 설정 파일 복사
log_info "환경 설정 파일 생성 중..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_success ".env 파일 생성됨"
        log_warning "⚠️  .env 파일을 편집하여 실제 값들을 설정하세요!"
    else
        log_error ".env.example 파일이 없습니다."
    fi
else
    log_info ".env 파일이 이미 존재합니다."
fi

# 9. 의존성 설치
log_info "프로젝트 의존성 설치 중..."
if npm install; then
    log_success "의존성 설치 완료"
else
    log_error "의존성 설치 실패"
    exit 1
fi

# 10. Lerna 초기화
log_info "Lerna 초기화 중..."
if npx lerna bootstrap; then
    log_success "Lerna 초기화 완료"
else
    log_error "Lerna 초기화 실패"
    exit 1
fi

# 11. Git 저장소 초기화 (필요한 경우)
if [ ! -d ".git" ]; then
    log_info "Git 저장소 초기화 중..."
    git init
    git add .
    git commit -m "Initial commit: DIY 크래프팅 월드 프로젝트 생성"
    log_success "Git 저장소 초기화 완료"
else
    log_info "Git 저장소가 이미 초기화되어 있습니다."
fi

# 12. Husky 설치
log_info "Husky 설치 중..."
npm run prepare
log_success "Husky 설치 완료"

# 13. 초기 빌드 테스트
log_info "초기 빌드 테스트 중..."
if npm run build; then
    log_success "초기 빌드 성공"
else
    log_warning "초기 빌드 실패 - 프로젝트 파일들이 아직 완성되지 않았을 수 있습니다."
fi

# 14. 최종 확인
echo -e "\n${GREEN}"
echo "============================================"
echo "  초기 설정 완료!"
echo "============================================"
echo -e "${NC}"

log_info "다음 단계:"
echo "  1. .env 파일을 편집하여 환경 변수 설정"
echo "  2. MongoDB와 Redis 서버 실행 (또는 docker-compose up)"
echo "  3. npm run dev 명령으로 개발 서버 시작"
echo ""
log_warning "중요한 TODO 항목:"
echo "  - 블록체인 설정 (RPC URL, Private Key 등)"
echo "  - 데이터베이스 설정"
echo "  - IPFS 설정"
echo "  - API 키 설정"
echo ""
log_success "Happy Coding! 🚀"
