import React, { useState } from 'react';
import { Season, SeasonReward as ISeasonReward, RewardType } from '../../types/Season';
import { 
  Gift, 
  Lock, 
  CheckCircle, 
  Clock, 
  Star, 
  Trophy,
  Sparkles,
  FileImage,
  Music,
  Palette,
  Scroll,
  ShoppingBag,
  Tag,
  Award
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Modal from '../common/Modal';

interface SeasonRewardProps {
  season: Season;
  userProgress: {
    level: number;
    xp: number;
    unlockedRewards: string[];
    completedQuests: string[];
  };
  onClaimReward?: (rewardId: string) => void;
  onClaimAll?: () => void;
  viewMode?: 'grid' | 'list';
  filter?: 'all' | 'available' | 'locked' | 'claimed' | 'seasonal';
  className?: string;
}

const SeasonReward: React.FC<SeasonRewardProps> = ({
  season,
  userProgress,
  onClaimReward,
  onClaimAll,
  viewMode = 'grid',
  filter = 'all',
  className = ''
}) => {
  const [selectedReward, setSelectedReward] = useState<ISeasonReward | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);

  // 보상 타입별 아이콘
  const getRewardIcon = (type: RewardType, size = 'w-5 h-5') => {
    switch (type) {
      case RewardType.NFT:
        return <FileImage className={size} />;
      case RewardType.TOKEN:
        return <ShoppingBag className={size} />;
      case RewardType.EXCLUSIVE_ITEM:
        return <Star className={size} />;
      case RewardType.TITLE:
        return <Award className={size} />;
      case RewardType.BADGE:
        return <Tag className={size} />;
      case RewardType.SKIN:
        return <Palette className={size} />;
      case RewardType.ANIMATION:
        return <Sparkles className={size} />;
      case RewardType.SOUND:
        return <Music className={size} />;
      case RewardType.RECIPE:
        return <Scroll className={size} />;
      default:
        return <Gift className={size} />;
    }
  };

  // 보상 상태 체크
  const getRewardStatus = (reward: ISeasonReward) => {
    if (userProgress.unlockedRewards.includes(reward.id)) {
      return 'claimed';
    }
    if (userProgress.level >= reward.level) {
      // 추가 요구사항 체크
      if (reward.requirements) {
        if (reward.requirements.completedQuests?.some(questId => 
          !userProgress.completedQuests.includes(questId)
        )) {
          return 'locked';
        }
        if (reward.requirements.minimumRank && userProgress.level < reward.requirements.minimumRank) {
          return 'locked';
        }
      }
      return 'available';
    }
    return 'locked';
  };

  // 필터링된 보상들
  const filteredRewards = season.levelSystem.rewards.filter(reward => {
    const status = getRewardStatus(reward);
    
    switch (filter) {
      case 'available':
        return status === 'available';
      case 'locked':
        return status === 'locked';
      case 'claimed':
        return status === 'claimed';
      case 'seasonal':
        return reward.isExclusive;
      default:
        return true;
    }
  });

  // 수령 가능한 보상 개수
  const availableRewards = season.levelSystem.rewards.filter(reward => 
    getRewardStatus(reward) === 'available'
  );

  // 보상 카드 렌더링
  const renderRewardCard = (reward: ISeasonReward) => {
    const status = getRewardStatus(reward);
    const isLocked = status === 'locked';
    const isClaimed = status === 'claimed';
    const isAvailable = status === 'available';

    const handleClick = () => {
      setSelectedReward(reward);
      setShowRewardModal(true);
    };

    if (viewMode === 'list') {
      return (
        <div 
          key={reward.id}
          className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
            isLocked ? 'opacity-60 bg-gray-50' :
            isClaimed ? 'bg-green-50 border-green-200' :
            isAvailable ? 'bg-amber-50 border-amber-200 hover:border-amber-300' :
            'hover:border-gray-300'
          }`}
          onClick={handleClick}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              {reward.image ? (
                <img src={reward.image} alt={reward.name} className="w-12 h-12 rounded object-cover" />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded flex items-center justify-center text-white">
                  {getRewardIcon(reward.type, 'w-6 h-6')}
                </div>
              )}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                  <Lock className="w-4 h-4 text-white" />
                </div>
              )}
              {isClaimed && (
                <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{reward.name}</h3>
                {reward.isExclusive && (
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">
                    시즌 한정
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>레벨 {reward.level}</span>
                <span>{reward.type}</span>
                {reward.quantity && reward.quantity > 1 && (
                  <span>{reward.quantity}개</span>
                )}
                {reward.tokenAmount && (
                  <span>{reward.tokenAmount} {reward.tokenType}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isAvailable && onClaimReward && (
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClaimReward(reward.id);
                }}
                icon={<Gift className="w-4 h-4" />}
              >
                수령
              </Button>
            )}
            {isLocked && (
              <span className="text-sm text-gray-500">레벨 {reward.level}</span>
            )}
            {isClaimed && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                수령 완료
              </span>
            )}
          </div>
        </div>
      );
    }

    // Grid view
    return (
      <Card 
        key={reward.id}
        className={`overflow-hidden cursor-pointer transition-all ${
          isLocked ? 'opacity-60' :
          isClaimed ? 'ring-2 ring-green-500 ring-opacity-20' :
          isAvailable ? 'ring-2 ring-amber-500 ring-opacity-20 hover:ring-opacity-40' :
          'hover:shadow-lg'
        }`}
        onClick={handleClick}
      >
        <div className="relative aspect-square">
          {reward.image ? (
            <img src={reward.image} alt={reward.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
              {getRewardIcon(reward.type, 'w-12 h-12')}
            </div>
          )}
          
          {/* 상태 오버레이 */}
          {isLocked && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center text-white">
                <Lock className="w-8 h-8 mx-auto mb-1" />
                <span className="text-sm">LV {reward.level}</span>
              </div>
            </div>
          )}
          
          {isClaimed && (
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          )}
          
          {isAvailable && (
            <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center animate-pulse">
              <Gift className="w-5 h-5" />
            </div>
          )}
          
          {/* 레벨 표시 */}
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            LV {reward.level}
          </div>
          
          {/* 시즌 한정 표시 */}
          {reward.isExclusive && (
            <div className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded">
              시즌 한정
            </div>
          )}
        </div>
        
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{reward.name}</h3>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-600">{reward.type}</span>
            {(reward.quantity && reward.quantity > 1) || reward.tokenAmount ? (
              <span className="text-xs font-medium">
                {reward.quantity && reward.quantity > 1 && `${reward.quantity}개`}
                {reward.tokenAmount && `${reward.tokenAmount} ${reward.tokenType}`}
              </span>
            ) : null}
          </div>
          
          {isAvailable && onClaimReward && (
            <Button
              variant="primary"
              size="sm"
              className="w-full mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onClaimReward(reward.id);
              }}
            >
              수령하기
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className={className}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">시즌 보상</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredRewards.length}개의 보상 중 {availableRewards.length}개 수령 가능
          </p>
        </div>
        
        {availableRewards.length > 0 && onClaimAll && (
          <Button
            variant="primary"
            onClick={onClaimAll}
            icon={<Gift className="w-4 h-4" />}
          >
            모두 수령
          </Button>
        )}
      </div>
      
      {/* 보상 목록 */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
          : 'space-y-3'
      }>
        {filteredRewards.map(renderRewardCard)}
      </div>
      
      {/* 빈 상태 */}
      {filteredRewards.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Gift className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>조건에 맞는 보상이 없습니다</p>
        </div>
      )}
      
      {/* 보상 상세 모달 */}
      <Modal
        isOpen={showRewardModal}
        onClose={() => {
          setShowRewardModal(false);
          setSelectedReward(null);
        }}
        title="보상 상세"
      >
        {selectedReward && (
          <div className="space-y-4">
            <div className="text-center">
              {selectedReward.image ? (
                <img 
                  src={selectedReward.image} 
                  alt={selectedReward.name} 
                  className="w-32 h-32 mx-auto rounded-lg object-cover"
                />
              ) : (
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                  {getRewardIcon(selectedReward.type, 'w-16 h-16')}
                </div>
              )}
              <h3 className="mt-4 text-xl font-bold">{selectedReward.name}</h3>
              <p className="text-gray-600">{selectedReward.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 py-4 border-t">
              <div>
                <p className="text-sm text-gray-500">타입</p>
                <p className="font-medium">{selectedReward.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">레벨</p>
                <p className="font-medium">레벨 {selectedReward.level}</p>
              </div>
              {selectedReward.quantity && (
                <div>
                  <p className="text-sm text-gray-500">수량</p>
                  <p className="font-medium">{selectedReward.quantity}개</p>
                </div>
              )}
              {selectedReward.tokenAmount && (
                <div>
                  <p className="text-sm text-gray-500">토큰</p>
                  <p className="font-medium">{selectedReward.tokenAmount} {selectedReward.tokenType}</p>
                </div>
              )}
            </div>
            
            {selectedReward.requirements && (
              <div className="py-4 border-t">
                <h4 className="font-medium mb-2">수령 조건</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {selectedReward.requirements.completedQuests?.map(questId => (
                    <li key={questId}>• 퀘스트 완료: {questId}</li>
                  ))}
                  {selectedReward.requirements.minimumRank && (
                    <li>• 최소 랭킹: {selectedReward.requirements.minimumRank}위</li>
                  )}
                  {selectedReward.requirements.specialCondition && (
                    <li>• {selectedReward.requirements.specialCondition}</li>
                  )}
                </ul>
              </div>
            )}
            
            {selectedReward.claimDeadline && (
              <div className="py-4 border-t">
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <Clock className="w-4 h-4" />
                  <span>수령 마감: {new Date(selectedReward.claimDeadline).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRewardModal(false);
                  setSelectedReward(null);
                }}
                className="flex-1"
              >
                닫기
              </Button>
              {getRewardStatus(selectedReward) === 'available' && onClaimReward && (
                <Button
                  variant="primary"
                  onClick={() => {
                    onClaimReward(selectedReward.id);
                    setShowRewardModal(false);
                    setSelectedReward(null);
                  }}
                  className="flex-1"
                  icon={<Gift className="w-4 h-4" />}
                >
                  수령하기
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SeasonReward;