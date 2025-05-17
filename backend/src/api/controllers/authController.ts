import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ethers } from 'ethers';
import passport from 'passport';
import bcrypt from 'bcrypt';
import config from '../../config';
import User from '../../models/User';
import { JwtPayload } from '../middlewares/auth';
import { APIError } from '../middlewares/errorHandler';
import logger from '../../utils/logger';
import authService from '../../services/authService';
import emailService from '../../services/emailService';

/**
 * 인증 컨트롤러
 * 
 * 사용자 등록, 로그인, 토큰 갱신 등의 인증 관련 기능을 처리
 */
class AuthController {
  /**
   * 사용자 등록
   * @route POST /api/v1/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, username, displayName } = req.body;

      // 이메일 및 사용자 이름 중복 확인
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        throw new APIError(409, 'Email already exists');
      }

      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        throw new APIError(409, 'Username already exists');
      }

      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(password, config.security.passwordSaltRounds);

      // 이메일 인증 토큰 생성
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간

      // 사용자 생성
      const user = await User.create({
        email,
        password: hashedPassword,
        username,
        displayName: displayName || username,
        emailVerified: false,
        verificationToken,
        verificationTokenExpires,
        role: 'user',
      });

      // 인증 이메일 전송
      await emailService.sendVerificationEmail(user.email, verificationToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please verify your email.',
        data: {
          userId: user._id,
          email: user.email,
          username: user.username,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자 로그인
   * @route POST /api/v1/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // 사용자 찾기
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new APIError(401, 'Invalid credentials');
      }

      // 비밀번호 확인
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // 로그인 실패 카운터 증가
        await authService.incrementLoginFailureCount(user._id);
        throw new APIError(401, 'Invalid credentials');
      }

      // 이메일 인증 확인
      if (!user.emailVerified) {
        throw new APIError(403, 'Email not verified');
      }

      // 계정 상태 확인
      if (user.status !== 'active') {
        throw new APIError(403, `Account is ${user.status}`);
      }

      // 토큰 생성
      const { accessToken, refreshToken } = await authService.generateAuthTokens(user._id, user.role);

      // 로그인 성공 카운터 초기화
      await authService.resetLoginFailureCount(user._id);

      // 마지막 로그인 시간 업데이트
      await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date(),
      });

      // 로그인 기록
      logger.info(`User logged in: ${user.email}`);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            walletConnected: !!user.walletAddress,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 액세스 토큰 갱신
   * @route POST /api/v1/auth/refresh-token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      // 리프레시 토큰 검증 (이미 미들웨어에서 수행)
      if (!req.user) {
        throw new APIError(401, 'Invalid refresh token');
      }

      // 리프레시 토큰으로 사용자 찾기
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new APIError(404, 'User not found');
      }

      // 새 액세스 토큰 생성
      const accessToken = await authService.generateAccessToken(user._id, user.role);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자 로그아웃
   * @route POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      // 리프레시 토큰 블랙리스트에 추가
      await authService.invalidateRefreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 이메일 확인
   * @route GET /api/v1/auth/verify-email/:token
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;

      // 토큰으로 사용자 찾기
      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: Date.now() },
      });

      if (!user) {
        throw new APIError(400, 'Invalid or expired verification token');
      }

      // 이메일 인증 처리
      user.emailVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 비밀번호 재설정 요청
   * @route POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      // 사용자 찾기
      const user = await User.findOne({ email });
      if (!user) {
        // 사용자가 없어도 성공 응답 (보안 목적)
        return res.status(200).json({
          success: true,
          message: 'If a user with that email exists, a password reset link has been sent',
        });
      }

      // 재설정 토큰 생성
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1시간

      // 사용자 업데이트
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetTokenExpires;
      await user.save();

      // 재설정 이메일 전송
      await emailService.sendPasswordResetEmail(user.email, resetToken);

      res.status(200).json({
        success: true,
        message: 'If a user with that email exists, a password reset link has been sent',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 비밀번호 재설정
   * @route POST /api/v1/auth/reset-password/:token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      const { password } = req.body;

      // 토큰으로 사용자 찾기
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        throw new APIError(400, 'Invalid or expired reset token');
      }

      // 비밀번호 해싱
      const hashedPassword = await bcrypt.hash(password, config.security.passwordSaltRounds);

      // 사용자 업데이트
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // 비밀번호 변경 알림 이메일 전송
      await emailService.sendPasswordChangeNotification(user.email);

      res.status(200).json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 지갑 로그인
   * @route POST /api/v1/auth/wallet-login
   */
  async walletLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { address, signature, message } = req.body;

      // 서명 검증
      const isValid = await authService.verifyWalletSignature(address, signature, message);
      if (!isValid) {
        throw new APIError(401, 'Invalid signature');
      }

      // 지갑 주소로 사용자 찾기
      let user = await User.findOne({ walletAddress: address.toLowerCase() });

      // 새 사용자인 경우 자동 등록
      if (!user) {
        const username = `user_${address.slice(2, 8)}`;
        const displayName = `Wallet User ${address.slice(0, 6)}...${address.slice(-4)}`;

        user = await User.create({
          username,
          displayName,
          walletAddress: address.toLowerCase(),
          emailVerified: true, // 지갑 인증은 이메일 인증 필요 없음
          role: 'user',
          status: 'active',
          registrationMethod: 'wallet',
        });
      }

      // 계정 상태 확인
      if (user.status !== 'active') {
        throw new APIError(403, `Account is ${user.status}`);
      }

      // 토큰 생성
      const { accessToken, refreshToken } = await authService.generateAuthTokens(user._id, user.role);

      // 마지막 로그인 시간 업데이트
      await User.findByIdAndUpdate(user._id, {
        lastLogin: new Date(),
      });

      // 로그인 기록
      logger.info(`User logged in with wallet: ${address}`);

      res.status(200).json({
        success: true,
        message: 'Wallet login successful',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user._id,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            walletAddress: user.walletAddress,
            isNewUser: user.createdAt.getTime() === user.updatedAt.getTime(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 기존 계정에 지갑 연결
   * @route POST /api/v1/auth/connect-wallet
   */
  async connectWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const { address, signature, message } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new APIError(401, 'Authentication required');
      }

      // 서명 검증
      const isValid = await authService.verifyWalletSignature(address, signature, message);
      if (!isValid) {
        throw new APIError(401, 'Invalid signature');
      }

      // 지갑 주소가 이미 다른 계정에 연결되어 있는지 확인
      const existingWallet = await User.findOne({
        walletAddress: address.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingWallet) {
        throw new APIError(409, 'Wallet already connected to another account');
      }

      // 지갑 주소 연결
      const user = await User.findByIdAndUpdate(
        userId,
        { walletAddress: address.toLowerCase() },
        { new: true }
      );

      if (!user) {
        throw new APIError(404, 'User not found');
      }

      res.status(200).json({
        success: true,
        message: 'Wallet connected successfully',
        data: {
          user: {
            id: user._id,
            username: user.username,
            displayName: user.displayName,
            walletAddress: user.walletAddress,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 소셜 로그인 초기화
   * @route GET /api/v1/auth/social/:provider
   */
  socialLogin(req: Request, res: Response, next: NextFunction) {
    const { provider } = req.params;

    try {
      // 지원하는 소셜 로그인 제공자 확인
      if (!['google', 'discord', 'twitter'].includes(provider)) {
        throw new APIError(400, `Unsupported provider: ${provider}`);
      }

      // Passport 인증 시작
      passport.authenticate(provider, {
        scope: provider === 'google' ? ['profile', 'email'] : undefined,
        session: false,
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 소셜 로그인 콜백
   * @route GET /api/v1/auth/social/:provider/callback
   */
  socialLoginCallback(req: Request, res: Response, next: NextFunction) {
    const { provider } = req.params;

    try {
      // 지원하는 소셜 로그인 제공자 확인
      if (!['google', 'discord', 'twitter'].includes(provider)) {
        throw new APIError(400, `Unsupported provider: ${provider}`);
      }

      // Passport 인증 콜백
      passport.authenticate(provider, { session: false }, async (err: any, profile: any) => {
        if (err) {
          return next(new APIError(500, 'Social authentication failed'));
        }

        if (!profile) {
          return next(new APIError(401, 'Authentication failed'));
        }

        try {
          // 소셜 ID로 사용자 찾기
          let user = await User.findOne({ [`social.${provider}.id`]: profile.id });

          // 새 사용자인 경우 자동 등록
          if (!user) {
            const { username, email, displayName } = await authService.generateSocialUserData(profile, provider);

            // 이메일이 있는 경우 기존 계정과 연결 시도
            if (email) {
              const existingUser = await User.findOne({ email });
              if (existingUser) {
                // 기존 계정에 소셜 로그인 정보 추가
                existingUser.social = existingUser.social || {};
                existingUser.social[provider] = {
                  id: profile.id,
                  data: profile,
                };
                await existingUser.save();
                user = existingUser;
              }
            }

            // 새 사용자 생성
            if (!user) {
              user = await User.create({
                username,
                email,
                displayName,
                emailVerified: true, // 소셜 로그인은 이메일 인증 필요 없음
                role: 'user',
                status: 'active',
                registrationMethod: provider,
                social: {
                  [provider]: {
                    id: profile.id,
                    data: profile,
                  },
                },
              });
            }
          }

          // 계정 상태 확인
          if (user.status !== 'active') {
            throw new APIError(403, `Account is ${user.status}`);
          }

          // 토큰 생성
          const { accessToken, refreshToken } = await authService.generateAuthTokens(user._id, user.role);

          // 마지막 로그인 시간 업데이트
          await User.findByIdAndUpdate(user._id, {
            lastLogin: new Date(),
          });

          // 프론트엔드로 리디렉션
          const redirectUrl = new URL(`${config.frontendUrl}/auth/callback`);
          redirectUrl.searchParams.append('access_token', accessToken);
          redirectUrl.searchParams.append('refresh_token', refreshToken);
          redirectUrl.searchParams.append('provider', provider);
          
          return res.redirect(redirectUrl.toString());
        } catch (error) {
          return next(error);
        }
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
