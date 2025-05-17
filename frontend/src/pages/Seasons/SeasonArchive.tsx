import React, { useState } from 'react';
import { SeasonSummary, SeasonHistory, SeasonStatus, SeasonTheme } from '../../types/Season';
import { 
  Calendar, 
  Trophy, 
  Users, 
  Star, 
  Award,
  ChevronRight,
  Filter,
  Clock,
  BarChart3,
  CheckCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

interface SeasonArchiveProps {
  seasons: SeasonSummary[];
  userHistory?: SeasonHistory[];
  onViewSeason?: (seasonId: string) => void;
  onViewRewards?: (seasonId: string) => void;
  className?: string;
}

const SeasonArchive: React.FC<SeasonArchiveProps> = ({
  seasons,
  userHistory = [],
  onViewSeason,
  onViewRewards,
  className = ''
}) => {
  const [selectedSeason, setSelectedSeason] = useState<SeasonSummary | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<SeasonStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'participants'>('newest');

  // 테마별 아이콘
  const getThemeIcon = (theme: SeasonTheme) => {
    switch (theme) {
      case SeasonTheme.WINTER:
        return '❄️';
      case SeasonTheme.SPRING:
        return '🌸';
      case SeasonTheme.SUMMER:
        return '☀️';
      case SeasonTheme.AUTUMN:
        return '🍂';
      case SeasonTheme.HALLOWEEN:
        return '🎃';
      case SeasonTheme.CHRISTMAS:
        return '🎄';
      case SeasonTheme.SPACE:
        return '🚀';
      case SeasonTheme.OCEAN:
        return '🌊';
      default:
        return '🎯';
    }
  };

  // 상태별 색상
  const getStatusColor = (status: SeasonStatus) => {
    switch (status) {
      case SeasonStatus.ACTIVE:
        return 'text-green-600 bg-green-50';
      case SeasonStatus.UPCOMING:
        return 'text-blue-600 bg-blue-50';
      case SeasonStatus.ENDED:
        return 'text-gray-600 bg-gray-50';
      case SeasonStatus.ARCHIVED:
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // 시즌 필터링 및 정렬
  const filteredSeasons = seasons
    .filter(season => filterStatus === 'all' || season.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'oldest':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'participants':
          return b.participants - a.participants;
        default:
          return 0;
      }
    });

  // 사용자 시즌 히스토리 가져오기
  const getUserSeasonHistory = (seasonId: string) => {
    return userHistory.find(history => history.seasonId === seasonId);
  };

  // 시즌 카드 렌더링
  const renderSeasonCard = (season: SeasonSummary) => {
    const userSeasonHistory = getUserSeasonHistory(season.id);
    const themeIcon = getThemeIcon(season.theme);
    const statusColor = getStatusColor(season.status);

    return (
      <Card 
        key={season.id}
        className="overflow-hidden transition-all hover:shadow-lg cursor-pointer"
        onClick={() => onViewSeason?.(season.id)}
      >
        {/* 시즌 이미지 */}
        <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-500">
          <img 
            src={season.thumbnail} 
            alt={season.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* 시즌 번호와 상태 */}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
              시즌 {season.number}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
              {season.status}
            </span>
          </div>
          
          {/* 시즌 테마 아이콘 */}
          <div className="absolute top-3 right-3 text-3xl">
            {themeIcon}
          </div>
          
          {/* 시즌 이름 */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-white text-xl font-bold">{season.name}</h3>
            <div className="flex items-center gap-4 text-white/80 text-sm mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(season.startDate).toLocaleDateString('ko-KR')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {season.participants.toLocaleString()}명
              </span>
            </div>
          </div>
        </div>
        
        {/* 시즌 정보 */}
        <div className="p-4">
          {/* 사용자 참여 정보 */}
          {userSeasonHistory && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">
                    최종 순위: {userSeasonHistory.finalRank}위 (LV {userSeasonHistory.finalLevel})
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSeason(season);
                    setShowHistoryModal(true);
                  }}
                  icon={<BarChart3 className="w-3 h-3" />}
                >
                  상세
                </Button>
              </div>
              <div className="flex gap-4 text-xs text-gray-600 mt-2">
                <span>{userSeasonHistory.completedQuests}개 퀘스트 완료</span>
                <span>{userSeasonHistory.claimedRewards.length}개 보상 수령</span>
                <span>{userSeasonHistory.achievements.length}개 업적 달성</span>
              </div>
            </div>
          )}
          
          {/* 시즌 보상 미리보기 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">주요 보상</h4>
            <div className="flex gap-2">
              {season.topRewards.slice(0, 3).map(reward => (
                <div key={reward.id} className="flex-1 min-w-0">
                  <div className="relative">
                    {reward.image ? (
                      <img 
                        src={reward.image} 
                        alt={reward.name}
                        className="w-full aspect-square object-cover rounded border border-gray-200"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gradient-to-br from-blue-500 to-purple-500 rounded border border-gray-200 flex items-center justify-center text-white">
                        <Star className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      LV{reward.level}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 truncate">{reward.name}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* 액션 버튼 */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onViewSeason?.(season.id);
              }}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              시즌 보기
            </Button>
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onViewRewards?.(season.id);
              }}
              icon={<Award className="w-4 h-4" />}
            >
              보상
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={className}>
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">시즌 아카이브</h1>
          <p className="text-gray-600 mt-1">
            지난 시즌들을 돌아보고 내 기록을 확인해보세요
          </p>
        </div>
        
        {/* 필터 및 정렬 */}
        <div className="flex gap-2 mt-4 md:mt-0">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as SeasonStatus | 'all')}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="all">전체 상태</option>
            <option value={SeasonStatus.ACTIVE}>진행 중</option>
            <option value={SeasonStatus.UPCOMING}>예정</option>
            <option value={SeasonStatus.ENDED}>종료됨</option>
            <option value={SeasonStatus.ARCHIVED}>아카이브</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'participants')}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="participants">참여자순</option>
          </select>
        </div>
      </div>
      
      {/* 시즌 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSeasons.map(renderSeasonCard)}
      </div>
      
      {/* 빈 상태 */}
      {filteredSeasons.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>해당 조건의 시즌이 없습니다</p>
        </div>
      )}
      
      {/* 시즌 상세 히스토리 모달 */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedSeason(null);
        }}
        title={selectedSeason ? `${selectedSeason.name} - 내 기록` : ''}
      >
        {selectedSeason && getUserSeasonHistory(selectedSeason.id) && (
          <div className="space-y-6">
            {(() => {
              const history = getUserSeasonHistory(selectedSeason.id)!;
              
              return (
                <>
                  {/* 요약 정보 */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500">최종 순위</p>
                      <p className="text-2xl font-bold">#{history.finalRank}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">최종 레벨</p>
                      <p className="text-2xl font-bold">{history.finalLevel}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">총 경험치</p>
                      <p className="text-2xl font-bold">{history.totalXp.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* 달성 내역 */}
                  <div className="space-y-4">
                    {/* 완료한 퀘스트 */}
                    <div>
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        퀘스트 완료 ({history.completedQuests}개)
                      </h3>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(history.completedQuests / 50) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* 수령한 보상 */}
                    <div>
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        보상 수령 ({history.claimedRewards.length}개)
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                        {history.claimedRewards.slice(0, 4).map(reward => (
                          <div key={reward.id} className="aspect-square relative">
                            {reward.image ? (
                              <img 
                                src={reward.image} 
                                alt={reward.name}
                                className="w-full h-full object-cover rounded border"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 rounded border flex items-center justify-center text-white">
                                <Star className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 달성한 업적 */}
                    {history.achievements.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-blue-500" />
                          업적 ({history.achievements.length}개)
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {history.achievements.map(achievement => (
                            <span 
                              key={achievement}
                              className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded"
                            >
                              {achievement}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 주요 이벤트 */}
                  {history.highlights.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">주요 이벤트</h3>
                      <div className="space-y-2">
                        {history.highlights.slice(0, 5).map((highlight, index) => (
                          <div key={index} className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span className="text-gray-600">
                              {new Date(highlight.date).toLocaleDateString('ko-KR')}
                            </span>
                            <span className="flex-1">{highlight.description}</span>
                            {highlight.value && (
                              <span className="font-medium">+{highlight.value}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 액션 버튼 */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowHistoryModal(false);
                        setSelectedSeason(null);
                      }}
                      className="flex-1"
                    >
                      닫기
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        onViewSeason?.(selectedSeason.id);
                      }}
                      className="flex-1"
                      icon={<ChevronRight className="w-4 h-4" />}
                    >
                      시즌 페이지로
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SeasonArchive;
