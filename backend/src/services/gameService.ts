import { User } from '../models/User';
import { Game } from '../models/Game';
import { NFT } from '../models/NFT';
import { Land } from '../models/Land';
import { Quest } from '../models/Quest';
import { Season } from '../models/Season';
import { ErrorCode, AppError } from '../common/errors';
import { Redis } from '../utils/redis';
import { BlockchainService } from './blockchainService';
import { NFTService } from './nftService';

interface GameState {
  user: {
    id: string;
    level: number;
    experience: number;
    resources: Record<string, number>;
  };
  land: {
    id: string;
    size: { width: number; height: number };
    buildings: any[];
  };
  season: {
    id: string;
    name: string;
    progress: number;
  };
  quests: {
    active: any[];
    completed: number;
    available: number;
  };
}

interface ResourceCollection {
  resourceType: string;
  amount: number;
  landId: string;
}

interface CraftingRecipe {
  itemType: string;
  recipe: string;
  materials: Record<string, number>;
}

interface BuildingData {
  landId: string;
  buildingType: string;
  position: { x: number; y: number };
  materials: Record<string, number>;
}

interface QuestFilter {
  type?: string;
  difficulty?: string;
  status?: string;
}

interface LandExpansion {
  landId: string;
  direction: 'north' | 'south' | 'east' | 'west';
  size: number;
  cost: { type: 'token' | 'resource'; amount: number; tokenType?: string };
}

interface ExplorationData {
  targetWorldId: string;
  explorationTime: number;
}

interface GameSettings {
  graphics: {
    quality: 'low' | 'medium' | 'high' | 'ultra';
    effects: boolean;
    particles: boolean;
  };
  audio: {
    master: number;
    music: number;
    effects: number;
    ambient: number;
  };
  controls: {
    sensitivity: number;
    invertY: boolean;
    keybindings: Record<string, string>;
  };
  gameplay: {
    autoSave: boolean;
    tutorials: boolean;
    hints: boolean;
  };
}

export class GameService {
  /**
   * 플레이어 게임 상태 조회
   */
  async getPlayerGameState(userId: string): Promise<GameState> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('사용자를 찾을 수 없습니다.', ErrorCode.USER_NOT_FOUND);
    }

    // 게임 데이터 조회
    const game = await Game.findOne({ user: userId }) || await this.initializeGameForUser(userId);
    
    // 플레이어 랜드 조회
    const land = await Land.findOne({ owner: userId });
    if (!land) {
      throw new AppError('플레이어 랜드를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 현재 시즌 정보
    const currentSeason = await Season.findOne({ active: true });
    
    // 활성 퀘스트 조회
    const activeQuests = await Quest.find({ 
      player: userId, 
      status: 'active' 
    });

    // 사용 가능한 퀘스트 수 계산
    const availableQuests = await Quest.countDocuments({
      active: true,
      requirements: { $and: [
        { level: { $lte: user.profile.level } },
        { 'questLine.completed': { $not: { $in: [userId] } } }
      ] }
    });

    // 완료된 퀘스트 수
    const completedQuests = await Quest.countDocuments({
      'questLine.completed': userId
    });

    return {
      user: {
        id: userId,
        level: user.profile.level,
        experience: user.profile.experience,
        resources: game.resources,
      },
      land: {
        id: land._id.toString(),
        size: land.size,
        buildings: land.buildings,
      },
      season: {
        id: currentSeason?._id.toString() || '',
        name: currentSeason?.name || 'No Active Season',
        progress: game.seasonProgress || 0,
      },
      quests: {
        active: activeQuests,
        completed: completedQuests,
        available: availableQuests,
      },
    };
  }

  /**
   * 플레이어 랜드 정보 조회
   */
  async getPlayerLand(userId: string): Promise<any> {
    const land = await Land.findOne({ owner: userId }).populate('buildings');
    if (!land) {
      // 랜드가 없으면 초기 랜드 생성
      return await this.createInitialLand(userId);
    }

    return land;
  }

  /**
   * 랜드 상의 건물 조회
   */
  async getLandBuildings(landId: string, userId: string): Promise<any[]> {
    const land = await Land.findById(landId);
    if (!land) {
      throw new AppError('랜드를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 권한 확인 (소유자 또는 방문 권한)
    if (land.owner.toString() !== userId && land.accessType === 'private') {
      throw new AppError('접근 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    return land.buildings;
  }

  /**
   * 자원 수집
   */
  async collectResources(userId: string, data: ResourceCollection): Promise<any> {
    const game = await Game.findOne({ user: userId });
    const land = await Land.findById(data.landId);

    if (!game || !land) {
      throw new AppError('게임 데이터 또는 랜드를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 랜드 소유권 확인
    if (land.owner.toString() !== userId) {
      throw new AppError('자원을 수집할 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    // 자원 수집 쿨다운 확인
    const lastCollected = await Redis.get(`resource_collection:${userId}:${data.resourceType}`);
    if (lastCollected) {
      const cooldownMs = 60000; // 1분 쿨다운
      const elapsedMs = Date.now() - parseInt(lastCollected);
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        throw new AppError(`${remainingSeconds}초 후에 다시 수집할 수 있습니다.`, ErrorCode.RESOURCE_COOLDOWN);
      }
    }

    // 랜드의 자원 생성률 확인
    const resourceGenerationRate = land.resourceGeneration?.[data.resourceType] || 0;
    if (resourceGenerationRate <= 0) {
      throw new AppError('이 랜드에서는 해당 자원을 수집할 수 없습니다.', ErrorCode.RESOURCE_UNAVAILABLE);
    }

    // 최대 수집 가능량 계산
    const maxCollectableAmount = Math.floor(resourceGenerationRate * data.amount);
    const actualAmount = Math.min(data.amount, maxCollectableAmount);

    // 자원 업데이트
    game.resources[data.resourceType] = (game.resources[data.resourceType] || 0) + actualAmount;
    await game.save();

    // 쿨다운 설정
    await Redis.set(`resource_collection:${userId}:${data.resourceType}`, Date.now().toString(), 60);

    // 경험치 추가
    await this.addExperience(userId, actualAmount * 2);

    return {
      resourceType: data.resourceType,
      collected: actualAmount,
      total: game.resources[data.resourceType],
      experienceGained: actualAmount * 2,
    };
  }

  /**
   * 아이템 제작
   */
  async craftItem(userId: string, data: CraftingRecipe): Promise<any> {
    const game = await Game.findOne({ user: userId });
    if (!game) {
      throw new AppError('게임 데이터를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 레시피 유효성 확인
    const recipe = await this.validateRecipe(data.recipe);
    if (!recipe) {
      throw new AppError('유효하지 않은 레시피입니다.', ErrorCode.INVALID_RECIPE);
    }

    // 재료 확인
    for (const [material, requiredAmount] of Object.entries(data.materials)) {
      const availableAmount = game.resources[material] || 0;
      if (availableAmount < requiredAmount) {
        throw new AppError(`${material} 재료가 부족합니다. (필요: ${requiredAmount}, 보유: ${availableAmount})`, ErrorCode.INSUFFICIENT_RESOURCES);
      }
    }

    // 재료 소모
    for (const [material, requiredAmount] of Object.entries(data.materials)) {
      game.resources[material] -= requiredAmount;
    }
    await game.save();

    // 아이템 생성 (NFT로 발행)
    const itemData = {
      type: data.itemType,
      owner: userId,
      metadata: {
        name: recipe.name,
        description: recipe.description,
        attributes: recipe.attributes,
        createdBy: userId,
        recipe: data.recipe,
      },
    };

    const nft = await NFTService.mintNFT(userId, itemData);

    // 경험치 추가
    const experienceGained = recipe.experienceReward || 50;
    await this.addExperience(userId, experienceGained);

    return {
      nft,
      materialsUsed: data.materials,
      experienceGained,
    };
  }

  /**
   * 건물 건설
   */
  async buildStructure(userId: string, data: BuildingData): Promise<any> {
    const land = await Land.findById(data.landId);
    if (!land) {
      throw new AppError('랜드를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 땅 소유권 확인
    if (land.owner.toString() !== userId) {
      throw new AppError('건설 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    // 위치 유효성 확인
    if (!this.isValidBuildingPosition(land, data.position)) {
      throw new AppError('유효하지 않은 건설 위치입니다.', ErrorCode.INVALID_POSITION);
    }

    // 재료 확인 및 소모
    const game = await Game.findOne({ user: userId });
    if (!game) {
      throw new AppError('게임 데이터를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    for (const [material, requiredAmount] of Object.entries(data.materials)) {
      const availableAmount = game.resources[material] || 0;
      if (availableAmount < requiredAmount) {
        throw new AppError(`${material} 재료가 부족합니다.`, ErrorCode.INSUFFICIENT_RESOURCES);
      }
    }

    // 재료 소모
    for (const [material, requiredAmount] of Object.entries(data.materials)) {
      game.resources[material] -= requiredAmount;
    }
    await game.save();

    // 건물 생성
    const building = {
      type: data.buildingType,
      position: data.position,
      level: 1,
      builtAt: new Date(),
      owner: userId,
    };

    land.buildings.push(building);
    await land.save();

    // 건물 NFT 발행
    const buildingNft = await NFTService.mintBuildingNFT(userId, {
      buildingType: data.buildingType,
      landId: data.landId,
      position: data.position,
    });

    // 경험치 추가
    const experienceGained = 100;
    await this.addExperience(userId, experienceGained);

    return {
      building,
      nft: buildingNft,
      materialsUsed: data.materials,
      experienceGained,
    };
  }

  /**
   * 건물 업그레이드
   */
  async upgradeBuilding(userId: string, data: any): Promise<any> {
    const { buildingId, upgradeLevel, materials } = data;

    // 건물 조회
    const land = await Land.findOne({ 'buildings._id': buildingId });
    if (!land) {
      throw new AppError('건물을 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    const building = land.buildings.find(b => b._id.toString() === buildingId);
    if (!building) {
      throw new AppError('건물을 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 권한 확인
    if (land.owner.toString() !== userId) {
      throw new AppError('업그레이드 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    // 업그레이드 레벨 확인
    if (building.level >= upgradeLevel) {
      throw new AppError('이미 해당 레벨이거나 더 높은 레벨입니다.', ErrorCode.INVALID_UPGRADE_LEVEL);
    }

    // 재료 확인 및 소모
    const game = await Game.findOne({ user: userId });
    if (!game) {
      throw new AppError('게임 데이터를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    for (const [material, requiredAmount] of Object.entries(materials)) {
      const availableAmount = game.resources[material] || 0;
      if (availableAmount < requiredAmount) {
        throw new AppError(`${material} 재료가 부족합니다.`, ErrorCode.INSUFFICIENT_RESOURCES);
      }
    }

    // 재료 소모
    for (const [material, requiredAmount] of Object.entries(materials)) {
      game.resources[material] -= requiredAmount;
    }
    await game.save();

    // 건물 업그레이드
    building.level = upgradeLevel;
    building.upgradedAt = new Date();
    await land.save();

    // 경험치 추가
    const experienceGained = 50 * upgradeLevel;
    await this.addExperience(userId, experienceGained);

    return {
      building,
      experienceGained,
    };
  }

  /**
   * 퀘스트 목록 조회
   */
  async getAvailableQuests(userId: string, filters: QuestFilter): Promise<any[]> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('사용자를 찾을 수 없습니다.', ErrorCode.USER_NOT_FOUND);
    }

    const query: any = { active: true };

    // 필터 적용
    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.difficulty) {
      query.difficulty = filters.difficulty;
    }

    if (filters.status) {
      if (filters.status === 'active') {
        query['questLine.active'] = userId;
      } else if (filters.status === 'completed') {
        query['questLine.completed'] = userId;
      } else if (filters.status === 'available') {
        query.requirements = { level: { $lte: user.profile.level } };
        query['questLine.completed'] = { $ne: userId };
      }
    } else {
      // 기본적으로 사용 가능한 퀘스트만 조회
      query.requirements = { level: { $lte: user.profile.level } };
      query['questLine.completed'] = { $ne: userId };
    }

    const quests = await Quest.find(query).sort({ priority: -1, createdAt: -1 });

    return quests;
  }

  /**
   * 퀘스트 시작
   */
  async startQuest(userId: string, questId: string): Promise<any> {
    const user = await User.findById(userId);
    const quest = await Quest.findById(questId);

    if (!user || !quest) {
      throw new AppError('사용자 또는 퀘스트를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 퀘스트 요구사항 확인
    if (quest.requirements.level > user.profile.level) {
      throw new AppError('레벨이 부족합니다.', ErrorCode.INSUFFICIENT_LEVEL);
    }

    // 이미 진행 중인지 확인
    if (quest.questLine.active.includes(userId)) {
      throw new AppError('이미 진행 중인 퀘스트입니다.', ErrorCode.QUEST_ALREADY_ACTIVE);
    }

    // 이미 완료했는지 확인
    if (quest.questLine.completed.includes(userId)) {
      throw new AppError('이미 완료한 퀘스트입니다.', ErrorCode.QUEST_ALREADY_COMPLETED);
    }

    // 활성 퀘스트 수 제한 확인
    const activeQuestCount = await Quest.countDocuments({ 'questLine.active': userId });
    if (activeQuestCount >= 5) { // 최대 5개 퀘스트 동시 진행
      throw new AppError('진행 중인 퀘스트가 너무 많습니다.', ErrorCode.TOO_MANY_ACTIVE_QUESTS);
    }

    // 퀘스트 시작
    quest.questLine.active.push(userId);
    await quest.save();

    // 퀘스트 진행상황 초기화
    await Redis.set(`quest_progress:${userId}:${questId}`, JSON.stringify({
      startedAt: new Date().toISOString(),
      objectives: {},
    }), 24 * 60 * 60); // 24시간 저장

    return quest;
  }

  /**
   * 퀘스트 완료
   */
  async completeQuest(userId: string, questId: string, evidence: any): Promise<any> {
    const quest = await Quest.findById(questId);
    if (!quest) {
      throw new AppError('퀘스트를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 퀘스트가 활성화되어 있는지 확인
    if (!quest.questLine.active.includes(userId)) {
      throw new AppError('활성화된 퀘스트가 아닙니다.', ErrorCode.QUEST_NOT_ACTIVE);
    }

    // 퀘스트 진행상황 확인
    const progressData = await Redis.get(`quest_progress:${userId}:${questId}`);
    if (!progressData) {
      throw new AppError('퀘스트 진행 데이터를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    const progress = JSON.parse(progressData);

    // 퀘스트 완료 조건 확인
    if (!this.checkQuestCompletion(quest, progress, evidence)) {
      throw new AppError('퀘스트 완료 조건을 만족하지 않습니다.', ErrorCode.QUEST_REQUIREMENTS_NOT_MET);
    }

    // 퀘스트 완료 처리
    quest.questLine.active = quest.questLine.active.filter(id => id.toString() !== userId);
    quest.questLine.completed.push(userId);
    await quest.save();

    // 보상 지급
    const rewards = await this.grantQuestRewards(userId, quest);

    // 진행상황 데이터 삭제
    await Redis.del(`quest_progress:${userId}:${questId}`);

    return {
      quest,
      rewards,
      completedAt: new Date(),
    };
  }

  /**
   * 랜드 확장
   */
  async expandLand(userId: string, data: LandExpansion): Promise<any> {
    const land = await Land.findById(data.landId);
    if (!land) {
      throw new AppError('랜드를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 소유권 확인
    if (land.owner.toString() !== userId) {
      throw new AppError('랜드 확장 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    // 확장 비용 확인
    if (data.cost.type === 'token') {
      // 토큰으로 지불하는 경우
      const hasEnoughTokens = await BlockchainService.checkTokenBalance(userId, data.cost.tokenType!, data.cost.amount);
      if (!hasEnoughTokens) {
        throw new AppError('토큰이 부족합니다.', ErrorCode.INSUFFICIENT_TOKENS);
      }

      // 토큰 소모 (실제 블록체인 트랜잭션)
      await BlockchainService.burnTokens(userId, data.cost.tokenType!, data.cost.amount);
    } else {
      // 자원으로 지불하는 경우
      const game = await Game.findOne({ user: userId });
      if (!game) {
        throw new AppError('게임 데이터를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
      }

      const availableResources = game.resources['expandToken'] || 0;
      if (availableResources < data.cost.amount) {
        throw new AppError('자원이 부족합니다.', ErrorCode.INSUFFICIENT_RESOURCES);
      }

      game.resources['expandToken'] -= data.cost.amount;
      await game.save();
    }

    // 랜드 크기 확장
    const currentSize = land.size;
    const newSize = { ...currentSize };

    switch (data.direction) {
      case 'north':
        newSize.height += data.size;
        break;
      case 'south':
        newSize.height += data.size;
        break;
      case 'east':
        newSize.width += data.size;
        break;
      case 'west':
        newSize.width += data.size;
        break;
    }

    land.size = newSize;
    land.expandedAt = new Date();
    await land.save();

    // 경험치 추가
    const experienceGained = data.size * 100;
    await this.addExperience(userId, experienceGained);

    return {
      land,
      previousSize: currentSize,
      newSize,
      expanded: data.size,
      direction: data.direction,
      experienceGained,
    };
  }

  /**
   * 플레이어 통계 조회
   */
  async getPlayerStats(userId: string): Promise<any> {
    const user = await User.findById(userId);
    const game = await Game.findOne({ user: userId });
    const land = await Land.findOne({ owner: userId });

    if (!user || !game || !land) {
      throw new AppError('플레이어 데이터를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 건물 통계
    const buildingStats = {
      total: land.buildings.length,
      byType: {},
      totalLevels: 0,
    };

    land.buildings.forEach(building => {
      buildingStats.byType[building.type] = (buildingStats.byType[building.type] || 0) + 1;
      buildingStats.totalLevels += building.level;
    });

    // NFT 통계
    const nftStats = await NFT.aggregate([
      { $match: { owner: userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // 퀘스트 통계
    const questStats = {
      completed: await Quest.countDocuments({ 'questLine.completed': userId }),
      active: await Quest.countDocuments({ 'questLine.active': userId }),
    };

    // 자원 통계
    const resourceStats = {
      total: Object.keys(game.resources).length,
      totalValue: Object.values(game.resources).reduce((sum, value) => sum + value, 0),
      resources: game.resources,
    };

    return {
      user: {
        level: user.profile.level,
        experience: user.profile.experience,
        playTime: game.playTime || 0,
        lastActive: game.lastActive || new Date(),
      },
      land: {
        size: land.size,
        totalArea: land.size.width * land.size.height,
        buildings: buildingStats,
      },
      nfts: nftStats,
      quests: questStats,
      resources: resourceStats,
      achievements: user.achievements || [],
    };
  }

  /**
   * 현재 시즌 정보 조회
   */
  async getCurrentSeason(): Promise<any> {
    const currentSeason = await Season.findOne({ active: true });
    if (!currentSeason) {
      return null;
    }

    return currentSeason;
  }

  /**
   * 시즌 진행도 조회
   */
  async getSeasonProgress(userId: string): Promise<any> {
    const game = await Game.findOne({ user: userId });
    if (!game) {
      throw new AppError('게임 데이터를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    const currentSeason = await Season.findOne({ active: true });
    if (!currentSeason) {
      return null;
    }

    return {
      season: currentSeason,
      progress: game.seasonProgress || 0,
      rewards: game.seasonRewards || {},
      tier: this.calculateSeasonTier(game.seasonProgress || 0),
    };
  }

  /**
   * 일일 보상 수령
   */
  async claimDailyReward(userId: string): Promise<any> {
    const user = await User.findById(userId);
    const game = await Game.findOne({ user: userId });

    if (!user || !game) {
      throw new AppError('사용자 데이터를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 마지막 보상 수령 시간 확인
    const today = new Date().toDateString();
    const lastClaimed = game.dailyReward?.lastClaimed?.toDateString();

    if (lastClaimed === today) {
      throw new AppError('이미 오늘 보상을 수령했습니다.', ErrorCode.DAILY_REWARD_ALREADY_CLAIMED);
    }

    // 연속 접속일 계산
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    let streak = 1;

    if (lastClaimed === yesterday) {
      streak = (game.dailyReward?.streak || 0) + 1;
    }

    // 보상 계산
    const baseReward = {
      vxc: 50,
      experience: 100,
    };

    const streakBonus = Math.min(streak * 0.1, 1); // 최대 100% 보너스
    const reward = {
      vxc: Math.floor(baseReward.vxc * (1 + streakBonus)),
      experience: Math.floor(baseReward.experience * (1 + streakBonus)),
      streak,
    };

    // 보상 지급
    await this.addResources(userId, { vxc: reward.vxc });
    await this.addExperience(userId, reward.experience);

    // 데이터 업데이트
    game.dailyReward = {
      lastClaimed: new Date(),
      streak,
    };
    await game.save();

    return reward;
  }

  /**
   * 플레이 시간 업데이트
   */
  async updatePlayTime(userId: string, playTime: number): Promise<void> {
    const game = await Game.findOne({ user: userId });
    if (!game) {
      throw new AppError('게임 데이터를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    game.playTime = (game.playTime || 0) + playTime;
    game.lastActive = new Date();
    await game.save();
  }

  /**
   * 월드 탐험
   */
  async exploreWorld(userId: string, data: ExplorationData): Promise<any> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('사용자를 찾을 수 없습니다.', ErrorCode.USER_NOT_FOUND);
    }

    // 대상 월드 확인
    const targetWorld = await Land.findById(data.targetWorldId);
    if (!targetWorld) {
      throw new AppError('대상 월드를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 탐험 비용 계산
    const explorationCost = this.calculateExplorationCost(data.explorationTime);
    
    // 자원 확인
    const game = await Game.findOne({ user: userId });
    if (!game) {
      throw new AppError('게임 데이터를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    if ((game.resources.energy || 0) < explorationCost.energy) {
      throw new AppError('에너지가 부족합니다.', ErrorCode.INSUFFICIENT_RESOURCES);
    }

    // 자원 소모
    game.resources.energy -= explorationCost.energy;
    await game.save();

    // 탐험 시작
    const exploration = {
      id: crypto.randomUUID(),
      userId,
      targetWorldId: data.targetWorldId,
      startTime: new Date(),
      duration: data.explorationTime,
      status: 'in_progress',
    };

    // Redis에 탐험 정보 저장
    await Redis.set(`exploration:${exploration.id}`, JSON.stringify(exploration), data.explorationTime);

    // 백그라운드에서 탐험 완료 처리 스케줄링
    setTimeout(() => {
      this.completeExploration(exploration.id);
    }, data.explorationTime * 1000);

    return exploration;
  }

  /**
   * 탐험 결과 조회
   */
  async getExplorationResult(userId: string, explorationId: string): Promise<any> {
    const explorationData = await Redis.get(`exploration:${explorationId}`);
    if (!explorationData) {
      throw new AppError('탐험 정보를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    const exploration = JSON.parse(explorationData);
    
    // 권한 확인
    if (exploration.userId !== userId) {
      throw new AppError('탐험 결과 조회 권한이 없습니다.', ErrorCode.FORBIDDEN);
    }

    return exploration;
  }

  /**
   * 게임 설정 업데이트
   */
  async updateGameSettings(userId: string, settings: GameSettings): Promise<GameSettings> {
    const game = await Game.findOne({ user: userId });
    if (!game) {
      throw new AppError('게임 데이터를 찾을 수 없습니다.', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // 설정 병합
    game.settings = {
      ...game.settings,
      ...settings,
    };

    await game.save();

    return game.settings;
  }

  /* Private Helper Methods */

  /**
   * 사용자 게임 데이터 초기화
   */
  private async initializeGameForUser(userId: string): Promise<any> {
    const game = await Game.create({
      user: userId,
      resources: {
        wood: 100,
        stone: 50,
        iron: 25,
        energy: 100,
      },
      playTime: 0,
      settings: {
        graphics: { quality: 'medium', effects: true, particles: true },
        audio: { master: 1, music: 0.7, effects: 0.8, ambient: 0.6 },
        controls: { sensitivity: 1, invertY: false, keybindings: {} },
        gameplay: { autoSave: true, tutorials: true, hints: true },
      },
    });

    // 초기 랜드 생성
    await this.createInitialLand(userId);

    return game;
  }

  /**
   * 초기 랜드 생성
   */
  private async createInitialLand(userId: string): Promise<any> {
    const land = await Land.create({
      owner: userId,
      size: { width: 10, height: 10 },
      landType: 'plains',
      buildings: [],
      accessType: 'private',
      resourceGeneration: {
        wood: 0.1,
        stone: 0.05,
        iron: 0.02,
      },
    });

    return land;
  }

  /**
   * 경험치 추가
   */
  private async addExperience(userId: string, experience: number): Promise<void> {
    const user = await User.findById(userId);
    if (!user) return;

    const currentLevel = user.profile.level;
    const currentExp = user.profile.experience;
    const newExp = currentExp + experience;

    // 레벨업 확인
    const newLevel = this.calculateLevel(newExp);
    
    if (newLevel > currentLevel) {
      // 레벨업 보상
      await this.handleLevelUp(userId, currentLevel, newLevel);
    }

    user.profile.experience = newExp;
    user.profile.level = newLevel;
    await user.save();
  }

  /**
   * 자원 추가
   */
  private async addResources(userId: string, resources: Record<string, number>): Promise<void> {
    const game = await Game.findOne({ user: userId });
    if (!game) return;

    for (const [resource, amount] of Object.entries(resources)) {
      game.resources[resource] = (game.resources[resource] || 0) + amount;
    }

    await game.save();
  }

  /**
   * 레벨업 처리
   */
  private async handleLevelUp(userId: string, oldLevel: number, newLevel: number): Promise<void> {
    // 레벨업 보상 계산
    const levelUpRewards = {
      vxc: newLevel * 100,
      ptx: Math.floor(newLevel / 5), // 5레벨마다 PTX 지급
    };

    // 보상 지급
    await this.addResources(userId, levelUpRewards);

    // 레벨업 알림 (이벤트 발행)
    // EventEmitter를 통해 다른 서비스에 알림
  }

  /**
   * 레벨 계산
   */
  private calculateLevel(experience: number): number {
    // 레벨업 필요 경험치 공식: level^2 * 100
    let level = 1;
    let requiredExp = 0;

    while (experience >= requiredExp) {
      level++;
      requiredExp += level * level * 100;
    }

    return level - 1;
  }

  /**
   * 레시피 유효성 검사
   */
  private async validateRecipe(recipeId: string): Promise<any> {
    // 실제 구현에서는 레시피 데이터베이스에서 조회
    // 여기서는 간단한 예시만 제공
    const recipes = {
      'basic_sword': {
        name: 'Basic Sword',
        description: 'A simple sword for beginners',
        attributes: { damage: 10, durability: 100 },
        experienceReward: 50,
      },
      'wooden_house': {
        name: 'Wooden House',
        description: 'A cozy wooden house',
        attributes: { capacity: 4, durability: 500 },
        experienceReward: 100,
      },
    };

    return recipes[recipeId] || null;
  }

  /**
   * 건설 위치 유효성 검사
   */
  private isValidBuildingPosition(land: any, position: { x: number; y: number }): boolean {
    // 랜드 범위 내인지 확인
    if (position.x < 0 || position.x >= land.size.width ||
        position.y < 0 || position.y >= land.size.height) {
      return false;
    }

    // 다른 건물과 겹치는지 확인
    for (const building of land.buildings) {
      if (building.position.x === position.x && building.position.y === position.y) {
        return false;
      }
    }

    return true;
  }

  /**
   * 퀘스트 완료 조건 확인
   */
  private checkQuestCompletion(quest: any, progress: any, evidence: any): boolean {
    // 퀘스트 타입별 완료 조건 확인
    switch (quest.type) {
      case 'collect':
        return evidence.collected >= quest.objectives.target;
      case 'build':
        return evidence.built >= quest.objectives.target;
      case 'craft':
        return evidence.crafted >= quest.objectives.target;
      default:
        return true;
    }
  }

  /**
   * 퀘스트 보상 지급
   */
  private async grantQuestRewards(userId: string, quest: any): Promise<any> {
    const rewards = quest.rewards;

    // 자원 보상
    if (rewards.resources) {
      await this.addResources(userId, rewards.resources);
    }

    // 경험치 보상
    if (rewards.experience) {
      await this.addExperience(userId, rewards.experience);
    }

    // NFT 보상
    if (rewards.nfts) {
      for (const nftData of rewards.nfts) {
        await NFTService.mintNFT(userId, nftData);
      }
    }

    return rewards;
  }

  /**
   * 시즌 티어 계산
   */
  private calculateSeasonTier(progress: number): string {
    if (progress >= 100000) return 'Legendary';
    if (progress >= 50000) return 'Epic';
    if (progress >= 20000) return 'Rare';
    if (progress >= 5000) return 'Uncommon';
    return 'Common';
  }

  /**
   * 탐험 비용 계산
   */
  private calculateExplorationCost(duration: number): { energy: number } {
    return {
      energy: Math.ceil(duration / 60), // 1분당 1 에너지
    };
  }

  /**
   * 탐험 완료 처리
   */
  private async completeExploration(explorationId: string): Promise<void> {
    const explorationData = await Redis.get(`exploration:${explorationId}`);
    if (!explorationData) return;

    const exploration = JSON.parse(explorationData);
    
    // 탐험 결과 계산
    const results = this.calculateExplorationResults(exploration);
    
    // 보상 지급
    await this.addResources(exploration.userId, results.resources);
    if (results.experience) {
      await this.addExperience(exploration.userId, results.experience);
    }

    // 탐험 완료 상태 업데이트
    exploration.status = 'completed';
    exploration.results = results;
    exploration.completedAt = new Date();

    await Redis.set(`exploration:${explorationId}`, JSON.stringify(exploration), 3600); // 1시간 동안 결과 보관
  }

  /**
   * 탐험 결과 계산
   */
  private calculateExplorationResults(exploration: any): any {
    // 단순한 예시 구현
    const duration = exploration.duration;
    const baseReward = Math.floor(duration / 60);

    return {
      resources: {
        wood: baseReward * 10,
        stone: baseReward * 5,
        iron: baseReward * 2,
      },
      experience: baseReward * 50,
      discoveries: Math.random() > 0.7 ? ['rare_resource'] : [],
    };
  }
}

export default new GameService();
