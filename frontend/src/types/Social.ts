// 친구 상태 열거형
export enum FriendStatus {
  PENDING = 'PENDING',         // 대기 중
  ACCEPTED = 'ACCEPTED',       // 승인됨
  BLOCKED = 'BLOCKED',         // 차단됨
  DECLINED = 'DECLINED'        // 거절됨
}

// 온라인 상태 열거형
export enum OnlineStatus {
  ONLINE = 'ONLINE',           // 온라인
  OFFLINE = 'OFFLINE',         // 오프라인
  AWAY = 'AWAY',              // 자리 비움
  DND = 'DND',                // 방해금지
  INVISIBLE = 'INVISIBLE'      // 숨기기
}

// 알림 타입 열거형
export enum NotificationType {
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_ACCEPTED = 'FRIEND_ACCEPTED',
  GUILD_INVITE = 'GUILD_INVITE',
  GUILD_REQUEST = 'GUILD_REQUEST',
  TRADE_REQUEST = 'TRADE_REQUEST',
  MESSAGE = 'MESSAGE',
  ACHIEVEMENT = 'ACHIEVEMENT',
  REWARD = 'REWARD',
  EVENT = 'EVENT',
  SEASON = 'SEASON'
}

// 친구 인터페이스
export interface Friend {
  id: string;
  username: string;
  avatar?: string;
  status: FriendStatus;
  onlineStatus: OnlineStatus;
  lastOnline?: Date;
  level: number;
  title?: string;
  guildId?: string;
  guildName?: string;
  addedAt: Date;
  mutualFriends?: number;
  favoriteItems?: string[];   // NFT IDs
  bio?: string;
  achievements?: string[];
  stats?: {
    itemsCreated: number;
    itemsSold: number;
    totalEarnings: number;
    worldsVisited: number;
  };
}

// 친구 요청 인터페이스
export interface FriendRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  receiverId: string;
  message?: string;
  status: FriendStatus;
  createdAt: Date;
  expiresAt?: Date;
}

// 알림 인터페이스
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  senderId?: string;
  senderUsername?: string;
  senderAvatar?: string;
  isRead: boolean;
  createdAt: Date;
  data?: any;              // 타입별 추가 데이터
  actions?: NotificationAction[];
}

// 알림 액션 인터페이스
export interface NotificationAction {
  id: string;
  label: string;
  action: 'accept' | 'decline' | 'view' | 'join' | 'custom';
  variant?: 'primary' | 'secondary' | 'danger';
}

// 채팅 메시지 인터페이스
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'system' | 'trade' | 'location' | 'item';
  attachments?: ChatAttachment[];
  replyTo?: {
    messageId: string;
    content: string;
    senderId: string;
  };
  reactions?: ChatReaction[];
  isRead: boolean;
  isEdited: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  metadata?: any;           // 타입별 추가 데이터
}

// 채팅 첨부 파일 인터페이스
export interface ChatAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'nft' | 'location';
  url: string;
  filename: string;
  size: number;
  mimeType?: string;
  thumbnail?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    nftId?: string;
    location?: {
      x: number;
      y: number;
      z: number;
      world: string;
    };
  };
}

// 채팅 리액션 인터페이스
export interface ChatReaction {
  emoji: string;
  count: number;
  users: string[];          // user IDs who reacted
}

// 채팅방 인터페이스
export interface ChatRoom {
  id: string;
  type: 'private' | 'group' | 'guild';
  name?: string;           // 그룹/길드 채팅의 경우
  participants: string[];   // user IDs
  admins: string[];        // user IDs
  createdBy: string;       // user ID
  createdAt: Date;
  lastMessage?: ChatMessage;
  unreadCount: number;
  settings: ChatRoomSettings;
  metadata?: {
    avatar?: string;
    description?: string;
    rules?: string[];
    pinnedMessages?: string[];
  };
}

// 채팅방 설정 인터페이스
export interface ChatRoomSettings {
  isEncrypted: boolean;
  allowInvites: boolean;
  autoDelete: boolean;     // 메시지 자동 삭제
  deleteAfter?: number;    // 자동 삭제 후 시간(초)
  allowedFileTypes: string[];
  maxFileSize: number;     // bytes
  slowMode?: number;       // 메시지 간 최소 대기 시간(초)
  allowReactions: boolean;
  allowEdits: boolean;
  allowPolls: boolean;
  notifications: {
    mentions: boolean;
    keywords: string[];
    sounds: boolean;
    desktop: boolean;
    mobile: boolean;
  };
}

// 차단 목록 인터페이스
export interface BlockedUser {
  id: string;
  username: string;
  avatar?: string;
  blockedAt: Date;
  reason?: string;
  blockedBy: string;       // user ID who blocked
}

// 개인 설정 인터페이스
export interface SocialSettings {
  privacy: {
    showOnlineStatus: 'all' | 'friends' | 'none';
    allowFriendRequests: 'all' | 'friends' | 'none';
    showGuildInfo: boolean;
    showStats: boolean;
    allowTradeRequests: boolean;
    allowPartyInvites: boolean;
    allowMessageRequests: 'all' | 'friends' | 'none';
  };
  notifications: {
    friendRequests: boolean;
    messages: boolean;
    guildInvites: boolean;
    tradeRequests: boolean;
    achievements: boolean;
    events: boolean;
    sounds: boolean;
    desktop: boolean;
    mobile: boolean;
    email: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    chatBubbleStyle: 'default' | 'minimal' | 'bubble';
    showAvatars: boolean;
    showOnlineIndicators: boolean;
    compactMode: boolean;
  };
  chat: {
    autoDownloadImages: boolean;
    autoDownloadVideos: boolean;
    showLinkPreviews: boolean;
    sendOnEnter: boolean;
    defaultChatSound: string;
    textSize: 'small' | 'medium' | 'large';
    showTypingIndicator: boolean;
  };
  blocking: {
    autoBlockSpam: boolean;
    blockNonFriends: boolean;
    keywordFilters: string[];
  };
}

// 유저 사회적 프로필 인터페이스
export interface SocialProfile {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  banner?: string;
  title?: string;
  level: number;
  joinDate: Date;
  lastActive?: Date;
  
  // 통계
  stats: {
    friends: number;
    guilds: number;
    messagesCount: number;
    itemsCreated: number;
    itemsSold: number;
    worldsVisited: number;
    achievementsUnlocked: number;
    totalEarnings: number;
    reputation: number;
  };
  
  // 사회적 정보
  social: {
    guildIds: string[];
    friendIds: string[];
    blockedIds: string[];
    followerIds: string[];
    followingIds: string[];
  };
  
  // 설정
  settings: SocialSettings;
  
  // 프로필 배지
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earnedAt: Date;
  }>;
  
  // 최근 활동
  recentActivity: Array<{
    type: 'friend_add' | 'guild_join' | 'item_create' | 'achievement';
    description: string;
    timestamp: Date;
    metadata?: any;
  }>;
}

// 소셜 피드 아이템 인터페이스
export interface SocialFeedItem {
  id: string;
  type: 'item_created' | 'item_sold' | 'achievement' | 'guild_event' | 'user_event';
  userId: string;
  username: string;
  userAvatar?: string;
  title: string;
  description: string;
  image?: string;
  metadata?: any;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  createdAt: Date;
  
  // 타입별 추가 데이터
  itemData?: {
    itemId: string;
    itemName: string;
    itemImage: string;
    itemType: string;
    price?: number;
    currency?: string;
  };
  
  achievementData?: {
    achievementId: string;
    achievementName: string;
    achievementIcon: string;
    achievementRarity: string;
  };
  
  guildData?: {
    guildId: string;
    guildName: string;
    guildIcon: string;
    eventType: string;
  };
}

// 소셜 검색 결과 인터페이스
export interface SocialSearchResult {
  type: 'user' | 'guild' | 'item' | 'chat' | 'group';
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  relevance: number;
  metadata?: any;
}

// 소셜 이벤트 인터페이스
export interface SocialEvent {
  id: string;
  type: 'party' | 'raid' | 'tournament' | 'market' | 'custom';
  title: string;
  description: string;
  hostId: string;
  hostName: string;
  maxParticipants?: number;
  currentParticipants: number;
  participants: Array<{
    userId: string;
    username: string;
    avatar?: string;
    role?: string;
    joinedAt: Date;
  }>;
  startTime: Date;
  endTime?: Date;
  location?: {
    worldId: string;
    worldName: string;
    coordinates?: {
      x: number;
      y: number;
      z: number;
    };
  };
  requirements?: {
    minLevel?: number;
    maxLevel?: number;
    guildMember?: boolean;
    friendsOnly?: boolean;
    items?: string[];        // required item IDs
  };
  rewards?: Array<{
    type: 'token' | 'nft' | 'title' | 'badge';
    name: string;
    description: string;
    image?: string;
    amount?: number;
  }>;
  rules?: string[];
  settings: {
    isPrivate: boolean;
    allowInvites: boolean;
    autoStart: boolean;
    recurring?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      daysOfWeek?: number[];
      endDate?: Date;
    };
  };
  status: 'upcoming' | 'active' | 'ended' | 'cancelled';
}

// 파티/그룹 인터페이스
export interface Party {
  id: string;
  name?: string;
  leaderId: string;
  members: Array<{
    userId: string;
    username: string;
    avatar?: string;
    role: 'leader' | 'officer' | 'member';
    joinedAt: Date;
    isOnline: boolean;
    level: number;
  }>;
  maxSize: number;
  currentSize: number;
  isPublic: boolean;
  activity?: {
    type: 'exploring' | 'trading' | 'building' | 'pvp' | 'event' | 'idle';
    description?: string;
    location?: {
      worldId: string;
      worldName: string;
    };
  };
  settings: {
    autoAccept: boolean;
    allowInvites: boolean;
    lootDistribution: 'equal' | 'leader' | 'contribution';
    voiceChat: boolean;
    textChat: boolean;
  };
  createdAt: Date;
  lastActivity: Date;
}

// 멘션 기능 인터페이스
export interface Mention {
  type: 'user' | 'role' | 'channel' | 'item' | 'location';
  id: string;
  name: string;
  userId?: string;        // user mentions
  roleId?: string;        // role mentions
  channelId?: string;     // channel mentions
  itemId?: string;        // item mentions
  coordinates?: {         // location mentions
    x: number;
    y: number;
    z: number;
    world: string;
  };
}

// 투표/설문 인터페이스
export interface Poll {
  id: string;
  chatId: string;
  creatorId: string;
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
    voters: string[];     // user IDs
  }>;
  allowMultiple: boolean;
  anonymous: boolean;
  expiresAt?: Date;
  status: 'active' | 'ended';
  createdAt: Date;
  results?: {
    totalVotes: number;
    winningOption?: string;
  };
}

// 타이핑 인디케이터 인터페이스
export interface TypingIndicator {
  chatId: string;
  userId: string;
  username: string;
  startedAt: Date;
}

// 소셜 통계 인터페이스
export interface SocialStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalGuilds: number;
  totalFriendships: number;
  averageMessageLength: number;
  popularEmojis: Array<{
    emoji: string;
    count: number;
  }>;
  peakActivityHours: number[];
  engagementRate: number;
}

// 내보내기
export type SocialNotification = Notification;
export type FriendList = Friend[];
export type ChatHistory = ChatMessage[];
export type NotificationList = Notification[];
