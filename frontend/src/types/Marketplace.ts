import { NFT } from './NFT';

// 판매 타입 열거형
export enum SaleType {
  FIXED_PRICE = 'FIXED_PRICE',
  AUCTION = 'AUCTION',
  RENTAL = 'RENTAL',
  BUNDLE = 'BUNDLE'
}

// 거래 상태 열거형
export enum TransactionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

// 경매 상태 열거형
export enum AuctionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  SETTLED = 'SETTLED'
}

// 기본 마켓 아이템 인터페이스
export interface MarketItem {
  id: string;
  nft: NFT;
  sellerId: string;
  sellerWallet: string;
  sellerName: string;
  saleType: SaleType;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

// 고정가 판매 인터페이스
export interface FixedPriceSale extends MarketItem {
  saleType: SaleType.FIXED_PRICE;
  price: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
  maxQuantity?: number;
  soldQuantity?: number;
}

// 경매 입찰 인터페이스
export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderWallet: string;
  bidderName: string;
  amount: number;
  currency: 'VXC' | 'PTX' | 'ETH';
  timestamp: Date;
  txHash?: string;
}

// 경매 아이템 인터페이스
export interface AuctionItem extends MarketItem {
  saleType: SaleType.AUCTION;
  auctionId: string;
  auctionStatus: AuctionStatus;
  startPrice: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
  buyoutPrice?: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
  currentBid?: Bid;
  minBidIncrement: number;
  startTime: Date;
  endTime: Date;
  bids: Bid[];
  winningBid?: Bid;
}

// 임대 옵션 인터페이스
export interface RentalOption {
  duration: number; // milliseconds
  durationLabel: string; // "1 day", "1 week", "1 month"
  price: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
}

// 임대 계약 인터페이스
export interface RentalContract extends MarketItem {
  saleType: SaleType.RENTAL;
  rentalOptions: RentalOption[];
  currentRenter?: {
    id: string;
    wallet: string;
    name: string;
    startTime: Date;
    endTime: Date;
    deposit: {
      amount: number;
      currency: 'VXC' | 'PTX' | 'ETH';
    };
  };
  autoRenewal?: boolean;
  maxRentalDuration?: number;
  revenueShare?: {
    ownerPercentage: number;
    renterPercentage: number;
  };
}

// 번들 아이템 인터페이스
export interface BundleItem {
  nft: NFT;
  quantity: number;
}

// 번들 판매 인터페이스
export interface BundleSale extends MarketItem {
  saleType: SaleType.BUNDLE;
  items: BundleItem[];
  bundlePrice: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
  originalTotalPrice: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
  discountPercentage: number;
  maxBundles?: number;
  soldBundles?: number;
}

// 검색 필터 인터페이스
export interface MarketplaceFilter {
  saleType?: SaleType[];
  category?: string[];
  rarity?: string[];
  priceRange?: {
    min: number;
    max: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
  status?: TransactionStatus[];
  sortBy?: 'price' | 'createdAt' | 'endTime' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  searchQuery?: string;
  onlyVerified?: boolean;
  onlyFeatured?: boolean;
}

// 마켓플레이스 통계 인터페이스
export interface MarketplaceStats {
  totalVolume: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
  totalTransactions: number;
  activeListings: number;
  averagePrice: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
  topSellers: Array<{
    id: string;
    wallet: string;
    name: string;
    volume: {
      amount: number;
      currency: 'VXC' | 'PTX' | 'ETH';
    };
    transactions: number;
  }>;
  trending: MarketItem[];
}

// 트랜잭션 히스토리 인터페이스
export interface TransactionHistory {
  id: string;
  itemId: string;
  buyerId: string;
  buyerWallet: string;
  sellerId: string;
  sellerWallet: string;
  transactionType: 'PURCHASE' | 'BID' | 'RENTAL' | 'BUNDLE_PURCHASE';
  price: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
  quantity?: number;
  timestamp: Date;
  txHash: string;
  gasUsed?: number;
  gasPrice?: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
}

// 에스크로 상태 인터페이스
export interface EscrowState {
  transactionId: string;
  buyerDeposit: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
  status: 'CREATED' | 'FUNDED' | 'DISPUTED' | 'RELEASED' | 'REFUNDED';
  deadline: Date;
  arbitrator?: string;
  dispute?: {
    reason: string;
    evidence: string[];
    resolution?: 'REFUND' | 'RELEASE';
    timestamp: Date;
  };
}

// 리뷰/평점 인터페이스
export interface MarketplaceReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  revieweeName: string;
  transactionId: string;
  rating: number; // 1-5
  comment: string;
  timestamp: Date;
  helpful?: number;
  reported?: boolean;
}

// 마켓플레이스 이벤트 인터페이스
export interface MarketplaceEvent {
  id: string;
  type: 'LISTING_CREATED' | 'PURCHASE' | 'BID_PLACED' | 'AUCTION_ENDED' | 'RENTAL_STARTED' | 'RENTAL_ENDED';
  itemId: string;
  userId: string;
  data: any;
  timestamp: Date;
  txHash?: string;
}

// 마켓플레이스 설정 인터페이스
export interface MarketplaceSettings {
  defaultCurrency: 'VXC' | 'PTX' | 'ETH';
  transactionFee: number; // percentage
  listingFee: {
    amount: number;
    currency: 'VXC' | 'PTX' | 'ETH';
  };
  maxAuctionDuration: number; // milliseconds
  minBidIncrement: number; // percentage
  escrowTimeout: number; // milliseconds
  autoListingExpiry: number; // milliseconds
  verifiedSellerRoyalty: number; // percentage
  creatorRoyalty: number; // percentage
  offchainResolution: boolean;
  disputes: {
    feePercentage: number;
    timeLimit: number;
  };
}

// 사용량 한도 인터페이스
export interface UsageLimit {
  userId: string;
  listingsPerDay: number;
  bidPerDay: number;
  transactionVolume: {
    daily: {
      amount: number;
      currency: 'VXC' | 'PTX' | 'ETH';
    };
    monthly: {
      amount: number;
      currency: 'VXC' | 'PTX' | 'ETH';
    };
  };
  lastReset: Date;
}

export type MarketItemUnion = FixedPriceSale | AuctionItem | RentalContract | BundleSale;
