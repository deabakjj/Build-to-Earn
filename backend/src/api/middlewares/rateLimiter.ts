import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import config from '../../config';
import logger from '../../utils/logger';
import { APIError } from './errorHandler';

// Redis 클라이언트 생성
let redisClient: any;

try {
  redisClient = createClient({
    url: config.redis.url,
    password: config.redis.password,
  });
  
  // Redis 연결
  redisClient.connect().then(() => {
    logger.info('Redis client connected for rate limiter');
  }).catch((err: any) => {
    logger.error('Redis client connection failed for rate limiter:', err);
  });
  
  // Redis 연결 실패 시 메모리 스토어로 대체
  redisClient.on('error', (err: any) => {
    logger.error('Redis client error for rate limiter:', err);
  });
} catch (error) {
  logger.error('Failed to create Redis client for rate limiter:', error);
}

/**
 * API 요청 비율 제한 미들웨어
 * 
 * 특정 시간 내에 특정 횟수 이상의 요청을 제한하는 미들웨어
 * Redis 또는 메모리 스토어를 사용하여 요청 횟수 추적
 */
const rateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs, // 기본 15분
  max: config.security.rateLimitRequests, // 기본 100 요청
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  
  // Redis 스토어 사용 (가능한 경우)
  store: redisClient ? new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'rl:',
  }) : undefined,
  
  // 요청 제한 초과 시 커스텀 핸들러
  handler: (req, res, next, options) => {
    const err = new APIError(
      429,
      'Too many requests, please try again later.',
      true
    );
    
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      path: req.path,
      headers: req.headers,
    });
    
    next(err);
  },
  
  // 정상 처리되지 않은 모든 요청 로깅
  skipFailedRequests: false,
  
  // IP 주소 확인 함수
  keyGenerator: (req) => {
    // X-Forwarded-For 또는 기본 IP 주소 사용
    return req.headers['x-forwarded-for'] as string || req.ip;
  },
  
  // API 경로별 차등 제한 적용
  skip: (req) => {
    // 공개 API는 비율 제한에서 제외
    if (req.path.startsWith('/api/v1/public')) {
      return true;
    }
    
    // 헬스 체크 엔드포인트 제외
    if (req.path === '/health') {
      return true;
    }
    
    // 개발 환경에서는 비율 제한 비활성화 (선택적)
    if (config.nodeEnv === 'development' && process.env.ENABLE_RATE_LIMIT !== 'true') {
      return true;
    }
    
    return false;
  },
});

/**
 * 모바일 앱 요청 비율 제한 미들웨어 (더 엄격한 제한)
 */
export const mobileRateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.mobile.apiRateLimit, // 모바일 전용 제한 횟수 (일반적으로 더 낮음)
  standardHeaders: true,
  legacyHeaders: false,
  
  // Redis 스토어 사용 (가능한 경우)
  store: redisClient ? new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'mrl:',
  }) : undefined,
  
  // 요청 제한 초과 시 커스텀 핸들러
  handler: (req, res, next, options) => {
    const err = new APIError(
      429,
      'Mobile API rate limit exceeded',
      true
    );
    next(err);
  },
});

/**
 * 인증 요청 비율 제한 미들웨어 (더 엄격한 제한)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10, // 15분당 10번 시도
  standardHeaders: true,
  legacyHeaders: false,
  
  // Redis 스토어 사용 (가능한 경우)
  store: redisClient ? new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    prefix: 'arl:',
  }) : undefined,
  
  // 요청 제한 초과 시 커스텀 핸들러
  handler: (req, res, next, options) => {
    const err = new APIError(
      429,
      'Too many authentication attempts, please try again later',
      true
    );
    
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      path: req.path,
    });
    
    next(err);
  },
});

/**
 * 특정 API 엔드포인트에 대한 사용자 지정 비율 제한 생성 함수
 */
export const createEndpointRateLimiter = (max: number, windowMs: number = 60 * 1000) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    
    // Redis 스토어 사용 (가능한 경우)
    store: redisClient ? new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: 'erl:',
    }) : undefined,
    
    // 요청 제한 초과 시 커스텀 핸들러
    handler: (req, res, next, options) => {
      const err = new APIError(
        429,
        'Endpoint rate limit exceeded',
        true
      );
      next(err);
    },
  });
};

export default rateLimiter;
