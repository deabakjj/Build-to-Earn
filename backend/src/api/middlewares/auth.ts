import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config';
import { APIError } from './errorHandler';
import logger from '../../utils/logger';

// JWT 페이로드 타입 정의
export interface JwtPayload {
  id: string;
  role: string;
  iat?: number;
  exp?: number;
}

// 요청 객체를 확장하여 JWT 페이로드를 포함
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT 토큰 검증 미들웨어
 * 
 * Authorization 헤더에서 토큰을 추출하고 검증하는 미들웨어
 */
const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Authorization 헤더 확인
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new APIError(401, 'Authorization header missing');
    }
    
    // Bearer 토큰 형식 확인
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new APIError(401, 'Invalid authorization format. Use Bearer [token]');
    }
    
    const token = parts[1];
    
    // 토큰 검증
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    // 요청 객체에 사용자 정보 추가
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      // JWT 검증 실패
      logger.warn('Invalid token:', error);
      next(new APIError(401, 'Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      // 토큰 만료
      logger.warn('Token expired');
      next(new APIError(401, 'Token expired'));
    } else if (error instanceof APIError) {
      // 기타 API 오류
      next(error);
    } else {
      // 기타 예상치 못한 오류
      logger.error('Authentication error:', error);
      next(new APIError(500, 'Authentication failed'));
    }
  }
};

/**
 * 역할 기반 권한 검증 미들웨어
 * 
 * @param {string[]} roles - 허용된 역할 배열
 */
export const roleCheck = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // auth 미들웨어를 통과한 후에 호출되어야 함
      if (!req.user) {
        throw new APIError(401, 'Unauthorized');
      }
      
      // 역할 확인
      if (!roles.includes(req.user.role)) {
        logger.warn(`Role check failed: User role ${req.user.role} not in allowed roles ${roles.join(', ')}`);
        throw new APIError(403, 'Insufficient permissions');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * API 키 인증 미들웨어
 * 
 * x-api-key 헤더를 통한 인증
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      throw new APIError(401, 'API key missing');
    }
    
    // API 키 검증 로직
    if (apiKey !== config.security.apiKeySecret) {
      logger.warn(`Invalid API key used: ${apiKey}`);
      throw new APIError(401, 'Invalid API key');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 옵셔널 인증 미들웨어
 * 
 * 토큰이 제공된 경우 검증하지만, 없는 경우에도 다음 미들웨어로 진행
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    // 인증 헤더가 없는 경우 다음 미들웨어로 진행
    if (!authHeader) {
      return next();
    }
    
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }
    
    const token = parts[1];
    
    // 토큰 검증
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    // 요청 객체에 사용자 정보 추가
    req.user = decoded;
    
    next();
  } catch (error) {
    // 토큰 검증 실패 시에도 다음 미들웨어로 진행 (옵셔널 인증)
    next();
  }
};

/**
 * 리프레시 토큰 검증 미들웨어
 */
export const refreshTokenAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new APIError(400, 'Refresh token missing');
    }
    
    // 리프레시 토큰 검증
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
    
    // 요청 객체에 사용자 정보 추가
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new APIError(401, 'Invalid refresh token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new APIError(401, 'Refresh token expired'));
    } else if (error instanceof APIError) {
      next(error);
    } else {
      logger.error('Refresh token error:', error);
      next(new APIError(500, 'Refresh token verification failed'));
    }
  }
};

export default auth;
