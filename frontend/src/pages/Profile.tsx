/**
 * Profile.tsx
 * 
 * 사용자 프로필 페이지
 * NFT 인벤토리, 거래 기록, 통계, 설정 등 관리
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { useNFT } from '@/hooks/useNFT';
import { useWallet } from '@/hooks/useWallet';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Modal from '@/components/common/Modal';
import NFTCard from '@/components/marketplace/NFTCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser,
  FiPackage,
  FiActivity,
  FiSettings,
  FiEdit2,
  FiHeart,
  FiEye,
  FiGift,
  FiDollarSign,
  FiTrendingUp,
  FiCopy,
  FiCamera,
  FiCalendar,
  FiMapPin,
  FiExternalLink
} from 'react-icons/fi';

interface ProfileStats {
  totalCreations: number;
  totalEarnings: number;
  totalPurchases: number;
  totalViews: number;
  totalLikes: number;
  followers: number;
  following: number;
  landSize: string;
  memberSince: string;
}

interface TransactionHistory {
  id: string;
  type: 'create' | 'buy' | 'sell' | 'auction' | 'rental';
  nftName: string;
  nftImage: string;
  amount: number;
  timestamp: string;
  otherParty?: {
    username: string;
    avatar?: string;
  };
  status: 'completed' | 'pending' | 'failed';
}

type ProfileTab = 'overview' | 'inventory' | 'activity' | 'settings';

const Profile: React.FC = () => {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { userNFTs, transactionHistory, isLoading } = useNFT();
  const { wallet, isConnected, balance } = useWallet();
  
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    avatar: user?.avatar || ''
  });
  const [selectedNFT, setSelectedNFT] = useState<any>(null);
  const [showNFTModal, setShowNFTModal] = useState(false);

  // 사용자 통계 (임시 더미 데이터)
  const profileStats: ProfileStats = {
    totalCreations: 156,
    totalEarnings: 25890,
    totalPurchases: 89,
    totalViews: 45672,
    totalLikes: 8234,
    followers: 1024,
    following: 345,
    landSize: '50x50',
    memberSince: '2024년 3월'
  };

  // 거래 내역 (임시 더미 데이터)
  const transactions: TransactionHistory[] = [
    {
      id: '1',
      type: 'sell',
      nftName: 'Epic Sword +5',
      nftImage: '/api/placeholder/100/100',
      amount: 450,
      timestamp: '2024-05-10T12:00:00Z',
      otherParty: {
        username: 'PlayerX',
        avatar: '/api/placeholder/32/32'
      },
      status: 'completed'
    },
    // ... 더 많은 거래 내역
  ];

  const handleEditProfile = async () => {
    try {
      await updateProfile(editForm);
      setShowEditModal(false);
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
  };

  const copyWalletAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      // TODO: toast notification 표시
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* 프로필 헤더 */}
        <Card className="mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* 아바타 & 기본 정보 */}
            <div className="text-center md:text-left">
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    user?.username?.charAt(0).toUpperCase()
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-0 right-0"
                  onClick={() => setShowEditModal(true)}
                >
                  <FiCamera />
                </Button>
              </div>
              
              <h1 className="text-2xl font-bold mt-4">{user?.username}</h1>
              <p className="text-gray-600 max-w-md mx-auto md:mx-0">
                {user?.bio || "안녕하세요! DIY 크래프팅 월드에서 창작하고 있습니다."}
              </p>
              
              <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiCalendar />
                  {profileStats.memberSince} 가입
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiMapPin />
                  랜드 크기: {profileStats.landSize}
                </div>
              </div>
            </div>

            {/* 통계 */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{profileStats.totalCreations}</div>
                <div className="text-sm text-gray-600">총 창작 수</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{profileStats.totalEarnings}</div>
                <div className="text-sm text-gray-600">총 수익 (VXC)</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{profileStats.followers}</div>
                <div className="text-sm text-gray-600">팔로워</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{profileStats.landSize}</div>
                <div className="text-sm text-gray-600">랜드 크기</div>
              </div>
            </div>
          </div>

          {/* 지갑 정보 */}
          {isConnected && wallet && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">연결된 지갑</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyWalletAddress}
                    >
                      <FiCopy />
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">잔액</div>
                  <div className="font-bold">{balance.VXC} VXC</div>
                  <div className="text-sm text-gray-600">{balance.PTX} PTX</div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 탭 네비게이션 */}
        <div className="flex gap-1 mb-8 border-b">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => handleTabChange('overview')}
          >
            <div className="flex items-center gap-2">
              <FiUser />
              개요
            </div>
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'inventory'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => handleTabChange('inventory')}
          >
            <div className="flex items-center gap-2">
              <FiPackage />
              인벤토리
            </div>
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'activity'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => handleTabChange('activity')}
          >
            <div className="flex items-center gap-2">
              <FiActivity />
              활동 내역
            </div>
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => handleTabChange('settings')}
          >
            <div className="flex items-center gap-2">
              <FiSettings />
              설정
            </div>
          </button>
        </div>

        {/* 탭 콘텐츠 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 최근 창작물 */}
                <div className="lg:col-span-2">
                  <Card>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold">최근 창작물</h3>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push('/crafting')}
                      >
                        새로 만들기
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 임시 NFT 데이터 */}
                      {Array(4).fill(null).map((_, index) => (
                        <NFTCard
                          key={index}
                          nft={{
                            id: `nft-${index}`,
                            name: `My Creation #${index + 1}`,
                            image: `/api/placeholder/300/300?text=NFT+${index + 1}`,
                            price: Math.floor(Math.random() * 1000) + 100,
                            creator: { username: user?.username || 'You' },
                            owner: { username: user?.username || 'You' },
                            likes: Math.floor(Math.random() * 1000),
                            views: Math.floor(Math.random() * 10000),
                            isAuction: false,
                            traits: [],
                            rarity: 'common',
                            category: 'item',
                            type: 'item',
                            contract: '',
                            tokenId: '',
                            isActive: true,
                            description: ''
                          }}
                          onPurchase={() => {}}
                          viewMode="grid"
                        />
                      ))}
                    </div>
                  </Card>
                </div>

                {/* 수익 차트 */}
                <div>
                  <Card>
                    <h3 className="text-lg font-semibold mb-4">수익 분석</h3>
                    <div className="space-y-4">
                      <div className="h-48 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold">25,890 VXC</div>
                          <div className="text-sm text-gray-600">총 수익</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>NFT 판매</span>
                          <span className="font-medium">18,450 VXC</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{width: '65%'}}></div>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span>임대 수익</span>
                          <span className="font-medium">5,230 VXC</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{width: '20%'}}></div>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span>퀘스트 보상</span>
                          <span className="font-medium">2,210 VXC</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{width: '15%'}}></div>
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">최근 활동</h3>
                    <div className="space-y-3">
                      {[
                        { action: 'Epic Sword를 450 VXC에 판매', time: '2시간 전', icon: <FiDollarSign className="text-green-500" /> },
                        { action: 'Magic Tower 제작 완료', time: '5시간 전', icon: <FiPackage className="text-blue-500" /> },
                        { action: 'Dragon Quest 완료', time: '1일 전', icon: <FiGift className="text-purple-500" /> }
                      ].map((activity, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            {activity.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{activity.action}</p>
                            <p className="text-xs text-gray-500">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">내 NFT 컬렉션</h3>
                  <div className="flex gap-2">
                    <select className="px-3 py-2 border rounded-lg text-sm">
                      <option>전체</option>
                      <option>아이템</option>
                      <option>건물</option>
                      <option>탈것</option>
                      <option>랜드</option>
                    </select>
                    <select className="px-3 py-2 border rounded-lg text-sm">
                      <option>최신순</option>
                      <option>가치 높은순</option>
                      <option>가치 낮은순</option>
                      <option>좋아요순</option>
                    </select>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array(8).fill(null).map((_, index) => (
                      <div key={index} className="animate-pulse">
                        <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array(12).fill(null).map((_, index) => (
                      <NFTCard
                        key={index}
                        nft={{
                          id: `nft-${index}`,
                          name: `My NFT #${index + 1}`,
                          image: `/api/placeholder/300/300?text=NFT+${index + 1}`,
                          price: Math.floor(Math.random() * 1000) + 100,
                          creator: { username: user?.username || 'You' },
                          owner: { username: user?.username || 'You' },
                          likes: Math.floor(Math.random() * 1000),
                          views: Math.floor(Math.random() * 10000),
                          isAuction: false,
                          traits: [],
                          rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary'][Math.floor(Math.random() * 5)] as any,
                          category: 'item',
                          type: 'item',
                          contract: '',
                          tokenId: '',
                          isActive: true,
                          description: ''
                        }}
                        onPurchase={() => {}}
                        viewMode="grid"
                      />
                    ))}
                  </div>
                )}
                
                {/* 페이지네이션 */}
                <div className="flex justify-center mt-8">
                  <Button variant="secondary">더 보기</Button>
                </div>
              </Card>
            )}

            {activeTab === 'activity' && (
              <Card>
                <h3 className="text-xl font-semibold mb-6">거래 내역</h3>
                
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <img
                          src={transaction.nftImage}
                          alt={transaction.nftName}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{transaction.nftName}</span>
                            <span className={`text-xs px-2 py-1 rounded capitalize ${
                              transaction.type === 'sell' ? 'bg-green-100 text-green-700' :
                              transaction.type === 'buy' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {transaction.type}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {transaction.otherParty && (
                              <span>
                                {transaction.type === 'sell' ? '구매자' : '판매자'}: {transaction.otherParty.username}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-medium ${
                          transaction.type === 'sell' ? 'text-green-600' :
                          transaction.type === 'buy' ? 'text-red-600' :
                          'text-gray-900'
                        }`}>
                          {transaction.type === 'sell' ? '+' : '-'}{transaction.amount} VXC
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(transaction.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 페이지네이션 */}
                <div className="flex justify-center mt-8">
                  <Button variant="secondary">더 보기</Button>
                </div>
              </Card>
            )}

            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 기본 설정 */}
                <Card>
                  <h3 className="text-xl font-semibold mb-6">계정 설정</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        사용자명
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={user?.username}
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이메일
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={user?.email}
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        자기소개
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        value={user?.bio || ''}
                        placeholder="자신에 대해 소개해주세요..."
                      />
                    </div>
                    
                    <Button variant="primary" onClick={() => setShowEditModal(true)}>
                      프로필 수정
                    </Button>
                  </div>
                </Card>
                
                {/* 알림 설정 */}
                <Card>
                  <h3 className="text-xl font-semibold mb-6">알림 설정</h3>
                  
                  <div className="space-y-4">
                    {[
                      { id: 'new_follower', label: '새로운 팔로워', description: '누군가 나를 팔로우할 때 알림 받기' },
                      { id: 'nft_sold', label: 'NFT 판매', description: '내 NFT가 판매될 때 알림 받기' },
                      { id: 'auction_bid', label: '경매 입찰', description: '내 경매에 새로운 입찰이 있을 때 알림 받기' },
                      { id: 'quest_complete', label: '퀘스트 완료', description: '퀘스트를 완료했을 때 알림 받기' },
                      { id: 'season_change', label: '시즌 변경', description: '새로운 시즌이 시작될 때 알림 받기' }
                    ].map((setting) => (
                      <div key={setting.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{setting.label}</div>
                          <div className="text-sm text-gray-600">{setting.description}</div>
                        </div>
                        <div className="relative inline-block w-12 align-middle select-none">
                          <input
                            type="checkbox"
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white appearance-none cursor-pointer"
                            defaultChecked
                          />
                          <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium mb-4">이메일 수신 설정</h4>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        마케팅 이메일 수신
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        시즌 업데이트 이메일 수신
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        주간 요약 이메일 수신
                      </label>
                    </div>
                  </div>
                </Card>
                
                {/* 보안 설정 */}
                <Card>
                  <h3 className="text-xl font-semibold mb-6">보안 설정</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">2단계 인증</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        추가 보안을 위해 2단계 인증을 활성화하세요.
                      </p>
                      <Button variant="secondary">2단계 인증 설정</Button>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">비밀번호 변경</h4>
                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="현재 비밀번호"
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="password"
                          placeholder="새 비밀번호"
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="password"
                          placeholder="새 비밀번호 확인"
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button variant="primary">비밀번호 변경</Button>
                      </div>
                    </div>
                    
                    <div className="pt-6 border-t">
                      <h4 className="font-medium mb-2 text-red-600">위험 구역</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        계정을 삭제하거나 비활성화할 수 있습니다.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="secondary">계정 비활성화</Button>
                        <Button variant="danger">계정 삭제</Button>
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* 개인정보 설정 */}
                <Card>
                  <h3 className="text-xl font-semibold mb-6">개인정보 설정</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">프로필 공개 설정</h4>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input type="radio" name="privacy" className="mr-2" defaultChecked />
                          공개 - 모든 사용자가 내 프로필을 볼 수 있음
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="privacy" className="mr-2" />
                          팔로워만 - 나를 팔로우하는 사용자만 볼 수 있음
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="privacy" className="mr-2" />
                          비공개 - 나만 볼 수 있음
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">데이터 다운로드</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        내 계정 데이터를 다운로드할 수 있습니다.
                      </p>
                      <Button variant="secondary">데이터 다운로드 요청</Button>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">연결된 계정</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <img src="/logos/metamask.png" alt="MetaMask" className="w-6 h-6" />
                            <span>MetaMask</span>
                          </div>
                          <Button variant="ghost" size="sm">
                            연결 해제
                          </Button>
                        </div>
                        <Button variant="secondary" className="w-full">
                          + 계정 연결
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 프로필 수정 모달 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="프로필 수정"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              아바터 이미지
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {editForm.avatar ? (
                  <img src={editForm.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="text-2xl text-gray-400" />
                )}
              </div>
              <Button variant="secondary" size="sm">
                이미지 업로드
              </Button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사용자명
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={editForm.username}
              onChange={(e) => setEditForm({...editForm, username: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              자기소개
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={editForm.bio}
              onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
              placeholder="자신에 대해 소개해주세요..."
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowEditModal(false)}
            >
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleEditProfile}
            >
              저장
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
