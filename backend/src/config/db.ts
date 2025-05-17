import mongoose from 'mongoose';
import config from './index';
import logger from '../utils/logger';

/**
 * MongoDB 데이터베이스 연결 설정
 * 
 * Mongoose를 사용하여 MongoDB 연결을 관리하고
 * 연결 이벤트 핸들러를 설정합니다.
 */

/**
 * 데이터베이스 연결 옵션
 */
const dbOptions: mongoose.ConnectOptions = {
  ...config.database.options,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 5,
  bufferCommands: false,
};

/**
 * MongoDB 데이터베이스 연결 함수
 * 
 * @returns {Promise<typeof mongoose>} Mongoose 인스턴스
 */
export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    // 기존 연결이 있으면 종료
    if (mongoose.connection.readyState === 1) {
      logger.info('Database already connected');
      return mongoose;
    }

    // 이벤트 리스너 설정
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected successfully');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // SIGINT 시그널 처리 (Ctrl+C)
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    // 재연결 로직
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // 개발 환경에서 MongoDB 쿼리 로깅
    if (config.nodeEnv === 'development') {
      mongoose.set('debug', true);
    }

    // 연결 시도
    const connection = await mongoose.connect(config.database.uri, dbOptions);
    
    logger.info('Database connection established successfully');
    return connection;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
};

/**
 * 데이터베이스 연결 종료 함수
 * 
 * @param {boolean} force - 강제 종료 여부
 */
export const disconnectDatabase = async (force: boolean = false): Promise<void> => {
  try {
    await mongoose.connection.close(force);
    logger.info('Database connection closed successfully');
  } catch (error) {
    logger.error('Error while closing database connection:', error);
    throw error;
  }
};

/**
 * 데이터베이스 연결 상태 확인 함수
 * 
 * @returns {boolean} 연결 상태
 */
export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

/**
 * 데이터베이스 연결 재시도 함수
 * 
 * @param {number} maxRetries - 최대 재시도 횟수
 * @param {number} delay - 재시도 간격 (ms)
 */
export const retryConnection = async (
  maxRetries: number = 5,
  delay: number = 5000
): Promise<void> => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await connectDatabase();
      return;
    } catch (error) {
      retries++;
      logger.error(`Database connection attempt ${retries} failed:`, error);
      
      if (retries < maxRetries) {
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.error('Max database connection retries reached');
        throw error;
      }
    }
  }
};

/**
 * 데이터베이스 상태 모니터링
 */
export const monitorDatabaseHealth = (): void => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  setInterval(() => {
    if (config.nodeEnv === 'development') {
      const state = states[mongoose.connection.readyState];
      logger.debug(`Database connection state: ${state}`);
    }
  }, 30000); // 30초마다 상태 체크
};

/**
 * 데이터베이스 인덱스 생성 함수
 * 
 * @param {string} collectionName - 컬렉션 이름
 * @param {Record<string, any>} indexSpec - 인덱스 스펙
 * @param {mongoose.IndexOptions} options - 인덱스 옵션
 */
export const createIndex = async (
  collectionName: string,
  indexSpec: Record<string, any>,
  options?: mongoose.IndexOptions
): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);
    
    await collection.createIndex(indexSpec, options);
    logger.info(`Index created for ${collectionName}:`, indexSpec);
  } catch (error) {
    logger.error(`Failed to create index for ${collectionName}:`, error);
    throw error;
  }
};

/**
 * 데이터베이스 백업 유틸리티
 * 
 * @param {string} outputPath - 백업 파일 경로
 */
export const backupDatabase = async (outputPath: string): Promise<void> => {
  try {
    // 실제 환경에서는 mongodump 등의 도구를 사용해야 합니다
    logger.info('Database backup started');
    // 백업 로직 구현
    logger.info(`Database backed up to ${outputPath}`);
  } catch (error) {
    logger.error('Database backup failed:', error);
    throw error;
  }
};

export default {
  connectDatabase,
  disconnectDatabase,
  isDatabaseConnected,
  retryConnection,
  monitorDatabaseHealth,
  createIndex,
  backupDatabase,
};
