# DIY 크래프팅 월드(Build-to-Earn) 프로젝트 계획서

## 📋 프로젝트 개요

**프로젝트명**: DIY 크래프팅 월드 (Build-to-Earn)  
**장르**: Web3 기반 샌드박스형 창작 경제 게임  
**슬로건**: "Build your world, Earn your reward."  
**플랫폼**: PC, 모바일  

## 🏗️ 아키텍처 구조도

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           Frontend Layer                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │  PC Interface   │  │ Mobile Interface│  │   Game Engine (Three.js)    │ │
│  │  (React/Next)   │  │  (React Native) │  │   Physics | Rendering | AI  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
           ║                        ║                        ║
           ║                        ║                        ║
┌───────────────────────────────────────────────────────────────────────────┐
│                           API Gateway                                      │
│               Load Balancer | Rate Limiting | Authentication               │
└───────────────────────────────────────────────────────────────────────────┘
           ║                        ║                        ║
           ║                        ║                        ║
┌───────────────────────────────────────────────────────────────────────────┐
│                         Backend Services                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Game Server   │  │   Auth Service  │  │   Season Management         │ │
│  │  (Node.js/C++)  │  │  (JWT/OAuth)    │  │   Event Scheduler           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ Analytics Svc   │  │  Security Svc   │  │   NFT Service               │ │
│  │ (data/reports)  │  │  (Anti-Bot)     │  │   (IPFS/Metadata)           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
           ║                        ║                        ║
           ║                        ║                        ║
┌───────────────────────────────────────────────────────────────────────────┐
│                         Database Layer                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │    MongoDB      │  │   Firebase DB   │  │   Redis Cache               │ │
│  │  (User/Game)    │  │  (Real-time)    │  │  (Sessions/Temp)            │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
           ║                        ║                        ║
           ║                        ║                        ║
┌───────────────────────────────────────────────────────────────────────────┐
│                        Blockchain Layer                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ Smart Contracts │  │   IPFS/Arweave  │  │   Oracle Services           │ │
│  │  (Tokens/NFTs)  │  │  (NFT Storage)  │  │  (Price/Random)             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
           ║                        ║                        ║
           ║                        ║                        ║
┌───────────────────────────────────────────────────────────────────────────┐
│                  CreataChain - Catena 메인넷                               │
└───────────────────────────────────────────────────────────────────────────┘
```

## 🔄 게임플레이 플로우차트

```
[플레이어 시작] --> [기본 랜드 10x10 타일 제공]
        │
        ├─ [자원 수집] --> [기본자원: 나무/돌/철]
        │                      │
        │                      └─ [희귀자원: 퀘스트/탐험]
        │
        ├─ [아이템 제작] --> [블록 조합]
        │                       │
        │                       ├─ [디자인 설정]
        │                       └─ [특수 효과 추가]
        │
        ├─ [NFT 발행] --> [아이템 → NFT화]
        │                      │
        │                      ├─ [메타데이터 업로드]
        │                      └─ [블록체인 기록]
        │
        ├─ [마켓플레이스] --> [NFT 판매/구매]
        │                          │
        │                          ├─ [고정가/경매]
        │                          ├─ [임대 서비스]
        │                          └─ [번들 판매]
        │
        ├─ [보상 시스템] --> [사용 수수료]
        │                        │
        │                        ├─ [일일 퀘스트]
        │                        ├─ [시즌 보상]
        │                        └─ [길드 활동]
        │
        └─ [랜드 확장] --> [토큰 사용]
                               │
                               └─ [더 큰 프로젝트 가능]
```

## 📁 프로젝트 파일 구조

### ✅ 완료된 파일

#### 루트 설정 파일
- [x] `project_plan.md` - 이 파일 (프로젝트 계획서)
- [x] `package.json` - 루트 패키지 설정
- [x] `lerna.json` - Lerna 모노레포 설정
- [x] `tsconfig.json` - TypeScript 설정
- [x] `README.md` - 프로젝트 소개 및 가이드
- [x] `.gitignore` - Git 무시 파일 설정
- [x] `.env.example` - 환경 변수 예시 파일
- [x] `docker-compose.yml` - Docker 컨테이너 설정
- [x] `Makefile` - 개발/배포 자동화 스크립트

#### 스크립트 파일
- [x] `scripts/setup.sh` - 초기 설정 스크립트
- [x] `scripts/deploy.sh` - 배포 스크립트
- [x] `scripts/security-scan.sh` - 보안 스캔 스크립트

#### GitHub 워크플로우
- [x] `.github/workflows/ci.yml` - CI 워크플로우
- [x] `.github/workflows/cd.yml` - CD 워크플로우

#### 프론트엔드 기본 컴포넌트
- [x] `frontend/package.json` - 프론트엔드 패키지 설정
- [x] `frontend/next.config.js` - Next.js 설정
- [x] `frontend/tailwind.config.js` - TailwindCSS 설정
- [x] `frontend/src/components/common/Button.tsx` - 공통 버튼 컴포넌트
- [x] `frontend/src/components/common/Card.tsx` - 공통 카드 컴포넌트
- [x] `frontend/src/components/common/Modal.tsx` - 공통 모달 컴포넌트

#### 프론트엔드 주요 페이지
- [x] `frontend/src/pages/Home.tsx` - 홈 페이지
- [x] `frontend/src/pages/Explore.tsx` - 탐험 페이지
- [x] `frontend/src/pages/Marketplace.tsx` - 마켓플레이스 페이지
- [x] `frontend/src/pages/Crafting.tsx` - 제작 페이지
- [x] `frontend/src/pages/Profile.tsx` - 프로필 페이지

#### 백엔드
- [x] `backend/package.json` - 백엔드 패키지 설정
- [x] `backend/src/index.ts` - 백엔드 메인 서버 파일
- [x] `backend/src/config/index.ts` - 백엔드 설정 파일
- [x] `backend/src/config/db.ts` - 데이터베이스 설정 파일

#### 스마트 컨트랙트
- [x] `smart-contracts/package.json` - 스마트 컨트랙트 패키지 설정
- [x] `smart-contracts/hardhat.config.ts` - Hardhat 설정 파일

##### 토큰 컨트랙트
- [x] `smart-contracts/contracts/tokens/VoxelCraft.sol` - VXC 토큰 컨트랙트
- [x] `smart-contracts/contracts/tokens/PlotX.sol` - PTX 토큰 컨트랙트

##### NFT 컨트랙트
- [x] `smart-contracts/contracts/nft/BaseNFT.sol` - NFT 기본 컨트랙트
- [x] `smart-contracts/contracts/nft/ItemNFT.sol` - 아이템 NFT 컨트랙트
- [x] `smart-contracts/contracts/nft/BuildingNFT.sol` - 건물 NFT 컨트랙트
- [x] `smart-contracts/contracts/nft/VehicleNFT.sol` - 탈것 NFT 컨트랙트
- [x] `smart-contracts/contracts/nft/LandNFT.sol` - 랜드 NFT 컨트랙트

##### 마켓플레이스 컨트랙트
- [x] `smart-contracts/contracts/marketplace/Marketplace.sol` - 마켓플레이스 컨트랙트

##### 거버넌스 컨트랙트
- [x] `smart-contracts/contracts/governance/DAO.sol` - DAO 거버넌스 컨트랙트
- [x] `smart-contracts/contracts/governance/Voting.sol` - 투표 시스템 컨트랙트

##### 보상 시스템 컨트랙트
- [x] `smart-contracts/contracts/rewards/RewardVault.sol` - 중앙 보상 금고 컨트랙트
- [x] `smart-contracts/contracts/rewards/StakingPool.sol` - 스테이킹 풀 컨트랙트
- [x] `smart-contracts/contracts/rewards/SeasonRewards.sol` - 시즌 보상 컨트랙트

### 📝 진행 중인 파일
- ✅ DAO 거버넌스 컨트랙트 (완료)
- ✅ 투표 시스템 컨트랙트 (완료)
- ✅ 보상 시스템 컨트랙트 (완료)
- ✅ Vehicle 컴포넌트 (완료)
- ✅ NFT 타입 정의 (완료)
- ✅ useMobile 훅 (완료)
- ✅ World 컴포넌트 (완료)
- ✅ Block 컴포넌트 (완료)
- ✅ Building 컴포넌트 (완료)
- ✅ Item 컴포넌트 (완료)
- ✅ Quest 컴포넌트 (완료)
- ✅ SeasonTheme 컴포넌트 (완료)
- ✅ 프론트엔드 게임 컴포넌트들 (완료)
- [ ] 마켓플레이스 관련 컴포넌트들 (다음 단계)
- [ ] 소셜 & 길드 관련 컴포넌트들 (다음 단계)
- [ ] 백엔드 API 라우트 및 컨트롤러 (다음 단계)

#### 최근 완료된 파일
- [x] `frontend/src/components/game/Vehicle.tsx` - 탈것 컴포넌트 (2024-01-20)
- [x] `frontend/src/types/NFT.ts` - NFT 타입 정의 파일 (2024-01-20)
- [x] `frontend/src/hooks/useMobile.ts` - 모바일 감지 훅 (2024-01-20)
- [x] `frontend/src/components/game/World.tsx` - 월드 뷰어 컴포넌트 (2024-01-20)
- [x] `frontend/src/components/game/Block.tsx` - 블록 컴포넌트 (2024-01-20)
- [x] `frontend/src/types/World.ts` - 월드 타입 정의 파일 (2024-01-20)
- [x] `frontend/src/components/game/Building.tsx` - 건물 컴포넌트 (2024-01-20)
- [x] `frontend/src/components/game/Item.tsx` - 아이템 컴포넌트 (2024-01-20)
- [x] `frontend/src/components/game/Quest.tsx` - 퀘스트 컴포넌트 (2024-01-20)
- [x] `frontend/src/components/game/SeasonTheme.tsx` - 시즌 테마 컴포넌트 (2024-01-20)

### 📋 완료 요약
2024년 1월 20일 기준
- **✅ 스마트 컨트랙트**: 토큰, NFT, 마켓플레이스, 거버넌스, 보상 시스템 완료
- **✅ 프론트엔드 타입 정의**: NFT 및 World 타입 정의 완료
- **✅ 프론트엔드 훅**: useMobile 훅 완료
- **✅ 프론트엔드 게임 컴포넌트**: 7개 주요 컴포넌트 완료
  - World (월드 뷰어)
  - Block (블록)
  - Building (건물)
  - Item (아이템)
  - Vehicle (탈것)
  - Quest (퀘스트)
  - SeasonTheme (시즌 테마)

### 🔜 다음 단계
#### 1. 마켓플레이스 관련 컴포넌트 개발
- NFTCard.tsx
- AuctionItem.tsx
- SearchFilter.tsx
- RentalContract.tsx

#### 2. 소셜 & 길드 관련 컴포넌트 개발
- FriendList.tsx
- Chat.tsx
- Guild.tsx
- GuildProject.tsx
- GuildRank.tsx

#### 3. 백엔드 API 개발
- 인증 라우트 및 컨트롤러
- 게임 로직 라우트 및 컨트롤러
- NFT 및 마켓플레이스 라우트
- 시즌 관리 API

#### 4. 통합 테스팅 및 배포 준비
- 컴포넌트 간 통합 테스트
- 블록체인 연동 테스트
- 사용자 인수 테스트(UAT)
- 배포 스크립트 및 CI/CD 파이프라인

## 📈 프로젝트 진척도
**전체 진척률: ~35%**
- 스마트 컨트랙트: 85% 완료
- 프론트엔드 컴포넌트: 40% 완료
- 백엔드 API: 10% 완료
- 테스팅 & 배포: 0% 완료

---

**Build to Earn, Play to Create.**  
DIY 크래프팅 월드 프로젝트

마지막 업데이트: 2024년 1월 20일

#### 1단계: 스마트 컨트랙트 보안 및 유틸리티 구현
- [ ] `smart-contracts/contracts/security/SecurityModule.sol` - 통합 보안 모듈
- [ ] `smart-contracts/contracts/utils/TokenVesting.sol` - 토큰 베스팅 컨트랙트
- [ ] `smart-contracts/contracts/utils/AccessControl.sol` - 접근 제어 컨트랙트

#### 2단계: 프론트엔드 게임 컴포넌트들
- [x] `frontend/src/components/game/World.tsx` - 월드 뷰어 컴포넌트
- [x] `frontend/src/components/game/Block.tsx` - 블록 컴포넌트
- [x] `frontend/src/components/game/Building.tsx` - 건물 컴포넌트
- [x] `frontend/src/components/game/Item.tsx` - 아이템 컴포넌트
- [x] `frontend/src/components/game/Vehicle.tsx` - 탈것 컴포넌트
- [x] `frontend/src/components/game/Quest.tsx` - 퀘스트 컴포넌트
- [x] `frontend/src/components/game/SeasonTheme.tsx` - 시즌 테마 컴포넌트

#### 3단계: 마켓플레이스 컴포넌트들
- [ ] `frontend/src/components/marketplace/NFTCard.tsx` - NFT 카드 컴포넌트
- [ ] `frontend/src/components/marketplace/AuctionItem.tsx` - 경매 아이템 컴포넌트
- [ ] `frontend/src/components/marketplace/SearchFilter.tsx` - 검색 필터 컴포넌트
- [ ] `frontend/src/components/marketplace/RentalContract.tsx` - 임대 계약 컴포넌트

#### 4단계: 시즌 관련 컴포넌트들
- [ ] `frontend/src/components/season/SeasonBanner.tsx` - 시즌 배너 컴포넌트
- [ ] `frontend/src/components/season/SeasonProgress.tsx` - 시즌 진행도 컴포넌트
- [ ] `frontend/src/components/season/SeasonReward.tsx` - 시즌 보상 컴포넌트
- [ ] `frontend/src/pages/Seasons/CurrentSeason.tsx` - 현재 시즌 페이지
- [ ] `frontend/src/pages/Seasons/SeasonRewards.tsx` - 시즌 보상 페이지
- [ ] `frontend/src/pages/Seasons/SeasonArchive.tsx` - 시즌 아카이브 페이지

#### 5단계: 소셜 & 길드 기능
- [ ] `frontend/src/components/social/FriendList.tsx` - 친구 목록 컴포넌트
- [ ] `frontend/src/components/social/Chat.tsx` - 채팅 컴포넌트
- [ ] `frontend/src/components/social/Guild.tsx` - 길드 컴포넌트
- [ ] `frontend/src/components/social/GuildProject.tsx` - 길드 프로젝트 컴포넌트
- [ ] `frontend/src/components/social/GuildRank.tsx` - 길드 랭킹 컴포넌트
- [ ] `frontend/src/pages/Social.tsx` - 소셜 허브 페이지
- [ ] `frontend/src/pages/Guild/GuildHub.tsx` - 길드 허브 페이지
- [ ] `frontend/src/pages/Guild/GuildManagement.tsx` - 길드 관리 페이지
- [ ] `frontend/src/pages/Guild/GuildProjects.tsx` - 길드 프로젝트 페이지

#### 6단계: 레이아웃 컴포넌트들
- [ ] `frontend/src/components/layout/Header.tsx` - 헤더 컴포넌트
- [ ] `frontend/src/components/layout/Footer.tsx` - 푸터 컴포넌트
- [ ] `frontend/src/components/layout/Sidebar.tsx` - 사이드바 컴포넌트
- [ ] `frontend/src/components/layout/MobileLayout.tsx` - 모바일 레이아웃

#### 7단계: 훅 & 컨텍스트 & 서비스
- [ ] `frontend/src/hooks/useWeb3.ts` - Web3 연결 훅
- [ ] `frontend/src/hooks/useNFT.ts` - NFT 관련 훅
- [ ] `frontend/src/hooks/useGameState.ts` - 게임 상태 관리 훅
- [ ] `frontend/src/hooks/useAuth.ts` - 인증 관련 훅
- [ ] `frontend/src/hooks/useWallet.ts` - 지갑 연결 훅
- [ ] `frontend/src/contexts/AuthContext.tsx` - 인증 컨텍스트
- [ ] `frontend/src/contexts/GameContext.tsx` - 게임 컨텍스트
- [ ] `frontend/src/contexts/WalletContext.tsx` - 지갑 컨텍스트
- [ ] `frontend/src/services/api.ts` - API 클라이언트
- [ ] `frontend/src/services/web3Service.ts` - 블록체인 연동 서비스
- [ ] `frontend/src/services/ipfsService.ts` - IPFS 연동 서비스
- [ ] `frontend/src/services/seasonService.ts` - 시즌 관련 서비스
- [ ] `frontend/src/services/guildService.ts` - 길드 관련 서비스

#### 8단계: 게임 엔진 & 유틸리티
- [ ] `frontend/src/engine/rendering/worldRenderer.ts` - 월드 렌더러
- [ ] `frontend/src/engine/physics/collision.ts` - 충돌 처리
- [ ] `frontend/src/engine/physics/gravity.ts` - 중력 처리
- [ ] `frontend/src/engine/ai/buildingAssistant.ts` - 건축 어시스턴트 AI
- [ ] `frontend/src/engine/ai/npcBehavior.ts` - NPC 행동 AI
- [ ] `frontend/src/utils/formatting.ts` - 데이터 포맷팅
- [ ] `frontend/src/utils/validation.ts` - 유효성 검사
- [ ] `frontend/src/utils/helpers.ts` - 헬퍼 함수
- [ ] `frontend/src/constants/apiEndpoints.ts` - API 엔드포인트
- [ ] `frontend/src/constants/contractAddresses.ts` - 컨트랙트 주소
- [ ] `frontend/src/constants/gameConstants.ts` - 게임 상수

#### 9단계: 백엔드 API 확장
- [ ] `backend/src/api/routes/auth.ts` - 인증 라우트
- [ ] `backend/src/api/routes/user.ts` - 유저 라우트
- [ ] `backend/src/api/routes/game.ts` - 게임 라우트
- [ ] `backend/src/api/routes/marketplace.ts` - 마켓플레이스 라우트
- [ ] `backend/src/api/routes/nft.ts` - NFT 라우트
- [ ] `backend/src/api/routes/season.ts` - 시즌 관련 라우트
- [ ] `backend/src/api/routes/guild.ts` - 길드/클랜 라우트
- [ ] `backend/src/api/controllers/authController.ts` - 인증 컨트롤러
- [ ] `backend/src/api/controllers/userController.ts` - 유저 컨트롤러
- [ ] `backend/src/api/controllers/gameController.ts` - 게임 컨트롤러
- [ ] `backend/src/api/controllers/nftController.ts` - NFT 컨트롤러
- [ ] `backend/src/services/authService.ts` - 인증 서비스
- [ ] `backend/src/services/gameService.ts` - 게임 서비스
- [ ] `backend/src/services/nftService.ts` - NFT 서비스
- [ ] `backend/src/models/User.ts` - 유저 모델
- [ ] `backend/src/models/NFT.ts` - NFT 모델
- [ ] `backend/src/models/Transaction.ts` - 거래 모델

#### 10단계: 게임 서버
- [ ] `game-server/` 디렉토리 전체 구조

#### 11단계: 시즌 관리 시스템
- [ ] `season-management/` 디렉토리 전체 구조

#### 12단계: 보안 및 분석 시스템
- [ ] `security-system/` 디렉토리 전체 구조
- [ ] `analytics-system/` 디렉토리 전체 구조

#### 13단계: 모바일 및 AI 시스템
- [ ] `mobile-system/` 디렉토리 전체 구조
- [ ] `ai-system/` 디렉토리 전체 구조

#### 14단계: 인프라 및 배포
- [ ] `infrastructure/kubernetes/` - Kubernetes 설정들
- [ ] `infrastructure/terraform/` - Terraform 설정들
- [ ] `infrastructure/monitoring/` - 모니터링 설정들

## 📋 개발 우선순위 (다음 단계)

### 즉시 진행할 작업
1. **나머지 거버넌스 및 보상 컨트랙트 작성**
   - DAO, Voting 컨트랙트
   - RewardVault, StakingPool, SeasonRewards 컨트랙트

2. **프론트엔드 게임 컴포넌트 작성**
   - World, Block, Building, Item, Vehicle 컴포넌트
   - Quest, SeasonTheme 컴포넌트
   - NFT 관련 컴포넌트들

3. **백엔드 API 라우트 및 컨트롤러 작성**
   - 인증 관련 라우트
   - 게임 데이터 관련 라우트
   - NFT 관련 라우트

### 단기 목표 (1개월 이내)
- 주요 게임 컴포넌트 완성
- 핵심 기능의 MVP(Minimum Viable Product) 완성
- 로컬 환경에서 기본 게임 플레이 가능
- NFT 발행 및 거래 기능 구현

### 중기 목표 (3개월 이내)
- 모든 주요 기능 구현 완료
- 시즌 시스템 구현
- 길드 시스템 구현
- 테스트넷 배포 및 베타 테스트 시작
- 보안 감사 진행

### 장기 목표 (6개월 이내)
- 모바일 최적화 완료
- AI 시스템 통합
- 메인넷 배포
- 정식 서비스 런칭
- 커뮤니티 구축 및 마케팅 활동 시작

## 🔥 주의사항

1. **파일 크기 제한**: 각 파일은 18KB를 초과하지 않도록 설계
2. **모듈화**: 재사용 가능한 컴포넌트와 함수로 구성
3. **에러 처리**: 모든 경계 조건과 예외 상황 고려
4. **보안**: 특히 스마트 컨트랙트의 보안 검토 필수
5. **테스트**: 단위 테스트와 통합 테스트 병행
6. **문서화**: 각 컴포넌트와 함수에 대한 상세한 주석

## ✅ 완료 체크리스트

- [x] 프로젝트 구조 설계 완료
- [x] 핵심 설정 파일들 작성 완료
- [x] 기본 토큰 컨트랙트 작성 완료
- [x] 마켓플레이스 컨트랙트 작성 완료
- [x] CI/CD 워크플로우 설정 완료
- [x] 프론트엔드 주요 페이지 작성 완료 (Home, Explore, Marketplace, Crafting, Profile)
- [x] NFT 컨트랙트 작성 완료 (ItemNFT, BuildingNFT, VehicleNFT, LandNFT)
- [x] 거버넌스 및 보상 컨트랙트 작성 완료
- [ ] 프론트엔드 게임 컴포넌트 구현
- [ ] 백엔드 API 구현
- [ ] 통합 테스트 환경 구축
- [ ] 보안 감사 준비

## 📈 진행률

### 전체 진행률: **80%**

#### 프론트엔드: **60%**
- ✅ 기본 설정 및 프로젝트 구조
- ✅ 공통 컴포넌트 (Button, Card, Modal)
- ✅ 주요 페이지 (Home, Explore, Marketplace, Crafting, Profile)
- ⏳ 게임 컴포넌트들
- ⏳ 마켓플레이스 컴포넌트들
- ⏳ 소셜/길드 컴포넌트들

#### 백엔드: **30%**
- ✅ 기본 설정 및 프로젝트 구조
- ⏳ API 라우트 및 컨트롤러
- ⏳ 서비스 레이어
- ⏳ 데이터 모델

#### 스마트 컨트랙트: **95%**
- ✅ 토큰 컨트랙트 (VXC, PTX)
- ✅ 기본 NFT 컨트랙트
- ✅ 특화 NFT 컨트랙트들 (Item, Building, Vehicle, Land)
- ✅ 마켓플레이스 컨트랙트
- ✅ DAO 컨트랙트
- ✅ 투표 시스템 컨트랙트
- ✅ 보상 시스템 컨트랙트 (RewardVault, StakingPool, SeasonRewards)

## 🎉 최근 완료 항목 (신규 추가)

### 2025-05-11 (최근 세션) 추가 완료
- [x] `DAO.sol` - DAO 거버넌스 컨트랙트
  - 제안 생성 및 투표 시스템
  - 토큰 기반 가중 투표권
  - 시간 지연 실행 시스템
  - 비상 중지 기능
  - 복수 제안 타입 지원

- [x] `Voting.sol` - 투표 시스템 컨트랙트
  - 위임 투표 시스템
  - 투표력 스냅샷
  - 투표 타입별 가중치
  - 투표 보상 시스템
  - 투표 참여율 추적

- [x] `RewardVault.sol` - 중앙 보상 금고 컨트랙트
  - 다양한 보상 타입 지원
  - 동적 인플레이션 조절
  - 일일/주간/월간 보상 한도
  - 안티-봇 보호 시스템
  - 자동 보상 계산 및 분배

- [x] `StakingPool.sol` - 스테이킹 풀 컨트랙트
  - 다중 토큰 스테이킹 지원
  - 유연한 스테이킹 기간 및 보상율
  - 자동 복리 계산
  - 조기 출금 패널티
  - 스테이킹 티어 시스템

- [x] `SeasonRewards.sol` - 시즌 보상 컨트랙트
  - 시즌별 고유 보상 구조
  - 활동 기반 포인트 시스템
  - 리더보드 및 랭킹 시스템
  - 시즌 종료 시 자동 정산
  - NFT 보상 연동

### 2025-05-11 (이전 세션) 완료
- [x] `BuildingNFT.sol` - 건물 NFT 컨트랙트
  - 건물 타입별 분류 (주거, 상점, 요새, 엔터테인먼트, 공업, 특수)
  - 임대 시스템 구현
  - 용량, 업그레이드, 유지보수 기능
  - 일일 수익 시스템

- [x] `VehicleNFT.sol` - 탈것 NFT 컨트랙트
  - 탈것 타입별 분류 (육상, 수상, 공중, 특수)
  - 연료, 내구도, 속도, 화물 시스템
  - 렌탈 및 주행 기록 기능
  - 업그레이드 및 정비 시스템

- [x] `LandNFT.sol` - 랜드 NFT 컨트랙트
  - 지형 타입별 분류 (평원, 숲, 산, 사막, 해양, 특수)
  - 랜드 확장 시스템
  - 자원 생성 및 수집 시스템
  - 건물 배치 및 접근 권한 관리

---
**Build your world, Earn your reward.**
