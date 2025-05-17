/**
 * NFT 관련 타입 정의
 */

// 기본 NFT 인터페이스
export interface BaseNFT {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  creator: string;
  owner: string;
  price?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  createdAt: Date;
  updatedAt: Date;
  isNFT: boolean;
  mintedAt?: Date;
}

// 아이템 NFT 타입
export interface ItemNFT extends BaseNFT {
  type: 'item';
  properties: {
    itemType: 'tool' | 'weapon' | 'decoration' | 'material';
    durability: number;
    maxDurability: number;
    level: number;
    enchantments?: string[];
    materials: string[];
  };
}

// 건물 NFT 타입
export interface BuildingNFT extends BaseNFT {
  type: 'building';
  properties: {
    buildingType: 'house' | 'shop' | 'factory' | 'entertainment' | 'defense';
    size: {
      width: number;
      height: number;
      depth: number;
    };
    capacity: number;
    functionality: string[];
    level: number;
    interactable: boolean;
    rentalPrice?: string;
    isRented?: boolean;
  };
}

// 탈것 NFT 타입
export interface VehicleNFT extends BaseNFT {
  type: 'vehicle';
  properties: {
    vehicleType: 'car' | 'boat' | 'plane' | 'bike';
    speed: number;
    acceleration: number;
    handling: number;
    durability: number;
    maxDurability: number;
    fuel: number;
    maxFuel: number;
    fuelType: string;
    capacity: number;
    color: string;
    customizations?: {
      paint?: string;
      wheels?: string;
      exhaust?: string;
      spoiler?: string;
    };
  };
  parts?: VehiclePart[];
}

// 랜드 NFT 타입
export interface LandNFT extends BaseNFT {
  type: 'land';
  properties: {
    size: {
      width: number;
      height: number;
    };
    coordinates: {
      x: number;
      y: number;
    };
    terrainType: string;
    resourceNodes: string[];
    buildings: string[];
    permissions: {
      isPublic: boolean;
      allowedUsers: string[];
    };
    taxRate?: number;
  };
}

// 탈것 부품 타입
export interface VehiclePart {
  id: string;
  name: string;
  description: string;
  partType: 'engine' | 'armor' | 'tank' | 'cargo' | 'weapon' | 'utility';
  stats: {
    speed?: number;
    acceleration?: number;
    handling?: number;
    durability?: number;
    armor?: number;
    capacity?: number;
  };
  requirements: {
    level?: number;
    vehicleType?: string[];
  };
  isInstalled: boolean;
}

// 시즌 NFT 타입
export interface SeasonalNFT extends BaseNFT {
  type: 'seasonal';
  properties: {
    season: string;
    seasonNumber: number;
    isLimited: boolean;
    expiresAt?: Date;
    specialEffects?: string[];
  };
}

// 길드 NFT 타입
export interface GuildNFT extends BaseNFT {
  type: 'guild';
  properties: {
    guildId: string;
    role: 'emblem' | 'flag' | 'uniform' | 'building';
    level: number;
    members: number;
    maxMembers: number;
    guildPrivileges: string[];
  };
}

// NFT 거래 정보
export interface NFTListing {
  listingId: string;
  nft: BaseNFT;
  seller: string;
  price: string;
  currency: 'VXC' | 'PTX';
  listingType: 'fixed' | 'auction' | 'rental';
  startTime: Date;
  endTime?: Date;
  highestBid?: {
    bidder: string;
    amount: string;
    timestamp: Date;
  };
  isActive: boolean;
}

// NFT 경매 정보
export interface NFTAuction {
  auctionId: string;
  nft: BaseNFT;
  seller: string;
  startPrice: string;
  buyNowPrice?: string;
  currentPrice: string;
  highestBidder?: string;
  bids: {
    bidder: string;
    amount: string;
    timestamp: Date;
  }[];
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  isSettled: boolean;
}

// NFT 임대 정보
export interface NFTRental {
  rentalId: string;
  nft: BuildingNFT | VehicleNFT;
  owner: string;
  tenant: string;
  pricePerDay: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  deposit: string;
  isActive: boolean;
  terms: string[];
}

// NFT 메타데이터
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  animation_url?: string;
  attributes: {
    trait_type: string;
    value: string | number;
    display_type?: 'string' | 'number' | 'boost_percentage' | 'boost_number' | 'date';
  }[];
  properties: Record<string, any>;
}

// NFT 컬렉션 정보
export interface NFTCollection {
  collectionId: string;
  name: string;
  description: string;
  symbol: string;
  contractAddress: string;
  creator: string;
  totalSupply: number;
  floorPrice: string;
  volume24h: string;
  items: BaseNFT[];
  verified: boolean;
  featured: boolean;
}

// NFT 통계
export interface NFTStats {
  totalItems: number;
  totalVolume: string;
  averagePrice: string;
  priceChange24h: number;
  topItems: BaseNFT[];
  recentSales: {
    nft: BaseNFT;
    price: string;
    buyer: string;
    seller: string;
    timestamp: Date;
  }[];
}

// 전체 NFT 타입
export type NFT = ItemNFT | BuildingNFT | VehicleNFT | LandNFT | SeasonalNFT | GuildNFT;

// NFT 필터 옵션
export interface NFTFilter {
  type?: NFT['type'][];
  rarity?: NFT['rarity'][];
  priceRange?: {
    min: string;
    max: string;
  };
  creator?: string;
  owner?: string;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'oldest' | 'rarity' | 'popular';
  isAuction?: boolean;
  isRental?: boolean;
}
