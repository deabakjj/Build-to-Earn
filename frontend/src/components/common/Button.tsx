import React from 'react';
import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { motion, Variants } from 'framer-motion';
import { clsx } from 'clsx';

/**
 * 버튼 컴포넌트의 프로퍼티 타입 정의
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 버튼 내에 표시될 내용 */
  children: ReactNode;
  /** 버튼의 시각적 스타일 변형 */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'game' | 'nft';
  /** 버튼의 크기 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 로딩 상태 표시 여부 */
  loading?: boolean;
  /** 로딩 상태일 때 표시할 텍스트 */
  loadingText?: string;
  /** 버튼 아이콘 (왼쪽) */
  leftIcon?: ReactNode;
  /** 버튼 아이콘 (오른쪽) */
  rightIcon?: ReactNode;
  /** 버튼 애니메이션 비활성화 */
  disableAnimation?: boolean;
  /** 게임 테마 적용 */
  gameTheme?: boolean;
  /** 모바일 터치 최적화 */
  touchOptimized?: boolean;
}

/**
 * 버튼 애니메이션 variants
 */
const buttonVariants: Variants = {
  idle: {
    scale: 1,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: 'easeIn',
    },
  },
  disabled: {
    scale: 1,
  },
};

/**
 * 버튼 컴포넌트
 * 
 * 다양한 스타일과 기능을 지원하는 재사용 가능한 버튼 컴포넌트
 * 
 * @example
 * // 기본 사용
 * <Button>기본 버튼</Button>
 * 
 * @example
 * // 게임 테마 버튼
 * <Button variant="game" gameTheme>아이템 제작</Button>
 * 
 * @example
 * // 로딩 상태 버튼
 * <Button loading loadingText="처리 중...">제출</Button>
 * 
 * @example
 * // 아이콘 포함 버튼
 * <Button leftIcon={<PlusIcon />} rightIcon={<ArrowIcon />}>
 *   새로 만들기
 * </Button>
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disableAnimation = false,
      gameTheme = false,
      touchOptimized = false,
      disabled,
      className,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // 버튼 상태에 따른 체크
    const isDisabled = disabled || loading;

    // 기본 스타일 클래스
    const baseClasses = clsx(
      'relative inline-flex items-center justify-center',
      'font-medium rounded-lg transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      {
        // 터치 최적화
        'touch-action-manipulation': touchOptimized,
        'min-h-[44px]': touchOptimized && (size === 'sm' || size === 'xs'),
        
        // 게임 테마
        'font-gaming': gameTheme,
        'game-border shadow-nft': gameTheme && variant === 'game',
      }
    );

    // 크기별 스타일
    const sizeClasses = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
      xl: 'px-8 py-4 text-xl',
    };

    // 변형별 스타일
    const variantClasses = {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500',
      secondary: 'bg-secondary-600 hover:bg-secondary-700 text-white focus:ring-secondary-500',
      outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
      ghost: 'text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      game: 'bg-game-resource hover:bg-opacity-80 text-white focus:ring-game-nft',
      nft: 'bg-gradient-to-r from-game-nft to-game-rare text-white hover:from-game-rare hover:to-game-legendary focus:ring-game-nft',
    };

    // 다크 모드 스타일
    const darkModeClasses = 'dark:ring-offset-dark-bg';

    // 최종 클래스 결합
    const buttonClasses = clsx(
      baseClasses,
      sizeClasses[size],
      variantClasses[variant],
      darkModeClasses,
      className
    );

    // 버튼 내용 렌더링
    const renderContent = () => {
      if (loading) {
        return (
          <div className="flex items-center space-x-2">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{loadingText || children}</span>
          </div>
        );
      }

      return (
        <div className="flex items-center space-x-2">
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </div>
      );
    };

    // 애니메이션이 비활성화된 경우 일반 버튼 렌더링
    if (disableAnimation) {
      return (
        <button
          ref={ref}
          type={type}
          disabled={isDisabled}
          className={buttonClasses}
          {...props}
        >
          {renderContent()}
        </button>
      );
    }

    // 애니메이션이 활성화된 경우 motion 버튼 렌더링
    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={buttonClasses}
        variants={buttonVariants}
        initial="idle"
        whileHover={!isDisabled ? "hover" : "disabled"}
        whileTap={!isDisabled ? "tap" : "disabled"}
        animate={isDisabled ? "disabled" : "idle"}
        {...props}
      >
        {renderContent()}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
export type { ButtonProps };
