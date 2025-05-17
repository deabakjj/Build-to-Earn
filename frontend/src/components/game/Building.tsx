/**
 * Building Component
 * 
 * 유저가 제작한 건물을 표시하고 관리하는 컴포넌트
 * 
 * Features:
 * - 3D 건물 모델 렌더링
 * - 건물 기능별 특성 표시 (주거, 상점, 공장, 엔터테인먼트 등)
 * - 건물 수용 인원 및 기능 관리
 * - 임대 시스템
 * - 건물 업그레이드
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
  Text
} from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaHome, 
  FaStore, 
  FaCogs, 
  FaGamepad, 
  FaShield, 
  FaUsers, 
  FaCoins,
  FaArrowUp,
  FaKey,
  FaInfoCircle,
  FaImage,
  FaEdit,
  FaTachometerAlt,
  FaLightbulb,
  FaTools,
  FaChartLine,
  FaVault
} from 'react-icons/fa';
import { BuildingNFT } from '@/types/NFT';
import { useMobile } from '@/hooks/useMobile';

interface BuildingProps {
  building: BuildingNFT;
  isOwner?: boolean;
  onUpdate?: (building: BuildingNFT) => void;
  onRent?: (building: BuildingNFT) => void;
  onUpgrade?: (buildingId: string, upgradeType: string) => void;
  onNFTMint?: (building: BuildingNFT) => void;
  className?: string;
}

// 건물 타입별 속성
const BUILDING_TYPES = {
  house: {
    name: '주거',
    icon: <FaHome />,
    color: '#8b7355',
    description: '거주용 건물',
    baseCapacity: 4,
    baseIncome: 10,
    upgrades: ['확장', '장식', '보안', '편의시설']
  },
  shop: {
    name: '상점',
    icon: <FaStore />,
    color: '#4a86e8',
    description: '아이템 판매/구매 건물',
    baseCapacity: 20,
    baseIncome: 50,
    upgrades: ['진열장', '보관함', '광고', '배송시설']
  },
  factory: {
    name: '공장',
    icon: <FaCogs />,
    color: '#666666',
    description: '아이템 제작 건물',
    baseCapacity: 10,
    baseIncome: 100,
    upgrades: ['자동화', '생산량', '효율성', '연구시설']
  },
  entertainment: {
    name: '엔터테인먼트',
    icon: <FaGamepad />,
    color: '#ff6b6b',
    description: '오락 및 휴식 공간',
    baseCapacity: 50,
    baseIncome: 75,
    upgrades: ['놀이기구', '무대', '음향시설', 'VIP구역']
  },
  defense: {
    name: '방어시설',
    icon: <FaShield />,
    color: '#2e7d32',
    description: '월드 보안 건물',
    baseCapacity: 5,
    baseIncome: 0,
    upgrades: ['장갑', '포탑', '감지기', '벙커']
  }
};

// 건물 업그레이드 옵션
const UPGRADE_OPTIONS = {
  확장: { cost: 100, effect: '수용 인원 +50%', icon: <FaUsers /> },
  장식: { cost: 50, effect: '수익 +20%', icon: <FaLightbulb /> },
  보안: { cost: 75, effect: '안전성 +30%', icon: <FaShield /> },
  편의시설: { cost: 80, effect: '만족도 +25%', icon: <FaTools /> },
  진열장: { cost: 60, effect: '판매량 +35%', icon: <FaStore /> },
  보관함: { cost: 90, effect: '재고 +100%', icon: <FaVault /> },
  광고: { cost: 120, effect: '방문자 +40%', icon: <FaChartLine /> },
  배송시설: { cost: 110, effect: '배송 효율 +50%', icon: <FaCogs /> },
  자동화: { cost: 200, effect: '생산량 +75%', icon: <FaCogs /> },
  생산량: { cost: 150, effect: '기본 생산 +60%', icon: <FaArrowUp /> },
  효율성: { cost: 180, effect: '자원 소모 -30%', icon: <FaTachometerAlt /> },
  연구시설: { cost: 250, effect: '신규 아이템 개발', icon: <FaLightbulb /> },
  놀이기구: { cost: 80, effect: '즐거움 +45%', icon: <FaGamepad /> },
  무대: { cost: 100, effect: '이벤트 수용력 +60%', icon: <FaGamepad /> },
  음향시설: { cost: 70, effect: '음질 개선 +40%', icon: <FaGamepad /> },
  'VIP구역': { cost: 150, effect: '프리미엄 수익 +80%', icon: <FaKey /> },
  장갑: { cost: 120, effect: '방어력 +50%', icon: <FaShield /> },
  포탑: { cost: 200, effect: '공격력 +70%', icon: <FaShield /> },
  감지기: { cost: 90, effect: '탐지 범위 +100%', icon: <FaShield /> },
  벙커: { cost: 300, effect: '보호소 기능', icon: <FaShield /> }
};

const Building: React.FC<BuildingProps> = ({
  building,
  isOwner = false,
  onUpdate,
  onRent,
  onUpgrade,
  onNFTMint,
  className = ""
}) => {
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<'overview' | 'management' | 'upgrades' | 'rental' | 'nft'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedBuilding, setEditedBuilding] = useState<BuildingNFT>(building);
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [occupancy, setOccupancy] = useState(0);
  const [income, setIncome] = useState(0);

  const buildingType = BUILDING_TYPES[building.properties.buildingType];

  // 건물 타입별 아이콘 반환
  const getBuildingIcon = (type: BuildingNFT['properties']['buildingType']) => {
    return buildingType.icon;
  };

  // 탭 메뉴
  const tabs = [
    { id: 'overview', label: '개요', icon: <FaInfoCircle /> },
    { id: 'management', label: '관리', icon: <FaCogs /> },
    { id: 'upgrades', label: '업그레이드', icon: <FaArrowUp /> },
    { id: 'rental', label: '임대', icon: <FaKey /> },
    { id: 'nft', label: 'NFT화', icon: <FaImage /> }
  ];

  // 3D 건물 모델 컴포넌트
  const BuildingModel = () => {
    const meshRef = useRef<any>();
    const glowRef = useRef<any>();
    
    useFrame((state, delta) => {
      if (meshRef.current) {
        // 부드러운 회전 효과
        meshRef.current.rotation.y += delta * 0.2;
      }
      
      // 건물이 운영 중일 때 발광 효과
      if (glowRef.current && building.properties.functionality.length > 0) {
        glowRef.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      }
    });

    return (
      <group>
        {/* 건물 본체 */}
        <Box
          ref={meshRef}
          args={[
            building.properties.size.width,
            building.properties.size.height,
            building.properties.size.depth
          ]}
          position={[0, building.properties.size.height / 2, 0]}
        >
          <meshStandardMaterial 
            color={buildingType.color}
            roughness={0.3}
            metalness={0.2}
          />
        </Box>
        
        {/* 지붕 */}
        <Box
          args={[
            building.properties.size.width + 0.2,
            0.3,
            building.properties.size.depth + 0.2
          ]}
          position={[0, building.properties.size.height + 0.15, 0]}
        >
          <meshStandardMaterial color="#8b0000" />
        </Box>
        
        {/* 문 */}
        <Box
          args={[0.8, 2, 0.1]}
          position={[0, 1, building.properties.size.depth / 2 + 0.05]}
        >
          <meshStandardMaterial color="#4a3c28" />
        </Box>
        
        {/* 창문들 */}
        {Array.from({ length: Math.floor(building.properties.size.width / 2) }).map((_, i) => (
          <Box
            key={i}
            args={[0.8, 1, 0.1]}
            position={[
              (i - Math.floor(building.properties.size.width / 4)) * 2,
              2,
              building.properties.size.depth / 2 + 0.05
            ]}
          >
            <meshStandardMaterial 
              color="#87ceeb" 
              transparent 
              opacity={0.7}
              emissive="#ffff88"
              emissiveIntensity={0.3}
            />
          </Box>
        ))}
        
        {/* 운영 중 표시등 */}
        {building.properties.functionality.length > 0 && (
          <mesh
            ref={glowRef}
            position={[building.properties.size.width / 2, building.properties.size.height, 0]}
          >
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial
              color="#00ff00"
              emissive="#00ff00"
              emissiveIntensity={0.8}
            />
          </mesh>
        )}
      </group>
    );
  };

  // 건물 통계 게이지
  const BuildingGauge = ({ 
    label, 
    value, 
    maxValue, 
    color = 'blue',
    icon 
  }: { 
    label: string; 
    value: number; 
    maxValue: number; 
    color?: string;
    icon: React.ReactNode;
  }) => (
    <div className="flex items-center space-x-3">
      <div className={`w-8 h-8 bg-${color}-100 rounded-full flex items-center justify-center text-${color}-600`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">{label}</span>
          <span className={`font-medium text-${color}-600`}>
            {value}/{maxValue}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full bg-${color}-500 transition-all duration-300`}
            style={{ width: `${(value / maxValue) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );

  // 업그레이드 아이템 컴포넌트
  const UpgradeItem = ({ 
    upgradeName, 
    isCompleted = false 
  }: { 
    upgradeName: string; 
    isCompleted?: boolean;
  }) => {
    const upgrade = UPGRADE_OPTIONS[upgradeName];
    
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => !isCompleted && setSelectedUpgrade(upgradeName)}
        className={`p-4 rounded-lg border cursor-pointer transition-all ${
          isCompleted 
            ? 'border-green-500 bg-green-50' 
            : 'border-gray-300 hover:border-blue-300'
        }`}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2">
              {upgrade.icon}
              <h4 className="font-medium">{upgradeName}</h4>
              {isCompleted && <span className="text-green-600">✓</span>}
            </div>
            <p className="text-sm text-gray-600 mt-1">{upgrade.effect}</p>
          </div>
          
          {!isCompleted && (
            <div className="text-right">
              <div className="text-blue-600 font-medium">{upgrade.cost} VXC</div>
              <button className="mt-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                업그레이드
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // NFT 발행 핸들러
  const handleMintNFT = () => {
    if (onNFTMint) {
      onNFTMint(editedBuilding);
    }
  };

  // 임대 핸들러
  const handleRent = () => {
    if (onRent) {
      onRent(building);
    }
  };

  // 업그레이드 핸들러
  const handleUpgrade = (upgradeType: string) => {
    if (onUpgrade) {
      onUpgrade(building.id, upgradeType);
    }
    setShowUpgradeModal(false);
    setSelectedUpgrade(null);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              {getBuildingIcon(building.properties.buildingType)}
            </div>
            <div>
              <h3 className="font-bold">{building.name}</h3>
              <p className="text-sm text-gray-500">{buildingType.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {building.properties.rentalPrice && !building.properties.isRented && (
              <div className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                임대 가능
              </div>
            )}
            
            {building.properties.isRented && (
              <div className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                임대 중
              </div>
            )}
            
            {isOwner && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FaEdit className="text-gray-600" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* 3D 뷰어 */}
      <div className="relative h-64 bg-gradient-to-br from-sky-100 to-sky-200">
        <Canvas>
          <PerspectiveCamera makeDefault position={[5, 5, 5]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />
          <BuildingModel />
          <OrbitControls enableZoom={true} />
          <Environment preset="sunset" />
        </Canvas>
        
        {/* 건물 상태 표시 */}
        <div className="absolute top-4 right-4 space-y-2">
          <div className="flex items-center space-x-2 bg-white/80 px-3 py-1 rounded-full">
            <FaUsers className={`text-${building.properties.capacity > occupancy ? 'green' : 'red'}-500`} />
            <span className="text-sm font-medium">{occupancy}/{building.properties.capacity}</span>
          </div>
          
          <div className="flex items-center space-x-2 bg-white/80 px-3 py-1 rounded-full">
            <FaCoins className="text-yellow-500" />
            <span className="text-sm font-medium">{income} VXC/일</span>
          </div>
          
          <div className="flex items-center space-x-2 bg-white/80 px-3 py-1 rounded-full">
            <span className="text-sm font-medium">Lv.{building.properties.level}</span>
          </div>
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
              <h4 className="font-medium text-gray-900">건물 상태</h4>
              
              <div className="grid gap-4">
                <BuildingGauge
                  label="수용률"
                  value={occupancy}
                  maxValue={building.properties.capacity}
                  color="blue"
                  icon={<FaUsers />}
                />
                
                <BuildingGauge
                  label="수익"
                  value={income}
                  maxValue={buildingType.baseIncome * building.properties.level}
                  color="green"
                  icon={<FaCoins />}
                />
                
                <BuildingGauge
                  label="레벨"
                  value={building.properties.level}
                  maxValue={10}
                  color="purple"
                  icon={<FaTachometerAlt />}
                />
              </div>
              
              <h4 className="font-medium text-gray-900 mt-6">기능</h4>
              <div className="flex flex-wrap gap-2">
                {building.properties.functionality.map((func, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {func}
                  </span>
                ))}
              </div>
              
              <h4 className="font-medium text-gray-900 mt-6">정보</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">크기</span>
                  <p className="font-medium">
                    {building.properties.size.width}x{building.properties.size.height}x{building.properties.size.depth}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">타입</span>
                  <p className="font-medium capitalize">{buildingType.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">제작자</span>
                  <p className="font-medium">{building.creator || 'Anonymous'}</p>
                </div>
                <div>
                  <span className="text-gray-500">희귀도</span>
                  <p className="font-medium capitalize">{building.rarity || 'common'}</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'management' && isOwner && (
            <motion.div
              key="management"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="font-medium text-gray-900">건물 관리</h4>
              
              <div className="grid gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium mb-2">운영 현황</h5>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{occupancy}</div>
                      <div className="text-sm text-gray-500">현재 이용객</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{income}</div>
                      <div className="text-sm text-gray-500">일일 수익</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{building.properties.level}</div>
                      <div className="text-sm text-gray-500">건물 레벨</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium mb-2">기능 설정</h5>
                  <div className="space-y-2">
                    {buildingType.upgrades.map((upgrade) => (
                      <label key={upgrade} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={building.properties.functionality.includes(upgrade)}
                          onChange={(e) => {
                            const functionality = e.target.checked
                              ? [...building.properties.functionality, upgrade]
                              : building.properties.functionality.filter(f => f !== upgrade);
                            
                            setEditedBuilding({
                              ...editedBuilding,
                              properties: { ...editedBuilding.properties, functionality }
                            });
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{upgrade}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'upgrades' && isOwner && (
            <motion.div
              key="upgrades"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="font-medium text-gray-900">업그레이드</h4>
              
              <div className="grid gap-3">
                {buildingType.upgrades.map((upgradeName) => (
                  <UpgradeItem 
                    key={upgradeName}
                    upgradeName={upgradeName}
                    isCompleted={building.properties.functionality.includes(upgradeName)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'rental' && (
            <motion.div
              key="rental"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="font-medium text-gray-900">임대 정보</h4>
              
              {building.properties.rentalPrice ? (
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">임대료</span>
                    <span className="font-medium">{building.properties.rentalPrice} VXC/일</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">상태</span>
                    <span className={`font-medium ${
                      building.properties.isRented ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {building.properties.isRented ? '임대 중' : '임대 가능'}
                    </span>
                  </div>
                  
                  {!building.properties.isRented && !isOwner && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleRent}
                      className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      임대하기
                    </motion.button>
                  )}
                  
                  {isOwner && (
                    <div className="pt-3 border-t border-gray-200">
                      <label className="block text-sm text-gray-600 mb-1">임대료 설정</label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={editedBuilding.properties.rentalPrice || 0}
                          onChange={(e) => setEditedBuilding({
                            ...editedBuilding,
                            properties: { ...editedBuilding.properties, rentalPrice: e.target.value }
                          })}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-md"
                          min="0"
                        />
                        <button className="px-4 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600">
                          저장
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  이 건물은 임대 불가능합니다.
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'nft' && isOwner && (
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
                    value={editedBuilding.name}
                    onChange={(e) => setEditedBuilding({...editedBuilding, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">설명</label>
                  <textarea
                    value={editedBuilding.description}
                    onChange={(e) => setEditedBuilding({...editedBuilding, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">카테고리</label>
                  <select
                    value={editedBuilding.properties.buildingType}
                    onChange={(e) => setEditedBuilding({
                      ...editedBuilding,
                      properties: {
                        ...editedBuilding.properties,
                        buildingType: e.target.value as BuildingNFT['properties']['buildingType']
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {Object.entries(BUILDING_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>{value.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h5 className="font-medium text-yellow-800">NFT 발행 비용</h5>
                <p className="text-sm text-yellow-700 mt-1">
                  기본: 100 VXC + 레벨당 10 VXC (총 {100 + building.properties.level * 10} VXC)
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

      {/* 업그레이드 확인 모달 */}
      <AnimatePresence>
        {showUpgradeModal && selectedUpgrade && (
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
              <h3 className="text-lg font-bold mb-4">업그레이드 확인</h3>
              
              <div className="space-y-3">
                <p>{selectedUpgrade} 업그레이드를 진행하시겠습니까?</p>
                
                <div className="bg-gray-50 p-3 rounded">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">비용</span>
                    <span className="font-medium">{UPGRADE_OPTIONS[selectedUpgrade].cost} VXC</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">효과</span>
                    <span className="font-medium text-green-600">{UPGRADE_OPTIONS[selectedUpgrade].effect}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  취소
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleUpgrade(selectedUpgrade)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  업그레이드
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Building;
