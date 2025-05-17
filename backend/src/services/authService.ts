import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { Types } from 'mongoose';
import crypto from 'crypto';
import config from '../config';
import logger from '../utils/logger';
import User from '../models/User';
import { createClient } from 'redis';

// Redis 클라이언트 설정
let redisClient: any;

try {
  redisClient = createClient({
    url: config.redis.url,
    password: config.redis.password,
  });
  
  redisClient.connect().then(() => {
    logger.info('Redis client connected for auth service');
  }).catch((err: any) => {
    logger.error('Redis client connection failed for auth service:', err);
  });
  
  redisClient.on('error', (err: any) => {
    logger.error('Redis client error for auth service:', err);
  });
} catch (error) {
  logger.error('Failed to create Redis client for auth service:', error);
}

/**
 * 인증 서비스
 * 
 * 토큰 생성, 검증, 인증 관련 유틸리티 함수 제공
 */
class AuthService {
  /**
   * 액세스 토큰 생성
   * @param {string} userId - 사용자 ID
   * @param {string} role - 사용자 역할
   * @returns {Promise<string>} - JWT 액세스 토큰
   */
  async generateAccessToken(userId: string | Types.ObjectId, role: string): Promise<string> {
    const payload = {
      id: userId.toString(),
      role,
    };
    
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * 리프레시 토큰 생성
   * @param {string} userId - 사용자 ID
   * @param {string} role - 사용자 역할
   * @returns {Promise<string>} - JWT 리프레시 토큰
   */
  async generateRefreshToken(userId: string | Types.ObjectId, role: string): Promise<string> {
    const payload = {
      id: userId.toString(),
      role,
    };
    
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }

  /**
   * 인증 토큰 세트 생성 (액세스 + 리프레시)
   * @param {string} userId - 사용자 ID
   * @param {string} role - 사용자 역할
   * @returns {Promise<{accessToken: string, refreshToken: string}>} - 토큰 세트
   */
  async generateAuthTokens(userId: string | Types.ObjectId, role: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.generateAccessToken(userId, role);
    const refreshToken = await this.generateRefreshToken(userId, role);
    
    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * 리프레시 토큰 무효화 (블랙리스트에 추가)
   * @param {string} refreshToken - 무효화할 리프레시 토큰
   * @returns {Promise<void>}
   */
  async invalidateRefreshToken(refreshToken: string): Promise<void> {
    try {
      if (!redisClient) {
        logger.warn('Redis client not available for token invalidation');
        return;
      }
      
      // 토큰 디코딩하여 만료 시간 확인
      const decoded = jwt.decode(refreshToken) as jwt.JwtPayload;
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid refresh token');
      }
      
      // 토큰 만료 시간까지 블랙리스트에 추가
      const expiryTime = decoded.exp - Math.floor(Date.now() / 1000);
      if (expiryTime <= 0) {
        // 이미 만료된 토큰은 블랙리스트에 추가할 필요 없음
        return;
      }
      
      // Redis에 블랙리스트 추가
      await redisClient.set(`bl:${refreshToken}`, '1', {
        EX: expiryTime,
      });
    } catch (error) {
      logger.error('Failed to invalidate refresh token:', error);
    }
  }

  /**
   * 리프레시 토큰이 블랙리스트에 있는지 확인
   * @param {string} refreshToken - 확인할 리프레시 토큰
   * @returns {Promise<boolean>} - 블랙리스트 여부
   */
  async isRefreshTokenBlacklisted(refreshToken: string): Promise<boolean> {
    try {
      if (!redisClient) {
        logger.warn('Redis client not available for token blacklist check');
        return false;
      }
      
      const blacklisted = await redisClient.get(`bl:${refreshToken}`);
      return !!blacklisted;
    } catch (error) {
      logger.error('Failed to check refresh token blacklist:', error);
      return false;
    }
  }

  /**
   * 로그인 실패 카운터 증가
   * @param {string} userId - 사용자 ID
   * @returns {Promise<void>}
   */
  async incrementLoginFailureCount(userId: string | Types.ObjectId): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) return;
      
      // 계정 잠금 로직
      const loginFailures = (user.loginFailures || 0) + 1;
      const update: any = { loginFailures };
      
      // 최대 시도 횟수 초과 시 계정 잠금
      if (loginFailures >= 5) {
        update.status = 'locked';
        update.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30분 잠금
        
        logger.warn(`Account locked for user ${user.email} due to multiple login failures`);
      }
      
      await User.findByIdAndUpdate(userId, update);
    } catch (error) {
      logger.error('Failed to increment login failure count:', error);
    }
  }

  /**
   * 로그인 실패 카운터 초기화
   * @param {string} userId - 사용자 ID
   * @returns {Promise<void>}
   */
  async resetLoginFailureCount(userId: string | Types.ObjectId): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        loginFailures: 0,
        // 계정이 잠겨있다면 잠금 해제
        $unset: { lockUntil: 1 },
        status: 'active',
      });
    } catch (error) {
      logger.error('Failed to reset login failure count:', error);
    }
  }

  /**
   * 지갑 서명 검증
   * @param {string} address - 지갑 주소
   * @param {string} signature - 서명
   * @param {string} message - 원본 메시지
   * @returns {Promise<boolean>} - 서명 유효성
   */
  async verifyWalletSignature(
    address: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      // 메시지 해시 계산
      const messageHash = ethers.utils.hashMessage(message);
      
      // 서명으로부터 서명자 복구
      const recoveredAddress = ethers.utils.recoverAddress(messageHash, signature);
      
      // 주소 일치 여부 확인 (대소문자 구분 없이)
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      logger.error('Wallet signature verification failed:', error);
      return false;
    }
  }

  /**
   * 소셜 로그인 사용자 데이터 생성
   * @param {any} profile - 소셜 프로필
   * @param {string} provider - 소셜 제공자
   * @returns {Promise<{username: string, email: string, displayName: string}>} - 사용자 데이터
   */
  async generateSocialUserData(
    profile: any,
    provider: string
  ): Promise<{
    username: string;
    email: string | null;
    displayName: string;
  }> {
    // 이메일 추출
    let email = null;
    if (provider === 'google' && profile.emails && profile.emails.length > 0) {
      email = profile.emails[0].value;
    } else if (provider === 'discord' && profile.email) {
      email = profile.email;
    } else if (provider === 'twitter' && profile.emails && profile.emails.length > 0) {
      email = profile.emails[0].value;
    }
    
    // 표시 이름 추출
    let displayName = '';
    if (profile.displayName) {
      displayName = profile.displayName;
    } else if (provider === 'discord' && profile.username) {
      displayName = profile.username;
    } else if (provider === 'twitter' && profile.screen_name) {
      displayName = profile.screen_name;
    } else {
      displayName = `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`;
    }
    
    // 사용자 이름 생성 (고유한 값 보장)
    const baseUsername = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 16);
    
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const username = `${baseUsername}_${randomSuffix}`;
    
    return {
      username,
      email,
      displayName,
    };
  }

  /**
   * OTP 코드 생성
   * @param {string} userId - 사용자 ID
   * @returns {Promise<string>} - OTP 코드
   */
  async generateOTPCode(userId: string | Types.ObjectId): Promise<string> {
    // 6자리 숫자 코드 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Redis에 저장 (10분 유효)
    if (redisClient) {
      await redisClient.set(`otp:${userId.toString()}`, code, {
        EX: 600, // 10분
      });
    }
    
    return code;
  }

  /**
   * OTP 코드 검증
   * @param {string} userId - 사용자 ID
   * @param {string} code - OTP 코드
   * @returns {Promise<boolean>} - OTP 유효성
   */
  async verifyOTPCode(userId: string | Types.ObjectId, code: string): Promise<boolean> {
    if (!redisClient) {
      logger.warn('Redis client not available for OTP verification');
      return false;
    }
    
    const storedCode = await redisClient.get(`otp:${userId.toString()}`);
    
    // 코드 일치 확인 후 사용된 코드 제거
    if (storedCode && storedCode === code) {
      await redisClient.del(`otp:${userId.toString()}`);
      return true;
    }
    
    return false;
  }

  /**
   * JWT 서명 보안 키 교체 (키 로테이션)
   * @returns {Promise<void>}
   */
  async rotateSecurityKeys(): Promise<void> {
    try {
      // 새 키 생성
      const newJwtSecret = crypto.randomBytes(64).toString('hex');
      const newRefreshSecret = crypto.randomBytes(64).toString('hex');
      
      // TODO: 환경 변수나 설정 파일 업데이트 로직 구현
      // (실제 구현은 환경에 따라 다를 수 있음)
      
      logger.info('Security keys rotated successfully');
    } catch (error) {
      logger.error('Failed to rotate security keys:', error);
    }
  }
}

export default new AuthService();
