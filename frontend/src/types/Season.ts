import { NFT } from './NFT';

// 시즌 상태 열거형
export enum SeasonStatus {
  UPCOMING = 'UPCOMING',     // 다가오는 시즌
  ACTIVE = 'ACTIVE',         // 활성 시즌
  ENDING = 'ENDING',         // 종료 임박 (1주 미만)
  ENDED = 'ENDED',           // 종료된 시즌  
  ARCHIVED = 'ARCHIVED'      // 아카이브된 시즌
}

// 시즌 테마 타입
export enum SeasonTheme {
  WINTER = 'WINTER',         // 겨울 테마
  SPRING = 'SPRING',         // 봄 테마
  SUMMER = 'SUMMER',         // 여름 테마
  AUTUMN = 'AUTUMN',         // 가을 테마
  LUNAR_NEW_YEAR = 'LUNAR_NEW_YEAR',  // 설날 테마
  HALLOWEEN = 'HALLOWEEN',   // 할로윈 테마
  CHRISTMAS = 'CHRISTMAS',   // 크리스마스 테마
  SPACE = 'SPACE',          // 우주 테마
  OCEAN = 'OCEAN',          // 바다 테마
  DESERT = 'DESERT',        // 사막 테마
  FOREST = 'FOREST',        // 숲 테마
  CITY = 'CITY',            // 도시 테마
  STEAMPUNK = 'STEAMPUNK',  // 스팀펑크 테마
  CYBERPUNK = 'CYBERPUNK',  // 사이버펑크 테마
  MEDIEVAL = 'MEDIEVAL',    // 중세 테마
  ORIENTAL = 'ORIENTAL',    // 동양 테마
  CUSTOM = 'CUSTOM'         // 커스텀 테마
}

// 보상 타입
export enum RewardType {
  NFT = 'NFT',             // NFT 보상
  TOKEN = 'TOKEN',         // 토큰 보상
  EXCLUSIVE_ITEM = 'EXCLUSIVE_ITEM',  // 한정 아이템
  TITLE = 'TITLE',         // 칭호
  BADGE = 'BADGE',         // 뱃지
  SKIN = 'SKIN',           // 스킨
  ANIMATION = 'ANIMATION', // 애니메이션
  SOUND = 'SOUND',         // 효과음
  RECIPE = 'RECIPE'        // 제작법
}

// 퀘스트 타입
export enum QuestType {
  DAILY = 'DAILY',         // 일일 퀘스트
  WEEKLY = 'WEEKLY',       // 주간 퀘스트
  SEASONAL = 'SEASONAL',   // 시즌 퀘스트
  SPECIAL = 'SPECIAL',     // 특별 퀘스트
  STORY = 'STORY',         // 스토리 퀘스트
  ACHIEVEMENT = 'ACHIEVEMENT'  // 업적
}

// 시즌 보상 인터페이스
export interface SeasonReward {
  id: string;
  level: number;              // 언락 레벨
  type: RewardType;
  name: string;
  description: string;
  image?: string;
  rarity?: string;
  quantity?: number;
  tokenAmount?: number;
  tokenType?: 'VXC' | 'PTX';
  isExclusive: boolean;       // 시즌 한정 아이템 여부
  claimable: boolean;         // 수령 가능 여부
  claimed: boolean;           // 수령 완료 여부
  claimDeadline?: Date;       // 수령 마감 기한
  requirements?: {            // 추가 요구사항
    completedQuests?: string[];
    minimumRank?: number;
    specialCondition?: string;
  };
}

// 시즌 퀘스트 인터페이스
export interface SeasonQuest {
  id: string;
  type: QuestType;
  name: string;
  description: string;
  image?: string;
  startDate: Date;
  endDate: Date;
  isAvailable: boolean;
  isCompleted: boolean;
  isActive: boolean;         // 현재 활성화 여부
  
  // 퀘스트 목표
  objectives: {
    id: string;
    description: string;
    targetValue: number;
    currentValue: number;
    unit?: string;           // 'items', 'minutes', 'transactions' etc.
    completed: boolean;
  }[];
  
  // 퀘스트 보상
  rewards: {
    xp: number;              // 경험치
    tokens?: {
      amount: number;
      type: 'VXC' | 'PTX';
    };
    items?: NFT[];           // 아이템 보상
    specialRewards?: SeasonReward[];
  };
  
  // 퀘스트 메타데이터
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'LEGENDARY';
  category: 'BUILDING' | 'TRADING' | 'CRAFTING' | 'SOCIAL' | 'EXPLORATION';
  repeatable: boolean;
  streak?: number;          // 연속 완료 횟수
  maxStreak?: number;       // 최대 연속 완료 횟수
  
  // 퀘스트 조건
  prerequisites?: {
    level?: number;
    completedQuests?: string[];
    ownedItems?: string[];
    achievements?: string[];
  };
}

// 시즌 랭킹 인터페이스
export interface SeasonRanking {
  userId: string;
  username: string;
  avatar?: string;
  rank: number;
  level: number;
  xp: number;
  totalXp: number;
  progress: number;         // 다음 레벨까지의 진행도 (%)
  achievements: string[];
  specialBadges: string[];
  previousRank?: number;    // 이전 시즌 랭킹
  rankChange?: number;      // 랭킹 변화 (+3, -2 etc.)
}

// 시즌 이벤트 인터페이스
export interface SeasonEvent {
  id: string;
  name: string;
  description: string;
  type: 'LIMITED_TIME' | 'COUNTDOWN' | 'COMMUNITY' | 'BOSS_RAID' | 'COMPETITION';
  status: 'UPCOMING' | 'ACTIVE' | 'ENDING' | 'ENDED';
  startDate: Date;
  endDate: Date;
  image?: string;
  
  // 이벤트 내용
  content: {
    rules?: string[];
    objectives?: Array<{
      description: string;
      points: number;
    }>;
    specialItems?: NFT[];
    exclusiveRewards?: SeasonReward[];
  };
  
  // 이벤트 참여 현황
  participation: {
    registered: boolean;
    started: boolean;
    completed: boolean;
    score?: number;
    rank?: number;
    teamId?: string;        // 팀 이벤트의 경우
  };
  
  // 이벤트 설정
  settings: {
    maxParticipants?: number;
    teamSize?: number;
    entryFee?: {
      amount: number;
      currency: 'VXC' | 'PTX';
    };
    prizePool?: {
      total: number;
      currency: 'VXC' | 'PTX';
      distribution: number[];  // [50, 30, 20] % for 1st, 2nd, 3rd
    };
  };
}

// 시즌 통계 인터페이스
export interface SeasonStats {
  totalUsers: number;
  activeUsers: number;
  completedQuests: number;
  createdItems: number;
  tradingVolume: {
    amount: number;
    currency: 'VXC' | 'PTX';
  };
  topCreators: Array<{
    userId: string;
    username: string;
    itemsCreated: number;
    sales: number;
  }>;
  topTraders: Array<{
    userId: string;
    username: string;
    volume: number;
    currency: 'VXC' | 'PTX';
  }>;
  communityAchievements: string[];  // 커뮤니티 전체가 달성한 목표들
}

// 시즌 메인 인터페이스
export interface Season {
  id: string;
  number: number;           // 시즌 번호
  name: string;             // 시즌 이름 (e.g., "Winter Wonderland")
  description: string;
  theme: SeasonTheme;
  status: SeasonStatus;
  
  // 시즌 기간
  startDate: Date;
  endDate: Date;
  preSeasonDate?: Date;     // 사전 이벤트 시작일
  registrationDeadline?: Date;
  
  // 비주얼 요소
  images: {
    banner: string;
    logo: string;
    background: string;
    thumbnail: string;
    gallery?: string[];
  };
  
  // 시즌 특징
  features: {
    newItems: NFT[];        // 시즌 신규 아이템
    specialMechanics: string[]; // 특별 메커니즘
    exclusiveAreas: string[];   // 한정 지역
    weatherEffects?: string[];  // 날씨 효과
    soundtracks?: string[];     // 시즌 전용 BGM
  };
  
  // 시즌 레벨 시스템
  levelSystem: {
    maxLevel: number;
    xpPerLevel: number[];
    rewards: SeasonReward[];
    specialMilestones: Array<{
      level: number;
      reward: SeasonReward;
      title?: string;
    }>;
  };
  
  // 시즌 콘텐츠
  content: {
    quests: SeasonQuest[];
    events: SeasonEvent[];
    achievements: string[];
    leaderboards: string[];  // 리더보드 타입들
  };
  
  // 참여 정보
  userProgress?: {
    level: number;
    xp: number;
    rank: number;
    completedQuests: string[];
    unlockedRewards: string[];
    activeQuests: string[];
    achievements: string[];
  };
  
  // 시즌 설정
  settings: {
    requiresRegistration: boolean;
    registrationFee?: {
      amount: number;
      currency: 'VXC' | 'PTX';
    };
    maxParticipants?: number;
    rewardClaimWindow: number;  // days
    carryOverRules?: {
      items: boolean;
      currencies: boolean;
      achievements: boolean;
    };
  };
}

// 시즌 요약 인터페이스 (리스트용)
export interface SeasonSummary {
  id: string;
  number: number;
  name: string;
  theme: SeasonTheme;
  status: SeasonStatus;
  startDate: Date;
  endDate: Date;
  thumbnail: string;
  participants: number;
  topRewards: SeasonReward[];
  isRegistered?: boolean;
  userLevel?: number;
}

// 시즌 설정 인터페이스
export interface SeasonConfig {
  defaultDuration: number;  // days
  preSeasonDuration: number; // days
  maxConcurrentSeasons: number;
  defaultMaxLevel: number;
  baseLevelXp: number;
  xpGrowthRate: number;
  rewardClaimWindow: number; // days
  defaultThemes: SeasonTheme[];
  reservedIds: string[];
}

// 시즌 히스토리 인터페이스
export interface SeasonHistory {
  seasonId: string;
  seasonName: string;
  seasonNumber: number;
  startDate: Date;
  endDate: Date;
  finalLevel: number;
  finalRank: number;
  totalXp: number;
  completedQuests: number;
  claimedRewards: SeasonReward[];
  achievements: string[];
  highlights: Array<{
    type: 'QUEST' | 'ACHIEVEMENT' | 'REWARD' | 'RANK';
    description: string;
    date: Date;
    value?: number;
  }>;
}

// 시즌 패스 인터페이스
export interface SeasonPass {
  id: string;
  seasonId: string;
  type: 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';
  name: string;
  price?: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'USD';
  };
  benefits: {
    xpBonus: number;        // % bonus
    exclusiveRewards: SeasonReward[];
    specialQuests: SeasonQuest[];
    instantUnlocks: number; // levels
    bonusStorage: number;   // items
    prioritySupport: boolean;
    earlyAccess: boolean;
    customization: string[];  // custom skins, animations etc.
  };
  purchased: boolean;
  purchaseDate?: Date;
  expiryDate: Date;
}

// 시즌 이벤트 타입 확장
export type SeasonEventType = SeasonEvent['type'];
export type SeasonQuestCategory = SeasonQuest['category'];
export type SeasonQuestDifficulty = SeasonQuest['difficulty'];
export type SeasonRewardRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';