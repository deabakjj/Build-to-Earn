/**
 * Marketplace.tsx
 * 
 * NFT 마켓플레이스 페이지
 * NFT 검색, 필터링, 구매, 판매, 경매 등의 기능 제공
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useInfiniteQuery } from 'react-query';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Modal from '@/components/common/Modal';
import NFTCard from '@/components/marketplace/NFTCard';
import SearchFilter from '@/components/marketplace/SearchFilter';
import AuctionItem from '@/components/marketplace/AuctionItem';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiGrid,
  FiList,
  FiShoppingCart,
  FiTag,
  FiClock,
  FiGavel,
  FiFilter,
  FiRefreshCw,
  FiPlus
} from 'react-icons/fi';

interface NFTItem {
  id: string;
  tokenId: string;
  contract: string;
  name: string;
  description: string;
  image: string;
  creator: {
    id: string;
    username: string;
    avatar?: string;
  };
  owner: {
    id: string;
    username: string;
    avatar?: string;
  };
  category: string;
  type: 'item' | 'building' | 'vehicle' | 'land';
  price: number;
  isAuction: boolean;
  auctionData?: {
    endTime: string;
    currentBid: number;
    minBid: number;
    bidCount: number;
  };
  traits: { trait_type: string; value: string }[];
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  likes: number;
  views: number;
  isActive: boolean;
}

type MarketTab = 'all' | 'auction' | 'fixed';
type SortOption = 'newest' | 'oldest' | 'price_low' | 'price_high' | 'likes' | 'views';

const nftCategories = [
  { id: 'all', name: '전체', icon: <FiGrid /> },
  { id: 'item', name: '아이템', icon: <FiTag /> },
  { id: 'building', name: '건물', icon: <FiShoppingCart /> },
  { id: 'vehicle', name: '탈것', icon: <FiRefreshCw /> },
  { id: 'land', name: '랜드', icon: <FiClock /> }
];

const rarityColors = {
  common: 'border-gray-400 bg-gray-50',
  uncommon: 'border-green-400 bg-green-50',
  rare: 'border-blue-400 bg-blue-50',
  epic: 'border-purple-400 bg-purple-50',
  legendary: 'border-yellow-400 bg-yellow-50'
};

const Marketplace: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { wallet, connectWallet, isConnected } = useWallet();
  
  const [activeTab, setActiveTab] = useState<MarketTab>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState('');

  // 무한 스크롤 쿼리
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch
  } = useInfiniteQuery(
    ['nfts', activeTab, selectedCategory, sortBy, searchQuery],
    fetchNFTs,
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchInterval: 30000 // 30초마다 자동 새로고침
    }
  );

  async function fetchNFTs({ pageParam = 0 }) {
    // API 호출 로직 (임시 더미 데이터)
    const mockNFTs: NFTItem[] = Array(12).fill(null).map((_, index) => ({
      id: `nft-${pageParam}-${index}`,
      tokenId: `${pageParam}${index}`,
      contract: '0x123...',
      name: `Epic Sword #${pageParam * 100 + index}`,
      description: `A powerful sword forged in the depths of the earth. Perfect for adventurers seeking to gain an edge in combat.`,
      image: `/api/placeholder/300/300?text=NFT+${pageParam + 1}-${index + 1}`,
      creator: {
        id: `creator-${index}`,
        username: `MasterSmith${index + 1}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=creator${index}`
      },
      owner: {
        id: `owner-${index}`,
        username: `Player${index + 1}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=owner${index}`
      },
      category: nftCategories[Math.floor(Math.random() * nftCategories.length)].id,
      type: ['item', 'building', 'vehicle', 'land'][Math.floor(Math.random() * 4)] as any,
      price: Math.floor(Math.random() * 1000) + 50,
      isAuction: Math.random() > 0.5,
      auctionData: Math.random() > 0.5 ? {
        endTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        currentBid: Math.floor(Math.random() * 500) + 100,
        minBid: Math.floor(Math.random() * 300) + 50,
        bidCount: Math.floor(Math.random() * 50)
      } : undefined,
      traits: [
        { trait_type: 'Damage', value: Math.floor(Math.random() * 100).toString() },
        { trait_type: 'Durability', value: Math.floor(Math.random() * 100).toString() },
        { trait_type: 'Rarity', value: ['common', 'uncommon', 'rare', 'epic', 'legendary'][Math.floor(Math.random() * 5)] }
      ],
      rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary'][Math.floor(Math.random() * 5)] as any,
      likes: Math.floor(Math.random() * 1000),
      views: Math.floor(Math.random() * 10000),
      isActive: true
    }));

    return {
      nfts: mockNFTs.filter(nft => 
        (activeTab === 'all' || (activeTab === 'auction' && nft.isAuction) || (activeTab === 'fixed' && !nft.isAuction))
        && (selectedCategory === 'all' || nft.category === selectedCategory)
      ),
      nextCursor: pageParam + 1
    };
  }

  // NFT 구매 처리
  const handlePurchase = async (nft: NFTItem) => {
    if (!isConnected) {
      await connectWallet();
      return;
    }

    try {
      // 구매 트랜잭션 실행
      console.log('Purchasing NFT:', nft.id, 'for', nft.price, 'VXC');
      // TODO: 실제 구매 로직 구현
      setShowPurchaseModal(false);
      // 성공 후 페이지 리프레시
      refetch();
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  // 경매 입찰 처리
  const handleBid = async (nft: NFTItem) => {
    if (!isConnected) {
      await connectWallet();
      return;
    }

    try {
      const bidValue = parseFloat(bidAmount);
      if (!bidValue || bidValue < (nft.auctionData?.minBid || 0)) {
        alert('입찰가가 너무 낮습니다.');
        return;
      }

      // 입찰 트랜잭션 실행
      console.log('Placing bid:', bidValue, 'VXC for NFT:', nft.id);
      // TODO: 실제 입찰 로직 구현
      setShowBidModal(false);
      setBidAmount('');
      // 성공 후 페이지 리프레시
      refetch();
    } catch (error) {
      console.error('Bid failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">NFT 마켓플레이스</h1>
            <p className="text-gray-600">유니크한 NFT를 발견하고 거래하세요</p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/marketplace/create')}
            className="flex items-center gap-2"
          >
            <FiPlus />
            NFT 등록
          </Button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('all')}
          >
            전체
          </button>
          <button
            className={`px-4 py-2 font-medium flex items-center gap-2 ${
              activeTab === 'auction'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('auction')}
          >
            <FiGavel />
            경매
          </button>
          <button
            className={`px-4 py-2 font-medium flex items-center gap-2 ${
              activeTab === 'fixed'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('fixed')}
          >
            <FiTag />
            고정가
          </button>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* 검색창 */}
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="NFT 검색..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* 필터 및 정렬 */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <FiFilter />
                필터
              </Button>
              
              <select
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="newest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="price_low">가격 낮은순</option>
                <option value="price_high">가격 높은순</option>
                <option value="likes">좋아요순</option>
                <option value="views">조회수순</option>
              </select>
              
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
          </div>
          
          {/* 확장 필터 */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <SearchFilter
                categories={nftCategories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                sortOptions={[
                  { value: 'newest', label: '최신순' },
                  { value: 'oldest', label: '오래된순' },
                  { value: 'price_low', label: '가격 낮은순' },
                  { value: 'price_high', label: '가격 높은순' },
                  { value: 'likes', label: '좋아요순' },
                  { value: 'views', label: '조회수순' }
                ]}
                selectedSort={sortBy}
                onSortChange={setSortBy}
              />
            </div>
          )}
        </div>

        {/* NFT 그리드 */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(12).fill(null).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-red-500">NFT를 불러오는 중 오류가 발생했습니다.</p>
            <Button
              variant="secondary"
              onClick={() => refetch()}
              className="mt-4"
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <div>
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              <AnimatePresence mode="wait">
                {data?.pages.map((page) =>
                  page.nfts.map((nft) => (
                    nft.isAuction ? (
                      <AuctionItem
                        key={nft.id}
                        nft={nft}
                        onBid={() => {
                          setSelectedNFT(nft);
                          setShowBidModal(true);
                        }}
                        viewMode={viewMode}
                      />
                    ) : (
                      <NFTCard
                        key={nft.id}
                        nft={nft}
                        onPurchase={() => {
                          setSelectedNFT(nft);
                          setShowPurchaseModal(true);
                        }}
                        viewMode={viewMode}
                      />
                    )
                  ))
                )}
              </AnimatePresence>
            </div>
            
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

      {/* 구매 확인 모달 */}
      <Modal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        title="NFT 구매"
      >
        {selectedNFT && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <img
                src={selectedNFT.image}
                alt={selectedNFT.name}
                className="w-24 h-24 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-semibold">{selectedNFT.name}</h3>
                <p className="text-sm text-gray-600">
                  by {selectedNFT.creator.username}
                </p>
                <p className="font-bold mt-2">{selectedNFT.price} VXC</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600">
              이 NFT를 {selectedNFT.price} VXC에 구매하시겠습니까?
            </p>
            
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowPurchaseModal(false)}
              >
                취소
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => handlePurchase(selectedNFT)}
              >
                구매하기
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 입찰 모달 */}
      <Modal
        isOpen={showBidModal}
        onClose={() => setShowBidModal(false)}
        title="경매 입찰"
      >
        {selectedNFT && selectedNFT.auctionData && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <img
                src={selectedNFT.image}
                alt={selectedNFT.name}
                className="w-24 h-24 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-semibold">{selectedNFT.name}</h3>
                <p className="text-sm text-gray-600">
                  현재 입찰가: {selectedNFT.auctionData.currentBid} VXC
                </p>
                <p className="text-sm text-gray-600">
                  최소 입찰가: {selectedNFT.auctionData.minBid} VXC
                </p>
                <p className="text-xs text-gray-500">
                  입찰 종료: {new Date(selectedNFT.auctionData.endTime).toLocaleString()}
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                입찰가 (VXC)
              </label>
              <input
                type="number"
                min={selectedNFT.auctionData.minBid}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`최소 ${selectedNFT.auctionData.minBid} VXC`}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowBidModal(false)}
              >
                취소
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => handleBid(selectedNFT)}
              >
                입찰하기
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Marketplace;
