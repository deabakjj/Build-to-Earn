import { Router } from 'express';
import seasonController from '../controllers/seasonController';
import { authenticate } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { seasonValidationSchemas } from '../validators/seasonValidator';

const router = Router();

/**
 * @route   GET /api/season/current
 * @desc    현재 시즌 정보 조회
 * @access  Public
 */
router.get('/current', seasonController.getCurrentSeason);

/**
 * @route   GET /api/season/archive
 * @desc    지난 시즌 아카이브
 * @access  Public
 */
router.get('/archive', seasonController.getSeasonArchive);

/**
 * @route   GET /api/season/:seasonId
 * @desc    특정 시즌 상세 정보
 * @access  Public
 */
router.get('/:seasonId', seasonController.getSeasonDetails);

/**
 * @route   GET /api/season/current/progress
 * @desc    현재 시즌 진행도 조회
 * @access  Private
 */
router.get('/current/progress', authenticate, seasonController.getSeasonProgress);

/**
 * @route   GET /api/season/current/rewards
 * @desc    시즌 보상 목록
 * @access  Public
 */
router.get('/current/rewards', seasonController.getSeasonRewards);

/**
 * @route   POST /api/season/rewards/claim
 * @desc    시즌 보상 수령
 * @access  Private
 */
router.post(
  '/rewards/claim',
  authenticate,
  validateRequest(seasonValidationSchemas.claimReward),
  seasonController.claimSeasonReward
);

/**
 * @route   GET /api/season/current/leaderboard
 * @desc    시즌 리더보드
 * @access  Public
 */
router.get('/current/leaderboard', seasonController.getSeasonLeaderboard);

/**
 * @route   GET /api/season/current/events
 * @desc    시즌 이벤트 목록
 * @access  Public
 */
router.get('/current/events', seasonController.getSeasonEvents);

/**
 * @route   GET /api/season/event/:eventId
 * @desc    시즌 이벤트 상세 정보
 * @access  Public
 */
router.get('/event/:eventId', seasonController.getEventDetails);

/**
 * @route   POST /api/season/event/participate
 * @desc    시즌 이벤트 참여
 * @access  Private
 */
router.post(
  '/event/participate',
  authenticate,
  validateRequest(seasonValidationSchemas.participateInEvent),
  seasonController.participateInEvent
);

/**
 * @route   GET /api/season/current/quests
 * @desc    시즌 퀘스트 목록
 * @access  Public
 */
router.get('/current/quests', seasonController.getSeasonQuests);

/**
 * @route   POST /api/season/quest/start
 * @desc    시즌 퀘스트 시작
 * @access  Private
 */
router.post(
  '/quest/start',
  authenticate,
  validateRequest(seasonValidationSchemas.startQuest),
  seasonController.startSeasonQuest
);

/**
 * @route   POST /api/season/quest/complete
 * @desc    시즌 퀘스트 완료
 * @access  Private
 */
router.post(
  '/quest/complete',
  authenticate,
  validateRequest(seasonValidationSchemas.completeQuest),
  seasonController.completeSeasonQuest
);

/**
 * @route   GET /api/season/current/themes
 * @desc    시즌 테마 정보
 * @access  Public
 */
router.get('/current/themes', seasonController.getSeasonThemes);

/**
 * @route   GET /api/season/current/items
 * @desc    시즌 한정 아이템
 * @access  Public
 */
router.get('/current/items', seasonController.getSeasonItems);

/**
 * @route   GET /api/season/current/achievements
 * @desc    시즌 업적
 * @access  Public
 */
router.get('/current/achievements', seasonController.getSeasonAchievements);

/**
 * @route   GET /api/season/user/achievements
 * @desc    내 시즌 업적 현황
 * @access  Private
 */
router.get('/user/achievements', authenticate, seasonController.getUserSeasonAchievements);

/**
 * @route   POST /api/season/purchase/pass
 * @desc    시즌 패스 구매
 * @access  Private
 */
router.post(
  '/purchase/pass',
  authenticate,
  validateRequest(seasonValidationSchemas.purchasePass),
  seasonController.purchaseSeasonPass
);

/**
 * @route   GET /api/season/pass/benefits
 * @desc    시즌 패스 혜택
 * @access  Public
 */
router.get('/pass/benefits', seasonController.getSeasonPassBenefits);

/**
 * @route   GET /api/season/pass/tiers
 * @desc    시즌 패스 티어
 * @access  Public
 */
router.get('/pass/tiers', seasonController.getSeasonPassTiers);

/**
 * @route   GET /api/season/current/stats
 * @desc    시즌 통계
 * @access  Public
 */
router.get('/current/stats', seasonController.getSeasonStats);

/**
 * @route   GET /api/season/user/stats
 * @desc    내 시즌 통계
 * @access  Private
 */
router.get('/user/stats', authenticate, seasonController.getUserSeasonStats);

/**
 * @route   GET /api/season/upcoming
 * @desc    다가오는 시즌 미리보기
 * @access  Public
 */
router.get('/upcoming', seasonController.getUpcomingSeason);

/**
 * @route   POST /api/season/feedback
 * @desc    시즌 피드백 제출
 * @access  Private
 */
router.post(
  '/feedback',
  authenticate,
  validateRequest(seasonValidationSchemas.submitFeedback),
  seasonController.submitSeasonFeedback
);

/**
 * @route   GET /api/season/current/rankings
 * @desc    시즌 랭킹 시스템
 * @access  Public
 */
router.get('/current/rankings', seasonController.getSeasonRankings);

/**
 * @route   GET /api/season/user/rank
 * @desc    내 시즌 랭킹
 * @access  Private
 */
router.get('/user/rank', authenticate, seasonController.getUserSeasonRank);

/**
 * @route   GET /api/season/calendar
 * @desc    시즌 일정
 * @access  Public
 */
router.get('/calendar', seasonController.getSeasonCalendar);

/**
 * @route   POST /api/season/notification/subscribe
 * @desc    시즌 알림 구독
 * @access  Private
 */
router.post(
  '/notification/subscribe',
  authenticate,
  validateRequest(seasonValidationSchemas.subscribeNotification),
  seasonController.subscribeToSeasonNotifications
);

/**
 * @route   POST /api/season/notification/unsubscribe
 * @desc    시즌 알림 구독 해제
 * @access  Private
 */
router.post(
  '/notification/unsubscribe',
  authenticate,
  validateRequest(seasonValidationSchemas.unsubscribeNotification),
  seasonController.unsubscribeFromSeasonNotifications
);

/**
 * @route   GET /api/season/highlights
 * @desc    시즌 하이라이트
 * @access  Public
 */
router.get('/highlights', seasonController.getSeasonHighlights);

/**
 * @route   POST /api/season/contribution
 * @desc    시즌 기여 포인트 추가
 * @access  Private
 */
router.post(
  '/contribution',
  authenticate,
  validateRequest(seasonValidationSchemas.addContribution),
  seasonController.addSeasonContribution
);

/**
 * @route   GET /api/season/user/contributions
 * @desc    내 시즌 기여 현황
 * @access  Private
 */
router.get('/user/contributions', authenticate, seasonController.getUserContributions);

/**
 * @route   GET /api/season/milestones
 * @desc    시즌 마일스톤
 * @access  Public
 */
router.get('/milestones', seasonController.getSeasonMilestones);

/**
 * @route   POST /api/season/milestone/check
 * @desc    마일스톤 달성 확인
 * @access  Private
 */
router.post('/milestone/check', authenticate, seasonController.checkMilestoneProgress);

export default router;
