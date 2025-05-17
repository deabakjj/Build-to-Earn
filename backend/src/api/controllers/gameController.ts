import { Request, Response, NextFunction } from 'express';
import { GameService } from '../../services/gameService';
import { ErrorCode } from '../../common/errors';
import { validateRequest } from '../middlewares/validation';
import { gameValidationSchemas } from '../validators/gameValidator';

class GameController {
  private gameService: GameService;

  constructor() {
    this.gameService = new GameService();
  }

  /**
   * 플레이어의 게임 상태 조회
   */
  public async getGameState(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const gameState = await this.gameService.getPlayerGameState(userId);
      
      res.status(200).json({
        success: true,
        data: gameState
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 플레이어의 랜드 정보 조회
   */
  public async getPlayerLand(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const landInfo = await this.gameService.getPlayerLand(userId);
      
      res.status(200).json({
        success: true,
        data: landInfo
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 랜드 상의 건물 조회
   */
  public async getLandBuildings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { landId } = req.params;
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

      const buildings = await this.gameService.getLandBuildings(landId, userId);
      
      res.status(200).json({
        success: true,
        data: buildings
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 자원 수집
   */
  public async collectResources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(gameValidationSchemas.collectResources)(req, res, async () => {
        const userId = req.user?.id;
        const { resourceType, amount, landId } = req.body;

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

        const result = await this.gameService.collectResources(userId, {
          resourceType,
          amount,
          landId
        });
        
        res.status(200).json({
          success: true,
          data: result,
          message: '자원이 성공적으로 수집되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 아이템 제작
   */
  public async craftItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(gameValidationSchemas.craftItem)(req, res, async () => {
        const userId = req.user?.id;
        const { itemType, recipe, materials } = req.body;

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

        const craftedItem = await this.gameService.craftItem(userId, {
          itemType,
          recipe,
          materials
        });
        
        res.status(200).json({
          success: true,
          data: craftedItem,
          message: '아이템이 성공적으로 제작되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 건물 건설
   */
  public async buildStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(gameValidationSchemas.buildStructure)(req, res, async () => {
        const userId = req.user?.id;
        const { landId, buildingType, position, materials } = req.body;

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

        const building = await this.gameService.buildStructure(userId, {
          landId,
          buildingType,
          position,
          materials
        });
        
        res.status(200).json({
          success: true,
          data: building,
          message: '건물이 성공적으로 건설되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 건물 업그레이드
   */
  public async upgradeBuilding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(gameValidationSchemas.upgradeBuilding)(req, res, async () => {
        const userId = req.user?.id;
        const { buildingId, upgradeLevel, materials } = req.body;

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

        const upgradedBuilding = await this.gameService.upgradeBuilding(userId, {
          buildingId,
          upgradeLevel,
          materials
        });
        
        res.status(200).json({
          success: true,
          data: upgradedBuilding,
          message: '건물이 성공적으로 업그레이드되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 퀘스트 목록 조회
   */
  public async getAvailableQuests(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { type, difficulty, status } = req.query;
      
      const quests = await this.gameService.getAvailableQuests(userId, {
        type: type as string,
        difficulty: difficulty as string,
        status: status as string
      });
      
      res.status(200).json({
        success: true,
        data: quests
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 퀘스트 시작
   */
  public async startQuest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(gameValidationSchemas.startQuest)(req, res, async () => {
        const userId = req.user?.id;
        const { questId } = req.body;

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

        const quest = await this.gameService.startQuest(userId, questId);
        
        res.status(200).json({
          success: true,
          data: quest,
          message: '퀘스트가 시작되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 퀘스트 완료
   */
  public async completeQuest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(gameValidationSchemas.completeQuest)(req, res, async () => {
        const userId = req.user?.id;
        const { questId, evidence } = req.body;

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

        const result = await this.gameService.completeQuest(userId, questId, evidence);
        
        res.status(200).json({
          success: true,
          data: result,
          message: '퀘스트가 완료되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 랜드 확장
   */
  public async expandLand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(gameValidationSchemas.expandLand)(req, res, async () => {
        const userId = req.user?.id;
        const { landId, direction, size, cost } = req.body;

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

        const expandedLand = await this.gameService.expandLand(userId, {
          landId,
          direction,
          size,
          cost
        });
        
        res.status(200).json({
          success: true,
          data: expandedLand,
          message: '랜드가 성공적으로 확장되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 플레이어 통계 조회
   */
  public async getPlayerStats(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const stats = await this.gameService.getPlayerStats(userId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 현재 시즌 정보 조회
   */
  public async getCurrentSeason(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const seasonInfo = await this.gameService.getCurrentSeason();
      
      res.status(200).json({
        success: true,
        data: seasonInfo
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 시즌 진행도 조회
   */
  public async getSeasonProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const progress = await this.gameService.getSeasonProgress(userId);
      
      res.status(200).json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 일일 보상 받기
   */
  public async claimDailyReward(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const reward = await this.gameService.claimDailyReward(userId);
      
      res.status(200).json({
        success: true,
        data: reward,
        message: '일일 보상을 받았습니다.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 플레이 시간 업데이트
   */
  public async updatePlayTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(gameValidationSchemas.updatePlayTime)(req, res, async () => {
        const userId = req.user?.id;
        const { playTime } = req.body;

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

        await this.gameService.updatePlayTime(userId, playTime);
        
        res.status(200).json({
          success: true,
          message: '플레이 시간이 업데이트되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 월드 탐험
   */
  public async exploreWorld(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(gameValidationSchemas.exploreWorld)(req, res, async () => {
        const userId = req.user?.id;
        const { targetWorldId, explorationTime } = req.body;

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

        const exploration = await this.gameService.exploreWorld(userId, {
          targetWorldId,
          explorationTime
        });
        
        res.status(200).json({
          success: true,
          data: exploration,
          message: '월드 탐험을 시작했습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 탐험 결과 조회
   */
  public async getExplorationResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { explorationId } = req.params;
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

      const result = await this.gameService.getExplorationResult(userId, explorationId);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 게임 설정 업데이트
   */
  public async updateGameSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(gameValidationSchemas.updateSettings)(req, res, async () => {
        const userId = req.user?.id;
        const { settings } = req.body;

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

        const updatedSettings = await this.gameService.updateGameSettings(userId, settings);
        
        res.status(200).json({
          success: true,
          data: updatedSettings,
          message: '게임 설정이 업데이트되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new GameController();
