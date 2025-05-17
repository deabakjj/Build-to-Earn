import React from 'react';
import { 
  MarketItemUnion, 
  SaleType, 
  TransactionStatus, 
  AuctionStatus,
  FixedPriceSale,
  AuctionItem,
  RentalContract,
  BundleSale
} from '../../types/Marketplace';
import { Clock, Tag, TrendingUp, Users, Calendar, Timer } from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';

interface NFTCardProps {
  item: MarketItemUnion;
  onPurchase?: (item: MarketItemUnion) => void;
  onBid?: (item: AuctionItem) => void;
  onRent?: (item: RentalContract) => void;
  onView?: (item: MarketItemUnion) => void;
  compact?: boolean;
  className?: string;
}

const NFTCard: React.FC<NFTCardProps> = ({
  item,
  onPurchase,
  onBid,
  onRent,
  onView,
  compact = false,
  className = ''
}) => {
  // 시간 포맷팅 함수
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return '종료됨';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}일 ${hours}시간`;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  };

  // 가격 포맷팅 함수
  const formatPrice = (amount: number, currency: string): string => {
    const formatted = amount.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
    return `${formatted} ${currency}`;
  };

  // 경매 상태 색상 가져오기
  const getAuctionStatusColor = (status: AuctionStatus): string => {
    switch (status) {
      case AuctionStatus.ACTIVE:
        return 'text-green-500';
      case AuctionStatus.ENDED:
        return 'text-orange-500';
      case AuctionStatus.SETTLED:
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  // 판매 타입별 가격 정보 렌더링
  const renderPriceInfo = () => {
    switch (item.saleType) {
      case SaleType.FIXED_PRICE:
        const fixedItem = item as FixedPriceSale;
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-500">고정가</span>
            </div>
            <p className="text-xl font-bold">
              {formatPrice(fixedItem.price.amount, fixedItem.price.currency)}
            </p>
            {fixedItem.maxQuantity && (
              <p className="text-xs text-gray-400">
                {fixedItem.soldQuantity || 0}/{fixedItem.maxQuantity} 판매됨
              </p>
            )}
          </div>
        );

      case SaleType.AUCTION:
        const auctionItem = item as AuctionItem;
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className={`text-sm font-medium ${getAuctionStatusColor(auctionItem.auctionStatus)}`}>
                경매 {auctionItem.auctionStatus}
              </span>
            </div>
            <p className="text-xl font-bold">
              {auctionItem.currentBid 
                ? formatPrice(auctionItem.currentBid.amount, auctionItem.currentBid.currency)
                : formatPrice(auctionItem.startPrice.amount, auctionItem.startPrice.currency)
              }
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {auctionItem.bids.length} 입찰
              </span>
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {formatTime(auctionItem.endTime)}
              </span>
            </div>
          </div>
        );

      case SaleType.RENTAL:
        const rentalItem = item as RentalContract;
        const minRental = rentalItem.rentalOptions.reduce((min, option) => 
          option.price.amount < min.price.amount ? option : min
        );
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-500">임대</span>
            </div>
            <p className="text-xl font-bold">
              {formatPrice(minRental.price.amount, minRental.price.currency)}
              <span className="text-sm font-normal text-gray-500 ml-1">
                / {minRental.durationLabel}
              </span>
            </p>
            {rentalItem.currentRenter && (
              <p className="text-xs text-amber-500">현재 임대 중</p>
            )}
          </div>
        );

      case SaleType.BUNDLE:
        const bundleItem = item as BundleSale;
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-500">번들</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold">
                {formatPrice(bundleItem.bundlePrice.amount, bundleItem.bundlePrice.currency)}
              </p>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                {bundleItem.discountPercentage}% 할인
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {bundleItem.items.length}개 아이템 • {bundleItem.soldBundles || 0}/{bundleItem.maxBundles || '∞'} 판매됨
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // 액션 버튼 렌더링
  const renderActionButton = () => {
    if (item.status !== TransactionStatus.ACTIVE) {
      return (
        <Button
          variant="secondary"
          onClick={() => onView?.(item)}
          disabled
          className="w-full"
        >
          {item.status === TransactionStatus.COMPLETED ? '판매 완료' : '판매 종료'}
        </Button>
      );
    }

    switch (item.saleType) {
      case SaleType.FIXED_PRICE:
        return (
          <Button
            variant="primary"
            onClick={() => onPurchase?.(item)}
            className="w-full"
          >
            지금 구매
          </Button>
        );
      
      case SaleType.AUCTION:
        const auctionItem = item as AuctionItem;
        if (auctionItem.auctionStatus === AuctionStatus.ACTIVE) {
          return (
            <Button
              variant="primary"
              onClick={() => onBid?.(auctionItem)}
              className="w-full"
            >
              입찰하기
            </Button>
          );
        }
        return (
          <Button
            variant="secondary"
            onClick={() => onView?.(item)}
            disabled
            className="w-full"
          >
            경매 종료
          </Button>
        );
      
      case SaleType.RENTAL:
        return (
          <Button
            variant="primary"
            onClick={() => onRent?.(item as RentalContract)}
            className="w-full"
          >
            임대하기
          </Button>
        );
      
      case SaleType.BUNDLE:
        return (
          <Button
            variant="primary"
            onClick={() => onPurchase?.(item)}
            className="w-full"
          >
            번들 구매
          </Button>
        );
      
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <Card className={`overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${className}`}>
        <div className="relative">
          <img
            src={item.nft.metadata.image || '/api/placeholder/300/300'}
            alt={item.nft.metadata.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
            {item.saleType}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-sm truncate">{item.nft.metadata.name}</h3>
          <div className="mt-2">
            {renderPriceInfo()}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={`overflow-hidden transition-all hover:shadow-lg ${className}`}
      onClick={() => onView?.(item)}
    >
      <div className="relative">
        <img
          src={item.nft.metadata.image || '/api/placeholder/400/400'}
          alt={item.nft.metadata.name}
          className="w-full h-64 object-cover"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
            {item.saleType}
          </span>
          {item.nft.rarity && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
              item.nft.rarity === 'LEGENDARY' ? 'bg-purple-500' :
              item.nft.rarity === 'EPIC' ? 'bg-orange-500' :
              item.nft.rarity === 'RARE' ? 'bg-blue-500' :
              item.nft.rarity === 'UNCOMMON' ? 'bg-green-500' :
              'bg-gray-500'
            }`}>
              {item.nft.rarity}
            </span>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg mb-1">{item.nft.metadata.name}</h3>
            <p className="text-sm text-gray-600">
              by <span className="font-medium">{item.sellerName}</span>
            </p>
          </div>
          {item.nft.verified && (
            <div className="flex items-center gap-1 text-blue-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">인증됨</span>
            </div>
          )}
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          {renderPriceInfo()}
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>
          {item.nft.properties?.views && (
            <div className="flex items-center gap-1">
              <span>{item.nft.properties.views} 조회</span>
            </div>
          )}
        </div>
        
        <div onClick={(e) => e.stopPropagation()}>
          {renderActionButton()}
        </div>
      </div>
    </Card>
  );
};

export default NFTCard;
