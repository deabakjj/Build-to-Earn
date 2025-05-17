import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';

// 컨트랙트 ABI 임포트 (실제 사용 시 정확한 경로로 수정 필요)
import VoxelCraftABI from '../../../smart-contracts/artifacts/contracts/tokens/VoxelCraft.sol/VoxelCraft.json';
import PlotXABI from '../../../smart-contracts/artifacts/contracts/tokens/PlotX.sol/PlotX.json';
import ItemNFTABI from '../../../smart-contracts/artifacts/contracts/nft/ItemNFT.sol/ItemNFT.json';
import BuildingNFTABI from '../../../smart-contracts/artifacts/contracts/nft/BuildingNFT.sol/BuildingNFT.json';
import VehicleNFTABI from '../../../smart-contracts/artifacts/contracts/nft/VehicleNFT.sol/VehicleNFT.json';
import LandNFTABI from '../../../smart-contracts/artifacts/contracts/nft/LandNFT.sol/LandNFT.json';
import MarketplaceABI from '../../../smart-contracts/artifacts/contracts/marketplace/Marketplace.sol/Marketplace.json';
import RewardVaultABI from '../../../smart-contracts/artifacts/contracts/rewards/RewardVault.sol/RewardVault.json';
import DAOABI from '../../../smart-contracts/artifacts/contracts/governance/DAO.sol/DAO.json';

// 컨트랙트 주소 정의
const CONTRACTS = {
  VOXELCRAFT_TOKEN: process.env.NEXT_PUBLIC_VOXELCRAFT_ADDRESS || '',
  PLOTX_TOKEN: process.env.NEXT_PUBLIC_PLOTX_ADDRESS || '',
  ITEM_NFT: process.env.NEXT_PUBLIC_ITEM_NFT_ADDRESS || '',
  BUILDING_NFT: process.env.NEXT_PUBLIC_BUILDING_NFT_ADDRESS || '',
  VEHICLE_NFT: process.env.NEXT_PUBLIC_VEHICLE_NFT_ADDRESS || '',
  LAND_NFT: process.env.NEXT_PUBLIC_LAND_NFT_ADDRESS || '',
  MARKETPLACE: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '',
  REWARD_VAULT: process.env.NEXT_PUBLIC_REWARD_VAULT_ADDRESS || '',
  DAO: process.env.NEXT_PUBLIC_DAO_ADDRESS || '',
} as const;

// Web3 Provider 타입
type Web3Provider = ethers.providers.Web3Provider;
type Signer = ethers.Signer;

// 지갑 정보 타입
export interface WalletInfo {
  address: string;
  chainId: number;
  balance: {
    eth: string;
    vxc: string;
    ptx: string;
  };
  connected: boolean;
}

// 트랜잭션 결과 타입
export interface TransactionResult {
  hash: string;
  success: boolean;
  receipt?: ethers.ContractReceipt;
  error?: string;
}

// NFT 메타데이터 타입
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  properties: Record<string, any>;
}

// Web3 서비스 클래스
class Web3Service {
  private provider: Web3Provider | null = null;
  private signer: Signer | null = null;
  private web3Modal: Web3Modal | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWeb3Modal();
    }
  }

  // Web3Modal 초기화
  private initializeWeb3Modal() {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.NEXT_PUBLIC_INFURA_ID,
          rpc: {
            97: 'https://data-seed-prebsc-1-s1.binance.org:8545/', // BSC 테스트넷
            56: 'https://bsc-dataseed.binance.org/', // BSC 메인넷
          },
        },
      },
    };

    this.web3Modal = new Web3Modal({
      cacheProvider: true,
      providerOptions,
      disableInjectedProvider: false,
    });
  }

  // 지갑 연결
  async connect(): Promise<WalletInfo | null> {
    try {
      if (!this.web3Modal) {
        throw new Error('Web3Modal not initialized');
      }

      const instance = await this.web3Modal.connect();
      this.provider = new ethers.providers.Web3Provider(instance);
      this.signer = this.provider.getSigner();

      // 계정 정보 가져오기
      const address = await this.signer.getAddress();
      const chainId = await this.provider.getNetwork().then(network => network.chainId);

      // 잔액 조회
      const balance = await this.getWalletBalance(address);

      // 이벤트 리스너 설정
      this.setupEventListeners(instance);

      return {
        address,
        chainId,
        balance,
        connected: true,
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return null;
    }
  }

  // 지갑 연결 해제
  async disconnect() {
    if (this.web3Modal) {
      await this.web3Modal.clearCachedProvider();
    }
    this.provider = null;
    this.signer = null;
  }

  // 이벤트 리스너 설정
  private setupEventListeners(instance: any) {
    // 계정 변경 이벤트
    instance.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        window.location.reload();
      }
    });

    // 체인 변경 이벤트
    instance.on('chainChanged', (chainId: string) => {
      window.location.reload();
    });

    // 연결 해제 이벤트
    instance.on('disconnect', () => {
      this.disconnect();
    });
  }

  // 지갑 잔액 조회
  async getWalletBalance(address: string): Promise<WalletInfo['balance']> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    // ETH 잔액
    const ethBalance = await this.provider.getBalance(address);
    
    // VXC 토큰 잔액
    const vxcContract = new ethers.Contract(
      CONTRACTS.VOXELCRAFT_TOKEN,
      VoxelCraftABI.abi,
      this.provider
    );
    const vxcBalance = await vxcContract.balanceOf(address);

    // PTX 토큰 잔액
    const ptxContract = new ethers.Contract(
      CONTRACTS.PLOTX_TOKEN,
      PlotXABI.abi,
      this.provider
    );
    const ptxBalance = await ptxContract.balanceOf(address);

    return {
      eth: ethers.utils.formatEther(ethBalance),
      vxc: ethers.utils.formatUnits(vxcBalance, 18),
      ptx: ethers.utils.formatUnits(ptxBalance, 18),
    };
  }

  // 컨트랙트 인스턴스 생성
  private getContract(address: string, abi: any, withSigner: boolean = true) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    if (withSigner && !this.signer) {
      throw new Error('Signer not initialized');
    }

    return new ethers.Contract(
      address,
      abi,
      withSigner ? this.signer! : this.provider
    );
  }

  // VoxelCraft 토큰 컨트랙트
  private get voxelCraftContract() {
    return this.getContract(CONTRACTS.VOXELCRAFT_TOKEN, VoxelCraftABI.abi);
  }

  // PlotX 토큰 컨트랙트
  private get plotXContract() {
    return this.getContract(CONTRACTS.PLOTX_TOKEN, PlotXABI.abi);
  }

  // NFT 컨트랙트들
  private get itemNFTContract() {
    return this.getContract(CONTRACTS.ITEM_NFT, ItemNFTABI.abi);
  }

  private get buildingNFTContract() {
    return this.getContract(CONTRACTS.BUILDING_NFT, BuildingNFTABI.abi);
  }

  private get vehicleNFTContract() {
    return this.getContract(CONTRACTS.VEHICLE_NFT, VehicleNFTABI.abi);
  }

  private get landNFTContract() {
    return this.getContract(CONTRACTS.LAND_NFT, LandNFTABI.abi);
  }

  // 마켓플레이스 컨트랙트
  private get marketplaceContract() {
    return this.getContract(CONTRACTS.MARKETPLACE, MarketplaceABI.abi);
  }

  // 보상 금고 컨트랙트
  private get rewardVaultContract() {
    return this.getContract(CONTRACTS.REWARD_VAULT, RewardVaultABI.abi);
  }

  // DAO 컨트랙트
  private get daoContract() {
    return this.getContract(CONTRACTS.DAO, DAOABI.abi);
  }

  // VXC 토큰 전송
  async transferVXC(to: string, amount: string): Promise<TransactionResult> {
    try {
      const amountWei = ethers.utils.parseUnits(amount, 18);
      const tx = await this.voxelCraftContract.transfer(to, amountWei);
      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        success: true,
        receipt,
      };
    } catch (error) {
      console.error('VXC transfer failed:', error);
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }

  // PTX 토큰 전송
  async transferPTX(to: string, amount: string): Promise<TransactionResult> {
    try {
      const amountWei = ethers.utils.parseUnits(amount, 18);
      const tx = await this.plotXContract.transfer(to, amountWei);
      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        success: true,
        receipt,
      };
    } catch (error) {
      console.error('PTX transfer failed:', error);
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }

  // NFT 민팅
  async mintNFT(
    type: 'item' | 'building' | 'vehicle' | 'land',
    metadata: NFTMetadata,
    ipfsUrl: string
  ): Promise<TransactionResult> {
    try {
      let contract;
      switch (type) {
        case 'item':
          contract = this.itemNFTContract;
          break;
        case 'building':
          contract = this.buildingNFTContract;
          break;
        case 'vehicle':
          contract = this.vehicleNFTContract;
          break;
        case 'land':
          contract = this.landNFTContract;
          break;
        default:
          throw new Error('Invalid NFT type');
      }

      const tx = await contract.mint(await this.signer!.getAddress(), ipfsUrl);
      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        success: true,
        receipt,
      };
    } catch (error) {
      console.error('NFT minting failed:', error);
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Minting failed',
      };
    }
  }

  // NFT 전송
  async transferNFT(
    type: 'item' | 'building' | 'vehicle' | 'land',
    from: string,
    to: string,
    tokenId: number
  ): Promise<TransactionResult> {
    try {
      let contract;
      switch (type) {
        case 'item':
          contract = this.itemNFTContract;
          break;
        case 'building':
          contract = this.buildingNFTContract;
          break;
        case 'vehicle':
          contract = this.vehicleNFTContract;
          break;
        case 'land':
          contract = this.landNFTContract;
          break;
        default:
          throw new Error('Invalid NFT type');
      }

      const tx = await contract.transferFrom(from, to, tokenId);
      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        success: true,
        receipt,
      };
    } catch (error) {
      console.error('NFT transfer failed:', error);
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }

  // 마켓플레이스에 NFT 등록
  async listNFTOnMarketplace(
    nftContract: string,
    tokenId: number,
    price: string
  ): Promise<TransactionResult> {
    try {
      const priceWei = ethers.utils.parseUnits(price, 18);
      
      // NFT 승인
      const nftContractInstance = new ethers.Contract(
        nftContract,
        ItemNFTABI.abi, // 모든 NFT가 같은 기본 인터페이스 사용
        this.signer!
      );
      
      const approveTx = await nftContractInstance.approve(
        CONTRACTS.MARKETPLACE,
        tokenId
      );
      await approveTx.wait();

      // 마켓플레이스에 등록
      const tx = await this.marketplaceContract.listNFT(
        nftContract,
        tokenId,
        priceWei
      );
      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        success: true,
        receipt,
      };
    } catch (error) {
      console.error('NFT listing failed:', error);
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Listing failed',
      };
    }
  }

  // 마켓플레이스에서 NFT 구매
  async buyNFTFromMarketplace(
    listingId: number,
    price: string
  ): Promise<TransactionResult> {
    try {
      const priceWei = ethers.utils.parseUnits(price, 18);
      const tx = await this.marketplaceContract.buyNFT(listingId, {
        value: priceWei,
      });
      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        success: true,
        receipt,
      };
    } catch (error) {
      console.error('NFT purchase failed:', error);
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
      };
    }
  }

  // 보상 청구
  async claimReward(rewardId: number): Promise<TransactionResult> {
    try {
      const tx = await this.rewardVaultContract.claimReward(rewardId);
      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        success: true,
        receipt,
      };
    } catch (error) {
      console.error('Reward claim failed:', error);
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Claim failed',
      };
    }
  }

  // DAO 투표 참여
  async voteOnProposal(
    proposalId: number,
    support: boolean
  ): Promise<TransactionResult> {
    try {
      const tx = await this.daoContract.vote(proposalId, support ? 1 : 0);
      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        success: true,
        receipt,
      };
    } catch (error) {
      console.error('Voting failed:', error);
      return {
        hash: '',
        success: false,
        error: error instanceof Error ? error.message : 'Voting failed',
      };
    }
  }

  // 서명 생성 (로그인용)
  async signMessage(message: string): Promise<string | null> {
    try {
      if (!this.signer) {
        throw new Error('Signer not initialized');
      }

      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Message signing failed:', error);
      return null;
    }
  }

  // 컨트랙트 이벤트 구독
  subscribeToEvents(
    contract: ethers.Contract,
    eventName: string,
    callback: (...args: any[]) => void
  ) {
    contract.on(eventName, callback);
    
    // 구독 해제 함수 반환
    return () => {
      contract.off(eventName, callback);
    };
  }

  // 특정 NFT의 소유자 확인
  async getNFTOwner(
    type: 'item' | 'building' | 'vehicle' | 'land',
    tokenId: number
  ): Promise<string | null> {
    try {
      let contract;
      switch (type) {
        case 'item':
          contract = this.getContract(CONTRACTS.ITEM_NFT, ItemNFTABI.abi, false);
          break;
        case 'building':
          contract = this.getContract(CONTRACTS.BUILDING_NFT, BuildingNFTABI.abi, false);
          break;
        case 'vehicle':
          contract = this.getContract(CONTRACTS.VEHICLE_NFT, VehicleNFTABI.abi, false);
          break;
        case 'land':
          contract = this.getContract(CONTRACTS.LAND_NFT, LandNFTABI.abi, false);
          break;
        default:
          throw new Error('Invalid NFT type');
      }

      const owner = await contract.ownerOf(tokenId);
      return owner;
    } catch (error) {
      console.error('Failed to get NFT owner:', error);
      return null;
    }
  }

  // 사용자의 NFT 목록 조회
  async getUserNFTs(
    type: 'item' | 'building' | 'vehicle' | 'land',
    userAddress: string
  ): Promise<number[]> {
    try {
      let contract;
      switch (type) {
        case 'item':
          contract = this.getContract(CONTRACTS.ITEM_NFT, ItemNFTABI.abi, false);
          break;
        case 'building':
          contract = this.getContract(CONTRACTS.BUILDING_NFT, BuildingNFTABI.abi, false);
          break;
        case 'vehicle':
          contract = this.getContract(CONTRACTS.VEHICLE_NFT, VehicleNFTABI.abi, false);
          break;
        case 'land':
          contract = this.getContract(CONTRACTS.LAND_NFT, LandNFTABI.abi, false);
          break;
        default:
          throw new Error('Invalid NFT type');
      }

      const balance = await contract.balanceOf(userAddress);
      const tokenIds = [];

      for (let i = 0; i < balance.toNumber(); i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
        tokenIds.push(tokenId.toNumber());
      }

      return tokenIds;
    } catch (error) {
      console.error('Failed to get user NFTs:', error);
      return [];
    }
  }

  // 네트워크 변경
  async switchNetwork(chainId: number): Promise<boolean> {
    try {
      if (!window.ethereum) return false;

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      return true;
    } catch (error) {
      // BSC 네트워크 추가 시도
      if (chainId === 56 || chainId === 97) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: chainId === 56 ? 'BNB Smart Chain' : 'BNB Smart Chain Testnet',
                nativeCurrency: {
                  name: 'BNB',
                  symbol: 'BNB',
                  decimals: 18,
                },
                rpcUrls: chainId === 56 
                  ? ['https://bsc-dataseed.binance.org/']
                  : ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
                blockExplorerUrls: chainId === 56
                  ? ['https://bscscan.com']
                  : ['https://testnet.bscscan.com'],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add network:', addError);
          return false;
        }
      }
      console.error('Failed to switch network:', error);
      return false;
    }
  }

  // 현재 연결 상태 확인
  get isConnected(): boolean {
    return !!this.provider && !!this.signer;
  }

  // 현재 네트워크 ID 조회
  async getChainId(): Promise<number | null> {
    if (!this.provider) return null;
    
    try {
      const network = await this.provider.getNetwork();
      return network.chainId;
    } catch (error) {
      console.error('Failed to get chain ID:', error);
      return null;
    }
  }

  // 현재 연결된 지갑 주소 조회
  async getAccount(): Promise<string | null> {
    if (!this.signer) return null;
    
    try {
      return await this.signer.getAddress();
    } catch (error) {
      console.error('Failed to get account:', error);
      return null;
    }
  }

  // 가스 가격 예측
  async estimateGasPrice(): Promise<string | null> {
    if (!this.provider) return null;
    
    try {
      const gasPrice = await this.provider.getGasPrice();
      return ethers.utils.formatUnits(gasPrice, 'gwei');
    } catch (error) {
      console.error('Failed to estimate gas price:', error);
      return null;
    }
  }
}

// 싱글톤 인스턴스 생성
const web3Service = new Web3Service();

// 글로벌 타입 선언
declare global {
  interface Window {
    ethereum: any;
  }
}

export default web3Service;
export { Web3Service };
