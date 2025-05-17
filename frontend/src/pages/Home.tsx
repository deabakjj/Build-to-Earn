/**
 * Home.tsx
 * 
 * DIY 크래프팅 월드의 메인 홈 페이지 컴포넌트
 * 사용자의 랜드 관리, 빠른 작업 접근, 주요 게임 정보 표시
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useGameState } from '@/hooks/useGameState';
import { useLand } from '@/hooks/useLand';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import World from '@/components/game/World';
import Quest from '@/components/game/Quest';
import SeasonBanner from '@/components/season/SeasonBanner';
import { FiPlus, FiMap, FiUsers, FiGift, FiActivity } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface UserStats {
  totalCreations: number;
  totalEarnings: number;
  landSize: string;
  currentSeason: string;
  seasonProgress: number;
  activeQuests: number;
}

interface QuickAction {
  id: string;
  title: string;
  icon: React.ReactNode;
  path: string;
  description: string;
  color: string;
}

const Home: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { gameState, isLoading: gameLoading } = useGameState();
  const { land, isLoading: landLoading } = useLand();
  
  const [userStats, setUserStats] = useState<UserStats>({
    totalCreations: 0,
    totalEarnings: 0,
    landSize: '10x10',
    currentSeason: 'SPRING',
    seasonProgress: 0,
    activeQuests: 0
  });

  // 빠른 액션 버튼 정의
  const quickActions: QuickAction[] = [
    {
      id: 'create',
      title: '새로운 창작',
      icon: <FiPlus className="text-2xl" />,
      path: '/crafting',
      description: '아이템, 건물, 탈것 등을 제작해보세요',
      color: 'bg-blue-500'
    },
    {
      id: 'explore',
      title: '탐험하기',
      icon: <FiMap className="text-2xl" />,
      path: '/explore',
      description: '다른 플레이어의 세계를 방문해보세요',
      color: 'bg-green-500'
    },
    {
      id: 'social',
      title: '소셜 허브',
      icon: <FiUsers className="text-2xl" />,
      path: '/social',
      description: '친구들과 채팅하고 협력하세요',
      color: 'bg-purple-500'
    },
    {
      id: 'rewards',
      title: '보상 센터',
      icon: <FiGift className="text-2xl" />,
      path: '/rewards',
      description: '일일 퀘스트와 시즌 보상을 확인하세요',
      color: 'bg-orange-500'
    }
  ];

  // 사용자 통계 가져오기
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserStats();
    }
  }, [isAuthenticated, user]);

  const fetchUserStats = async () => {
    try {
      // API 호출하여 사용자 통계 가져오기
      // 임시 데이터로 대체
      setUserStats({
        totalCreations: Math.floor(Math.random() * 100),
        totalEarnings: Math.floor(Math.random() * 1000),
        landSize: '20x20',
        currentSeason: 'WINTER',
        seasonProgress: Math.floor(Math.random() * 100),
        activeQuests: Math.floor(Math.random() * 5)
      });
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  // 인증되지 않은 사용자의 경우 랜딩 페이지 표시
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold text-gray-800 mb-6">
              DIY 크래프팅 월드
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Build your world, Earn your reward.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/auth/login')}
            >
              시작하기
            </Button>
          </motion.div>
          
          {/* 특징 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {quickActions.map((action) => (
              <Card key={action.id} className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${action.color} text-white mb-4`}>
                  {action.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{action.title}</h3>
                <p className="text-gray-600">{action.description}</p>
              </Card>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (gameLoading || landLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-lg text-gray-600">월드 로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증된 사용자의 홈 페이지
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 시즌 배너 */}
      <SeasonBanner />

      <div className="container mx-auto px-4 py-8">
        {/* 상단 인포 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card className="lg:col-span-3">
            <h2 className="text-2xl font-bold mb-4">
              안녕하세요, {user?.username || '창작자'}님!
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-gray-600">총 창작 수</p>
                <p className="text-2xl font-bold">{userStats.totalCreations}</p>
              </div>
              <div>
                <p className="text-gray-600">총 수익</p>
                <p className="text-2xl font-bold">{userStats.totalEarnings} VXC</p>
              </div>
              <div>
                <p className="text-gray-600">랜드 크기</p>
                <p className="text-2xl font-bold">{userStats.landSize}</p>
              </div>
              <div>
                <p className="text-gray-600">활성 퀘스트</p>
                <p className="text-2xl font-bold">{userStats.activeQuests}</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <h3 className="text-lg font-semibold mb-4">시즌 진행도</h3>
            <div className="text-center">
              <p className="text-sm text-gray-600">{userStats.currentSeason} 시즌</p>
              <div className="mt-2 bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full"
                  style={{ width: `${userStats.seasonProgress}%` }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{userStats.seasonProgress}% 완료</p>
            </div>
          </Card>
        </div>

        {/* 빠른 액션 버튼들 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => (
            <motion.div
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(action.path)}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${action.color} text-white mb-3`}>
                  {action.icon}
                </div>
                <h3 className="font-semibold">{action.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 메인 콘텐츠 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 내 월드 프리뷰 */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">내 월드</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push('/crafting')}
                >
                  <FiPlus className="mr-2" />
                  새로 만들기
                </Button>
              </div>
              <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                <World
                  isPreview={true}
                  land={land}
                  interactive={false}
                />
              </div>
            </Card>
          </div>

          {/* 사이드바 콘텐츠 */}
          <div className="space-y-6">
            {/* 일일 퀘스트 */}
            <Card>
              <h3 className="text-lg font-semibold mb-4">일일 퀘스트</h3>
              <div className="space-y-3">
                <Quest
                  title="나무 10개 수집하기"
                  progress={7}
                  total={10}
                  reward="50 VXC"
                  isDaily={true}
                />
                <Quest
                  title="아이템 5개 제작하기"
                  progress={3}
                  total={5}
                  reward="100 VXC"
                  isDaily={true}
                />
                <Quest
                  title="다른 플레이어 방문하기"
                  progress={0}
                  total={1}
                  reward="25 VXC"
                  isDaily={true}
                />
              </div>
            </Card>

            {/* 최근 활동 */}
            <Card>
              <h3 className="text-lg font-semibold mb-4">최근 활동</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <FiActivity className="mr-2 text-green-500" />
                  <span>나무 테이블을 판매했습니다 (50 VXC)</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FiActivity className="mr-2 text-blue-500" />
                  <span>희귀 자원 '크리스탈'을 발견했습니다</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FiActivity className="mr-2 text-purple-500" />
                  <span>길드 'Builders United'에 가입했습니다</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
