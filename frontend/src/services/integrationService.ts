// API와 블록체인 통합 서비스
import web3Service from './web3Service';
import ipfsService from './ipfsService';
import contractEventService from './contractEventService';
import api from './api';
import { API_CONFIG, configHelpers } from '../config/integration';

// 통합 응답 타입
export interface IntegratedResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  onChainData?: any;
  offChainData?: any;
  metadata?: any;
}

// NFT 민팅 결과 타입
export interface NFTMintResult {
  tokenId: number;
  contractAddress: string;
  transactionHash: string;
  metadataUrl: string;
  ipfsHash: string;
}

// 마켓플레이스 리스팅 결과 타입
export interface MarketplaceListingResult {
  listingId: number;
  transactionHash: string;
  tokenId: number;
  price: string;
}

// 통합 서비스 클래스
class IntegrationService {
  // NFT 민팅 (전체 프로세스)
  async mintNFT(
    nftType: 'item' | 'building' | 'vehicle' | 'land',
    imageFile: File,
    metadata: any,
    ipfsOptions?: { onProgress?: (progress: any) => void }
  ): Promise<IntegratedResponse<NFTMintResult>> {
    try {
      // 1. IPFS에 이미지 및 메타데이터 업로드
      const ipfsResult = await ipfsService.uploadNFT(
        imageFile,
        metadata,
        ipfsOptions?.onProgress
      );

      // 2. 백엔드에 NFT 정보 등록
      const backendResponse = await api.post('/nft/prepare-mint', {
        nftType,
        metadataUrl: ipfsResult.metadataUrl,
        metadata: {
          ...metadata,
          image: ipfsResult.imageHash,
        },
      });

      // 3. 스마트 컨트랙트에서 NFT 민팅
      const mintResult = await web3Service.mintNFT(
        nftType,
        metadata,
        ipfsResult.metadataUrl
      );

      if (!mintResult.success) {
        throw new Error(mintResult.error || 'Failed to mint NFT on blockchain');
      }

      // 4. 백엔드에 민팅 결과 업데이트
      const finalResult = await api.post('/nft/confirm-mint', {
        nftType,
        tokenId: backendResponse.tokenId,
        transactionHash: mintResult.hash,
        contractAddress: configHelpers.getContractAddress(
          nftType.toUpperCase() + '_NFT' as any
        ),
      });

      return {
        success: true,
        data: {
          tokenId: backendResponse.tokenId,
          contractAddress: configHelpers.getContractAddress(
            nftType.toUpperCase() + '_NFT' as any
          ),
          transactionHash: mintResult.hash,
          metadataUrl: ipfsResult.metadataUrl,
          ipfsHash: ipfsResult.metadataHash,
        },
        onChainData: mintResult,
        offChainData: finalResult,
        metadata: metadata,
      };
    } catch (error) {
      console.error('Failed to mint NFT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mint NFT',
      };
    }
  }

  // 마켓플레이스에 NFT 등록
  async listNFTOnMarketplace(
    nftContract: string,
    tokenId: number,
    price: string,
    duration?: number
  ): Promise<IntegratedResponse<MarketplaceListingResult>> {
    try {
      // 1. NFT 소유권 확인
      const owner = await web3Service.getNFTOwner(
        this.parseNftType(nftContract),
        tokenId
      );
      
      const currentAccount = await web3Service.getAccount();
      if (!owner || !currentAccount || owner.toLowerCase() !== currentAccount.toLowerCase()) {
        throw new Error('You do not own this NFT');
      }

      // 2. 백엔드에 리스팅 정보 등록
      const backendListing = await api.post('/marketplace/prepare-listing', {
        nftContract,
        tokenId,
        price,
        duration,
      });

      // 3. 스마트 컨트랙트에서 NFT 리스팅
      const listingResult = await web3Service.listNFTOnMarketplace(
        nftContract,
        tokenId,
        price
      );

      if (!listingResult.success) {
        throw new Error(listingResult.error || 'Failed to list NFT on marketplace');
      }

      // 4. 백엔드에 리스팅 결과 업데이트
      const finalResult = await api.post('/marketplace/confirm-listing', {
        listingId: backendListing.listingId,
        transactionHash: listingResult.hash,
      });

      return {
        success: true,
        data: {
          listingId: backendListing.listingId,
          transactionHash: listingResult.hash,
          tokenId,
          price,
        },
        onChainData: listingResult,
        offChainData: finalResult,
      };
    } catch (error) {
      console.error('Failed to list NFT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list NFT',
      };
    }
  }

  // 마켓플레이스에서 NFT 구매
  async buyNFTFromMarketplace(
    listingId: number
  ): Promise<IntegratedResponse<any>> {
    try {
      // 1. 리스팅 정보 조회
      const listingInfo = await api.get(`/marketplace/listings/${listingId}`);
      
      if (!listingInfo.active) {
        throw new Error('Listing is not active');
      }

      // 2. 구매 전 백엔드에 등록
      const prepareBuy = await api.post('/marketplace/prepare-buy', {
        listingId,
      });

      // 3. 스마트 컨트랙트에서 NFT 구매
      const buyResult = await web3Service.buyNFTFromMarketplace(
        listingInfo.onChainListingId,
        listingInfo.price
      );

      if (!buyResult.success) {
        throw new Error(buyResult.error || 'Failed to buy NFT');
      }

      // 4. 백엔드에 구매 완료 업데이트
      const finalResult = await api.post('/marketplace/confirm-buy', {
        listingId,
        transactionHash: buyResult.hash,
        buyer: await web3Service.getAccount(),
      });

      return {
        success: true,
        data: {
          listingId,
          transactionHash: buyResult.hash,
          nftContract: listingInfo.nftContract,
          tokenId: listingInfo.tokenId,
        },
        onChainData: buyResult,
        offChainData: finalResult,
      };
    } catch (error) {
      console.error('Failed to buy NFT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to buy NFT',
      };
    }
  }

  // 토큰 전송
  async transferTokens(
    tokenType: 'VXC' | 'PTX',
    to: string,
    amount: string
  ): Promise<IntegratedResponse<any>> {
    try {
      // 1. 백엔드에 전송 준비
      const prepareTransfer = await api.post('/tokens/prepare-transfer', {
        tokenType,
        to,
        amount,
      });

      // 2. 스마트 컨트랙트에서 토큰 전송
      const transferResult = tokenType === 'VXC'
        ? await web3Service.transferVXC(to, amount)
        : await web3Service.transferPTX(to, amount);

      if (!transferResult.success) {
        throw new Error(transferResult.error || 'Failed to transfer tokens');
      }

      // 3. 백엔드에 전송 완료 업데이트
      const finalResult = await api.post('/tokens/confirm-transfer', {
        transferId: prepareTransfer.transferId,
        transactionHash: transferResult.hash,
      });

      return {
        success: true,
        data: {
          transactionHash: transferResult.hash,
          tokenType,
          to,
          amount,
        },
        onChainData: transferResult,
        offChainData: finalResult,
      };
    } catch (error) {
      console.error('Failed to transfer tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer tokens',
      };
    }
  }

  // 보상 청구
  async claimReward(
    rewardId: number | string
  ): Promise<IntegratedResponse<any>> {
    try {
      // 1. 보상 정보 조회
      const rewardInfo = await api.get(`/rewards/${rewardId}`);
      
      if (!rewardInfo.claimable) {
        throw new Error('Reward is not claimable');
      }

      // 2. 스마트 컨트랙트에서 보상 청구
      const claimResult = await web3Service.claimReward(
        typeof rewardId === 'string' ? parseInt(rewardId) : rewardId
      );

      if (!claimResult.success) {
        throw new Error(claimResult.error || 'Failed to claim reward');
      }

      // 3. 백엔드에 청구 완료 업데이트
      const finalResult = await api.post('/rewards/confirm-claim', {
        rewardId,
        transactionHash: claimResult.hash,
      });

      return {
        success: true,
        data: {
          rewardId,
          transactionHash: claimResult.hash,
          amount: rewardInfo.amount,
          rewardType: rewardInfo.type,
        },
        onChainData: claimResult,
        offChainData: finalResult,
      };
    } catch (error) {
      console.error('Failed to claim reward:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to claim reward',
      };
    }
  }

  // 투표
  async voteOnProposal(
    proposalId: number,
    support: boolean
  ): Promise<IntegratedResponse<any>> {
    try {
      // 1. 투표 자격 확인
      const voteCheck = await api.post('/dao/check-vote-eligibility', {
        proposalId,
      });

      if (!voteCheck.eligible) {
        throw new Error('You are not eligible to vote on this proposal');
      }

      // 2. 스마트 컨트랙트에서 투표
      const voteResult = await web3Service.voteOnProposal(proposalId, support);

      if (!voteResult.success) {
        throw new Error(voteResult.error || 'Failed to cast vote');
      }

      // 3. 백엔드에 투표 결과 업데이트
      const finalResult = await api.post('/dao/confirm-vote', {
        proposalId,
        transactionHash: voteResult.hash,
        support,
      });

      return {
        success: true,
        data: {
          proposalId,
          transactionHash: voteResult.hash,
          support,
        },
        onChainData: voteResult,
        offChainData: finalResult,
      };
    } catch (error) {
      console.error('Failed to vote:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to vote',
      };
    }
  }

  // 월드 저장 (IPFS + 백엔드)
  async saveWorld(
    worldId: string,
    worldData: any
  ): Promise<IntegratedResponse<any>> {
    try {
      // 1. 월드 데이터를 IPFS에 업로드
      const ipfsResult = await ipfsService.uploadJSON(worldData, `world-${worldId}.json`);

      // 2. 백엔드에 월드 데이터 저장
      const saveResult = await api.post('/game/save-world', {
        worldId,
        worldData,
        ipfsHash: ipfsResult.hash,
        ipfsUrl: ipfsResult.url,
      });

      // 3. 핀 설정 (영구 저장)
      await ipfsService.pinHash(ipfsResult.hash);

      return {
        success: true,
        data: {
          worldId,
          ipfsHash: ipfsResult.hash,
          ipfsUrl: ipfsResult.url,
          backendId: saveResult.id,
        },
        offChainData: saveResult,
        metadata: { ipfsHash: ipfsResult.hash },
      };
    } catch (error) {
      console.error('Failed to save world:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save world',
      };
    }
  }

  // 월드 로드 (IPFS + 백엔드)
  async loadWorld(worldId: string): Promise<IntegratedResponse<any>> {
    try {
      // 1. 백엔드에서 월드 정보 조회
      const worldInfo = await api.get(`/game/world/${worldId}`);

      if (!worldInfo.ipfsHash) {
        // IPFS 해시가 없으면 백엔드 데이터만 사용
        return {
          success: true,
          data: worldInfo,
          offChainData: worldInfo,
        };
      }

      // 2. IPFS에서 월드 데이터 조회
      let worldData;
      try {
        worldData = await ipfsService.fetchData(worldInfo.ipfsHash);
      } catch (ipfsError) {
        // IPFS 조회 실패 시 백엔드 데이터 사용
        console.warn('Failed to load from IPFS, using backend data');
        worldData = worldInfo.worldData;
      }

      return {
        success: true,
        data: {
          ...worldInfo,
          worldData,
        },
        offChainData: worldInfo,
        metadata: { loadedFromIpfs: !!worldData },
      };
    } catch (error) {
      console.error('Failed to load world:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load world',
      };
    }
  }

  // 동기화 상태 확인
  async checkSyncStatus(): Promise<{
    blockchain: boolean;
    ipfs: boolean;
    backend: boolean;
    lastSync: Date | null;
  }> {
    try {
      const [blockchainStatus, backendStatus] = await Promise.all([
        web3Service.isConnected,
        api.get('/system/status'),
      ]);

      return {
        blockchain: blockchainStatus,
        ipfs: true, // IPFS는 항상 사용 가능하다고 가정
        backend: backendStatus.healthy,
        lastSync: backendStatus.lastSync ? new Date(backendStatus.lastSync) : null,
      };
    } catch (error) {
      console.error('Failed to check sync status:', error);
      return {
        blockchain: false,
        ipfs: false,
        backend: false,
        lastSync: null,
      };
    }
  }

  // 배치 작업 처리
  async processBatchOperations(
    operations: Array<{
      type: 'transfer' | 'mint' | 'list' | 'vote';
      params: any;
    }>
  ): Promise<IntegratedResponse<any[]>> {
    try {
      const results = [];
      const errors = [];

      for (const op of operations) {
        try {
          let result;
          switch (op.type) {
            case 'transfer':
              result = await this.transferTokens(
                op.params.tokenType,
                op.params.to,
                op.params.amount
              );
              break;
            case 'mint':
              result = await this.mintNFT(
                op.params.nftType,
                op.params.imageFile,
                op.params.metadata
              );
              break;
            case 'list':
              result = await this.listNFTOnMarketplace(
                op.params.nftContract,
                op.params.tokenId,
                op.params.price
              );
              break;
            case 'vote':
              result = await this.voteOnProposal(
                op.params.proposalId,
                op.params.support
              );
              break;
            default:
              throw new Error(`Unknown operation type: ${op.type}`);
          }
          results.push(result);
        } catch (error) {
          errors.push({
            operation: op,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        success: errors.length === 0,
        data: results,
        error: errors.length > 0 ? `${errors.length} operations failed` : undefined,
        metadata: { errors },
      };
    } catch (error) {
      console.error('Failed to process batch operations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process batch operations',
      };
    }
  }

  // 핵심 메트릭스 조회
  async getCoreMetrics(userAddress: string): Promise<IntegratedResponse<{
    onChain: {
      tokenBalances: { vxc: string; ptx: string };
      nftCounts: { item: number; building: number; vehicle: number; land: number };
      marketplaceActivity: {
        listings: number;
        sales: number;
        volume: string;
      };
    };
    offChain: {
      gameStats: {
        level: number;
        experience: number;
        achievements: number;
      };
      socialStats: {
        friends: number;
        guildMembers: number;
        messages: number;
      };
    };
  }>> {
    try {
      // 1. 온체인 데이터 조회
      const [tokenBalances, nftCounts, marketplaceActivity] = await Promise.all([
        // 토큰 잔액
        api.get(`/blockchain/balances/${userAddress}`),
        
        // NFT 개수
        this.getUserNFTCounts(userAddress),
        
        // 마켓플레이스 활동
        api.get(`/marketplace/user-activity/${userAddress}`),
      ]);

      // 2. 오프체인 데이터 조회
      const [gameStats, socialStats] = await Promise.all([
        api.get(`/game/user-stats/${userAddress}`),
        api.get(`/social/user-stats/${userAddress}`),
      ]);

      return {
        success: true,
        data: {
          onChain: {
            tokenBalances,
            nftCounts,
            marketplaceActivity,
          },
          offChain: {
            gameStats,
            socialStats,
          },
        },
      };
    } catch (error) {
      console.error('Failed to get core metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get core metrics',
      };
    }
  }

  // 사용자 NFT 개수 조회
  private async getUserNFTCounts(userAddress: string): Promise<{
    item: number;
    building: number;
    vehicle: number;
    land: number;
  }> {
    try {
      const [itemNFTs, buildingNFTs, vehicleNFTs, landNFTs] = await Promise.all([
        web3Service.getUserNFTs('item', userAddress),
        web3Service.getUserNFTs('building', userAddress),
        web3Service.getUserNFTs('vehicle', userAddress),
        web3Service.getUserNFTs('land', userAddress),
      ]);

      return {
        item: itemNFTs.length,
        building: buildingNFTs.length,
        vehicle: vehicleNFTs.length,
        land: landNFTs.length,
      };
    } catch (error) {
      console.error('Failed to get user NFT counts:', error);
      return {
        item: 0,
        building: 0,
        vehicle: 0,
        land: 0,
      };
    }
  }

  // 컨트랙트 주소로 NFT 타입 파싱
  private parseNftType(contractAddress: string): 'item' | 'building' | 'vehicle' | 'land' {
    const contracts = {
      [configHelpers.getContractAddress('ITEM_NFT').toLowerCase()]: 'item',
      [configHelpers.getContractAddress('BUILDING_NFT').toLowerCase()]: 'building',
      [configHelpers.getContractAddress('VEHICLE_NFT').toLowerCase()]: 'vehicle',
      [configHelpers.getContractAddress('LAND_NFT').toLowerCase()]: 'land',
    };

    return contracts[contractAddress.toLowerCase()] as 'item' | 'building' | 'vehicle' | 'land' || 'item';
  }

  // 이벤트 처리 초기화
  initialize() {
    // 중요한 이벤트 핸들러 등록
    const unsubscriber = contractEventService.subscribe('NFT_SOLD', async (event) => {
      console.log('NFT sold:', event);
      // 판매 완료 알림 처리
      this.notifyNFTSold(event.data);
    });

    contractEventService.subscribe('REWARD_CLAIMED', async (event) => {
      console.log('Reward claimed:', event);
      // 보상 클레임 알림 처리
      this.notifyRewardClaimed(event.data);
    });

    // 정리 함수 반환
    return unsubscriber;
  }

  // 알림 메서드
  private async notifyNFTSold(data: any) {
    // TODO: 사용자에게 NFT 판매 완료 알림
    // 예: 토스트 메시지, 이메일, 푸시 알림 등
  }

  private async notifyRewardClaimed(data: any) {
    // TODO: 사용자에게 보상 클레임 알림
  }
}

// 싱글톤 인스턴스 생성
const integrationService = new IntegrationService();

// 자동 초기화
integrationService.initialize();

export default integrationService;
export { IntegrationService };

// 헬퍼 함수들
export const integrationHelpers = {
  // 트랜잭션 해시 포맷팅
  formatTxHash: (hash: string): string => {
    return hash.slice(0, 6) + '...' + hash.slice(-4);
  },

  // 트랜잭션 익스플로러 URL 생성
  getTxExplorerUrl: (hash: string): string => {
    return configHelpers.getBlockExplorerUrl('tx', hash);
  },

  // 에러 메시지 포맷팅
  formatErrorMessage: (error: any): string => {
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.reason) return error.reason;
    return 'Unknown error occurred';
  },

  // 가스 비용 계산
  calculateGasCost: async (gasUsed: number, gasPriceGwei: number): Promise<string> => {
    const gasCost = gasUsed * gasPriceGwei * 1e9; // wei로 변환
    return (gasCost / 1e18).toFixed(6); // ETH로 변환
  },

  // 트랜잭션 상태 체크
  waitForTransaction: async (hash: string, confirmations: number = 1): Promise<boolean> => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );
      
      const receipt = await provider.waitForTransaction(hash, confirmations);
      return receipt.status === 1;
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      return false;
    }
  },
};

// 통합 상태 관리용 타입 내보내기
export type IntegrationStatus = {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastAction: string | null;
  actionHistory: Array<{
    action: string;
    timestamp: number;
    result: 'success' | 'failure';
    details?: any;
  }>;
};
