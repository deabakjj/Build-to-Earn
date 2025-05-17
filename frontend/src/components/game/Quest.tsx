/**
 * Quest Component
 * 
 * 퀘스트 시스템을 관리하는 컴포넌트
 * 
 * Features:
 * - 다양한 퀘스트 타입 (수집, 건설, 탐험, 시즌 이벤트)
 * - 퀘스트 진행 상황 추적
 * - 보상 시스템 (토큰, 아이템, NFT)
 * - 일일/주간/시즌 퀘스트
 * - 업적(Achievement) 시스템
 * - 길드 협동 퀘스트
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaClipboardList, 
  FaTrophy, 
  FaClock, 
  FaUsers, 
  FaStar,
  FaCheck,
  FaLock,
  FaCoin,
  FaCube,
  FaCalendarAlt,
  FaGift,
  FaChevronRight,
  FaInfo,
  FaChartLine,
  FaFireAlt,
  FaHistory,
  FaFingerprint,
  FaList
} from 'react-icons/fa';
import { useMobile } from '@/hooks/useMobile';

// 퀘스트 타입 정의
interface QuestData {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'seasonal' | 'story' | 'guild' | 'achievement';
  category: 'gathering' | 'building' | 'exploration' | 'social' | 'combat' | 'economy';
  status: 'available' | 'active' | 'completed' | 'locked';
  progress: {
    current: number;
    target: number;
    unit: string;
  };
  rewards: QuestReward[];
  requirements: QuestRequirement[];
  timeLimit?: {
    expiry: Date;
    duration: number; // in milliseconds
  };
  level: number;
  experience: number;
  startedAt?: Date;
  completedAt?: Date;
  isRepeatable: boolean;
  guildContribution?: {
    individual: number;
    guild: number;
  };
}

interface QuestReward {
  type: 'token' | 'item' | 'nft' | 'experience' | 'special';
  amount: number;
  itemId?: string;
  itemName?: string;
  description: string;
  icon?: React.ReactNode;
}

interface QuestRequirement {
  type: 'level' | 'item' | 'building' | 'achievement' | 'quest' | 'other';
  description: string;
  isMet: boolean;
  details?: string;
}

interface QuestProps {
  quests: QuestData[];
  activeQuests: string[];
  onAcceptQuest: (questId: string) => void;
  onCompleteQuest: (questId: string) => void;
  onAbandonQuest: (questId: string) => void;
  onClaimReward: (questId: string) => void;
  className?: string;
}

// 퀘스트 카테고리 정보
const QUEST_CATEGORIES = {
  gathering: {
    name: '수집',
    icon: <FaCube />,
    color: '#22c55e',
    description: '자원과 아이템 수집'
  },
  building: {
    name: '건설',
    icon: <FaClipboardList />,
    color: '#3b82f6',
    description: '건물과 구조물 건설'
  },
  exploration: {
    name: '탐험',
    icon: <FaChartLine />,
    color: '#8b5cf6',
    description: '새로운 지역 탐험'
  },
  social: {
    name: '사회',
    icon: <FaUsers />,
    color: '#f59e0b',
    description: '다른 플레이어와 상호작용'
  },
  combat: {
    name: '전투',
    icon: <FaFireAlt />,
    color: '#ef4444',
    description: '전투 및 방어'
  },
  economy: {
    name: '경제',
    icon: <FaCoin />,
    color: '#22d3ee',
    description: '거래와 경제 활동'
  }
};

// 퀘스트 타입별 스타일
const QUEST_TYPE_STYLES = {
  daily: {
    name: '일일',
    icon: <FaClock />,
    color: '#10b981',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  weekly: {
    name: '주간',
    icon: <FaCalendarAlt />,
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  seasonal: {
    name: '시즌',
    icon: <FaStar />,
    color: '#a855f7',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  story: {
    name: '스토리',
    icon: <FaFingerprint />,
    color: '#f59e0b',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  guild: {
    name: '길드',
    icon: <FaUsers />,
    color: '#ef4444',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  achievement: {
    name: '업적',
    icon: <FaTrophy />,
    color: '#facc15',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  }
};

const Quest: React.FC<QuestProps> = ({
  quests,
  activeQuests,
  onAcceptQuest,
  onCompleteQuest,
  onAbandonQuest,
  onClaimReward,
  className = ""
}) => {
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('active');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<QuestData | null>(null);
  const [showQuestDetail, setShowQuestDetail] = useState(false);

  // 퀘스트 필터링
  const filteredQuests = quests.filter(quest => {
    if (activeTab === 'available') return quest.status === 'available';
    if (activeTab === 'active') return quest.status === 'active';
    if (activeTab === 'completed') return quest.status === 'completed';
    return false;
  }).filter(quest => {
    if (selectedCategory) return quest.category === selectedCategory;
    return true;
  });

  // 탭 메뉴
  const tabs = [
    { 
      id: 'active', 
      label: '진행 중', 
      icon: <FaList />,
      count: quests.filter(q => q.status === 'active').length
    },
    { 
      id: 'available', 
      label: '수락 가능', 
      icon: <FaCheck />,
      count: quests.filter(q => q.status === 'available').length
    },
    { 
      id: 'completed', 
      label: '완료', 
      icon: <FaTrophy />,
      count: quests.filter(q => q.status === 'completed').length
    }
  ];

  // 진행률 계산
  const getProgressPercentage = (quest: QuestData) => {
    if (quest.progress.target === 0) return 0;
    return Math.min(100, Math.round((quest.progress.current / quest.progress.target) * 100));
  };

  // 시간 남은 시간 계산
  const getRemainingTime = (quest: QuestData) => {
    if (!quest.timeLimit) return null;
    
    const now = new Date();
    const remaining = quest.timeLimit.expiry.getTime() - now.getTime();
    
    if (remaining <= 0) return '시간 초과';
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}일 ${hours}시간`;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  };

  // 퀘스트 카드 컴포넌트
  const QuestCard = ({ quest }: { quest: QuestData }) => {
    const typeStyle = QUEST_TYPE_STYLES[quest.type];
    const categoryInfo = QUEST_CATEGORIES[quest.category];
    const progress = getProgressPercentage(quest);
    const remainingTime = getRemainingTime(quest);
    
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setSelectedQuest(quest);
          setShowQuestDetail(true);
        }}
        className={`p-4 rounded-lg border cursor-pointer transition-all ${
          quest.status === 'completed' 
            ? 'border-green-300 bg-green-50' 
            : 'border-gray-300 hover:border-blue-300'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div 
                className={`w-6 h-6 rounded flex items-center justify-center text-white text-sm`}
                style={{ backgroundColor: typeStyle.color }}
              >
                {typeStyle.icon}
              </div>
              
              <div 
                className={`w-6 h-6 rounded flex items-center justify-center text-white text-sm`}
                style={{ backgroundColor: categoryInfo.color }}
              >
                {categoryInfo.icon}
              </div>
              
              <h4 className="font-medium text-gray-900">{quest.title}</h4>
              
              <span className="px-2 py-1 text-xs rounded-full" style={{
                backgroundColor: typeStyle.color + '20',
                color: typeStyle.color
              }}>
                {typeStyle.name}
              </span>
              
              {quest.level > 1 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  Lv.{quest.level}
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-3">{quest.description}</p>
            
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">
                {quest.progress.current}/{quest.progress.target} {quest.progress.unit}
              </div>
              <div className="text-sm font-medium text-blue-600">
                {progress}%
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {quest.rewards.map((reward, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    {reward.type === 'token' && <FaCoin className="text-yellow-500" />}
                    {reward.type === 'experience' && <FaStar className="text-purple-500" />}
                    {reward.type === 'item' && <FaCube className="text-blue-500" />}
                    <span>+{reward.amount}</span>
                  </div>
                ))}
              </div>
              
              {remainingTime && (
                <div className="flex items-center space-x-1 text-sm text-orange-600">
                  <FaClock />
                  <span>{remainingTime}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="ml-4">
            <FaChevronRight className="text-gray-400" />
          </div>
        </div>
      </motion.div>
    );
  };

  // 보상 아이템 컴포넌트
  const RewardItem = ({ reward }: { reward: QuestReward }) => (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
        {reward.type === 'token' && <FaCoin className="text-yellow-500" />}
        {reward.type === 'experience' && <FaStar className="text-purple-500" />}
        {reward.type === 'item' && <FaCube className="text-blue-500" />}
        {reward.type === 'nft' && <FaGift className="text-green-500" />}
        {reward.type === 'special' && <FaTrophy className="text-orange-500" />}
      </div>
      
      <div className="flex-1">
        <div className="font-medium text-gray-900">
          {reward.amount > 1 ? `${reward.amount}x ` : ''}{reward.itemName || reward.description}
        </div>
        <p className="text-sm text-gray-500">{reward.description}</p>
      </div>
    </div>
  );

  // 요구사항 아이템 컴포넌트
  const RequirementItem = ({ requirement }: { requirement: QuestRequirement }) => (
    <div className={`flex items-center space-x-3 p-3 rounded-lg ${
      requirement.isMet ? 'bg-green-50' : 'bg-red-50'
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        requirement.isMet ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}>
        {requirement.isMet ? <FaCheck /> : <FaLock />}
      </div>
      
      <div className="flex-1">
        <div className={`font-medium ${
          requirement.isMet ? 'text-green-900' : 'text-red-900'
        }`}>
          {requirement.description}
        </div>
        {requirement.details && (
          <p className={`text-sm ${
            requirement.isMet ? 'text-green-600' : 'text-red-600'
          }`}>
            {requirement.details}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <FaClipboardList />
            <span>퀘스트</span>
          </h2>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>레벨 {/* User Level */}</span>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 px-4 py-3 flex items-center justify-center space-x-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span className={isMobile ? 'hidden' : 'inline'}>{tab.label}</span>
              {tab.count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 카테고리 필터 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedCategory === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          
          {Object.entries(QUEST_CATEGORIES).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategory === key
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={selectedCategory === key ? { backgroundColor: category.color } : {}}
            >
              <span className="inline-flex items-center space-x-1">
                {category.icon}
                <span>{category.name}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 퀘스트 목록 */}
      <div className="p-4">
        {filteredQuests.length > 0 ? (
          <div className="space-y-3">
            {filteredQuests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FaClipboardList className="mx-auto text-4xl mb-2 opacity-50" />
            <p>
              {activeTab === 'active' && '진행 중인 퀘스트가 없습니다.'}
              {activeTab === 'available' && '수락 가능한 퀘스트가 없습니다.'}
              {activeTab === 'completed' && '완료된 퀘스트가 없습니다.'}
            </p>
          </div>
        )}
      </div>

      {/* 퀘스트 상세 모달 */}
      <AnimatePresence>
        {showQuestDetail && selectedQuest && (
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
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* 모달 헤더 */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <div 
                        className="w-8 h-8 rounded flex items-center justify-center text-white"
                        style={{ backgroundColor: QUEST_TYPE_STYLES[selectedQuest.type].color }}
                      >
                        {QUEST_TYPE_STYLES[selectedQuest.type].icon}
                      </div>
                      
                      <h3 className="text-xl font-bold">{selectedQuest.title}</h3>
                      
                      <span 
                        className="px-2 py-1 text-xs rounded-full"
                        style={{
                          backgroundColor: QUEST_TYPE_STYLES[selectedQuest.type].color + '20',
                          color: QUEST_TYPE_STYLES[selectedQuest.type].color
                        }}
                      >
                        {QUEST_TYPE_STYLES[selectedQuest.type].name}
                      </span>
                    </div>
                    
                    <p className="text-gray-600">{selectedQuest.description}</p>
                  </div>
                  
                  <button
                    onClick={() => setShowQuestDetail(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 모달 내용 */}
              <div className="p-6 space-y-6">
                {/* 진행 상황 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">진행 상황</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">
                        {selectedQuest.progress.current}/{selectedQuest.progress.target} {selectedQuest.progress.unit}
                      </span>
                      <span className="font-medium text-blue-600">
                        {getProgressPercentage(selectedQuest)}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(selectedQuest)}%` }}
                      />
                    </div>
                    
                    {selectedQuest.timeLimit && (
                      <div className="mt-3 flex items-center space-x-2 text-sm text-orange-600">
                        <FaClock />
                        <span>남은 시간: {getRemainingTime(selectedQuest)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 보상 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">보상</h4>
                  <div className="grid gap-3">
                    {selectedQuest.rewards.map((reward, index) => (
                      <RewardItem key={index} reward={reward} />
                    ))}
                  </div>
                </div>

                {/* 요구사항 */}
                {selectedQuest.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">요구사항</h4>
                    <div className="grid gap-3">
                      {selectedQuest.requirements.map((requirement, index) => (
                        <RequirementItem key={index} requirement={requirement} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 퀘스트 정보 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">퀘스트 정보</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">타입</span>
                      <p className="font-medium">{QUEST_TYPE_STYLES[selectedQuest.type].name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">카테고리</span>
                      <p className="font-medium">{QUEST_CATEGORIES[selectedQuest.category].name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">레벨</span>
                      <p className="font-medium">{selectedQuest.level}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">경험치</span>
                      <p className="font-medium">{selectedQuest.experience} XP</p>
                    </div>
                    {selectedQuest.guildContribution && (
                      <>
                        <div>
                          <span className="text-gray-500">개인 기여도</span>
                          <p className="font-medium">{selectedQuest.guildContribution.individual}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">길드 기여도</span>
                          <p className="font-medium">{selectedQuest.guildContribution.guild}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 모달 액션 버튼 */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  {selectedQuest.status === 'available' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onAcceptQuest(selectedQuest.id);
                        setShowQuestDetail(false);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      수락하기
                    </motion.button>
                  )}
                  
                  {selectedQuest.status === 'active' && (
                    <>
                      {getProgressPercentage(selectedQuest) >= 100 ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            onCompleteQuest(selectedQuest.id);
                            setShowQuestDetail(false);
                          }}
                          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          완료하기
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            onAbandonQuest(selectedQuest.id);
                            setShowQuestDetail(false);
                          }}
                          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          포기하기
                        </motion.button>
                      )}
                    </>
                  )}
                  
                  {selectedQuest.status === 'completed' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onClaimReward(selectedQuest.id);
                        setShowQuestDetail(false);
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      보상 받기
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowQuestDetail(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded"
                  >
                    닫기
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Quest;
