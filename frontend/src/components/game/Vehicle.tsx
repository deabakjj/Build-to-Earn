/**
 * Vehicle Component
 * 
 * 유저가 제작한 탈것(자동차, 배, 비행기 등)을 표시하고 관리하는 컴포넌트
 * 
 * Features:
 * - 탈것 3D 모델 렌더링
 * - 탈것 성능 정보 표시 (속도, 내구성, 용량 등)
 * - 탈것 업그레이드 및 수리 기능
 * - 연료 시스템 관리
 * - 부품 장착/분리 시스템
 * - NFT 변환 기능
 */

import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera, Environment } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCar, FaShip, FaPlane, FaWrench, FaGasPump, FaTachometerAlt, FaShield, FaCube, FaPalette, FaTools, FaImage } from 'react-icons/fa';
import { VehicleNFT } from '@/types/NFT';
import { useMobile } from '@/hooks/useMobile';

interface VehicleProps {
  vehicle: VehicleNFT;
  isEditable?: boolean;
  onUpdate?: (vehicle: VehicleNFT) => void;
  onNFTMint?: (vehicle: VehicleNFT) => void;
  className?: string;
}

const Vehicle: React.FC<VehicleProps> = ({
  vehicle,
  isEditable = false,
  onUpdate,
  onNFTMint,
  className = ""
}) => {
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<'overview' | 'parts' | 'upgrade' | 'nft'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedVehicle, setEditedVehicle] = useState<VehicleNFT>(vehicle);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [fuelLevel, setFuelLevel] = useState(vehicle.properties.fuel || 100);
  const [durability, setDurability] = useState(vehicle.properties.durability || 100);

  // 탈것 타입별 아이콘
  const getVehicleIcon = (type: VehicleNFT['properties']['vehicleType']) => {
    switch (type) {
      case 'car': return <FaCar />;
      case 'boat': return <FaShip />;
      case 'plane': return <FaPlane />;
      default: return <FaCar />;
    }
  };

  // 성능 수치 색상
  const getPerformanceColor = (value: number) => {
    if (value >= 80) return 'text-green-500';
    if (value >= 60) return 'text-yellow-500';
    if (value >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  // 탭 메뉴
  const tabs = [
    { id: 'overview', label: '개요', icon: <FaTachometerAlt /> },
    { id: 'parts', label: '부품', icon: <FaWrench /> },
    { id: 'upgrade', label: '업그레이드', icon: <FaTools /> },
    { id: 'nft', label: 'NFT화', icon: <FaImage /> }
  ];

  // 업그레이드 옵션
  const upgradeOptions = [
    { id: 'engine', name: '엔진', description: '최대 속도 증가', cost: 100, effect: '+10 속도' },
    { id: 'armor', name: '방어구', description: '내구성 증가', cost: 80, effect: '+15 내구성' },
    { id: 'tank', name: '연료통', description: '연료 용량 증가', cost: 60, effect: '+20 연료' },
    { id: 'cargo', name: '화물칸', description: '적재 용량 증가', cost: 90, effect: '+25 용량' }
  ];

  // 3D 모델 컴포넌트
  const VehicleModel = () => {
    const vehicleRef = useRef<any>();
    
    useFrame((state, delta) => {
      if (vehicleRef.current) {
        vehicleRef.current.rotation.y += delta * 0.5;
      }
    });

    return (
      <group ref={vehicleRef}>
        {/* 임시 박스 형태 (실제로는 GLTF 모델로 교체) */}
        <mesh>
          <boxGeometry args={[2, 1, 4]} />
          <meshStandardMaterial color={vehicle.properties.color || '#3b82f6'} />
        </mesh>
        
        {/* 바퀴 (자동차의 경우) */}
        {vehicle.properties.vehicleType === 'car' && (
          <>
            <mesh position={[1, -0.3, 1.5]}>
              <cylinderGeometry args={[0.3, 0.3, 0.2]} />
              <meshStandardMaterial color="#333" />
            </mesh>
            <mesh position={[-1, -0.3, 1.5]}>
              <cylinderGeometry args={[0.3, 0.3, 0.2]} />
              <meshStandardMaterial color="#333" />
            </mesh>
            <mesh position={[1, -0.3, -1.5]}>
              <cylinderGeometry args={[0.3, 0.3, 0.2]} />
              <meshStandardMaterial color="#333" />
            </mesh>
            <mesh position={[-1, -0.3, -1.5]}>
              <cylinderGeometry args={[0.3, 0.3, 0.2]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          </>
        )}
      </group>
    );
  };

  // 성능 게이지 컴포넌트
  const PerformanceGauge = ({ label, value, maxValue = 100, icon }: { label: string, value: number, maxValue?: number, icon: React.ReactNode }) => (
    <div className="flex items-center space-x-3">
      <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">{label}</span>
          <span className={`font-medium ${getPerformanceColor(value)}`}>
            {value}/{maxValue}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getPerformanceColor(value).replace('text-', 'bg-')}`}
            style={{ width: `${(value / maxValue) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );

  // 부품 슬롯 컴포넌트
  const PartSlot = ({ part, isSelected, onSelect }: { part: any, isSelected: boolean, onSelect: () => void }) => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
          <FaCube className="text-gray-600" />
        </div>
        <div>
          <h4 className="font-medium">{part.name}</h4>
          <p className="text-sm text-gray-500">{part.description}</p>
        </div>
      </div>
      {part.stats && (
        <div className="mt-3 flex space-x-4 text-sm">
          {Object.entries(part.stats).map(([key, value]) => (
            <span key={key} className="text-green-600">
              +{value} {key}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );

  // 업그레이드 옵션 컴포넌트
  const UpgradeOption = ({ option }: { option: typeof upgradeOptions[0] }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{option.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
          <p className="text-green-600 text-sm mt-2">{option.effect}</p>
        </div>
        <div className="text-right">
          <div className="text-blue-600 font-medium">{option.cost} VXC</div>
          <button className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors">
            업그레이드
          </button>
        </div>
      </div>
    </motion.div>
  );

  // NFT 발행 핸들러
  const handleMintNFT = () => {
    if (onNFTMint) {
      onNFTMint(editedVehicle);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              {getVehicleIcon(vehicle.properties.vehicleType)}
            </div>
            <div>
              <h3 className="font-bold">{vehicle.name}</h3>
              <p className="text-sm text-gray-500">{vehicle.properties.vehicleType.toUpperCase()}</p>
            </div>
          </div>
          {isEditable && (
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                {isEditing ? '저장' : '편집'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMintNFT}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                NFT 발행
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* 3D 뷰어 */}
      <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 2, 6]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <VehicleModel />
          <OrbitControls enableZoom={true} />
          <Environment preset="sunset" />
        </Canvas>
        
        {/* 연료 및 내구성 표시 */}
        <div className="absolute top-4 right-4 space-y-2">
          <div className="flex items-center space-x-2 bg-white/80 px-3 py-1 rounded-full">
            <FaGasPump className="text-yellow-500" />
            <span className="text-sm font-medium">{fuelLevel}%</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/80 px-3 py-1 rounded-full">
            <FaShield className="text-green-500" />
            <span className="text-sm font-medium">{durability}%</span>
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
              <h4 className="font-medium text-gray-900">성능</h4>
              <div className="grid gap-4">
                <PerformanceGauge
                  label="속도"
                  value={vehicle.properties.speed || 75}
                  icon={<FaTachometerAlt />}
                />
                <PerformanceGauge
                  label="가속"
                  value={vehicle.properties.acceleration || 65}
                  icon={<FaWrench />}
                />
                <PerformanceGauge
                  label="조작성"
                  value={vehicle.properties.handling || 80}
                  icon={<FaCar />}
                />
                <PerformanceGauge
                  label="내구성"
                  value={durability}
                  icon={<FaShield />}
                />
              </div>
              
              <h4 className="font-medium text-gray-900 mt-6">상세 정보</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">제작자</span>
                  <p className="font-medium">{vehicle.creator || 'Anonymous'}</p>
                </div>
                <div>
                  <span className="text-gray-500">최대 용량</span>
                  <p className="font-medium">{vehicle.properties.capacity || 4}명</p>
                </div>
                <div>
                  <span className="text-gray-500">연료 타입</span>
                  <p className="font-medium">{vehicle.properties.fuelType || 'VXC'}</p>
                </div>
                <div>
                  <span className="text-gray-500">레어도</span>
                  <p className="font-medium capitalize">{vehicle.rarity || 'common'}</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'parts' && (
            <motion.div
              key="parts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="font-medium text-gray-900">장착된 부품</h4>
              <div className="grid gap-3">
                {vehicle.parts?.map((part) => (
                  <PartSlot
                    key={part.id}
                    part={part}
                    isSelected={selectedPart === part.id}
                    onSelect={() => setSelectedPart(part.id)}
                  />
                ))}
              </div>
              
              {vehicle.parts?.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  장착된 부품이 없습니다.
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'upgrade' && (
            <motion.div
              key="upgrade"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="font-medium text-gray-900">업그레이드 옵션</h4>
              <div className="grid gap-3">
                {upgradeOptions.map((option) => (
                  <UpgradeOption key={option.id} option={option} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'nft' && (
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
                    value={editedVehicle.name}
                    onChange={(e) => setEditedVehicle({...editedVehicle, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">설명</label>
                  <textarea
                    value={editedVehicle.description}
                    onChange={(e) => setEditedVehicle({...editedVehicle, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">색상</label>
                  <input
                    type="color"
                    value={editedVehicle.properties.color || '#3b82f6'}
                    onChange={(e) => setEditedVehicle({
                      ...editedVehicle,
                      properties: {...editedVehicle.properties, color: e.target.value}
                    })}
                    className="w-full h-10 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h5 className="font-medium text-yellow-800">NFT 발행 비용</h5>
                <p className="text-sm text-yellow-700 mt-1">50 VXC (가스비 별도)</p>
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
    </div>
  );
};

export default Vehicle;
