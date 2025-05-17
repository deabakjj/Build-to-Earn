/**
 * World 및 Block 관련 타입 정의
 */

// 블록 데이터
export interface BlockData {
  id?: string;
  type: string;
  height?: number;
  customColor?: string;
  texture?: string;
  decorations?: BlockDecoration[];
  metadata?: Record<string, any>;
}

// 블록 장식
export interface BlockDecoration {
  id: string;
  name: string;
  type: 'grass' | 'flower' | 'mushroom' | 'crystal' | 'light' | 'custom';
  modelPath?: string;
  color?: string;
  glowIntensity?: number;
  animationType?: 'none' | 'sway' | 'rotate' | 'pulse';
  position?: {
    x: number;
    y: number;
    z: number;
  };
}

// 월드 데이터
export interface WorldData {
  id: string;
  owner: string;
  name: string;
  size: { 
    width: number; 
    height: number; 
  };
  blocks: BlockData[][];
  buildings: PlacedBuilding[];
  vehicles: PlacedVehicle[];
  items: PlacedItem[];
  settings: WorldSettings;
  weather: WeatherState;
  season: SeasonState;
  visitors: VisitorInfo[];
  createdAt: Date;
  updatedAt: Date;
}

// 배치된 객체 기본 인터페이스
export interface PlacedObject {
  id: string;
  position: { 
    x: number, 
    y: number, 
    z: number 
  };
  rotation: { 
    x: number, 
    y: number, 
    z: number 
  };
  scale: { 
    x: number, 
    y: number, 
    z: number 
  };
}

// 배치된 건물
export interface PlacedBuilding extends PlacedObject {
  buildingId: string;
  isPublic: boolean;
  permissions: string[];
}

// 배치된 탈것
export interface PlacedVehicle extends PlacedObject {
  vehicleId: string;
  fuel: number;
  durability: number;
}

// 배치된 아이템
export interface PlacedItem extends PlacedObject {
  itemId: string;
  quantity: number;
  durability?: number;
}

// 월드 설정
export interface WorldSettings {
  isPublic: boolean;
  allowVisitors: boolean;
  entryFee: string;
  allowBuilding: boolean;
  allowedVisitors: string[];
  maxVisitors: number;
  worldName: string;
  worldDescription: string;
  worldTags: string[];
  autoSave: boolean;
  backup: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
  };
}

// 날씨 상태
export interface WeatherState {
  type: 'sunny' | 'rainy' | 'snowy' | 'foggy' | 'stormy' | 'overcast';
  intensity: number;
  duration: number;
  windSpeed: number;
  temperature: number;
  humidity: number;
}

// 시즌 상태
export interface SeasonState {
  current: 'spring' | 'summer' | 'autumn' | 'winter';
  timeOfDay: number; // 0-24 (0=자정, 12=정오)
  dayNightCycle: number; // 0-1 (0=밤, 0.5=낮, 1=밤)
  seasonProgress: number; // 0-1 (현재 시즌 진행도)
  effects: {
    blockGrowth: number;
    weatherPatterns: string[];
    specialEvents: string[];
  };
}

// 방문자 정보
export interface VisitorInfo {
  userId: string;
  username: string;
  avatar?: string;
  joinedAt: Date;
  isOwner: boolean;
  isOperator?: boolean;
  permissions: Permission[];
  stats: {
    timeSpent: number;
    itemsPlaced: number;
    itemsRemoved: number;
    timesVisited: number;
  };
}

// 권한 타입
export type Permission = 
  | 'view'
  | 'build'
  | 'destroy'
  | 'edit'
  | 'manage_visitors'
  | 'manage_settings'
  | 'manage_permissions';

// 월드 이벤트
export interface WorldEvent {
  id: string;
  type: 'block_placed' | 'block_removed' | 'building_placed' | 'visitor_joined' | 'visitor_left' | 'weather_changed' | 'season_changed';
  timestamp: Date;
  userId: string;
  data: Record<string, any>;
  worldId: string;
}

// 월드 템플릿
export interface WorldTemplate {
  id: string;
  name: string;
  description: string;
  size: { width: number; height: number };
  preview: string;
  category: 'starter' | 'themed' | 'challenge' | 'creative';
  difficulty: 'easy' | 'medium' | 'hard';
  features: string[];
  blocks: BlockData[][];
  prebuiltStructures: {
    buildings: PlacedBuilding[];
    vehicles: PlacedVehicle[];
    items: PlacedItem[];
  };
  defaultSettings: Partial<WorldSettings>;
}

// 월드 백업
export interface WorldBackup {
  id: string;
  worldId: string;
  timestamp: Date;
  version: string;
  size: number;
  data: {
    world: WorldData;
    checksum: string;
  };
  metadata: {
    createdBy: string;
    reason: 'auto' | 'manual' | 'season_change' | 'major_update';
    changes: string[];
  };
}

// 월드 통계
export interface WorldStats {
  worldId: string;
  totalVisitors: number;
  totalBlocks: number;
  totalBuildings: number;
  totalVehicles: number;
  activeVisitors: number;
  popularBlocks: { blockType: string; count: number }[];
  averageRating: number;
  totalRatings: number;
  viewCount: number;
  lastVisit: Date;
  creationDate: Date;
  lastModified: Date;
}

// 월드 필터
export interface WorldFilter {
  search?: string;
  owner?: string;
  category?: string[];
  size?: {
    min: number;
    max: number;
  };
  visitors?: {
    min: number;
    max: number;
  };
  isPublic?: boolean;
  hasEntry?: boolean;
  rating?: {
    min: number;
    max: number;
  };
  tags?: string[];
  sortBy?: 'popular' | 'newest' | 'oldest' | 'visitors' | 'rating' | 'size';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// 블록 변환 레시피
export interface BlockRecipe {
  id: string;
  name: string;
  description: string;
  inputBlocks: { type: string; count: number }[];
  outputBlock: {
    type: string;
    count: number;
    properties?: Partial<BlockData>;
  };
  requirements: {
    tools?: string[];
    permissions?: Permission[];
    timeRequired?: number;
    skillLevel?: number;
  };
  effects?: {
    experience?: number;
    specialEffects?: string[];
  };
}

// 자동화 시스템
export interface AutomationRule {
  id: string;
  name: string;
  worldId: string;
  isActive: boolean;
  trigger: {
    type: 'time' | 'event' | 'condition';
    parameters: Record<string, any>;
  };
  action: {
    type: 'place_block' | 'remove_block' | 'spawn_item' | 'change_weather' | 'send_message';
    parameters: Record<string, any>;
  };
  conditions?: {
    type: 'block_count' | 'visitor_count' | 'time_of_day';
    parameters: Record<string, any>;
  }[];
  cooldown?: number;
  maxExecutions?: number;
}
