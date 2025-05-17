import { Router } from 'express';
import marketplaceController from '../controllers/marketplaceController';
import { authenticate } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import { marketplaceValidationSchemas } from '../validators/marketplaceValidator';

const router = Router();

/**
 * @route   GET /api/marketplace/listings
 * @desc    마켓플레이스 상품 목록 조회
 * @access  Public
 */
router.get('/listings', marketplaceController.getListings);

/**
 * @route   GET /api/marketplace/listing/:listingId
 * @desc    특정 상품 상세 정보
 * @access  Public
 */
router.get('/listing/:listingId', marketplaceController.getListingDetails);

/**
 * @route   POST /api/marketplace/list
 * @desc    상품 판매 등록
 * @access  Private
 */
router.post(
  '/list',
  authenticate,
  validateRequest(marketplaceValidationSchemas.createListing),
  marketplaceController.createListing
);

/**
 * @route   PUT /api/marketplace/listing/:listingId
 * @desc    판매 정보 수정
 * @access  Private
 */
router.put(
  '/listing/:listingId',
  authenticate,
  validateRequest(marketplaceValidationSchemas.updateListing),
  marketplaceController.updateListing
);

/**
 * @route   DELETE /api/marketplace/listing/:listingId
 * @desc    판매 취소
 * @access  Private
 */
router.delete('/listing/:listingId', authenticate, marketplaceController.cancelListing);

/**
 * @route   POST /api/marketplace/buy
 * @desc    상품 구매
 * @access  Private
 */
router.post(
  '/buy',
  authenticate,
  validateRequest(marketplaceValidationSchemas.buyItem),
  marketplaceController.buyItem
);

/**
 * @route   POST /api/marketplace/offer
 * @desc    구매 제안
 * @access  Private
 */
router.post(
  '/offer',
  authenticate,
  validateRequest(marketplaceValidationSchemas.makeOffer),
  marketplaceController.makeOffer
);

/**
 * @route   GET /api/marketplace/offers
 * @desc    받은 제안 목록
 * @access  Private
 */
router.get('/offers', authenticate, marketplaceController.getOffers);

/**
 * @route   POST /api/marketplace/offer/accept
 * @desc    제안 수락
 * @access  Private
 */
router.post(
  '/offer/accept',
  authenticate,
  validateRequest(marketplaceValidationSchemas.acceptOffer),
  marketplaceController.acceptOffer
);

/**
 * @route   POST /api/marketplace/offer/reject
 * @desc    제안 거절
 * @access  Private
 */
router.post(
  '/offer/reject',
  authenticate,
  validateRequest(marketplaceValidationSchemas.rejectOffer),
  marketplaceController.rejectOffer
);

/**
 * @route   GET /api/marketplace/auctions
 * @desc    진행 중인 경매 목록
 * @access  Public
 */
router.get('/auctions', marketplaceController.getAuctions);

/**
 * @route   POST /api/marketplace/auction/create
 * @desc    경매 생성
 * @access  Private
 */
router.post(
  '/auction/create',
  authenticate,
  validateRequest(marketplaceValidationSchemas.createAuction),
  marketplaceController.createAuction
);

/**
 * @route   POST /api/marketplace/auction/bid
 * @desc    경매 입찰
 * @access  Private
 */
router.post(
  '/auction/bid',
  authenticate,
  validateRequest(marketplaceValidationSchemas.placeBid),
  marketplaceController.placeBid
);

/**
 * @route   GET /api/marketplace/auction/:auctionId/bids
 * @desc    경매 입찰 기록
 * @access  Public
 */
router.get('/auction/:auctionId/bids', marketplaceController.getAuctionBids);

/**
 * @route   POST /api/marketplace/auction/end
 * @desc    경매 종료
 * @access  Private
 */
router.post(
  '/auction/end',
  authenticate,
  validateRequest(marketplaceValidationSchemas.endAuction),
  marketplaceController.endAuction
);

/**
 * @route   GET /api/marketplace/bundles
 * @desc    번들 상품 목록
 * @access  Public
 */
router.get('/bundles', marketplaceController.getBundles);

/**
 * @route   POST /api/marketplace/bundle/create
 * @desc    번들 상품 생성
 * @access  Private
 */
router.post(
  '/bundle/create',
  authenticate,
  validateRequest(marketplaceValidationSchemas.createBundle),
  marketplaceController.createBundle
);

/**
 * @route   POST /api/marketplace/bundle/buy
 * @desc    번들 상품 구매
 * @access  Private
 */
router.post(
  '/bundle/buy',
  authenticate,
  validateRequest(marketplaceValidationSchemas.buyBundle),
  marketplaceController.buyBundle
);

/**
 * @route   GET /api/marketplace/rentals
 * @desc    임대 상품 목록
 * @access  Public
 */
router.get('/rentals', marketplaceController.getRentals);

/**
 * @route   POST /api/marketplace/rental/create
 * @desc    임대 상품 등록
 * @access  Private
 */
router.post(
  '/rental/create',
  authenticate,
  validateRequest(marketplaceValidationSchemas.createRental),
  marketplaceController.createRental
);

/**
 * @route   POST /api/marketplace/rental/apply
 * @desc    임대 신청
 * @access  Private
 */
router.post(
  '/rental/apply',
  authenticate,
  validateRequest(marketplaceValidationSchemas.applyForRental),
  marketplaceController.applyForRental
);

/**
 * @route   POST /api/marketplace/rental/accept
 * @desc    임대 신청 수락
 * @access  Private
 */
router.post(
  '/rental/accept',
  authenticate,
  validateRequest(marketplaceValidationSchemas.acceptRentalApplication),
  marketplaceController.acceptRentalApplication
);

/**
 * @route   POST /api/marketplace/rental/end
 * @desc    임대 종료
 * @access  Private
 */
router.post(
  '/rental/end',
  authenticate,
  validateRequest(marketplaceValidationSchemas.endRental),
  marketplaceController.endRental
);

/**
 * @route   GET /api/marketplace/collections
 * @desc    컬렉션 목록
 * @access  Public
 */
router.get('/collections', marketplaceController.getCollections);

/**
 * @route   GET /api/marketplace/collection/:collectionId
 * @desc    컬렉션 상세 정보
 * @access  Public
 */
router.get('/collection/:collectionId', marketplaceController.getCollectionDetails);

/**
 * @route   GET /api/marketplace/collection/:collectionId/items
 * @desc    컬렉션 아이템 목록
 * @access  Public
 */
router.get('/collection/:collectionId/items', marketplaceController.getCollectionItems);

/**
 * @route   POST /api/marketplace/collection/follow
 * @desc    컬렉션 팔로우
 * @access  Private
 */
router.post(
  '/collection/follow',
  authenticate,
  validateRequest(marketplaceValidationSchemas.followCollection),
  marketplaceController.followCollection
);

/**
 * @route   POST /api/marketplace/collection/unfollow
 * @desc    컬렉션 언팔로우
 * @access  Private
 */
router.post(
  '/collection/unfollow',
  authenticate,
  validateRequest(marketplaceValidationSchemas.unfollowCollection),
  marketplaceController.unfollowCollection
);

/**
 * @route   GET /api/marketplace/search
 * @desc    마켓플레이스 검색
 * @access  Public
 */
router.get('/search', marketplaceController.searchItems);

/**
 * @route   GET /api/marketplace/filters
 * @desc    검색 필터 옵션 목록
 * @access  Public
 */
router.get('/filters', marketplaceController.getFilterOptions);

/**
 * @route   GET /api/marketplace/categories
 * @desc    카테고리 목록
 * @access  Public
 */
router.get('/categories', marketplaceController.getCategories);

/**
 * @route   GET /api/marketplace/trending
 * @desc    인기 상품 목록
 * @access  Public
 */
router.get('/trending', marketplaceController.getTrendingItems);

/**
 * @route   GET /api/marketplace/featured
 * @desc    추천 상품 목록
 * @access  Public
 */
router.get('/featured', marketplaceController.getFeaturedItems);

/**
 * @route   GET /api/marketplace/recent
 * @desc    최근 등록 상품
 * @access  Public
 */
router.get('/recent', marketplaceController.getRecentListings);

/**
 * @route   GET /api/marketplace/analytics
 * @desc    마켓플레이스 통계
 * @access  Public
 */
router.get('/analytics', marketplaceController.getMarketplaceAnalytics);

/**
 * @route   GET /api/marketplace/user/sales
 * @desc    판매 내역 조회
 * @access  Private
 */
router.get('/user/sales', authenticate, marketplaceController.getSalesHistory);

/**
 * @route   GET /api/marketplace/user/purchases
 * @desc    구매 내역 조회
 * @access  Private
 */
router.get('/user/purchases', authenticate, marketplaceController.getPurchaseHistory);

/**
 * @route   GET /api/marketplace/user/offers
 * @desc    제안 내역 조회
 * @access  Private
 */
router.get('/user/offers', authenticate, marketplaceController.getOfferHistory);

/**
 * @route   GET /api/marketplace/user/watchlist
 * @desc    관심 목록 조회
 * @access  Private
 */
router.get('/user/watchlist', authenticate, marketplaceController.getWatchlist);

/**
 * @route   POST /api/marketplace/watchlist/add
 * @desc    관심 목록 추가
 * @access  Private
 */
router.post(
  '/watchlist/add',
  authenticate,
  validateRequest(marketplaceValidationSchemas.addToWatchlist),
  marketplaceController.addToWatchlist
);

/**
 * @route   DELETE /api/marketplace/watchlist/:itemId
 * @desc    관심 목록 제거
 * @access  Private
 */
router.delete('/watchlist/:itemId', authenticate, marketplaceController.removeFromWatchlist);

/**
 * @route   POST /api/marketplace/review
 * @desc    거래 후기 작성
 * @access  Private
 */
router.post(
  '/review',
  authenticate,
  validateRequest(marketplaceValidationSchemas.createReview),
  marketplaceController.createReview
);

/**
 * @route   GET /api/marketplace/user/:userId/reviews
 * @desc    사용자 후기 조회
 * @access  Public
 */
router.get('/user/:userId/reviews', marketplaceController.getUserReviews);

/**
 * @route   POST /api/marketplace/dispute
 * @desc    분쟁 신청
 * @access  Private
 */
router.post(
  '/dispute',
  authenticate,
  validateRequest(marketplaceValidationSchemas.createDispute),
  marketplaceController.createDispute
);

/**
 * @route   GET /api/marketplace/dispute/:disputeId
 * @desc    분쟁 상세 정보
 * @access  Private
 */
router.get('/dispute/:disputeId', authenticate, marketplaceController.getDisputeDetails);

/**
 * @route   POST /api/marketplace/dispute/resolve
 * @desc    분쟁 해결
 * @access  Private
 */
router.post(
  '/dispute/resolve',
  authenticate,
  validateRequest(marketplaceValidationSchemas.resolveDispute),
  marketplaceController.resolveDispute
);

export default router;
