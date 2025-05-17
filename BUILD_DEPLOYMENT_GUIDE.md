# DIY 크래프팅 월드 빌드 및 배포 가이드

## 📋 사전 준비사항

### 필수 도구
- Node.js (v18+)
- npm 또는 yarn
- Docker & Docker Compose
- Git
- MongoDB
- Redis

### 선택사항
- Kubernetes (클러스터 배포용)
- AWS CLI (AWS 배포용)
- GitHub CLI (자동화용)

## 🔧 로컬 개발 환경 설정

### 1. 프로젝트 클론
```bash
git clone https://github.com/your-org/build-to-earn.git
cd build-to-earn
```

### 2. 환경 변수 설정
```bash
# 루트 디렉토리에서
cp .env.example .env

# 각 서비스별 환경 변수 설정
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp smart-contracts/.env.example smart-contracts/.env
```

### 3. 의존성 설치
```bash
# 루트에서 (Lerna 사용)
npm install

# 또는 각 프로젝트별로
cd backend && npm install
cd ../frontend && npm install
cd ../smart-contracts && npm install
```

### 4. 데이터베이스 설정
```bash
# MongoDB 실행
mongod

# Redis 실행
redis-server
```

### 5. 스마트 컨트랙트 배포 (테스트넷)
```bash
cd smart-contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network testnet
```

### 6. 서비스 실행
```bash
# 터미널 1: 백엔드
cd backend
npm run dev

# 터미널 2: 프론트엔드
cd frontend
npm run dev

# 터미널 3: 스마트 컨트랙트 (로컬 노드)
cd smart-contracts
npx hardhat node
```

## 🚀 프로덕션 배포

### 방법 1: Docker Compose 배포

```bash
# 1. 환경 변수 설정
export NODE_ENV=production
export DB_URL=your_mongodb_url
export REDIS_URL=your_redis_url

# 2. 빌드 및 실행
docker-compose up --build -d

# 3. 로그 확인
docker-compose logs -f
```

### 방법 2: Kubernetes 배포

```bash
# 1. 네임스페이스 생성
kubectl create namespace build-to-earn

# 2. 시크릿 생성
kubectl create secret generic app-secrets \
  --from-env-file=.env \
  -n build-to-earn

# 3. 배포
kubectl apply -f k8s/
```

### 방법 3: AWS 배포

```bash
# 1. ECR 푸시
./scripts/push-to-ecr.sh

# 2. ECS 서비스 업데이트
./scripts/deploy-ecs.sh

# 3. Route53 및 CloudFront 설정
./scripts/setup-cdn.sh
```

## 📊 배포 후 확인사항

### 1. 헬스체크
```bash
# 백엔드 API
curl http://your-domain/api/health

# 프론트엔드
curl http://your-domain/health

# 스마트 컨트랙트 (블록체인)
npx hardhat run scripts/verify-deployment.js
```

### 2. 모니터링 설정
```bash
# Prometheus 메트릭 확인
curl http://your-domain/metrics

# Grafana 대시보드 접속
open http://grafana.your-domain
```

### 3. 시큐리티 체크
```bash
# SSL 인증서 확인
./scripts/check-ssl.sh

# 보안 헤더 확인
./scripts/security-audit.sh

# 스마트 컨트랙트 검증
./scripts/verify-contracts.sh
```

## 🔄 CI/CD 파이프라인

### GitHub Actions 워크플로우

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Build
        run: npm run build
      
      - name: Deploy
        run: ./scripts/deploy.sh
```

## 📝 환경 변수 참고

### 백엔드 (.env)
```bash
NODE_ENV=production
PORT=3000
DB_URL=mongodb://your-mongo-db/build-to-earn
REDIS_URL=redis://your-redis-server:6379
JWT_SECRET=your-jwt-secret
BLOCKCHAIN_RPC_URL=your-rpc-url
```

### 프론트엔드 (.env)
```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
```

### 스마트 컨트랙트 (.env)
```bash
ETHERSCAN_API_KEY=your-etherscan-key
PRIVATE_KEY=your-deployer-private-key
INFURA_KEY=your-infura-key
```

## 🔍 트러블슈팅

### 자주 발생하는 문제

1. **CORS 에러**
   ```bash
   # nginx.conf에 CORS 헤더 추가
   add_header 'Access-Control-Allow-Origin' '*';
   ```

2. **메모리 부족**
   ```bash
   # Node.js 메모리 한계 증가
   export NODE_OPTIONS="--max_old_space_size=4096"
   ```

3. **블록체인 연결 오류**
   ```bash
   # 가스비 설정 확인
   npx hardhat run scripts/check-gas.js
   ```

4. **이미지 업로드 실패**
   ```bash
   # IPFS 노드 상태 확인
   ipfs swarm peers
   ```

## 📚 추가 리소스

### 문서
- [API 문서](docs/api/README.md)
- [스마트 컨트랙트 문서](docs/contracts/README.md)
- [프론트엔드 가이드](docs/frontend/README.md)

### 스크립트
- [배포 스크립트](scripts/deploy.sh)
- [백업 스크립트](scripts/backup.sh)
- [모니터링 스크립트](scripts/monitor.sh)

### 유용한 명령어
```bash
# 전체 프로젝트 빌드
make build

# 테스트 실행
make test

# 로컬 환경 초기화
make setup

# 프로덕션 배포
make deploy

# 로그 확인
make logs
```

## ⚡ 성능 최적화

### 1. 캐싱 전략
```bash
# CDN 캐시 설정
./scripts/setup-caching.sh

# API 캐시 확인
redis-cli monitor
```

### 2. 데이터베이스 최적화
```bash
# 인덱스 생성
./scripts/create-indexes.sh

# 쿼리 성능 분석
./scripts/analyze-queries.sh
```

### 3. 블록체인 최적화
```bash
# 가스비 최적화
./scripts/optimize-gas.sh

# 배치 처리 설정
./scripts/setup-batching.sh
```

## 🔒 보안 가이드

### 1. 환경 보안
```bash
# 키 로테이션
./scripts/rotate-keys.sh

# 보안 패치 확인
./scripts/security-updates.sh
```

### 2. 네트워크 보안
```bash
# 방화벽 설정
./scripts/setup-firewall.sh

# DDoS 방어 설정
./scripts/setup-ddos-protection.sh
```

### 3. 스마트 컨트랙트 보안
```bash
# 컨트랙트 검증
./scripts/verify-contracts.sh

# 취약점 스캔
./scripts/smart-contract-audit.sh
```

---

**마지막 업데이트**: 2025년 5월 12일
**버전**: 1.0.0
**관리자**: Build-to-Earn Development Team
