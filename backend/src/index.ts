import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Config
import config from './config';
import { connectDatabase } from './config/db';
import logger from './utils/logger';

// Middleware
import errorHandler from './api/middlewares/errorHandler';
import rateLimiter from './api/middlewares/rateLimiter';
import auth from './api/middlewares/auth';

// Routes
import authRoutes from './api/routes/auth';
import userRoutes from './api/routes/user';
import gameRoutes from './api/routes/game';
import nftRoutes from './api/routes/nft';
import marketplaceRoutes from './api/routes/marketplace';
import seasonRoutes from './api/routes/season';
import guildRoutes from './api/routes/guild';
import analyticsRoutes from './api/routes/analytics';

// Socket handlers
import { initializeSocketHandlers } from './websocket/socketServer';

// Tasks
import initializeScheduledTasks from './tasks/scheduler';

// Initialize environment variables
dotenv.config();

/**
 * DIY 크래프팅 월드 백엔드 API 서버
 * 
 * Express.js 기반의 RESTful API 서버
 * - 사용자 인증 및 관리
 * - 게임 데이터 및 NFT 관리
 * - 실시간 소켓 통신
 * - 스케줄링된 작업 관리
 */
class BackendServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private pubClient: any;
  private subClient: any;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.initializeRedisClients();
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.allowedOrigins,
        credentials: true,
      },
    });
  }

  /**
   * Redis 클라이언트 초기화
   */
  private async initializeRedisClients() {
    try {
      this.pubClient = createClient({ 
        url: config.redis.url,
        password: config.redis.password 
      });
      this.subClient = this.pubClient.duplicate();

      await Promise.all([
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      // Redis adapter 설정
      this.io.adapter(createAdapter(this.pubClient, this.subClient));
      logger.info('Redis clients connected successfully');
    } catch (error) {
      logger.error('Failed to connect Redis clients:', error);
      throw error;
    }
  }

  /**
   * 기본 미들웨어 설정
   */
  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.creatachain.org"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    }));

    // CORS 설정
    this.app.use(cors({
      origin: config.allowedOrigins,
      credentials: true,
      exposedHeaders: ['X-Total-Count'],
    }));

    // 압축
    this.app.use(compression());

    // Body parser
    this.app.use(bodyParser.json({ limit: '50mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

    // 요청 로깅
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });

    // Sanitization
    this.app.use(mongoSanitize());

    // Rate limiting
    this.app.use(rateLimiter);
  }

  /**
   * API 라우트 설정
   */
  private setupRoutes() {
    // API prefix
    const apiPrefix = '/api/v1';

    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      });
    });

    // API routes
    this.app.use(`${apiPrefix}/auth`, authRoutes);
    this.app.use(`${apiPrefix}/users`, auth, userRoutes);
    this.app.use(`${apiPrefix}/game`, auth, gameRoutes);
    this.app.use(`${apiPrefix}/nft`, auth, nftRoutes);
    this.app.use(`${apiPrefix}/marketplace`, auth, marketplaceRoutes);
    this.app.use(`${apiPrefix}/seasons`, auth, seasonRoutes);
    this.app.use(`${apiPrefix}/guilds`, auth, guildRoutes);
    this.app.use(`${apiPrefix}/analytics`, auth, analyticsRoutes);

    // API documentation
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'DIY 크래프팅 월드 API',
          version: '1.0.0',
          description: 'Build-to-Earn 게임 플랫폼 API 문서',
        },
        servers: [
          {
            url: `http://localhost:${config.port}`,
            description: 'Development server',
          },
          {
            url: config.apiUrl,
            description: 'Production server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
      apis: ['./src/api/routes/*.ts', './src/models/*.ts'],
    };

    const apiDocs = swaggerJsdoc(swaggerOptions);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiDocs));

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'API endpoint not found',
      });
    });
  }

  /**
   * 에러 핸들링 설정
   */
  private setupErrorHandling() {
    this.app.use(errorHandler);
  }

  /**
   * 소켓 통신 설정
   */
  private setupSocket() {
    initializeSocketHandlers(this.io);
    logger.info('Socket.IO server initialized');
  }

  /**
   * 스케줄링된 작업 초기화
   */
  private initializeBackgroundTasks() {
    initializeScheduledTasks();
    logger.info('Scheduled tasks initialized');
  }

  /**
   * 데이터베이스 연결
   */
  private async connectDB() {
    try {
      await connectDatabase();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      process.exit(1);
    }
  }

  /**
   * 서버 시작
   */
  public async start() {
    try {
      // 데이터베이스 연결
      await this.connectDB();

      // 미들웨어 설정
      this.setupMiddleware();

      // 라우트 설정
      this.setupRoutes();

      // 에러 핸들링 설정
      this.setupErrorHandling();

      // 소켓 설정
      this.setupSocket();

      // 백그라운드 작업 초기화
      this.initializeBackgroundTasks();

      // 서버 시작
      const PORT = config.port || 4000;
      this.server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV}`);
        logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
      });

      // Graceful shutdown 핸들러
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown 설정
   */
  private setupGracefulShutdown() {
    const shutdown = async () => {
      logger.info('Graceful shutdown initiated...');
      
      this.server.close(async () => {
        logger.info('HTTP server closed');

        // 리소스 정리
        await Promise.all([
          this.pubClient?.quit(),
          this.subClient?.quit(),
        ]);

        logger.info('All resources cleaned up');
        process.exit(0);
      });

      // 10초 후 강제 종료
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

// 서버 인스턴스 생성 및 시작
const server = new BackendServer();
server.start();

export default server;
