// 길드 역할 열거형
export enum GuildRole {
  LEADER = 'LEADER',           // 길드장
  OFFICER = 'OFFICER',         // 간부
  VETERAN = 'VETERAN',         // 베테랑
  MEMBER = 'MEMBER',           // 일반 맴버
  RECRUIT = 'RECRUIT',         // 신입
  GUEST = 'GUEST'              // 게스트
}

// 길드 상태 열거형
export enum GuildStatus {
  ACTIVE = 'ACTIVE',           // 활성
  RECRUITING = 'RECRUITING',   // 모집 중
  INACTIVE = 'INACTIVE',       // 비활성
  DISBANDED = 'DISBANDED'      // 해체됨
}

// 길드 타입 열거형
export enum GuildType {
  SOCIAL = 'SOCIAL',           // 사교
  COMPETITIVE = 'COMPETITIVE', // 경쟁
  TRADING = 'TRADING',         // 거래
  BUILDING = 'BUILDING',       // 건축
  HYBRID = 'HYBRID'            // 복합
}

// 길드 멤버 인터페이스
export interface GuildMember {
  userId: string;
  username: string;
  avatar?: string;
  role: GuildRole;
  joinedAt: Date;
  lastActive: Date;
  
  // 멤버 통계
  stats: {
    level: number;
    rank: number;
    contribution: number;     // 길드 기여도
    attendance: number;       // 출석 일수
    eventsParticipated: number;
    itemsDonated: number;
    tokensDonated: number;
    projectsCompleted: number;
  };
  
  // 권한
  permissions: GuildPermission[];
  
  // 개인 노트
  notes?: string;
  
  // 멤버 상태
  status: {
    isOnline: boolean;
    activity?: string;
    location?: {
      worldId: string;
      worldName: string;
    };
    afk?: boolean;
  };
  
  // 길드 내 업적
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    earnedAt: Date;
  }>;
}

// 길드 권한 열거형
export enum GuildPermission {
  INVITE_MEMBERS = 'INVITE_MEMBERS',
  KICK_MEMBERS = 'KICK_MEMBERS',
  PROMOTE_MEMBERS = 'PROMOTE_MEMBERS',
  DEMOTE_MEMBERS = 'DEMOTE_MEMBERS',
  MANAGE_GUILD_INFO = 'MANAGE_GUILD_INFO',
  MANAGE_CHANNELS = 'MANAGE_CHANNELS',
  CREATE_EVENTS = 'CREATE_EVENTS',
  MANAGE_EVENTS = 'MANAGE_EVENTS',
  MANAGE_TREASURY = 'MANAGE_TREASURY',
  START_PROJECTS = 'START_PROJECTS',
  APPROVE_PROJECTS = 'APPROVE_PROJECTS',
  EDIT_ANNOUNCEMENT = 'EDIT_ANNOUNCEMENT',
  DELETE_MESSAGES = 'DELETE_MESSAGES',
  BAN_MEMBERS = 'BAN_MEMBERS',
  MANAGE_ROLES = 'MANAGE_ROLES'
}

// 길드 인터페이스
export interface Guild {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  avatar: string;
  banner?: string;
  type: GuildType;
  status: GuildStatus;
  
  // 기본 정보
  foundedAt: Date;
  leaderId: string;
  leaderName: string;
  
  // 멤버 정보
  members: GuildMember[];
  memberCount: number;
  maxMembers: number;
  
  // 가입 요구사항
  requirements: {
    minLevel?: number;
    maxLevel?: number;
    application: boolean;     // 가입 신청 필요 여부
    interview: boolean;       // 인터뷰 필요 여부
    invitation: boolean;      // 초대 전용 여부
    questionnaire?: Array<{   // 가입 설문
      id: string;
      question: string;
      type: 'text' | 'select' | 'multiselect';
      options?: string[];
      required: boolean;
    }>;
  };
  
  // 길드 통계
  stats: {
    level: number;            // 길드 레벨
    experience: number;       // 길드 경험치
    totalContribution: number;
    wealth: {                 // 길드 재산
      vxc: number;
      ptx: number;
      nfts: number;
    };
    rankings: {               // 순위
      overall: number;
      type: number;
      activity: number;
      wealth: number;
    };
    events: {                 // 이벤트 통계
      hosted: number;
      participated: number;
      won: number;
    };
  };
  
  // 길드 설정
  settings: {
    privacy: {
      visibility: 'public' | 'private' | 'hidden';
      allowMemberList: boolean;
      allowEvents: boolean;
      allowChat: boolean;
    };
    recruitment: {
      isRecruiting: boolean;
      autoAccept: boolean;
      welcomeMessage?: string;
      roles: Array<{
        name: string;
        description: string;
        requirements?: string[];
        permissions: GuildPermission[];
      }>;
    };
    communication: {
      defaultChannel?: string;
      allowDirectMessage: boolean;
      allowAnnouncements: boolean;
      allowPolls: boolean;
    };
    economy: {
      memberContribution: number;     // 최소 기여도
      taxRate: number;               // 세금율
      allowDonations: boolean;
      allowTreasury: boolean;
    };
  };
  
  // 채널 정보
  channels: Array<{
    id: string;
    name: string;
    description?: string;
    type: 'text' | 'voice' | 'announcement';
    visibility: 'public' | 'members' | 'officers' | 'leaders';
    permissions: string[];      // role names
    parent?: string;           // category ID
  }>;
  
  // 공지사항
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    isPinned: boolean;
    createdAt: Date;
    expiresAt?: Date;
  }>;
  
  // 이벤트
  events: GuildEvent[];
  
  // 프로젝트
  projects: GuildProject[];
  
  // 알라이언스
  alliances: Array<{
    guildId: string;
    guildName: string;
    type: 'friendly' | 'trade' | 'military' | 'rival';
    startedAt: Date;
    expiresAt?: Date;
  }>;
}

// 길드 이벤트 인터페이스
export interface GuildEvent {
  id: string;
  guildId: string;
  name: string;
  description: string;
  type: 'meeting' | 'raid' | 'pvp' | 'building' | 'social' | 'trading' | 'tournament';
  hostId: string;
  hostName: string;
  
  // 일정
  startTime: Date;
  endTime?: Date;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
  
  // 참석자
  attendees: Array<{
    userId: string;
    username: string;
    status: 'attending' | 'maybe' | 'not_attending' | 'invited';
    role?: string;
    checkedIn?: Date;
  }>;
  
  // 이벤트 정보
  location?: {
    type: 'ingame' | 'discord' | 'other';
    details: string;
    worldId?: string;
    coordinates?: { x: number; y: number; z: number };
  };
  
  // 보상
  rewards?: Array<{
    type: 'token' | 'nft' | 'title' | 'badge' | 'gexp';
    amount?: number;
    name: string;
    description?: string;
  }>;
  
  // 요구사항
  requirements?: {
    minLevel?: number;
    roleRequired?: GuildRole[];
    itemsNeeded?: string[];
    contributionRequired?: number;
  };
  
  // 메타데이터
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  rsvpDeadline?: Date;
}

// 길드 프로젝트 인터페이스
export interface GuildProject {
  id: string;
  guildId: string;
  name: string;
  description: string;
  type: 'building' | 'research' | 'economy' | 'social' | 'military';
  initiatorId: string;
  initiatorName: string;
  
  // 프로젝트 상태
  status: 'proposed' | 'approved' | 'active' | 'completed' | 'failed' | 'cancelled';
  
  // 일정
  startDate: Date;
  deadline?: Date;
  estimatedDuration?: number;    // 일 단위
  
  // 참여자
  participants: Array<{
    userId: string;
    username: string;
    role: 'coordinator' | 'contributor' | 'supervisor';
    contribution: number;
    lastActive: Date;
  }>;
  
  // 리소스
  resources: {
    required: {
      vxc?: number;
      ptx?: number;
      items?: Array<{
        itemId: string;
        itemName: string;
        quantity: number;
      }>;
      materials?: Array<{
        materialId: string;
        materialName: string;
        quantity: number;
      }>;
    };
    contributed: {
      vxc: number;
      ptx: number;
      items: Array<{
        itemId: string;
        itemName: string;
        quantity: number;
        contributedBy: Array<{
          userId: string;
          quantity: number;
        }>;
      }>;
      materials: Array<{
        materialId: string;
        materialName: string;
        quantity: number;
        contributedBy: Array<{
          userId: string;
          quantity: number;
        }>;
      }>;
    };
  };
  
  // 진행도
  progress: {
    percentage: number;
    milestones: Array<{
      id: string;
      name: string;
      description: string;
      completed: boolean;
      completedAt?: Date;
    }>;
  };
  
  // 보상
  rewards: Array<{
    type: 'token' | 'nft' | 'title' | 'badge' | 'gexp' | 'reputation';
    amount?: number;
    name: string;
    description?: string;
    eligibility: 'all' | 'contributors' | 'top_contributors' | 'coordinator';
  }>;
  
  // 투표
  voting?: {
    isActive: boolean;
    startedAt: Date;
    endsAt: Date;
    requiredVotes: number;
    currentVotes: number;
    votes: Array<{
      userId: string;
      vote: 'approve' | 'reject' | 'abstain';
      comment?: string;
      votedAt: Date;
    }>;
  };
  
  // 업데이트
  updates: Array<{
    id: string;
    authorId: string;
    authorName: string;
    title: string;
    content: string;
    type: 'progress' | 'resource' | 'announcement' | 'issue';
    createdAt: Date;
    attachments?: string[];
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

// 길드 지원서 인터페이스
export interface GuildApplication {
  id: string;
  guildId: string;
  guildName: string;
  applicantId: string;
  applicantName: string;
  applicantLevel: number;
  applicantAvatar?: string;
  
  // 지원 정보
  appliedAt: Date;
  message: string;             // 자기소개
  answers?: Array<{            // 설문 답변
    questionId: string;
    question: string;
    answer: string | string[];
  }>;
  
  // 상태
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  
  // 처리 정보
  processedAt?: Date;
  processedBy?: string;
  processorName?: string;
  processorNote?: string;
  
  // 추가 정보
  referredBy?: string;         // 추천인
  reapplicationCooldown?: Date;
}

// 길드 통계 인터페이스
export interface GuildStats {
  // 기본 통계
  totalGuilds: number;
  activeGuilds: number;
  totalMembers: number;
  averageGuildSize: number;
  
  // 활동 통계
  eventsPerWeek: number;
  projectsPerMonth: number;
  averageContribution: number;
  
  // 리더보드
  topGuildsByLevel: Array<{
    id: string;
    name: string;
    level: number;
    avatar: string;
  }>;
  
  topGuildsByWealth: Array<{
    id: string;
    name: string;
    wealth: number;
    avatar: string;
  }>;
  
  topGuildsByActivity: Array<{
    id: string;
    name: string;
    activityScore: number;
    avatar: string;
  }>;
  
  // 순위 변동
  rankings: {
    guildId: string;
    overallRank: number;
    typeRank: number;
    previousRank?: number;
    change?: number;          // +3, -1, etc.
  };
}

// 길드 초대 인터페이스
export interface GuildInvite {
  id: string;
  guildId: string;
  guildName: string;
  guildAvatar?: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  message?: string;
  
  // 초대 정보
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  
  // 초대 설정
  settings: {
    autoAssignRole?: GuildRole;
    welcomeChannel?: string;
    trial?: {
      enabled: boolean;
      duration: number;       // days
      requirements?: string[];
    };
  };
}

// 길드 랭킹 시스템 인터페이스
export interface GuildRanking {
  guildId: string;
  name: string;
  avatar: string;
  
  // 순위 정보
  overallRank: number;
  categoryRank: Array<{
    category: 'level' | 'wealth' | 'activity' | 'pvp' | 'events';
    rank: number;
    score: number;
  }>;
  
  // 점수 구성
  scores: {
    level: number;
    wealth: number;
    activity: number;
    events: number;
    projects: number;
    reputation: number;
  };
  
  // 변화 추이
  trend: {
    lastWeek: number;
    lastMonth: number;
    allTime: number;
  };
  
  // 업적
  achievements: Array<{
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earnedAt: Date;
  }>;
}

// 내보내기
export type GuildList = Guild[];
export type GuildMemberList = GuildMember[];
export type GuildEventList = GuildEvent[];
export type GuildProjectList = GuildProject[];
