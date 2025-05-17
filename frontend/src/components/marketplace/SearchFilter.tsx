import React, { useState, useEffect } from 'react';
import { 
  MarketplaceFilter, 
  SaleType, 
  TransactionStatus 
} from '../../types/Marketplace';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Tag,
  Grid,
  List,
  SortAsc,
  SortDesc
} from 'lucide-react';
import Button from '../common/Button';

interface SearchFilterProps {
  filter: MarketplaceFilter;
  onFilterChange: (filter: MarketplaceFilter) => void;
  onClearFilters: () => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  className?: string;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  filter,
  onFilterChange,
  onClearFilters,
  viewMode = 'grid',
  onViewModeChange,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchInput, setSearchInput] = useState(filter.searchQuery || '');
  
  // 디바운스를 위한 효과
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({
        ...filter,
        searchQuery: searchInput
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // 필터 옵션 데이터
  const saleTypeOptions = [
    { value: SaleType.FIXED_PRICE, label: '고정가', icon: Tag },
    { value: SaleType.AUCTION, label: '경매', icon: Tag },
    { value: SaleType.RENTAL, label: '임대', icon: Tag },
    { value: SaleType.BUNDLE, label: '번들', icon: Tag }
  ];

  const categoryOptions = [
    { value: 'item', label: '아이템' },
    { value: 'building', label: '건물' },
    { value: 'vehicle', label: '탈것' },
    { value: 'land', label: '랜드' },
    { value: 'seasonal', label: '시즌 한정' }
  ];

  const rarityOptions = [
    { value: 'COMMON', label: '일반', color: 'gray' },
    { value: 'UNCOMMON', label: '특수', color: 'green' },
    { value: 'RARE', label: '희귀', color: 'blue' },
    { value: 'EPIC', label: '영웅', color: 'orange' },
    { value: 'LEGENDARY', label: '전설', color: 'purple' }
  ];

  const statusOptions = [
    { value: TransactionStatus.ACTIVE, label: '판매 중' },
    { value: TransactionStatus.COMPLETED, label: '판매 완료' },
    { value: TransactionStatus.CANCELLED, label: '취소됨' }
  ];

  const sortOptions = [
    { value: 'createdAt', label: '최신순' },
    { value: 'price', label: '가격순' },
    { value: 'endTime', label: '종료순' },
    { value: 'popularity', label: '인기순' }
  ];

  // 필터 토글 핸들러
  const toggleFilter = <T extends string>(
    type: 'saleType' | 'category' | 'rarity' | 'status',
    value: T
  ) => {
    const currentValues = filter[type] || [];
    let newValues: T[];

    if (currentValues.includes(value)) {
      newValues = currentValues.filter((v: T) => v !== value);
    } else {
      newValues = [...currentValues, value];
    }

    onFilterChange({
      ...filter,
      [type]: newValues
    });
  };

  // 가격 범위 업데이트
  const updatePriceRange = (field: 'min' | 'max', value: string) => {
    const numberValue = value === '' ? undefined : parseFloat(value);
    onFilterChange({
      ...filter,
      priceRange: {
        ...filter.priceRange,
        [field]: numberValue,
        currency: filter.priceRange?.currency || 'VXC'
      }
    });
  };

  // 정렬 옵션 변경
  const updateSort = (value: string) => {
    const [sortBy, order] = value.split('_');
    onFilterChange({
      ...filter,
      sortBy: sortBy as 'price' | 'createdAt' | 'endTime' | 'popularity',
      sortOrder: order as 'asc' | 'desc'
    });
  };

  // 활성 필터 개수 계산
  const getActiveFilterCount = () => {
    let count = 0;
    if (filter.saleType?.length) count += filter.saleType.length;
    if (filter.category?.length) count += filter.category.length;
    if (filter.rarity?.length) count += filter.rarity.length;
    if (filter.status?.length) count += filter.status.length;
    if (filter.priceRange?.min || filter.priceRange?.max) count += 1;
    if (filter.onlyVerified) count += 1;
    if (filter.onlyFeatured) count += 1;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* 검색바 및 기본 컨트롤 */}
      <div className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 검색 입력 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="NFT 검색..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 컨트롤 버튼들 */}
          <div className="flex gap-2">
            {/* 필터 토글 버튼 */}
            <Button
              variant="secondary"
              onClick={() => setIsExpanded(!isExpanded)}
              icon={<Filter className="w-4 h-4" />}
              className="relative"
            >
              필터
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* 뷰 모드 전환 */}
            {onViewModeChange && (
              <div className="border rounded-lg flex">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  onClick={() => onViewModeChange('grid')}
                  icon={<Grid className="w-4 h-4" />}
                  className="rounded-r-none"
                />
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  onClick={() => onViewModeChange('list')}
                  icon={<List className="w-4 h-4" />}
                  className="rounded-l-none border-l-0"
                />
              </div>
            )}

            {/* 정렬 선택 */}
            <select
              value={`${filter.sortBy || 'createdAt'}_${filter.sortOrder || 'desc'}`}
              onChange={(e) => updateSort(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {sortOptions.map(option => (
                <React.Fragment key={option.value}>
                  <option value={`${option.value}_desc`}>
                    {option.label} {filter.sortOrder === 'desc' ? '↓' : '↑'}
                  </option>
                  <option value={`${option.value}_asc`}>
                    {option.label} {filter.sortOrder === 'asc' ? '↑' : '↓'}
                  </option>
                </React.Fragment>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 확장된 필터 옵션 */}
      {isExpanded && (
        <div className="border-t p-4 space-y-6">
          {/* 판매 타입 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">판매 타입</h3>
            <div className="flex flex-wrap gap-2">
              {saleTypeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleFilter('saleType', option.value)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    filter.saleType?.includes(option.value)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <option.icon className="w-3 h-3" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 카테고리 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">카테고리</h3>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleFilter('category', option.value)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filter.category?.includes(option.value)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 희귀도 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">희귀도</h3>
            <div className="flex flex-wrap gap-2">
              {rarityOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleFilter('rarity', option.value)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filter.rarity?.includes(option.value)
                      ? `bg-${option.color}-500 text-white`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={
                    filter.rarity?.includes(option.value)
                      ? {
                          backgroundColor: `var(--tw-color-${option.color}-500)`,
                          color: 'white'
                        }
                      : undefined
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 가격 범위 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">가격 범위</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="최소"
                value={filter.priceRange?.min || ''}
                onChange={(e) => updatePriceRange('min', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                placeholder="최대"
                value={filter.priceRange?.max || ''}
                onChange={(e) => updatePriceRange('max', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <select
                value={filter.priceRange?.currency || 'VXC'}
                onChange={(e) => onFilterChange({
                  ...filter,
                  priceRange: {
                    ...filter.priceRange,
                    currency: e.target.value as 'VXC' | 'PTX' | 'ETH'
                  }
                })}
                className="px-3 py-2 border rounded-lg bg-white"
              >
                <option value="VXC">VXC</option>
                <option value="PTX">PTX</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
          </div>

          {/* 상태 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">판매 상태</h3>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleFilter('status', option.value)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filter.status?.includes(option.value)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 고급 옵션 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">고급 옵션</h3>
            <div className="space-y-2">
              <button
                onClick={() => onFilterChange({
                  ...filter,
                  onlyVerified: !filter.onlyVerified
                })}
                className={`flex items-center gap-2 w-full p-2 rounded-lg ${
                  filter.onlyVerified
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                  filter.onlyVerified ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                }`}>
                  {filter.onlyVerified && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm">인증된 판매자만</span>
              </button>

              <button
                onClick={() => onFilterChange({
                  ...filter,
                  onlyFeatured: !filter.onlyFeatured
                })}
                className={`flex items-center gap-2 w-full p-2 rounded-lg ${
                  filter.onlyFeatured
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                  filter.onlyFeatured ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                }`}>
                  {filter.onlyFeatured && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm">추천 상품만</span>
              </button>
            </div>
          </div>

          {/* 필터 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={onClearFilters}
              icon={<X className="w-4 h-4" />}
              className="flex-1"
            >
              필터 초기화
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsExpanded(false)}
              className="flex-1"
            >
              필터 적용
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilter;