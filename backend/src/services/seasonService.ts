import Season, { ISeason } from '../models/Season';
import User, { IUser } from '../models/User';
import NFT, { INFT } from '../models/NFT';
import blockchainService from './blockchainService';
import { ethers } from 'ethers';

interface SeasonParams {
  name: string;
  description: string;
  theme: 'winter' | 'spring' | 'summer' | 'autumn' | 'space' | 'underwater' | 'fantasy' | 'cyberpunk' | 'custom';
  startDate: Date;
  endDate: Date;
  rewards: {
    vxcPool: string;
    ptxPool: string;
    exclusiveNFTs: string[];
    tierRewards: {
      bronze: { minPoints: number; rewards: any };
      silver: { minPoints: number; rewards: any };
      gold: { minPoints: number; rewards: any };
      platinum: { minPoints: number; rewards: any };
      diamond: { minPoints: number; rewards: any };
    };
  };
  quests: {
    daily: Array<{
      id: string;
      name: string;
      description: string;
      points: number;
      requirements: any;
    }>;
    weekly: Array<{
      id: string;
      name: string;
      description: string;
      points: number;
      requirements: any;
    }>;
    seasonal: Array<{
      id: string;
      name: string;
      description: string;
      points: number;
      requirements: any;
    }>;
  };
  events: Array<{
    id: string;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    rewards: any;
  }>;
}

interface SeasonProgress {
  userId: string;
  seasonId: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  completedQuests: {
    daily: string[];
    weekly: string[];
    seasonal: string[];
  };
  claimedRewards: string[];
}

interface QuestProgress {
  userId: string;
  seasonId: string;
  questId: string;
  progress: any;
  completed: boolean;
  claimedAt?: Date;
}

class SeasonService {
  /**
   * Create a new season
   */
  async createSeason(params: SeasonParams): Promise<ISeason> {
    // Validate dates
    if (params.endDate <= params.startDate) {
      throw new Error('End date must be after start date');
    }

    // Check for overlapping seasons
    const overlappingSeason = await Season.findOne({
      $or: [
        { 
          startDate: { $lte: params.endDate },
          endDate: { $gte: params.startDate }
        }
      ],
      status: { $ne: 'ended' }
    });

    if (overlappingSeason) {
      throw new Error('Season dates overlap with existing season');
    }

    // Create season
    const season = await Season.create({
      ...params,
      status: 'upcoming'
    });

    // Deploy season rewards contract
    await blockchainService.deploySeasonRewards({
      seasonId: season._id.toString(),
      vxcPool: ethers.utils.parseEther(params.rewards.vxcPool),
      ptxPool: ethers.utils.parseEther(params.rewards.ptxPool)
    });

    // Schedule season start/end
    this.scheduleSeasonEvents(season);

    return season;
  }

  /**
   * Start a season
   */
  async startSeason(seasonId: string): Promise<ISeason> {
    const season = await Season.findById(seasonId);
    if (!season) {
      throw new Error('Season not found');
    }

    if (season.status !== 'upcoming') {
      throw new Error('Season is not in upcoming status');
    }

    if (new Date() < season.startDate) {
      throw new Error('Season start date has not been reached');
    }

    // Update status
    season.status = 'active';
    season.actualStartDate = new Date();
    await season.save();

    // Activate quests and events
    await this.activateSeasonContent(season);

    // Notify all users
    await this.notifySeasonStart(season);

    return season;
  }

  /**
   * End a season
   */
  async endSeason(seasonId: string): Promise<ISeason> {
    const season = await Season.findById(seasonId);
    if (!season) {
      throw new Error('Season not found');
    }

    if (season.status !== 'active') {
      throw new Error('Season is not active');
    }

    // Update status
    season.status = 'ended';
    season.actualEndDate = new Date();
    await season.save();

    // Distribute final rewards
    await this.distributeFinalRewards(season);

    // Archive season data
    await this.archiveSeasonData(season);

    return season;
  }

  /**
   * Join current season
   */
  async joinSeason(userId: string): Promise<SeasonProgress> {
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) {
      throw new Error('No active season');
    }

    // Check if user already joined
    const existingProgress = await this.getUserSeasonProgress(userId, currentSeason._id);
    if (existingProgress) {
      throw new Error('Already joined this season');
    }

    // Create progress entry
    const progress: SeasonProgress = {
      userId,
      seasonId: currentSeason._id,
      points: 0,
      tier: 'bronze',
      completedQuests: {
        daily: [],
        weekly: [],
        seasonal: []
      },
      claimedRewards: []
    };

    // Save progress (using your preferred storage method)
    await this.saveSeasonProgress(progress);

    return progress;
  }

  /**
   * Complete a quest
   */
  async completeQuest(params: {
    userId: string;
    seasonId: string;
    questId: string;
    questType: 'daily' | 'weekly' | 'seasonal';
  }): Promise<QuestProgress> {
    const { userId, seasonId, questId, questType } = params;

    const season = await Season.findById(seasonId);
    if (!season || season.status !== 'active') {
      throw new Error('Season not found or not active');
    }

    // Find quest
    const quest = season.quests[questType].find(q => q.id === questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    // Get user progress
    const progress = await this.getUserSeasonProgress(userId, seasonId);
    if (!progress) {
      throw new Error('User has not joined this season');
    }

    // Check if quest already completed
    if (progress.completedQuests[questType].includes(questId)) {
      throw new Error('Quest already completed');
    }

    // Validate quest completion
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isCompleted = await this.validateQuestCompletion(quest, user);
    if (!isCompleted) {
      throw new Error('Quest requirements not met');
    }

    // Update progress
    progress.completedQuests[questType].push(questId);
    progress.points += quest.points;

    // Check tier progression
    progress.tier = this.calculateTier(progress.points, season.rewards.tierRewards);

    await this.saveSeasonProgress(progress);

    // Grant quest rewards
    await this.grantQuestRewards(userId, quest);

    // Create quest progress record
    const questProgress: QuestProgress = {
      userId,
      seasonId,
      questId,
      progress: {},
      completed: true,
      claimedAt: new Date()
    };

    return questProgress;
  }

  /**
   * Claim tier rewards
   */
  async claimTierRewards(userId: string, seasonId: string, tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'): Promise<void> {
    const season = await Season.findById(seasonId);
    if (!season) {
      throw new Error('Season not found');
    }

    const progress = await this.getUserSeasonProgress(userId, seasonId);
    if (!progress) {
      throw new Error('User has not joined this season');
    }

    // Check if user has reached the tier
    const tierIndex = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(tier);
    const currentTierIndex = ['bronze', 'silver', 'gold', 'platinum', 'diamond'].indexOf(progress.tier);

    if (currentTierIndex < tierIndex) {
      throw new Error('Tier not reached');
    }

    // Check if rewards already claimed
    if (progress.claimedRewards.includes(tier)) {
      throw new Error('Tier rewards already claimed');
    }

    // Grant rewards
    const tierReward = season.rewards.tierRewards[tier];
    await this.grantTierRewards(userId, tierReward);

    // Update claimed rewards
    progress.claimedRewards.push(tier);
    await this.saveSeasonProgress(progress);
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(seasonId: string, options: {
    page?: number;
    limit?: number;
    guild?: string;
  }): Promise<{
    leaderboard: Array<{ user: IUser; points: number; rank: number; tier: string }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 50, guild } = options;

    // Get all season progress
    let seasonProgress = await this.getAllSeasonProgress(seasonId);

    // Filter by guild if specified
    if (guild) {
      const guildUsers = await User.find({ guild }).select('_id');
      const guildUserIds = guildUsers.map(u => u._id.toString());
      seasonProgress = seasonProgress.filter(p => guildUserIds.includes(p.userId));
    }

    // Sort by points
    seasonProgress.sort((a, b) => b.points - a.points);

    // Paginate
    const skip = (page - 1) * limit;
    const total = seasonProgress.length;
    const paginatedProgress = seasonProgress.slice(skip, skip + limit);

    // Populate user data
    const leaderboard = await Promise.all(
      paginatedProgress.map(async (progress, index) => {
        const user = await User.findById(progress.userId).select('username avatar level guild');
        return {
          user: user!,
          points: progress.points,
          rank: skip + index + 1,
          tier: progress.tier
        };
      })
    );

    return {
      leaderboard,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get season calendar
   */
  async getSeasonCalendar(month?: number, year?: number): Promise<{
    current: ISeason | null;
    upcoming: ISeason[];
    past: ISeason[];
    events: Array<{
      date: Date;
      type: 'season_start' | 'season_end' | 'event_start' | 'event_end';
      title: string;
      description: string;
    }>;
  }> {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0);

    // Get seasons
    const current = await Season.findOne({ status: 'active' });
    const upcoming = await Season.find({ status: 'upcoming' }).sort({ startDate: 1 });
    const past = await Season.find({ status: 'ended' }).sort({ endDate: -1 }).limit(5);

    // Collect all events
    const events: Array<{
      date: Date;
      type: 'season_start' | 'season_end' | 'event_start' | 'event_end';
      title: string;
      description: string;
    }> = [];

    // Add season start/end events
    const seasons = [current, ...upcoming, ...past].filter(Boolean) as ISeason[];
    for (const season of seasons) {
      if (season.startDate >= startOfMonth && season.startDate <= endOfMonth) {
        events.push({
          date: season.startDate,
          type: 'season_start',
          title: `${season.name} Begins`,
          description: season.description
        });
      }

      if (season.endDate >= startOfMonth && season.endDate <= endOfMonth) {
        events.push({
          date: season.endDate,
          type: 'season_end',
          title: `${season.name} Ends`,
          description: 'Final chance to claim rewards!'
        });
      }

      // Add season events
      if (season.events) {
        for (const event of season.events) {
          if (event.startDate >= startOfMonth && event.startDate <= endOfMonth) {
            events.push({
              date: event.startDate,
              type: 'event_start',
              title: event.name,
              description: event.description
            });
          }

          if (event.endDate >= startOfMonth && event.endDate <= endOfMonth) {
            events.push({
              date: event.endDate,
              type: 'event_end',
              title: `${event.name} Ends`,
              description: 'Event concludes'
            });
          }
        }
      }
    }

    // Sort events by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      current,
      upcoming,
      past,
      events
    };
  }

  /**
   * Get season statistics
   */
  async getSeasonStats(seasonId: string): Promise<{
    totalParticipants: number;
    averagePoints: number;
    topPlayers: Array<{ username: string; points: number; tier: string }>;
    questCompletion: {
      daily: { [key: string]: number };
      weekly: { [key: string]: number };
      seasonal: { [key: string]: number };
    };
    tierDistribution: { [key: string]: number };
    rewardsClaimed: { [key: string]: number };
  }> {
    const season = await Season.findById(seasonId);
    if (!season) {
      throw new Error('Season not found');
    }

    const allProgress = await this.getAllSeasonProgress(seasonId);
    const totalParticipants = allProgress.length;

    // Calculate average points
    const totalPoints = allProgress.reduce((sum, p) => sum + p.points, 0);
    const averagePoints = totalParticipants > 0 ? totalPoints / totalParticipants : 0;

    // Get top players
    const topPlayers = await Promise.all(
      allProgress
        .sort((a, b) => b.points - a.points)
        .slice(0, 10)
        .map(async progress => {
          const user = await User.findById(progress.userId).select('username');
          return {
            username: user?.username || 'Unknown',
            points: progress.points,
            tier: progress.tier
          };
        })
    );

    // Calculate quest completion rates
    const questCompletion = {
      daily: {} as { [key: string]: number },
      weekly: {} as { [key: string]: number },
      seasonal: {} as { [key: string]: number }
    };

    // Initialize quest completion tracking
    season.quests.daily.forEach(q => questCompletion.daily[q.id] = 0);
    season.quests.weekly.forEach(q => questCompletion.weekly[q.id] = 0);
    season.quests.seasonal.forEach(q => questCompletion.seasonal[q.id] = 0);

    // Count completions
    allProgress.forEach(progress => {
      progress.completedQuests.daily.forEach(qId => {
        if (questCompletion.daily[qId] !== undefined) {
          questCompletion.daily[qId]++;
        }
      });
      progress.completedQuests.weekly.forEach(qId => {
        if (questCompletion.weekly[qId] !== undefined) {
          questCompletion.weekly[qId]++;
        }
      });
      progress.completedQuests.seasonal.forEach(qId => {
        if (questCompletion.seasonal[qId] !== undefined) {
          questCompletion.seasonal[qId]++;
        }
      });
    });

    // Calculate tier distribution
    const tierDistribution = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0
    };

    allProgress.forEach(progress => {
      tierDistribution[progress.tier]++;
    });

    // Calculate rewards claimed
    const rewardsClaimed = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0
    };

    allProgress.forEach(progress => {
      progress.claimedRewards.forEach(tier => {
        if (rewardsClaimed[tier] !== undefined) {
          rewardsClaimed[tier]++;
        }
      });
    });

    return {
      totalParticipants,
      averagePoints,
      topPlayers,
      questCompletion,
      tierDistribution,
      rewardsClaimed
    };
  }

  /**
   * Reset daily/weekly quests
   */
  async resetQuests(type: 'daily' | 'weekly'): Promise<void> {
    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) {
      return;
    }

    const allProgress = await this.getAllSeasonProgress(currentSeason._id);

    for (const progress of allProgress) {
      if (type === 'daily') {
        progress.completedQuests.daily = [];
      } else if (type === 'weekly') {
        progress.completedQuests.weekly = [];
      }
      await this.saveSeasonProgress(progress);
    }
  }

  // Private helper methods
  private calculateTier(points: number, tierRewards: any): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
    if (points >= tierRewards.diamond.minPoints) return 'diamond';
    if (points >= tierRewards.platinum.minPoints) return 'platinum';
    if (points >= tierRewards.gold.minPoints) return 'gold';
    if (points >= tierRewards.silver.minPoints) return 'silver';
    return 'bronze';
  }

  private async getCurrentSeason(): Promise<ISeason | null> {
    return Season.findOne({ status: 'active' });
  }

  private async getUserSeasonProgress(userId: string, seasonId: string): Promise<SeasonProgress | null> {
    // Implement based on your storage solution
    // This is a placeholder
    return null;
  }

  private async saveSeasonProgress(progress: SeasonProgress): Promise<void> {
    // Implement based on your storage solution
    // This is a placeholder
  }

  private async getAllSeasonProgress(seasonId: string): Promise<SeasonProgress[]> {
    // Implement based on your storage solution
    // This is a placeholder
    return [];
  }

  private async validateQuestCompletion(quest: any, user: IUser): Promise<boolean> {
    // Implement quest validation logic based on quest type and requirements
    // This is a placeholder
    return true;
  }

  private async grantQuestRewards(userId: string, quest: any): Promise<void> {
    // Grant rewards for completing a quest
    const user = await User.findById(userId);
    if (!user) return;

    // Example: add VXC rewards
    if (quest.rewards?.vxc) {
      user.inventory.VXC += quest.rewards.vxc;
    }

    // Example: add items
    if (quest.rewards?.items) {
      user.inventory.items.push(...quest.rewards.items);
    }

    await user.save();
  }

  private async grantTierRewards(userId: string, tierReward: any): Promise<void> {
    // Grant tier-based rewards
    const user = await User.findById(userId);
    if (!user) return;

    // Grant VXC
    if (tierReward.rewards?.vxc) {
      user.inventory.VXC += parseFloat(tierReward.rewards.vxc);
    }

    // Grant PTX
    if (tierReward.rewards?.ptx) {
      user.inventory.PTX += parseFloat(tierReward.rewards.ptx);
    }

    // Grant exclusive NFTs
    if (tierReward.rewards?.nfts) {
      for (const nftData of tierReward.rewards.nfts) {
        await this.mintSeasonalNFT(userId, nftData);
      }
    }

    await user.save();
  }

  private async mintSeasonalNFT(userId: string, nftData: any): Promise<void> {
    // Mint seasonal NFT
    await blockchainService.mintSeasonalNFT({
      recipient: userId,
      metadata: nftData
    });
  }

  private scheduleSeasonEvents(season: ISeason): void {
    // Set up cron jobs or schedulers for season start/end
    // This is a placeholder for actual scheduling implementation
  }

  private async activateSeasonContent(season: ISeason): Promise<void> {
    // Activate quests, events, and other season content
  }

  private async notifySeasonStart(season: ISeason): Promise<void> {
    // Send notifications to all users about season start
  }

  private async distributeFinalRewards(season: ISeason): Promise<void> {
    // Distribute final season rewards based on leaderboard
    const leaderboard = await this.getLeaderboard(season._id, { limit: 100 });
    
    // Grant rewards to top players
    for (const entry of leaderboard.leaderboard) {
      // Implement reward distribution logic
    }
  }

  private async archiveSeasonData(season: ISeason): Promise<void> {
    // Archive season data for historical records
    // This could involve moving data to a separate collection or storage
  }
}

export default new SeasonService();
