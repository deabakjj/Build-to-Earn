import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { UserService } from '../../services/userService';
import { ErrorCode } from '../../common/errors';
import { validateRequest } from '../middlewares/validation';
import { userValidationSchemas } from '../validators/userValidator';

class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * 사용자 프로필 조회
   */
  public async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: '인증이 필요합니다.'
          }
        });
        return;
      }

      const user = await this.userService.getUserProfile(userId);
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자 프로필 업데이트
   */
  public async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(userValidationSchemas.updateProfile)(req, res, async () => {
        const userId = req.user?.id;
        const updates = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const updatedUser = await this.userService.updateProfile(userId, updates);
        
        res.status(200).json({
          success: true,
          data: updatedUser,
          message: '프로필이 성공적으로 업데이트되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자의 NFT 인벤토리 조회
   */
  public async getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: '인증이 필요합니다.'
          }
        });
        return;
      }

      const { type, page = 1, limit = 20 } = req.query;
      
      const inventory = await this.userService.getInventory(userId, {
        type: type as string,
        page: Number(page),
        limit: Number(limit)
      });
      
      res.status(200).json({
        success: true,
        data: inventory
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자의 거래 기록 조회
   */
  public async getTransactionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: '인증이 필요합니다.'
          }
        });
        return;
      }

      const { type, status, page = 1, limit = 20, startDate, endDate } = req.query;
      
      const transactions = await this.userService.getTransactionHistory(userId, {
        type: type as string,
        status: status as string,
        page: Number(page),
        limit: Number(limit),
        startDate: startDate as string,
        endDate: endDate as string
      });
      
      res.status(200).json({
        success: true,
        data: transactions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자의 랜드 보유 현황 조회
   */
  public async getLandHoldings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: '인증이 필요합니다.'
          }
        });
        return;
      }

      const lands = await this.userService.getLandHoldings(userId);
      
      res.status(200).json({
        success: true,
        data: lands
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자의 업적 조회
   */
  public async getAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: '인증이 필요합니다.'
          }
        });
        return;
      }

      const achievements = await this.userService.getAchievements(userId);
      
      res.status(200).json({
        success: true,
        data: achievements
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자의 친구 목록 조회
   */
  public async getFriends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: '인증이 필요합니다.'
          }
        });
        return;
      }

      const { status = 'all', page = 1, limit = 20 } = req.query;
      
      const friends = await this.userService.getFriends(userId, {
        status: status as string,
        page: Number(page),
        limit: Number(limit)
      });
      
      res.status(200).json({
        success: true,
        data: friends
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 친구 요청 보내기
   */
  public async sendFriendRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(userValidationSchemas.friendRequest)(req, res, async () => {
        const userId = req.user?.id;
        const { targetUserId } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const result = await this.userService.sendFriendRequest(userId, targetUserId);
        
        res.status(200).json({
          success: true,
          data: result,
          message: '친구 요청을 보냈습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 친구 요청 응답 (수락/거절)
   */
  public async respondToFriendRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(userValidationSchemas.friendResponse)(req, res, async () => {
        const userId = req.user?.id;
        const { requestId, action } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const result = await this.userService.respondToFriendRequest(userId, requestId, action);
        
        res.status(200).json({
          success: true,
          data: result,
          message: action === 'accept' ? '친구 요청을 수락했습니다.' : '친구 요청을 거절했습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자의 리워드 내역 조회
   */
  public async getRewards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: '인증이 필요합니다.'
          }
        });
        return;
      }

      const { type, status, page = 1, limit = 20 } = req.query;
      
      const rewards = await this.userService.getRewards(userId, {
        type: type as string,
        status: status as string,
        page: Number(page),
        limit: Number(limit)
      });
      
      res.status(200).json({
        success: true,
        data: rewards
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자의 활동 통계 조회
   */
  public async getActivityStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: '인증이 필요합니다.'
          }
        });
        return;
      }

      const { period = '7d' } = req.query;
      
      const stats = await this.userService.getActivityStats(userId, period as string);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자 계정 삭제
   */
  public async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(userValidationSchemas.deleteAccount)(req, res, async () => {
        const userId = req.user?.id;
        const { password, confirmDeletion } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        if (!confirmDeletion) {
          res.status(400).json({
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: '계정 삭제를 확인해주세요.'
            }
          });
          return;
        }

        await this.userService.deleteAccount(userId, password);
        
        res.status(200).json({
          success: true,
          message: '계정이 성공적으로 삭제되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자 검색
   */
  public async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, page = 1, limit = 20 } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: '검색어를 입력해주세요.'
          }
        });
        return;
      }

      const results = await this.userService.searchUsers(query, {
        page: Number(page),
        limit: Number(limit)
      });
      
      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자 보안 설정 조회
   */
  public async getSecuritySettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: '인증이 필요합니다.'
          }
        });
        return;
      }

      const settings = await this.userService.getSecuritySettings(userId);
      
      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자 보안 설정 업데이트
   */
  public async updateSecuritySettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(userValidationSchemas.updateSecurity)(req, res, async () => {
        const userId = req.user?.id;
        const { twoFactorEnabled, notifications, privacy } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const updatedSettings = await this.userService.updateSecuritySettings(userId, {
          twoFactorEnabled,
          notifications,
          privacy
        });
        
        res.status(200).json({
          success: true,
          data: updatedSettings,
          message: '보안 설정이 업데이트되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
