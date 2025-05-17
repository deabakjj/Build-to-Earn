import { Router } from 'express';
import guildController from '../controllers/guildController';
import { authenticate } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { guildValidationSchemas } from '../validators/guildValidator';

const router = Router();

/**
 * @route   GET /api/guild/list
 * @desc    길드 목록 조회
 * @access  Public
 */
router.get('/list', guildController.getGuildList);

/**
 * @route   GET /api/guild/:guildId
 * @desc    길드 상세 정보
 * @access  Public
 */
router.get('/:guildId', guildController.getGuildDetails);

/**
 * @route   POST /api/guild/create
 * @desc    길드 생성
 * @access  Private
 */
router.post(
  '/create',
  authenticate,
  validateRequest(guildValidationSchemas.createGuild),
  guildController.createGuild
);

/**
 * @route   PUT /api/guild/:guildId
 * @desc    길드 정보 수정
 * @access  Private
 */
router.put(
  '/:guildId',
  authenticate,
  validateRequest(guildValidationSchemas.updateGuild),
  guildController.updateGuild
);

/**
 * @route   DELETE /api/guild/:guildId
 * @desc    길드 해체
 * @access  Private
 */
router.delete('/:guildId', authenticate, guildController.deleteGuild);

/**
 * @route   POST /api/guild/join
 * @desc    길드 가입 신청
 * @access  Private
 */
router.post(
  '/join',
  authenticate,
  validateRequest(guildValidationSchemas.joinGuild),
  guildController.applyToJoinGuild
);

/**
 * @route   POST /api/guild/invite
 * @desc    길드 초대
 * @access  Private
 */
router.post(
  '/invite',
  authenticate,
  validateRequest(guildValidationSchemas.inviteToGuild),
  guildController.inviteToGuild
);

/**
 * @route   POST /api/guild/application/approve
 * @desc    가입 신청 승인
 * @access  Private
 */
router.post(
  '/application/approve',
  authenticate,
  validateRequest(guildValidationSchemas.approveApplication),
  guildController.approveApplication
);

/**
 * @route   POST /api/guild/application/reject
 * @desc    가입 신청 거절
 * @access  Private
 */
router.post(
  '/application/reject',
  authenticate,
  validateRequest(guildValidationSchemas.rejectApplication),
  guildController.rejectApplication
);

/**
 * @route   POST /api/guild/invite/accept
 * @desc    길드 초대 수락
 * @access  Private
 */
router.post(
  '/invite/accept',
  authenticate,
  validateRequest(guildValidationSchemas.acceptInvite),
  guildController.acceptInvite
);

/**
 * @route   POST /api/guild/invite/decline
 * @desc    길드 초대 거절
 * @access  Private
 */
router.post(
  '/invite/decline',
  authenticate,
  validateRequest(guildValidationSchemas.declineInvite),
  guildController.declineInvite
);

/**
 * @route   POST /api/guild/leave
 * @desc    길드 탈퇴
 * @access  Private
 */
router.post(
  '/leave',
  authenticate,
  validateRequest(guildValidationSchemas.leaveGuild),
  guildController.leaveGuild
);

/**
 * @route   POST /api/guild/kick
 * @desc    멤버 추방
 * @access  Private
 */
router.post(
  '/kick',
  authenticate,
  validateRequest(guildValidationSchemas.kickMember),
  guildController.kickMember
);

/**
 * @route   GET /api/guild/:guildId/members
 * @desc    길드 멤버 목록
 * @access  Private
 */
router.get('/:guildId/members', authenticate, guildController.getGuildMembers);

/**
 * @route   POST /api/guild/role/assign
 * @desc    역할 부여
 * @access  Private
 */
router.post(
  '/role/assign',
  authenticate,
  validateRequest(guildValidationSchemas.assignRole),
  guildController.assignRole
);

/**
 * @route   POST /api/guild/role/remove
 * @desc    역할 제거
 * @access  Private
 */
router.post(
  '/role/remove',
  authenticate,
  validateRequest(guildValidationSchemas.removeRole),
  guildController.removeRole
);

/**
 * @route   GET /api/guild/:guildId/projects
 * @desc    길드 프로젝트 목록
 * @access  Public
 */
router.get('/:guildId/projects', guildController.getGuildProjects);

/**
 * @route   POST /api/guild/project/create
 * @desc    프로젝트 생성
 * @access  Private
 */
router.post(
  '/project/create',
  authenticate,
  validateRequest(guildValidationSchemas.createProject),
  guildController.createProject
);

/**
 * @route   PUT /api/guild/project/:projectId
 * @desc    프로젝트 수정
 * @access  Private
 */
router.put(
  '/project/:projectId',
  authenticate,
  validateRequest(guildValidationSchemas.updateProject),
  guildController.updateProject
);

/**
 * @route   POST /api/guild/project/contribute
 * @desc    프로젝트 기여
 * @access  Private
 */
router.post(
  '/project/contribute',
  authenticate,
  validateRequest(guildValidationSchemas.contributeToProject),
  guildController.contributeToProject
);

/**
 * @route   POST /api/guild/project/complete
 * @desc    프로젝트 완료
 * @access  Private
 */
router.post(
  '/project/complete',
  authenticate,
  validateRequest(guildValidationSchemas.completeProject),
  guildController.completeProject
);

/**
 * @route   GET /api/guild/:guildId/events
 * @desc    길드 이벤트 목록
 * @access  Public
 */
router.get('/:guildId/events', guildController.getGuildEvents);

/**
 * @route   POST /api/guild/event/create
 * @desc    이벤트 생성
 * @access  Private
 */
router.post(
  '/event/create',
  authenticate,
  validateRequest(guildValidationSchemas.createEvent),
  guildController.createEvent
);

/**
 * @route   POST /api/guild/event/join
 * @desc    이벤트 참가
 * @access  Private
 */
router.post(
  '/event/join',
  authenticate,
  validateRequest(guildValidationSchemas.joinEvent),
  guildController.joinEvent
);

/**
 * @route   GET /api/guild/:guildId/treasury
 * @desc    길드 금고 현황
 * @access  Private
 */
router.get('/:guildId/treasury', authenticate, guildController.getGuildTreasury);

/**
 * @route   POST /api/guild/treasury/donate
 * @desc    길드 기부
 * @access  Private
 */
router.post(
  '/treasury/donate',
  authenticate,
  validateRequest(guildValidationSchemas.donateToTreasury),
  guildController.donateToTreasury
);

/**
 * @route   POST /api/guild/treasury/distribute
 * @desc    보상 분배
 * @access  Private
 */
router.post(
  '/treasury/distribute',
  authenticate,
  validateRequest(guildValidationSchemas.distributeTreasuryRewards),
  guildController.distributeTreasuryRewards
);

/**
 * @route   GET /api/guild/:guildId/achievements
 * @desc    길드 업적
 * @access  Public
 */
router.get('/:guildId/achievements', guildController.getGuildAchievements);

/**
 * @route   GET /api/guild/:guildId/stats
 * @desc    길드 통계
 * @access  Public
 */
router.get('/:guildId/stats', guildController.getGuildStats);

/**
 * @route   GET /api/guild/rankings
 * @desc    길드 랭킹
 * @access  Public
 */
router.get('/rankings', guildController.getGuildRankings);

/**
 * @route   GET /api/guild/search
 * @desc    길드 검색
 * @access  Public
 */
router.get('/search', guildController.searchGuilds);

/**
 * @route   POST /api/guild/alliance/propose
 * @desc    동맹 제안
 * @access  Private
 */
router.post(
  '/alliance/propose',
  authenticate,
  validateRequest(guildValidationSchemas.proposeAlliance),
  guildController.proposeAlliance
);

/**
 * @route   POST /api/guild/alliance/respond
 * @desc    동맹 제안 응답
 * @access  Private
 */
router.post(
  '/alliance/respond',
  authenticate,
  validateRequest(guildValidationSchemas.respondToAlliance),
  guildController.respondToAlliance
);

/**
 * @route   GET /api/guild/:guildId/alliances
 * @desc    길드 동맹 목록
 * @access  Public
 */
router.get('/:guildId/alliances', guildController.getGuildAlliances);

/**
 * @route   POST /api/guild/war/declare
 * @desc    길드전 선포
 * @access  Private
 */
router.post(
  '/war/declare',
  authenticate,
  validateRequest(guildValidationSchemas.declareWar),
  guildController.declareWar
);

/**
 * @route   POST /api/guild/war/respond
 * @desc    길드전 응답
 * @access  Private
 */
router.post(
  '/war/respond',
  authenticate,
  validateRequest(guildValidationSchemas.respondToWar),
  guildController.respondToWar
);

/**
 * @route   GET /api/guild/wars/active
 * @desc    진행 중인 길드전
 * @access  Public
 */
router.get('/wars/active', guildController.getActiveGuildWars);

/**
 * @route   GET /api/guild/:guildId/history
 * @desc    길드 활동 기록
 * @access  Public
 */
router.get('/:guildId/history', guildController.getGuildHistory);

/**
 * @route   POST /api/guild/message/send
 * @desc    길드 메시지 전송
 * @access  Private
 */
router.post(
  '/message/send',
  authenticate,
  validateRequest(guildValidationSchemas.sendGuildMessage),
  guildController.sendGuildMessage
);

/**
 * @route   GET /api/guild/:guildId/messages
 * @desc    길드 메시지 목록
 * @access  Private
 */
router.get('/:guildId/messages', authenticate, guildController.getGuildMessages);

/**
 * @route   POST /api/guild/notice/create
 * @desc    길드 공지 작성
 * @access  Private
 */
router.post(
  '/notice/create',
  authenticate,
  validateRequest(guildValidationSchemas.createNotice),
  guildController.createNotice
);

/**
 * @route   GET /api/guild/:guildId/notices
 * @desc    길드 공지 목록
 * @access  Private
 */
router.get('/:guildId/notices', authenticate, guildController.getGuildNotices);

/**
 * @route   POST /api/guild/schedule/create
 * @desc    길드 일정 생성
 * @access  Private
 */
router.post(
  '/schedule/create',
  authenticate,
  validateRequest(guildValidationSchemas.createSchedule),
  guildController.createSchedule
);

/**
 * @route   GET /api/guild/:guildId/schedule
 * @desc    길드 일정 조회
 * @access  Private
 */
router.get('/:guildId/schedule', authenticate, guildController.getGuildSchedule);

/**
 * @route   POST /api/guild/upgrade
 * @desc    길드 업그레이드
 * @access  Private
 */
router.post(
  '/upgrade',
  authenticate,
  validateRequest(guildValidationSchemas.upgradeGuild),
  guildController.upgradeGuild
);

/**
 * @route   GET /api/guild/:guildId/benefits
 * @desc    길드 혜택 조회
 * @access  Public
 */
router.get('/:guildId/benefits', guildController.getGuildBenefits);

export default router;
