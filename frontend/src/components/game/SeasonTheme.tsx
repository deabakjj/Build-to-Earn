/**
 * SeasonTheme Component
 * 
 * 시즌별 테마를 표시하고 관리하는 컴포넌트
 * 
 * Features:
 * - 시즌별 테마 디자인 (봄, 여름, 가을, 겨울, 특별 시즌)
 * - 시즌 전환 효과
 * - 시즌 전용 아이템 및 블록
 * - 시즌 이벤트 알림
 * - 시즌 진행도 및 남은 시간
 * - 시즌 보상 및 업적
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSun, 
  FaLeaf, 
  FaSnowflake, 
  FaMap, 
  FaClock,
  FaFireAlt,
  FaCloudRain,
  FaStar,
  FaGift,
  FaArrowRight,
  FaCalendar,
  FaTrophy,
  FaInfoCircle,
  FaEye,
  FaEyeSlash,
  FaCoin
} from 'react-icons/fa';
import { useMobile } from '@/hooks/useMobile';

// 시즌 타입 정의
interface SeasonData {
  id: string;
  name: string;
  type: 'spring' | 'summer' | 'autumn' | 'winter' | 'special';
  theme: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
    effects: SeasonEffect[];
    icons: {
      main: React.ReactNode;
      weather: React.ReactNode;
      plants: React.ReactNode;
    };
  };
  duration: {
    startDate: Date;
    endDate: Date;
    totalDays: number;
  };
  rewards: SeasonReward[];
  specialItems: SeasonItem[];
  events: SeasonEvent[];
  achievements: SeasonAchievement[];
  description: string;
  isActive: boolean;
  progress?: {
    current: number;
    target: number;
    level: number;
  };
}

interface SeasonEffect {
  type: 'weather' | 'lighting' | 'particles' | 'environment';
  name: string;
  description: string;
  intensity: number;
  isActive: boolean;
}

interface SeasonReward {
  id: string;
  type: 'token' | 'item' | 'nft' | 'title' | 'badge';
  amount: number;
  itemId?: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  requirement: string;
  claimed: boolean;
}

interface SeasonItem {
  id: string;
  name: string;
  type: 'block' | 'decoration' | 'tool' | 'clothing';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description: string;
  icon: React.ReactNode;
  price?: number;
  unlockLevel?: number;
  limited?: boolean;
}

interface SeasonEvent {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  startTime: Date;
  endTime: Date;
  rewards: string[];
  status: 'upcoming' | 'active' | 'ended';
}

interface SeasonAchievement {
  id: string;
  name: string;
  description: string;
  requirement: string;
  progress: number;
  maxProgress: number;
  reward: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface SeasonThemeProps {
  currentSeason: SeasonData;
  upcomingSeason?: SeasonData;
  previousSeasons?: SeasonData[];
  onClaimReward: (rewardId: string) => void;
  onToggleEffect: (seasonId: string, effectType: string) => void;
  onPurchaseItem: (itemId: string) => void;
  className?: string;
}

const SeasonTheme: React.FC<SeasonThemeProps> = ({
  currentSeason,
  upcomingSeason,
  previousSeasons = [],
  onClaimReward,
  onToggleEffect,
  onPurchaseItem,
  className = ""
}) => {
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'items' | 'events' | 'achievements'>('overview');
  const [selectedEffect, setSelectedEffect] = useState<SeasonEffect | null>(null);
  const [showEffectModal, setShowEffectModal] = useState(false);
  const [effectsEnabled, setEffectsEnabled] = useState(true);

  // 시즌 진행도 계산
  const getSeasonProgress = () => {
    const now = new Date();
    const start = currentSeason.duration.startDate.getTime();
    const end = currentSeason.duration.endDate.getTime();
    const current = now.getTime();
    
    if (current < start) return 0;
    if (current > end) return 100;
    
    return Math.round(((current - start) / (end - start)) * 100);
  };

  // 남은 시간 계산
  const getRemainingTime = () => {
    const now = new Date();
    const end = currentSeason.duration.endDate.getTime();
    const remaining = end - now.getTime();
    
    if (remaining <= 0) return '종료됨';
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}일 ${hours}시간`;
    return `${hours}시간`;
  };

  // 탭 메뉴
  const tabs = [
    { id: 'overview', label: '개요', icon: <FaInfoCircle /> },
    { id: 'rewards', label: '보상', icon: <FaGift /> },
    { id: 'items', label: '아이템', icon: <FaStar /> },
    { id: 'events', label: '이벤트', icon: <FaCalendar /> },
    { id: 'achievements', label: '업적', icon: <FaTrophy /> }
  ];

  // 효과 토글 핸들러
  const handleToggleEffect = (effect: SeasonEffect) => {
    onToggleEffect(currentSeason.id, effect.type);
  };

  // 보상 클레임 핸들러
  const handleClaimReward = (rewardId: string) => {
    onClaimReward(rewardId);
  };

  // 아이템 구매 핸들러
  const handlePurchaseItem = (itemId: string) => {
    onPurchaseItem(itemId);
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
      style={{ 
        borderTop: `4px solid ${currentSeason.theme.colors.primary}`,
        backgroundColor: currentSeason.theme.colors.background + '20'
      }}
    >
      {/* 헤더 */}
      <div className="p-6" style={{ backgroundColor: currentSeason.theme.colors.primary + '10' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl"
              style={{ backgroundColor: currentSeason.theme.colors.primary }}
            >
              {currentSeason.theme.icons.main}
            </div>
            
            <div>
              <h2 className="text-2xl font-bold" style={{ color: currentSeason.theme.colors.primary }}>
                {currentSeason.name}
              </h2>
              <p className="text-sm text-gray-600">{currentSeason.description}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-2 text-lg font-medium" style={{ color: currentSeason.theme.colors.secondary }}>
              <FaClock />
              <span>{getRemainingTime()}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {getSeasonProgress()}% 진행
            </div>
          </div>
        </div>
        
        {/* 진행도 바 */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${getSeasonProgress()}%`,
                backgroundColor: currentSeason.theme.colors.primary
              }}
            />
          </div>
        </div>
        
        {/* 효과 토글 버튼 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEffectsEnabled(!effectsEnabled)}
              className="flex items-center space-x-2 px-3 py-1 rounded-full border text-sm"
              style={{ 
                borderColor: currentSeason.theme.colors.primary,
                backgroundColor: effectsEnabled ? currentSeason.theme.colors.primary : 'transparent',
                color: effectsEnabled ? 'white' : currentSeason.theme.colors.primary
              }}
            >
              {effectsEnabled ? <FaEye /> : <FaEyeSlash />}
              <span>시즌 효과</span>
            </motion.button>
          </div>
          
          {upcomingSeason && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>다음 시즌:</span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                   style={{ backgroundColor: upcomingSeason.theme.colors.primary }}>
                {upcomingSeason.theme.icons.main}
              </div>
              <span>{upcomingSeason.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 px-4 py-3 flex items-center justify-center space-x-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={
                activeTab === tab.id 
                  ? { 
                      borderColor: currentSeason.theme.colors.primary,
                      color: currentSeason.theme.colors.primary,
                      backgroundColor: currentSeason.theme.colors.primary + '10'
                    }
                  : {}
              }
            >
              {tab.icon}
              <span className={isMobile ? 'hidden' : 'inline'}>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* 시즌 효과 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">시즌 효과</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentSeason.theme.effects.map((effect) => (
                    <motion.div
                      key={effect.type}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        effect.isActive ? 'border-green-300 bg-green-50' : 'border-gray-300'
                      }`}
                      onClick={() => handleToggleEffect(effect)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{effect.name}</h4>
                          <p className="text-sm text-gray-600">{effect.description}</p>
                        </div>
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                          effect.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            effect.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </div>
                      </div>
                      
                      {effect.isActive && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500 mb-1">강도</div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={effect.intensity}
                            onChange={(e) => {
                              // Handle intensity change
                            }}
                            className="w-full"
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 시즌 통계 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">시즌 통계</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">총 플레이 시간</div>
                    <div className="text-xl font-bold mt-1">127시간</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">완료한 퀘스트</div>
                    <div className="text-xl font-bold mt-1">45개</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">획득한 보상</div>
                    <div className="text-xl font-bold mt-1">1,250 VXC</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">시즌 레벨</div>
                    <div className="text-xl font-bold mt-1">Lv. 15</div>
                  </div>
                </div>
              </div>

              {/* 다가오는 이벤트 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">다가오는 이벤트</h3>
                <div className="space-y-3">
                  {currentSeason.events.filter(e => e.status === 'upcoming').slice(0, 3).map((event) => (
                    <div key={event.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                        <FaCalendar />
                      </div>
                      <div className="ml-4 flex-1">
                        <h4 className="font-medium">{event.name}</h4>
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {Math.ceil((event.startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}일 후
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'rewards' && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">시즌 보상</h3>
              
              <div className="grid gap-4">
                {currentSeason.rewards.map((reward) => (
                  <motion.div
                    key={reward.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-lg border ${
                      reward.claimed 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                          {reward.icon}
                        </div>
                        
                        <div>
                          <h4 className="font-medium">{reward.name}</h4>
                          <p className="text-sm text-gray-600">{reward.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{reward.requirement}</p>
                        </div>
                      </div>
                      
                      <div>
                        {reward.claimed ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                            획득 완료
                          </span>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleClaimReward(reward.id)}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            획득하기
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'items' && (
            <motion.div
              key="items"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">시즌 한정 아이템</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentSeason.specialItems.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white rounded-lg border border-gray-300 overflow-hidden"
                  >
                    <div className="relative">
                      <div className="h-32 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <div className="text-3xl">{item.icon}</div>
                      </div>
                      
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.rarity === 'legendary' ? 'bg-orange-500 text-white' :
                          item.rarity === 'epic' ? 'bg-purple-500 text-white' :
                          item.rarity === 'rare' ? 'bg-blue-500 text-white' :
                          item.rarity === 'uncommon' ? 'bg-green-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {item.rarity}
                        </span>
                      </div>
                      
                      {item.limited && (
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                            한정
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3">
                      <h4 className="font-medium truncate">{item.name}</h4>
                      <p className="text-sm text-gray-600 truncate">{item.description}</p>
                      
                      <div className="mt-3 flex items-center justify-between">
                        {item.price ? (
                          <div className="flex items-center space-x-1 text-yellow-600">
                            <FaCoin />
                            <span className="text-sm font-medium">{item.price}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-green-600">무료</span>
                        )}
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePurchaseItem(item.id)}
                          className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                        >
                          구매
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">시즌 이벤트</h3>
              
              <div className="space-y-6">
                {['active', 'upcoming', 'ended'].map((status) => (
                  <div key={status}>
                    <h4 className="font-medium text-gray-700 mb-3 capitalize">
                      {status === 'active' ? '진행 중' : status === 'upcoming' ? '예정' : '종료된'} 이벤트
                    </h4>
                    
                    <div className="space-y-3">
                      {currentSeason.events.filter(e => e.status === status).map((event) => (
                        <div key={event.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium">{event.name}</h5>
                              <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                              
                              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <FaClock />
                                  <span>
                                    {event.startTime.toLocaleDateString()} - {event.endTime.toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mt-2 flex flex-wrap gap-1">
                                {event.rewards.map((reward, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    {reward}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                status === 'active' ? 'bg-green-100 text-green-700' :
                                status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {status === 'active' ? '진행 중' : status === 'upcoming' ? '예정' : '종료'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold">시즌 업적</h3>
              
              <div className="grid gap-4">
                {currentSeason.achievements.map((achievement) => (
                  <motion.div
                    key={achievement.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-lg border ${
                      achievement.completed
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          achievement.completed 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {achievement.icon}
                        </div>
                        
                        <div>
                          <h4 className="font-medium">{achievement.name}</h4>
                          <p className="text-sm text-gray-600">{achievement.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{achievement.requirement}</p>
                          
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-500">진행도</span>
                              <span className="font-medium">
                                {achievement.progress}/{achievement.maxProgress}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-green-500 transition-all duration-300"
                                style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-600">
                          {achievement.reward}
                        </div>
                        {achievement.completed && (
                          <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            완료
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 효과 상세 모달 */}
      <AnimatePresence>
        {showEffectModal && selectedEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-md w-full p-6"
            >
              <h3 className="text-lg font-bold mb-4">{selectedEffect.name}</h3>
              
              <p className="text-gray-600 mb-4">{selectedEffect.description}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">효과 강도</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedEffect.intensity}
                    onChange={(e) => {
                      // Handle intensity change
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>약함</span>
                    <span>{selectedEffect.intensity}%</span>
                    <span>강함</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowEffectModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  닫기
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    handleToggleEffect(selectedEffect);
                    setShowEffectModal(false);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  적용하기
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SeasonTheme;
