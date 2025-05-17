/**
 * Block Component
 * 
 * 월드를 구성하는 기본 블록을 표시하고 편집하는 컴포넌트
 * 
 * Features:
 * - 다양한 블록 타입 (잔디, 흙, 돌, 물, 모래, 눈 등)
 * - 블록 스타일 및 텍스처 적용
 * - 블록 높이 조정
 * - 블록 장식 추가
 * - 블록 조합 시스템
 * - 특수 블록 효과
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import { 
  FaCube, 
  FaLeaf, 
  FaMountain, 
  FaTint, 
  FaSnowflake, 
  FaFire,
  FaPalette,
  FaLayerGroup,
  FaWand
} from 'react-icons/fa';
import { BlockData } from '@/types/World';
import { useMobile } from '@/hooks/useMobile';

// 블록 타입 정의
export interface BlockType {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  texture?: string;
  hardness: number;
  isLiquid: boolean;
  isClimbable: boolean;
  hasGravity: boolean;
  lightLevel: number;
  category: 'natural' | 'construction' | 'decoration' | 'technical' | 'special';
  description: string;
  dropItems?: string[];
  toolRequired?: 'none' | 'pickaxe' | 'shovel' | 'axe';
}

// 블록 장식 타입
export interface BlockDecoration {
  id: string;
  name: string;
  type: 'grass' | 'flower' | 'mushroom' | 'crystal' | 'light' | 'custom';
  modelPath?: string;
  color?: string;
  glowIntensity?: number;
  animationType?: 'none' | 'sway' | 'rotate' | 'pulse';
}

// 블록 프리셋 정의
export const BLOCK_TYPES: Record<string, BlockType> = {
  grass: {
    id: 'grass',
    name: '잔디',
    icon: <FaLeaf />,
    color: '#4a7c59',
    hardness: 0.5,
    isLiquid: false,
    isClimbable: false,
    hasGravity: false,
    lightLevel: 0,
    category: 'natural',
    description: '기본적인 잔디 블록',
    dropItems: ['dirt'],
    toolRequired: 'shovel'
  },
  dirt: {
    id: 'dirt',
    name: '흙',
    icon: <FaCube />,
    color: '#8b6f47',
    hardness: 0.5,
    isLiquid: false,
    isClimbable: false,
    hasGravity: false,
    lightLevel: 0,
    category: 'natural',
    description: '기본적인 흙 블록',
    dropItems: ['dirt'],
    toolRequired: 'shovel'
  },
  stone: {
    id: 'stone',
    name: '돌',
    icon: <FaMountain />,
    color: '#6b6b6b',
    hardness: 1.5,
    isLiquid: false,
    isClimbable: false,
    hasGravity: false,
    lightLevel: 0,
    category: 'natural',
    description: '단단한 돌 블록',
    dropItems: ['cobblestone'],
    toolRequired: 'pickaxe'
  },
  water: {
    id: 'water',
    name: '물',
    icon: <FaTint />,
    color: '#006994',
    hardness: 0,
    isLiquid: true,
    isClimbable: false,
    hasGravity: true,
    lightLevel: 0,
    category: 'natural',
    description: '액체 상태의 물',
    dropItems: [],
    toolRequired: 'none'
  },
  sand: {
    id: 'sand',
    name: '모래',
    icon: <FaCube />,
    color: '#c2b280',
    hardness: 0.5,
    isLiquid: false,
    isClimbable: false,
    hasGravity: true,
    lightLevel: 0,
    category: 'natural',
    description: '중력의 영향을 받는 모래',
    dropItems: ['sand'],
    toolRequired: 'shovel'
  },
  snow: {
    id: 'snow',
    name: '눈',
    icon: <FaSnowflake />,
    color: '#ffffff',
    hardness: 0.2,
    isLiquid: false,
    isClimbable: false,
    hasGravity: false,
    lightLevel: 0,
    category: 'natural',
    description: '부드러운 눈 블록',
    dropItems: ['snowball'],
    toolRequired: 'shovel'
  },
  lava: {
    id: 'lava',
    name: '용암',
    icon: <FaFire />,
    color: '#ff4500',
    hardness: 0,
    isLiquid: true,
    isClimbable: false,
    hasGravity: true,
    lightLevel: 15,
    category: 'special',
    description: '뜨거운 용암',
    dropItems: [],
    toolRequired: 'none'
  },
  // 특수 블록들
  glowstone: {
    id: 'glowstone',
    name: '발광석',
    icon: <FaFire />,
    color: '#ffdd3c',
    hardness: 0.3,
    isLiquid: false,
    isClimbable: false,
    hasGravity: false,
    lightLevel: 15,
    category: 'special',
    description: '밝은 빛을 발하는 블록',
    dropItems: ['glowstone_dust'],
    toolRequired: 'pickaxe'
  },
  ice: {
    id: 'ice',
    name: '얼음',
    icon: <FaSnowflake />,
    color: '#74c2e1',
    hardness: 0.5,
    isLiquid: false,
    isClimbable: false,
    hasGravity: false,
    lightLevel: 0,
    category: 'natural',
    description: '미끄러운 얼음 블록',
    dropItems: ['water'],
    toolRequired: 'pickaxe'
  }
};

interface BlockProps {
  blockData: BlockData;
  position: [number, number, number];
  isHovered?: boolean;
  isSelected?: boolean;
  isEditable?: boolean;
  onEdit?: (blockData: BlockData) => void;
  onPlace?: (position: [number, number, number]) => void;
  onRemove?: () => void;
  onTextureChange?: (texture: string) => void;
  onDecorationAdd?: (decoration: BlockDecoration) => void;
  className?: string;
}

// 3D 블록 메시 컴포넌트
const BlockMesh = ({ 
  blockData, 
  position, 
  isHovered, 
  isSelected,
  lightLevel = 0
}: {
  blockData: BlockData;
  position: [number, number, number];
  isHovered?: boolean;
  isSelected?: boolean;
  lightLevel?: number;
}) => {
  const meshRef = useRef<any>();
  const blockType = BLOCK_TYPES[blockData.type];
  
  // 블록 애니메이션
  useFrame((state, delta) => {
    if (meshRef.current) {
      // 액체 블록 움직임
      if (blockType.isLiquid) {
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      }
      
      // 발광 효과
      if (blockType.lightLevel > 0) {
        const glowIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        meshRef.current.material.emissiveIntensity = glowIntensity;
      }
      
      // 호버 효과
      if (isHovered) {
        meshRef.current.scale.setScalar(1.02 + Math.sin(state.clock.elapsedTime * 5) * 0.01);
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }
  });

  return (
    <group position={position}>
      <Box
        ref={meshRef}
        args={[1, blockData.height || 1, 1]}
        position={[0, (blockData.height || 1) / 2, 0]}
      >
        <meshStandardMaterial
          color={blockData.customColor || blockType.color}
          transparent={blockType.isLiquid}
          opacity={blockType.isLiquid ? 0.8 : 1}
          emissive={blockType.lightLevel > 0 ? blockType.color : '#000000'}
          emissiveIntensity={blockType.lightLevel > 0 ? 0.5 : 0}
        />
      </Box>
      
      {/* 선택/호버 표시 */}
      {(isHovered || isSelected) && (
        <Box
          args={[1.02, (blockData.height || 1) + 0.02, 1.02]}
          position={[0, (blockData.height || 1) / 2, 0]}
        >
          <meshBasicMaterial
            color={isSelected ? '#00ff00' : '#ffff00'}
            transparent
            opacity={0.3}
            wireframe
          />
        </Box>
      )}
      
      {/* 장식품 렌더링 */}
      {blockData.decorations?.map((decoration, index) => (
        <group key={index} position={[0, blockData.height || 1, 0]}>
          {decoration.type === 'grass' && (
            <mesh>
              <planeGeometry args={[0.5, 0.5]} />
              <meshStandardMaterial 
                color={decoration.color || '#2d8634'} 
                transparent 
                opacity={0.8}
              />
            </mesh>
          )}
          {decoration.type === 'flower' && (
            <mesh>
              <sphereGeometry args={[0.1, 6, 6]} />
              <meshStandardMaterial 
                color={decoration.color || '#ff69b4'} 
              />
            </mesh>
          )}
          {decoration.type === 'light' && (
            <mesh>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial 
                color={decoration.color || '#ffff88'}
                emissive={decoration.color || '#ffff88'}
                emissiveIntensity={decoration.glowIntensity || 1}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

const Block: React.FC<BlockProps> = ({
  blockData,
  position,
  isHovered = false,
  isSelected = false,
  isEditable = false,
  onEdit,
  onPlace,
  onRemove,
  onTextureChange,
  onDecorationAdd,
  className = ""
}) => {
  const isMobile = useMobile();
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editedBlock, setEditedBlock] = useState<BlockData>(blockData);
  const [selectedDecoration, setSelectedDecoration] = useState<BlockDecoration | null>(null);
  const blockType = BLOCK_TYPES[blockData.type];

  // 블록 타입 변경 핸들러
  const handleTypeChange = (newType: string) => {
    setEditedBlock({
      ...editedBlock,
      type: newType,
      customColor: undefined // 타입 변경 시 커스텀 색상 초기화
    });
  };

  // 높이 변경 핸들러
  const handleHeightChange = (newHeight: number) => {
    setEditedBlock({
      ...editedBlock,
      height: Math.max(0.1, Math.min(10, newHeight)) // 0.1~10 범위로 제한
    });
  };

  // 색상 변경 핸들러
  const handleColorChange = (newColor: string) => {
    setEditedBlock({
      ...editedBlock,
      customColor: newColor
    });
  };

  // 장식품 추가 핸들러
  const handleAddDecoration = (decoration: BlockDecoration) => {
    const newDecorations = [...(editedBlock.decorations || []), decoration];
    setEditedBlock({
      ...editedBlock,
      decorations: newDecorations
    });
    if (onDecorationAdd) onDecorationAdd(decoration);
  };

  // 저장 핸들러
  const handleSave = () => {
    if (onEdit) onEdit(editedBlock);
    setShowEditPanel(false);
  };

  // 장식품 템플릿
  const decorationTemplates: BlockDecoration[] = [
    { id: 'grass1', name: '잔디', type: 'grass', color: '#2d8634' },
    { id: 'flower1', name: '빨간 꽃', type: 'flower', color: '#ff0000' },
    { id: 'flower2', name: '파란 꽃', type: 'flower', color: '#0000ff' },
    { id: 'flower3', name: '노란 꽃', type: 'flower', color: '#ffff00' },
    { id: 'mushroom1', name: '버섯', type: 'mushroom', color: '#8b4513' },
    { id: 'light1', name: '램프', type: 'light', color: '#ffff88', glowIntensity: 1 },
    { id: 'crystal1', name: '크리스탈', type: 'crystal', color: '#00ffff', glowIntensity: 0.5 }
  ];

  return (
    <div className={`relative ${className}`}>
      {/* 3D 블록 렌더링 */}
      <Canvas>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <BlockMesh
          blockData={editedBlock}
          position={position}
          isHovered={isHovered}
          isSelected={isSelected}
        />
      </Canvas>

      {/* 편집 패널 */}
      <AnimatePresence>
        {showEditPanel && isEditable && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg p-4 z-50"
          >
            <h3 className="font-bold text-lg mb-3">블록 편집</h3>
            
            {/* 블록 타입 선택 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">블록 타입</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(BLOCK_TYPES).map(([key, type]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTypeChange(key)}
                    className={`p-2 rounded border ${
                      editedBlock.type === key 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: type.color + '40' }}
                  >
                    <div className="text-center">
                      {type.icon}
                      <span className="text-xs mt-1 block">{type.name}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 높이 조정 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">높이</label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={editedBlock.height || 1}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm text-gray-500">{editedBlock.height || 1}m</span>
            </div>

            {/* 색상 변경 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">커스텀 색상</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={editedBlock.customColor || blockType.color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-20 h-8 rounded"
                />
                <button
                  onClick={() => handleColorChange(blockType.color)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  기본값으로
                </button>
              </div>
            </div>

            {/* 장식품 추가 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">장식품 추가</label>
              <div className="grid grid-cols-4 gap-2">
                {decorationTemplates.map((decoration) => (
                  <motion.button
                    key={decoration.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddDecoration(decoration)}
                    className="p-2 rounded border border-gray-300 hover:border-blue-500"
                  >
                    <span className="text-xs">{decoration.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex justify-end space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowEditPanel(false)}
                className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
              >
                취소
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                저장
              </motion.button>
              
              {onRemove && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onRemove}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  삭제
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 블록 정보 표시 */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/75 text-white px-3 py-1 rounded text-sm"
        >
          {blockType.name}
          {blockType.lightLevel > 0 && (
            <span className="ml-2">✨ 발광 {blockType.lightLevel}</span>
          )}
        </motion.div>
      )}

      {/* 편집 버튼 */}
      {isEditable && isSelected && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowEditPanel(!showEditPanel)}
          className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-600"
        >
          <FaWand />
        </motion.button>
      )}
    </div>
  );
};

export default Block;
