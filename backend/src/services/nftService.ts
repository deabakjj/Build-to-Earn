import { NFT } from '../models/NFT';
import { User } from '../models/User';
import { MarketplaceListing } from '../models/MarketplaceListing';
import { ErrorCode, AppError } from '../common/errors';
import { BlockchainService } from './blockchainService';
import { IPFSService } from './ipfsService';
import { Redis } from '../utils/redis';

interface NFTMintData {
  type: 'item' | 'building' | 'vehicle' | 'land';
  metadata: {
    name: string;
    description: string;
    attributes: Record<string, any>;
    [key: string]: any;
  };
  attributes: Record<string, any>;
  itemData?: any;
}

interface NFTUpgradeData {
  tokenId: string;
  materials: Record<string, number>;
  upgradeLevel: number;
}

interface NFTCombineData {
  sourceTokenIds: string[];
  recipe: string;
}

interface ListForSaleData {
  tokenId: string;
  price: number;
  currency: 'VXC' | 'PTX' | 'ETH';
  saleType: 'fixed' | 'auction';
  auctionDuration?: number;
}

interface FilterOptions {
  type?: string;
  rarity?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

interface RentalData {
  tokenId: string;
  rentalPrice: number;
  duration: number;
  terms: string;
}

export class NFTService {
  /**
   * NFT 민팅
   */
  async mintNFT(userId: string, data: NFTMintData): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('사용자를 찾을 수 없습니다.', ErrorCode.USER_NOT_FOUND);
    }

    // 민팅 비용 계산
    const mintingCost = this.calculateMintingCost(data.type, data.attributes);
    
    // 사용자 잔액 확인
    const hasEnoughFunds = await BlockchainService.checkTokenBalance(userId, 'VXC', mintingCost.vxc);
    if (!hasEnoughFunds) {
      throw new AppError('민팅 비용이 부족합니다.', ErrorCode.INSUFFICIENT_FUNDS);
    }

    // 메타데이터 IPFS 업로드
    const ipfsHash = await IPFSService.uploadMetadata(data.metadata);
    const tokenURI = `ipfs://${ipfsHash}`;

    // 블록체인에 NFT 민팅
    const transactionResult = await BlockchainService.mintNFT({
      type: data.type,
      tokenURI,
      owner: userId,
      contractAddress: this.getContractAddress(data.type),
    });

    // 데이터베이스에 NFT 정보 저장
    const nft = await NFT.create({
      tokenId: transactionResult.tokenId,
      owner: userId,
      type: data.type,
      metadata: {
        ...data.metadata,
        tokenURI,
        ipfsHash,
      },
      attributes: data.attributes,
      minted: true,
      mintedAt: new Date(),
      transactionHash: transactionResult.hash,
    });

    // 사용자 NFT 인벤토리 업데이트
    await User.findByIdAndUpdate(userId, {
      $push: { 'inventory.nfts': nft._id },
    });

    return nft;
  }

  /**
   * 건물 NFT 민팅 (특수 케이스)
   */
  async mintBuildingNFT(userId: string, buildingData: any): Promise<any> {
    const metadata = {
      name: `${buildingData.buildingType} - Level 1`,
      description: `A ${buildingData.buildingType} built on land ${buildingData.landId}`,
      attributes: {
        buildingType: buildingData.buildingType,
        landId: buildingData.landId,
        position: buildingData.position,
        level: 1,
        capacity: this.getBuildingCapacity(buildingData.buildingType),
        durability: 100,
      },
      image: `https://assets.diy-crafting-world.com/buildings/${buildingData.buildingType}.png`,
    };

    return this.mintNFT(userId, {
      type: 'building',
      metadata,
      attributes: metadata.attributes,
    });
  }

  /**
   * NFT 정보 조회
   */
  async getNFTInfo(tokenId: string): Promise<any> {
    const nft = await NFT.findOne({ tokenId }).populate('owner', 'username profile.avatar');
    if (!nft) {
      throw new AppError('NFT를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 블록체인에서 실시간 정보 조회
    const blockchainData = await BlockchainService.getNFTInfo(tokenId, nft.type);

    // 가격 히스토리 조회
    const priceHistory = await this.getPriceHistory(tokenId, '7d');

    // 거래 기록 조회
    const recentTransactions = await this.getTransactionHistory(tokenId, { limit: 5 });

    return {
      ...nft.toObject(),
      blockchainData,
      priceHistory,
      recentTransactions,
    };
  }

  /**
   * 사용자의 NFT 목록 조회
   */
  async getUserNFTs(userId: string, options: FilterOptions = {}): Promise<any> {
    const {
      type,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
    } = options;

    const query: any = { owner: userId };
    
    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;
    const nfts = await NFT.find(query)
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'username profile.avatar');

    const total = await NFT.countDocuments(query);

    return {
      nfts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * NFT 업그레이드
   */
  async upgradeNFT(userId: string, data: NFTUpgradeData): Promise<any> {
    const nft = await NFT.findOne({ tokenId: data.tokenId });
    if (!nft) {
      throw new AppError('NFT를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 소유권 확인
    if (nft.owner.toString() !== userId) {
      throw new AppError('NFT 업그레이드 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    // 업그레이드 가능 여부 확인
    if (!this.canUpgrade(nft, data.upgradeLevel)) {
      throw new AppError('업그레이드 조건을 만족하지 않습니다.', ErrorCode.UPGRADE_NOT_AVAILABLE);
    }

    // 재료 확인
    const hasMaterials = await this.checkMaterials(userId, data.materials);
    if (!hasMaterials) {
      throw new AppError('업그레이드 재료가 부족합니다.', ErrorCode.INSUFFICIENT_MATERIALS);
    }

    // 재료 소모
    await this.consumeMaterials(userId, data.materials);

    // NFT 업그레이드
    const upgradedAttributes = this.calculateUpgradedAttributes(nft, data.upgradeLevel);
    
    // 메타데이터 업데이트
    nft.attributes = { ...nft.attributes, ...upgradedAttributes };
    nft.metadata.attributes = nft.attributes;
    nft.upgradedAt = new Date();
    
    // IPFS에 새 메타데이터 업로드
    const newIpfsHash = await IPFSService.uploadMetadata(nft.metadata);
    nft.metadata.ipfsHash = newIpfsHash;
    nft.metadata.tokenURI = `ipfs://${newIpfsHash}`;

    // 블록체인 업데이트
    await BlockchainService.updateTokenURI(data.tokenId, nft.metadata.tokenURI);

    await nft.save();

    return nft;
  }

  /**
   * NFT 조합
   */
  async combineNFTs(userId: string, data: NFTCombineData): Promise<any> {
    // 소스 NFT들 조회
    const sourceNFTs = await NFT.find({ tokenId: { $in: data.sourceTokenIds } });
    
    // 소유권 확인
    for (const nft of sourceNFTs) {
      if (nft.owner.toString() !== userId) {
        throw new AppError('모든 NFT를 소유하고 있지 않습니다.', ErrorCode.FORBIDDEN);
      }
    }

    // 조합 레시피 확인
    const recipe = await this.getRecipe(data.recipe);
    if (!recipe) {
      throw new AppError('유효하지 않은 레시피입니다.', ErrorCode.INVALID_RECIPE);
    }

    // 레시피 조건 확인
    if (!this.validateRecipe(sourceNFTs, recipe)) {
      throw new AppError('레시피 조건을 만족하지 않습니다.', ErrorCode.RECIPE_REQUIREMENTS_NOT_MET);
    }

    // 새로운 NFT 생성
    const newNFTData = this.createCombinedNFT(sourceNFTs, recipe);
    const newNFT = await this.mintNFT(userId, newNFTData);

    // 소스 NFT들 소각
    for (const nft of sourceNFTs) {
      await this.burnNFT(userId, nft.tokenId, 'Combined into new NFT');
    }

    return newNFT;
  }

  /**
   * NFT 메타데이터 업데이트
   */
  async updateNFTMetadata(userId: string, tokenId: string, metadata: any): Promise<any> {
    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      throw new AppError('NFT를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 소유권 확인
    if (nft.owner.toString() !== userId) {
      throw new AppError('NFT 수정 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    // 수정 가능한 필드만 업데이트
    const updatableFields = ['name', 'description', 'image'];
    const updates = {};
    
    for (const field of updatableFields) {
      if (metadata[field] !== undefined) {
        updates[field] = metadata[field];
      }
    }

    // 메타데이터 업데이트
    nft.metadata = { ...nft.metadata, ...updates };
    
    // IPFS에 새 메타데이터 업로드
    const newIpfsHash = await IPFSService.uploadMetadata(nft.metadata);
    nft.metadata.ipfsHash = newIpfsHash;
    nft.metadata.tokenURI = `ipfs://${newIpfsHash}`;

    // 블록체인 업데이트
    await BlockchainService.updateTokenURI(tokenId, nft.metadata.tokenURI);

    await nft.save();

    return nft;
  }

  /**
   * NFT 판매 등록
   */
  async listNFTForSale(userId: string, data: ListForSaleData): Promise<any> {
    const nft = await NFT.findOne({ tokenId: data.tokenId });
    if (!nft) {
      throw new AppError('NFT를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 소유권 확인
    if (nft.owner.toString() !== userId) {
      throw new AppError('NFT 판매 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    // 이미 판매 중인지 확인
    const existingListing = await MarketplaceListing.findOne({ 
      tokenId: data.tokenId, 
      status: 'active' 
    });
    
    if (existingListing) {
      throw new AppError('이미 판매 중인 NFT입니다.', ErrorCode.ALREADY_LISTED);
    }

    // 판매 등록
    const listing = await MarketplaceListing.create({
      tokenId: data.tokenId,
      seller: userId,
      price: data.price,
      currency: data.currency,
      saleType: data.saleType,
      status: 'active',
      listedAt: new Date(),
      ...(data.saleType === 'auction' && {
        auctionEndsAt: new Date(Date.now() + (data.auctionDuration || 7) * 24 * 60 * 60 * 1000),
        startingBid: data.price,
        bids: [],
      }),
    });

    // NFT 상태 업데이트
    nft.listed = true;
    nft.listingId = listing._id;
    await nft.save();

    // 블록체인에서 NFT를 마켓플레이스 컨트랙트로 전송
    await BlockchainService.transferToMarketplace(data.tokenId, nft.type);

    return listing;
  }

  /**
   * NFT 구매
   */
  async buyNFT(userId: string, listingId: string, price: number): Promise<any> {
    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      throw new AppError('판매 정보를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 판매 상태 확인
    if (listing.status !== 'active') {
      throw new AppError('판매가 종료된 NFT입니다.', ErrorCode.LISTING_NOT_ACTIVE);
    }

    // 고정가 판매인지 확인
    if (listing.saleType !== 'fixed') {
      throw new AppError('경매 상품은 입찰로만 구매 가능합니다.', ErrorCode.INVALID_PURCHASE_TYPE);
    }

    // 가격 확인
    if (price !== listing.price) {
      throw new AppError('가격이 일치하지 않습니다.', ErrorCode.PRICE_MISMATCH);
    }

    // 구매자 잔액 확인
    const hasEnoughFunds = await BlockchainService.checkTokenBalance(userId, listing.currency, price);
    if (!hasEnoughFunds) {
      throw new AppError('잔액이 부족합니다.', ErrorCode.INSUFFICIENT_FUNDS);
    }

    // 거래 실행
    await BlockchainService.executePurchase({
      listingId,
      buyer: userId,
      seller: listing.seller,
      price,
      currency: listing.currency,
      tokenId: listing.tokenId,
    });

    // NFT 소유권 이전
    const nft = await NFT.findOne({ tokenId: listing.tokenId });
    if (nft) {
      nft.owner = userId;
      nft.listed = false;
      nft.listingId = undefined;
      await nft.save();
    }

    // 판매 목록 업데이트
    listing.status = 'sold';
    listing.buyer = userId;
    listing.soldAt = new Date();
    listing.finalPrice = price;
    await listing.save();

    // 거래 기록 생성
    await this.createTransactionRecord({
      type: 'purchase',
      tokenId: listing.tokenId,
      from: listing.seller,
      to: userId,
      price,
      currency: listing.currency,
    });

    return {
      listing,
      nft,
      transaction: listing,
    };
  }

  /**
   * NFT 경매 입찰
   */
  async placeBid(userId: string, auctionId: string, bidAmount: number): Promise<any> {
    const auction = await MarketplaceListing.findById(auctionId);
    if (!auction) {
      throw new AppError('경매를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 경매 유효성 확인
    if (auction.saleType !== 'auction') {
      throw new AppError('경매 상품이 아닙니다.', ErrorCode.NOT_AUCTION);
    }

    if (auction.status !== 'active') {
      throw new AppError('진행 중인 경매가 아닙니다.', ErrorCode.AUCTION_NOT_ACTIVE);
    }

    if (new Date() > auction.auctionEndsAt) {
      throw new AppError('경매가 종료되었습니다.', ErrorCode.AUCTION_ENDED);
    }

    // 최소 입찰가 확인
    const currentHighestBid = auction.bids[auction.bids.length - 1];
    const minimumBid = currentHighestBid ? currentHighestBid.amount * 1.05 : auction.startingBid;

    if (bidAmount < minimumBid) {
      throw new AppError(`최소 입찰가는 ${minimumBid} ${auction.currency}입니다.`, ErrorCode.BID_TOO_LOW);
    }

    // 입찰자 잔액 확인
    const hasEnoughFunds = await BlockchainService.checkTokenBalance(userId, auction.currency, bidAmount);
    if (!hasEnoughFunds) {
      throw new AppError('입찰 금액이 부족합니다.', ErrorCode.INSUFFICIENT_FUNDS);
    }

    // 에스크로에 금액 보관
    await BlockchainService.lockFundsInEscrow({
      auctionId,
      bidder: userId,
      amount: bidAmount,
      currency: auction.currency,
    });

    // 입찰 기록
    const bid = {
      bidder: userId,
      amount: bidAmount,
      timestamp: new Date(),
    };

    auction.bids.push(bid);
    await auction.save();

    // 이전 최고 입찰자에게 자금 반환
    if (currentHighestBid) {
      await BlockchainService.releaseFundsFromEscrow({
        auctionId,
        bidder: currentHighestBid.bidder,
        amount: currentHighestBid.amount,
        currency: auction.currency,
      });
    }

    return bid;
  }

  /**
   * NFT 임대 등록
   */
  async createRental(userId: string, data: RentalData): Promise<any> {
    const nft = await NFT.findOne({ tokenId: data.tokenId });
    if (!nft) {
      throw new AppError('NFT를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 소유권 확인
    if (nft.owner.toString() !== userId) {
      throw new AppError('NFT 임대 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    // 임대 가능한 NFT인지 확인
    if (!this.isRentable(nft)) {
      throw new AppError('임대 불가능한 NFT입니다.', ErrorCode.NFT_NOT_RENTABLE);
    }

    // 임대 계약 생성
    const rental = await MarketplaceListing.create({
      tokenId: data.tokenId,
      seller: userId,
      price: data.rentalPrice,
      currency: 'VXC', // 임대는 VXC로만 가능
      saleType: 'rental',
      status: 'active',
      listedAt: new Date(),
      rentalDuration: data.duration,
      rentalTerms: data.terms,
    });

    // NFT 상태 업데이트
    nft.rental = true;
    nft.rentalId = rental._id;
    await nft.save();

    return rental;
  }

  /**
   * NFT 임대 신청
   */
  async acceptRental(userId: string, rentalId: string): Promise<any> {
    const rental = await MarketplaceListing.findById(rentalId);
    if (!rental) {
      throw new AppError('임대 정보를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 임대 유효성 확인
    if (rental.saleType !== 'rental') {
      throw new AppError('임대 상품이 아닙니다.', ErrorCode.NOT_RENTAL);
    }

    if (rental.status !== 'active') {
      throw new AppError('진행 중인 임대가 아닙니다.', ErrorCode.RENTAL_NOT_ACTIVE);
    }

    // 임차인 잔액 확인
    const totalCost = rental.price * rental.rentalDuration;
    const hasEnoughFunds = await BlockchainService.checkTokenBalance(userId, rental.currency, totalCost);
    if (!hasEnoughFunds) {
      throw new AppError('임대 비용이 부족합니다.', ErrorCode.INSUFFICIENT_FUNDS);
    }

    // 임대 계약 체결
    await BlockchainService.executeRental({
      rentalId,
      tenant: userId,
      landlord: rental.seller,
      price: rental.price,
      duration: rental.rentalDuration,
      tokenId: rental.tokenId,
    });

    // 임대 상태 업데이트
    rental.status = 'rented';
    rental.tenant = userId;
    rental.rentalStartedAt = new Date();
    rental.rentalEndsAt = new Date(Date.now() + rental.rentalDuration * 24 * 60 * 60 * 1000);
    await rental.save();

    // NFT 임시 사용 권한 부여
    const nft = await NFT.findOne({ tokenId: rental.tokenId });
    if (nft) {
      nft.tempOwner = userId;
      await nft.save();
    }

    return rental;
  }

  /**
   * NFT 거래 기록 조회
   */
  async getTransactionHistory(tokenId: string, options: { page?: number; limit?: number } = {}): Promise<any> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const transactions = await MarketplaceListing.find({ 
      tokenId, 
      status: { $ne: 'active' } 
    })
      .sort({ soldAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('seller buyer', 'username profile.avatar');

    const total = await MarketplaceListing.countDocuments({ 
      tokenId, 
      status: { $ne: 'active' } 
    });

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * NFT 소각
   */
  async burnNFT(userId: string, tokenId: string, reason: string): Promise<any> {
    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      throw new AppError('NFT를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 소유권 확인
    if (nft.owner.toString() !== userId) {
      throw new AppError('NFT 소각 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    // 활성 거래가 있는지 확인
    const activeListing = await MarketplaceListing.findOne({ 
      tokenId, 
      status: 'active' 
    });
    
    if (activeListing) {
      throw new AppError('판매 또는 임대 중인 NFT는 소각할 수 없습니다.', ErrorCode.NFT_IN_TRANSACTION);
    }

    // 블록체인에서 NFT 소각
    await BlockchainService.burnNFT(tokenId, nft.type);

    // NFT 상태 업데이트
    nft.burned = true;
    nft.burnedAt = new Date();
    nft.burnReason = reason;
    await nft.save();

    // 사용자 인벤토리에서 제거
    await User.findByIdAndUpdate(userId, {
      $pull: { 'inventory.nfts': nft._id },
    });

    return nft;
  }

  /**
   * NFT 가격 히스토리
   */
  async getPriceHistory(tokenId: string, period: string = '7d'): Promise<any> {
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case '24h':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    const priceHistory = await MarketplaceListing.aggregate([
      {
        $match: {
          tokenId,
          status: 'sold',
          soldAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt' } },
          avgPrice: { $avg: '$finalPrice' },
          minPrice: { $min: '$finalPrice' },
          maxPrice: { $max: '$finalPrice' },
          volume: { $sum: 1 },
          currency: { $first: '$currency' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return priceHistory;
  }

  /**
   * NFT 컬렉션 통계
   */
  async getCollectionStats(collectionId: string): Promise<any> {
    const stats = await NFT.aggregate([
      { $match: { collection: collectionId } },
      {
        $group: {
          _id: null,
          totalNFTs: { $sum: 1 },
          holders: { $addToSet: '$owner' },
          types: { $addToSet: '$type' },
          avgAttributes: { $avg: { $size: { $objectToArray: '$attributes' } } },
        },
      },
    ]);

    // 최근 거래 통계
    const recentSales = await MarketplaceListing.aggregate([
      {
        $lookup: {
          from: 'nfts',
          localField: 'tokenId',
          foreignField: 'tokenId',
          as: 'nft',
        },
      },
      { $unwind: '$nft' },
      { $match: { 'nft.collection': collectionId, status: 'sold' } },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$finalPrice' },
          totalVolume: { $sum: '$finalPrice' },
          sales: { $sum: 1 },
        },
      },
    ]);

    return {
      ...stats[0],
      uniqueHolders: stats[0]?.holders?.length || 0,
      sales: recentSales[0] || { avgPrice: 0, totalVolume: 0, sales: 0 },
    };
  }

  /**
   * 인기 NFT 조회
   */
  async getTrendingNFTs(options: FilterOptions = {}): Promise<any> {
    const {
      category,
      period = '24h',
      page = 1,
      limit = 20,
    } = options;

    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    const matchCondition: any = {
      status: 'sold',
      soldAt: { $gte: startDate },
    };

    if (category) {
      matchCondition['nft.metadata.attributes.category'] = category;
    }

    const trending = await MarketplaceListing.aggregate([
      {
        $lookup: {
          from: 'nfts',
          localField: 'tokenId',
          foreignField: 'tokenId',
          as: 'nft',
        },
      },
      { $unwind: '$nft' },
      { $match: matchCondition },
      {
        $group: {
          _id: '$tokenId',
          nft: { $first: '$nft' },
          totalVolume: { $sum: '$finalPrice' },
          sales: { $sum: 1 },
          avgPrice: { $avg: '$finalPrice' },
          lastSalePrice: { $last: '$finalPrice' },
        },
      },
      { $sort: { totalVolume: -1, sales: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    return trending;
  }

  /**
   * NFT 검증
   */
  async verifyNFT(tokenId: string): Promise<any> {
    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      throw new AppError('NFT를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 블록체인에서 소유권 확인
    const onChainOwner = await BlockchainService.getTokenOwner(tokenId, nft.type);
    const isOwnerVerified = onChainOwner.toLowerCase() === nft.owner.toString().toLowerCase();

    // 메타데이터 IPFS 해시 확인
    const onChainTokenURI = await BlockchainService.getTokenURI(tokenId, nft.type);
    const isMetadataVerified = onChainTokenURI === nft.metadata.tokenURI;

    // 컨트랙트 인증
    const contractVerified = await BlockchainService.verifyContract(this.getContractAddress(nft.type));

    return {
      tokenId,
      verified: isOwnerVerified && isMetadataVerified && contractVerified,
      checks: {
        ownerVerified: isOwnerVerified,
        metadataVerified: isMetadataVerified,
        contractVerified,
      },
      onChainData: {
        owner: onChainOwner,
        tokenURI: onChainTokenURI,
      },
      dbData: {
        owner: nft.owner,
        tokenURI: nft.metadata.tokenURI,
      },
    };
  }

  /**
   * NFT 보관함으로 이동
   */
  async moveToVault(userId: string, tokenId: string, vaultType: 'hot' | 'cold'): Promise<any> {
    const nft = await NFT.findOne({ tokenId });
    if (!nft) {
      throw new AppError('NFT를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 소유권 확인
    if (nft.owner.toString() !== userId) {
      throw new AppError('NFT 보관함 이동 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    // 활성 거래 확인
    const activeListing = await MarketplaceListing.findOne({ 
      tokenId, 
      status: 'active' 
    });
    
    if (activeListing) {
      throw new AppError('판매 중인 NFT는 보관함으로 이동할 수 없습니다.', ErrorCode.NFT_IN_TRANSACTION);
    }

    // 보관함으로 이동
    if (vaultType === 'cold') {
      // 콜드 보관함으로 이동 (블록체인에서 특수 주소로 전송)
      await BlockchainService.transferToColdVault(tokenId, nft.type);
    }

    // NFT 상태 업데이트
    nft.vault = vaultType;
    nft.vaultTransferredAt = new Date();
    await nft.save();

    return nft;
  }

  /**
   * NFT 검색
   */
  async searchNFTs(options: FilterOptions = {}): Promise<any> {
    const {
      query,
      category,
      minPrice,
      maxPrice,
      rarity,
      sortBy = 'createdAt',
      page = 1,
      limit = 20,
    } = options;

    const searchQuery: any = {};

    // 텍스트 검색
    if (query) {
      searchQuery.$or = [
        { 'metadata.name': { $regex: query, $options: 'i' } },
        { 'metadata.description': { $regex: query, $options: 'i' } },
      ];
    }

    // 카테고리 필터
    if (category) {
      searchQuery['metadata.attributes.category'] = category;
    }

    // 희귀도 필터
    if (rarity) {
      searchQuery['attributes.rarity'] = rarity;
    }

    // 가격 범위 (현재 판매 중인 NFT만)
    if (minPrice !== undefined || maxPrice !== undefined) {
      searchQuery.listed = true;
      
      // 판매 가격 조회를 위한 조인
      const priceCondition: any = {};
      if (minPrice !== undefined) priceCondition.$gte = minPrice;
      if (maxPrice !== undefined) priceCondition.$lte = maxPrice;
      
      searchQuery.listingPrice = priceCondition;
    }

    const skip = (page - 1) * limit;
    
    const nfts = await NFT.aggregate([
      // 판매 정보 조인
      {
        $lookup: {
          from: 'marketplacelistings',
          let: { tokenId: '$tokenId' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }, { $eq: ['$status', 'active'] }] } } },
          ],
          as: 'listing',
        },
      },
      // 판매 정보가 있으면 가격 추가
      {
        $addFields: {
          listingPrice: { $first: '$listing.price' },
          listed: { $gt: [{ $size: '$listing' }, 0] },
        },
      },
      // 검색 조건 적용
      { $match: searchQuery },
      // 정렬
      { $sort: { [sortBy]: -1 } },
      // 페이징
      { $skip: skip },
      { $limit: limit },
      // 필요한 필드만 선택
      {
        $project: {
          tokenId: 1,
          type: 1,
          metadata: 1,
          attributes: 1,
          owner: 1,
          listed: 1,
          listingPrice: 1,
          createdAt: 1,
        },
      },
    ]);

    const total = await NFT.countDocuments(searchQuery);

    return {
      nfts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /* Private Helper Methods */

  /**
   * 민팅 비용 계산
   */
  private calculateMintingCost(type: string, attributes: any): { vxc: number } {
    let baseCost = 100; // 기본 민팅 비용

    // NFT 타입별 추가 비용
    switch (type) {
      case 'item':
        baseCost += 50;
        break;
      case 'building':
        baseCost += 200;
        break;
      case 'vehicle':
        baseCost += 300;
        break;
      case 'land':
        baseCost += 500;
        break;
    }

    // 희귀도별 추가 비용
    if (attributes.rarity) {
      switch (attributes.rarity) {
        case 'common':
          break;
        case 'uncommon':
          baseCost *= 1.5;
          break;
        case 'rare':
          baseCost *= 2;
          break;
        case 'epic':
          baseCost *= 3;
          break;
        case 'legendary':
          baseCost *= 5;
          break;
      }
    }

    return { vxc: baseCost };
  }

  /**
   * 컨트랙트 주소 조회
   */
  private getContractAddress(type: string): string {
    const contracts = {
      item: process.env.ITEM_NFT_CONTRACT_ADDRESS!,
      building: process.env.BUILDING_NFT_CONTRACT_ADDRESS!,
      vehicle: process.env.VEHICLE_NFT_CONTRACT_ADDRESS!,
      land: process.env.LAND_NFT_CONTRACT_ADDRESS!,
    };

    return contracts[type] || contracts.item;
  }

  /**
   * 건물 용량 계산
   */
  private getBuildingCapacity(buildingType: string): number {
    const capacities = {
      house: 4,
      shop: 2,
      warehouse: 20,
      factory: 10,
      fortress: 50,
      entertainment: 15,
      special: 5,
    };

    return capacities[buildingType] || 1;
  }

  /**
   * 업그레이드 가능 여부 확인
   */
  private canUpgrade(nft: any, targetLevel: number): boolean {
    const currentLevel = nft.attributes.level || 1;
    
    // 최대 레벨 10
    if (targetLevel > 10) return false;
    
    // 한 번에 한 레벨씩만 업그레이드 가능
    if (targetLevel - currentLevel !== 1) return false;
    
    return true;
  }

  /**
   * 재료 확인
   */
  private async checkMaterials(userId: string, materials: Record<string, number>): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) return false;

    for (const [material, required] of Object.entries(materials)) {
      const available = user.inventory?.resources?.[material] || 0;
      if (available < required) return false;
    }

    return true;
  }

  /**
   * 재료 소모
   */
  private async consumeMaterials(userId: string, materials: Record<string, number>): Promise<void> {
    const user = await User.findById(userId);
    if (!user) return;

    for (const [material, amount] of Object.entries(materials)) {
      user.inventory.resources[material] -= amount;
    }

    await user.save();
  }

  /**
   * 업그레이드된 속성 계산
   */
  private calculateUpgradedAttributes(nft: any, newLevel: number): any {
    const upgrades = {
      level: newLevel,
    };

    // NFT 타입별 업그레이드 효과
    switch (nft.type) {
      case 'building':
        upgrades['capacity'] = (nft.attributes.capacity || 1) * 1.5;
        upgrades['durability'] = (nft.attributes.durability || 100) * 1.2;
        break;
      case 'vehicle':
        upgrades['speed'] = (nft.attributes.speed || 10) * 1.3;
        upgrades['cargoCapacity'] = (nft.attributes.cargoCapacity || 5) * 1.4;
        break;
      case 'item':
        upgrades['damage'] = (nft.attributes.damage || 10) * 1.2;
        upgrades['defense'] = (nft.attributes.defense || 5) * 1.2;
        break;
    }

    return upgrades;
  }

  /**
   * 조합 레시피 조회
   */
  private async getRecipe(recipeId: string): Promise<any> {
    // 실제 구현에서는 레시피 데이터베이스에서 조회
    const recipes = {
      'epic_sword': {
        requirements: [
          { type: 'item', rarity: 'rare', count: 3 },
          { type: 'item', category: 'sword', count: 1 },
        ],
        result: {
          type: 'item',
          rarity: 'epic',
          category: 'sword',
          attributes: {
            damage: 50,
            durability: 300,
          },
        },
      },
    };

    return recipes[recipeId] || null;
  }

  /**
   * 레시피 유효성 검증
   */
  private validateRecipe(sourceNFTs: any[], recipe: any): boolean {
    // 레시피 요구사항과 소스 NFT들을 비교
    for (const requirement of recipe.requirements) {
      const matchingNFTs = sourceNFTs.filter(nft => {
        return nft.type === requirement.type &&
               (!requirement.rarity || nft.attributes.rarity === requirement.rarity) &&
               (!requirement.category || nft.metadata.attributes.category === requirement.category);
      });

      if (matchingNFTs.length < requirement.count) {
        return false;
      }
    }

    return true;
  }

  /**
   * 조합된 NFT 생성
   */
  private createCombinedNFT(sourceNFTs: any[], recipe: any): NFTMintData {
    const result = recipe.result;
    
    return {
      type: result.type,
      metadata: {
        name: `Combined ${result.category} (${result.rarity})`,
        description: `Created by combining ${sourceNFTs.length} NFTs`,
        attributes: {
          ...result.attributes,
          category: result.category,
          rarity: result.rarity,
          sourceTokens: sourceNFTs.map(nft => nft.tokenId),
        },
        image: `https://assets.diy-crafting-world.com/${result.type}/${result.category}-${result.rarity}.png`,
      },
      attributes: result.attributes,
    };
  }

  /**
   * 거래 기록 생성
   */
  private async createTransactionRecord(data: any): Promise<void> {
    // 거래 기록을 별도 컬렉션에 저장
    // 향후 분석 및 히스토리 조회에 활용
  }

  /**
   * 임대 가능 여부 확인
   */
  private isRentable(nft: any): boolean {
    // 건물과 차량만 임대 가능
    return ['building', 'vehicle'].includes(nft.type);
  }
}

export default new NFTService();
