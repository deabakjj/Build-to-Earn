import mongoose, { Document, Schema } from 'mongoose';

export enum TransactionType {
  NFT_PURCHASE = 'NFT_PURCHASE',
  NFT_SALE = 'NFT_SALE',
  TOKEN_TRANSFER = 'TOKEN_TRANSFER',
  TOKEN_MINT = 'TOKEN_MINT',
  TOKEN_BURN = 'TOKEN_BURN',
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
  REWARD_CLAIM = 'REWARD_CLAIM',
  QUEST_REWARD = 'QUEST_REWARD',
  AUCTION_BID = 'AUCTION_BID',
  AUCTION_WIN = 'AUCTION_WIN',
  RENTAL_PAYMENT = 'RENTAL_PAYMENT',
  RESOURCE_PURCHASE = 'RESOURCE_PURCHASE',
  UPGRADE_PAYMENT = 'UPGRADE_PAYMENT',
  LAND_EXPANSION = 'LAND_EXPANSION',
  GUILD_FEE = 'GUILD_FEE',
  SEASONAL_PURCHASE = 'SEASONAL_PURCHASE',
  FEE_PAYMENT = 'FEE_PAYMENT',
  ROYALTY_PAYMENT = 'ROYALTY_PAYMENT'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED'
}

export enum CurrencyType {
  VXC = 'VXC',
  PTX = 'PTX',
  RESOURCE = 'RESOURCE'
}

export interface ITransaction extends Document {
  transactionId: string;
  blockchainTxHash: string;
  type: TransactionType;
  status: TransactionStatus;
  
  // Transaction parties
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  
  // Transaction amounts
  amounts: {
    currency: CurrencyType;
    value: number;
    resourceType?: string; // For resource transactions
  }[];
  
  // Transaction fees
  fees: {
    platformFee: number;
    networkFee: number;
    totalFee: number;
    royaltyFee?: number;
    royaltyRecipient?: mongoose.Types.ObjectId;
  };
  
  // Related items/entities
  relatedEntities: {
    nftId?: mongoose.Types.ObjectId;
    marketplaceListingId?: mongoose.Types.ObjectId;
    guildId?: mongoose.Types.ObjectId;
    seasonId?: mongoose.Types.ObjectId;
    questId?: mongoose.Types.ObjectId;
    auctionId?: mongoose.Types.ObjectId;
  };
  
  // Transaction details
  details: {
    description: string;
    price?: number;
    quantity?: number;
    itemDetails?: {
      itemType: string;
      itemName: string;
      itemId: string;
    };
    auctionDetails?: {
      bidAmount: number;
      isWinningBid: boolean;
    };
    rentalDetails?: {
      rentalPeriod: number;
      rentalRate: number;
    };
  };
  
  // Metadata
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    source: 'WEB' | 'MOBILE' | 'API' | 'GAME_CLIENT';
    language?: string;
    version?: string;
  };
  
  // Blockchain information
  blockchain: {
    network: string;
    contractAddress?: string;
    gasUsed?: number;
    gasPrice?: number;
    blockNumber?: number;
    blockTimestamp?: Date;
    confirmations?: number;
  };
  
  // Time tracking
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  
  // Error handling
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  
  // Related transactions
  parentTransactionId?: mongoose.Types.ObjectId;
  childTransactionIds?: mongoose.Types.ObjectId[];
  
  // Verification and security
  isVerified: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  
  // Analytics
  analytics: {
    processingTime?: number; // milliseconds
    retryCount?: number;
    slippageTolerance?: number;
    exchangeRate?: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    blockchainTxHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      required: true,
      default: TransactionStatus.PENDING,
      index: true,
    },
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amounts: [
      {
        currency: {
          type: String,
          enum: Object.values(CurrencyType),
          required: true,
        },
        value: {
          type: Number,
          required: true,
          min: 0,
        },
        resourceType: {
          type: String,
        },
      },
    ],
    fees: {
      platformFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      networkFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      royaltyFee: {
        type: Number,
        min: 0,
      },
      royaltyRecipient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    relatedEntities: {
      nftId: {
        type: Schema.Types.ObjectId,
        ref: 'NFT',
      },
      marketplaceListingId: {
        type: Schema.Types.ObjectId,
        ref: 'MarketplaceListing',
      },
      guildId: {
        type: Schema.Types.ObjectId,
        ref: 'Guild',
      },
      seasonId: {
        type: Schema.Types.ObjectId,
        ref: 'Season',
      },
      questId: {
        type: Schema.Types.ObjectId,
        ref: 'Quest',
      },
      auctionId: {
        type: Schema.Types.ObjectId,
        ref: 'Auction',
      },
    },
    details: {
      description: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        min: 0,
      },
      quantity: {
        type: Number,
        min: 0,
      },
      itemDetails: {
        itemType: String,
        itemName: String,
        itemId: String,
      },
      auctionDetails: {
        bidAmount: {
          type: Number,
          min: 0,
        },
        isWinningBid: {
          type: Boolean,
          default: false,
        },
      },
      rentalDetails: {
        rentalPeriod: {
          type: Number,
          min: 0,
        },
        rentalRate: {
          type: Number,
          min: 0,
        },
      },
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      source: {
        type: String,
        enum: ['WEB', 'MOBILE', 'API', 'GAME_CLIENT'],
        required: true,
      },
      language: String,
      version: String,
    },
    blockchain: {
      network: {
        type: String,
        required: true,
        default: 'CreataChain',
      },
      contractAddress: String,
      gasUsed: Number,
      gasPrice: Number,
      blockNumber: Number,
      blockTimestamp: Date,
      confirmations: {
        type: Number,
        default: 0,
      },
    },
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
    cancelledAt: Date,
    error: {
      code: String,
      message: String,
      details: Schema.Types.Mixed,
    },
    parentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    childTransactionIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    }],
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,
    analytics: {
      processingTime: Number,
      retryCount: {
        type: Number,
        default: 0,
      },
      slippageTolerance: Number,
      exchangeRate: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient queries
TransactionSchema.index({ from: 1, createdAt: -1 });
TransactionSchema.index({ to: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });
TransactionSchema.index({ blockchainTxHash: 1 });
TransactionSchema.index({ 'relatedEntities.nftId': 1 });
TransactionSchema.index({ 'relatedEntities.marketplaceListingId': 1 });

// Virtual fields
TransactionSchema.virtual('totalAmount').get(function() {
  return this.amounts.reduce((sum, amount) => {
    if (amount.currency === CurrencyType.VXC || amount.currency === CurrencyType.PTX) {
      return sum + amount.value;
    }
    return sum;
  }, 0);
});

TransactionSchema.virtual('isPending').get(function() {
  return this.status === TransactionStatus.PENDING || this.status === TransactionStatus.PROCESSING;
});

TransactionSchema.virtual('isCompleted').get(function() {
  return this.status === TransactionStatus.COMPLETED;
});

TransactionSchema.virtual('isReversible').get(function() {
  // Only certain types of transactions can be reversed
  const reversibleTypes = [
    TransactionType.NFT_PURCHASE,
    TransactionType.TOKEN_TRANSFER,
    TransactionType.AUCTION_BID,
  ];
  return reversibleTypes.includes(this.type) && this.isCompleted && !this.completedAt;
});

// Instance methods
TransactionSchema.methods.complete = function() {
  this.status = TransactionStatus.COMPLETED;
  this.completedAt = new Date();
  if (this.processedAt) {
    this.analytics.processingTime = this.completedAt.getTime() - this.processedAt.getTime();
  }
  return this.save();
};

TransactionSchema.methods.fail = function(error: { code: string; message: string; details?: any }) {
  this.status = TransactionStatus.FAILED;
  this.failedAt = new Date();
  this.error = error;
  return this.save();
};

TransactionSchema.methods.cancel = function(reason?: string) {
  this.status = TransactionStatus.CANCELLED;
  this.cancelledAt = new Date();
  if (reason) {
    this.error = { code: 'CANCELLED', message: reason };
  }
  return this.save();
};

TransactionSchema.methods.reverse = function(reason: string) {
  if (!this.isReversible) {
    throw new Error('This transaction cannot be reversed');
  }
  
  this.status = TransactionStatus.REVERSED;
  this.error = { code: 'REVERSED', message: reason };
  return this.save();
};

TransactionSchema.methods.incrementRetryCount = function() {
  this.analytics.retryCount = (this.analytics.retryCount || 0) + 1;
  return this.save();
};

// Static methods
TransactionSchema.statics.findByUser = function(userId: string, options: {
  type?: TransactionType;
  status?: TransactionStatus;
  direction?: 'sent' | 'received' | 'both';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  page?: number;
} = {}) {
  const query: any = {};
  
  if (options.direction === 'sent') {
    query.from = userId;
  } else if (options.direction === 'received') {
    query.to = userId;
  } else {
    query.$or = [{ from: userId }, { to: userId }];
  }
  
  if (options.type) query.type = options.type;
  if (options.status) query.status = options.status;
  
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = options.startDate;
    if (options.endDate) query.createdAt.$lte = options.endDate;
  }
  
  const skip = options.page && options.limit ? (options.page - 1) * options.limit : 0;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(options.limit || 50)
    .populate('from to')
    .populate('relatedEntities.nftId');
};

TransactionSchema.statics.findByBlockchainTx = function(txHash: string) {
  return this.findOne({ blockchainTxHash: txHash });
};

TransactionSchema.statics.findPending = function() {
  return this.find({
    status: { $in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING] }
  });
};

TransactionSchema.statics.getTransactionStats = function(timeframe: 'day' | 'week' | 'month' = 'day') {
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
        createdAt: { $gte: startDate },
        status: TransactionStatus.COMPLETED,
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalVolume: { $sum: '$fees.totalFee' },
        avgProcessingTime: { $avg: '$analytics.processingTime' },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

TransactionSchema.statics.getTopTransactions = function(
  limit: number = 10,
  timeframe: 'day' | 'week' | 'month' | 'all' = 'week'
) {
  const query: any = { status: TransactionStatus.COMPLETED };
  
  if (timeframe !== 'all') {
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
    
    query.createdAt = { $gte: startDate };
  }
  
  return this.find(query)
    .sort({ 'fees.totalFee': -1 })
    .limit(limit)
    .populate('from to')
    .populate('relatedEntities.nftId');
};

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
