import React from 'react';
import { Season, SeasonReward, SeasonQuest, SeasonRanking } from '../../types/Season';
import { 
  Trophy, 
  Star, 
  ChevronRight, 
  ChevronLeft,
  Gift,
  CheckCircle,
  Lock,
  TrendingUp,
  Target,
  Award,
  Clock
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';

interface SeasonProgressProps {
  season: Season;
  userProgress: {
    level: number;
    xp: number;
    rank: number;
    completedQuests: string[];
    unlockedRewards: string[];
    activeQuests: string[];
  };
  ranking?: SeasonRanking[];
  onClaimReward?: (rewardId: string) => void;
  onViewQuest?: (questId: string) => void;
  onViewLeaderboard?: () => void;
  className?: string;
}

const SeasonProgress: React.FC<SeasonProgressProps> = ({
  season,
  userProgress,
  ranking = [],
  onClaimReward,
  onViewQuest,
  onViewLeaderboard,
  className = ''
}) => {
  // 현재 레벨과 다음 레벨 계산
  const currentLevel = userProgress.level;
  const nextLevel = currentLevel + 1;
  const currentLevelXp = season.levelSystem.xpPerLevel[currentLevel - 1] || 0;
  const nextLevelXp = season.levelSystem.xpPerLevel[currentLevel] || season.levelSystem.xpPerLevel[season.levelSystem.xpPerLevel.length - 1];
  const levelProgress = nextLevel <= season.levelSystem.maxLevel 
    ? ((userProgress.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100 
    : 100;

  // 현재 레벨 보상들
  const currentLevelRewards = season.levelSystem.rewards.filter(reward => 
    reward.level === currentLevel && !userProgress.unlockedRewards.includes(reward.id)
  );

  // 다음 레벨 보상들
  const nextLevelRewards = season.levelSystem.rewards.filter(reward => 
    reward.level === nextLevel
  );

  // 랭킹 변화 계산
  const getRankChange = (rank: number, previousRank?: number) => {
    if (!previousRank) return null;
    const change = previousRank - rank;
    return change;
  };

  // 진행중인 퀘스트
  const activeQuests = season.content.quests.filter(quest => 
    userProgress.activeQuests.includes(quest.id)
  );

  // 완료된 퀘스트
  const completedQuestsCount = season.content.quests.filter(quest => 
    userProgress.completedQuests.includes(quest.id)
  ).length;

  // 전체 경험치 계산
  const totalXpForLevel = season.levelSystem.xpPerLevel.slice(0, currentLevel - 1).reduce((sum, xp) => sum + xp, 0);
  const totalXp = totalXpForLevel + userProgress.xp;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 레벨 진행도 카드 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {currentLevel}
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs px-2 py-0.5 rounded-full">
                LV {currentLevel}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{totalXp.toLocaleString()} XP</h2>
              <p className="text-sm text-gray-600">
                {nextLevel <= season.levelSystem.maxLevel 
                  ? `다음 레벨까지 ${(nextLevelXp - userProgress.xp).toLocaleString()} XP`
                  : '최대 레벨 달성'
                }
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span className="text-xl font-bold">#{userProgress.rank}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewLeaderboard}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              순위 보기
            </Button>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>레벨 {currentLevel}</span>
            <span>{levelProgress.toFixed(1)}%</span>
            {nextLevel <= season.levelSystem.maxLevel && <span>레벨 {nextLevel}</span>}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${levelProgress}%` }}
            >
              <div className="w-full h-full flex items-center justify-end pr-1">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* 현재 레벨 보상 */}
        {currentLevelRewards.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 rounded-lg">
            <h3 className="text-sm font-medium text-amber-800 mb-3 flex items-center gap-2">
              <Gift className="w-4 h-4" />
              수령 가능한 보상
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentLevelRewards.map(reward => (
                <div key={reward.id} className="flex items-center gap-2 bg-white p-2 rounded">
                  {reward.image && (
                    <img src={reward.image} alt={reward.name} className="w-8 h-8 rounded" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{reward.name}</p>
                    <p className="text-xs text-gray-600">{reward.description}</p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onClaimReward?.(reward.id)}
                    icon={<CheckCircle className="w-3 h-3" />}
                  >
                    수령
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 다음 레벨 보상 미리보기 */}
        {nextLevelRewards.length > 0 && nextLevel <= season.levelSystem.maxLevel && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              레벨 {nextLevel} 보상
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {nextLevelRewards.map(reward => (
                <div key={reward.id} className="flex-shrink-0 bg-white p-3 rounded border border-gray-200">
                  {reward.image && (
                    <img src={reward.image} alt={reward.name} className="w-12 h-12 rounded mb-2" />
                  )}
                  <p className="text-xs font-medium">{reward.name}</p>
                  <p className="text-xs text-gray-500">{reward.quantity || 1}개</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 퀘스트 진행도 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            퀘스트 진행도
          </h2>
          <span className="text-sm text-gray-600">
            {completedQuestsCount}/{season.content.quests.length} 완료
          </span>
        </div>

        {activeQuests.length > 0 ? (
          <div className="space-y-3">
            {activeQuests.slice(0, 3).map(quest => (
              <div key={quest.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {quest.image && (
                    <img src={quest.image} alt={quest.name} className="w-10 h-10 rounded" />
                  )}
                  <div>
                    <h3 className="font-medium">{quest.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{quest.objectives.filter(o => o.completed).length}/{quest.objectives.length} 목표 완료</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        quest.difficulty === 'EASY' ? 'bg-green-100 text-green-800' :
                        quest.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        quest.difficulty === 'HARD' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {quest.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewQuest?.(quest.id)}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  자세히
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>활성화된 퀘스트가 없습니다</p>
          </div>
        )}
      </Card>

      {/* 시즌 랭킹 미리보기 */}
      {ranking.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              시즌 랭킹
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewLeaderboard}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              전체 보기
            </Button>
          </div>

          <div className="space-y-2">
            {ranking.slice(0, 5).map((user, index) => (
              <div 
                key={user.userId} 
                className={`flex items-center justify-between p-3 rounded ${
                  user.userId === userProgress.rank.toString() ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-yellow-400 text-black' :
                    index === 1 ? 'bg-gray-300 text-black' :
                    index === 2 ? 'bg-orange-400 text-black' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {user.rank}
                  </div>
                  {user.avatar && (
                    <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      {userProgress.rank === user.rank && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          나
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>LV {user.level}</span>
                      <span>{user.xp.toLocaleString()} XP</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {getRankChange(user.rank, user.previousRank) !== null && (
                    <div className={`text-xs flex items-center gap-1 ${
                      getRankChange(user.rank, user.previousRank)! > 0 ? 'text-green-600' :
                      getRankChange(user.rank, user.previousRank)! < 0 ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {getRankChange(user.rank, user.previousRank)! > 0 ? '↑' :
                       getRankChange(user.rank, user.previousRank)! < 0 ? '↓' :
                       '-'
                      }
                      {Math.abs(getRankChange(user.rank, user.previousRank)!)}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Award className="w-3 h-3" />
                    <span>{user.specialBadges.length} 뱃지</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default SeasonProgress;
