import { Router } from 'express';
import nftController from '../controllers/nftController';
import { authenticate } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { nftValidationSchemas } from '../validators/nftValidator';

const router = Router();

/**
 * @route   POST /api/nft/mint
 * @desc    NFT 민팅
 * @access  Private
 */
router.post(
  '/mint',
  authenticate,
  validateRequest(nftValidationSchemas.mintNFT),
  nftController.mintNFT
);

/**
 * @route   GET /api/nft/:tokenId
 * @desc    NFT 정보 조회
 * @access  Public
 */
router.get('/:tokenId', nftController.getNFTInfo);

/**
 * @route   GET /api/nft/user/inventory
 * @desc    사용자의 NFT 목록 조회
 * @access  Private
 */
router.get('/user/inventory', authenticate, nftController.getUserNFTs);

/**
 * @route   POST /api/nft/upgrade
 * @desc    NFT 업그레이드
 * @access  Private
 */
router.post(
  '/upgrade',
  authenticate,
  validateRequest(nftValidationSchemas.upgradeNFT),
  nftController.upgradeNFT
);

/**
 * @route   POST /api/nft/combine
 * @desc    NFT 조합
 * @access  Private
 */
router.post(
  '/combine',
  authenticate,
  validateRequest(nftValidationSchemas.combineNFTs),
  nftController.combineNFTs
);

/**
 * @route   PUT /api/nft/:tokenId/metadata
 * @desc    NFT 메타데이터 업데이트
 * @access  Private
 */
router.put(
  '/:tokenId/metadata',
  authenticate,
  validateRequest(nftValidationSchemas.updateMetadata),
  nftController.updateNFTMetadata
);

/**
 * @route   POST /api/nft/list
 * @desc    NFT 판매 등록
 * @access  Private
 */
router.post(
  '/list',
  authenticate,
  validateRequest(nftValidationSchemas.listForSale),
  nftController.listNFTForSale
);

/**
 * @route   POST /api/nft/buy
 * @desc    NFT 구매
 * @access  Private
 */
router.post(
  '/buy',
  authenticate,
  validateRequest(nftValidationSchemas.buyNFT),
  nftController.buyNFT
);

/**
 * @route   POST /api/nft/bid
 * @desc    NFT 경매 입찰
 * @access  Private
 */
router.post(
  '/bid',
  authenticate,
  validateRequest(nftValidationSchemas.placeBid),
  nftController.placeBid
);

/**
 * @route   POST /api/nft/rent
 * @desc    NFT 임대 등록
 * @access  Private
 */
router.post(
  '/rent',
  authenticate,
  validateRequest(nftValidationSchemas.rentNFT),
  nftController.rentNFT
);

/**
 * @route   POST /api/nft/rent/accept
 * @desc    NFT 임대 계약
 * @access  Private
 */
router.post(
  '/rent/accept',
  authenticate,
  validateRequest(nftValidationSchemas.acceptRental),
  nftController.acceptRental
);

/**
 * @route   GET /api/nft/:tokenId/history
 * @desc    NFT 거래 기록 조회
 * @access  Public
 */
router.get('/:tokenId/history', nftController.getTransactionHistory);

/**
 * @route   POST /api/nft/burn
 * @desc    NFT 소각
 * @access  Private
 */
router.post(
  '/burn',
  authenticate,
  validateRequest(nftValidationSchemas.burnNFT),
  nftController.burnNFT
);

/**
 * @route   GET /api/nft/:tokenId/price-history
 * @desc    NFT 가격 히스토리
 * @access  Public
 */
router.get('/:tokenId/price-history', nftController.getPriceHistory);

/**
 * @route   GET /api/nft/collection/:collectionId/stats
 * @desc    NFT 컬렉션 통계
 * @access  Public
 */
router.get('/collection/:collectionId/stats', nftController.getCollectionStats);

/**
 * @route   GET /api/nft/trending
 * @desc    인기 NFT 순위
 * @access  Public
 */
router.get('/trending', nftController.getTrendingNFTs);

/**
 * @route   GET /api/nft/:tokenId/verify
 * @desc    NFT 검증
 * @access  Public
 */
router.get('/:tokenId/verify', nftController.verifyNFT);

/**
 * @route   POST /api/nft/vault/move
 * @desc    NFT 보관함 이동
 * @access  Private
 */
router.post(
  '/vault/move',
  authenticate,
  validateRequest(nftValidationSchemas.moveToVault),
  nftController.moveToVault
);

/**
 * @route   GET /api/nft/search
 * @desc    NFT 검색
 * @access  Public
 */
router.get('/search', nftController.searchNFTs);

/**
 * @route   GET /api/nft/categories
 * @desc    NFT 카테고리 목록
 * @access  Public
 */
router.get('/categories', nftController.getNFTCategories);

/**
 * @route   GET /api/nft/collections
 * @desc    NFT 컬렉션 목록
 * @access  Public
 */
router.get('/collections', nftController.getCollections);

/**
 * @route   POST /api/nft/collection/create
 * @desc    새로운 컬렉션 생성
 * @access  Private
 */
router.post(
  '/collection/create',
  authenticate,
  validateRequest(nftValidationSchemas.createCollection),
  nftController.createCollection
);

/**
 * @route   PUT /api/nft/collection/:collectionId
 * @desc    컬렉션 정보 업데이트
 * @access  Private
 */
router.put(
  '/collection/:collectionId',
  authenticate,
  validateRequest(nftValidationSchemas.updateCollection),
  nftController.updateCollection
);

/**
 * @route   GET /api/nft/marketplace/listings
 * @desc    마켓플레이스 리스팅 목록
 * @access  Public
 */
router.get('/marketplace/listings', nftController.getMarketplaceListings);

/**
 * @route   GET /api/nft/marketplace/auctions
 * @desc    진행 중인 경매 목록
 * @access  Public
 */
router.get('/marketplace/auctions', nftController.getActiveAuctions);

/**
 * @route   POST /api/nft/marketplace/offer
 * @desc    NFT 구매 제안
 * @access  Private
 */
router.post(
  '/marketplace/offer',
  authenticate,
  validateRequest(nftValidationSchemas.makeOffer),
  nftController.makeOffer
);

/**
 * @route   POST /api/nft/marketplace/offer/accept
 * @desc    구매 제안 수락
 * @access  Private
 */
router.post(
  '/marketplace/offer/accept',
  authenticate,
  validateRequest(nftValidationSchemas.acceptOffer),
  nftController.acceptOffer
);

/**
 * @route   GET /api/nft/analytics/daily
 * @desc    일일 NFT 거래 통계
 * @access  Public
 */
router.get('/analytics/daily', nftController.getDailyAnalytics);

/**
 * @route   GET /api/nft/analytics/weekly
 * @desc    주간 NFT 거래 통계
 * @access  Public
 */
router.get('/analytics/weekly', nftController.getWeeklyAnalytics);

/**
 * @route   GET /api/nft/analytics/monthly
 * @desc    월간 NFT 거래 통계
 * @access  Public
 */
router.get('/analytics/monthly', nftController.getMonthlyAnalytics);

/**
 * @route   POST /api/nft/favorite
 * @desc    NFT 즐겨찾기 추가
 * @access  Private
 */
router.post(
  '/favorite',
  authenticate,
  validateRequest(nftValidationSchemas.addFavorite),
  nftController.addToFavorites
);

/**
 * @route   DELETE /api/nft/favorite/:tokenId
 * @desc    NFT 즐겨찾기 제거
 * @access  Private
 */
router.delete('/favorite/:tokenId', authenticate, nftController.removeFromFavorites);

/**
 * @route   GET /api/nft/favorites
 * @desc    즐겨찾기 NFT 목록
 * @access  Private
 */
router.get('/favorites', authenticate, nftController.getFavoriteNFTs);

/**
 * @route   POST /api/nft/report
 * @desc    NFT 신고
 * @access  Private
 */
router.post(
  '/report',
  authenticate,
  validateRequest(nftValidationSchemas.reportNFT),
  nftController.reportNFT
);

export default router;
