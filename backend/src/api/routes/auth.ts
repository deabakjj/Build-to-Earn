import { Router } from 'express';
import authController from '../controllers/authController';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { refreshTokenAuth } from '../middlewares/auth';
import validationMiddleware from '../middlewares/validation';
import { loginSchema, registerSchema, refreshTokenSchema } from '../validators/authValidator';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: 새 사용자 등록
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               username:
 *                 type: string
 *                 minLength: 3
 *               displayName:
 *                 type: string
 *     responses:
 *       201:
 *         description: 사용자 등록 성공
 *       400:
 *         description: 잘못된 요청 또는 유효성 검사 실패
 *       409:
 *         description: 이미 존재하는 이메일 또는 사용자 이름
 */
router.post(
  '/register',
  authRateLimiter,
  validationMiddleware(registerSchema),
  authController.register
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: 사용자 로그인
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 */
router.post(
  '/login',
  authRateLimiter,
  validationMiddleware(loginSchema),
  authController.login
);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: 액세스 토큰 갱신
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: 토큰 갱신 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 유효하지 않은 리프레시 토큰
 */
router.post(
  '/refresh-token',
  authRateLimiter,
  validationMiddleware(refreshTokenSchema),
  refreshTokenAuth,
  authController.refreshToken
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: 사용자 로그아웃
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post(
  '/logout',
  validationMiddleware(refreshTokenSchema),
  authController.logout
);

/**
 * @swagger
 * /api/v1/auth/verify-email/{token}:
 *   get:
 *     summary: 이메일 확인
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 이메일 확인 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 유효하지 않은 토큰
 */
router.get('/verify-email/:token', authController.verifyEmail);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: 비밀번호 재설정 링크 요청
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: 비밀번호 재설정 링크 전송 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password/{token}:
 *   post:
 *     summary: 비밀번호 재설정
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: 비밀번호 재설정 성공
 *       400:
 *         description: 잘못된 요청
 *       404:
 *         description: 유효하지 않은 토큰
 */
router.post(
  '/reset-password/:token',
  authRateLimiter,
  authController.resetPassword
);

/**
 * @swagger
 * /api/v1/auth/wallet-login:
 *   post:
 *     summary: 지갑을 통한 로그인
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - signature
 *               - message
 *             properties:
 *               address:
 *                 type: string
 *               signature:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 */
router.post('/wallet-login', authRateLimiter, authController.walletLogin);

/**
 * @swagger
 * /api/v1/auth/connect-wallet:
 *   post:
 *     summary: 기존 계정에 지갑 연결
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - signature
 *               - message
 *             properties:
 *               address:
 *                 type: string
 *               signature:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: 지갑 연결 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       409:
 *         description: 지갑이 이미 다른 계정에 연결됨
 */
router.post('/connect-wallet', authController.connectWallet);

/**
 * @swagger
 * /api/v1/auth/social/{provider}:
 *   get:
 *     summary: 소셜 로그인 초기화
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, discord, twitter]
 *     responses:
 *       302:
 *         description: 소셜 로그인 페이지로 리디렉션
 */
router.get('/social/:provider', authController.socialLogin);

/**
 * @swagger
 * /api/v1/auth/social/{provider}/callback:
 *   get:
 *     summary: 소셜 로그인 콜백
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, discord, twitter]
 *     responses:
 *       200:
 *         description: 소셜 로그인 성공
 *       400:
 *         description: 잘못된 요청
 */
router.get('/social/:provider/callback', authController.socialLoginCallback);

export default router;
