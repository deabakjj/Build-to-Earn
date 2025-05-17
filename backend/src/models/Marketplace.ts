import mongoose, { Document, Schema } from 'mongoose';

export enum ListingType {
  FIXED_PRICE = 'FIXED_PRICE',
  AUCTION = 'AUCTION',
  BUNDLE = 'BUNDLE',
  RENTAL = 'RENTAL'
}

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING'
}

export enum CurrencyType {
  VXC = 'VXC',
  PTX = 'PTX'
}

export enum AuctionStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED'
}

export interface IBid {
  bidId: string;
  bidder: mongoose.Types.ObjectId;
  amount: number;
  currency: CurrencyType;
  placedAt: Date;
  isWinning: boolean;
  isRetracted?: boolean;
  retractedAt?: Date;
}

export interface IRentalContract {
  contractId: string;
  renter: mongoose.Types.ObjectId;
  duration: number; // in seconds
  startDate: Date;
  endDate: Date;
  automaticRenewal: boolean;
  totalPaid: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  renewalCount: number;
}

export interface IMarketplaceListing extends Document {
  listingId: string;
  seller: mongoose.Types.ObjectId;
  type: ListingType;
  status: ListingStatus;
  
  // Item details
  item: {
    nftId: mongoose.Types.ObjectId;
    name: string;
    description: string;
    image: string;
    category: 'ITEM' | 'BUILDING' | 'VEHICLE' | 'LAND';
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
    attributes: {
      trait_type: string;
      value: string | number;
    }[];
    metadata: any;
  };
  
  // Pricing
  pricing: {
    currency: CurrencyType;
    price?: number; // For fixed price listings
    minimumBid?: number; // For auctions
    buyNowPrice?: number; // For auctions with buy-now option
    startingPrice?: number; // For auctions
    reservePrice?: number; // For auctions
    bundleDiscount?: number; // For bundle listings
    rentalRate?: number; // For rental listings
    rentalPeriod?: number; // For rental listings (in seconds)
  };
  
  // Auction specific
  auction?: {
    status: AuctionStatus;
    startTime: Date;
    endTime: Date;
    currentBid: number;
    bidCount: number;
    minimumBidIncrement: number;
    autoExtend: boolean;
    extensionTime?: number;
    bids: IBid[];
    winningBid?: mongoose.Types.ObjectId;
  };
  
  // Bundle specific
  bundle?: {
    items: {
      nftId: mongoose.Types.ObjectId;
      name: string;
      quantity: number;
      individualPrice: number;
    }[];
    totalItems: number;
    totalValue: number;
    discount: number;
  };
  
  // Rental specific
  rental?: {
    availableFrom: Date;
    availableUntil?: Date;
    minimumRentalPeriod: number;
    maximumRentalPeriod: number;
    activeContracts: IRentalContract[];
    totalRevenue: number;
    allowedActivities: string[];
  };
  
  // Listing metadata
  metadata: {
    featured: boolean;
    sponsored: boolean;
    verified: boolean;
    tags: string[];
    condition?: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
    location?: string;
    language: string;
    targetAudience?: string[];
  };
  
  // Statistics
  statistics: {
    views: number;
    favorites: number;
    watchers: mongoose.Types.ObjectId[];
    inquiries: number;
    shares: number;
    visitHistory: {
      visitor: mongoose.Types.ObjectId;
      timestamp: Date;
      referrer?: string;
    }[];
  };
  
  // Transaction details
  transaction?: {
    buyer: mongoose.Types.ObjectId;
    finalPrice: number;
    currency: CurrencyType;
    completedAt: Date;
    fees: {
      platformFee: number;
      royaltyFee: number;
      serviceFee: number;
      total: number;
    };
    paymentMethod: string;
    shippingAddress?: {
      name: string;
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
  };
  
  // Moderation
  moderation: {
    flagged: boolean;
    flagCount: number;
    flags: {
      reporter: mongoose.Types.ObjectId;
      reason: string;
      description?: string;
      reportedAt: Date;
    }[];
    moderatedBy?: mongoose.Types.ObjectId;
    moderatedAt?: Date;
    moderationNotes?: string;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
  expiresAt?: Date;
  lastUpdatedPrice?: Date;
  lastVisited?: Date;
}

const BidSchema = new Schema({
  bidId: {
    type: String,
    required: true,
  },
  bidder: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    enum: Object.values(CurrencyType),
    required: true,
  },
  placedAt: {
    type: Date,
    default: Date.now,
  },
  isWinning: {
    type: Boolean,
    default: false,
  },
  isRetracted: {
    type: Boolean,
    default: false,
  },
  retractedAt: Date,
});

const RentalContractSchema = new Schema({
  contractId: {
    type: String,
    required: true,
  },
  renter: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  automaticRenewal: {
    type: Boolean,
    default: false,
  },
  totalPaid: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
    default: 'ACTIVE',
  },
  renewalCount: {
    type: Number,
    default: 0,
  },
});

const MarketplaceListingSchema: Schema = new Schema(
  {
    listingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(ListingType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ListingStatus),
      default: ListingStatus.ACTIVE,
      required: true,
      index: true,
    },
    item: {
      nftId: {
        type: Schema.Types.ObjectId,
        ref: 'NFT',
        required: true,
        index: true,
      },
      name: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      image: {
        type: String,
        required: true,
      },
      category: {
        type: String,
        enum: ['ITEM', 'BUILDING', 'VEHICLE', 'LAND'],
        required: true,
        index: true,
      },
      rarity: {
        type: String,
        enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
        required: true,
        index: true,
      },
      attributes: [{
        trait_type: String,
        value: Schema.Types.Mixed,
      }],
      metadata: Schema.Types.Mixed,
    },
    pricing: {
      currency: {
        type: String,
        enum: Object.values(CurrencyType),
        required: true,
      },
      price: {
        type: Number,
        min: 0,
      },
      minimumBid: {
        type: Number,
        min: 0,
      },
      buyNowPrice: {
        type: Number,
        min: 0,
      },
      startingPrice: {
        type: Number,
        min: 0,
      },
      reservePrice: {
        type: Number,
        min: 0,
      },
      bundleDiscount: {
        type: Number,
        min: 0,
        max: 100,
      },
      rentalRate: {
        type: Number,
        min: 0,
      },
      rentalPeriod: {
        type: Number,
        min: 1,
      },
    },
    auction: {
      status: {
        type: String,
        enum: Object.values(AuctionStatus),
      },
      startTime: Date,
      endTime: Date,
      currentBid: {
        type: Number,
        default: 0,
      },
      bidCount: {
        type: Number,
        default: 0,
      },
      minimumBidIncrement: {
        type: Number,
        default: 1,
      },
      autoExtend: {
        type: Boolean,
        default: false,
      },
      extensionTime: Number,
      bids: [BidSchema],
      winningBid: {
        type: Schema.Types.ObjectId,
        ref: 'Bid',
      },
    },
    bundle: {
      items: [{
        nftId: {
          type: Schema.Types.ObjectId,
          ref: 'NFT',
        },
        name: String,
        quantity: {
          type: Number,
          default: 1,
        },
        individualPrice: Number,
      }],
      totalItems: {
        type: Number,
        default: 0,
      },
      totalValue: {
        type: Number,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
    },
    rental: {
      availableFrom: Date,
      availableUntil: Date,
      minimumRentalPeriod: {
        type: Number,
        default: 86400, // 1 day in seconds
      },
      maximumRentalPeriod: {
        type: Number,
        default: 2592000, // 30 days in seconds
      },
      activeContracts: [RentalContractSchema],
      totalRevenue: {
        type: Number,
        default: 0,
      },
      allowedActivities: [String],
    },
    metadata: {
      featured: {
        type: Boolean,
        default: false,
      },
      sponsored: {
        type: Boolean,
        default: false,
      },
      verified: {
        type: Boolean,
        default: false,
      },
      tags: [String],
      condition: {
        type: String,
        enum: ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'],
      },
      location: String,
      language: {
        type: String,
        default: 'en',
      },
      targetAudience: [String],
    },
    statistics: {
      views: {
        type: Number,
        default: 0,
      },
      favorites: {
        type: Number,
        default: 0,
      },
      watchers: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
      inquiries: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
      visitHistory: [{
        visitor: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        referrer: String,
      }],
    },
    transaction: {
      buyer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      finalPrice: Number,
      currency: {
        type: String,
        enum: Object.values(CurrencyType),
      },
      completedAt: Date,
      fees: {
        platformFee: {
          type: Number,
          default: 0,
        },
        royaltyFee: {
          type: Number,
          default: 0,
        },
        serviceFee: {
          type: Number,
          default: 0,
        },
        total: {
          type: Number,
          default: 0,
        },
      },
      paymentMethod: String,
      shippingAddress: {
        name: String,
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
      },
    },
    moderation: {
      flagged: {
        type: Boolean,
        default: false,
      },
      flagCount: {
        type: Number,
        default: 0,
      },
      flags: [{
        reporter: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: String,
        description: String,
        reportedAt: {
          type: Date,
          default: Date.now,
        },
      }],
      moderatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      moderatedAt: Date,
      moderationNotes: String,
    },
    endedAt: Date,
    expiresAt: Date,
    lastUpdatedPrice: Date,
    lastVisited: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
MarketplaceListingSchema.index({ type: 1, status: 1 });
MarketplaceListingSchema.index({ 'item.category': 1, 'item.rarity': 1 });
MarketplaceListingSchema.index({ 'pricing.price': 1 });
MarketplaceListingSchema.index({ createdAt: -1 });
MarketplaceListingSchema.index({ 'statistics.views': -1 });
MarketplaceListingSchema.index({ 'auction.endTime': 1 });

// Text search index
MarketplaceListingSchema.index({
  'item.name': 'text',
  'item.description': 'text',
  'metadata.tags': 'text',
});

// Virtual fields
MarketplaceListingSchema.virtual('timeRemaining').get(function() {
  if (this.type !== ListingType.AUCTION || !this.auction?.endTime) return null;
  
  const now = new Date();
  const timeLeft = this.auction.endTime.getTime() - now.getTime();
  
  if (timeLeft <= 0) return null;
  
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
});

MarketplaceListingSchema.virtual('isActive').get(function() {
  return this.status === ListingStatus.ACTIVE;
});

MarketplaceListingSchema.virtual('hasReservePrice').get(function() {
  return this.type === ListingType.AUCTION && this.pricing.reservePrice > 0;
});

MarketplaceListingSchema.virtual('reserveMet').get(function() {
  if (!this.hasReservePrice || !this.auction) return true;
  return this.auction.currentBid >= this.pricing.reservePrice;
});

// Instance methods
MarketplaceListingSchema.methods.placeBid = function(bidderId: mongoose.Types.ObjectId, amount: number) {
  if (this.type !== ListingType.AUCTION) {
    throw new Error('Can only place bids on auction listings');
  }
  
  if (this.auction.status !== AuctionStatus.ACTIVE) {
    throw new Error('Auction is not active');
  }
  
  if (amount <= this.auction.currentBid) {
    throw new Error('Bid must be higher than current bid');
  }
  
  if (amount < this.pricing.minimumBid) {
    throw new Error('Bid must meet minimum bid amount');
  }
  
  // Create new bid
  const newBid: IBid = {
    bidId: new mongoose.Types.ObjectId().toString(),
    bidder: bidderId,
    amount,
    currency: this.pricing.currency,
    placedAt: new Date(),
    isWinning: true,
  };
  
  // Mark previous winning bid as not winning
  if (this.auction.bids.length > 0) {
    this.auction.bids.forEach(bid => {
      bid.isWinning = false;
    });
  }
  
  // Add bid and update auction state
  this.auction.bids.push(newBid);
  this.auction.currentBid = amount;
  this.auction.bidCount += 1;
  this.auction.winningBid = new mongoose.Types.ObjectId(newBid.bidId);
  
  // Auto-extend if configured
  if (this.auction.autoExtend && this.auction.extensionTime) {
    const now = new Date();
    const timeToEnd = this.auction.endTime.getTime() - now.getTime();
    
    if (timeToEnd < this.auction.extensionTime * 1000) {
      this.auction.endTime = new Date(now.getTime() + this.auction.extensionTime * 1000);
    }
  }
  
  return this.save();
};

MarketplaceListingSchema.methods.buyNow = function(buyerId: mongoose.Types.ObjectId) {
  if (this.status !== ListingStatus.ACTIVE) {
    throw new Error('Listing is not active');
  }
  
  let price: number;
  
  if (this.type === ListingType.FIXED_PRICE) {
    price = this.pricing.price;
  } else if (this.type === ListingType.AUCTION && this.pricing.buyNowPrice) {
    price = this.pricing.buyNowPrice;
  } else {
    throw new Error('Buy now not available for this listing');
  }
  
  // Calculate fees
  const platformFee = price * 0.025; // 2.5% platform fee
  const royaltyFee = price * 0.05; // 5% royalty fee
  const serviceFee = price * 0.005; // 0.5% service fee
  const totalFees = platformFee + royaltyFee + serviceFee;
  
  // Complete transaction
  this.transaction = {
    buyer: buyerId,
    finalPrice: price,
    currency: this.pricing.currency,
    completedAt: new Date(),
    fees: {
      platformFee,
      royaltyFee,
      serviceFee,
      total: totalFees,
    },
    paymentMethod: 'DIRECT',
  };
  
  this.status = ListingStatus.COMPLETED;
  this.endedAt = new Date();
  
  return this.save();
};

MarketplaceListingSchema.methods.endAuction = function() {
  if (this.type !== ListingType.AUCTION) {
    throw new Error('Can only end auction listings');
  }
  
  this.auction.status = AuctionStatus.ENDED;
  this.endedAt = new Date();
  
  if (this.auction.bids.length > 0 && this.reserveMet) {
    const winningBid = this.auction.bids.find(bid => bid.isWinning);
    if (winningBid) {
      // Calculate fees
      const platformFee = winningBid.amount * 0.025;
      const royaltyFee = winningBid.amount * 0.05;
      const serviceFee = winningBid.amount * 0.005;
      const totalFees = platformFee + royaltyFee + serviceFee;
      
      // Complete transaction
      this.transaction = {
        buyer: winningBid.bidder,
        finalPrice: winningBid.amount,
        currency: winningBid.currency,
        completedAt: new Date(),
        fees: {
          platformFee,
          royaltyFee,
          serviceFee,
          total: totalFees,
        },
        paymentMethod: 'AUCTION',
      };
      
      this.status = ListingStatus.COMPLETED;
    }
  } else {
    this.status = ListingStatus.EXPIRED;
  }
  
  return this.save();
};

MarketplaceListingSchema.methods.cancelListing = function() {
  if (this.status !== ListingStatus.ACTIVE) {
    throw new Error('Can only cancel active listings');
  }
  
  this.status = ListingStatus.CANCELLED;
  this.endedAt = new Date();
  
  if (this.type === ListingType.AUCTION) {
    this.auction.status = AuctionStatus.CANCELLED;
  }
  
  return this.save();
};

MarketplaceListingSchema.methods.addView = function(visitorId: mongoose.Types.ObjectId, referrer?: string) {
  this.statistics.views += 1;
  this.lastVisited = new Date();
  
  // Don't record view history for the seller
  if (!visitorId.equals(this.seller)) {
    this.statistics.visitHistory.push({
      visitor: visitorId,
      timestamp: new Date(),
      referrer,
    });
    
    // Keep only last 1000 views
    if (this.statistics.visitHistory.length > 1000) {
      this.statistics.visitHistory = this.statistics.visitHistory.slice(-1000);
    }
  }
  
  return this.save();
};

MarketplaceListingSchema.methods.toggleFavorite = function(userId: mongoose.Types.ObjectId) {
  const index = this.statistics.watchers.findIndex(watcher => watcher.equals(userId));
  
  if (index > -1) {
    this.statistics.watchers.splice(index, 1);
    this.statistics.favorites = Math.max(0, this.statistics.favorites - 1);
  } else {
    this.statistics.watchers.push(userId);
    this.statistics.favorites += 1;
  }
  
  return this.save();
};

MarketplaceListingSchema.methods.reportListing = function(reporterId: mongoose.Types.ObjectId, reason: string, description?: string) {
  this.moderation.flags.push({
    reporter: reporterId,
    reason,
    description,
    reportedAt: new Date(),
  });
  
  this.moderation.flagCount += 1;
  
  if (this.moderation.flagCount >= 5) {
    this.moderation.flagged = true;
  }
  
  return this.save();
};

// Static methods
MarketplaceListingSchema.statics.search = function(query: {
  keyword?: string;
  category?: string;
  rarity?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: CurrencyType;
  type?: ListingType;
  status?: ListingStatus;
  seller?: mongoose.Types.ObjectId;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'oldest' | 'popular' | 'ending_soon';
  page?: number;
  limit?: number;
}) {
  const filter: any = { status: query.status || ListingStatus.ACTIVE };
  
  if (query.keyword) {
    filter.$text = { $search: query.keyword };
  }
  
  if (query.category) filter['item.category'] = query.category;
  if (query.rarity) filter['item.rarity'] = query.rarity;
  if (query.type) filter.type = query.type;
  if (query.seller) filter.seller = query.seller;
  if (query.currency) filter['pricing.currency'] = query.currency;
  
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter['pricing.price'] = {};
    if (query.minPrice !== undefined) filter['pricing.price'].$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter['pricing.price'].$lte = query.maxPrice;
  }
  
  const skip = query.page && query.limit ? (query.page - 1) * query.limit : 0;
  
  let sortOption: any = {};
  switch (query.sortBy) {
    case 'price_asc':
      sortOption = { 'pricing.price': 1 };
      break;
    case 'price_desc':
      sortOption = { 'pricing.price': -1 };
      break;
    case 'newest':
      sortOption = { createdAt: -1 };
      break;
    case 'oldest':
      sortOption = { createdAt: 1 };
      break;
    case 'popular':
      sortOption = { 'statistics.views': -1 };
      break;
    case 'ending_soon':
      sortOption = { 'auction.endTime': 1 };
      break;
    default:
      sortOption = { createdAt: -1 };
  }
  
  return this.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(query.limit || 20)
    .populate('seller', 'username profileImage')
    .populate('item.nftId');
};

MarketplaceListingSchema.statics.getActiveAuctions = function() {
  return this.find({
    type: ListingType.AUCTION,
    status: ListingStatus.ACTIVE,
    'auction.status': AuctionStatus.ACTIVE,
    'auction.endTime': { $gt: new Date() },
  })
  .sort({ 'auction.endTime': 1 });
};

MarketplaceListingSchema.statics.getExpiredListings = function() {
  return this.find({
    status: ListingStatus.ACTIVE,
    $or: [
      { expiresAt: { $lte: new Date() } },
      { 
        type: ListingType.AUCTION,
        'auction.endTime': { $lte: new Date() }
      }
    ],
  });
};

MarketplaceListingSchema.statics.getTrendingListings = function(timeframe: 'day' | 'week' | 'month' = 'week', limit: number = 10) {
  const now = new Date();
  let startDate: Date;
  
  switch (timeframe) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }
  
  return this.aggregate([
    {
      $match: {
        status: ListingStatus.ACTIVE,
        createdAt: { $gte: startDate },
      },
    },
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: ['$statistics.views', 0.1] },
            { $multiply: ['$statistics.favorites', 2] },
            { $multiply: ['$statistics.shares', 5] },
            { $multiply: ['$auction.bidCount', 10] },
          ],
        },
      },
    },
    { $sort: { trendingScore: -1 } },
    { $limit: limit },
  ]);
};

MarketplaceListingSchema.statics.getMarketplaceStatistics = function(timeframe: 'day' | 'week' | 'month' = 'week') {
  const now = new Date();
  let startDate: Date;
  
  switch (timeframe) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }
  
  return this.aggregate([
    {
      $match: {
        status: ListingStatus.COMPLETED,
        'transaction.completedAt': { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalVolume: { $sum: '$transaction.finalPrice' },
        averagePrice: { $avg: '$transaction.finalPrice' },
        uniqueSellers: { $addToSet: '$seller' },
        uniqueBuyers: { $addToSet: '$transaction.buyer' },
        itemTypeBreakdown: {
          $push: {
            category: '$item.category',
            price: '$transaction.finalPrice',
          },
        },
      },
    },
    {
      $addFields: {
        uniqueSellersCount: { $size: '$uniqueSellers' },
        uniqueBuyersCount: { $size: '$uniqueBuyers' },
      },
    },
  ]);
};

export const MarketplaceListing = mongoose.model<IMarketplaceListing>('MarketplaceListing', MarketplaceListingSchema);
