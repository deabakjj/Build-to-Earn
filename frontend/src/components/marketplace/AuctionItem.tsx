import React, { useState, useEffect } from 'react';
import { AuctionItem as IAuctionItem, Bid, AuctionStatus } from '../../types/Marketplace';
import { 
  Timer, 
  TrendingUp, 
  Users, 
  Gavel, 
  AlertTriangle, 
  Trophy,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Modal from '../common/Modal';

interface AuctionItemProps {
  item: IAuctionItem;
  onPlaceBid?: (item: IAuctionItem, bidAmount: number) => void;
  onBuyNow?: (item: IAuctionItem) => void;
  userWallet?: string;
  currentTime?: Date;
  className?: string;
}

const AuctionItem: React.FC<AuctionItemProps> = ({
  item,
  onPlaceBid,
  onBuyNow,
  userWallet,
  currentTime = new Date(),
  className = ''
}) => {
  const [showBidHistory, setShowBidHistory] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [error, setError] = useState('');

  // 시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      const now = currentTime;
      const timeDiff = item.endTime.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setTimeLeft('종료됨');
        return;
      }
      
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        setTimeLeft(`${days}일 ${hours}시간 ${minutes}분`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}시간 ${minutes}분 ${seconds}초`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}분 ${seconds}초`);
      } else {
        setTimeLeft(`${seconds}초`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [item.endTime, currentTime]);

  // 최소 입찰가 계산
  const getMinimumBid = (): number => {
    if (item.currentBid) {
      return item.currentBid.amount * (1 + item.minBidIncrement / 100);
    }
    return item.startPrice.amount;
  };

  // 가격 포맷
  const formatPrice = (amount: number, currency: string): string => {
    return `${amount.toLocaleString('ko-KR')} ${currency}`;
  };

  // 입찰 처리
  const handlePlaceBid = () => {
    const bidValue = parseFloat(bidAmount);
    const minBid = getMinimumBid();
    
    // 유효성 검사
    if (!bidValue || isNaN(bidValue)) {
      setError('유효한 금액을 입력해주세요.');
      return;
    }
    
    if (bidValue < minBid) {
      setError(`최소 입찰가는 ${formatPrice(minBid, item.startPrice.currency)}입니다.`);
      return;
    }
    
    if (item.buyoutPrice && bidValue >= item.buyoutPrice.amount) {
      setError(`즉시 구매가 이상의 금액입니다. ${formatPrice(item.buyoutPrice.amount, item.buyoutPrice.currency)}에 즉시 구매하시겠습니까?`);
      return;
    }
    
    // 경매 종료 임박 확인
    const timeToEnd = item.endTime.getTime() - currentTime.getTime();
    if (timeToEnd < 60000) { // 1분 미만
      if (!confirm('경매가 1분 미만 남았습니다. 그래도 입찰하시겠습니까?')) {
        return;
      }
    }
    
    onPlaceBid?.(item, bidValue);
    setShowBidModal(false);
    setBidAmount('');
    setError('');
  };

  // 경매 상태별 색상
  const getStatusColor = (status: AuctionStatus): string => {
    switch (status) {
      case AuctionStatus.ACTIVE:
        return 'text-green-500';
      case AuctionStatus.PENDING:
        return 'text-yellow-500';
      case AuctionStatus.ENDED:
        return 'text-orange-500';
      case AuctionStatus.SETTLED:
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  // 현재 사용자의 입찰 상태 확인
  const getUserBidStatus = () => {
    if (!userWallet) return null;
    
    const userBids = item.bids.filter(bid => bid.bidderWallet === userWallet);
    if (userBids.length === 0) return null;
    
    const userHighestBid = userBids.reduce((max, bid) => 
      bid.amount > max.amount ? bid : max
    );
    
    const isWinning = item.currentBid?.bidderWallet === userWallet;
    
    return {
      amount: userHighestBid.amount,
      isWinning,
      bidCount: userBids.length
    };
  };

  const userBidStatus = getUserBidStatus();

  return (
    <>
      <Card className={`overflow-hidden ${className}`}>
        {/* NFT 이미지 */}
        <div className="relative">
          <img
            src={item.nft.metadata.image || '/api/placeholder/400/400'}
            alt={item.nft.metadata.name}
            className="w-full h-64 object-cover"
          />
          <div className="absolute top-3 right-3 flex gap-2">
            <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
              경매
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium bg-white/90 ${getStatusColor(item.auctionStatus)}`}>
              {item.auctionStatus}
            </span>
          </div>
          {userBidStatus?.isWinning && (
            <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              최고 입찰자
            </div>
          )}
        </div>

        {/* NFT 정보 */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg">{item.nft.metadata.name}</h3>
              <p className="text-sm text-gray-600">by {item.sellerName}</p>
            </div>
            {item.buyoutPrice && (
              <div className="text-right">
                <p className="text-xs text-gray-500">즉시 구매가</p>
                <p className="text-sm font-bold">
                  {formatPrice(item.buyoutPrice.amount, item.buyoutPrice.currency)}
                </p>
              </div>
            )}
          </div>

          {/* 현재가 및 시간 정보 */}
          <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-t border-b">
            <div className="text-center">
              <p className="text-xs text-gray-500">현재가</p>
              <p className="text-lg font-bold">
                {item.currentBid 
                  ? formatPrice(item.currentBid.amount, item.currentBid.currency)
                  : formatPrice(item.startPrice.amount, item.startPrice.currency)
                }
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">입찰 수</p>
              <p className="text-lg font-bold">{item.bids.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">남은 시간</p>
              <p className="text-lg font-bold">{timeLeft}</p>
            </div>
          </div>

          {/* 사용자 입찰 상태 */}
          {userBidStatus && (
            <div className={`mb-4 p-3 rounded-lg ${
              userBidStatus.isWinning ? 'bg-green-50' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    내 최고 입찰가: {formatPrice(userBidStatus.amount, item.startPrice.currency)}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  userBidStatus.isWinning 
                    ? 'bg-green-200 text-green-800' 
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  {userBidStatus.isWinning ? '최고 입찰' : '입찰 낙찰'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                총 {userBidStatus.bidCount}번 입찰함
              </p>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 mb-4">
            {item.auctionStatus === AuctionStatus.ACTIVE && (
              <>
                <Button
                  variant="primary"
                  onClick={() => setShowBidModal(true)}
                  className="flex-1"
                  icon={<Gavel className="w-4 h-4" />}
                >
                  입찰하기
                </Button>
                {item.buyoutPrice && onBuyNow && (
                  <Button
                    variant="secondary"
                    onClick={() => onBuyNow(item)}
                    className="flex-1"
                    icon={<TrendingUp className="w-4 h-4" />}
                  >
                    즉시 구매
                  </Button>
                )}
              </>
            )}
          </div>

          {/* 입찰 내역 토글 */}
          <button
            onClick={() => setShowBidHistory(!showBidHistory)}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>입찰 내역 ({item.bids.length})</span>
            {showBidHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* 입찰 내역 */}
          {showBidHistory && (
            <div className="mt-4 border-t pt-4 max-h-40 overflow-y-auto">
              {item.bids.slice(0, 5).map((bid, index) => (
                <div 
                  key={bid.id} 
                  className={`flex justify-between items-center py-2 ${
                    index === 0 ? 'text-green-600 font-medium' : 'text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{bid.bidderName}</span>
                    {index === 0 && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        최고가
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {formatPrice(bid.amount, bid.currency)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(bid.timestamp).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
              ))}
              {item.bids.length > 5 && (
                <button className="w-full text-center text-sm text-blue-500 hover:text-blue-600 pt-2">
                  전체 입찰 내역 보기
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* 입찰 모달 */}
      <Modal
        isOpen={showBidModal}
        onClose={() => {
          setShowBidModal(false);
          setBidAmount('');
          setError('');
        }}
        title="입찰하기"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">현재 최고가</p>
            <p className="text-xl font-bold">
              {item.currentBid 
                ? formatPrice(item.currentBid.amount, item.currentBid.currency)
                : formatPrice(item.startPrice.amount, item.startPrice.currency)
              }
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">최소 입찰가</p>
            <p className="text-lg font-semibold">
              {formatPrice(getMinimumBid(), item.startPrice.currency)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              입찰 금액
            </label>
            <div className="relative">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => {
                  setBidAmount(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`최소 ${getMinimumBid()} ${item.startPrice.currency}`}
                step={0.001}
              />
              <span className="absolute right-3 top-2.5 text-gray-400">
                {item.startPrice.currency}
              </span>
            </div>
            {error && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              ⚠️ 입찰 시 주의사항:
            </p>
            <ul className="text-xs text-gray-500 mt-1 list-disc list-inside">
              <li>입찰은 취소할 수 없습니다</li>
              <li>최고가 입찰이 되지 못하면 자동으로 환불됩니다</li>
              <li>경매 종료 시 최고가 입찰자가 낙찰됩니다</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowBidModal(false);
                setBidAmount('');
                setError('');
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              variant="primary"
              onClick={handlePlaceBid}
              className="flex-1"
              disabled={!bidAmount || !!error}
            >
              입찰하기
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AuctionItem;
