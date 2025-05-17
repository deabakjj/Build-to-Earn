import React, { useState } from 'react';
import { Friend, FriendStatus, OnlineStatus } from '../../types/Social';
import { 
  Search, 
  UserPlus, 
  MessageCircle, 
  MoreVertical, 
  Globe,
  Trophy,
  Gift,
  Ban,
  UserX,
  Video,
  ShieldCheck,
  Filter
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Modal from '../common/Modal';

interface FriendListProps {
  friends: Friend[];
  onAddFriend?: () => void;
  onRemoveFriend?: (friendId: string) => void;
  onBlockFriend?: (friendId: string) => void;
  onMessageFriend?: (friendId: string) => void;
  onVideoCall?: (friendId: string) => void;
  onViewProfile?: (friendId: string) => void;
  onInviteToParty?: (friendId: string) => void;
  onSendGift?: (friendId: string) => void;
  className?: string;
}

const FriendList: React.FC<FriendListProps> = ({
  friends,
  onAddFriend,
  onRemoveFriend,
  onBlockFriend,
  onMessageFriend,
  onVideoCall,
  onViewProfile,
  onInviteToParty,
  onSendGift,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OnlineStatus | 'all'>('all');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState<string | null>(null);

  // 온라인 상태별 색상
  const getStatusColor = (status: OnlineStatus) => {
    switch (status) {
      case OnlineStatus.ONLINE:
        return 'bg-green-500';
      case OnlineStatus.AWAY:
        return 'bg-yellow-500';
      case OnlineStatus.DND:
        return 'bg-red-500';
      case OnlineStatus.INVISIBLE:
      case OnlineStatus.OFFLINE:
      default:
        return 'bg-gray-400';
    }
  };

  // 친구 필터링
  const filteredFriends = friends.filter(friend => {
    const matchesSearch = friend.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || friend.onlineStatus === selectedStatus;
    const isAccepted = friend.status === FriendStatus.ACCEPTED;
    return matchesSearch && matchesStatus && isAccepted;
  });

  // 상태별 친구 분류
  const friendsByStatus = {
    online: filteredFriends.filter(f => f.onlineStatus === OnlineStatus.ONLINE),
    away: filteredFriends.filter(f => f.onlineStatus === OnlineStatus.AWAY),
    offline: filteredFriends.filter(f => [OnlineStatus.OFFLINE, OnlineStatus.INVISIBLE].includes(f.onlineStatus))
  };

  // 친구 카드 렌더링
  const renderFriendCard = (friend: Friend) => (
    <div 
      key={friend.id}
      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <div 
        className="flex items-center gap-3 flex-1 cursor-pointer"
        onClick={() => onViewProfile?.(friend.id)}
      >
        {/* 아바타 및 온라인 상태 */}
        <div className="relative">
          <img 
            src={friend.avatar || '/api/placeholder/40/40'} 
            alt={friend.username}
            className="w-10 h-10 rounded-full"
          />
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(friend.onlineStatus)}`} />
        </div>
        
        {/* 친구 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{friend.username}</span>
            {friend.title && (
              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                {friend.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>LV {friend.level}</span>
            {friend.guildName && (
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {friend.guildName}
              </span>
            )}
            {friend.onlineStatus === OnlineStatus.OFFLINE && friend.lastOnline && (
              <span>{new Date(friend.lastOnline).toLocaleString('ko-KR')}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* 액션 버튼 */}
      <div className="flex items-center gap-1">
        {friend.onlineStatus === OnlineStatus.ONLINE && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onMessageFriend?.(friend.id)}
              icon={<MessageCircle className="w-4 h-4" />}
              className="p-2"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onVideoCall?.(friend.id)}
              icon={<Video className="w-4 h-4" />}
              className="p-2"
            />
          </>
        )}
        
        {/* 더보기 메뉴 */}
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowOptionsMenu(showOptionsMenu === friend.id ? null : friend.id)}
            icon={<MoreVertical className="w-4 h-4" />}
            className="p-2"
          />
          
          {showOptionsMenu === friend.id && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
              <button
                onClick={() => {
                  onViewProfile?.(friend.id);
                  setShowOptionsMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
              >
                <Globe className="w-4 h-4" />
                프로필 보기
              </button>
              <button
                onClick={() => {
                  onInviteToParty?.(friend.id);
                  setShowOptionsMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                파티 초대
              </button>
              <button
                onClick={() => {
                  onSendGift?.(friend.id);
                  setShowOptionsMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
              >
                <Gift className="w-4 h-4" />
                선물하기
              </button>
              <hr className="my-1" />
              <button
                onClick={() => {
                  onRemoveFriend?.(friend.id);
                  setShowOptionsMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm text-red-600 flex items-center gap-2"
              >
                <UserX className="w-4 h-4" />
                친구 삭제
              </button>
              <button
                onClick={() => {
                  onBlockFriend?.(friend.id);
                  setShowOptionsMenu(null);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm text-red-600 flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                차단하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 친구 상세 정보 모달
  const renderFriendModal = () => (
    <Modal
      isOpen={showFriendModal}
      onClose={() => {
        setShowFriendModal(false);
        setSelectedFriend(null);
      }}
      title={selectedFriend?.username || ''}
    >
      {selectedFriend && (
        <div className="space-y-4">
          {/* 친구 기본 정보 */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img 
                src={selectedFriend.avatar || '/api/placeholder/80/80'}
                alt={selectedFriend.username}
                className="w-20 h-20 rounded-full"
              />
              <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(selectedFriend.onlineStatus)}`} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{selectedFriend.username}</h3>
              {selectedFriend.title && (
                <p className="text-purple-600">{selectedFriend.title}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span>레벨 {selectedFriend.level}</span>
                {selectedFriend.guildName && (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {selectedFriend.guildName}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* 바이오 */}
          {selectedFriend.bio && (
            <div>
              <h4 className="font-medium text-gray-700 mb-1">소개</h4>
              <p className="text-gray-600">{selectedFriend.bio}</p>
            </div>
          )}
          
          {/* 통계 */}
          {selectedFriend.stats && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">활동 통계</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">제작한 아이템</p>
                  <p className="text-lg font-medium">{selectedFriend.stats.itemsCreated}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">판매한 아이템</p>
                  <p className="text-lg font-medium">{selectedFriend.stats.itemsSold}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">총 수익</p>
                  <p className="text-lg font-medium">{selectedFriend.stats.totalEarnings} VXC</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">방문한 월드</p>
                  <p className="text-lg font-medium">{selectedFriend.stats.worldsVisited}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* 업적 */}
          {selectedFriend.achievements && selectedFriend.achievements.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">업적</h4>
              <div className="flex flex-wrap gap-2">
                {selectedFriend.achievements.slice(0, 4).map((achievement) => (
                  <span key={achievement} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {achievement}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 친구 정보 */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">친구 정보</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>친구가 된 날: {new Date(selectedFriend.addedAt).toLocaleDateString('ko-KR')}</p>
              {selectedFriend.mutualFriends && (
                <p>공통 친구: {selectedFriend.mutualFriends}명</p>
              )}
            </div>
          </div>
          
          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => onMessageFriend?.(selectedFriend.id)}
              icon={<MessageCircle className="w-4 h-4" />}
            >
              메시지
            </Button>
            <Button
              variant="secondary"
              onClick={() => onInviteToParty?.(selectedFriend.id)}
              icon={<Trophy className="w-4 h-4" />}
            >
              파티 초대
            </Button>
            <Button
              variant="secondary"
              onClick={() => onSendGift?.(selectedFriend.id)}
              icon={<Gift className="w-4 h-4" />}
            >
              선물
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 검색 및 필터 */}
      <Card className="p-4">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="친구 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as OnlineStatus | 'all')}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            <option value="all">모든 상태</option>
            <option value={OnlineStatus.ONLINE}>온라인</option>
            <option value={OnlineStatus.AWAY}>자리비움</option>
            <option value={OnlineStatus.OFFLINE}>오프라인</option>
          </select>
          <Button
            variant="primary"
            onClick={onAddFriend}
            icon={<UserPlus className="w-4 h-4" />}
          >
            친구 추가
          </Button>
        </div>
        
        {/* 상태별 카운트 */}
        <div className="flex gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            온라인 {friendsByStatus.online.length}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            자리비움 {friendsByStatus.away.length}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            오프라인 {friendsByStatus.offline.length}
          </span>
        </div>
      </Card>
      
      {/* 친구 목록 */}
      <Card className="p-4">
        {filteredFriends.length > 0 ? (
          <div className="space-y-2">
            {/* 온라인 친구 */}
            {friendsByStatus.online.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-gray-500 uppercase px-2">
                  온라인 - {friendsByStatus.online.length}
                </h3>
                {friendsByStatus.online.map(renderFriendCard)}
              </>
            )}
            
            {/* 자리비움 친구 */}
            {friendsByStatus.away.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-gray-500 uppercase px-2 mt-4">
                  자리비움 - {friendsByStatus.away.length}
                </h3>
                {friendsByStatus.away.map(renderFriendCard)}
              </>
            )}
            
            {/* 오프라인 친구 */}
            {friendsByStatus.offline.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-gray-500 uppercase px-2 mt-4">
                  오프라인 - {friendsByStatus.offline.length}
                </h3>
                {friendsByStatus.offline.map(renderFriendCard)}
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <UserPlus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>친구를 찾아보세요!</p>
          </div>
        )}
      </Card>
      
      {/* 친구 상세 모달 */}
      {renderFriendModal()}
      
      {/* 클릭 외부 영역 감지 */}
      {showOptionsMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowOptionsMenu(null)}
        />
      )}
    </div>
  );
};

export default FriendList;
