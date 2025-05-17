/**
 * Item Component
 * 
 * 게임 내 아이템을 표시하고 관리하는 컴포넌트
 * 
 * Features:
 * - 3D 아이템 모델 렌더링
 * - 아이템 타입별 특성 표시 (도구, 무기, 장식품, 재료)
 * - 아이템 내구도 및 레벨 관리
 * - 인챈트멘트(강화) 시스템
 * - 아이템 조합 및 업그레이드
 * - NFT 변환 기능
 */

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  useGLTF, 
  PerspectiveCamera, 
  Environment,
  Box,
  Text,
  SpotLight
} from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaTools, 
  FaSword, 
  FaGem, 
  FaCube, 
  FaStar, 
  FaShield,
  FaBolt,
  FaFire,
  FaSnowflake,
  FaWind,
  FaLeaf,
  FaWater,
  FaArrowUp,
  FaCog,
  FaPalette,
  FaImage,
  FaInfoCircle,
  FaWrench,
  FaMagic
} from 'react-icons/fa';
import { ItemNFT } from '@/types/NFT';
import { useMobile } from '@/hooks/useMobile';

interface ItemProps {
  item: ItemNFT;
  quantity?: number;
  isInventory?: boolean;
  isEditable?: boolean;
  onUse?: (item: ItemNFT) => void;
  onCraft?: (recipe: CraftingRecipe) => void;
  onEnchant?: (item: ItemNFT, enchantment: Enchantment) => void;
  onUpdate?: (item: ItemNFT) => void;
  onNFTMint?: (item: ItemNFT) => void;
  className?: string;
}

// 아이템 타입별 속성
const ITEM_TYPES = {
  tool: {
    name: '도구',
    icon: <FaTools />,
    color: '#8b7355',
    description: '건설 및 제작용 도구',
    baseStats: { power: 5, efficiency: 10, durability: 100 }
  },
  weapon: {
    name: '무기',
    icon: <FaSword />,
    color: '#c41e3a',
    description: '전투용 무기',
    baseStats: { attack: 20, accuracy: 80, durability: 150 }
  },
  decoration: {
    name: '장식품',
    icon: <FaGem />,
    color: '#9932cc',
    description: '건물 장식용 아이템',
    baseStats: { beauty: 15, value: 30, durability: 50 }
  },
  material: {
    name: '재료',
    icon: <FaCube />,
    color: '#666666',
    description: '제작용 기본 재료',
    baseStats: { quantity: 64, weight: 1, density: 5 }
  }
};

// 인챈트멘트 타입
const ENCHANTMENT_TYPES = {
  // 도구용
  efficiency: {
    name: '효율성',
    icon: <FaBolt />,
    color: '#ffd700',
    description: '작업 속도 증가',
    levels: 5,
    effect: (level: number) => `속도 +${level * 20}%`
  },
  unbreaking: {
    name: '내구성',
    icon: <FaShield />,
    color: '#1e90ff',
    description: '내구도 손실 감소',
    levels: 3,
    effect: (level: number) => `내구도 손실 -${level * 25}%`
  },
  fortune: {
    name: '행운',
    icon: <FaStar />,
    color: '#32cd32',
    description: '더 많은 자원 획득',
    levels: 3,
    effect: (level: number) => `자원 +${level * 33}%`
  },
  // 무기용
  sharpness: {
    name: '날카로움',
    icon: <FaSword />,
    color: '#ff4500',
    description: '공격력 증가',
    levels: 5,
    effect: (level: number) => `공격력 +${level * 15}%`
  },
  fire: {
    name: '발화',
    icon: <FaFire />,
    color: '#ff8c00',
    description: '화염 피해 추가',
    levels: 2,
    effect: (level: number) => `화염 피해 +${level * 10}`
  },
  frost: {
    name: '빙결',
    icon: <FaSnowflake />,
    color: '#00bfff',
    description: '이동속도 감소 효과',
    levels: 2,
    effect: (level: number) => `슬로우 ${level * 10}초`
  },
  // 장식품용
  beauty: {
    name: '아름다움',
    icon: <FaGem />,
    color: '#ff69b4',
    description: '장식 효과 증가',
    levels: 3,
    effect: (level: number) => `장식 효과 +${level * 40}%`
  },
  aura: {
    name: '오라',
    icon: <FaMagic />,
    color: '#9370db',
    description: '주변 환경 개선',
    levels: 2,
    effect: (level: number) => `범위 효과 +${level * 50}%`
  }
};

// 조합 레시피 타입
interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  materials: { itemType: string; quantity: number }[];
  result: { itemType: string; quantity: number };
  tool?: string;
  workstation?: string;
  experience: number;
  unlockLevel: number;
}

// 인챈트멘트 타입
interface Enchantment {
  type: string;
  level: number;
  description: string;
}

const Item: React.FC<ItemProps> = ({
  item,
  quantity = 1,
  isInventory = false,
  isEditable = false,
  onUse,
  onCraft,
  onEnchant,
  onUpdate,
  onNFTMint,
  className = ""
}) => {
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<'overview' | 'enchant' | 'craft' | 'nft'>('overview');
  const [selectedEnchant, setSelectedEnchant] = useState<string | null>(null);
  const [showEnchantModal, setShowEnchantModal] = useState(false);
  const [editedItem, setEditedItem] = useState<ItemNFT>(item);
  const [durability, setDurability] = useState(item.properties.durability);

  const itemType = ITEM_TYPES[item.properties.itemType];

  // 탭 메뉴
  const tabs = [
    { id: 'overview', label: '정보', icon: <FaInfoCircle /> },
    { id: 'enchant', label: '인챈트', icon: <FaMagic /> },
    { id: 'craft', label: '제작', icon: <FaWrench /> },
    { id: 'nft', label: 'NFT화', icon: <FaImage /> }
  ];

  // 3D 아이템 모델 컴포넌트
  const ItemModel = () => {
    const meshRef = useRef<any>();
    const glowRef = useRef<any>();
    
    useFrame((state, delta) => {
      if (meshRef.current) {
        // 회전 애니메이션
        meshRef.current.rotation.y += delta * 0.5;
        
        // 떠오르는 애니메이션
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
      
      // 인챈트 발광 효과
      if (glowRef.current && item.properties.enchantments?.length > 0) {
        glowRef.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      }
    });

    return (
      <group>
        {/* 아이템 베이스 모델 */}
        <Box
          ref={meshRef}
          args={[0.5, 1, 0.2]}
          position={[0, 0, 0]}
        >
          <meshStandardMaterial 
            color={itemType.color}
            metalness={item.properties.itemType === 'tool' || item.properties.itemType === 'weapon' ? 0.7 : 0.2}
            roughness={0.3}
          />
        </Box>
        
        {/* 인챈트 효과 */}
        {item.properties.enchantments?.map((enchant, index) => {
          const enchantType = ENCHANTMENT_TYPES[enchant];
          return (
            <group key={index}>
              <SpotLight
                ref={glowRef}
                position={[0, 2, 0]}
                color={enchantType.color}
                intensity={0.5}
                angle={Math.PI / 4}
                penumbra={1}
                distance={10}
                castShadow={false}
              />
              
              {/* 파티클 효과 */}
              <mesh
                position={[
                  Math.sin(index * Math.PI * 2 / (item.properties.enchantments?.length || 1)) * 0.8,
                  Math.cos(state.clock.elapsedTime * 2 + index) * 0.5,
                  Math.cos(index * Math.PI * 2 / (item.properties.enchantments?.length || 1)) * 0.8
                ]}
              >
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial 
                  color={enchantType.color}
                  emissive={enchantType.color}
                  emissiveIntensity={0.8}
                  transparent
                  opacity={0.6}
                />
              </mesh>
            </group>
          );
        })}
        
        {/* 레어도 표시 */}
        {item.rarity !== 'common' && (
          <Text
            position={[0, 1.5, 0]}
            fontSize={0.2}
            color={
              item.rarity === 'legendary' ? '#ff8c00' :
              item.rarity === 'epic' ? '#9932cc' :
              item.rarity === 'rare' ? '#0080ff' :
              '#40ff00'
            }
            anchorX="center"
          >
            {item.rarity.toUpperCase()}
          </Text>
        )}
      </group>
    );
  };

  // 내구도 바 컴포넌트
  const DurabilityBar = () => {
    const percentage = (durability / item.properties.maxDurability) * 100;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            percentage > 60 ? 'bg-green-500' :
            percentage > 30 ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  // 인챈트 슬롯 컴포넌트
  const EnchantSlot = ({ 
    enchantType, 
    level,
    isActive = false 
  }: { 
    enchantType: string; 
    level: number;
    isActive?: boolean;
  }) => {
    const enchant = ENCHANTMENT_TYPES[enchantType];
    
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setSelectedEnchant(enchantType)}
        className={`p-3 rounded-lg border cursor-pointer transition-all ${
          isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: enchant.color + '20', color: enchant.color }}
            >
              {enchant.icon}
            </div>
            <div>
              <h4 className="font-medium">{enchant.name}</h4>
              <p className="text-sm text-gray-500">{enchant.effect(level)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: enchant.levels }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < level ? 'bg-yellow-400' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  // 제작 레시피 컴포넌트
  const CraftingRecipeItem = ({ recipe }: { recipe: CraftingRecipe }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 border border-gray-300 rounded-lg hover:border-blue-300 transition-all"
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{recipe.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
          
          <div className="mt-3">
            <h5 className="text-sm font-medium text-gray-700">필요 재료:</h5>
            <div className="flex flex-wrap gap-2 mt-1">
              {recipe.materials.map((material, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {material.itemType} x{material.quantity}
                </span>
              ))}
            </div>
          </div>
          
          {recipe.tool && (
            <p className="text-sm text-gray-500 mt-2">
              필요 도구: {recipe.tool}
            </p>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-green-600 font-medium">
            +{recipe.experience} XP
          </div>
          
          <button className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
            제작하기
          </button>
        </div>
      </div>
    </motion.div>
  );

  // NFT 발행 핸들러
  const handleMintNFT = () => {
    if (onNFTMint) {
      onNFTMint(editedItem);
    }
  };

  // 사용 핸들러
  const handleUse = () => {
    if (onUse) {
      onUse(item);
    }
  };

  // 인챈트 핸들러
  const handleEnchant = (enchantType: string, level: number) => {
    if (onEnchant) {
      onEnchant(item, { type: enchantType, level, description: ENCHANTMENT_TYPES[enchantType].effect(level) });
    }
    setShowEnchantModal(false);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              {itemType.icon}
            </div>
            <div>
              <h3 className="font-bold flex items-center space-x-2">
                <span>{item.name}</span>
                {isInventory && quantity > 1 && (
                  <span className="text-sm text-gray-500">x{quantity}</span>
                )}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{itemType.name}</span>
                <span className="capitalize text-yellow-600">{item.rarity}</span>
                <span>Lv.{item.properties.level}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isInventory && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUse}
                className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
              >
                사용
              </motion.button>
            )}
            
            {isEditable && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMintNFT}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                NFT화
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* 3D 뷰어 */}
      <div className="relative h-56 bg-gradient-to-br from-gray-900 to-gray-700">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 1, 3]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <ItemModel />
          <OrbitControls enableZoom={true} autoRotate autoRotateSpeed={2} />
          <Environment preset="warehouse" />
        </Canvas>
        
        {/* 내구도 표시 */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex justify-between text-xs text-white mb-1">
            <span>내구도</span>
            <span>{durability}/{item.properties.maxDurability}</span>
          </div>
          <DurabilityBar />
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 px-4 py-3 flex items-center justify-center space-x-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span className={isMobile ? 'hidden' : 'inline'}>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="font-medium text-gray-900">아이템 정보</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">타입</span>
                  <p className="font-medium">{itemType.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">레벨</span>
                  <p className="font-medium">{item.properties.level}</p>
                </div>
                <div>
                  <span className="text-gray-500">내구도</span>
                  <p className="font-medium">{durability}/{item.properties.maxDurability}</p>
                </div>
                <div>
                  <span className="text-gray-500">희귀도</span>
                  <p className="font-medium capitalize">{item.rarity}</p>
                </div>
              </div>
              
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">설명</h5>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              
              {item.properties.enchantments?.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">인챈트</h5>
                  <div className="flex flex-wrap gap-2">
                    {item.properties.enchantments.map((enchant, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                      >
                        {ENCHANTMENT_TYPES[enchant]?.name || enchant}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {item.properties.materials?.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">재료</h5>
                  <div className="flex flex-wrap gap-2">
                    {item.properties.materials.map((material, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'enchant' && isEditable && (
            <motion.div
              key="enchant"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="font-medium text-gray-900">인챈트 관리</h4>
              
              <div className="grid gap-3">
                {Object.entries(ENCHANTMENT_TYPES).map(([key, enchant]) => {
                  const isApplicable = 
                    (item.properties.itemType === 'tool' && ['efficiency', 'unbreaking', 'fortune'].includes(key)) ||
                    (item.properties.itemType === 'weapon' && ['sharpness', 'fire', 'frost', 'unbreaking'].includes(key)) ||
                    (item.properties.itemType === 'decoration' && ['beauty', 'aura'].includes(key));
                  
                  if (!isApplicable) return null;
                  
                  const currentLevel = item.properties.enchantments?.includes(key) ? 1 : 0;
                  
                  return (
                    <EnchantSlot
                      key={key}
                      enchantType={key}
                      level={currentLevel}
                      isActive={selectedEnchant === key}
                    />
                  );
                })}
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h5 className="font-medium text-yellow-800">인챈트 비용</h5>
                <p className="text-sm text-yellow-700 mt-1">
                  경험치: 레벨당 50 XP<br />
                  요금: 레벨당 10 VXC
                </p>
              </div>
              
              {selectedEnchant && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowEnchantModal(true)}
                  className="w-full py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  인챈트 추가
                </motion.button>
              )}
            </motion.div>
          )}

          {activeTab === 'craft' && (
            <motion.div
              key="craft"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="font-medium text-gray-900">제작 가능한 아이템</h4>
              
              <div className="grid gap-3">
                {/* 예시 레시피들 */}
                <CraftingRecipeItem recipe={{
                  id: 'basic_pickaxe',
                  name: '기본 곡괭이',
                  description: '나무와 돌로 만드는 기본 채굴 도구',
                  materials: [
                    { itemType: 'wood', quantity: 3 },
                    { itemType: 'stone', quantity: 2 }
                  ],
                  result: { itemType: 'tool', quantity: 1 },
                  tool: 'workbench',
                  experience: 10,
                  unlockLevel: 1
                }} />
                
                <CraftingRecipeItem recipe={{
                  id: 'steel_sword',
                  name: '강철 검',
                  description: '단단한 강철로 제작한 검',
                  materials: [
                    { itemType: 'steel', quantity: 5 },
                    { itemType: 'wood', quantity: 2 }
                  ],
                  result: { itemType: 'weapon', quantity: 1 },
                  tool: 'forge',
                  experience: 25,
                  unlockLevel: 5
                }} />
              </div>
            </motion.div>
          )}

          {activeTab === 'nft' && isEditable && (
            <motion.div
              key="nft"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="font-medium text-gray-900">NFT 메타데이터</h4>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">이름</label>
                  <input
                    type="text"
                    value={editedItem.name}
                    onChange={(e) => setEditedItem({...editedItem, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">설명</label>
                  <textarea
                    value={editedItem.description}
                    onChange={(e) => setEditedItem({...editedItem, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">희귀도</label>
                  <select
                    value={editedItem.rarity}
                    onChange={(e) => setEditedItem({...editedItem, rarity: e.target.value as ItemNFT['rarity']})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h5 className="font-medium text-yellow-800">NFT 발행 비용</h5>
                <p className="text-sm text-yellow-700 mt-1">
                  기본: 20 VXC + 레벨당 5 VXC + 인챈트당 10 VXC<br />
                  총액: {20 + item.properties.level * 5 + (item.properties.enchantments?.length || 0) * 10} VXC
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleMintNFT}
                className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                NFT로 발행하기
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 인챈트 확인 모달 */}
      <AnimatePresence>
        {showEnchantModal && selectedEnchant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-md w-full p-6"
            >
              <h3 className="text-lg font-bold mb-4">인챈트 추가</h3>
              
              <div className="space-y-3">
                <p>{ENCHANTMENT_TYPES[selectedEnchant].name} 인챈트를 추가하시겠습니까?</p>
                
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">효과</span>
                      <span className="font-medium">{ENCHANTMENT_TYPES[selectedEnchant].effect(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">비용</span>
                      <span className="font-medium">50 XP + 10 VXC</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowEnchantModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  취소
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleEnchant(selectedEnchant, 1)}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  인챈트
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Item;
