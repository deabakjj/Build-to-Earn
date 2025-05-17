import React, { useState } from 'react';
import { RentalContract as IRentalContract, RentalOption } from '../../types/Marketplace';
import { 
  Calendar, 
  Clock, 
  Users, 
  CreditCard, 
  RefreshCw, 
  AlertTriangle, 
  Check,
  ChevronDown,
  ChevronUp,
  HomeIcon,
  Shield
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Modal from '../common/Modal';

interface RentalContractProps {
  item: IRentalContract;
  onRent?: (item: IRentalContract, optionIndex: number, autoRenewal: boolean) => void;
  onExtendRental?: (item: IRentalContract) => void;
  onEndRental?: (item: IRentalContract) => void;
  userWallet?: string;
  currentTime?: Date;
  className?: string;
}

const RentalContract: React.FC<RentalContractProps> = ({
  item,
  onRent,
  onExtendRental,
  onEndRental,
  userWallet,
  currentTime = new Date(),
  className = ''
}) => {
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [autoRenewal, setAutoRenewal] = useState(false);
  const [error, setError] = useState('');

  // 가격 포맷
  const formatPrice = (amount: number, currency: string): string => {
    return `${amount.toLocaleString('ko-KR')} ${currency}`;
  };

  // 시간 포맷
  const formatDuration = (milliseconds: number): string => {
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return hours > 0 ? `${days}일 ${hours}시간` : `${days}일`;
    }
    return `${hours}시간`;
  };

  // 임대 기간 남은 시간 계산
  const getRemainingTime = () => {
    if (!item.currentRenter) return null;
    
    const timeLeft = item.currentRenter.endTime.getTime() - currentTime.getTime();
    if (timeLeft <= 0) return '만료됨';
    
    return formatDuration(timeLeft);
  };

  // 사용자의 임대 상태 확인
  const isCurrentRenter = item.currentRenter?.wallet === userWallet;
  const remainingTime = getRemainingTime();

  // 임대 시작
  const handleRent = () => {
    const selectedOption = item.rentalOptions[selectedOptionIndex];
    
    // 최대 임대 기간 체크
    if (item.maxRentalDuration && selectedOption.duration > item.maxRentalDuration) {
      setError('선택한 기간이 최대 임대 기간을 초과합니다.');
      return;
    }

    onRent?.(item, selectedOptionIndex, autoRenewal);
    setShowRentalModal(false);
  };

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
              임대
            </span>
            {item.currentRenter && (
              <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                임대 중
              </span>
            )}
          </div>
          {isCurrentRenter && (
            <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <HomeIcon className="w-3 h-3" />
              내가 임대한 아이템
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
            {item.revenueShare && (
              <div className="text-right">
                <p className="text-xs text-gray-500">수익 분배</p>
                <p className="text-sm font-bold">
                  {item.revenueShare.renterPercentage}%
                </p>
              </div>
            )}
          </div>

          {/* 현재 임대 상태 */}
          {item.currentRenter && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">
                    {isCurrentRenter ? '나의 임대' : `${item.currentRenter.name}님이 임대 중`}
                  </span>
                </div>
                <span className="text-sm text-purple-600">
                  {remainingTime} 남음
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">임대 시작</p>
                  <p className="text-gray-700">{new Date(item.currentRenter.startTime).toLocaleDateString('ko-KR')}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">임대 종료</p>
                  <p className="text-gray-700">{new Date(item.currentRenter.endTime).toLocaleDateString('ko-KR')}</p>
                </div>
              </div>
              {isCurrentRenter && item.autoRenewal && (
                <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                  <RefreshCw className="w-3 h-3" />
                  <span>자동 갱신 설정됨</span>
                </div>
              )}
            </div>
          )}

          {/* 임대 옵션 */}
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-medium text-gray-700">임대 옵션</h4>
            <div className="grid gap-2">
              {item.rentalOptions.map((option, index) => (
                <div 
                  key={index}
                  className={`p-3 border rounded-lg ${
                    selectedOptionIndex === index 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{option.durationLabel}</p>
                      <p className="text-sm text-gray-500">
                        {formatPrice(option.price.amount, option.price.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">일 평균</p>
                      <p className="text-sm font-medium">
                        {formatPrice(
                          option.price.amount / (option.duration / (1000 * 60 * 60 * 24)),
                          option.price.currency
                        )}/일
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            {isCurrentRenter ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => onExtendRental?.(item)}
                  className="flex-1"
                  icon={<Clock className="w-4 h-4" />}
                >
                  기간 연장
                </Button>
                <Button
                  variant="primary"
                  onClick={() => onEndRental?.(item)}
                  className="flex-1"
                  icon={<X className="w-4 h-4" />}
                >
                  임대 종료
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => setShowRentalModal(true)}
                className="w-full"
                icon={<Calendar className="w-4 h-4" />}
                disabled={!!item.currentRenter}
              >
                {item.currentRenter ? '임대 불가' : '임대하기'}
              </Button>
            )}
          </div>

          {/* 보증금 정보 */}
          {item.currentRenter?.deposit && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">보증금</span>
                </div>
                <span className="font-medium">
                  {formatPrice(
                    item.currentRenter.deposit.amount,
                    item.currentRenter.deposit.currency
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 임대 모달 */}
      <Modal
        isOpen={showRentalModal}
        onClose={() => {
          setShowRentalModal(false);
          setError('');
        }}
        title="임대 계약"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">임대 기간 선택</p>
            <div className="space-y-2">
              {item.rentalOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedOptionIndex(index)}
                  className={`w-full p-3 border rounded-lg text-left transition-colors ${
                    selectedOptionIndex === index 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{option.durationLabel}</p>
                      <p className="text-sm text-gray-500">
                        {formatPrice(option.price.amount, option.price.currency)}
                      </p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center">
                      {selectedOptionIndex === index && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 자동 갱신 옵션 */}
          <div>
            <button
              onClick={() => setAutoRenewal(!autoRenewal)}
              className={`flex items-center gap-2 w-full p-3 rounded-lg ${
                autoRenewal
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                autoRenewal ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
              }`}>
                {autoRenewal && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">자동 갱신</p>
                <p className="text-xs">임대 기간 종료 시 자동으로 갱신됩니다</p>
              </div>
            </button>
          </div>

          {/* 총 비용 및 보증금 */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">임대료</span>
              <span className="font-medium">
                {formatPrice(
                  item.rentalOptions[selectedOptionIndex].price.amount,
                  item.rentalOptions[selectedOptionIndex].price.currency
                )}
              </span>
            </div>
            {item.currentRenter?.deposit && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">보증금</span>
                <span className="font-medium">
                  {formatPrice(
                    item.currentRenter.deposit.amount,
                    item.currentRenter.deposit.currency
                  )}
                </span>
              </div>
            )}
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold">
                <span>총 금액</span>
                <span>
                  {formatPrice(
                    item.rentalOptions[selectedOptionIndex].price.amount,
                    item.rentalOptions[selectedOptionIndex].price.currency
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 주의사항 */}
          <div className="bg-amber-50 p-3 rounded-lg">
            <p className="text-sm text-amber-800 mb-1">⚠️ 임대 시 주의사항:</p>
            <ul className="text-xs text-amber-700 list-disc list-inside space-y-1">
              <li>임대 기간 동안 아이템을 자유롭게 사용할 수 있습니다</li>
              <li>임대 종료 후 자동으로 원래 소유주에게 반환됩니다</li>
              <li>보증금은 임대 종료 시 반환됩니다</li>
              <li>임대한 아이템으로 수익이 발생하면 계약에 따라 분배됩니다</li>
            </ul>
          </div>

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </p>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowRentalModal(false);
                setError('');
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              variant="primary"
              onClick={handleRent}
              className="flex-1"
              disabled={!!error}
            >
              임대 계약
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RentalContract;
