import mongoose, { Document, Schema } from 'mongoose';

export enum WorldType {
  PERSONAL = 'PERSONAL',
  COMMUNITY = 'COMMUNITY',
  GUILD = 'GUILD',
  PUBLIC = 'PUBLIC',
  SEASONAL = 'SEASONAL'
}

export enum BiomeType {
  PLAINS = 'PLAINS',
  FOREST = 'FOREST',
  DESERT = 'DESERT',
  MOUNTAIN = 'MOUNTAIN',
  OCEAN = 'OCEAN',
  TUNDRA = 'TUNDRA',
  SWAMP = 'SWAMP',
  VOLCANIC = 'VOLCANIC',
  FLOATING_ISLAND = 'FLOATING_ISLAND',
  MYSTICAL = 'MYSTICAL'
}

export enum WeatherType {
  CLEAR = 'CLEAR',
  RAIN = 'RAIN',
  SNOW = 'SNOW',
  STORM = 'STORM',
  FOG = 'FOG',
  SANDSTORM = 'SANDSTORM',
  AURORA = 'AURORA'
}

export enum QuestStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ABANDONED = 'ABANDONED'
}

export interface IWorldObject {
  id: string;
  type: 'BLOCK' | 'BUILDING' | 'ITEM' | 'VEHICLE' | 'NPC' | 'DECORATION';
  nftId?: mongoose.Types.ObjectId;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  scale: {
    x: number;
    y: number;
    z: number;
  };
  properties: {
    durability?: number;
    efficiency?: number;
    enchantments?: string[];
    customData?: any;
  };
  owner?: mongoose.Types.ObjectId;
  placedAt: Date;
  lastInteractedAt?: Date;
}

export interface IQuest {
  questId: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'STORY' | 'TUTORIAL' | 'SPECIAL';
  title: string;
  description: string;
  objectives: {
    objectiveId: string;
    description: string;
    type: 'COLLECT' | 'BUILD' | 'CRAFT' | 'TRADE' | 'EXPLORE' | 'SOCIAL' | 'COMBAT';
    target: {
      itemType?: string;
      itemId?: string;
      amount: number;
      location?: {
        worldId?: string;
        coordinates?: { x: number; y: number; z: number };
      };
    };
    progress: number;
    completed: boolean;
  }[];
  rewards: {
    experience: number;
    tokens: {
      vxc: number;
      ptx: number;
    };
    items: {
      itemId: string;
      quantity: number;
    }[];
    nfts: mongoose.Types.ObjectId[];
  };
  requirements: {
    level: number;
    prerequisiteQuests: string[];
    requiredItems: {
      itemId: string;
      quantity: number;
    }[];
  };
  status: QuestStatus;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

export interface IGame extends Document {
  gameId: string;
  world: {
    worldId: string;
    name: string;
    type: WorldType;
    owner: mongoose.Types.ObjectId;
    visibility: 'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY' | 'GUILD_ONLY';
    
    // World configuration
    settings: {
      size: {
        width: number;
        height: number;
        depth: number;
      };
      biome: BiomeType;
      weather: WeatherType;
      timeOfDay: 'MORNING' | 'NOON' | 'EVENING' | 'NIGHT' | 'DYNAMIC';
      difficulty: 'PEACEFUL' | 'EASY' | 'NORMAL' | 'HARD' | 'NIGHTMARE';
      allowPVP: boolean;
      allowGriefing: boolean;
      naturalRegen: boolean;
      mobSpawning: boolean;
      weatherCycle: boolean;
      dayNightCycle: boolean;
    };
    
    // World content
    objects: IWorldObject[];
    npcs: {
      npcId: string;
      type: 'VENDOR' | 'QUEST_GIVER' | 'GUARD' | 'CITIZEN' | 'ENEMY';
      name: string;
      position: { x: number; y: number; z: number };
      appearance: {
        model: string;
        skin: string;
        equipment: string[];
      };
      behavior: {
        routine: any[];
        dialogue: { [key: string]: string };
        trades?: {
          itemOffered: string;
          itemsRequired: { itemId: string; quantity: number }[];
        }[];
      };
      stats: {
        level: number;
        health: number;
        maxHealth: number;
        damage: number;
        defense: number;
      };
    }[];
    
    // World economy
    economy: {
      resourceDistribution: {
        resourceType: string;
        density: number;
        respawnRate: number;
        maxNodes: number;
      }[];
      
      shopPrices: {
        itemId: string;
        buyPrice: number;
        sellPrice: number;
        stock: number;
        maxStock: number;
        restockRate: number;
      }[];
    };
    
    // World statistics
    statistics: {
      visits: number;
      totalPlayTime: number;
      uniqueVisitors: number;
      activeBuilders: number;
      createdAt: Date;
      lastVisited: Date;
    };
  };
  
  // Player state
  player: {
    userId: mongoose.Types.ObjectId;
    character: {
      level: number;
      experience: number;
      stats: {
        building: number;
        crafting: number;
        trading: number;
        exploration: number;
        combat: number;
      };
      appearance: {
        skinId: string;
        outfitId: string;
        accessories: string[];
      };
      position: {
        worldId: string;
        x: number;
        y: number;
        z: number;
      };
      health: {
        current: number;
        max: number;
      };
      stamina: {
        current: number;
        max: number;
      };
      inventory: {
        items: {
          itemId: string;
          quantity: number;
          slotIndex: number;
          customData?: any;
        }[];
        hotbar: {
          slotIndex: number;
          itemId: string;
        }[];
        maxSlots: number;
        weight: {
          current: number;
          max: number;
        };
      };
      equipment: {
        helmet?: string;
        chestplate?: string;
        leggings?: string;
        boots?: string;
        mainHand?: string;
        offHand?: string;
        accessories: string[];
      };
    };
    
    // Player progress
    progress: {
      quests: {
        active: IQuest[];
        completed: string[];
        abandoned: string[];
      };
      achievements: {
        achievementId: string;
        progress: {
          current: number;
          required: number;
        };
        unlockedAt?: Date;
      }[];
      skills: {
        skillId: string;
        level: number;
        experience: number;
        unlockedAbilities: string[];
      }[];
      discoveries: {
        locations: string[];
        recipes: string[];
        secrets: string[];
      };
    };
    
    // Player preferences
    preferences: {
      controls: {
        keyBindings: { [key: string]: string };
        sensitivity: {
          mouse: number;
          gamepad: number;
        };
        invertY: boolean;
      };
      graphics: {
        quality: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
        renderDistance: number;
        particleEffects: boolean;
        shadows: boolean;
        postProcessing: boolean;
        fov: number;
      };
      audio: {
        masterVolume: number;
        musicVolume: number;
        sfxVolume: number;
        voiceVolume: number;
        micSensitivity: number;
      };
      ui: {
        hudScale: number;
        crosshairStyle: string;
        chatOpacity: number;
        autoLoot: boolean;
        showDamageNumbers: boolean;
      };
    };
  };
  
  // Session data
  session: {
    sessionId: string;
    startedAt: Date;
    lastActiveAt: Date;
    server: {
      serverId: string;
      region: string;
      population: number;
      performance: {
        tps: number;
        mspt: number;
        memoryUsage: number;
      };
    };
    permissions: {
      canBuild: boolean;
      canDestroy: boolean;
      canInteract: boolean;
      canTeleport: boolean;
      canSpawnItems: boolean;
      isModerator: boolean;
      isAdmin: boolean;
    };
    restrictions: {
      chatMuted: boolean;
      buildingDisabled: boolean;
      tradingDisabled: boolean;
      bannedUntil?: Date;
    };
  };
  
  // Game state history
  history: {
    events: {
      eventId: string;
      timestamp: Date;
      type: 'QUEST_COMPLETED' | 'ITEM_CRAFTED' | 'ACHIEVEMENT_UNLOCKED' | 'LEVEL_UP' | 'DEATH' | 'TRADE' | 'BUILD' | 'DESTROY';
      metadata: any;
    }[];
    snapshots: {
      snapshotId: string;
      timestamp: Date;
      worldState: {
        objects: IWorldObject[];
        weather: WeatherType;
        timeOfDay: string;
      };
      playerState: {
        position: { x: number; y: number; z: number };
        health: number;
        inventory: any[];
      };
    }[];
  };
  
  createdAt: Date;
  updatedAt: Date;
  lastSavedAt: Date;
}

const WorldObjectSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['BLOCK', 'BUILDING', 'ITEM', 'VEHICLE', 'NPC', 'DECORATION'],
    required: true,
  },
  nftId: {
    type: Schema.Types.ObjectId,
    ref: 'NFT',
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true },
  },
  rotation: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    z: { type: Number, default: 0 },
  },
  scale: {
    x: { type: Number, default: 1 },
    y: { type: Number, default: 1 },
    z: { type: Number, default: 1 },
  },
  properties: {
    durability: Number,
    efficiency: Number,
    enchantments: [String],
    customData: Schema.Types.Mixed,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  placedAt: {
    type: Date,
    default: Date.now,
  },
  lastInteractedAt: Date,
});

const QuestSchema = new Schema({
  questId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'STORY', 'TUTORIAL', 'SPECIAL'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  objectives: [{
    objectiveId: String,
    description: String,
    type: {
      type: String,
      enum: ['COLLECT', 'BUILD', 'CRAFT', 'TRADE', 'EXPLORE', 'SOCIAL', 'COMBAT'],
    },
    target: {
      itemType: String,
      itemId: String,
      amount: { type: Number, default: 1 },
      location: {
        worldId: String,
        coordinates: {
          x: Number,
          y: Number,
          z: Number,
        },
      },
    },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
  }],
  rewards: {
    experience: { type: Number, default: 0 },
    tokens: {
      vxc: { type: Number, default: 0 },
      ptx: { type: Number, default: 0 },
    },
    items: [{
      itemId: String,
      quantity: Number,
    }],
    nfts: [{
      type: Schema.Types.ObjectId,
      ref: 'NFT',
    }],
  },
  requirements: {
    level: { type: Number, default: 1 },
    prerequisiteQuests: [String],
    requiredItems: [{
      itemId: String,
      quantity: Number,
    }],
  },
  status: {
    type: String,
    enum: Object.values(QuestStatus),
    default: QuestStatus.NOT_STARTED,
  },
  startedAt: Date,
  completedAt: Date,
  expiresAt: Date,
});

const GameSchema: Schema = new Schema(
  {
    gameId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    world: {
      worldId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      name: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: Object.values(WorldType),
        required: true,
      },
      owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
      visibility: {
        type: String,
        enum: ['PUBLIC', 'PRIVATE', 'FRIENDS_ONLY', 'GUILD_ONLY'],
        default: 'PRIVATE',
      },
      settings: {
        size: {
          width: { type: Number, default: 1000 },
          height: { type: Number, default: 256 },
          depth: { type: Number, default: 1000 },
        },
        biome: {
          type: String,
          enum: Object.values(BiomeType),
          default: BiomeType.PLAINS,
        },
        weather: {
          type: String,
          enum: Object.values(WeatherType),
          default: WeatherType.CLEAR,
        },
        timeOfDay: {
          type: String,
          enum: ['MORNING', 'NOON', 'EVENING', 'NIGHT', 'DYNAMIC'],
          default: 'DYNAMIC',
        },
        difficulty: {
          type: String,
          enum: ['PEACEFUL', 'EASY', 'NORMAL', 'HARD', 'NIGHTMARE'],
          default: 'NORMAL',
        },
        allowPVP: { type: Boolean, default: false },
        allowGriefing: { type: Boolean, default: false },
        naturalRegen: { type: Boolean, default: true },
        mobSpawning: { type: Boolean, default: true },
        weatherCycle: { type: Boolean, default: true },
        dayNightCycle: { type: Boolean, default: true },
      },
      objects: [WorldObjectSchema],
      npcs: [{
        npcId: String,
        type: {
          type: String,
          enum: ['VENDOR', 'QUEST_GIVER', 'GUARD', 'CITIZEN', 'ENEMY'],
        },
        name: String,
        position: {
          x: Number,
          y: Number,
          z: Number,
        },
        appearance: {
          model: String,
          skin: String,
          equipment: [String],
        },
        behavior: {
          routine: [Schema.Types.Mixed],
          dialogue: { type: Map, of: String },
          trades: [{
            itemOffered: String,
            itemsRequired: [{
              itemId: String,
              quantity: Number,
            }],
          }],
        },
        stats: {
          level: { type: Number, default: 1 },
          health: { type: Number, default: 100 },
          maxHealth: { type: Number, default: 100 },
          damage: { type: Number, default: 10 },
          defense: { type: Number, default: 0 },
        },
      }],
      economy: {
        resourceDistribution: [{
          resourceType: String,
          density: { type: Number, default: 1 },
          respawnRate: { type: Number, default: 3600 }, // seconds
          maxNodes: { type: Number, default: 100 },
        }],
        shopPrices: [{
          itemId: String,
          buyPrice: { type: Number, default: 0 },
          sellPrice: { type: Number, default: 0 },
          stock: { type: Number, default: 0 },
          maxStock: { type: Number, default: 100 },
          restockRate: { type: Number, default: 3600 },
        }],
      },
      statistics: {
        visits: { type: Number, default: 0 },
        totalPlayTime: { type: Number, default: 0 },
        uniqueVisitors: { type: Number, default: 0 },
        activeBuilders: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
        lastVisited: { type: Date, default: Date.now },
      },
    },
    player: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
      character: {
        level: { type: Number, default: 1 },
        experience: { type: Number, default: 0 },
        stats: {
          building: { type: Number, default: 1 },
          crafting: { type: Number, default: 1 },
          trading: { type: Number, default: 1 },
          exploration: { type: Number, default: 1 },
          combat: { type: Number, default: 1 },
        },
        appearance: {
          skinId: { type: String, default: 'default' },
          outfitId: { type: String, default: 'default' },
          accessories: [String],
        },
        position: {
          worldId: String,
          x: { type: Number, default: 0 },
          y: { type: Number, default: 50 },
          z: { type: Number, default: 0 },
        },
        health: {
          current: { type: Number, default: 100 },
          max: { type: Number, default: 100 },
        },
        stamina: {
          current: { type: Number, default: 100 },
          max: { type: Number, default: 100 },
        },
        inventory: {
          items: [{
            itemId: String,
            quantity: { type: Number, default: 1 },
            slotIndex: Number,
            customData: Schema.Types.Mixed,
          }],
          hotbar: [{
            slotIndex: Number,
            itemId: String,
          }],
          maxSlots: { type: Number, default: 36 },
          weight: {
            current: { type: Number, default: 0 },
            max: { type: Number, default: 100 },
          },
        },
        equipment: {
          helmet: String,
          chestplate: String,
          leggings: String,
          boots: String,
          mainHand: String,
          offHand: String,
          accessories: [String],
        },
      },
      progress: {
        quests: {
          active: [QuestSchema],
          completed: [String],
          abandoned: [String],
        },
        achievements: [{
          achievementId: String,
          progress: {
            current: { type: Number, default: 0 },
            required: { type: Number, default: 1 },
          },
          unlockedAt: Date,
        }],
        skills: [{
          skillId: String,
          level: { type: Number, default: 1 },
          experience: { type: Number, default: 0 },
          unlockedAbilities: [String],
        }],
        discoveries: {
          locations: [String],
          recipes: [String],
          secrets: [String],
        },
      },
      preferences: {
        controls: {
          keyBindings: { type: Map, of: String },
          sensitivity: {
            mouse: { type: Number, default: 1 },
            gamepad: { type: Number, default: 1 },
          },
          invertY: { type: Boolean, default: false },
        },
        graphics: {
          quality: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'],
            default: 'MEDIUM',
          },
          renderDistance: { type: Number, default: 8 },
          particleEffects: { type: Boolean, default: true },
          shadows: { type: Boolean, default: true },
          postProcessing: { type: Boolean, default: true },
          fov: { type: Number, default: 90 },
        },
        audio: {
          masterVolume: { type: Number, default: 100 },
          musicVolume: { type: Number, default: 100 },
          sfxVolume: { type: Number, default: 100 },
          voiceVolume: { type: Number, default: 100 },
          micSensitivity: { type: Number, default: 50 },
        },
        ui: {
          hudScale: { type: Number, default: 1 },
          crosshairStyle: { type: String, default: 'default' },
          chatOpacity: { type: Number, default: 0.8 },
          autoLoot: { type: Boolean, default: false },
          showDamageNumbers: { type: Boolean, default: true },
        },
      },
    },
    session: {
      sessionId: {
        type: String,
        required: true,
      },
      startedAt: {
        type: Date,
        default: Date.now,
      },
      lastActiveAt: {
        type: Date,
        default: Date.now,
      },
      server: {
        serverId: String,
        region: String,
        population: { type: Number, default: 0 },
        performance: {
          tps: { type: Number, default: 20 },
          mspt: { type: Number, default: 0 },
          memoryUsage: { type: Number, default: 0 },
        },
      },
      permissions: {
        canBuild: { type: Boolean, default: true },
        canDestroy: { type: Boolean, default: true },
        canInteract: { type: Boolean, default: true },
        canTeleport: { type: Boolean, default: false },
        canSpawnItems: { type: Boolean, default: false },
        isModerator: { type: Boolean, default: false },
        isAdmin: { type: Boolean, default: false },
      },
      restrictions: {
        chatMuted: { type: Boolean, default: false },
        buildingDisabled: { type: Boolean, default: false },
        tradingDisabled: { type: Boolean, default: false },
        bannedUntil: Date,
      },
    },
    history: {
      events: [{
        eventId: String,
        timestamp: { type: Date, default: Date.now },
        type: {
          type: String,
          enum: ['QUEST_COMPLETED', 'ITEM_CRAFTED', 'ACHIEVEMENT_UNLOCKED', 'LEVEL_UP', 'DEATH', 'TRADE', 'BUILD', 'DESTROY'],
        },
        metadata: Schema.Types.Mixed,
      }],
      snapshots: [{
        snapshotId: String,
        timestamp: { type: Date, default: Date.now },
        worldState: {
          objects: [WorldObjectSchema],
          weather: {
            type: String,
            enum: Object.values(WeatherType),
          },
          timeOfDay: String,
        },
        playerState: {
          position: {
            x: Number,
            y: Number,
            z: Number,
          },
          health: Number,
          inventory: [Schema.Types.Mixed],
        },
      }],
    },
    lastSavedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
GameSchema.index({ gameId: 1 });
GameSchema.index({ 'world.worldId': 1 });
GameSchema.index({ 'world.owner': 1 });
GameSchema.index({ 'player.userId': 1 });
GameSchema.index({ 'session.sessionId': 1 });
GameSchema.index({ 'world.type': 1, 'world.visibility': 1 });

// Virtual fields
GameSchema.virtual('world.totalObjects').get(function() {
  return this.world.objects.length;
});

GameSchema.virtual('player.character.healthPercentage').get(function() {
  return Math.round((this.player.character.health.current / this.player.character.health.max) * 100);
});

GameSchema.virtual('player.character.staminaPercentage').get(function() {
  return Math.round((this.player.character.stamina.current / this.player.character.stamina.max) * 100);
});

GameSchema.virtual('session.duration').get(function() {
  return this.session.lastActiveAt.getTime() - this.session.startedAt.getTime();
});

// Instance methods
GameSchema.methods.updateLastSave = function() {
  this.lastSavedAt = new Date();
  return this.save();
};

GameSchema.methods.updateWorldStatistics = function() {
  this.world.statistics.lastVisited = new Date();
  this.world.statistics.visits += 1;
  return this.save();
};

GameSchema.methods.addWorldObject = function(object: IWorldObject) {
  this.world.objects.push(object);
  return this.save();
};

GameSchema.methods.removeWorldObject = function(objectId: string) {
  this.world.objects = this.world.objects.filter(obj => obj.id !== objectId);
  return this.save();
};

GameSchema.methods.updateWorldObject = function(objectId: string, updates: any) {
  const objectIndex = this.world.objects.findIndex(obj => obj.id === objectId);
  if (objectIndex !== -1) {
    this.world.objects[objectIndex] = { ...this.world.objects[objectIndex], ...updates };
  }
  return this.save();
};

GameSchema.methods.addPlayerItem = function(itemId: string, quantity: number = 1) {
  const existingItem = this.player.character.inventory.items.find(item => item.itemId === itemId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    const newItem = {
      itemId,
      quantity,
      slotIndex: this.player.character.inventory.items.length,
    };
    this.player.character.inventory.items.push(newItem);
  }
  return this.save();
};

GameSchema.methods.removePlayerItem = function(itemId: string, quantity: number = 1) {
  const itemIndex = this.player.character.inventory.items.findIndex(item => item.itemId === itemId);
  if (itemIndex !== -1) {
    const item = this.player.character.inventory.items[itemIndex];
    if (item.quantity <= quantity) {
      this.player.character.inventory.items.splice(itemIndex, 1);
    } else {
      item.quantity -= quantity;
    }
  }
  return this.save();
};

GameSchema.methods.updatePlayerPosition = function(x: number, y: number, z: number, worldId?: string) {
  this.player.character.position = {
    worldId: worldId || this.player.character.position.worldId,
    x,
    y,
    z,
  };
  return this.save();
};

GameSchema.methods.updatePlayerHealth = function(health: number) {
  this.player.character.health.current = Math.max(0, Math.min(health, this.player.character.health.max));
  return this.save();
};

GameSchema.methods.updatePlayerStamina = function(stamina: number) {
  this.player.character.stamina.current = Math.max(0, Math.min(stamina, this.player.character.stamina.max));
  return this.save();
};

GameSchema.methods.addQuest = function(quest: IQuest) {
  this.player.progress.quests.active.push(quest);
  return this.save();
};

GameSchema.methods.updateQuestProgress = function(questId: string, objectiveId: string, progress: number) {
  const quest = this.player.progress.quests.active.find(q => q.questId === questId);
  if (quest) {
    const objective = quest.objectives.find(obj => obj.objectiveId === objectiveId);
    if (objective) {
      objective.progress = progress;
      if (progress >= objective.target.amount) {
        objective.completed = true;
      }
      
      // Check if quest is completed
      if (quest.objectives.every(obj => obj.completed)) {
        quest.status = QuestStatus.COMPLETED;
        quest.completedAt = new Date();
        
        // Move quest to completed list
        this.player.progress.quests.completed.push(questId);
        this.player.progress.quests.active = this.player.progress.quests.active.filter(q => q.questId !== questId);
      }
    }
  }
  return this.save();
};

GameSchema.methods.addEventToHistory = function(type: string, metadata: any) {
  const event = {
    eventId: new mongoose.Types.ObjectId().toString(),
    timestamp: new Date(),
    type,
    metadata,
  };
  this.history.events.push(event);
  
  // Keep only last 1000 events
  if (this.history.events.length > 1000) {
    this.history.events = this.history.events.slice(-1000);
  }
  
  return this.save();
};

GameSchema.methods.takeWorldSnapshot = function() {
  const snapshot = {
    snapshotId: new mongoose.Types.ObjectId().toString(),
    timestamp: new Date(),
    worldState: {
      objects: this.world.objects,
      weather: this.world.settings.weather,
      timeOfDay: this.world.settings.timeOfDay,
    },
    playerState: {
      position: {
        x: this.player.character.position.x,
        y: this.player.character.position.y,
        z: this.player.character.position.z,
      },
      health: this.player.character.health.current,
      inventory: this.player.character.inventory.items,
    },
  };
  
  this.history.snapshots.push(snapshot);
  
  // Keep only last 100 snapshots
  if (this.history.snapshots.length > 100) {
    this.history.snapshots = this.history.snapshots.slice(-100);
  }
  
  return this.save();
};

// Static methods
GameSchema.statics.findByWorldId = function(worldId: string) {
  return this.findOne({ 'world.worldId': worldId });
};

GameSchema.statics.findByPlayerId = function(userId: mongoose.Types.ObjectId) {
  return this.findOne({ 'player.userId': userId });
};

GameSchema.statics.findActiveGames = function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return this.find({
    'session.lastActiveAt': { $gte: oneHourAgo }
  });
};

GameSchema.statics.findPublicWorlds = function(options: {
  type?: WorldType;
  biome?: BiomeType;
  limit?: number;
  page?: number;
} = {}) {
  const query: any = {
    'world.visibility': 'PUBLIC',
  };
  
  if (options.type) query['world.type'] = options.type;
  if (options.biome) query['world.settings.biome'] = options.biome;
  
  const skip = options.page && options.limit ? (options.page - 1) * options.limit : 0;
  
  return this.find(query)
    .select('world.worldId world.name world.type world.settings.biome world.statistics')
    .sort({ 'world.statistics.visits': -1 })
    .skip(skip)
    .limit(options.limit || 20);
};

export const Game = mongoose.model<IGame>('Game', GameSchema);
