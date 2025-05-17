/**
 * Crafting.tsx
 * 
 * 아이템, 건물, 탈것 등을 제작하는 페이지
 * 블록 기반 제작, 디자인 커스터마이징, NFT 발행 기능 제공
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Modal from '@/components/common/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useGameState } from '@/hooks/useGameState';
import { useWallet } from '@/hooks/useWallet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPackage,
  FiHome,
  FiNavigation2,
  FiLayers,
  FiRotateCw,
  FiMove,
  FiZoomIn,
  FiZoomOut,
  FiSave,
  FiUpload,
  FiRefreshCw,
  FiSettings,
  FiPalette,
  FiCpu,
  FiImage,
  FiHash,
  FiEye,
  FiCheck
} from 'react-icons/fi';
import * as THREE from 'three';

interface Material {
  id: string;
  name: string;
  type: 'basic' | 'rare' | 'epic' | 'legendary';
  description: string;
  icon: string;
  required: number;
  owned: number;
  cost?: number;
}

interface Block {
  id: string;
  type: string;
  position: THREE.Vector3;
  color: string;
  material: string;
  effects?: string[];
}

interface CraftingProject {
  id: string;
  type: 'item' | 'building' | 'vehicle';
  name: string;
  description: string;
  blocks: Block[];
  properties: {
    size: THREE.Vector3;
    weight?: number;
    durability?: number;
    speed?: number;
    capacity?: number;
  };
  materials: Material[];
  cost: {
    mintingFee: number;
    materialsCost: number;
    total: number;
  };
}

const craftingTypes = [
  { 
    id: 'item', 
    name: '아이템', 
    icon: <FiPackage />, 
    description: '도구, 장식품, 무기 등 작은 아이템 제작',
    examples: ['검', '도끼', '램프', '의자', '테이블']
  },
  { 
    id: 'building', 
    name: '건물', 
    icon: <FiHome />, 
    description: '집, 성, 상점 등 구조물 제작',
    examples: ['오두막', '저택', '상점', '요새', '타워']
  },
  { 
    id: 'vehicle', 
    name: '탈것', 
    icon: <FiNavigation2 />, 
    description: '자동차, 보트, 비행기 등 이동 수단 제작',
    examples: ['자동차', '보트', '비행기', '드론', '로켓']
  }
];

const basicMaterials: Material[] = [
  { id: 'wood', name: '나무', type: 'basic', description: '기본 건축 재료', icon: '🪵', required: 10, owned: 50 },
  { id: 'stone', name: '돌', type: 'basic', description: '견고한 건축 재료', icon: '🪨', required: 5, owned: 30 },
  { id: 'iron', name: '철', type: 'basic', description: '금속 제작 재료', icon: '⚙️', required: 3, owned: 15 },
  { id: 'crystal', name: '크리스탈', type: 'rare', description: '마법 효과를 위한 재료', icon: '💎', required: 1, owned: 5, cost: 100 },
  { id: 'mythril', name: '미스릴', type: 'epic', description: '전설적인 금속', icon: '✨', required: 0, owned: 0, cost: 500 }
];

const Crafting: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { gameState } = useGameState();
  const { wallet, isConnected } = useWallet();
  
  const [selectedType, setSelectedType] = useState<'item' | 'building' | 'vehicle'>('item');
  const [project, setProject] = useState<CraftingProject | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [viewerMode, setViewerMode] = useState('create'); // create, customize, preview
  
  // 3D 뷰어 관련
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // 프로젝트 초기화
  useEffect(() => {
    initializeProject();
  }, [selectedType]);

  // 3D 뷰어 초기화
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      initializeThreeJS();
    }
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  const initializeProject = () => {
    const newProject: CraftingProject = {
      id: Date.now().toString(),
      type: selectedType,
      name: '',
      description: '',
      blocks: [],
      properties: {
        size: new THREE.Vector3(5, 5, 5)
      },
      materials: [...basicMaterials],
      cost: {
        mintingFee: 50,
        materialsCost: 0,
        total: 50
      }
    };
    setProject(newProject);
  };

  const initializeThreeJS = () => {
    if (!canvasRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true 
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);

    // Controls (간단한 회전)
    const animate = () => {
      requestAnimationFrame(animate);
      if (sceneRef.current && rendererRef.current && cameraRef.current) {
        renderer.render(scene, camera);
      }
    };
    animate();
  };

  const addBlock = (type: string) => {
    if (!project) return;

    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      position: new THREE.Vector3(0, 0, 0),
      color: '#ffffff',
      material: 'wood',
      effects: []
    };

    setProject({
      ...project,
      blocks: [...project.blocks, newBlock]
    });

    // 3D 씬에 블록 추가
    if (sceneRef.current) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshPhongMaterial({ color: newBlock.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { blockId: newBlock.id };
      sceneRef.current.add(mesh);
    }
  };

  const calculateCost = (materials: Material[]) => {
    let materialsCost = 0;
    materials.forEach(material => {
      if (material.required > material.owned) {
        materialsCost += (material.required - material.owned) * (material.cost || 0);
      }
    });

    return {
      mintingFee: 50,
      materialsCost,
      total: 50 + materialsCost
    };
  };

  const handleMintNFT = async () => {
    if (!project || !isConnected) return;

    try {
      // NFT 발행 로직
      console.log('Minting NFT...', project);
      
      // 메타데이터 준비
      const metadata = {
        name: project.name,
        description: project.description,
        attributes: [
          { trait_type: 'Type', value: project.type },
          { trait_type: 'Blocks', value: project.blocks.length },
          { trait_type: 'Creator', value: user?.username }
        ],
        image: 'ipfs://...' // 3D 렌더링 이미지 업로드 후
      };

      // 스마트 컨트랙트 호출
      // TODO: 실제 NFT 발행 구현
      
      setShowMintModal(false);
      router.push('/profile');
    } catch (error) {
      console.error('Minting failed:', error);
    }
  };

  if (!project) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">제작 도구</h1>
            <p className="text-gray-600">블록을 조합하여 독특한 창작물을 만들어보세요</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowPreview(true)}
            >
              <FiEye />
              미리보기
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowMintModal(true)}
              disabled={!project.name || project.blocks.length === 0}
            >
              <FiUpload />
              NFT 발행 ({project.cost.total} VXC)
            </Button>
          </div>
        </div>

        {/* 제작 타입 선택 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {craftingTypes.map((type) => (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all ${
                selectedType === type.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedType(type.id as any)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl text-blue-600">{type.icon}</div>
                  <h3 className="font-semibold">{type.name}</h3>
                </div>
                {selectedType === type.id && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <FiCheck className="text-white text-sm" />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{type.description}</p>
              <div className="flex flex-wrap gap-1">
                {type.examples.map((example) => (
                  <span key={example} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {example}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* 메인 제작 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 도구 패널 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <h3 className="font-semibold mb-4">도구</h3>
              
              <div className="space-y-4">
                {/* 블록 타입 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">블록 타입</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => addBlock('cube')}>
                      큐브
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => addBlock('cylinder')}>
                      원기둥
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => addBlock('sphere')}>
                      구체
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => addBlock('pyramid')}>
                      피라미드
                    </Button>
                  </div>
                </div>

                {/* 재료 목록 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">재료</h4>
                  <div className="space-y-2">
                    {project.materials.map((material) => (
                      <div key={material.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{material.icon}</span>
                          <span className="text-sm">{material.name}</span>
                        </div>
                        <span className={`text-sm ${
                          material.owned >= material.required ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {material.owned}/{material.required}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 옵션 */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">옵션</h4>
                  <div className="space-y-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <FiPalette />
                      색상 편집
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <FiCpu />
                      효과 추가
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <FiSettings />
                      세부 설정
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* 3D 편집기 */}
          <div className="lg:col-span-2">
            <Card className="h-full min-h-[600px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">편집기</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm">
                    <FiZoomIn />
                  </Button>
                  <Button variant="secondary" size="sm">
                    <FiZoomOut />
                  </Button>
                  <Button variant="secondary" size="sm">
                    <FiRotateCw />
                  </Button>
                  <Button variant="secondary" size="sm">
                    <FiMove />
                  </Button>
                </div>
              </div>
              
              <div className="h-full relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full rounded-lg"
                  style={{ minHeight: '500px' }}
                />
                
                {/* 편집 가이드 */}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                  마우스: 회전 | 스크롤: 줌
                </div>
              </div>
            </Card>
          </div>

          {/* 프로젝트 설정 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <h3 className="font-semibold mb-4">프로젝트 설정</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={project.name}
                    onChange={(e) => setProject({...project, name: e.target.value})}
                    placeholder="창작물 이름"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={project.description}
                    onChange={(e) => setProject({...project, description: e.target.value})}
                    placeholder="창작물에 대한 설명을 입력하세요"
                  />
                </div>
                
                {/* 속성 설정 */}
                {selectedType === 'vehicle' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      속도
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="100"
                      value={project.properties.speed || 0}
                      onChange={(e) => setProject({
                        ...project,
                        properties: {
                          ...project.properties,
                          speed: parseInt(e.target.value)
                        }
                      })}
                    />
                  </div>
                )}
                
                {selectedType === 'building' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      용량
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      value={project.properties.capacity || 0}
                      onChange={(e) => setProject({
                        ...project,
                        properties: {
                          ...project.properties,
                          capacity: parseInt(e.target.value)
                        }
                      })}
                    />
                  </div>
                )}
                
                {/* 비용 요약 */}
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">발행 비용</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>발행 수수료</span>
                      <span>{project.cost.mintingFee} VXC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>재료 비용</span>
                      <span>{project.cost.materialsCost} VXC</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-1 border-t">
                      <span>총 비용</span>
                      <span>{project.cost.total} VXC</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 미리보기 모달 */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="창작물 미리보기"
        size="large"
      >
        <div className="space-y-4">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            {/* 3D 미리보기 */}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">속성</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>타입: {project.type}</li>
                <li>블록 수: {project.blocks.length}</li>
                <li>크기: {project.properties.size.x}x{project.properties.size.y}x{project.properties.size.z}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">재료</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {project.materials.filter(m => m.required > 0).map(material => (
                  <li key={material.id}>
                    {material.icon} {material.name}: {material.required}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Modal>

      {/* NFT 발행 모달 */}
      <Modal
        isOpen={showMintModal}
        onClose={() => setShowMintModal(false)}
        title="NFT 발행"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium mb-2">발행 정보</h4>
            <ul className="text-sm space-y-1">
              <li><strong>이름:</strong> {project.name}</li>
              <li><strong>타입:</strong> {project.type}</li>
              <li><strong>블록 수:</strong> {project.blocks.length}</li>
              <li><strong>총 비용:</strong> {project.cost.total} VXC</li>
            </ul>
          </div>
          
          <p className="text-sm text-gray-600">
            이 창작물을 NFT로 발행하면 블록체인에 영구적으로 저장되며, 
            마켓플레이스에서 거래할 수 있습니다.
          </p>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowMintModal(false)}
            >
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleMintNFT}
              disabled={!isConnected}
            >
              NFT 발행하기
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Crafting;
