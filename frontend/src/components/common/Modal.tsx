import React from 'react';
import { Fragment, ReactNode, useEffect, useRef } from 'react';
import { Transition, Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * 모달 컴포넌트의 프로퍼티 타입 정의
 */
interface ModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 모달 닫기 콜백 함수 */
  onClose: () => void;
  /** 모달 내에 표시될 내용 */
  children: ReactNode;
  /** 모달 제목 */
  title?: string;
  /** 모달 설명 */
  description?: string;
  /** 모달 푸터 영역의 내용 */
  footer?: ReactNode;
  /** 모달 크기 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  /** 모달 위치 */
  position?: 'center' | 'top' | 'bottom';
  /** 닫기 버튼 표시 여부 */
  showCloseButton?: boolean;
  /** 오버레이 클릭 시 닫기 여부 */
  closeOnOverlayClick?: boolean;
  /** ESC 키로 닫기 여부 */
  closeOnEsc?: boolean;
  /** 모달 애니메이션 타입 */
  animation?: 'fade' | 'slide' | 'scale' | 'none';
  /** 게임 테마 적용 */
  gameTheme?: boolean;
  /** NFT 테마 적용 */
  nftTheme?: boolean;
  /** 사용자 정의 클래스 */
  className?: string;
  /** 오버레이 사용자 정의 클래스 */
  overlayClassName?: string;
  /** 모달 헤더 추가 내용 */
  headerContent?: ReactNode;
  /** 스크롤 가능 여부 */
  scrollable?: boolean;
}

/**
 * 모달 애니메이션 variants
 */
const modalVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
  },
};

/**
 * 모달 컴포넌트
 * 
 * 다양한 콘텐츠를 오버레이 형태로 표시하는 모달 컴포넌트
 * 
 * @example
 * // 기본 사용
 * <Modal isOpen={isOpen} onClose={handleClose} title="제목">
 *   <p>모달 내용</p>
 * </Modal>
 * 
 * @example
 * // 게임 테마 모달
 * <Modal 
 *   isOpen={isOpen} 
 *   onClose={handleClose}
 *   gameTheme
 *   animation="scale"
 *   footer={<Button onClick={handleAction}>확인</Button>}
 * >
 *   <div>게임 콘텐츠</div>
 * </Modal>
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  footer,
  size = 'md',
  position = 'center',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  animation = 'fade',
  gameTheme = false,
  nftTheme = false,
  className,
  overlayClassName,
  headerContent,
  scrollable = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC 키 처리
  useEffect(() => {
    if (!closeOnEsc) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, closeOnEsc]);

  // 오버레이 클릭 핸들러
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // 모달 크기 클래스
  const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-none',
  };

  // 모달 위치 클래스
  const positionClasses = {
    center: 'items-center',
    top: 'items-start pt-20',
    bottom: 'items-end pb-20',
  };

  // 모달 기본 스타일
  const modalClasses = clsx(
    'relative w-full mx-4 bg-white dark:bg-dark-card rounded-lg shadow-xl',
    'transform transition-all duration-300',
    sizeClasses[size],
    {
      // 테마별 스타일
      'bg-game-resource bg-opacity-90 border-2 border-game-nft': gameTheme,
      'bg-gradient-to-br from-game-nft/20 to-game-rare/20 shadow-nft': nftTheme,
      'font-gaming': gameTheme,
    },
    className
  );

  // 오버레이 스타일
  const overlayClasses = clsx(
    'fixed inset-0 bg-black bg-opacity-50 transition-opacity',
    {
      'bg-opacity-70': gameTheme || nftTheme,
    },
    overlayClassName
  );

  // 헤더 렌더링
  const renderHeader = () => {
    if (!title && !description && !headerContent && !showCloseButton) {
      return null;
    }

    return (
      <div className={clsx(
        'flex items-center justify-between p-6 border-b',
        'border-gray-200 dark:border-dark-border',
        {
          'border-game-nft': gameTheme,
          'border-game-nft/50': nftTheme,
        }
      )}>
        <div className="flex-1">
          {title && (
            <Dialog.Title className={clsx(
              'text-lg font-medium text-gray-900 dark:text-white',
              {
                'text-game-nft font-gaming': gameTheme,
                'text-white': nftTheme,
              }
            )}>
              {title}
            </Dialog.Title>
          )}
          {description && (
            <p className={clsx(
              'mt-1 text-sm text-gray-500 dark:text-gray-400',
              {
                'text-game-resource': gameTheme,
                'text-gray-300': nftTheme,
              }
            )}>
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {headerContent}
          {showCloseButton && (
            <button
              onClick={onClose}
              className={clsx(
                'p-2 rounded-md transition-colors',
                'hover:bg-gray-100 dark:hover:bg-dark-border',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                {
                  'hover:bg-game-resource/20 text-game-nft': gameTheme,
                  'hover:bg-game-rare/20 text-white': nftTheme,
                }
              )}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // 푸터 렌더링
  const renderFooter = () => {
    if (!footer) return null;

    return (
      <div className={clsx(
        'px-6 py-4 border-t',
        'border-gray-200 dark:border-dark-border',
        {
          'border-game-nft': gameTheme,
          'border-game-nft/50': nftTheme,
        }
      )}>
        {footer}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          open={isOpen}
          onClose={onClose}
          className="relative z-50"
          initialFocus={modalRef}
        >
          {/* 오버레이 */}
          <motion.div
            className={overlayClasses}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleOverlayClick}
          />

          {/* 모달 컨테이너 */}
          <div className={clsx(
            'fixed inset-0 flex',
            positionClasses[position]
          )}>
            <motion.div
              ref={modalRef}
              className={modalClasses}
              variants={modalVariants[animation]}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {renderHeader()}
              
              {/* 모달 콘텐츠 */}
              <div className={clsx(
                'flex-1',
                {
                  'overflow-y-auto': scrollable,
                  'max-h-full': scrollable,
                }
              )}>
                <div className="p-6">
                  {children}
                </div>
              </div>
              
              {renderFooter()}
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default Modal;
export type { ModalProps };
