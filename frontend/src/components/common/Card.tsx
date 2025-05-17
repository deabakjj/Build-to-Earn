import React from 'react';
import { HTMLAttributes, ReactNode, forwardRef } from 'react';
import { motion, Variants } from 'framer-motion';
import { clsx } from 'clsx';

/**
 * 카드 컴포넌트의 프로퍼티 타입 정의
 */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 카드 내에 표시될 내용 */
  children: ReactNode;
  /** 카드 제목 */
  title?: string;
  /** 카드 설명 */
  description?: string;
  /** 카드 헤더 영역의 추가 내용 */
  headerContent?: ReactNode;
  /** 카드 푸터 영역의 내용 */
  footer?: ReactNode;
  /** 카드의 시각적 스타일 변형 */
  variant?: 'default' | 'outlined' | 'game' | 'nft' | 'glass' | 'gradient';
  /** 카드 크기 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 카드에 그림자 효과 적용 */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** 카드 모서리 둥글기 정도 */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 호버 효과 활성화 */
  hoverable?: boolean;
  /** 클릭 가능한 카드 */
  clickable?: boolean;
  /** 카드 애니메이션 비활성화 */
  disableAnimation?: boolean;
  /** 게임 테마 적용 */
  gameTheme?: boolean;
  /** NFT 테마 적용 */
  nftTheme?: boolean;
  /** 로딩 상태 */
  loading?: boolean;
  /** 선택된 상태 */
  selected?: boolean;
  /** 클릭 이벤트 핸들러 */
  onClick?: () => void;
}

/**
 * 카드 애니메이션 variants
 */
const cardVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
    opacity: 1,
  },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: 'easeIn',
    },
  },
  selected: {
    scale: 1.01,
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
  },
};

/**
 * 카드 컴포넌트
 * 
 * 다양한 콘텐츠를 담을 수 있는 유연한 카드 컴포넌트
 * 
 * @example
 * // 기본 사용
 * <Card title="아이템 카드">
 *   <p>카드 내용</p>
 * </Card>
 * 
 * @example
 * // NFT 테마 카드
 * <Card variant="nft" nftTheme hoverable>
 *   <img src="nft-image.jpg" alt="NFT" />
 *   <h3>레어 아이템</h3>
 * </Card>
 * 
 * @example
 * // 게임 테마 카드
 * <Card variant="game" gameTheme clickable onClick={handleClick}>
 *   <div>게임 콘텐츠</div>
 * </Card>
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      title,
      description,
      headerContent,
      footer,
      variant = 'default',
      size = 'md',
      shadow = 'md',
      rounded = 'lg',
      hoverable = false,
      clickable = false,
      disableAnimation = false,
      gameTheme = false,
      nftTheme = false,
      loading = false,
      selected = false,
      onClick,
      className,
      ...props
    },
    ref
  ) => {
    // 기본 스타일 클래스
    const baseClasses = clsx(
      'relative overflow-hidden transition-all',
      {
        'cursor-pointer': clickable || onClick,
        'animate-pulse': loading,
        
        // 게임 및 NFT 테마
        'font-gaming': gameTheme,
        'text-stroke': nftTheme,
      }
    );

    // 크기별 스타일
    const sizeClasses = {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    };

    // 그림자 스타일
    const shadowClasses = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
    };

    // 모서리 둥글기 스타일
    const roundedClasses = {
      none: '',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    };

    // 변형별 스타일
    const variantClasses = {
      default: 'bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border',
      outlined: 'bg-transparent border-2 border-primary-600 dark:border-primary-400',
      game: clsx(
        'bg-game-resource bg-opacity-10',
        'border-2 border-game-resource',
        'backdrop-blur-sm'
      ),
      nft: clsx(
        'bg-gradient-to-br from-game-nft/20 to-game-rare/20',
        'border border-game-nft',
        'shadow-nft',
        'backdrop-blur-md'
      ),
      glass: clsx(
        'glass-effect',
        'border border-white/20 dark:border-white/10'
      ),
      gradient: clsx(
        'bg-gradient-to-br from-primary-500 to-secondary-500',
        'text-white'
      ),
    };

    // 선택 상태 스타일
    const selectedClasses = selected
      ? 'ring-2 ring-primary-500 ring-offset-2'
      : '';

    // 최종 클래스 결합
    const cardClasses = clsx(
      baseClasses,
      sizeClasses[size],
      shadowClasses[shadow],
      roundedClasses[rounded],
      variantClasses[variant],
      selectedClasses,
      {
        'hover:shadow-lg': hoverable && !loading,
        'dark:shadow-dark-border': shadow !== 'none',
      },
      className
    );

    // 헤더 렌더링
    const renderHeader = () => {
      if (!title && !description && !headerContent) return null;

      return (
        <div className="mb-4 last:mb-0">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className={clsx(
                  'font-semibold',
                  {
                    'text-lg': size === 'sm',
                    'text-xl': size === 'md',
                    'text-2xl': size === 'lg',
                    'text-3xl': size === 'xl',
                  }
                )}>
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {description}
                </p>
              )}
            </div>
            {headerContent && (
              <div className="flex-shrink-0 ml-4">
                {headerContent}
              </div>
            )}
          </div>
        </div>
      );
    };

    // 푸터 렌더링
    const renderFooter = () => {
      if (!footer) return null;

      return (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
          {footer}
        </div>
      );
    };

    // 로딩 상태 표시
    const renderLoadingContent = () => (
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
      </div>
    );

    // 카드 클릭 핸들러
    const handleClick = () => {
      if ((clickable || onClick) && !loading) {
        onClick?.();
      }
    };

    // 애니메이션이 비활성화된 경우 일반 div 렌더링
    if (disableAnimation) {
      return (
        <div
          ref={ref}
          className={cardClasses}
          onClick={handleClick}
          {...props}
        >
          {renderHeader()}
          <div className="flex-1">
            {loading ? renderLoadingContent() : children}
          </div>
          {renderFooter()}
        </div>
      );
    }

    // 애니메이션이 활성화된 경우 motion div 렌더링
    return (
      <motion.div
        ref={ref}
        className={cardClasses}
        variants={cardVariants}
        initial="initial"
        whileHover={hoverable && !loading ? "hover" : undefined}
        whileTap={clickable && !loading ? "tap" : undefined}
        animate={selected ? "selected" : "initial"}
        onClick={handleClick}
        {...props}
      >
        {renderHeader()}
        <div className="flex-1">
          {loading ? renderLoadingContent() : children}
        </div>
        {renderFooter()}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
export type { CardProps };
