/**
 * World Component
 * 
 * 유저의 월드를 표시하고 관리하는 핵심 컴포넌트
 * 
 * Features:
 * - 3D 월드 렌더링 (10x10 기본, 확장 가능)
 * - 블록 배치/제거/편집
 * - 건물, 아이템, 탈것 배치
 * - 날씨 및 시즌 효과
 * - 방문자 관리
 * - 월드 설정 (공개/비공개, 입장료 등)
 */

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  PerspectiveCamera,
  Stars,
  Sky
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCube, 
  FaHome, 
  FaCar, 
  FaUsers, 
  FaCog, 
  FaSearch, 
  FaMapMarkerAlt,
  FaCloudSun,
  FaStar,
  FaSave,
  FaShareAlt,
  FaEdit,
  FaLock,
  FaEye,
  FaCoins,
  FaCrown
} from 'react-icons/fa';
import { LandNFT, BuildingNFT, VehicleNFT, ItemNFT } from '@/types/NFT';
import { useMobile } from '@/hooks/useMobile';

// 월드 타입 정의
interface WorldData {
  id: string;
  owner: string;
  name: string;
  size: { width: number; height: number };
  blocks: Block[][];
  buildings: PlacedBuilding[];
  vehicles: PlacedVehicle[];
  items: PlacedItem[];
  settings: WorldSettings;
  weather: WeatherState;
  season: SeasonState;
  visitors: VisitorInfo[];
}

interface Block {
  type: 'grass' | 'dirt' | 'stone' | 'water' | 'sand' | 'snow';
  height: number;
  color?: string;
  decoration?: string;
}

interface PlacedObject {
  id: string;
  position: { x: number, y: number, z: number };
  rotation: { x: number, y: number, z: number };
  scale: { x: number, y: number, z: number };
}

interface PlacedBuilding extends PlacedObject {
  building: BuildingNFT;
}

interface PlacedVehicle extends PlacedObject {
  vehicle: VehicleNFT;
}

interface PlacedItem extends PlacedObject {
  item: ItemNFT;
}

interface WorldSettings {
  isPublic: boolean;
  allowVisitors: boolean;
  entryFee: string;
  allowBuilding: boolean;
  allowedVisitors: string[];
  maxVisitors: number;
  worldName: string;
  worldDescription: string;
}

interface WeatherState {
  type: 'sunny' | 'rainy' | 'snowy' | 'foggy' | 'stormy';
  intensity: number;
  duration: number;
}

interface SeasonState {
  current: 'spring' | 'summer' | 'autumn' | 'winter';
  dayNightCycle: number; // 0-1 (0=night, 0.5=noon, 1=night)
}

interface VisitorInfo {
  userId: string;
  username: string;
  avatar?: string;
  joinedAt: Date;
  isOwner: boolean;
  permissions: string[];
}

interface WorldProps {
  world: WorldData;
  isOwner?: boolean;
  onUpdate?: (world: WorldData) => void;
  onSave?: () => void;
  className?: string;
}

// 하위 컴포넌트들
const GridPlane = () => {
  return (
    <Grid 
      args={[100, 100]}
      cellSize={1}
      cellThickness={0.5}
      cellColor="#6f6f6f"
      sectionSize={10}
      sectionThickness={1}
      sectionColor="#9d4b4b"
      fadeDistance={30}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid={true}
    />
  );
};

const BlockMesh = ({ block, position }: { block: Block, position: [number, number, number] }) => {
  const mesh = useRef<THREE.Mesh>(null);
  
  const getBlockColor = (type: string) => {
    switch (type) {
      case 'grass': return '#4a7c59';
      case 'dirt': return '#8b6f47';
      case 'stone': return '#6b6b6b';
      case 'water': return '#006994';
      case 'sand': return '#c2b280';
      case 'snow': return '#ffffff';
      default: return '#4a7c59';
    }
  };

  return (
    <mesh 
      ref={mesh} 
      position={[position[0], block.height / 2, position[2]]}
    >
      <boxGeometry args={[1, block.height, 1]} />
      <meshStandardMaterial color={block.color || getBlockColor(block.type)} />
    </mesh>
  );
};

const WeatherEffect = ({ weather }: { weather: WeatherState }) => {
  if (weather.type === 'sunny') return null;
  
  return (
    <>
      {weather.type === 'rainy' && (
        <mesh position={[0, 20, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial color="#7fb3d3" transparent opacity={0.2} />
        </mesh>
      )}
      
      {weather.type === 'snowy' && (
        <mesh position={[0, 20, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
        </mesh>
      )}
      
      {weather.type === 'foggy' && (
        <fog attach="fog" args={['#cccccc', 10, 50]} />
      )}
    </>
  );
};

const BuildingMesh = ({ placedBuilding }: { placedBuilding: PlacedBuilding }) => {
  const mesh = useRef<THREE.Mesh>(null);
  
  return (
    <group 
      position={[placedBuilding.position.x, placedBuilding.position.y, placedBuilding.position.z]}
      rotation={[placedBuilding.rotation.x, placedBuilding.rotation.y, placedBuilding.rotation.z]}
      scale={[placedBuilding.scale.x, placedBuilding.scale.y, placedBuilding.scale.z]}
    >
      <mesh ref={mesh}>
        <boxGeometry args={[
          placedBuilding.building.properties.size.width,
          placedBuilding.building.properties.size.height,
          placedBuilding.building.properties.size.depth
        ]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>
    </group>
  );
};

const World: React.FC<WorldProps> = ({
  world,
  isOwner = false,
  onUpdate,
  onSave,
  className = ""
}) => {
  const isMobile = useMobile();
  const [mode, setMode] = useState<'view' | 'edit' | 'place'>('view');
  const [selectedTool, setSelectedTool] = useState<'block' | 'building' | 'vehicle' | 'item'>('block');
  const [selectedBlock, setSelectedBlock] = useState<Block['type']>('grass');
  const [showSettings, setShowSettings] = useState(false);
  const [editedWorld, setEditedWorld] = useState<WorldData>(world);
  const [hoveredPosition, setHoveredPosition] = useState<[number, number, number] | null>(null);
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([10, 10, 10]);

  // 툴바 아이템들
  const tools = [
    { id: 'block', label: '블록', icon: <FaCube /> },
    { id: 'building', label: '건물', icon: <FaHome /> },
    { id: 'vehicle', label: '탈것', icon: <FaCar /> },
    { id: 'item', label: '아이템', icon: <FaStar /> }
  ];

  // 블록 타입들
  const blockTypes: Block['type'][] = ['grass', 'dirt', 'stone', 'water', 'sand', 'snow'];

  // 모드 핸들러
  const handleModeChange = (newMode: typeof mode) => {
    setMode(newMode);
    if (newMode === 'view') {
      setHoveredPosition(null);
    }
  };

  // 블록 배치 핸들러
  const handlePlaceBlock = (position: [number, number, number]) => {
    if (mode !== 'edit' && mode !== 'place') return;
    
    const [x, , z] = position;
    if (x < 0 || x >= world.size.width || z < 0 || z >= world.size.height) return;

    const newBlocks = [...editedWorld.blocks];
    newBlocks[x][z] = {
      type: selectedBlock,
      height: 1,
      color: undefined,
      decoration: undefined
    };

    setEditedWorld({
      ...editedWorld,
      blocks: newBlocks
    });
  };

  // 월드 저장 핸들러
  const handleSave = () => {
    if (onSave) onSave();
    if (onUpdate) onUpdate(editedWorld);
  };

  // 월드 공유 핸들러
  const handleShare = () => {
    const url = `${window.location.origin}/world/${world.id}`;
    navigator.clipboard.writeText(url);
    // TODO: 토스트 메시지 표시
  };

  return (
    <div className={`relative h-screen bg-gradient-to-b from-blue-400 to-green-200 overflow-hidden ${className}`}>
      {/* 3D 월드 렌더링 */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={cameraPosition} />
        
        {/* 조명 */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[50, 50, 50]} 
          intensity={0.8} 
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* 환경 */}
        <Sky sunPosition={[100, 100, 20]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
        <Environment preset="sunset" />
        <WeatherEffect weather={world.weather} />
        
        {/* 컨트롤 */}
        <OrbitControls 
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2}
          maxDistance={50}
          minDistance={5}
        />
        
        {/* 그리드 */}
        <GridPlane />
        
        {/* 블록들 */}
        <Suspense fallback={null}>
          {editedWorld.blocks.map((row, x) =>
            row.map((block, z) => (
              <BlockMesh 
                key={`${x}-${z}`} 
                block={block} 
                position={[x, 0, z]} 
              />
            ))
          )}
        </Suspense>
        
        {/* 건물들 */}
        <Suspense fallback={null}>
          {editedWorld.buildings.map((placedBuilding) => (
            <BuildingMesh key={placedBuilding.id} placedBuilding={placedBuilding} />
          ))}
        </Suspense>
        
        {/* 호버 표시 */}
        {hoveredPosition && mode !== 'view' && (
          <mesh position={hoveredPosition} renderOrder={999}>
            <boxGeometry args={[1, 0.1, 1]} />
            <meshBasicMaterial 
              color="#00ff00" 
              transparent 
              opacity={0.5} 
              depthTest={false}
            />
          </mesh>
        )}
      </Canvas>

      {/* UI 오버레이 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 상단 바 */}
        <div className="pointer-events-auto absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold">{world.name}</h1>
              <div className="flex items-center space-x-2 text-sm">
                <FaMapMarkerAlt />
                <span>Size: {world.size.width}x{world.size.height}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <FaCloudSun />
                <span className="capitalize">{world.weather.type}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm">
                <FaUsers />
                <span>{world.visitors.length}/{world.settings.maxVisitors}</span>
              </div>
              
              {isOwner && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSettings(true)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <FaCog />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <FaSave />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleShare}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <FaShareAlt />
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 왼쪽 툴바 */}
        {isOwner && (
          <div className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
            <div className="flex flex-col space-y-2">
              {/* 모드 버튼들 */}
              <div className="border-b border-gray-200 pb-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleModeChange('view')}
                  className={`w-full p-3 rounded ${mode === 'view' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
                >
                  <FaEye />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleModeChange('edit')}
                  className={`w-full p-3 rounded mt-1 ${mode === 'edit' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
                >
                  <FaEdit />
                </motion.button>
              </div>
              
              {/* 툴 버튼들 */}
              {(mode === 'edit' || mode === 'place') && tools.map((tool) => (
                <motion.button
                  key={tool.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedTool(tool.id as typeof selectedTool)}
                  className={`p-3 rounded ${
                    selectedTool === tool.id 
                      ? 'bg-blue-500 text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                  title={tool.label}
                >
                  {tool.icon}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* 하단 블록 선택 바 */}
        {isOwner && mode !== 'view' && selectedTool === 'block' && (
          <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="flex space-x-2">
              {blockTypes.map((type) => (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedBlock(type)}
                  className={`w-12 h-12 rounded border-2 ${
                    selectedBlock === type 
                      ? 'border-blue-500 ring-2 ring-blue-300' 
                      : 'border-gray-300'
                  }`}
                  style={{
                    background: {
                      grass: '#4a7c59',
                      dirt: '#8b6f47',
                      stone: '#6b6b6b',
                      water: '#006994',
                      sand: '#c2b280',
                      snow: '#ffffff'
                    }[type]
                  }}
                >
                  <span className="sr-only">{type}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* 방문자 목록 */}
        <div className="pointer-events-auto absolute right-4 top-24 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">접속중</h3>
          <div className="space-y-2">
            {world.visitors.map((visitor) => (
              <div key={visitor.userId} className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-300 rounded-full" />
                <span className="text-sm">{visitor.username}</span>
                {visitor.isOwner && <FaCrown className="text-yellow-500 text-xs" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 월드 설정 모달 */}
      <AnimatePresence>
        {showSettings && (
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
              <h2 className="text-xl font-bold mb-4">월드 설정</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">월드 이름</label>
                  <input
                    type="text"
                    value={editedWorld.settings.worldName}
                    onChange={(e) => setEditedWorld({
                      ...editedWorld,
                      settings: { ...editedWorld.settings, worldName: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">설명</label>
                  <textarea
                    value={editedWorld.settings.worldDescription}
                    onChange={(e) => setEditedWorld({
                      ...editedWorld,
                      settings: { ...editedWorld.settings, worldDescription: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="public"
                    checked={editedWorld.settings.isPublic}
                    onChange={(e) => setEditedWorld({
                      ...editedWorld,
                      settings: { ...editedWorld.settings, isPublic: e.target.checked }
                    })}
                    className="rounded"
                  />
                  <label htmlFor="public" className="text-sm text-gray-700">
                    공개 월드
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="visitors"
                    checked={editedWorld.settings.allowVisitors}
                    onChange={(e) => setEditedWorld({
                      ...editedWorld,
                      settings: { ...editedWorld.settings, allowVisitors: e.target.checked }
                    })}
                    className="rounded"
                  />
                  <label htmlFor="visitors" className="text-sm text-gray-700">
                    방문자 허용
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">입장료 (VXC)</label>
                  <input
                    type="number"
                    value={editedWorld.settings.entryFee}
                    onChange={(e) => setEditedWorld({
                      ...editedWorld,
                      settings: { ...editedWorld.settings, entryFee: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">최대 방문자 수</label>
                  <input
                    type="number"
                    value={editedWorld.settings.maxVisitors}
                    onChange={(e) => setEditedWorld({
                      ...editedWorld,
                      settings: { ...editedWorld.settings, maxVisitors: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  취소
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowSettings(false);
                    if (onUpdate) onUpdate(editedWorld);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  저장
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 로딩 오버레이 */}
      <AnimatePresence>
        {/* Add loading overlay here if needed */}
      </AnimatePresence>
    </div>
  );
};

export default World;
