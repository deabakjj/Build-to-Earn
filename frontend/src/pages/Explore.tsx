/**
 * Explore.tsx
 * 
 * 다른 플레이어들의 월드를 탐험하는 페이지
 * 월드 검색, 카테고리별 필터링, 인기 순위 등 기능 제공
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useInfiniteQuery } from 'react-query';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import SearchFilter from '@/components/marketplace/SearchFilter';
import World from '@/components/game/World';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  FiSearch,
  FiGrid,
  FiList,
  FiTrendingUp,
  FiClock,
  FiHeart,
  FiEye,
  FiMapPin,
  FiFilter
} from 'react-icons/fi';

interface WorldInfo {
  id: string;
  owner: {
    id: string;
    username: string;
    avatar?: string;
  };
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  visitCount: number;
  likeCount: number;
  lastUpdated: string;
  isAccessible: boolean;
  entryFee: number;
  features: string[];
  rating: number;
}

type SortOption = 'popular' | 'recent' | 'likes' | 'visits';
type ViewMode = 'grid' | 'list';

const categories = [
  { id: 'all', name: '전체', icon: <FiGrid /> },
  { id: 'architecture', name: '건축', icon: <FiMapPin /> },
  { id: 'entertainment', name: '엔터테인먼트', icon: <FiEye /> },
  { id: 'commerce', name: '상업', icon: <FiTrendingUp /> },
  { id: 'community', name: '커뮤니티', icon: <FiHeart /> },
  { id: 'adventure', name: '모험', icon: <FiClock /> }
];

const Explore: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // 무한 스크롤 쿼리
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery(
    ['worlds', selectedCategory, sortBy, searchQuery],
    fetchWorlds,
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor
    }
  );

  async function fetchWorlds({ pageParam = 0 }) {
    // API 호출 로직 (임시 더미 데이터)
    const mockWorlds: WorldInfo[] = Array(9).fill(null).map((_, index) => ({
      id: `world-${pageParam}-${index}`,
      owner: {
        id: `user-${index}`,
        username: `Creator${index + 1}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${index}`
      },
      name: `Amazing World ${pageParam + 1}-${index + 1}`,
      description: `This is an amazing ${categories.find(c => c.id === selectedCategory)?.name || 'world'} creation`,
      thumbnail: `/api/placeholder/400/300?text=World+${pageParam + 1}-${index + 1}`,
      category: categories[Math.floor(Math.random() * categories.length)].id,
      visitCount: Math.floor(Math.random() * 10000),
      likeCount: Math.floor(Math.random() * 1000),
      lastUpdated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      isAccessible: true,
      entryFee: Math.random() > 0.5 ? Math.floor(Math.random() * 50) : 0,
      features: ['Creative', 'Interactive', 'Social'],
      rating: 3 + Math.random() * 2
    }));

    return {
      worlds: mockWorlds,
      nextCursor: pageParam + 1
    };
  }

  // 월드 카드 컴포넌트
  const WorldCard: React.FC<{ world: WorldInfo }> = ({ world }) => {
    const handleVisit = () => {
      if (world.entryFee > 0) {
        // 입장료 결제 모달 표시
        // TODO: 결제 모달 구현
      }
      router.push(`/explore/${world.id}`);
    };

    return (
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className={viewMode === 'grid' ? '' : 'flex gap-4'}
      >
        <Card className="overflow-hidden">
          <div className={`aspect-video relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : ''}`}>
            <img
              src={world.thumbnail}
              alt={world.name}
              className="w-full h-full object-cover"
            />
            {world.entryFee > 0 && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-sm">
                {world.entryFee} VXC
              </div>
            )}
          </div>
          
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg line-clamp-1">{world.name}</h3>
              <span className="flex items-center text-yellow-500">
                {world.rating.toFixed(1)}
                <span className="ml-1">★</span>
              </span>
            </div>
            
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {world.description}
            </p>
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <FiEye size={14} />
                  {world.visitCount}
                </span>
                <span className="flex items-center gap-1">
                  <FiHeart size={14} />
                  {world.likeCount}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={world.owner.avatar}
                  alt={world.owner.username}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm text-gray-600">{world.owner.username}</span>
              </div>
              
              <Button
                variant={world.entryFee > 0 ? "primary" : "secondary"}
                size="sm"
                onClick={handleVisit}
              >
                방문하기
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  // 로딩 스켈레톤
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(9).fill(null).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <div className="aspect-video bg-gray-200 animate-pulse"></div>
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">월드 탐험</h1>
          <p className="text-gray-600">다른 플레이어들의 창작물을 둘러보고 영감을 받아보세요</p>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 검색창 */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="월드 검색..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* 필터 버튼 */}
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <FiFilter />
              필터
            </Button>
            
            {/* 뷰 모드 버튼 */}
            <div className="flex border rounded-lg overflow-hidden">
              <button
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white'}`}
                onClick={() => setViewMode('grid')}
              >
                <FiGrid />
              </button>
              <button
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white'}`}
                onClick={() => setViewMode('list')}
              >
                <FiList />
              </button>
            </div>
          </div>
          
          {/* 확장 필터 */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <SearchFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                sortOptions={[
                  { value: 'popular', label: '인기순' },
                  { value: 'recent', label: '최신순' },
                  { value: 'likes', label: '좋아요순' },
                  { value: 'visits', label: '방문자순' }
                ]}
                selectedSort={sortBy}
                onSortChange={setSortBy}
              />
            </div>
          )}
        </div>

        {/* 카테고리 네비게이션 */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              {category.icon}
              {category.name}
            </Button>
          ))}
        </div>

        {/* 월드 목록 */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-red-500">월드를 불러오는 중 오류가 발생했습니다.</p>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <div>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.pages.map((page) =>
                  page.worlds.map((world) => (
                    <WorldCard key={world.id} world={world} />
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {data?.pages.map((page) =>
                  page.worlds.map((world) => (
                    <WorldCard key={world.id} world={world} />
                  ))
                )}
              </div>
            )}
            
            {/* 더 보기 버튼 */}
            {hasNextPage && (
              <div className="text-center mt-8">
                <Button
                  variant="primary"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? '로딩 중...' : '더 보기'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
