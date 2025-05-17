import React from 'react';
import { Season, SeasonStatus, SeasonTheme } from '../../types/Season';
import { 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  Star, 
  ChevronRight,
  Timer,
  Badge,
  SparklesIcon
} from 'lucide-react';
import Button from '../common/Button';

interface SeasonBannerProps {
  season: Season;
  userProgress?: {
    level: number;
    xp: number;
    rank: number;
  };
  onJoinSeason?: () => void;
  onViewDetails?: () => void;
  currentTime?: Date;
  className?: string;
}

const SeasonBanner: React.FC<SeasonBannerProps> = ({
  season,
  userProgress,
  onJoinSeason,
  onViewDetails,
  currentTime = new Date(),
  className = ''
}) => {
  // 시간 계산
  const getTimeRemaining = () => {
    const target = season.status === SeasonStatus.UPCOMING ? season.startDate : season.endDate;
    const timeDiff = target.getTime() - currentTime.getTime();
    
    if (timeDiff <= 0) return null;
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes, total: timeDiff };
  };

  const timeRemaining = getTimeRemaining();

  // 상태별 색상 테마
  const getStatusTheme = (status: SeasonStatus) => {
    switch (status) {
      case SeasonStatus.UPCOMING:
        return {
          bg: 'from-blue-600 to-blue-800',
          badge: 'bg-blue-100 text-blue-800',
          button: 'bg-white/20 hover:bg-white/30'
        };
      case SeasonStatus.ACTIVE:
        return {
          bg: 'from-green-600 to-green-800',
          badge: 'bg-green-100 text-green-800',
          button: 'bg-white/20 hover:bg-white/30'
        };
      case SeasonStatus.ENDING:
        return {
          bg: 'from-orange-600 to-orange-800',
          badge: 'bg-orange-100 text-orange-800',
          button: 'bg-white/20 hover:bg-white/30'
        };
      case SeasonStatus.ENDED:
        return {
          bg: 'from-gray-600 to-gray-800',
          badge: 'bg-gray-100 text-gray-800',
          button: 'bg-white/20 hover:bg-white/30'
        };
      default:
        return {
          bg: 'from-purple-600 to-purple-800',
          badge: 'bg-purple-100 text-purple-800',
          button: 'bg-white/20 hover:bg-white/30'
        };
    }
  };

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

  const statusTheme = getStatusTheme(season.status);
  const themeIcon = getThemeIcon(season.theme);

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* 배경 이미지 */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${season.images.banner || '/api/placeholder/1200/400'})` }}
      />
      
      {/* 오버레이 그라데이션 */}
      <div className={`absolute inset-0 bg-gradient-to-r ${statusTheme.bg} opacity-90`} />
      
      {/* 컨텐츠 */}
      <div className="relative p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          {/* 시즌 정보 */}
          <div className="flex items-start gap-6">
            {/* 시즌 아이콘 */}
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl">
                {themeIcon}
              </div>
            </div>
            
            {/* 시즌 상세 */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusTheme.badge}`}>
                  시즌 {season.number}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusTheme.badge}`}>
                  {season.status}
                </span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{season.name}</h1>
              <p className="text-white/80 max-w-md">{season.description}</p>
              
              {/* 시간 정보 */}
              {timeRemaining && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>
                      {season.status === SeasonStatus.UPCOMING ? '시작까지' : '종료까지'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-white/20 px-2 py-1 rounded">
                      <span className="text-lg font-bold">{timeRemaining.days}</span>
                      <span className="text-xs">일</span>
                    </div>
                    <div className="bg-white/20 px-2 py-1 rounded">
                      <span className="text-lg font-bold">{timeRemaining.hours}</span>
                      <span className="text-xs">시간</span>
                    </div>
                    <div className="bg-white/20 px-2 py-1 rounded">
                      <span className="text-lg font-bold">{timeRemaining.minutes}</span>
                      <span className="text-xs">분</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 액션 영역 */}
          <div className="mt-6 md:mt-0 md:text-right">
            {/* 사용자 진행도 */}
            {userProgress && season.status === SeasonStatus.ACTIVE && (
              <div className="mb-4">
                <div className="flex items-center justify-start md:justify-end gap-4 text-sm mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>레벨 {userProgress.level}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>랭킹 {userProgress.rank}위</span>
                  </div>
                </div>
                <div className="w-full md:w-64 bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((userProgress.xp % 1000) / 1000) * 100}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-white/60 mt-1 text-left md:text-right">
                  {userProgress.xp % 1000}/1000 XP
                </p>
              </div>
            )}
            
            {/* 액션 버튼 */}
            <div className="flex flex-col sm:flex-row gap-3">
              {season.status === SeasonStatus.UPCOMING && !season.userProgress && (
                <Button
                  variant="secondary"
                  onClick={onJoinSeason}
                  className={`${statusTheme.button} text-white border-white/20`}
                  icon={<Users className="w-4 h-4" />}
                >
                  시즌 참가 신청
                </Button>
              )}
              
              {season.status === SeasonStatus.ACTIVE && !season.userProgress && (
                <Button
                  variant="primary"
                  onClick={onJoinSeason}
                  className="bg-white text-gray-900 hover:bg-white/90"
                  icon={<SparklesIcon className="w-4 h-4" />}
                >
                  지금 참가하기
                </Button>
              )}
              
              <Button
                variant="secondary"
                onClick={onViewDetails}
                className={`${statusTheme.button} text-white border-white/20`}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                자세히 보기
              </Button>
            </div>
            
            {/* 특별 혜택 */}
            {season.status === SeasonStatus.ACTIVE && season.features.newItems.length > 0 && (
              <div className="mt-4 text-xs text-white/60">
                <span className="flex items-center gap-1 justify-start md:justify-end">
                  <Badge className="w-3 h-3" />
                  {season.features.newItems.length}개의 새로운 아이템 추가
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* 하단 정보 */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <div className="flex flex-wrap items-center gap-6 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(season.startDate).toLocaleDateString('ko-KR')} - 
                {new Date(season.endDate).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>{season.levelSystem.rewards.length}개의 보상</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              <span>{season.content.quests.length}개의 퀘스트</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonBanner;
