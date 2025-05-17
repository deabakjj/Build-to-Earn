import mongoose, { Document, Schema } from 'mongoose';

export enum GuildRank {
  LEADER = 'LEADER',
  OFFICER = 'OFFICER',
  MEMBER = 'MEMBER',
  RECRUIT = 'RECRUIT'
}

export enum GuildStatus {
  ACTIVE = 'ACTIVE',
  RECRUITING = 'RECRUITING',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum GuildProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD'
}

export enum GuildEventType {
  BUILD = 'BUILD',
  RAID = 'RAID',
  SOCIAL = 'SOCIAL',
  TOURNAMENT = 'TOURNAMENT',
  MEETING = 'MEETING'
}

export interface IGuildMember {
  userId: mongoose.Types.ObjectId;
  username: string;
  rank: GuildRank;
  joinedAt: Date;
  lastActive: Date;
  contributions: {
    resourcesDonated: {
      wood: number;
      stone: number;
      iron: number;
      other: { resourceType: string; amount: number }[];
    };
    tokensDonated: {
      vxc: number;
      ptx: number;
    };
    projectsParticipated: number;
    eventsAttended: number;
    totalContributionScore: number;
  };
  permissions: {
    canInvite: boolean;
    canKick: boolean;
    canEditProjects: boolean;
    canManageResources: boolean;
    canEditSettings: boolean;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'LEFT' | 'KICKED' | 'BANNED';
  notes?: string;
}

export interface IGuildProject {
  projectId: string;
  name: string;
  description: string;
  type: 'BUILDING' | 'CITY' | 'MONUMENT' | 'INFRASTRUCTURE' | 'EVENT';
  status: GuildProjectStatus;
  creator: mongoose.Types.ObjectId;
  startDate: Date;
  expectedEndDate: Date;
  actualEndDate?: Date;
  
  // Project requirements
  requirements: {
    resources: {
      wood: number;
      stone: number;
      iron: number;
      special: { resourceType: string; amount: number }[];
    };
    manpower: number;
    estimatedTime: number; // in hours
    requiredSkills: { skill: string; minLevel: number }[];
  };
  
  // Project progress
  progress: {
    resourcesContributed: {
      wood: number;
      stone: number;
      iron: number;
      special: { resourceType: string; amount: number }[];
    };
    workHours: { userId: mongoose.Types.ObjectId; hours: number }[];
    percentageComplete: number;
    milestones: {
      name: string;
      description: string;
      targetDate: Date;
      isCompleted: boolean;
      completedAt?: Date;
    }[];
  };
  
  // Participants
  participants: {
    userId: mongoose.Types.ObjectId;
    role: 'MANAGER' | 'WORKER' | 'ADVISOR';
    contribution: number;
    joinedAt: Date;
  }[];
  
  metadata: {
    tags: string[];
    images: string[];
    blueprints?: string;
    coordinates?: {
      x: number;
      y: number;
      z: number;
    };
  };
}

export interface IGuildEvent {
  eventId: string;
  name: string;
  description: string;
  type: GuildEventType;
  organizer: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  location?: {
    worldId?: string;
    coordinates?: { x: number; y: number; z: number };
    description: string;
  };
  
  // Event details
  details: {
    maxParticipants?: number;
    registrationDeadline?: Date;
    requirements?: string[];
    rewards?: {
      type: 'TOKEN' | 'NFT' | 'RESOURCE' | 'EXPERIENCE';
      amount: number;
      itemId?: string;
    }[];
  };
  
  // Participants
  participants: {
    userId: mongoose.Types.ObjectId;
    registeredAt: Date;
    attendedAt?: Date;
    performance?: {
      score: number;
      notes: string;
    };
  }[];
  
  // Results
  results?: {
    outcome: string;
    highlights: string[];
    media: string[];
  };
}

export interface IGuild extends Document {
  guildId: string;
  name: string;
  tag: string; // Short guild identifier
  description: string;
  status: GuildStatus;
  level: number;
  experience: number;
  
  // Guild leadership
  leader: mongoose.Types.ObjectId;
  officers: mongoose.Types.ObjectId[];
  
  // Members
  members: IGuildMember[];
  memberCount: number;
  maxMembers: number;
  
  // Join requirements
  joinRequirements: {
    minimumLevel: number;
    applicationRequired: boolean;
    inviteOnly: boolean;
    requirements: {
      skill?: { name: string; minLevel: number };
      reputation?: { minScore: number };
      custom?: string;
    }[];
  };
  
  // Guild resources
  resources: {
    treasury: {
      vxc: number;
      ptx: number;
    };
    materials: {
      wood: number;
      stone: number;
      iron: number;
      rare: { resourceType: string; amount: number }[];
    };
    nfts: {
      communityItems: mongoose.Types.ObjectId[];
      landPlots: mongoose.Types.ObjectId[];
      vehicles: mongoose.Types.ObjectId[];
    };
  };
  
  // Projects and events
  projects: IGuildProject[];
  events: IGuildEvent[];
  
  // Guild perks and achievements
  perks: {
    activePerks: {
      name: string;
      description: string;
      effect: any;
      level: number;
      expiration?: Date;
    }[];
    unlockablePerks: {
      name: string;
      description: string;
      effect: any;
      cost: {
        vxc?: number;
        ptx?: number;
        experience?: number;
      };
      requirements: {
        level?: number;
        memberCount?: number;
        projectsCompleted?: number;
      };
    }[];
  };
  
  achievements: {
    achievementId: string;
    name: string;
    description: string;
    unlockedAt: Date;
    requirements: any;
  }[];
  
  // Guild settings
  settings: {
    isPublic: boolean;
    autoAcceptApplications: boolean;
    messageOfTheDay?: string;
    timezone: string;
    language: string;
    customRoles: {
      name: string;
      color: string;
      permissions: string[];
    }[];
  };
  
  // Statistics
  statistics: {
    totalProjects: number;
    completedProjects: number;
    totalEvents: number;
    totalResourcesContributed: number;
    averageMemberLevel: number;
    totalContributions: number;
    rank: number;
    leaderboardPosition: number;
  };
  
  // Relationships
  allies: {
    guildId: mongoose.Types.ObjectId;
    since: Date;
    type: 'ALLIANCE' | 'NEUTRAL' | 'RIVAL';
  }[];
  
  // Moderation
  moderation: {
    strikes: {
      reason: string;
      issuedBy: mongoose.Types.ObjectId;
      date: Date;
    }[];
    warningsCount: number;
    isSuspended: boolean;
    suspensionDetails?: {
      reason: string;
      until: Date;
      issuedBy: mongoose.Types.ObjectId;
    };
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  dissolvedAt?: Date;
  dissolvedBy?: mongoose.Types.ObjectId;
}

const GuildMemberSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  rank: {
    type: String,
    enum: Object.values(GuildRank),
    required: true,
    default: GuildRank.RECRUIT,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  contributions: {
    resourcesDonated: {
      wood: {
        type: Number,
        default: 0,
        min: 0,
      },
      stone: {
        type: Number,
        default: 0,
        min: 0,
      },
      iron: {
        type: Number,
        default: 0,
        min: 0,
      },
      other: [{
        resourceType: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      }],
    },
    tokensDonated: {
      vxc: {
        type: Number,
        default: 0,
        min: 0,
      },
      ptx: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    projectsParticipated: {
      type: Number,
      default: 0,
      min: 0,
    },
    eventsAttended: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalContributionScore: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  permissions: {
    canInvite: {
      type: Boolean,
      default: false,
    },
    canKick: {
      type: Boolean,
      default: false,
    },
    canEditProjects: {
      type: Boolean,
      default: false,
    },
    canManageResources: {
      type: Boolean,
      default: false,
    },
    canEditSettings: {
      type: Boolean,
      default: false,
    },
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'LEFT', 'KICKED', 'BANNED'],
    default: 'ACTIVE',
  },
  notes: String,
});

const GuildProjectSchema = new Schema({
  projectId: {
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
    enum: ['BUILDING', 'CITY', 'MONUMENT', 'INFRASTRUCTURE', 'EVENT'],
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(GuildProjectStatus),
    default: GuildProjectStatus.PLANNING,
    required: true,
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  expectedEndDate: {
    type: Date,
    required: true,
  },
  actualEndDate: Date,
  requirements: {
    resources: {
      wood: Number,
      stone: Number,
      iron: Number,
      special: [{
        resourceType: String,
        amount: Number,
      }],
    },
    manpower: Number,
    estimatedTime: Number,
    requiredSkills: [{
      skill: String,
      minLevel: Number,
    }],
  },
  progress: {
    resourcesContributed: {
      wood: { type: Number, default: 0 },
      stone: { type: Number, default: 0 },
      iron: { type: Number, default: 0 },
      special: [{
        resourceType: String,
        amount: Number,
      }],
    },
    workHours: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      hours: Number,
    }],
    percentageComplete: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    milestones: [{
      name: String,
      description: String,
      targetDate: Date,
      isCompleted: {
        type: Boolean,
        default: false,
      },
      completedAt: Date,
    }],
  },
  participants: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['MANAGER', 'WORKER', 'ADVISOR'],
      required: true,
    },
    contribution: {
      type: Number,
      default: 0,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  metadata: {
    tags: [String],
    images: [String],
    blueprints: String,
    coordinates: {
      x: Number,
      y: Number,
      z: Number,
    },
  },
});

const GuildEventSchema = new Schema({
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
  type: {
    type: String,
    enum: Object.values(GuildEventType),
    required: true,
  },
  organizer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
  location: {
    worldId: String,
    coordinates: {
      x: Number,
      y: Number,
      z: Number,
    },
    description: String,
  },
  details: {
    maxParticipants: Number,
    registrationDeadline: Date,
    requirements: [String],
    rewards: [{
      type: {
        type: String,
        enum: ['TOKEN', 'NFT', 'RESOURCE', 'EXPERIENCE'],
      },
      amount: Number,
      itemId: String,
    }],
  },
  participants: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    attendedAt: Date,
    performance: {
      score: Number,
      notes: String,
    },
  }],
  results: {
    outcome: String,
    highlights: [String],
    media: [String],
  },
});

const GuildSchema: Schema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    tag: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 6,
      uppercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: Object.values(GuildStatus),
      default: GuildStatus.RECRUITING,
      required: true,
      index: true,
    },
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
    leader: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    officers: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    members: [GuildMemberSchema],
    memberCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    maxMembers: {
      type: Number,
      default: 50,
      min: 10,
      max: 200,
    },
    joinRequirements: {
      minimumLevel: {
        type: Number,
        default: 1,
        min: 1,
      },
      applicationRequired: {
        type: Boolean,
        default: true,
      },
      inviteOnly: {
        type: Boolean,
        default: false,
      },
      requirements: [{
        skill: {
          name: String,
          minLevel: Number,
        },
        reputation: {
          minScore: Number,
        },
        custom: String,
      }],
    },
    resources: {
      treasury: {
        vxc: {
          type: Number,
          default: 0,
          min: 0,
        },
        ptx: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      materials: {
        wood: {
          type: Number,
          default: 0,
          min: 0,
        },
        stone: {
          type: Number,
          default: 0,
          min: 0,
        },
        iron: {
          type: Number,
          default: 0,
          min: 0,
        },
        rare: [{
          resourceType: String,
          amount: Number,
        }],
      },
      nfts: {
        communityItems: [{
          type: Schema.Types.ObjectId,
          ref: 'NFT',
        }],
        landPlots: [{
          type: Schema.Types.ObjectId,
          ref: 'NFT',
        }],
        vehicles: [{
          type: Schema.Types.ObjectId,
          ref: 'NFT',
        }],
      },
    },
    projects: [GuildProjectSchema],
    events: [GuildEventSchema],
    perks: {
      activePerks: [{
        name: String,
        description: String,
        effect: Schema.Types.Mixed,
        level: Number,
        expiration: Date,
      }],
      unlockablePerks: [{
        name: String,
        description: String,
        effect: Schema.Types.Mixed,
        cost: {
          vxc: Number,
          ptx: Number,
          experience: Number,
        },
        requirements: {
          level: Number,
          memberCount: Number,
          projectsCompleted: Number,
        },
      }],
    },
    achievements: [{
      achievementId: String,
      name: String,
      description: String,
      unlockedAt: Date,
      requirements: Schema.Types.Mixed,
    }],
    settings: {
      isPublic: {
        type: Boolean,
        default: true,
      },
      autoAcceptApplications: {
        type: Boolean,
        default: false,
      },
      messageOfTheDay: String,
      timezone: {
        type: String,
        default: 'UTC',
      },
      language: {
        type: String,
        default: 'en',
      },
      customRoles: [{
        name: String,
        color: String,
        permissions: [String],
      }],
    },
    statistics: {
      totalProjects: {
        type: Number,
        default: 0,
      },
      completedProjects: {
        type: Number,
        default: 0,
      },
      totalEvents: {
        type: Number,
        default: 0,
      },
      totalResourcesContributed: {
        type: Number,
        default: 0,
      },
      averageMemberLevel: {
        type: Number,
        default: 0,
      },
      totalContributions: {
        type: Number,
        default: 0,
      },
      rank: {
        type: Number,
        default: 0,
      },
      leaderboardPosition: {
        type: Number,
        default: 0,
      },
    },
    allies: [{
      guildId: {
        type: Schema.Types.ObjectId,
        ref: 'Guild',
      },
      since: Date,
      type: {
        type: String,
        enum: ['ALLIANCE', 'NEUTRAL', 'RIVAL'],
      },
    }],
    moderation: {
      strikes: [{
        reason: String,
        issuedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        date: Date,
      }],
      warningsCount: {
        type: Number,
        default: 0,
      },
      isSuspended: {
        type: Boolean,
        default: false,
      },
      suspensionDetails: {
        reason: String,
        until: Date,
        issuedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dissolvedAt: Date,
    dissolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
GuildSchema.index({ guildId: 1 });
GuildSchema.index({ name: 1 });
GuildSchema.index({ tag: 1 });
GuildSchema.index({ status: 1 });
GuildSchema.index({ level: -1 });
GuildSchema.index({ experience: -1 });
GuildSchema.index({ memberCount: -1 });
GuildSchema.index({ 'statistics.rank': 1 });

// Virtual fields
GuildSchema.virtual('nextLevelExp').get(function() {
  return this.level * 5000; // Fixed formula for guild level progression
});

GuildSchema.virtual('expProgress').get(function() {
  const nextLevelExp = this.level * 5000;
  const prevLevelExp = (this.level - 1) * 5000;
  const currentProgress = this.experience - prevLevelExp;
  const requiredProgress = nextLevelExp - prevLevelExp;
  return Math.min(100, Math.round((currentProgress / requiredProgress) * 100));
});

GuildSchema.virtual('isFull').get(function() {
  return this.memberCount >= this.maxMembers;
});

GuildSchema.virtual('activeMembers').get(function() {
  return this.members.filter(m => m.status === 'ACTIVE');
});

// Instance methods
GuildSchema.methods.calculateLevel = function() {
  this.level = Math.floor(this.experience / 5000) + 1;
  return this.level;
};

GuildSchema.methods.addExperience = function(exp: number) {
  this.experience += exp;
  const newLevel = this.calculateLevel();
  return { newLevel, experience: this.experience };
};

GuildSchema.methods.updateStatistics = function() {
  this.statistics.averageMemberLevel = this.members.reduce((sum, member) => sum + (member.contributions?.totalContributionScore || 0), 0) / this.memberCount;
  this.statistics.totalContributions = this.members.reduce((sum, member) => sum + (member.contributions?.totalContributionScore || 0), 0);
  
  // Update project/event statistics
  this.statistics.totalProjects = this.projects.length;
  this.statistics.completedProjects = this.projects.filter(p => p.status === GuildProjectStatus.COMPLETED).length;
  this.statistics.totalEvents = this.events.length;
  
  return this.save();
};

GuildSchema.methods.addMember = function(user: IGuildMember) {
  if (this.isFull) {
    throw new Error('Guild is full');
  }
  
  this.members.push(user);
  this.memberCount += 1;
  
  // Update active participants
  this.statistics.activeParticipants = this.members.filter(m => m.status === 'ACTIVE').length;
  
  return this.save();
};

GuildSchema.methods.removeMember = function(userId: mongoose.Types.ObjectId, reason: 'LEFT' | 'KICKED' | 'BANNED') {
  const memberIndex = this.members.findIndex(m => m.userId.equals(userId));
  if (memberIndex === -1) {
    throw new Error('Member not found');
  }
  
  this.members[memberIndex].status = reason;
  this.memberCount -= 1;
  
  // Update active participants
  this.statistics.activeParticipants = this.members.filter(m => m.status === 'ACTIVE').length;
  
  return this.save();
};

GuildSchema.methods.promoteOfficer = function(userId: mongoose.Types.ObjectId) {
  if (!this.officers.includes(userId)) {
    this.officers.push(userId);
  }
  
  const member = this.members.find(m => m.userId.equals(userId));
  if (member) {
    member.rank = GuildRank.OFFICER;
    member.permissions = {
      canInvite: true,
      canKick: true,
      canEditProjects: true,
      canManageResources: true,
      canEditSettings: false, // Only leader can edit settings
    };
  }
  
  return this.save();
};

GuildSchema.methods.transferLeadership = function(newLeaderId: mongoose.Types.ObjectId) {
  const currentLeader = this.leader;
  this.leader = newLeaderId;
  
  // Demote old leader to officer
  if (!this.officers.includes(currentLeader)) {
    this.officers.push(currentLeader);
  }
  
  // Remove new leader from officers if present
  this.officers = this.officers.filter(id => !id.equals(newLeaderId));
  
  // Update member ranks
  const oldLeaderMember = this.members.find(m => m.userId.equals(currentLeader));
  const newLeaderMember = this.members.find(m => m.userId.equals(newLeaderId));
  
  if (oldLeaderMember) {
    oldLeaderMember.rank = GuildRank.OFFICER;
  }
  
  if (newLeaderMember) {
    newLeaderMember.rank = GuildRank.LEADER;
    newLeaderMember.permissions = {
      canInvite: true,
      canKick: true,
      canEditProjects: true,
      canManageResources: true,
      canEditSettings: true,
    };
  }
  
  return this.save();
};

// Static methods
GuildSchema.statics.searchGuilds = function(query: {
  name?: string;
  tag?: string;
  status?: GuildStatus;
  minLevel?: number;
  maxLevel?: number;
  isRecruiting?: boolean;
  page?: number;
  limit?: number;
}) {
  const filter: any = {};
  
  if (query.name) filter.name = new RegExp(query.name, 'i');
  if (query.tag) filter.tag = new RegExp(query.tag, 'i');
  if (query.status) filter.status = query.status;
  if (query.minLevel) filter.level = { $gte: query.minLevel };
  if (query.maxLevel) {
    filter.level = { ...filter.level, $lte: query.maxLevel };
  }
  if (query.isRecruiting) {
    filter.status = GuildStatus.RECRUITING;
    filter.$expr = { $lt: ['$memberCount', '$maxMembers'] };
  }
  
  const skip = query.page && query.limit ? (query.page - 1) * query.limit : 0;
  
  return this.find(filter)
    .sort({ level: -1, experience: -1 })
    .skip(skip)
    .limit(query.limit || 20)
    .populate('leader', 'username level')
    .populate('officers', 'username level');
};

GuildSchema.statics.getTopGuilds = function(limit: number = 10) {
  return this.find({ status: { $ne: GuildStatus.SUSPENDED } })
    .sort({ experience: -1, level: -1 })
    .limit(limit)
    .populate('leader', 'username level');
};

GuildSchema.statics.findByMember = function(userId: mongoose.Types.ObjectId) {
  return this.findOne({
    'members.userId': userId,
    'members.status': 'ACTIVE',
  });
};

export const Guild = mongoose.model<IGuild>('Guild', GuildSchema);
