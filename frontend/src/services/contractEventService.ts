import { ethers } from 'ethers';
import web3Service from './web3Service';
import { API_CONFIG, WS_EVENTS } from '../config/integration';
import api from './api';

// 이벤트 타입 정의
export type ContractEvent = {
  type: string;
  contract: string;
  data: any;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
};

// 이벤트 핸들러 타입
export type EventHandler = (event: ContractEvent) => void;

// 구독 옵션
export interface SubscriptionOptions {
  contract: string;
  abi: any[];
  eventName: string;
  filter?: ethers.EventFilter;
  fromBlock?: number | string;
  pollingInterval?: number;
}

// 이벤트 서비스 클래스
class ContractEventService {
  private subscriptions: Map<string, ethers.Contract> = new Map();
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private provider: ethers.providers.Provider | null = null;
  private isConnected = false;

  constructor() {
    this.initialize();
  }

  // 초기화
  private async initialize() {
    try {
      // RPC Provider 설정
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-dataseed.binance.org/';
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      this.isConnected = true;
      
      // 연결 상태 확인
      await this.provider.getNetwork();
      console.log('Contract event service initialized');
      
      // 기본 이벤트 구독 설정
      this.setupDefaultSubscriptions();
    } catch (error) {
      console.error('Failed to initialize contract event service:', error);
      this.isConnected = false;
    }
  }

  // 기본 이벤트 구독 설정
  private setupDefaultSubscriptions() {
    // VoxelCraft 토큰 이벤트
    this.subscribeToTokenEvents('VXC');
    this.subscribeToTokenEvents('PTX');
    
    // NFT 이벤트
    this.subscribeToNFTEvents('ITEM');
    this.subscribeToNFTEvents('BUILDING');
    this.subscribeToNFTEvents('VEHICLE');
    this.subscribeToNFTEvents('LAND');
    
    // 마켓플레이스 이벤트
    this.subscribeToMarketplaceEvents();
    
    // 보상 이벤트
    this.subscribeToRewardEvents();
    
    // DAO 이벤트
    this.subscribeToDAOEvents();
  }

  // 토큰 이벤트 구독
  private subscribeToTokenEvents(tokenType: 'VXC' | 'PTX') {
    const contractAddress = tokenType === 'VXC' 
      ? process.env.NEXT_PUBLIC_VOXELCRAFT_ADDRESS 
      : process.env.NEXT_PUBLIC_PLOTX_ADDRESS;
    
    if (!contractAddress || !this.provider) return;
    
    const contract = new ethers.Contract(
      contractAddress,
      [
        'event Transfer(address indexed from, address indexed to, uint256 value)',
        'event Approval(address indexed owner, address indexed spender, uint256 value)',
      ],
      this.provider
    );
    
    // Transfer 이벤트
    contract.on('Transfer', (from, to, value) => {
      this.handleEvent({
        type: 'TOKEN_TRANSFER',
        contract: contractAddress,
        data: { from, to, value: value.toString(), tokenType },
        blockNumber: 0, // 실제 블록 번호는 이벤트 리스너에서 제공
        transactionHash: '',
        timestamp: Date.now(),
      });
    });
    
    // Approval 이벤트
    contract.on('Approval', (owner, spender, value) => {
      this.handleEvent({
        type: 'TOKEN_APPROVAL',
        contract: contractAddress,
        data: { owner, spender, value: value.toString(), tokenType },
        blockNumber: 0,
        transactionHash: '',
        timestamp: Date.now(),
      });
    });
    
    this.subscriptions.set(`${tokenType}_TOKEN`, contract);
  }

  // NFT 이벤트 구독
  private subscribeToNFTEvents(nftType: 'ITEM' | 'BUILDING' | 'VEHICLE' | 'LAND') {
    const contractMap = {
      ITEM: process.env.NEXT_PUBLIC_ITEM_NFT_ADDRESS,
      BUILDING: process.env.NEXT_PUBLIC_BUILDING_NFT_ADDRESS,
      VEHICLE: process.env.NEXT_PUBLIC_VEHICLE_NFT_ADDRESS,
      LAND: process.env.NEXT_PUBLIC_LAND_NFT_ADDRESS,
    };
    
    const contractAddress = contractMap[nftType];
    if (!contractAddress || !this.provider) return;
    
    const contract = new ethers.Contract(
      contractAddress,
      [
        'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
        'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
        'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
        'event NFTMinted(uint256 indexed tokenId, address indexed owner, string tokenURI)',
      ],
      this.provider
    );
    
    // Transfer 이벤트
    contract.on('Transfer', (from, to, tokenId) => {
      // NFT 민팅 이벤트 (from이 0x0인 경우)
      if (from === ethers.constants.AddressZero) {
        this.handleEvent({
          type: 'NFT_MINTED',
          contract: contractAddress,
          data: { to, tokenId: tokenId.toString(), nftType },
          blockNumber: 0,
          transactionHash: '',
          timestamp: Date.now(),
        });
      } else {
        this.handleEvent({
          type: 'NFT_TRANSFER',
          contract: contractAddress,
          data: { from, to, tokenId: tokenId.toString(), nftType },
          blockNumber: 0,
          transactionHash: '',
          timestamp: Date.now(),
        });
      }
    });
    
    this.subscriptions.set(`${nftType}_NFT`, contract);
  }

  // 마켓플레이스 이벤트 구독
  private subscribeToMarketplaceEvents() {
    const contractAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
    if (!contractAddress || !this.provider) return;
    
    const contract = new ethers.Contract(
      contractAddress,
      [
        'event NFTListed(uint256 indexed listingId, address indexed seller, address nftContract, uint256 tokenId, uint256 price)',
        'event NFTSold(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 price)',
        'event NFTDelisted(uint256 indexed listingId, address indexed seller)',
        'event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 bid)',
      ],
      this.provider
    );
    
    // NFT 리스팅 이벤트
    contract.on('NFTListed', (listingId, seller, nftContract, tokenId, price) => {
      this.handleEvent({
        type: 'NFT_LISTED',
        contract: contractAddress,
        data: {
          listingId: listingId.toString(),
          seller,
          nftContract,
          tokenId: tokenId.toString(),
          price: price.toString(),
        },
        blockNumber: 0,
        transactionHash: '',
        timestamp: Date.now(),
      });
    });
    
    // NFT 판매 이벤트
    contract.on('NFTSold', (listingId, buyer, seller, price) => {
      this.handleEvent({
        type: 'NFT_SOLD',
        contract: contractAddress,
        data: {
          listingId: listingId.toString(),
          buyer,
          seller,
          price: price.toString(),
        },
        blockNumber: 0,
        transactionHash: '',
        timestamp: Date.now(),
      });
    });
    
    this.subscriptions.set('MARKETPLACE', contract);
  }

  // 보상 이벤트 구독
  private subscribeToRewardEvents() {
    const contractAddress = process.env.NEXT_PUBLIC_REWARD_VAULT_ADDRESS;
    if (!contractAddress || !this.provider) return;
    
    const contract = new ethers.Contract(
      contractAddress,
      [
        'event RewardClaimed(address indexed user, uint256 amount, string rewardType)',
        'event RewardDeposited(uint256 amount)',
        'event RewardWithdrawn(uint256 amount)',
      ],
      this.provider
    );
    
    // 보상 청구 이벤트
    contract.on('RewardClaimed', (user, amount, rewardType) => {
      this.handleEvent({
        type: 'REWARD_CLAIMED',
        contract: contractAddress,
        data: {
          user,
          amount: amount.toString(),
          rewardType,
        },
        blockNumber: 0,
        transactionHash: '',
        timestamp: Date.now(),
      });
    });
    
    this.subscriptions.set('REWARD_VAULT', contract);
  }

  // DAO 이벤트 구독
  private subscribeToDAOEvents() {
    const contractAddress = process.env.NEXT_PUBLIC_DAO_ADDRESS;
    if (!contractAddress || !this.provider) return;
    
    const contract = new ethers.Contract(
      contractAddress,
      [
        'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description)',
        'event VoteCasted(uint256 indexed proposalId, address indexed voter, bool support)',
        'event ProposalExecuted(uint256 indexed proposalId)',
      ],
      this.provider
    );
    
    // 제안 생성 이벤트
    contract.on('ProposalCreated', (proposalId, proposer, description) => {
      this.handleEvent({
        type: 'PROPOSAL_CREATED',
        contract: contractAddress,
        data: {
          proposalId: proposalId.toString(),
          proposer,
          description,
        },
        blockNumber: 0,
        transactionHash: '',
        timestamp: Date.now(),
      });
    });
    
    // 투표 이벤트
    contract.on('VoteCasted', (proposalId, voter, support) => {
      this.handleEvent({
        type: 'VOTE_CASTED',
        contract: contractAddress,
        data: {
          proposalId: proposalId.toString(),
          voter,
          support,
        },
        blockNumber: 0,
        transactionHash: '',
        timestamp: Date.now(),
      });
    });
    
    this.subscriptions.set('DAO', contract);
  }

  // 이벤트 처리
  private async handleEvent(event: ContractEvent) {
    try {
      // 이벤트를 백엔드로 전송
      await api.post('/events/contract', event);
      
      // 클라이언트 사이드 핸들러 실행
      const handlers = this.eventHandlers.get(event.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            console.error(`Error in event handler for ${event.type}:`, error);
          }
        });
      }
      
      // WebSocket으로 실시간 이벤트 전파
      this.broadcastEvent(event);
    } catch (error) {
      console.error('Failed to handle contract event:', error);
    }
  }

  // WebSocket으로 이벤트 브로드캐스트
  private broadcastEvent(event: ContractEvent) {
    // WebSocket 연결이 있다면 이벤트 전파
    if (window.dispatchEvent) {
      const customEvent = new CustomEvent('contract-event', {
        detail: event,
      });
      window.dispatchEvent(customEvent);
    }
  }

  // 특정 이벤트 타입에 핸들러 추가
  public subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    const handlers = this.eventHandlers.get(eventType)!;
    handlers.add(handler);
    
    // 구독 해제 함수 반환
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    };
  }

  // 과거 이벤트 조회
  public async queryPastEvents(
    options: SubscriptionOptions,
    fromBlock: number | string = 'earliest',
    toBlock: number | string = 'latest'
  ): Promise<ContractEvent[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const contract = new ethers.Contract(
        options.contract,
        options.abi,
        this.provider
      );

      const filter = contract.filters[options.eventName]();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);

      return events.map(event => ({
        type: options.eventName,
        contract: options.contract,
        data: event.args,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: Date.now(), // 실제로는 블록 타임스탬프 조회 필요
      }));
    } catch (error) {
      console.error('Failed to query past events:', error);
      return [];
    }
  }

  // 특정 컨트랙트의 특정 이벤트 구독
  public async subscribeToEvent(options: SubscriptionOptions): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const subscriptionId = `${options.contract}-${options.eventName}`;
    
    try {
      const contract = new ethers.Contract(
        options.contract,
        options.abi,
        this.provider
      );

      contract.on(options.eventName, (...args) => {
        const event = args[args.length - 1]; // 마지막 인자는 이벤트 객체
        const eventData = args.slice(0, -1); // 이벤트 데이터
        
        this.handleEvent({
          type: options.eventName,
          contract: options.contract,
          data: eventData,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          timestamp: Date.now(),
        });
      });

      this.subscriptions.set(subscriptionId, contract);
      return subscriptionId;
    } catch (error) {
      console.error('Failed to subscribe to event:', error);
      throw error;
    }
  }

  // 구독 해제
  public unsubscribe(subscriptionId: string): boolean {
    const contract = this.subscriptions.get(subscriptionId);
    if (!contract) {
      return false;
    }

    try {
      contract.removeAllListeners();
      this.subscriptions.delete(subscriptionId);
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  // 모든 구독 해제
  public unsubscribeAll() {
    this.subscriptions.forEach((contract, id) => {
      contract.removeAllListeners();
    });
    
    this.subscriptions.clear();
    this.eventHandlers.clear();
  }

  // 연결 상태 확인
  public get connected(): boolean {
    return this.isConnected;
  }

  // 특정 트랜잭션의 이벤트 조회
  public async getTransactionEvents(
    transactionHash: string
  ): Promise<ContractEvent[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      const events: ContractEvent[] = [];

      // 모든 로그를 이벤트로 변환
      for (const log of receipt.logs) {
        try {
          // 컨트랙트 주소에 따라 적절한 ABI로 이벤트 파싱
          const contract = this.getContractForAddress(log.address);
          if (contract) {
            const parsedLog = contract.interface.parseLog(log);
            
            events.push({
              type: parsedLog.name,
              contract: log.address,
              data: parsedLog.args,
              blockNumber: receipt.blockNumber,
              transactionHash,
              timestamp: Date.now(),
            });
          }
        } catch (parseError) {
          // 파싱 실패한 로그는 무시
          continue;
        }
      }

      return events;
    } catch (error) {
      console.error('Failed to get transaction events:', error);
      return [];
    }
  }

  // 주소에 해당하는 컨트랙트 인스턴스 찾기
  private getContractForAddress(address: string): ethers.Contract | null {
    for (const [id, contract] of this.subscriptions) {
      if (contract.address.toLowerCase() === address.toLowerCase()) {
        return contract;
      }
    }
    return null;
  }

  // 이벤트 통계 조회
  public async getEventStats(
    eventType: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<{ count: number; lastEvent?: Date }> {
    try {
      const response = await api.get(`/events/stats/${eventType}`, {
        params: { period },
      });
      
      return response;
    } catch (error) {
      console.error('Failed to get event stats:', error);
      return { count: 0 };
    }
  }
}

// 싱글톤 인스턴스 생성
const contractEventService = new ContractEventService();

// 전역 이벤트 리스너 설정
if (typeof window !== 'undefined') {
  // 지갑 연결 상태 변경 감지
  window.addEventListener('wallet-connected', () => {
    contractEventService.unsubscribeAll();
    contractEventService.initialize();
  });
  
  // 네트워크 변경 감지
  window.addEventListener('network-changed', () => {
    contractEventService.unsubscribeAll();
    contractEventService.initialize();
  });
}

export default contractEventService;
export { ContractEventService };

// 헬퍼 함수
export const contractEventHelpers = {
  // 이벤트 타입별 분류
  categorizeEvent: (event: ContractEvent): string => {
    const categories: Record<string, string[]> = {
      TOKEN: ['TOKEN_TRANSFER', 'TOKEN_APPROVAL', 'TOKEN_MINT', 'TOKEN_BURN'],
      NFT: ['NFT_MINTED', 'NFT_TRANSFER', 'NFT_APPROVAL', 'NFT_BURN'],
      MARKETPLACE: ['NFT_LISTED', 'NFT_SOLD', 'NFT_DELISTED', 'BID_PLACED'],
      REWARD: ['REWARD_CLAIMED', 'REWARD_DEPOSITED', 'REWARD_WITHDRAWN'],
      DAO: ['PROPOSAL_CREATED', 'VOTE_CASTED', 'PROPOSAL_EXECUTED'],
    };
    
    for (const [category, types] of Object.entries(categories)) {
      if (types.includes(event.type)) {
        return category;
      }
    }
    
    return 'OTHER';
  },
  
  // 이벤트 데이터 포맷팅
  formatEventData: (event: ContractEvent): string => {
    switch (event.type) {
      case 'TOKEN_TRANSFER':
        return `${event.data.value} tokens transferred from ${event.data.from} to ${event.data.to}`;
      
      case 'NFT_MINTED':
        return `NFT #${event.data.tokenId} minted to ${event.data.to}`;
      
      case 'NFT_SOLD':
        return `NFT sold for ${event.data.price} tokens`;
      
      case 'REWARD_CLAIMED':
        return `${event.data.user} claimed ${event.data.amount} tokens as ${event.data.rewardType}`;
      
      default:
        return JSON.stringify(event.data);
    }
  },
  
  // 이벤트 중요도 결정
  getEventPriority: (event: ContractEvent): 'high' | 'medium' | 'low' => {
    const highPriorityEvents = [
      'NFT_SOLD', 'PROPOSAL_CREATED', 'PROPOSAL_EXECUTED',
      'REWARD_CLAIMED',
    ];
    
    const mediumPriorityEvents = [
      'NFT_LISTED', 'TOKEN_TRANSFER', 'NFT_TRANSFER',
    ];
    
    if (highPriorityEvents.includes(event.type)) {
      return 'high';
    } else if (mediumPriorityEvents.includes(event.type)) {
      return 'medium';
    } else {
      return 'low';
    }
  },
};
