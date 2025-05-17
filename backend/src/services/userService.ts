import User, { IUser } from '../models/User';
import mongoose from 'mongoose';

interface UserSearchParams {
  username?: string;
  email?: string;
  level?: number;
  guild?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface FriendRequestResponse {
  success: boolean;
  message: string;
}

class UserService {
  /**
   * Search users with various filters
   */
  async searchUsers(params: UserSearchParams): Promise<{
    users: Partial<IUser>[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      username,
      email,
      level,
      guild,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    const query: any = {};

    // Build search query
    if (username) {
      query.username = { $regex: username, $options: 'i' };
    }

    if (email) {
      query.email = { $regex: email, $options: 'i' };
    }

    if (level) {
      query.level = { $gte: level };
    }

    if (guild) {
      query.guild = guild;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Sort options
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -twoFactorSecret')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('guild', 'name icon level'),
      User.countDocuments(query)
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string, includePrivate: boolean = false): Promise<Partial<IUser> | null> {
    const selectFields = includePrivate 
      ? '-password -twoFactorSecret'
      : '-password -twoFactorSecret -email';

    const user = await User.findById(userId)
      .select(selectFields)
      .populate('guild', 'name icon level')
      .populate('friends', 'username avatar level isOnline');

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<IUser>): Promise<Partial<IUser> | null> {
    // Filter allowed updates
    const allowedUpdates = ['avatar', 'settings'];
    const filteredUpdates: any = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    ).select('-password -twoFactorSecret');

    return user;
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(userId: string, targetUserId: string): Promise<FriendRequestResponse> {
    if (userId === targetUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    const [user, targetUser] = await Promise.all([
      User.findById(userId),
      User.findById(targetUserId)
    ]);

    if (!user || !targetUser) {
      throw new Error('User not found');
    }

    // Check if already friends
    if (user.friends.includes(targetUserId)) {
      throw new Error('Already friends');
    }

    // Check if request already sent
    if (user.friendRequests.sent.includes(targetUserId)) {
      throw new Error('Friend request already sent');
    }

    // Check if request already received from target
    if (user.friendRequests.received.includes(targetUserId)) {
      // Auto-accept if target has already sent a request
      await this.acceptFriendRequest(userId, targetUserId);
      return { success: true, message: 'Friend request accepted' };
    }

    // Send request
    user.friendRequests.sent.push(targetUserId);
    targetUser.friendRequests.received.push(userId);

    await Promise.all([user.save(), targetUser.save()]);

    return { success: true, message: 'Friend request sent' };
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(userId: string, requesterId: string): Promise<FriendRequestResponse> {
    const [user, requester] = await Promise.all([
      User.findById(userId),
      User.findById(requesterId)
    ]);

    if (!user || !requester) {
      throw new Error('User not found');
    }

    // Check if request exists
    if (!user.friendRequests.received.includes(requesterId)) {
      throw new Error('Friend request not found');
    }

    // Add as friends
    user.friends.push(requesterId);
    requester.friends.push(userId);

    // Remove from friend requests
    user.friendRequests.received = user.friendRequests.received.filter(id => id.toString() !== requesterId);
    requester.friendRequests.sent = requester.friendRequests.sent.filter(id => id.toString() !== userId);

    await Promise.all([user.save(), requester.save()]);

    return { success: true, message: 'Friend request accepted' };
  }

  /**
   * Reject friend request
   */
  async rejectFriendRequest(userId: string, requesterId: string): Promise<FriendRequestResponse> {
    const [user, requester] = await Promise.all([
      User.findById(userId),
      User.findById(requesterId)
    ]);

    if (!user || !requester) {
      throw new Error('User not found');
    }

    // Remove from friend requests
    user.friendRequests.received = user.friendRequests.received.filter(id => id.toString() !== requesterId);
    requester.friendRequests.sent = requester.friendRequests.sent.filter(id => id.toString() !== userId);

    await Promise.all([user.save(), requester.save()]);

    return { success: true, message: 'Friend request rejected' };
  }

  /**
   * Remove friend
   */
  async removeFriend(userId: string, friendId: string): Promise<FriendRequestResponse> {
    const [user, friend] = await Promise.all([
      User.findById(userId),
      User.findById(friendId)
    ]);

    if (!user || !friend) {
      throw new Error('User not found');
    }

    // Remove from friends list
    user.friends = user.friends.filter((id: mongoose.Types.ObjectId) => id.toString() !== friendId);
    friend.friends = friend.friends.filter((id: mongoose.Types.ObjectId) => id.toString() !== userId);

    await Promise.all([user.save(), friend.save()]);

    return { success: true, message: 'Friend removed' };
  }

  /**
   * Get friend requests
   */
  async getFriendRequests(userId: string): Promise<{
    sent: Partial<IUser>[];
    received: Partial<IUser>[];
  }> {
    const user = await User.findById(userId)
      .populate('friendRequests.sent', 'username avatar level isOnline')
      .populate('friendRequests.received', 'username avatar level isOnline');

    if (!user) {
      throw new Error('User not found');
    }

    return {
      sent: user.friendRequests.sent,
      received: user.friendRequests.received
    };
  }

  /**
   * Get user's friends
   */
  async getFriends(userId: string): Promise<Partial<IUser>[]> {
    const user = await User.findById(userId)
      .populate('friends', 'username avatar level isOnline lastActive guild')
      .populate('friends.guild', 'name icon');

    if (!user) {
      throw new Error('User not found');
    }

    return user.friends;
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    level: number;
    xp: number;
    rank: number;
    stats: any;
    achievements: any[];
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Calculate user's rank based on level and XP
    const rank = await User.countDocuments({
      $or: [
        { level: { $gt: user.level } },
        { level: user.level, xp: { $gt: user.xp } }
      ]
    }) + 1;

    return {
      level: user.level,
      xp: user.xp,
      rank,
      stats: user.stats,
      achievements: user.achievements
    };
  }

  /**
   * Update user XP and level
   */
  async addXP(userId: string, amount: number): Promise<{ levelUp: boolean; newLevel?: number }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oldLevel = user.level;
    await user.addXP(amount);

    return {
      levelUp: user.level > oldLevel,
      newLevel: user.level > oldLevel ? user.level : undefined
    };
  }

  /**
   * Add achievement to user
   */
  async addAchievement(userId: string, achievementId: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.achievements.includes(achievementId)) {
      return false; // Already has achievement
    }

    await user.addAchievement(achievementId);
    return true;
  }

  /**
   * Update inventory
   */
  async updateInventory(userId: string, updates: {
    VXC?: number;
    PTX?: number;
    items?: string[];
  }): Promise<Partial<IUser> | null> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (updates.VXC !== undefined) {
      user.inventory.VXC += updates.VXC;
    }

    if (updates.PTX !== undefined) {
      user.inventory.PTX += updates.PTX;
    }

    if (updates.items) {
      user.inventory.items = [...user.inventory.items, ...updates.items];
    }

    await user.save();
    return user;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(options: {
    type: 'level' | 'totalEarnings' | 'itemsCreated';
    limit?: number;
    page?: number;
  }): Promise<{
    users: Array<Partial<IUser> & { rank: number }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { type, limit = 50, page = 1 } = options;
    const skip = (page - 1) * limit;

    let sortField = 'level';
    let sortOrder = -1;

    switch (type) {
      case 'level':
        sortField = 'level';
        break;
      case 'totalEarnings':
        sortField = 'stats.totalEarnings';
        break;
      case 'itemsCreated':
        sortField = 'stats.itemsCreated';
        break;
    }

    const [users, total] = await Promise.all([
      User.find()
        .select('username avatar level stats guild')
        .populate('guild', 'name icon')
        .sort({ [sortField]: sortOrder, _id: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments()
    ]);

    // Add rank to each user
    const usersWithRank = users.map((user, index) => ({
      ...user.toObject(),
      rank: skip + index + 1
    }));

    return {
      users: usersWithRank,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}

export default new UserService();
