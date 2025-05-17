import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger';
import config from '../../config';

/**
 * API 에러 클래스
 * 
 * 커스텀 에러 클래스로 HTTP 상태 코드와 메시지를 포함
 */
export class APIError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(statusCode: number, message: string, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 알 수 없는 라우트 에러 처리 미들웨어
 * 
 * 존재하지 않는 API 경로 처리
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const err = new APIError(404, `Route ${req.originalUrl} not found`);
  next(err);
};

/**
 * 전역 에러 처리 미들웨어
 * 
 * 모든 에러를 최종적으로 처리하는 미들웨어
 */
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // 기본 설정
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let stack = err.stack;
  
  // mongoose 에러 처리
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e: any) => e.message)
      .join(', ');
  }
  
  // JWT 에러 처리
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  // MongoDB 중복 키 에러
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate resource';
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }
  
  // 로그 레벨 결정
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  
  // 에러 로깅
  logger[logLevel](`[${statusCode}] ${message}`, {
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    stack: stack,
    error: err
  });
  
  // 개발 환경에서는 스택 트레이스 포함, 운영 환경에서는 제외
  const response = {
    success: false,
    status: statusCode,
    message,
    ...(config.nodeEnv === 'development' && { stack })
  };
  
  res.status(statusCode).json(response);
};

export default errorHandler;
