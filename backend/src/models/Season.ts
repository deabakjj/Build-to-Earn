import mongoose, { Document, Schema } from 'mongoose';

export enum SeasonStatus {
  DRAFT = 'DRAFT',
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum QuestType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  SEASONAL = 'SEASONAL'
}

export enum RewardType {
  TOKEN = 'TOKEN',
  NFT = 'NFT',
  BADGE = 'BADGE',
  TITLE = 'TITLE',
  COSMETIC = 'COSMETIC',
  RESOURCE = 'RESOURCE',
  EXPERIENCE = 'EXPERIENCE'
}

export interface ISeasonQuest {
  questId: string;
  name: string;
  description: string;
  type: QuestType;
  requirements: {
    itemType?: string;
    action: string;
    target: number;
    conditions?: any;
  };
  rewards: {
    type: RewardType;
    amount: number;
    itemId?: string;
    metadata?: any;
  }[];
  isRepeatable: boolean;
  cooldownHours?: number;
  prerequisiteQuests?: string[];
  isActive: boolean;
  completionCount: number;
}

export interface ISeasonReward {
  level: number;
  rewards: {
    type: RewardType;
    amount: number;
    itemId?: string;
    metadata?: any;
  }[];
  requiredExp: number;
  isClaimed: boolean;
  claimedBy: mongoose.Types.ObjectId[];
}

export interface ISeasonEvent {
  eventId: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  eventType: 'TOURNAMENT' | 'QUEST' | 'SOCIAL' | 'CREATIVE' | 'SPECIAL';
  metadata: {
    rules?: string[];
    conditions?: any;
    specialEffects?: any;
  };
  rewards: ISeasonReward[];
  participants: {
    userId: mongoose.Types.ObjectId;
    joinedAt: Date;
    score?: number;
  }[];
  isActive: boolean;
}

export interface ISeason extends Document {
  seasonId: string;
  name: string;
  description: string;
  theme: string;
  isActive: boolean;
  status: SeasonStatus;
  
  // Season duration
  startDate: Date;
  endDate: Date;
  announcementDate?: Date;
  
  // Season details
  metadata: {
    theme: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    assets: {
      banner: string;
      logo: string;
      backgroundMusic?: string;
      trailer?: string;
    };
    specialEffects: {
      weather?: string;
      particles?: string[];
      lighting?: string;
    };
    tags: string[];
  };
  
  // Season content
  quests: ISeasonQuest[];
  events: ISeasonEvent[];
  
  // Season rewards and progression
  rewards: {
    levels: ISeasonReward[];
    milestones: {
      milestone: string;
      requiredProgress: number;
      rewards: {
        type: RewardType;
        amount: number;
        itemId?: string;
        metadata?: any;
      }[];
    }[];
    exclusiveItems: {
      itemId: string;
      itemType: string;
      metadata: any;
      availableFrom?: Date;
      availableUntil?: Date;
    }[];
  };
  
  // Season mechanics
  mechanics: {
    expMultiplier: number;
    resourceBonus: number;
    specialMechanics: {
      name: string;
      description: string;
      effects: any;
    }[];
  };
  
  // Season statistics
  statistics: {
    totalParticipants: number;
    activeParticipants: number;
    completionStats: {
      questsCompleted: number;
      eventsParticipated: number;
      totalExpEarned: number;
      totalRewardsGiven: number;
    };
    leaderboard: {
      userId: mongoose.Types.ObjectId;
      username: string;
      seasonExp: number;
      currentLevel: number;
      rank: number;
      updatedAt: Date;
    }[];
  };
  
  // Season pass (premium feature)
  premiumPass: {
    isAvailable: boolean;
    price: {
      vxc?: number;
      ptx?: number;
      realMoney?: {
        usd: number;
        currency: string;
      };
    };
    exclusiveRewards: ISeasonReward[];
    holders: {
      userId: mongoose.Types.ObjectId;
      purchasedAt: Date;
      price: number;
      paymentMethod: string;
    }[];
  };
  
  // Content creation
  userContent: {
    featuredCreations: {
      creatorId: mongoose.Types.ObjectId;
      nftId: mongoose.Types.ObjectId;
      featuredAt: Date;
      description?: string;
    }[];
    contestThemes: {
      theme: string;
      startDate: Date;
      endDate: Date;
      prizes: ISeasonReward[];
      submissions: {
        userId: mongoose.Types.ObjectId;
        nftId: mongoose.Types.ObjectId;
        submittedAt: Date;
        votes: number;
      }[];
    }[];
  };
  
  // Season rollover
  rollover: {
    carryOverRewards: boolean;
    carryOverProgress: boolean;
    nextSeasonId?: mongoose.Types.ObjectId;
    unclaimedRewards: {
      userId: mongoose.Types.ObjectId;
      rewards: any[];
    }[];
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
}

const SeasonQuestSchema = new Schema({
  questId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(QuestType),
    required: true,
  },
  requirements: {
    itemType: String,
    action: {
      type: String,
      required: true,
    },
    target: {
      type: Number,
      required: true,
      min: 1,
    },
    conditions: Schema.Types.Mixed,
  },
  rewards: [{
    type: {
      type: String,
      enum: Object.values(RewardType),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    itemId: String,
    metadata: Schema.Types.Mixed,
  }],
  isRepeatable: {
    type: Boolean,
    default: false,
  },
  cooldownHours: {
    type: Number,
    min: 0,
  },
  prerequisiteQuests: [String],
  isActive: {
    type: Boolean,
    default: true,
  },
  completionCount: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const SeasonRewardSchema = new Schema({
  level: {
    type: Number,
    required: true,
    min: 1,
  },
  rewards: [{
    type: {
      type: String,
      enum: Object.values(RewardType),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    itemId: String,
    metadata: Schema.Types.Mixed,
  }],
  requiredExp: {
    type: Number,
    required: true,
    min: 0,
  },
  isClaimed: {
    type: Boolean,
    default: false,
  },
  claimedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
});

const SeasonEventSchema = new Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  eventType: {
    type: String,
    enum: ['TOURNAMENT', 'QUEST', 'SOCIAL', 'CREATIVE', 'SPECIAL'],
    required: true,
  },
  metadata: {
    rules: [String],
    conditions: Schema.Types.Mixed,
    specialEffects: Schema.Types.Mixed,
  },
  rewards: [SeasonRewardSchema],
  participants: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    score: Number,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
});

const SeasonSchema: Schema = new Schema(
  {
    seasonId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    theme: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SeasonStatus),
      default: SeasonStatus.DRAFT,
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    announcementDate: Date,
    metadata: {
      theme: {
        type: String,
        required: true,
      },
      colors: {
        primary: {
          type: String,
          required: true,
        },
        secondary: {
          type: String,
          required: true,
        },
        accent: {
          type: String,
          required: true,
        },
      },
      assets: {
        banner: {
          type: String,
          required: true,
        },
        logo: {
          type: String,
          required: true,
        },
        backgroundMusic: String,
        trailer: String,
      },
      specialEffects: {
        weather: String,
        particles: [String],
        lighting: String,
      },
      tags: [String],
    },
    quests: [SeasonQuestSchema],
    events: [SeasonEventSchema],
    rewards: {
      levels: [SeasonRewardSchema],
      milestones: [{
        milestone: {
          type: String,
          required: true,
        },
        requiredProgress: {
          type: Number,
          required: true,
          min: 0,
        },
        rewards: [{
          type: {
            type: String,
            enum: Object.values(RewardType),
            required: true,
          },
          amount: {
            type: Number,
            required: true,
            min: 0,
          },
          itemId: String,
          metadata: Schema.Types.Mixed,
        }],
      }],
      exclusiveItems: [{
        itemId: {
          type: String,
          required: true,
        },
        itemType: {
          type: String,
          required: true,
        },
        metadata: Schema.Types.Mixed,
        availableFrom: Date,
        availableUntil: Date,
      }],
    },
    mechanics: {
      expMultiplier: {
        type: Number,
        default: 1,
        min: 0.1,
      },
      resourceBonus: {
        type: Number,
        default: 1,
        min: 0,
      },
      specialMechanics: [{
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        effects: Schema.Types.Mixed,
      }],
    },
    statistics: {
      totalParticipants: {
        type: Number,
        default: 0,
        min: 0,
      },
      activeParticipants: {
        type: Number,
        default: 0,
        min: 0,
      },
      completionStats: {
        questsCompleted: {
          type: Number,
          default: 0,
          min: 0,
        },
        eventsParticipated: {
          type: Number,
          default: 0,
          min: 0,
        },
        totalExpEarned: {
          type: Number,
          default: 0,
          min: 0,
        },
        totalRewardsGiven: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      leaderboard: [{
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        username: {
          type: String,
          required: true,
        },
        seasonExp: {
          type: Number,
          required: true,
          min: 0,
        },
        currentLevel: {
          type: Number,
          required: true,
          min: 1,
        },
        rank: {
          type: Number,
          required: true,
          min: 1,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      }],
    },
    premiumPass: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      price: {
        vxc: {
          type: Number,
          min: 0,
        },
        ptx: {
          type: Number,
          min: 0,
        },
        realMoney: {
          usd: {
            type: Number,
            min: 0,
          },
          currency: {
            type: String,
            default: 'USD',
          },
        },
      },
      exclusiveRewards: [SeasonRewardSchema],
      holders: [{
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        purchasedAt: {
          type: Date,
          default: Date.now,
        },
        price: {
          type: Number,
          required: true,
        },
        paymentMethod: {
          type: String,
          required: true,
        },
      }],
    },
    userContent: {
      featuredCreations: [{
        creatorId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        nftId: {
          type: Schema.Types.ObjectId,
          ref: 'NFT',
          required: true,
        },
        featuredAt: {
          type: Date,
          default: Date.now,
        },
        description: String,
      }],
      contestThemes: [{
        theme: {
          type: String,
          required: true,
        },
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        prizes: [SeasonRewardSchema],
        submissions: [{
          userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          nftId: {
            type: Schema.Types.ObjectId,
            ref: 'NFT',
            required: true,
          },
          submittedAt: {
            type: Date,
            default: Date.now,
          },
          votes: {
            type: Number,
            default: 0,
            min: 0,
          },
        }],
      }],
    },
    rollover: {
      carryOverRewards: {
        type: Boolean,
        default: false,
      },
      carryOverProgress: {
        type: Boolean,
        default: false,
      },
      nextSeasonId: {
        type: Schema.Types.ObjectId,
        ref: 'Season',
      },
      unclaimedRewards: [{
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        rewards: Schema.Types.Mixed,
      }],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
SeasonSchema.index({ seasonId: 1 });
SeasonSchema.index({ status: 1, isActive: 1 });
SeasonSchema.index({ startDate: 1, endDate: 1 });
SeasonSchema.index({ 'quests.questId': 1 });
SeasonSchema.index({ 'events.eventId': 1 });
SeasonSchema.index({ 'statistics.leaderboard.userId': 1 });

// Virtual fields
SeasonSchema.virtual('timeRemaining').get(function() {
  if (this.status !== SeasonStatus.ACTIVE) return null;
  
  const now = new Date();
  const timeLeft = this.endDate.getTime() - now.getTime();
  
  if (timeLeft <= 0) return null;
  
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
});

SeasonSchema.virtual('totalRewards').get(function() {
  const levelRewards = this.rewards.levels.length;
  const milestoneRewards = this.rewards.milestones.length;
  const exclusiveItems = this.rewards.exclusiveItems.length;
  const premiumRewards = this.premiumPass.exclusiveRewards.length;
  
  return levelRewards + milestoneRewards + exclusiveItems + premiumRewards;
});

SeasonSchema.virtual('isUpcoming').get(function() {
  return this.status === SeasonStatus.UPCOMING && new Date() < this.startDate;
});

SeasonSchema.virtual('isEnded').get(function() {
  return this.status === SeasonStatus.COMPLETED || new Date() > this.endDate;
});

// Instance methods
SeasonSchema.methods.activate = function() {
  if (this.status !== SeasonStatus.UPCOMING) {
    throw new Error('Only upcoming seasons can be activated');
  }
  
  this.status = SeasonStatus.ACTIVE;
  this.isActive = true;
  return this.save();
};

SeasonSchema.methods.complete = function() {
  if (this.status !== SeasonStatus.ACTIVE) {
    throw new Error('Only active seasons can be completed');
  }
  
  this.status = SeasonStatus.COMPLETED;
  this.isActive = false;
  
  // Process unfinished rewards and rollover logic
  this.processRollover();
  
  return this.save();
};

SeasonSchema.methods.processRollover = function() {
  if (!this.rollover.carryOverRewards && !this.rollover.carryOverProgress) {
    return;
  }
  
  // Process unclaimed rewards
  const leaderboard = this.statistics.leaderboard;
  leaderboard.forEach(entry => {
    const userLevel = entry.currentLevel;
    const potentialRewards = this.rewards.levels.filter(r => r.level <= userLevel && !r.claimedBy.includes(entry.userId));
    
    if (potentialRewards.length > 0 && this.rollover.carryOverRewards) {
      const unclaimedEntry = this.rollover.unclaimedRewards.find(ur => ur.userId.equals(entry.userId));
      if (unclaimedEntry) {
        unclaimedEntry.rewards.push(...potentialRewards);
      } else {
        this.rollover.unclaimedRewards.push({
          userId: entry.userId,
          rewards: potentialRewards,
        });
      }
    }
  });
};

SeasonSchema.methods.updateLeaderboard = function(userId: mongoose.Types.ObjectId, username: string, expGained: number) {
  let entry = this.statistics.leaderboard.find(e => e.userId.equals(userId));
  
  if (!entry) {
    entry = {
      userId,
      username,
      seasonExp: 0,
      currentLevel: 1,
      rank: this.statistics.leaderboard.length + 1,
      updatedAt: new Date(),
    };
    this.statistics.leaderboard.push(entry);
  }
  
  entry.seasonExp += expGained;
  entry.currentLevel = Math.floor(entry.seasonExp / 1000) + 1;
  entry.updatedAt = new Date();
  
  // Recalculate rankings
  this.statistics.leaderboard.sort((a, b) => b.seasonExp - a.seasonExp);
  this.statistics.leaderboard.forEach((e, index) => {
    e.rank = index + 1;
  });
  
  return this.save();
};

SeasonSchema.methods.getActiveQuests = function(questType?: QuestType) {
  let activeQuests = this.quests.filter(q => q.isActive);
  
  if (questType) {
    activeQuests = activeQuests.filter(q => q.type === questType);
  }
  
  return activeQuests;
};

SeasonSchema.methods.getPlayerProgress = function(userId: mongoose.Types.ObjectId) {
  const playerEntry = this.statistics.leaderboard.find(e => e.userId.equals(userId));
  if (!playerEntry) return null;
  
  const unclaimedRewards = this.rewards.levels.filter(r => r.level <= playerEntry.currentLevel && !r.claimedBy.includes(userId));
  const nextReward = this.rewards.levels.find(r => r.level > playerEntry.currentLevel);
  
  return {
    level: playerEntry.currentLevel,
    exp: playerEntry.seasonExp,
    rank: playerEntry.rank,
    unclaimedRewards,
    nextReward,
    premiumPass: this.premiumPass.holders.some(h => h.userId.equals(userId)),
  };
};

// Static methods
SeasonSchema.statics.getActiveSeason = function() {
  return this.findOne({ status: SeasonStatus.ACTIVE });
};

SeasonSchema.statics.getUpcomingSeason = function() {
  return this.findOne({ status: SeasonStatus.UPCOMING }).sort({ startDate: 1 });
};

SeasonSchema.statics.searchSeasons = function(query: {
  status?: SeasonStatus;
  theme?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}) {
  const filter: any = {};
  
  if (query.status) filter.status = query.status;
  if (query.theme) filter.theme = new RegExp(query.theme, 'i');
  if (query.startDate) filter.startDate = { $gte: query.startDate };
  if (query.endDate) filter.endDate = { $lte: query.endDate };
  
  if (query.search) {
    filter.$or = [
      { name: new RegExp(query.search, 'i') },
      { description: new RegExp(query.search, 'i') },
      { 'metadata.tags': { $in: [new RegExp(query.search, 'i')] } },
    ];
  }
  
  return this.find(filter).sort({ startDate: -1 });
};

export const Season = mongoose.model<ISeason>('Season', SeasonSchema);
