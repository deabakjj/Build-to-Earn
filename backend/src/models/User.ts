import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * 유저 문서 인터페이스
 */
export interface IUser extends Document {
  email?: string;
  username: string;
  displayName: string;
  password?: string;
  role: 'user' | 'moderator' | 'admin';
  status: 'active' | 'inactive' | 'suspended' | 'locked';
  
  // 이메일 인증 관련
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  
  // 비밀번호 재설정 관련
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  
  // 지갑 정보
  walletAddress?: string;
  walletType?: 'metamask' | 'wallet-connect' | 'coinbase-wallet' | 'other';
  
  // 소셜 로그인 정보
  social?: {
    google?: {
      id: string;
      data: any;
    };
    discord?: {
      id: string;
      data: any;
    };
    twitter?: {
      id: string;
      data: any;
    };
  };
  
  // 보안 관련
  loginFailures?: number;
  lockUntil?: Date;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  
  // 프로필 정보
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  
  // 통계 정보
  lastLogin?: Date;
  lastActive?: Date;
  registrationMethod?: 'email' | 'wallet' | 'google' | 'discord' | 'twitter';
  
  // DIY 크래프팅 월드 특화 정보
  level?: number;
  experience?: number;
  vxcBalance?: number;
  ptxBalance?: number;
  
  // 세션 정보
  sessions?: {
    [key: string]: {
      token: string;
      expiresAt: Date;
      device: string;
      ip: string;
      lastActive: Date;
    };
  };
  
  // 타임스탬프
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 유저 스키마
 */
const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true, // null 값 허용 (지갑만으로 가입 시)
      validate: {
        validator: (email: string) => {
          if (!email) return true; // 필수값 아님
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Invalid email format',
      },
    },
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      validate: {
        validator: (username: string) => {
          return /^[a-zA-Z0-9_]+$/.test(username);
        },
        message: 'Username can only contain letters, numbers, and underscores',
      },
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
    password: {
      type: String,
      select: false, // 기본적으로 쿼리 결과에 포함하지 않음
      validate: {
        validator: function(this: IUser, password: string) {
          // 지갑 사용자는 비밀번호 필요 없음
          return this.walletAddress || !!password;
        },
        message: 'Password is required for email-based accounts',
      },
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'locked'],
      default: 'inactive', // 이메일 인증 전까지는 inactive
    },
    
    // 이메일 인증 관련
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    
    // 비밀번호 재설정 관련
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // 지갑 정보
    walletAddress: {
      type: String,
      lowercase: true,
      unique: true,
      sparse: true, // null 값 허용 (이메일로만 가입 시)
    },
    walletType: {
      type: String,
      enum: ['metamask', 'wallet-connect', 'coinbase-wallet', 'other'],
    },
    
    // 소셜 로그인 정보
    social: {
      google: {
        id: String,
        data: Schema.Types.Mixed,
      },
      discord: {
        id: String,
        data: Schema.Types.Mixed,
      },
      twitter: {
        id: String,
        data: Schema.Types.Mixed,
      },
    },
    
    // 보안 관련
    loginFailures: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false, // 기본적으로 쿼리 결과에 포함하지 않음
    },
    
    // 프로필 정보
    avatar: String,
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    website: {
      type: String,
      maxlength: [200, 'Website URL cannot exceed 200 characters'],
    },
    location: {
      type: String,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    
    // 통계 정보
    lastLogin: Date,
    lastActive: Date,
    registrationMethod: {
      type: String,
      enum: ['email', 'wallet', 'google', 'discord', 'twitter'],
      default: 'email',
    },
    
    // DIY 크래프팅 월드 특화 정보
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
    vxcBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    ptxBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // 세션 정보
    sessions: {
      type: Map,
      of: {
        token: String,
        expiresAt: Date,
        device: String,
        ip: String,
        lastActive: Date,
      },
    },
  },
  { timestamps: true }
);

// 인덱스 설정
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ walletAddress: 1 }, { unique: true, sparse: true });
UserSchema.index({ 'social.google.id': 1 }, { sparse: true });
UserSchema.index({ 'social.discord.id': 1 }, { sparse: true });
UserSchema.index({ 'social.twitter.id': 1 }, { sparse: true });
UserSchema.index({ createdAt: 1 });
UserSchema.index({ status: 1 });

// 가상 필드: userId (클라이언트에게 제공할 안전한 ID)
UserSchema.virtual('userId').get(function(this: IUser) {
  return this._id.toString();
});

// 사용자 세션 생성
UserSchema.methods.createSession = function(
  this: IUser,
  device: string,
  ip: string,
  expiresIn: number = 7 * 24 * 60 * 60 * 1000 // 7일
) {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + expiresIn);
  
  // 세션 객체 초기화
  if (!this.sessions) {
    this.sessions = {};
  }
  
  // 세션 추가
  this.sessions[sessionId] = {
    token: uuidv4(),
    expiresAt,
    device,
    ip,
    lastActive: new Date(),
  };
  
  return {
    sessionId,
    token: this.sessions[sessionId].token,
    expiresAt,
  };
};

// 만료된 세션 정리
UserSchema.methods.cleanExpiredSessions = function(this: IUser) {
  if (!this.sessions) return;
  
  const now = new Date();
  
  // 만료된 세션 필터링
  for (const sessionId in this.sessions) {
    if (this.sessions[sessionId].expiresAt < now) {
      delete this.sessions[sessionId];
    }
  }
};

// 사용자 모델
const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
