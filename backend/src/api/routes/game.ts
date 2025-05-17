import { Router } from 'express';
import gameController from '../controllers/gameController';
import { authenticate } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { gameValidationSchemas } from '../validators/gameValidator';

const router = Router();

/**
 * @route   GET /api/game/state
 * @desc    플레이어 게임 상태 조회
 * @access  Private
 */
router.get('/state', authenticate, gameController.getGameState);

/**
 * @route   GET /api/game/land
 * @desc    플레이어 랜드 정보 조회
 * @access  Private
 */
router.get('/land', authenticate, gameController.getPlayerLand);

/**
 * @route   GET /api/game/land/:landId/buildings
 * @desc    랜드 상의 건물 조회
 * @access  Private
 */
router.get('/land/:landId/buildings', authenticate, gameController.getLandBuildings);

/**
 * @route   POST /api/game/resources/collect
 * @desc    자원 수집
 * @access  Private
 */
router.post(
  '/resources/collect',
  authenticate,
  validateRequest(gameValidationSchemas.collectResources),
  gameController.collectResources
);

/**
 * @route   POST /api/game/craft
 * @desc    아이템 제작
 * @access  Private
 */
router.post(
  '/craft',
  authenticate,
  validateRequest(gameValidationSchemas.craftItem),
  gameController.craftItem
);

/**
 * @route   POST /api/game/build
 * @desc    건물 건설
 * @access  Private
 */
router.post(
  '/build',
  authenticate,
  validateRequest(gameValidationSchemas.buildStructure),
  gameController.buildStructure
);

/**
 * @route   POST /api/game/upgrade
 * @desc    건물 업그레이드
 * @access  Private
 */
router.post(
  '/upgrade',
  authenticate,
  validateRequest(gameValidationSchemas.upgradeBuilding),
  gameController.upgradeBuilding
);

/**
 * @route   GET /api/game/quests
 * @desc    퀘스트 목록 조회
 * @access  Private
 */
router.get('/quests', authenticate, gameController.getAvailableQuests);

/**
 * @route   POST /api/game/quests/start
 * @desc    퀘스트 시작
 * @access  Private
 */
router.post(
  '/quests/start',
  authenticate,
  validateRequest(gameValidationSchemas.startQuest),
  gameController.startQuest
);

/**
 * @route   POST /api/game/quests/complete
 * @desc    퀘스트 완료
 * @access  Private
 */
router.post(
  '/quests/complete',
  authenticate,
  validateRequest(gameValidationSchemas.completeQuest),
  gameController.completeQuest
);

/**
 * @route   POST /api/game/land/expand
 * @desc    랜드 확장
 * @access  Private
 */
router.post(
  '/land/expand',
  authenticate,
  validateRequest(gameValidationSchemas.expandLand),
  gameController.expandLand
);

/**
 * @route   GET /api/game/stats
 * @desc    플레이어 통계 조회
 * @access  Private
 */
router.get('/stats', authenticate, gameController.getPlayerStats);

/**
 * @route   GET /api/game/season
 * @desc    현재 시즌 정보 조회
 * @access  Public
 */
router.get('/season', gameController.getCurrentSeason);

/**
 * @route   GET /api/game/season/progress
 * @desc    시즌 진행도 조회
 * @access  Private
 */
router.get('/season/progress', authenticate, gameController.getSeasonProgress);

/**
 * @route   POST /api/game/rewards/daily
 * @desc    일일 보상 수령
 * @access  Private
 */
router.post('/rewards/daily', authenticate, gameController.claimDailyReward);

/**
 * @route   PUT /api/game/playtime
 * @desc    플레이 시간 업데이트
 * @access  Private
 */
router.put(
  '/playtime',
  authenticate,
  validateRequest(gameValidationSchemas.updatePlayTime),
  gameController.updatePlayTime
);

/**
 * @route   POST /api/game/explore
 * @desc    월드 탐험
 * @access  Private
 */
router.post(
  '/explore',
  authenticate,
  validateRequest(gameValidationSchemas.exploreWorld),
  gameController.exploreWorld
);

/**
 * @route   GET /api/game/explore/:explorationId
 * @desc    탐험 결과 조회
 * @access  Private
 */
router.get('/explore/:explorationId', authenticate, gameController.getExplorationResult);

/**
 * @route   PUT /api/game/settings
 * @desc    게임 설정 업데이트
 * @access  Private
 */
router.put(
  '/settings',
  authenticate,
  validateRequest(gameValidationSchemas.updateSettings),
  gameController.updateGameSettings
);

/**
 * @route   GET /api/game/leaderboard
 * @desc    리더보드 조회
 * @access  Public
 */
router.get('/leaderboard', gameController.getLeaderboard);

/**
 * @route   GET /api/game/worlds
 * @desc    인기 월드 목록 조회
 * @access  Public
 */
router.get('/worlds', gameController.getPopularWorlds);

/**
 * @route   GET /api/game/worlds/:worldId
 * @desc    특정 월드 정보 조회
 * @access  Public
 */
router.get('/worlds/:worldId', gameController.getWorldInfo);

/**
 * @route   POST /api/game/worlds/:worldId/visit
 * @desc    월드 방문
 * @access  Private
 */
router.post('/worlds/:worldId/visit', authenticate, gameController.visitWorld);

/**
 * @route   POST /api/game/worlds/:worldId/rate
 * @desc    월드 평가
 * @access  Private
 */
router.post(
  '/worlds/:worldId/rate',
  authenticate,
  validateRequest(gameValidationSchemas.rateWorld),
  gameController.rateWorld
);

/**
 * @route   GET /api/game/activities
 * @desc    최근 활동 조회
 * @access  Private
 */
router.get('/activities', authenticate, gameController.getRecentActivities);

/**
 * @route   POST /api/game/tutorial/complete
 * @desc    튜토리얼 완료
 * @access  Private
 */
router.post('/tutorial/complete', authenticate, gameController.completeTutorial);

/**
 * @route   GET /api/game/events
 * @desc    진행 중인 이벤트 조회
 * @access  Public
 */
router.get('/events', gameController.getActiveEvents);

/**
 * @route   POST /api/game/events/:eventId/participate
 * @desc    이벤트 참여
 * @access  Private
 */
router.post('/events/:eventId/participate', authenticate, gameController.participateInEvent);

/**
 * @route   GET /api/game/inventory
 * @desc    게임 인벤토리 조회
 * @access  Private
 */
router.get('/inventory', authenticate, gameController.getGameInventory);

/**
 * @route   POST /api/game/inventory/organize
 * @desc    인벤토리 정리
 * @access  Private
 */
router.post('/inventory/organize', authenticate, gameController.organizeInventory);

/**
 * @route   GET /api/game/recipes
 * @desc    제작 레시피 목록 조회
 * @access  Public
 */
router.get('/recipes', gameController.getCraftingRecipes);

/**
 * @route   GET /api/game/recipes/:recipeId
 * @desc    특정 레시피 정보 조회
 * @access  Public
 */
router.get('/recipes/:recipeId', gameController.getRecipeDetails);

/**
 * @route   POST /api/game/recipes/discover
 * @desc    새로운 레시피 발견
 * @access  Private
 */
router.post('/recipes/discover', authenticate, gameController.discoverRecipe);

export default router;
