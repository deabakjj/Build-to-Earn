import mongoose, { Document, Schema } from 'mongoose';

export enum NFTType {
  ITEM = 'ITEM',
  BUILDING = 'BUILDING',
  VEHICLE = 'VEHICLE',
  LAND = 'LAND'
}

export enum NFTRarity {
  COMMON = 'COMMON',      // 75%
  UNCOMMON = 'UNCOMMON',  // 15%
  RARE = 'RARE',          // 7%
  EPIC = 'EPIC',          // 2%
  LEGENDARY = 'LEGENDARY'  // 1%
}

export interface INFTMetadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
  attributes: {
    trait_type: string;
    value: string | number;
    display_type?: string;
  }[];
  properties: {
    materials?: string[];
    dimensions?: {
      width: number;
      height: number;
      depth: number;
    };
    functionalities?: string[];
    durability?: number;
    energy_efficiency?: number;
    storage_capacity?: number;
    speed?: number;
    [key: string]: any;
  };
}

export interface INFT extends Document {
  tokenId: string;
  contractAddress: string;
  type: NFTType;
  rarity: NFTRarity;
  metadata: INFTMetadata;
  creator: mongoose.Types.ObjectId;
  currentOwner: mongoose.Types.ObjectId;
  previousOwners: {
    owner: mongoose.Types.ObjectId;
    ownedAt: Date;
    soldAt: Date;
    salePrice: number;
  }[];
  isListed: boolean;
  listingDetails?: {
    price: number;
    currency: 'VXC' | 'PTX';
    listingType: 'FIXED' | 'AUCTION';
    auctionDetails?: {
      startPrice: number;
      currentBid: number;
      highestBidder: mongoose.Types.ObjectId;
      endTime: Date;
      minBidIncrement: number;
    };
    expiresAt?: Date;
  };
  royaltyInfo: {
    royaltyPercentage: number;
    royaltyRecipient: mongoose.Types.ObjectId;
  };
  isVerified: boolean;
  isUpgraded: boolean;
  upgradeHistory: {
    upgradedAt: Date;
    upgradeType: string;
    costPaid: number;
    materialsUsed: string[];
    previousRarity: NFTRarity;
    newRarity: NFTRarity;
  }[];
  usage: {
    totalTimesUsed: number;
    totalEarnings: number;
    averageRating: number;
    ratings: {
      user: mongoose.Types.ObjectId;
      rating: number;
      comment?: string;
      ratedAt: Date;
    }[];
  };
  statistics: {
    views: number;
    likes: number;
    likedBy: mongoose.Types.ObjectId[];
    shares: number;
    totalSales: number;
    totalVolume: number;
  };
  gameProperties: {
    level: number;
    experience: number;
    maxDurability: number;
    currentDurability: number;
    enchantments: {
      enchantmentType: string;
      level: number;
      effect: string;
    }[];
    seasonalEffects?: {
      seasonId: mongoose.Types.ObjectId;
      effectType: string;
      bonus: number;
    }[];
  };
  ipfsHash: string;
  arweaveId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  isActive: boolean;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  moderationNotes?: string;
}

const NFTSchema: Schema = new Schema(
  {
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NFTType),
      required: true,
      index: true,
    },
    rarity: {
      type: String,
      enum: Object.values(NFTRarity),
      required: true,
      index: true,
    },
    metadata: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      description: {
        type: String,
        required: true,
      },
      image: {
        type: String,
        required: true,
      },
      animation_url: {
        type: String,
      },
      attributes: [
        {
          trait_type: {
            type: String,
            required: true,
          },
          value: {
            type: Schema.Types.Mixed,
            required: true,
          },
          display_type: {
            type: String,
          },
        },
      ],
      properties: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    currentOwner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    previousOwners: [
      {
        owner: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        ownedAt: {
          type: Date,
          required: true,
        },
        soldAt: {
          type: Date,
          required: true,
        },
        salePrice: {
          type: Number,
          required: true,
        },
      },
    ],
    isListed: {
      type: Boolean,
      default: false,
      index: true,
    },
    listingDetails: {
      price: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        enum: ['VXC', 'PTX'],
      },
      listingType: {
        type: String,
        enum: ['FIXED', 'AUCTION'],
      },
      auctionDetails: {
        startPrice: {
          type: Number,
          min: 0,
        },
        currentBid: {
          type: Number,
          min: 0,
        },
        highestBidder: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        endTime: {
          type: Date,
        },
        minBidIncrement: {
          type: Number,
          min: 0,
        },
      },
      expiresAt: {
        type: Date,
      },
    },
    royaltyInfo: {
      royaltyPercentage: {
        type: Number,
        default: 5, // 5% default royalty
        min: 0,
        max: 20,
      },
      royaltyRecipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isUpgraded: {
      type: Boolean,
      default: false,
    },
    upgradeHistory: [
      {
        upgradedAt: {
          type: Date,
          required: true,
        },
        upgradeType: {
          type: String,
          required: true,
        },
        costPaid: {
          type: Number,
          required: true,
        },
        materialsUsed: [{
          type: String,
        }],
        previousRarity: {
          type: String,
          enum: Object.values(NFTRarity),
          required: true,
        },
        newRarity: {
          type: String,
          enum: Object.values(NFTRarity),
          required: true,
        },
      },
    ],
    usage: {
      totalTimesUsed: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalEarnings: {
        type: Number,
        default: 0,
        min: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      ratings: [
        {
          user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
          },
          comment: {
            type: String,
          },
          ratedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    statistics: {
      views: {
        type: Number,
        default: 0,
        min: 0,
      },
      likes: {
        type: Number,
        default: 0,
        min: 0,
      },
      likedBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
      }],
      shares: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalSales: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalVolume: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    gameProperties: {
      level: {
        type: Number,
        default: 1,
        min: 1,
      },
      experience: {
        type: Number,
        default: 0,
        min: 0,
      },
      maxDurability: {
        type: Number,
        default: 100,
        min: 1,
      },
      currentDurability: {
        type: Number,
        default: 100,
        min: 0,
      },
      enchantments: [
        {
          enchantmentType: {
            type: String,
            required: true,
          },
          level: {
            type: Number,
            required: true,
            min: 1,
          },
          effect: {
            type: String,
            required: true,
          },
        },
      ],
      seasonalEffects: [
        {
          seasonId: {
            type: Schema.Types.ObjectId,
            ref: 'Season',
            required: true,
          },
          effectType: {
            type: String,
            required: true,
          },
          bonus: {
            type: Number,
            required: true,
          },
        },
      ],
    },
    ipfsHash: {
      type: String,
      required: true,
    },
    arweaveId: {
      type: String,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    moderationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    moderationNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
NFTSchema.index({ type: 1, rarity: 1 });
NFTSchema.index({ currentOwner: 1, isActive: 1 });
NFTSchema.index({ creator: 1, isActive: 1 });
NFTSchema.index({ isListed: 1, isActive: 1 });
NFTSchema.index({ 'listingDetails.price': 1 });

// Text indexes for search
NFTSchema.index({ 'metadata.name': 'text', 'metadata.description': 'text' });

// Virtual fields
NFTSchema.virtual('isOwnedByCreator').get(function() {
  return this.creator.toString() === this.currentOwner.toString();
});

NFTSchema.virtual('rarityScore').get(function() {
  const rarityScores = {
    [NFTRarity.COMMON]: 1,
    [NFTRarity.UNCOMMON]: 2,
    [NFTRarity.RARE]: 4,
    [NFTRarity.EPIC]: 8,
    [NFTRarity.LEGENDARY]: 16,
  };
  return rarityScores[this.rarity] || 1;
});

// Methods
NFTSchema.methods.calculateDurabilityPercentage = function() {
  return Math.round((this.gameProperties.currentDurability / this.gameProperties.maxDurability) * 100);
};

NFTSchema.methods.repair = function(repairPoints: number) {
  this.gameProperties.currentDurability = Math.min(
    this.gameProperties.maxDurability,
    this.gameProperties.currentDurability + repairPoints
  );
  return this.gameProperties.currentDurability;
};

NFTSchema.methods.use = function(durabilityLoss: number = 1) {
  this.gameProperties.currentDurability = Math.max(0, this.gameProperties.currentDurability - durabilityLoss);
  this.usage.totalTimesUsed += 1;
  return this.gameProperties.currentDurability;
};

NFTSchema.methods.addRating = function(userId: mongoose.Types.ObjectId, rating: number, comment?: string) {
  // Remove existing rating from this user
  this.usage.ratings = this.usage.ratings.filter(r => !r.user.equals(userId));
  
  // Add new rating
  this.usage.ratings.push({
    user: userId,
    rating,
    comment,
    ratedAt: new Date(),
  } as any);

  // Recalculate average
  const totalRating = this.usage.ratings.reduce((sum, r) => sum + r.rating, 0);
  this.usage.averageRating = totalRating / this.usage.ratings.length;
  
  return this.usage.averageRating;
};

NFTSchema.methods.addUsageEarnings = function(amount: number) {
  this.usage.totalEarnings += amount;
  return this.usage.totalEarnings;
};

// Static methods
NFTSchema.statics.findByType = function(type: NFTType) {
  return this.find({ type, isActive: true });
};

NFTSchema.statics.findByRarity = function(rarity: NFTRarity) {
  return this.find({ rarity, isActive: true });
};

NFTSchema.statics.findListed = function(options: { type?: NFTType; rarity?: NFTRarity; sortBy?: string; limit?: number } = {}) {
  const query: any = { isListed: true, isActive: true };
  
  if (options.type) query.type = options.type;
  if (options.rarity) query.rarity = options.rarity;
  
  let queryBuilder = this.find(query);
  
  if (options.sortBy === 'price_low') {
    queryBuilder = queryBuilder.sort({ 'listingDetails.price': 1 });
  } else if (options.sortBy === 'price_high') {
    queryBuilder = queryBuilder.sort({ 'listingDetails.price': -1 });
  } else if (options.sortBy === 'newest') {
    queryBuilder = queryBuilder.sort({ createdAt: -1 });
  } else if (options.sortBy === 'popular') {
    queryBuilder = queryBuilder.sort({ 'statistics.views': -1 });
  }
  
  if (options.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }
  
  return queryBuilder;
};

NFTSchema.statics.getTrendingNFTs = function(limit: number = 10) {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: ['$statistics.views', 0.1] },
            { $multiply: ['$statistics.likes', 2] },
            { $multiply: ['$statistics.shares', 5] },
            { $multiply: ['$statistics.totalSales', 10] },
          ],
        },
      },
    },
    { $sort: { trendingScore: -1 } },
    { $limit: limit },
  ]);
};

export const NFT = mongoose.model<INFT>('NFT', NFTSchema);
