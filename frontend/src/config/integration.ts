// API 및 블록체인 통합 설정 파일

// API 주소 설정
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// 블록체인 설정
export const BLOCKCHAIN_CONFIG = {
  // 네트워크 설정
  NETWORKS: {
    MAINNET: {
      chainId: 56,
      name: 'BNB Smart Chain',
      rpcUrl: 'https://bsc-dataseed.binance.org/',
      blockExplorer: 'https://bscscan.com',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18,
      },
    },
    TESTNET: {
      chainId: 97,
      name: 'BNB Smart Chain Testnet',
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      blockExplorer: 'https://testnet.bscscan.com',
      nativeCurrency: {
        name: 'tBNB',
        symbol: 'tBNB',
        decimals: 18,
      },
    },
  },
  
  // 기본 네트워크
  DEFAULT_NETWORK: process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'MAINNET' : 'TESTNET',
  
  // 컨트랙트 주소
  CONTRACTS: {
    VOXELCRAFT_TOKEN: process.env.NEXT_PUBLIC_VOXELCRAFT_ADDRESS || '0x0000000000000000000000000000000000000000',
    PLOTX_TOKEN: process.env.NEXT_PUBLIC_PLOTX_ADDRESS || '0x0000000000000000000000000000000000000000',
    ITEM_NFT: process.env.NEXT_PUBLIC_ITEM_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
    BUILDING_NFT: process.env.NEXT_PUBLIC_BUILDING_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
    VEHICLE_NFT: process.env.NEXT_PUBLIC_VEHICLE_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
    LAND_NFT: process.env.NEXT_PUBLIC_LAND_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
    MARKETPLACE: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '0x0000000000000000000000000000000000000000',
    REWARD_VAULT: process.env.NEXT_PUBLIC_REWARD_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000',
    DAO: process.env.NEXT_PUBLIC_DAO_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
} as const;

// IPFS 설정
export const IPFS_CONFIG = {
  // IPFS 노드 설정
  NODE: {
    host: process.env.NEXT_PUBLIC_IPFS_HOST || 'ipfs.infura.io',
    port: parseInt(process.env.NEXT_PUBLIC_IPFS_PORT || '5001'),
    protocol: process.env.NEXT_PUBLIC_IPFS_PROTOCOL || 'https',
  },
  
  // 인증 설정
  AUTH: {
    projectId: process.env.NEXT_PUBLIC_IPFS_PROJECT_ID,
    projectSecret: process.env.NEXT_PUBLIC_IPFS_PROJECT_SECRET,
  },
  
  // Pinata 설정
  PINATA: {
    enabled: process.env.NEXT_PUBLIC_USE_PINATA === 'true',
    apiKey: process.env.NEXT_PUBLIC_PINATA_API_KEY,
    secretKey: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY,
  },
  
  // 게이트웨이 설정
  GATEWAYS: {
    DEFAULT: 'https://ipfs.io/ipfs/',
    CDN: 'https://cf-ipfs.com/ipfs/',
    PINATA: 'https://gateway.pinata.cloud/ipfs/',
  },
} as const;

// 웹소켓 이벤트 타입
export const WS_EVENTS = {
  // 연결 이벤트
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // 게임 이벤트
  PLAYER_MOVE: 'player:move',
  PLAYER_ACTION: 'player:action',
  WORLD_UPDATE: 'world:update',
  RESOURCE_UPDATE: 'resource:update',
  
  // NFT 이벤트
  NFT_MINTED: 'nft:minted',
  NFT_TRANSFERRED: 'nft:transferred',
  NFT_LISTED: 'nft:listed',
  NFT_SOLD: 'nft:sold',
  
  // 소셜 이벤트
  FRIEND_REQUEST: 'social:friend_request',
  CHAT_MESSAGE: 'social:chat_message',
  GUILD_INVITE: 'social:guild_invite',
  
  // 시스템 이벤트
  MAINTENANCE_MODE: 'system:maintenance',
  SERVER_RESTART: 'system:restart',
  SEASON_UPDATE: 'system:season_update',
} as const;

// 토큰 형식
export const TOKEN_FORMATS = {
  AUTHORIZATION_HEADER: 'Bearer',
  LOCAL_STORAGE_KEY: 'auth_token',
  SESSION_STORAGE_KEY: 'auth_token',
  REFRESH_INTERVAL: 15 * 60 * 1000, // 15분
  EXPIRY_BUFFER: 60 * 1000, // 1분
} as const;

// 게임 설정
export const GAME_CONFIG = {
  // 월드 설정
  WORLD: {
    MIN_SIZE: { x: 10, y: 0, z: 10 },
    MAX_SIZE: { x: 100, y: 50, z: 100 },
    CHUNK_SIZE: 16,
    VIEW_DISTANCE: 8,
  },
  
  // 플레이어 설정
  PLAYER: {
    MAX_ENERGY: 100,
    ENERGY_REGEN_RATE: 1, // per minute
    INVENTORY_SIZE: 50,
    MAX_LEVEL: 100,
  },
  
  // 경제 설정
  ECONOMY: {
    TRANSACTION_FEE: 0.05, // 5%
    ROYALTY_FEE: 0.02, // 2%
    PLATFORM_FEE: 0.01, // 1%
    DAILY_REWARD_CAP: 1000,
    WEEKLY_REWARD_CAP: 5000,
  },
  
  // 시즌 설정
  SEASON: {
    DURATION: 90 * 24 * 60 * 60 * 1000, // 90일
    REWARD_TIERS: [500, 1000, 2500, 5000, 10000],
  },
} as const;

// API 엔드포인트
export const API_ENDPOINTS = {
  // 인증
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    RESET_PASSWORD: '/auth/reset-password',
    WALLET_LOGIN: '/auth/wallet-login',
  },
  
  // 사용자
  USER: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    DELETE_ACCOUNT: '/users/account',
    STATS: '/users/stats',
    SETTINGS: '/users/settings',
    INVENTORY: '/users/inventory',
  },
  
  // 게임
  GAME: {
    WORLD: '/game/world',
    SAVE_WORLD: '/game/world',
    PLACE_ITEM: '/game/place-item',
    REMOVE_ITEM: '/game/remove-item',
    COLLECT_RESOURCE: '/game/collect-resource',
    CRAFT_ITEM: '/game/craft',
    QUESTS: '/game/quests',
    LEADERBOARD: '/game/leaderboard',
  },
  
  // NFT
  NFT: {
    BASE: '/nft',
    MINT: '/nft/mint',
    TRANSFER: '/nft/transfer',
    METADATA: '/nft/metadata',
    LIST: '/nft/list',
    DELIST: '/nft/delist',
    HISTORY: '/nft/history',
  },
  
  // 마켓플레이스
  MARKETPLACE: {
    SEARCH: '/marketplace/search',
    BUY: '/marketplace/buy',
    SELL: '/marketplace/sell',
    AUCTION: '/marketplace/auction',
    BID: '/marketplace/bid',
    FEATURED: '/marketplace/featured',
    HISTORY: '/marketplace/history',
  },
  
  // 시즌
  SEASON: {
    CURRENT: '/seasons/current',
    LIST: '/seasons',
    JOIN: '/seasons/join',
    PROGRESS: '/seasons/progress',
    REWARDS: '/seasons/rewards',
    LEADERBOARD: '/seasons/leaderboard',
  },
  
  // 길드
  GUILD: {
    LIST: '/guilds',
    CREATE: '/guilds',
    JOIN: '/guilds/join',
    LEAVE: '/guilds/leave',
    INVITE: '/guilds/invite',
    MEMBERS: '/guilds/members',
    PROJECTS: '/guilds/projects',
  },
  
  // 소셜
  SOCIAL: {
    FRIENDS: '/social/friends',
    FRIEND_REQUEST: '/social/friend-request',
    CHAT: '/social/chat',
    BLOCK: '/social/block',
    SEARCH_USERS: '/social/search',
  },
} as const;

// 에러 코드
export const ERROR_CODES = {
  // 인증 에러
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // 권한 에러
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // 리소스 에러
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // 요청 에러
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // 블록체인 에러
  BLOCKCHAIN_ERROR: 'BLOCKCHAIN_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  GAS_TOO_HIGH: 'GAS_TOO_HIGH',
  
  // 서버 에러
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
} as const;

// 트랜잭션 타입
export const TRANSACTION_TYPES = {
  // 토큰 트랜잭션
  TOKEN_TRANSFER: 'TOKEN_TRANSFER',
  TOKEN_MINT: 'TOKEN_MINT',
  TOKEN_BURN: 'TOKEN_BURN',
  
  // NFT 트랜잭션
  NFT_MINT: 'NFT_MINT',
  NFT_TRANSFER: 'NFT_TRANSFER',
  NFT_BURN: 'NFT_BURN',
  NFT_APPROVE: 'NFT_APPROVE',
  
  // 마켓플레이스 트랜잭션
  MARKETPLACE_LIST: 'MARKETPLACE_LIST',
  MARKETPLACE_BUY: 'MARKETPLACE_BUY',
  MARKETPLACE_CANCEL: 'MARKETPLACE_CANCEL',
  MARKETPLACE_BID: 'MARKETPLACE_BID',
  
  // 게임 트랜잭션
  CRAFT_ITEM: 'CRAFT_ITEM',
  CLAIM_REWARD: 'CLAIM_REWARD',
  STAKE_TOKEN: 'STAKE_TOKEN',
  UNSTAKE_TOKEN: 'UNSTAKE_TOKEN',
  
  // DAO 트랜잭션
  DAO_VOTE: 'DAO_VOTE',
  DAO_PROPOSE: 'DAO_PROPOSE',
  DAO_EXECUTE: 'DAO_EXECUTE',
} as const;

// 캐싱 전략
export const CACHE_STRATEGIES = {
  // 데이터 캐시 시간 (milliseconds)
  USER_PROFILE: 5 * 60 * 1000, // 5분
  GAME_STATE: 1 * 60 * 1000, // 1분
  NFT_METADATA: 60 * 60 * 1000, // 1시간
  MARKETPLACE_LISTINGS: 30 * 1000, // 30초
  SEASON_INFO: 30 * 60 * 1000, // 30분
  GUILD_INFO: 5 * 60 * 1000, // 5분
  
  // 캐시 키 프리픽스
  PREFIX: {
    USER: 'user:',
    GAME: 'game:',
    NFT: 'nft:',
    MARKET: 'market:',
    SEASON: 'season:',
    GUILD: 'guild:',
  },
} as const;

// 성능 최적화 설정
export const PERFORMANCE_CONFIG = {
  // 청크 로딩
  CHUNK_LOADING: {
    PRELOAD_DISTANCE: 2,
    UNLOAD_DISTANCE: 6,
    MAX_CONCURRENT_LOADS: 4,
  },
  
  // 이미지 최적화
  IMAGE_OPTIMIZATION: {
    QUALITY: 80,
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080,
    FORMATS: ['webp', 'png', 'jpg'],
  },
  
  // 네트워크 최적화
  NETWORK: {
    BATCH_SIZE: 20,
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 1000,
  },
  
  // UI 업데이트
  UI_UPDATE: {
    FPS_TARGET: 60,
    MAX_RENDER_DELAY: 16,
    LAZY_LOAD_THRESHOLD: 200,
  },
} as const;

// 분석 이벤트
export const ANALYTICS_EVENTS = {
  // 사용자 이벤트
  USER_REGISTER: 'user_register',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  
  // 게임 이벤트
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  ITEM_CRAFTED: 'item_crafted',
  QUEST_COMPLETED: 'quest_completed',
  
  // 경제 이벤트
  NFT_MINTED: 'nft_minted',
  NFT_SOLD: 'nft_sold',
  TOKEN_EARNED: 'token_earned',
  TOKEN_SPENT: 'token_spent',
  
  // 소셜 이벤트
  FRIEND_ADDED: 'friend_added',
  GUILD_JOINED: 'guild_joined',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  
  // 시스템 이벤트
  ERROR_OCCURRED: 'error_occurred',
  PAGE_VIEW: 'page_view',
  FEATURE_USED: 'feature_used',
} as const;

// 보안 설정
export const SECURITY_CONFIG = {
  // 비밀번호 정책
  PASSWORD_POLICY: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL: true,
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15분
  },
  
  // 세션 관리
  SESSION: {
    MAX_DURATION: 24 * 60 * 60 * 1000, // 24시간
    IDLE_TIMEOUT: 60 * 60 * 1000, // 1시간
    REQUIRE_2FA_FOR_SENSITIVE: true,
  },
  
  // IP 제한
  IP_RESTRICTIONS: {
    MAX_REQUESTS_PER_IP: 100,
    RATE_LIMIT_WINDOW: 60 * 1000, // 1분
    WHITELIST_ENABLED: false,
  },
  
  // 콘텐츠 보안
  CONTENT_SECURITY: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'obj', 'fbx'],
    SCAN_UPLOADS: true,
  },
} as const;

// 지역화 설정
export const LOCALIZATION = {
  DEFAULT_LANGUAGE: 'en',
  SUPPORTED_LANGUAGES: ['en', 'ko', 'ja', 'zh', 'es', 'fr'],
  DEFAULT_TIMEZONE: 'UTC',
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm:ss',
  CURRENCY_FORMAT: {
    CRYPTO: '0,0.0000',
    FIAT: '0,0.00',
  },
} as const;

// 개발/디버그 설정
export const DEBUG_CONFIG = {
  LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
  ENABLE_REDUX_DEVTOOLS: process.env.NODE_ENV === 'development',
  ENABLE_SENTRY: process.env.NEXT_PUBLIC_ENABLE_SENTRY === 'true',
  SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === 'development',
  MOCK_BLOCKCHAIN: process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === 'true',
} as const;

// 기능 플래그
export const FEATURE_FLAGS = {
  // 메인 기능
  NFT_MINTING: true,
  MARKETPLACE: true,
  GUILD_SYSTEM: true,
  SEASON_SYSTEM: true,
  
  // 실험적 기능
  AI_BUILDER: false,
  CROSS_CHAIN: false,
  VR_SUPPORT: false,
  MOBILE_APP: true,
  
  // 이벤트 기능
  SPECIAL_EVENTS: true,
  TOURNAMENTS: false,
  ACHIEVEMENTS: true,
} as const;

// 타입 내보내기
export type ApiConfig = typeof API_CONFIG;
export type BlockchainConfig = typeof BLOCKCHAIN_CONFIG;
export type IpfsConfig = typeof IPFS_CONFIG;
export type WsEvents = typeof WS_EVENTS;
export type ApiEndpoints = typeof API_ENDPOINTS;

// 헬퍼 함수
export const configHelpers = {
  // 컨트랙트 주소 가져오기
  getContractAddress: (contractName: keyof typeof BLOCKCHAIN_CONFIG.CONTRACTS): string => {
    return BLOCKCHAIN_CONFIG.CONTRACTS[contractName];
  },
  
  // 네트워크 정보 가져오기
  getNetworkInfo: () => {
    const networkName = BLOCKCHAIN_CONFIG.DEFAULT_NETWORK;
    return BLOCKCHAIN_CONFIG.NETWORKS[networkName];
  },
  
  // API 엔드포인트 빌드
  buildApiEndpoint: (
    category: keyof typeof API_ENDPOINTS,
    action: string,
    params?: Record<string, string>
  ): string => {
    const baseEndpoint = API_ENDPOINTS[category][action as keyof typeof API_ENDPOINTS[typeof category]];
    if (!params) return baseEndpoint;
    
    const queryString = new URLSearchParams(params).toString();
    return `${baseEndpoint}?${queryString}`;
  },
  
  // 캐시 키 생성
  generateCacheKey: (prefix: string, ...parts: (string | number)[]): string => {
    return `${prefix}${parts.join(':')}`;
  },
  
  // 블록체인 URL 생성
  getBlockExplorerUrl: (type: 'tx' | 'address' | 'token', value: string): string => {
    const networkInfo = configHelpers.getNetworkInfo();
    switch (type) {
      case 'tx':
        return `${networkInfo.blockExplorer}/tx/${value}`;
      case 'address':
        return `${networkInfo.blockExplorer}/address/${value}`;
      case 'token':
        return `${networkInfo.blockExplorer}/token/${value}`;
      default:
        return networkInfo.blockExplorer;
    }
  },
  
  // IPFS URL 생성
  getIpfsUrl: (hash: string, useGateway = true): string => {
    if (!useGateway) return `ipfs://${hash}`;
    
    const gateway = IPFS_CONFIG.PINATA.enabled 
      ? IPFS_CONFIG.GATEWAYS.PINATA 
      : IPFS_CONFIG.GATEWAYS.CDN;
    
    return `${gateway}${hash}`;
  },
};

export default {
  API_CONFIG,
  BLOCKCHAIN_CONFIG,
  IPFS_CONFIG,
  WS_EVENTS,
  API_ENDPOINTS,
  ERROR_CODES,
  TRANSACTION_TYPES,
  CACHE_STRATEGIES,
  PERFORMANCE_CONFIG,
  ANALYTICS_EVENTS,
  SECURITY_CONFIG,
  LOCALIZATION,
  DEBUG_CONFIG,
  FEATURE_FLAGS,
  configHelpers,
};
