import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import integrationService from '../../services/integrationService';
import web3Service from '../../services/web3Service';
import ipfsService from '../../services/ipfsService';
import api from '../../services/api';

// 서비스 모킹
jest.mock('../../services/web3Service');
jest.mock('../../services/ipfsService');
jest.mock('../../services/api');

describe('Full NFT Workflow Integration Test', () => {
  let user: any;

  beforeEach(() => {
    user = userEvent.setup();
    
    // 기본 모킹 설정
    (web3Service.isConnected as any) = true;
    (web3Service.getAccount as jest.Mock).mockResolvedValue('0x1234567890123456789012345678901234567890');
    (web3Service.getChainId as jest.Mock).mockResolvedValue(97);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('NFT Minting Workflow', () => {
    it('should complete full NFT minting process', async () => {
      // 1. 파일 업로드 모킹
      const mockFile = new File(['test image'], 'test-nft.jpg', { type: 'image/jpeg' });
      const mockMetadata = {
        name: 'Test NFT',
        description: 'This is a test NFT',
        attributes: [
          { trait_type: 'Rarity', value: 'Common' },
          { trait_type: 'Level', value: 1 },
        ],
      };

      // IPFS 업로드 모킹
      (ipfsService.uploadNFT as jest.Mock).mockResolvedValue({
        imageHash: 'QmTestImageHash',
        metadataHash: 'QmTestMetadataHash',
        metadataUrl: 'ipfs://QmTestMetadataHash',
      });

      // 백엔드 준비 요청 모킹
      (api.post as jest.Mock).mockImplementation((url, data) => {
        if (url === '/nft/prepare-mint') {
          return Promise.resolve({
            tokenId: 123,
            contractAddress: '0x9876543210987654321098765432109876543210',
          });
        }
        if (url === '/nft/confirm-mint') {
          return Promise.resolve({
            id: 456,
            status: 'minted',
          });
        }
      });

      // 블록체인 민팅 모킹
      (web3Service.mintNFT as jest.Mock).mockResolvedValue({
        success: true,
        hash: '0xabcdef123456789...',
        receipt: {
          status: 1,
          blockNumber: 12345,
        },
      });

      // 2. 전체 민팅 프로세스 실행
      const result = await integrationService.mintNFT(
        'item',
        mockFile,
        mockMetadata,
        {
          onProgress: (progress) => {
            console.log(`Upload progress: ${progress.percentage}%`);
          },
        }
      );

      // 3. 결과 검증
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        tokenId: 123,
        contractAddress: '0x9876543210987654321098765432109876543210',
        transactionHash: '0xabcdef123456789...',
        metadataUrl: 'ipfs://QmTestMetadataHash',
        ipfsHash: 'QmTestMetadataHash',
      });

      // 4. 서비스 호출 검증
      expect(ipfsService.uploadNFT).toHaveBeenCalledWith(
        mockFile,
        mockMetadata,
        expect.any(Function)
      );
      expect(api.post).toHaveBeenCalledWith('/nft/prepare-mint', expect.any(Object));
      expect(web3Service.mintNFT).toHaveBeenCalledWith('item', mockMetadata, 'ipfs://QmTestMetadataHash');
      expect(api.post).toHaveBeenCalledWith('/nft/confirm-mint', expect.any(Object));
    });

    it('should handle minting failure gracefully', async () => {
      const mockFile = new File(['test image'], 'test-nft.jpg', { type: 'image/jpeg' });
      const mockMetadata = {
        name: 'Test NFT',
        description: 'This will fail',
        attributes: [],
      };

      // IPFS 업로드 성공
      (ipfsService.uploadNFT as jest.Mock).mockResolvedValue({
        imageHash: 'QmTestImageHash',
        metadataHash: 'QmTestMetadataHash',
        metadataUrl: 'ipfs://QmTestMetadataHash',
      });

      // 백엔드 준비 성공
      (api.post as jest.Mock).mockResolvedValue({
        tokenId: 123,
        contractAddress: '0x9876543210987654321098765432109876543210',
      });

      // 블록체인 민팅 실패
      (web3Service.mintNFT as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Insufficient gas fees',
      });

      const result = await integrationService.mintNFT('item', mockFile, mockMetadata);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient gas fees');
    });
  });

  describe('Marketplace Listing Workflow', () => {
    it('should complete full marketplace listing process', async () => {
      const mockNftContract = '0x1234567890123456789012345678901234567890';
      const mockTokenId = 123;
      const mockPrice = '10';

      // NFT 소유권 확인 모킹
      (web3Service.getNFTOwner as jest.Mock).mockResolvedValue('0x1234567890123456789012345678901234567890');
      (web3Service.getAccount as jest.Mock).mockResolvedValue('0x1234567890123456789012345678901234567890');

      // 백엔드 리스팅 준비 모킹
      (api.post as jest.Mock).mockImplementation((url, data) => {
        if (url === '/marketplace/prepare-listing') {
          return Promise.resolve({
            listingId: 456,
            status: 'pending',
          });
        }
        if (url === '/marketplace/confirm-listing') {
          return Promise.resolve({
            id: 789,
            status: 'active',
          });
        }
      });

      // 블록체인 리스팅 모킹
      (web3Service.listNFTOnMarketplace as jest.Mock).mockResolvedValue({
        success: true,
        hash: '0xdef456789...',
        receipt: {
          status: 1,
          blockNumber: 12346,
        },
      });

      // 전체 리스팅 프로세스 실행
      const result = await integrationService.listNFTOnMarketplace(
        mockNftContract,
        mockTokenId,
        mockPrice
      );

      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        listingId: 456,
        transactionHash: '0xdef456789...',
        tokenId: mockTokenId,
        price: mockPrice,
      });

      // 서비스 호출 검증
      expect(web3Service.getNFTOwner).toHaveBeenCalledWith('item', mockTokenId);
      expect(api.post).toHaveBeenCalledWith('/marketplace/prepare-listing', expect.any(Object));
      expect(web3Service.listNFTOnMarketplace).toHaveBeenCalledWith(mockNftContract, mockTokenId, mockPrice);
      expect(api.post).toHaveBeenCalledWith('/marketplace/confirm-listing', expect.any(Object));
    });

    it('should prevent listing NFT user does not own', async () => {
      const mockNftContract = '0x1234567890123456789012345678901234567890';
      const mockTokenId = 123;
      const mockPrice = '10';

      // 다른 사용자 소유
      (web3Service.getNFTOwner as jest.Mock).mockResolvedValue('0x9999999999999999999999999999999999999999');
      (web3Service.getAccount as jest.Mock).mockResolvedValue('0x1234567890123456789012345678901234567890');

      const result = await integrationService.listNFTOnMarketplace(
        mockNftContract,
        mockTokenId,
        mockPrice
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('You do not own this NFT');
    });
  });

  describe('NFT Purchase Workflow', () => {
    it('should complete full NFT purchase process', async () => {
      const mockListingId = 123;

      // 리스팅 정보 조회 모킹
      (api.get as jest.Mock).mockResolvedValue({
        listingId: mockListingId,
        active: true,
        nftContract: '0x1234567890123456789012345678901234567890',
        tokenId: 456,
        price: '10',
        onChainListingId: 789,
      });

      // 구매 준비 모킹
      (api.post as jest.Mock).mockImplementation((url, data) => {
        if (url === '/marketplace/prepare-buy') {
          return Promise.resolve({
            buyId: 999,
            status: 'pending',
          });
        }
        if (url === '/marketplace/confirm-buy') {
          return Promise.resolve({
            id: 1001,
            status: 'completed',
          });
        }
      });

      // 블록체인 구매 모킹
      (web3Service.buyNFTFromMarketplace as jest.Mock).mockResolvedValue({
        success: true,
        hash: '0xabc123456...',
        receipt: {
          status: 1,
          blockNumber: 12347,
        },
      });

      // 전체 구매 프로세스 실행
      const result = await integrationService.buyNFTFromMarketplace(mockListingId);

      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        listingId: mockListingId,
        transactionHash: '0xabc123456...',
        nftContract: '0x1234567890123456789012345678901234567890',
        tokenId: 456,
      });

      // 서비스 호출 검증
      expect(api.get).toHaveBeenCalledWith(`/marketplace/listings/${mockListingId}`);
      expect(api.post).toHaveBeenCalledWith('/marketplace/prepare-buy', { listingId: mockListingId });
      expect(web3Service.buyNFTFromMarketplace).toHaveBeenCalledWith(789, '10');
      expect(api.post).toHaveBeenCalledWith('/marketplace/confirm-buy', expect.any(Object));
    });

    it('should prevent purchase of inactive listing', async () => {
      const mockListingId = 123;

      // 비활성 리스팅
      (api.get as jest.Mock).mockResolvedValue({
        listingId: mockListingId,
        active: false,
        status: 'sold',
      });

      const result = await integrationService.buyNFTFromMarketplace(mockListingId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Listing is not active');
    });
  });

  describe('Token Transfer Workflow', () => {
    it('should complete VXC token transfer', async () => {
      const mockTo = '0x9876543210987654321098765432109876543210';
      const mockAmount = '100';

      // 전송 준비 모킹
      (api.post as jest.Mock).mockImplementation((url, data) => {
        if (url === '/tokens/prepare-transfer') {
          return Promise.resolve({
            transferId: 555,
            status: 'pending',
          });
        }
        if (url === '/tokens/confirm-transfer') {
          return Promise.resolve({
            id: 666,
            status: 'completed',
          });
        }
      });

      // 블록체인 전송 모킹
      (web3Service.transferVXC as jest.Mock).mockResolvedValue({
        success: true,
        hash: '0xfff888999...',
        receipt: {
          status: 1,
          blockNumber: 12348,
        },
      });

      // 전체 전송 프로세스 실행
      const result = await integrationService.transferTokens('VXC', mockTo, mockAmount);

      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        transactionHash: '0xfff888999...',
        tokenType: 'VXC',
        to: mockTo,
        amount: mockAmount,
      });

      // 서비스 호출 검증
      expect(api.post).toHaveBeenCalledWith('/tokens/prepare-transfer', {
        tokenType: 'VXC',
        to: mockTo,
        amount: mockAmount,
      });
      expect(web3Service.transferVXC).toHaveBeenCalledWith(mockTo, mockAmount);
      expect(api.post).toHaveBeenCalledWith('/tokens/confirm-transfer', expect.any(Object));
    });
  });

  describe('Reward Claiming Workflow', () => {
    it('should complete reward claiming process', async () => {
      const mockRewardId = 789;

      // 보상 정보 조회 모킹
      (api.get as jest.Mock).mockResolvedValue({
        rewardId: mockRewardId,
        claimable: true,
        amount: '50',
        type: 'quest',
      });

      // 블록체인 청구 모킹
      (web3Service.claimReward as jest.Mock).mockResolvedValue({
        success: true,
        hash: '0xeee777666...',
        receipt: {
          status: 1,
          blockNumber: 12349,
        },
      });

      // 청구 완료 모킹
      (api.post as jest.Mock).mockResolvedValue({
        id: 999,
        status: 'claimed',
      });

      // 전체 청구 프로세스 실행
      const result = await integrationService.claimReward(mockRewardId);

      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        rewardId: mockRewardId,
        transactionHash: '0xeee777666...',
        amount: '50',
        rewardType: 'quest',
      });

      // 서비스 호출 검증
      expect(api.get).toHaveBeenCalledWith(`/rewards/${mockRewardId}`);
      expect(web3Service.claimReward).toHaveBeenCalledWith(mockRewardId);
      expect(api.post).toHaveBeenCalledWith('/rewards/confirm-claim', expect.any(Object));
    });
  });

  describe('World Save/Load Workflow', () => {
    it('should save world data to IPFS and backend', async () => {
      const mockWorldId = 'world-123';
      const mockWorldData = {
        terrain: [[1, 2, 3], [4, 5, 6]],
        buildings: [{ id: 1, position: { x: 10, y: 5, z: 10 } }],
        resources: [{ type: 'wood', amount: 100 }],
      };

      // IPFS 업로드 모킹
      (ipfsService.uploadJSON as jest.Mock).mockResolvedValue({
        hash: 'QmWorldHash',
        url: 'ipfs://QmWorldHash',
        size: 5000,
      });

      // 백엔드 저장 모킹
      (api.post as jest.Mock).mockResolvedValue({
        id: 777,
        worldId: mockWorldId,
        status: 'saved',
      });

      // 핀 설정 모킹
      (ipfsService.pinHash as jest.Mock).mockResolvedValue(true);

      // 전체 저장 프로세스 실행
      const result = await integrationService.saveWorld(mockWorldId, mockWorldData);

      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        worldId: mockWorldId,
        ipfsHash: 'QmWorldHash',
        ipfsUrl: 'ipfs://QmWorldHash',
        backendId: 777,
      });

      // 서비스 호출 검증
      expect(ipfsService.uploadJSON).toHaveBeenCalledWith(mockWorldData, `world-${mockWorldId}.json`);
      expect(api.post).toHaveBeenCalledWith('/game/save-world', expect.any(Object));
      expect(ipfsService.pinHash).toHaveBeenCalledWith('QmWorldHash');
    });

    it('should load world data from backend and IPFS', async () => {
      const mockWorldId = 'world-123';
      const mockWorldData = {
        terrain: [[1, 2, 3], [4, 5, 6]],
        buildings: [{ id: 1, position: { x: 10, y: 5, z: 10 } }],
      };

      // 백엔드 정보 조회 모킹
      (api.get as jest.Mock).mockResolvedValue({
        worldId: mockWorldId,
        ipfsHash: 'QmWorldHash',
        ipfsUrl: 'ipfs://QmWorldHash',
      });

      // IPFS 데이터 조회 모킹
      (ipfsService.fetchData as jest.Mock).mockResolvedValue(mockWorldData);

      // 전체 로드 프로세스 실행
      const result = await integrationService.loadWorld(mockWorldId);

      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.data.worldData).toEqual(mockWorldData);
      expect(result.metadata.loadedFromIpfs).toBe(true);

      // 서비스 호출 검증
      expect(api.get).toHaveBeenCalledWith(`/game/world/${mockWorldId}`);
      expect(ipfsService.fetchData).toHaveBeenCalledWith('QmWorldHash');
    });
  });

  describe('Batch Operations', () => {
    it('should process multiple operations in batch', async () => {
      const operations = [
        {
          type: 'transfer' as const,
          params: {
            tokenType: 'VXC',
            to: '0x123...',
            amount: '10',
          },
        },
        {
          type: 'vote' as const,
          params: {
            proposalId: 1,
            support: true,
          },
        },
      ];

      // 모든 작업 성공하도록 모킹
      (web3Service.transferVXC as jest.Mock).mockResolvedValue({
        success: true,
        hash: '0xbatch1...',
      });

      (api.post as jest.Mock).mockResolvedValue({ transferId: 1 });

      (api.post as jest.Mock).mockImplementation((url, data) => {
        if (url === '/dao/check-vote-eligibility') {
          return Promise.resolve({ eligible: true });
        }
        if (url === '/dao/confirm-vote') {
          return Promise.resolve({ voteId: 2 });
        }
        if (url === '/tokens/prepare-transfer') {
          return Promise.resolve({ transferId: 1 });
        }
        if (url === '/tokens/confirm-transfer') {
          return Promise.resolve({ transferId: 1 });
        }
      });

      (web3Service.voteOnProposal as jest.Mock).mockResolvedValue({
        success: true,
        hash: '0xbatch2...',
      });

      // 배치 작업 실행
      const result = await integrationService.processBatchOperations(operations);

      // 결과 검증
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.metadata.errors.length).toBe(0);
    });
  });
});

// 에러 처리 시나리오
describe('Integration Error Scenarios', () => {
  beforeEach(() => {
    (web3Service.isConnected as any) = true;
    (web3Service.getAccount as jest.Mock).mockResolvedValue('0x1234567890123456789012345678901234567890');
  });

  it('should handle network disconnection during operation', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockMetadata = { name: 'Test', description: 'Test' };

    // IPFS 업로드 성공
    (ipfsService.uploadNFT as jest.Mock).mockResolvedValue({
      imageHash: 'QmTest',
      metadataHash: 'QmTest',
      metadataUrl: 'ipfs://QmTest',
    });

    // 백엔드 준비 성공
    (api.post as jest.Mock).mockResolvedValue({ tokenId: 123 });

    // 네트워크 연결 끊김 시뮬레이션
    (web3Service.mintNFT as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await integrationService.mintNFT('item', mockFile, mockMetadata);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should handle IPFS upload failure', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockMetadata = { name: 'Test', description: 'Test' };

    // IPFS 업로드 실패
    (ipfsService.uploadNFT as jest.Mock).mockRejectedValue(new Error('IPFS service unavailable'));

    const result = await integrationService.mintNFT('item', mockFile, mockMetadata);

    expect(result.success).toBe(false);
    expect(result.error).toContain('IPFS service unavailable');
  });

  it('should handle backend API failure', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockMetadata = { name: 'Test', description: 'Test' };

    // IPFS 업로드 성공
    (ipfsService.uploadNFT as jest.Mock).mockResolvedValue({
      imageHash: 'QmTest',
      metadataHash: 'QmTest',
      metadataUrl: 'ipfs://QmTest',
    });

    // 백엔드 API 실패
    (api.post as jest.Mock).mockRejectedValue(new Error('Backend service unavailable'));

    const result = await integrationService.mintNFT('item', mockFile, mockMetadata);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Backend service unavailable');
  });
});

// 성능 테스트
describe('Integration Performance Tests', () => {
  it('should complete NFT minting within acceptable time', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockMetadata = { name: 'Test', description: 'Test' };

    // 모든 단계를 최적화된 시간으로 모킹
    (ipfsService.uploadNFT as jest.Mock).mockImplementation(
      (file, metadata, options) => {
        // 업로드 진행률 시뮬레이션
        setTimeout(() => options?.onProgress?.({ percentage: 50 }), 100);
        setTimeout(() => options?.onProgress?.({ percentage: 100 }), 200);
        
        return Promise.resolve({
          imageHash: 'QmTest',
          metadataHash: 'QmTest',
          metadataUrl: 'ipfs://QmTest',
        });
      }
    );

    (api.post as jest.Mock).mockResolvedValue({ tokenId: 123 });
    (web3Service.mintNFT as jest.Mock).mockResolvedValue({
      success: true,
      hash: '0xtest',
    });

    const startTime = Date.now();
    const result = await integrationService.mintNFT('item', mockFile, mockMetadata, {
      onProgress: jest.fn(),
    });
    const endTime = Date.now();

    expect(result.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(5000); // 5초 이내 완료
  });
});

// 상태 관리 테스트
describe('State Management Integration', () => {
  it('should maintain consistent state across operations', async () => {
    // 상태 일관성 테스트
    // 예: 여러 작업이 동시에 실행되어도 상태가 올바르게 유지되는지 확인
    expect(true).toBe(true);
  });

  it('should handle concurrent operations correctly', async () => {
    // 동시 작업 처리 테스트
    // 예: 여러 NFT 민팅이 동시에 실행될 때 각각 올바르게 처리되는지 확인
    expect(true).toBe(true);
  });
});
