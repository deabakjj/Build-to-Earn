import Guild, { IGuild } from '../models/Guild';
import User, { IUser } from '../models/User';
import GuildProject, { IGuildProject } from '../models/GuildProject';
import blockchainService from './blockchainService';
import { ethers } from 'ethers';

interface CreateGuildParams {
  name: string;
  description: string;
  requirements: {
    minLevel: number;
    minItemsCreated?: number;
    maxMembers: number;
  };
  leaderId: string;
  tags: string[];
  isPublic: boolean;
}

interface UpdateGuildParams {
  name?: string;
  description?: string;
  requirements?: {
    minLevel?: number;
    minItemsCreated?: number;
    maxMembers?: number;
  };
  tags?: string[];
  isPublic?: boolean;
}

interface InviteMemberParams {
  guildId: string;
  userId: string;
  inviterId: string;
  message?: string;
}

interface SearchGuildParams {
  query?: string;
  tags?: string[];
  minLevel?: number;
  maxLevel?: number;
  isPublic?: boolean;
  sortBy?: 'members' | 'level' | 'totalValue' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface CreateProjectParams {
  guildId: string;
  initiatorId: string;
  name: string;
  description: string;
  requiredResources: {
    materials: { [key: string]: number };
    specialItems: string[];
  };
  targetSize: {
    width: number;
    height: number;
    depth: number;
  };
  deadline?: Date;
  rewards: {
    xp: number;
    materials: { [key: string]: number };
    nftPrototype?: string;
  };
}

class GuildService {
  /**
   * Create a new guild
   */
  async createGuild(params: CreateGuildParams): Promise<IGuild> {
    const { name, description, requirements, leaderId, tags, isPublic } = params;

    // Check if leader exists and meets requirements
    const leader = await User.findById(leaderId);
    if (!leader) {
      throw new Error('Leader not found');
    }

    // Check if leader already has a guild
    if (leader.guild) {
      throw new Error('Leader already belongs to a guild');
    }

    // Check if guild name is available
    const existingGuild = await Guild.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existingGuild) {
      throw new Error('Guild name already taken');
    }

    // Create guild
    const guild = await Guild.create({
      name,
      description,
      leader: leaderId,
      requirements,
      members: [leaderId],
      tags,
      isPublic,
      level: 1,
      xp: 0,
      vault: {
        VXC: '0',
        PTX: '0',
        materials: {},
        specialItems: []
      },
      stats: {
        totalValue: '0',
        membersCount: 1,
        projectsCompleted: 0,
        totalEarnings: '0'
      }
    });

    // Update leader's guild reference
    leader.guild = guild._id;
    await leader.save();

    // Create guild treasury on blockchain
    await blockchainService.createGuildTreasury({
      guildId: guild._id.toString(),
      leader: leaderId
    });

    return guild;
  }

  /**
   * Update guild settings
   */
  async updateGuild(guildId: string, userId: string, params: UpdateGuildParams): Promise<IGuild> {
    const guild = await Guild.findById(guildId);
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check permissions
    if (guild.leader.toString() !== userId) {
      throw new Error('Only guild leader can update settings');
    }

    // Update fields
    if (params.name) guild.name = params.name;
    if (params.description) guild.description = params.description;
    if (params.requirements) {
      guild.requirements = { ...guild.requirements, ...params.requirements };
    }
    if (params.tags) guild.tags = params.tags;
    if (params.isPublic !== undefined) guild.isPublic = params.isPublic;

    await guild.save();
    return guild;
  }

  /**
   * Invite a member to the guild
   */
  async inviteMember(params: InviteMemberParams): Promise<void> {
    const { guildId, userId, inviterId, message } = params;

    const guild = await Guild.findById(guildId);
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check inviter permissions
    if (guild.leader.toString() !== inviterId && !guild.officers.includes(inviterId)) {
      throw new Error('Only leaders and officers can invite members');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has a guild
    if (user.guild) {
      throw new Error('User already belongs to a guild');
    }

    // Check if user meets requirements
    if (user.level < guild.requirements.minLevel) {
      throw new Error('User does not meet level requirement');
    }

    if (guild.requirements.minItemsCreated && 
        user.stats.itemsCreated < guild.requirements.minItemsCreated) {
      throw new Error('User does not meet items created requirement');
    }

    // Check if guild is full
    if (guild.members.length >= guild.requirements.maxMembers) {
      throw new Error('Guild is full');
    }

    // Check if invitation already exists
    if (guild.invitations.some(inv => inv.userId.toString() === userId)) {
      throw new Error('Invitation already sent');
    }

    // Add invitation
    guild.invitations.push({
      userId,
      inviterId,
      message: message || '',
      createdAt: new Date(),
      status: 'pending'
    });

    await guild.save();

    // Send notification to user
    await this.sendGuildInvitationNotification(user, guild, inviterId);
  }

  /**
   * Accept guild invitation
   */
  async acceptInvitation(guildId: string, userId: string): Promise<IGuild> {
    const guild = await Guild.findById(guildId);
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Find invitation
    const invitation = guild.invitations.find(
      inv => inv.userId.toString() === userId && inv.status === 'pending'
    );

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Check if guild is full
    if (guild.members.length >= guild.requirements.maxMembers) {
      throw new Error('Guild is full');
    }

    // Add member
    guild.members.push(userId);
    invitation.status = 'accepted';
    guild.stats.membersCount++;

    await guild.save();

    // Update user's guild reference
    const user = await User.findById(userId);
    if (user) {
      user.guild = guild._id;
      await user.save();
    }

    // Add member on blockchain
    await blockchainService.addGuildMember({
      guildId: guild._id.toString(),
      memberId: userId
    });

    return guild;
  }

  /**
   * Leave guild
   */
  async leaveGuild(guildId: string, userId: string): Promise<void> {
    const guild = await Guild.findById(guildId);
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check if user is a member
    if (!guild.members.includes(userId)) {
      throw new Error('User is not a member of this guild');
    }

    // Leader cannot leave directly
    if (guild.leader.toString() === userId) {
      throw new Error('Guild leader must transfer leadership before leaving');
    }

    // Remove member
    guild.members = guild.members.filter(id => id.toString() !== userId);
    guild.stats.membersCount--;

    // Remove from officers if applicable
    guild.officers = guild.officers.filter(id => id.toString() !== userId);

    await guild.save();

    // Update user's guild reference
    const user = await User.findById(userId);
    if (user) {
      user.guild = undefined;
      await user.save();
    }

    // Remove member on blockchain
    await blockchainService.removeGuildMember({
      guildId: guild._id.toString(),
      memberId: userId
    });
  }

  /**
   * Transfer leadership
   */
  async transferLeadership(guildId: string, currentLeaderId: string, newLeaderId: string): Promise<IGuild> {
    const guild = await Guild.findById(guildId);
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Verify current leader
    if (guild.leader.toString() !== currentLeaderId) {
      throw new Error('Only current leader can transfer leadership');
    }

    // Verify new leader is member
    if (!guild.members.includes(newLeaderId)) {
      throw new Error('New leader must be a guild member');
    }

    // Transfer leadership
    guild.leader = newLeaderId;

    // Add old leader to officers if not already
    if (!guild.officers.includes(currentLeaderId)) {
      guild.officers.push(currentLeaderId);
    }

    // Remove new leader from officers if present
    guild.officers = guild.officers.filter(id => id.toString() !== newLeaderId);

    await guild.save();

    // Update leadership on blockchain
    await blockchainService.transferGuildLeadership({
      guildId: guild._id.toString(),
      newLeader: newLeaderId
    });

    return guild;
  }

  /**
   * Search for guilds
   */
  async searchGuilds(params: SearchGuildParams): Promise<{
    guilds: IGuild[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      query,
      tags,
      minLevel,
      maxLevel,
      isPublic,
      sortBy = 'members',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = params;

    const searchQuery: any = {};

    // Text search
    if (query) {
      searchQuery.$or = [
        { name: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') }
      ];
    }

    // Tags filter
    if (tags && tags.length > 0) {
      searchQuery.tags = { $in: tags };
    }

    // Level filter
    if (minLevel || maxLevel) {
      searchQuery.level = {};
      if (minLevel) searchQuery.level.$gte = minLevel;
      if (maxLevel) searchQuery.level.$lte = maxLevel;
    }

    // Public/Private filter
    if (isPublic !== undefined) {
      searchQuery.isPublic = isPublic;
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Sort options
    const sort: any = {};
    if (sortBy === 'members') {
      sort['stats.membersCount'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'level') {
      sort.level = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'totalValue') {
      sort['stats.totalValue'] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    // Execute query
    const [guilds, total] = await Promise.all([
      Guild.find(searchQuery)
        .populate('leader', 'username avatar level')
        .populate('members', 'username avatar level')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Guild.countDocuments(searchQuery)
    ]);

    return {
      guilds,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Create a guild project
   */
  async createProject(params: CreateProjectParams): Promise<IGuildProject> {
    const {
      guildId,
      initiatorId,
      name,
      description,
      requiredResources,
      targetSize,
      deadline,
      rewards
    } = params;

    const guild = await Guild.findById(guildId);
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check permissions
    if (guild.leader.toString() !== initiatorId && !guild.officers.includes(initiatorId)) {
      throw new Error('Only leaders and officers can initiate projects');
    }

    // Create project
    const project = await GuildProject.create({
      guild: guildId,
      initiator: initiatorId,
      name,
      description,
      requiredResources,
      targetSize,
      deadline,
      rewards,
      status: 'planning',
      contributors: {},
      progress: 0,
      createdAt: new Date()
    });

    // Add project to guild
    guild.activeProjects.push(project._id);
    await guild.save();

    return project;
  }

  /**
   * Contribute to a project
   */
  async contributeToProject(
    projectId: string,
    userId: string,
    contribution: {
      materials?: { [key: string]: number };
      specialItems?: string[];
      labor?: number; // in hours
    }
  ): Promise<IGuildProject> {
    const project = await GuildProject.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.status !== 'in_progress') {
      throw new Error('Project is not accepting contributions');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify user is guild member
    const guild = await Guild.findById(project.guild);
    if (!guild || !guild.members.includes(userId)) {
      throw new Error('User is not a guild member');
    }

    // Process contributions
    const contributorData = project.contributors[userId] || {
      materials: {},
      specialItems: [],
      labor: 0,
      joinedAt: new Date()
    };

    // Add materials
    if (contribution.materials) {
      for (const [material, amount] of Object.entries(contribution.materials)) {
        // Check user has materials
        if (!user.inventory.materials[material] || 
            user.inventory.materials[material] < amount) {
          throw new Error(`Insufficient ${material}`);
        }

        // Deduct from user
        user.inventory.materials[material] -= amount;

        // Add to project
        contributorData.materials[material] = (contributorData.materials[material] || 0) + amount;
      }
    }

    // Add special items
    if (contribution.specialItems) {
      for (const itemId of contribution.specialItems) {
        if (!user.inventory.items.includes(itemId)) {
          throw new Error(`User does not have item ${itemId}`);
        }

        // Remove from user
        user.inventory.items = user.inventory.items.filter(id => id !== itemId);

        // Add to project
        contributorData.specialItems.push(itemId);
      }
    }

    // Add labor
    if (contribution.labor) {
      contributorData.labor += contribution.labor;
    }

    // Update project
    project.contributors[userId] = contributorData;
    project.lastContribution = new Date();

    // Calculate progress
    const totalContributed = await this.calculateProjectProgress(project);
    project.progress = totalContributed;

    // Check if project is complete
    if (project.progress >= 100) {
      project.status = 'completed';
      project.completedAt = new Date();

      // Distribute rewards
      await this.distributeProjectRewards(project);
    }

    await Promise.all([project.save(), user.save()]);

    return project;
  }

  /**
   * Get guild statistics
   */
  async getGuildStats(guildId: string): Promise<{
    overview: {
      level: number;
      xp: number;
      members: number;
      totalValue: string;
      projectsCompleted: number;
    };
    memberStats: Array<{
      userId: string;
      username: string;
      contributions: number;
      projectsParticipated: number;
      totalValue: string;
    }>;
    projectHistory: Array<{
      projectId: string;
      name: string;
      completedAt: Date;
      participants: number;
      totalValue: string;
    }>;
    treasury: {
      VXC: string;
      PTX: string;
      materials: { [key: string]: number };
      specialItems: string[];
    };
  }> {
    const guild = await Guild.findById(guildId);
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Get completed projects
    const completedProjects = await GuildProject.find({
      guild: guildId,
      status: 'completed'
    }).sort({ completedAt: -1 });

    // Calculate member statistics
    const memberStats = await Promise.all(
      guild.members.map(async (memberId) => {
        const user = await User.findById(memberId).select('username');
        
        // Calculate member's contributions across all projects
        let contributions = 0;
        let projectsParticipated = 0;
        let totalValue = 0;

        for (const project of completedProjects) {
          if (project.contributors[memberId]) {
            projectsParticipated++;
            // Calculate contribution value
            const contrib = project.contributors[memberId];
            // Add up material values, labor value, etc.
            // This is a simplified calculation
            totalValue += Object.values(contrib.materials || {}).reduce((a, b) => a + b, 0);
            contributions++;
          }
        }

        return {
          userId: memberId.toString(),
          username: user?.username || 'Unknown',
          contributions,
          projectsParticipated,
          totalValue: totalValue.toString()
        };
      })
    );

    // Format project history
    const projectHistory = completedProjects.map(project => ({
      projectId: project._id.toString(),
      name: project.name,
      completedAt: project.completedAt!,
      participants: Object.keys(project.contributors).length,
      totalValue: '0' // Calculate based on project rewards
    }));

    return {
      overview: {
        level: guild.level,
        xp: guild.xp,
        members: guild.stats.membersCount,
        totalValue: guild.stats.totalValue,
        projectsCompleted: guild.stats.projectsCompleted
      },
      memberStats,
      projectHistory,
      treasury: guild.vault
    };
  }

  /**
   * Get guild leaderboard
   */
  async getGuildLeaderboard(options: {
    metric: 'level' | 'totalValue' | 'projectsCompleted' | 'members';
    page?: number;
    limit?: number;
  }): Promise<{
    leaderboard: Array<{
      guild: IGuild;
      rank: number;
      value: number | string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { metric, page = 1, limit = 50 } = options;

    let sortField: string;
    switch (metric) {
      case 'level':
        sortField = 'level';
        break;
      case 'totalValue':
        sortField = 'stats.totalValue';
        break;
      case 'projectsCompleted':
        sortField = 'stats.projectsCompleted';
        break;
      case 'members':
        sortField = 'stats.membersCount';
        break;
      default:
        sortField = 'level';
    }

    const skip = (page - 1) * limit;

    const [guilds, total] = await Promise.all([
      Guild.find()
        .populate('leader', 'username avatar')
        .sort({ [sortField]: -1 })
        .skip(skip)
        .limit(limit),
      Guild.countDocuments()
    ]);

    const leaderboard = guilds.map((guild, index) => ({
      guild,
      rank: skip + index + 1,
      value: metric === 'totalValue' ? guild.stats.totalValue : guild[metric === 'members' ? 'stats' : ''][metric === 'members' ? 'membersCount' : metric]
    }));

    return {
      leaderboard,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Private helper methods
  private async calculateProjectProgress(project: IGuildProject): Promise<number> {
    // Calculate overall project completion percentage
    let totalRequired = 0;
    let totalContributed = 0;

    // Materials progress
    for (const [material, required] of Object.entries(project.requiredResources.materials)) {
      totalRequired += required;
      let contributed = 0;
      
      for (const contributor of Object.values(project.contributors)) {
        contributed += contributor.materials[material] || 0;
      }
      totalContributed += Math.min(contributed, required);
    }

    // Special items progress (binary: 0 or 100%)
    for (const itemId of project.requiredResources.specialItems) {
      totalRequired += 100; // Each item worth 100 points
      
      let found = false;
      for (const contributor of Object.values(project.contributors)) {
        if (contributor.specialItems?.includes(itemId)) {
          found = true;
          break;
        }
      }
      
      if (found) totalContributed += 100;
    }

    // Return percentage
    return totalRequired > 0 ? Math.min(100, (totalContributed / totalRequired) * 100) : 0;
  }

  private async distributeProjectRewards(project: IGuildProject): Promise<void> {
    const guild = await Guild.findById(project.guild);
    if (!guild) return;

    // Calculate contribution shares
    const contributionShares = this.calculateContributionShares(project);

    // Distribute rewards to contributors
    for (const [userId, share] of Object.entries(contributionShares)) {
      const user = await User.findById(userId);
      if (!user) continue;

      // Grant XP
      const xpReward = Math.floor(project.rewards.xp * share);
      await user.addXP(xpReward);

      // Grant materials
      if (project.rewards.materials) {
        for (const [material, amount] of Object.entries(project.rewards.materials)) {
          const rewardAmount = Math.floor(amount * share);
          user.inventory.materials[material] = (user.inventory.materials[material] || 0) + rewardAmount;
        }
      }

      await user.save();
    }

    // Grant NFT to guild leader if specified
    if (project.rewards.nftPrototype) {
      await blockchainService.mintProjectNFT({
        recipient: guild.leader.toString(),
        projectId: project._id.toString(),
        metadata: project.rewards.nftPrototype
      });
    }

    // Update guild stats
    guild.stats.projectsCompleted++;
    guild.xp += project.rewards.xp;
    
    // Remove from active projects
    guild.activeProjects = guild.activeProjects.filter(id => id.toString() !== project._id.toString());

    await guild.save();
  }

  private calculateContributionShares(project: IGuildProject): { [userId: string]: number } {
    const shares: { [userId: string]: number } = {};
    let totalContribution = 0;

    // Calculate total contributions
    for (const [userId, contributor] of Object.entries(project.contributors)) {
      let userContribution = 0;

      // Material contributions (weighted by rarity/value)
      for (const [material, amount] of Object.entries(contributor.materials || {})) {
        userContribution += amount; // Simplified - should weight by material value
      }

      // Special item contributions
      userContribution += (contributor.specialItems?.length || 0) * 100;

      // Labor contributions
      userContribution += (contributor.labor || 0) * 10; // 1 hour = 10 points

      shares[userId] = userContribution;
      totalContribution += userContribution;
    }

    // Normalize to percentages
    if (totalContribution > 0) {
      for (const userId in shares) {
        shares[userId] = shares[userId] / totalContribution;
      }
    }

    return shares;
  }

  private async sendGuildInvitationNotification(user: IUser, guild: IGuild, inviterId: string): Promise<void> {
    // Implement notification sending
    // This could be email, in-app notification, etc.
  }
}

export default new GuildService();
