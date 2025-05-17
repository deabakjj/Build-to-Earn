import { Router } from 'express';
import userController from '../controllers/userController';
import { authenticate } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { userValidationSchemas } from '../validators/userValidator';

const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    내 프로필 조회
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    프로필 업데이트
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  validateRequest(userValidationSchemas.updateProfile),
  userController.updateProfile
);

/**
 * @route   GET /api/users/stats
 * @desc    유저 통계 조회
 * @access  Private
 */
router.get('/stats', authenticate, userController.getUserStats);

/**
 * @route   GET /api/users/inventory
 * @desc    인벤토리 조회
 * @access  Private
 */
router.get('/inventory', authenticate, userController.getInventory);

/**
 * @route   POST /api/users/inventory/use
 * @desc    아이템 사용
 * @access  Private
 */
router.post(
  '/inventory/use',
  authenticate,
  validateRequest(userValidationSchemas.useItem),
  userController.useItem
);

/**
 * @route   POST /api/users/inventory/transfer
 * @desc    아이템 전송
 * @access  Private
 */
router.post(
  '/inventory/transfer',
  authenticate,
  validateRequest(userValidationSchemas.transferItem),
  userController.transferItem
);

/**
 * @route   GET /api/users/friends
 * @desc    친구 목록 조회
 * @access  Private
 */
router.get('/friends', authenticate, userController.getFriendList);

/**
 * @route   POST /api/users/friends/request
 * @desc    친구 요청 보내기
 * @access  Private
 */
router.post(
  '/friends/request',
  authenticate,
  validateRequest(userValidationSchemas.sendFriendRequest),
  userController.sendFriendRequest
);

/**
 * @route   POST /api/users/friends/accept
 * @desc    친구 요청 수락
 * @access  Private
 */
router.post(
  '/friends/accept',
  authenticate,
  validateRequest(userValidationSchemas.acceptFriendRequest),
  userController.acceptFriendRequest
);

/**
 * @route   POST /api/users/friends/reject
 * @desc    친구 요청 거절
 * @access  Private
 */
router.post(
  '/friends/reject',
  authenticate,
  validateRequest(userValidationSchemas.rejectFriendRequest),
  userController.rejectFriendRequest
);

/**
 * @route   DELETE /api/users/friends/:friendId
 * @desc    친구 삭제
 * @access  Private
 */
router.delete('/friends/:friendId', authenticate, userController.removeFriend);

/**
 * @route   GET /api/users/friends/requests
 * @desc    친구 요청 목록 조회
 * @access  Private
 */
router.get('/friends/requests', authenticate, userController.getFriendRequests);

/**
 * @route   GET /api/users/blocks
 * @desc    차단 목록 조회
 * @access  Private
 */
router.get('/blocks', authenticate, userController.getBlockedUsers);

/**
 * @route   POST /api/users/block
 * @desc    사용자 차단
 * @access  Private
 */
router.post(
  '/block',
  authenticate,
  validateRequest(userValidationSchemas.blockUser),
  userController.blockUser
);

/**
 * @route   POST /api/users/unblock
 * @desc    사용자 차단 해제
 * @access  Private
 */
router.post(
  '/unblock',
  authenticate,
  validateRequest(userValidationSchemas.unblockUser),
  userController.unblockUser
);

/**
 * @route   GET /api/users/notifications
 * @desc    알림 목록 조회
 * @access  Private
 */
router.get('/notifications', authenticate, userController.getNotifications);

/**
 * @route   PUT /api/users/notifications/:notificationId/read
 * @desc    알림 읽음 처리
 * @access  Private
 */
router.put('/notifications/:notificationId/read', authenticate, userController.markNotificationAsRead);

/**
 * @route   PUT /api/users/notifications/read-all
 * @desc    모든 알림 읽음 처리
 * @access  Private
 */
router.put('/notifications/read-all', authenticate, userController.markAllNotificationsAsRead);

/**
 * @route   DELETE /api/users/notifications/:notificationId
 * @desc    알림 삭제
 * @access  Private
 */
router.delete('/notifications/:notificationId', authenticate, userController.deleteNotification);

/**
 * @route   GET /api/users/settings
 * @desc    사용자 설정 조회
 * @access  Private
 */
router.get('/settings', authenticate, userController.getSettings);

/**
 * @route   PUT /api/users/settings
 * @desc    사용자 설정 업데이트
 * @access  Private
 */
router.put(
  '/settings',
  authenticate,
  validateRequest(userValidationSchemas.updateSettings),
  userController.updateSettings
);

/**
 * @route   GET /api/users/rewards
 * @desc    보상 목록 조회
 * @access  Private
 */
router.get('/rewards', authenticate, userController.getRewards);

/**
 * @route   POST /api/users/rewards/claim
 * @desc    보상 수령
 * @access  Private
 */
router.post(
  '/rewards/claim',
  authenticate,
  validateRequest(userValidationSchemas.claimReward),
  userController.claimReward
);

/**
 * @route   GET /api/users/activity
 * @desc    활동 기록 조회
 * @access  Private
 */
router.get('/activity', authenticate, userController.getActivityHistory);

/**
 * @route   GET /api/users/achievements
 * @desc    업적 목록 조회
 * @access  Private
 */
router.get('/achievements', authenticate, userController.getAchievements);

/**
 * @route   POST /api/users/preferences
 * @desc    사용자 선호도 업데이트
 * @access  Private
 */
router.post(
  '/preferences',
  authenticate,
  validateRequest(userValidationSchemas.updatePreferences),
  userController.updatePreferences
);

/**
 * @route   GET /api/users/wallet
 * @desc    지갑 정보 조회
 * @access  Private
 */
router.get('/wallet', authenticate, userController.getWalletInfo);

/**
 * @route   POST /api/users/wallet/connect
 * @desc    지갑 연결
 * @access  Private
 */
router.post(
  '/wallet/connect',
  authenticate,
  validateRequest(userValidationSchemas.connectWallet),
  userController.connectWallet
);

/**
 * @route   POST /api/users/wallet/disconnect
 * @desc    지갑 연결 해제
 * @access  Private
 */
router.post('/wallet/disconnect', authenticate, userController.disconnectWallet);

/**
 * @route   GET /api/users/search
 * @desc    사용자 검색
 * @access  Private
 */
router.get('/search', authenticate, userController.searchUsers);

/**
 * @route   GET /api/users/:userId
 * @desc    특정 사용자 프로필 조회
 * @access  Private
 */
router.get('/:userId', authenticate, userController.getUserProfile);

/**
 * @route   POST /api/users/report
 * @desc    사용자 신고
 * @access  Private
 */
router.post(
  '/report',
  authenticate,
  validateRequest(userValidationSchemas.reportUser),
  userController.reportUser
);

/**
 * @route   DELETE /api/users/account
 * @desc    계정 삭제
 * @access  Private
 */
router.delete(
  '/account',
  authenticate,
  validateRequest(userValidationSchemas.deleteAccount),
  userController.deleteAccount
);

/**
 * @route   POST /api/users/export-data
 * @desc    사용자 데이터 내보내기
 * @access  Private
 */
router.post('/export-data', authenticate, userController.exportUserData);

export default router;
