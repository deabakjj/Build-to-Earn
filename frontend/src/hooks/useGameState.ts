import { useState, useEffect, useCallback } from 'react';
import { 
  WorldPosition, 
  Resource, 
  GameItem, 
  Building, 
  Quest, 
  SeasonInfo 
} from '../types/World';

// 게임 상태 인터페이스
export interface GameState {
  player: {
    position: WorldPosition;
    inventory: GameItem[];
    resources: Record<string, number>;
    energy: number;
    experience: number;
    level: number;
  };
  world: {
    terrain: any[]; // 3D 지형 데이터
    buildings: Building[];
    resources: Resource[];
    playersOnline: number;
  };
  season: SeasonInfo | null;
  quests: Quest[];
  loading: boolean;
  error: string | null;
}

// 게임 액션 타입
type GameAction = 
  | { type: 'MOVE_PLAYER'; payload: WorldPosition }
  | { type: 'ADD_ITEM'; payload: GameItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_RESOURCES'; payload: Record<string, number> }
  | { type: 'START_QUEST'; payload: Quest }
  | { type: 'COMPLETE_QUEST'; payload: string }
  | { type: 'UPDATE_SEASON'; payload: SeasonInfo }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// 초기 게임 상태
const initialGameState: GameState = {
  player: {
    position: { x: 0, y: 0, z: 0 },
    inventory: [],
    resources: {},
    energy: 100,
    experience: 0,
    level: 1
  },
  world: {
    terrain: [],
    buildings: [],
    resources: [],
    playersOnline: 0
  },
  season: null,
  quests: [],
  loading: false,
  error: null
};

// 게임 상태 리듀서
function gameStateReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MOVE_PLAYER':
      return {
        ...state,
        player: {
          ...state.player,
          position: action.payload
        }
      };
    
    case 'ADD_ITEM':
      return {
        ...state,
        player: {
          ...state.player,
          inventory: [...state.player.inventory, action.payload]
        }
      };
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        player: {
          ...state.player,
          inventory: state.player.inventory.filter(item => item.id !== action.payload)
        }
      };
    
    case 'UPDATE_RESOURCES':
      return {
        ...state,
        player: {
          ...state.player,
          resources: {
            ...state.player.resources,
            ...action.payload
          }
        }
      };
    
    case 'START_QUEST':
      const updatedQuests = [...state.quests, action.payload];
      return {
        ...state,
        quests: updatedQuests
      };
    
    case 'COMPLETE_QUEST':
      return {
        ...state,
        quests: state.quests.map(quest => 
          quest.id === action.payload 
            ? { ...quest, status: 'completed' as const }
            : quest
        )
      };
    
    case 'UPDATE_SEASON':
      return {
        ...state,
        season: action.payload
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    
    default:
      return state;
  }
}

// 게임 상태 커스텀 훅
export const useGameState = () => {
  const [state, setState] = useState<GameState>(initialGameState);

  // 게임 상태 업데이트 함수
  const dispatch = useCallback((action: GameAction) => {
    setState(prevState => gameStateReducer(prevState, action));
  }, []);

  // 플레이어 이동
  const movePlayer = useCallback((position: WorldPosition) => {
    dispatch({ type: 'MOVE_PLAYER', payload: position });
  }, [dispatch]);

  // 아이템 추가
  const addItem = useCallback((item: GameItem) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, [dispatch]);

  // 아이템 제거
  const removeItem = useCallback((itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  }, [dispatch]);

  // 자원 업데이트
  const updateResources = useCallback((resources: Record<string, number>) => {
    dispatch({ type: 'UPDATE_RESOURCES', payload: resources });
  }, [dispatch]);

  // 퀘스트 시작
  const startQuest = useCallback((quest: Quest) => {
    dispatch({ type: 'START_QUEST', payload: quest });
  }, [dispatch]);

  // 퀘스트 완료
  const completeQuest = useCallback((questId: string) => {
    dispatch({ type: 'COMPLETE_QUEST', payload: questId });
  }, [dispatch]);

  // 시즌 업데이트
  const updateSeason = useCallback((season: SeasonInfo) => {
    dispatch({ type: 'UPDATE_SEASON', payload: season });
  }, [dispatch]);

  // 에러 설정
  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, [dispatch]);

  // 로딩 상태 설정
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, [dispatch]);

  // 게임 데이터 초기화
  const initializeGame = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: 실제 API 호출로 게임 데이터 불러오기
      // const gameData = await gameService.getGameState();
      
      // 시뮬레이션용 데미어 데이터
      const mockGameData = {
        player: {
          position: { x: 5, y: 0, z: 5 },
          inventory: [],
          resources: {
            wood: 50,
            stone: 30,
            iron: 10
          },
          energy: 80,
          experience: 1200,
          level: 5
        },
        world: {
          terrain: [],
          buildings: [],
          resources: [],
          playersOnline: 156
        },
        season: {
          id: 's1',
          name: 'Winter Wonderland',
          description: '겨울 왕국 시즌',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-31'),
          theme: 'winter' as const,
          rewards: []
        },
        quests: []
      };

      // 게임 데이터 설정
      Object.entries(mockGameData).forEach(([key, value]) => {
        if (key === 'season') {
          updateSeason(value as SeasonInfo);
        } else if (key === 'player') {
          setState(prev => ({
            ...prev,
            player: value as typeof initialGameState.player
          }));
        } else if (key === 'world') {
          setState(prev => ({
            ...prev,
            world: value as typeof initialGameState.world
          }));
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize game');
    } finally {
      setLoading(false);
    }
  }, [updateSeason, setError, setLoading]);

  // 게임 상태 저장 (로컬스토리지)
  const saveGameState = useCallback(() => {
    try {
      const stateToSave = {
        player: state.player,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('diy-crafting-world-state', JSON.stringify(stateToSave));
    } catch (err) {
      console.error('Failed to save game state:', err);
    }
  }, [state.player]);

  // 게임 상태 불러오기 (로컬스토리지)
  const loadGameState = useCallback(() => {
    try {
      const savedState = localStorage.getItem('diy-crafting-world-state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setState(prev => ({
          ...prev,
          player: parsedState.player
        }));
      }
    } catch (err) {
      console.error('Failed to load game state:', err);
    }
  }, []);

  // 자동 저장 설정
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      saveGameState();
    }, 30000); // 30초마다 자동 저장

    return () => clearInterval(autoSaveInterval);
  }, [saveGameState]);

  // 게임 상태가 변경되면 실시간 업데이트
  useEffect(() => {
    // TODO: WebSocket 연결 설정 및 실시간 게임 상태 업데이트
    // const ws = new WebSocket('ws://localhost:5000/game');
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   // 실시간 업데이트 처리
    // };
    
    // return () => ws.close();
  }, []);

  // 컴포넌트 마운트 시 게임 상태 초기화
  useEffect(() => {
    initializeGame();
    loadGameState();
  }, [initializeGame, loadGameState]);

  return {
    // 게임 상태
    state,
    
    // 상태 업데이트 함수들
    movePlayer,
    addItem,
    removeItem,
    updateResources,
    startQuest,
    completeQuest,
    updateSeason,
    setError,
    setLoading,
    
    // 유틸리티 함수들
    initializeGame,
    saveGameState,
    loadGameState,
    
    // 편의성 getter들
    get isLoading() {
      return state.loading;
    },
    
    get hasError() {
      return !!state.error;
    },
    
    get playerLevel() {
      return state.player.level;
    },
    
    get playerResources() {
      return state.player.resources;
    },
    
    get activeQuests() {
      return state.quests.filter(quest => quest.status === 'active');
    },
    
    get completedQuests() {
      return state.quests.filter(quest => quest.status === 'completed');
    },
    
    get currentSeason() {
      return state.season;
    }
  };
};

// 게임 상태 검증 유틸리티
export const validateGameState = (state: GameState): boolean => {
  // 플레이어 위치 검증
  if (!state.player.position || 
      typeof state.player.position.x !== 'number' ||
      typeof state.player.position.y !== 'number' ||
      typeof state.player.position.z !== 'number') {
    return false;
  }
  
  // 자원 값 검증
  for (const [resource, amount] of Object.entries(state.player.resources)) {
    if (typeof amount !== 'number' || amount < 0) {
      return false;
    }
  }
  
  // 에너지 범위 검증
  if (state.player.energy < 0 || state.player.energy > 100) {
    return false;
  }
  
  return true;
};

// 게임 상태 초기화 유틸리티
export const resetGameState = (): GameState => {
  return JSON.parse(JSON.stringify(initialGameState));
};

// 게임 이벤트 타입
export type GameEvent = 
  | { type: 'PLAYER_MOVE'; data: WorldPosition }
  | { type: 'ITEM_COLLECTED'; data: GameItem }
  | { type: 'QUEST_STARTED'; data: Quest }
  | { type: 'QUEST_COMPLETED'; data: string }
  | { type: 'SEASON_CHANGED'; data: SeasonInfo }
  | { type: 'BUILDING_PLACED'; data: Building }
  | { type: 'RESOURCE_DEPLETED'; data: string }
  | { type: 'ACHIEVEMENT_UNLOCKED'; data: { id: string; name: string; description: string } };

// 게임 이벤트 핸들러 타입
export type GameEventHandler = (event: GameEvent) => void;

// 게임 이벤트 상태 관리
export const useGameEvents = (handler: GameEventHandler) => {
  useEffect(() => {
    // TODO: 게임 이벤트 리스너 등록
    // window.addEventListener('game-event', handler);
    
    // return () => {
    //   window.removeEventListener('game-event', handler);
    // };
  }, [handler]);
};

export default useGameState;
