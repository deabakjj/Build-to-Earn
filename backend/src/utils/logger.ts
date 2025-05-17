import winston from 'winston';
import path from 'path';
import 'winston-daily-rotate-file';
import config from '../config';

// 로그 저장 디렉토리
const logDir = config.logging.logDir || 'logs';
const isDevelopment = config.nodeEnv === 'development';

// 로그 포맷 설정
const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
  }`;
});

// 로그 레벨 설정
const logLevel = config.logging.level || 'info';

// 일별 로그 파일 설정
const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: logLevel,
});

// 에러 로그 파일 설정
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
});

// 콘솔 출력 설정
const consoleTransport = new winston.transports.Console({
  level: isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    logFormat
  ),
});

// 로거 인스턴스 생성
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'build-to-earn-backend' },
  transports: [
    consoleTransport,
    dailyRotateFileTransport,
    errorFileTransport,
  ],
  exitOnError: false,
});

/**
 * 요청 로깅 미들웨어
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 호출 함수
 */
export const requestLogger = (req, res, next) => {
  const start = new Date();
  const { method, originalUrl, ip } = req;
  
  // 요청 종료 시 로깅
  res.on('finish', () => {
    const duration = new Date() - start;
    const status = res.statusCode;
    
    const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    
    logger[logLevel](`${method} ${originalUrl} - ${status} - ${duration}ms - ${ip}`, {
      method,
      url: originalUrl,
      status,
      duration,
      ip,
      userAgent: req.get('User-Agent'),
    });
  });
  
  next();
};

/**
 * 성능 측정 유틸리티
 * @param {string} label - 측정 레이블
 * @returns {Function} - 측정 종료 함수
 */
export const startTimer = (label) => {
  if (!config.logging.enableProfiling) return () => {};
  
  const start = process.hrtime();
  
  return () => {
    const diff = process.hrtime(start);
    const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    logger.debug(`⏱️ ${label}: ${duration}ms`);
    return duration;
  };
};

// 프로세스 예외 처리
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // 프로세스 종료 전 로그가 파일에 기록될 시간을 주기 위해 지연
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 로거 인스턴스 내보내기
export default logger;
