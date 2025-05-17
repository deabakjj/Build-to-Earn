import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * 백엔드 설정
 * 
 * 모든 환경 변수와 설정을 중앙에서 관리하는 설정 객체
 */
const config = {
  // 기본 설정
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // 허용된 오리진
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://build-to-earn.com',
  ],

  // 데이터베이스 설정
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/build-to-earn',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority',
    },
  },

  // Redis 설정
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    commandTimeout: 5000,
    lazyConnect: true,
  },

  // Firebase 설정
  firebase: {
    configBase64: process.env.FIREBASE_CONFIG_BASE64,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  },

  // JWT 설정
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },

  // 블록체인 설정
  blockchain: {
    networkName: process.env.NETWORK_NAME || 'testnet',
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://testnet.creatachain.org',
    chainId: parseInt(process.env.CHAIN_ID || '1337', 10),
    privateKey: process.env.PRIVATE_KEY,
    gasLimit: parseInt(process.env.GAS_LIMIT || '1000000', 10),
    gasPrice: process.env.GAS_PRICE || '20000000000', // 20 gwei
  },

  // 스마트 컨트랙트 주소
  contracts: {
    vxcToken: process.env.VXC_TOKEN_ADDRESS,
    ptxToken: process.env.PTX_TOKEN_ADDRESS,
    itemNFT: process.env.ITEM_NFT_ADDRESS,
    buildingNFT: process.env.BUILDING_NFT_ADDRESS,
    vehicleNFT: process.env.VEHICLE_NFT_ADDRESS,
    landNFT: process.env.LAND_NFT_ADDRESS,
    marketplace: process.env.MARKETPLACE_ADDRESS,
    rewardVault: process.env.REWARD_VAULT_ADDRESS,
    dao: process.env.DAO_ADDRESS,
  },

  // IPFS/Arweave 설정
  storage: {
    ipfsApi: process.env.IPFS_API_URL || 'http://localhost:5001',
    ipfsGateway: process.env.IPFS_GATEWAY_URL || 'http://localhost:8080',
    arweaveKey: process.env.ARWEAVE_KEY_FILE,
    pinataApiKey: process.env.PINATA_API_KEY,
    pinataSecretKey: process.env.PINATA_SECRET_KEY,
  },

  // 이메일 설정
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@build-to-earn.com',
  },

  // 소셜 인증 설정
  social: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    },
    twitter: {
      apiKey: process.env.TWITTER_API_KEY,
      apiSecret: process.env.TWITTER_API_SECRET,
    },
  },

  // 클라우드 스토리지 설정
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET,
    cloudfrontDistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
  },

  // CDN 설정
  cdn: {
    url: process.env.CDN_URL,
    assetUrl: process.env.ASSET_CDN_URL,
  },

  // 게임 서버 설정
  gameServer: {
    port: parseInt(process.env.GAME_SERVER_PORT || '8080', 10),
    websocketPort: parseInt(process.env.WEBSOCKET_PORT || '8081', 10),
    secret: process.env.GAME_SERVER_SECRET,
  },

  // 보안 설정
  security: {
    rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    apiKeySecret: process.env.API_KEY_SECRET,
    passwordSaltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS || '12', 10),
  },

  // 분석 도구 설정
  analytics: {
    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
    mixpanelToken: process.env.MIXPANEL_TOKEN,
    amplitudeApiKey: process.env.AMPLITUDE_API_KEY,
  },

  // 모니터링 설정
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    datadogApiKey: process.env.DATADOG_API_KEY,
    newRelicLicenseKey: process.env.NEW_RELIC_LICENSE_KEY,
  },

  // 시즌 관리 설정
  seasons: {
    startDate: process.env.SEASON_START_DATE || '2024-01-01',
    durationDays: parseInt(process.env.SEASON_DURATION_DAYS || '90', 10),
    defaultTheme: process.env.DEFAULT_SEASON_THEME || 'winter',
  },

  // Anti-Bot 설정
  antiBot: {
    threshold: parseFloat(process.env.ANTI_BOT_THRESHOLD || '0.85'),
    challengeEnabled: process.env.BOT_CHALLENGE_ENABLED === 'true',
    captchaSiteKey: process.env.CAPTCHA_SITE_KEY,
    captchaSecretKey: process.env.CAPTCHA_SECRET_KEY,
  },

  // AI 서비스 설정
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    stabilityAiApiKey: process.env.STABILITY_AI_API_KEY,
    replicateApiToken: process.env.REPLICATE_API_TOKEN,
  },

  // 모바일 설정
  mobile: {
    apiRateLimit: parseInt(process.env.MOBILE_API_RATE_LIMIT || '50', 10),
    assetQuality: process.env.MOBILE_ASSET_QUALITY || 'medium',
    renderDistance: parseInt(process.env.MOBILE_RENDER_DISTANCE || '50', 10),
  },

  // 백업 설정
  backup: {
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
    s3Bucket: process.env.S3_BACKUP_BUCKET,
  },

  // 로그 설정
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableProfiling: process.env.ENABLE_PROFILING === 'true',
    logDir: process.env.LOG_DIR || './logs',
  },

  // 개발자 도구 설정
  dev: {
    debug: process.env.DEBUG,
    swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  },
};

// 환경별 설정 검증
if (config.nodeEnv === 'production') {
  const requiredEnvVars = [
    'JWT_SECRET',
    'MONGODB_URI',
    'REDIS_URL',
    'BLOCKCHAIN_RPC_URL',
    'PRIVATE_KEY',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missingEnvVars.join(', ')}`
    );
  }
}

export default config;
