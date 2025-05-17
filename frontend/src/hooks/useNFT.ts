import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import useWeb3 from './useWeb3';
import { NFTType, NFTRarity } from '../types/NFT';
import { CurrencyType } from '../types/Marketplace';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
  attributes: {
    trait_type: string;
    value: string | number;
    display_type?: string;
  }[];
  properties: {
    materials?: string[];
    dimensions?: {
      width: number;
      height: number;
      depth: number;
    };
    functionalities?: string[];
    durability?: number;
    [key: string]: any;
  };
}

export interface NFT {
  tokenId: string;
  contractAddress: string;
  type: NFTType;
  rarity: NFTRarity;
  metadata: NFTMetadata;
  creator: string;
  currentOwner: string;
  isListed: boolean;
  listingPrice?: number;
  currency?: CurrencyType;
  usage: {
    totalTimesUsed: number;
    totalEarnings: number;
    averageRating: number;
  };
  gameProperties: {
    level: number;
    experience: number;
    maxDurability: number;
    currentDurability: number;
  };
}

export interface CreateNFTParams {
  name: string;
  description: string;
  image: string;
  type: NFTType;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
  materials?: string[];
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  functionalities?: string[];
}

export interface ListNFTParams {
  tokenId: string;
  price: number;
  currency: CurrencyType;
  listingType: 'FIXED_PRICE' | 'AUCTION';
  auctionDetails?: {
    startPrice: number;
    reservePrice?: number;
    duration: number; // in seconds
    minimumBidIncrement: number;
  };
}

interface UseNFTReturn {
  // NFT State
  nfts: NFT[];
  myNFTs: NFT[];
  currentNFT: NFT | null;
  isLoading: boolean;
  error: string | null;
  
  // NFT Actions
  createNFT: (params: CreateNFTParams) => Promise<string>;
  listNFT: (params: ListNFTParams) => Promise<void>;
  buyNFT: (tokenId: string, price: number, currency: CurrencyType) => Promise<void>;
  cancelListing: (tokenId: string) => Promise<void>;
  updateNFTPrice: (tokenId: string, newPrice: number) => Promise<void>;
  transferNFT: (tokenId: string, to: string) => Promise<void>;
  
  // NFT Queries
  fetchNFT: (tokenId: string) => Promise<NFT>;
  fetchMyNFTs: () => Promise<NFT[]>;
  fetchMarketplaceNFTs: (filters?: {
    type?: NFTType;
    rarity?: NFTRarity;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  }) => Promise<NFT[]>;
  
  // NFT Utility
  uploadToIPFS: (metadata: NFTMetadata) => Promise<string>;
  getContractAddress: (type: NFTType) => string;
  calculateFees: (price: number) => {
    platformFee: number;
    royaltyFee: number;
    serviceFee: number;
    total: number;
  };
  
  // State management
  clearError: () => void;
  setCurrentNFT: (nft: NFT | null) => void;
}

// NFT 컨트랙트 주소 (실제 배포 시 업데이트 필요)
const NFT_CONTRACTS = {
  [NFTType.ITEM]: process.env.NEXT_PUBLIC_ITEM_NFT_CONTRACT || '',
  [NFTType.BUILDING]: process.env.NEXT_PUBLIC_BUILDING_NFT_CONTRACT || '',
  [NFTType.VEHICLE]: process.env.NEXT_PUBLIC_VEHICLE_NFT_CONTRACT || '',
  [NFTType.LAND]: process.env.NEXT_PUBLIC_LAND_NFT_CONTRACT || '',
};

// Marketplace 컨트랙트 주소
const MARKETPLACE_CONTRACT = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT || '';

// IPFS Gateway
const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

export const useNFT = (): UseNFTReturn => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [myNFTs, setMyNFTs] = useState<NFT[]>([]);
  const [currentNFT, setCurrentNFT] = useState<NFT | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { provider, signer, account, isConnected } = useWeb3();

  // API 기본 URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // 에러 상태 초기화
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // NFT 컨트랙트 주소 조회
  const getContractAddress = useCallback((type: NFTType): string => {
    const address = NFT_CONTRACTS[type];
    if (!address) {
      throw new Error(`Contract address not found for NFT type: ${type}`);
    }
    return address;
  }, []);

  // 수수료 계산
  const calculateFees = useCallback((price: number) => {
    const platformFee = price * 0.025; // 2.5%
    const royaltyFee = price * 0.05;   // 5%
    const serviceFee = price * 0.005;  // 0.5%
    const total = platformFee + royaltyFee + serviceFee;
    
    return {
      platformFee,
      royaltyFee,
      serviceFee,
      total,
    };
  }, []);

  // IPFS 업로드
  const uploadToIPFS = useCallback(async (metadata: NFTMetadata): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('metadata', JSON.stringify(metadata));
      
      const response = await fetch(`${API_URL}/nft/upload-metadata`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload to IPFS');
      }
      
      const { ipfsHash } = await response.json();
      return ipfsHash;
    } catch (err) {
      console.error('IPFS upload error:', err);
      throw err;
    }
  }, [API_URL]);

  // NFT 생성
  const createNFT = useCallback(async (params: CreateNFTParams): Promise<string> => {
    if (!signer || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);

      // 메타데이터 구성
      const metadata: NFTMetadata = {
        name: params.name,
        description: params.description,
        image: params.image,
        attributes: params.attributes,
        properties: {
          materials: params.materials,
          dimensions: params.dimensions,
          functionalities: params.functionalities,
        },
      };

      // IPFS에 메타데이터 업로드
      const metadataHash = await uploadToIPFS(metadata);
      const tokenURI = `${IPFS_GATEWAY}${metadataHash}`;

      // 컨트랙트 ABI 가져오기
      const contractAddress = getContractAddress(params.type);
      
      // 임시 ABI - 실제 배포 시 전체 ABI로 교체 필요
      const abi = [
        'function mint(address to, string memory tokenURI) public returns (uint256)',
      ];
      
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      // NFT 민팅
      const tx = await contract.mint(account, tokenURI);
      const receipt = await tx.wait();
      
      // 백엔드에 NFT 정보 저장
      const nftData = {
        tokenId: receipt.logs[0].topics[3], // Transfer 이벤트에서 토큰 ID 추출
        contractAddress,
        type: params.type,
        metadata,
        creator: account,
        currentOwner: account,
        ipfsHash: metadataHash,
      };
      
      const response = await fetch(`${API_URL}/nft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nftData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save NFT to database');
      }
      
      // NFT 목록 업데이트
      await fetchMyNFTs();
      
      return nftData.tokenId;
    } catch (err) {
      console.error('Create NFT error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create NFT');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer, account, uploadToIPFS, getContractAddress, fetchMyNFTs, API_URL]);

  // NFT 리스팅
  const listNFT = useCallback(async (params: ListNFTParams): Promise<void> => {
    if (!signer || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);

      // 마켓플레이스 컨트랙트 가져오기
      const abi = [
        'function listItem(address nftContract, uint256 tokenId, uint256 price, string memory currency, string memory listingType) public',
        'function createAuction(address nftContract, uint256 tokenId, uint256 startPrice, uint256 reservePrice, uint256 duration) public',
      ];
      
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, abi, signer);
      
      // NFT 승인
      const nftType = await fetchNFT(params.tokenId).then(nft => nft.type);
      const nftContractAddress = getContractAddress(nftType);
      
      const nftAbi = [
        'function approve(address to, uint256 tokenId) public',
      ];
      
      const nftContract = new ethers.Contract(nftContractAddress, nftAbi, signer);
      const approveTx = await nftContract.approve(MARKETPLACE_CONTRACT, params.tokenId);
      await approveTx.wait();
      
      // 리스팅 타입에 따른 처리
      if (params.listingType === 'FIXED_PRICE') {
        const priceInWei = ethers.utils.parseEther(params.price.toString());
        const listTx = await contract.listItem(nftContractAddress, params.tokenId, priceInWei, params.currency, params.listingType);
        await listTx.wait();
      } else if (params.listingType === 'AUCTION' && params.auctionDetails) {
        const startPriceInWei = ethers.utils.parseEther(params.auctionDetails.startPrice.toString());
        const reservePriceInWei = params.auctionDetails.reservePrice 
          ? ethers.utils.parseEther(params.auctionDetails.reservePrice.toString())
          : ethers.constants.Zero;
        
        const auctionTx = await contract.createAuction(
          nftContractAddress,
          params.tokenId,
          startPriceInWei,
          reservePriceInWei,
          params.auctionDetails.duration
        );
        await auctionTx.wait();
      }
      
      // 백엔드에 리스팅 정보 업데이트
      const listingData = {
        tokenId: params.tokenId,
        price: params.price,
        currency: params.currency,
        listingType: params.listingType,
        auctionDetails: params.auctionDetails,
      };
      
      const response = await fetch(`${API_URL}/marketplace/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update listing in database');
      }
      
      // NFT 목록 업데이트
      await fetchMyNFTs();
      
    } catch (err) {
      console.error('List NFT error:', err);
      setError(err instanceof Error ? err.message : 'Failed to list NFT');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer, account, fetchNFT, getContractAddress, fetchMyNFTs, API_URL]);

  // NFT 구매
  const buyNFT = useCallback(async (tokenId: string, price: number, currency: CurrencyType): Promise<void> => {
    if (!signer || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);

      const abi = [
        'function buyNow(address nftContract, uint256 tokenId) public payable',
      ];
      
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, abi, signer);
      
      // NFT 정보 가져오기
      const nft = await fetchNFT(tokenId);
      const nftContractAddress = getContractAddress(nft.type);
      
      // ETH로 구매
      if (currency === CurrencyType.VXC) {
        const priceInWei = ethers.utils.parseEther(price.toString());
        const tx = await contract.buyNow(nftContractAddress, tokenId, { value: priceInWei });
        await tx.wait();
      } else {
        // 토큰으로 구매하는 경우 별도 구현 필요
        throw new Error('Token payment not implemented yet');
      }
      
      // 백엔드에 구매 정보 업데이트
      const purchaseData = {
        tokenId,
        buyer: account,
        price,
        currency,
      };
      
      const response = await fetch(`${API_URL}/marketplace/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update purchase in database');
      }
      
      // NFT 목록 업데이트
      await fetchMyNFTs();
      
    } catch (err) {
      console.error('Buy NFT error:', err);
      setError(err instanceof Error ? err.message : 'Failed to buy NFT');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer, account, fetchNFT, getContractAddress, fetchMyNFTs, API_URL]);

  // 리스팅 취소
  const cancelListing = useCallback(async (tokenId: string): Promise<void> => {
    if (!signer || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);

      const abi = [
        'function cancelListing(address nftContract, uint256 tokenId) public',
      ];
      
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, abi, signer);
      
      // NFT 정보 가져오기
      const nft = await fetchNFT(tokenId);
      const nftContractAddress = getContractAddress(nft.type);
      
      const tx = await contract.cancelListing(nftContractAddress, tokenId);
      await tx.wait();
      
      // 백엔드에 취소 정보 업데이트
      const response = await fetch(`${API_URL}/marketplace/cancel/${tokenId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update cancellation in database');
      }
      
      // NFT 목록 업데이트
      await fetchMyNFTs();
      
    } catch (err) {
      console.error('Cancel listing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel listing');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer, account, fetchNFT, getContractAddress, fetchMyNFTs, API_URL]);

  // 가격 업데이트
  const updateNFTPrice = useCallback(async (tokenId: string, newPrice: number): Promise<void> => {
    if (!signer || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);

      const abi = [
        'function updatePrice(address nftContract, uint256 tokenId, uint256 newPrice) public',
      ];
      
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, abi, signer);
      
      // NFT 정보 가져오기
      const nft = await fetchNFT(tokenId);
      const nftContractAddress = getContractAddress(nft.type);
      
      const priceInWei = ethers.utils.parseEther(newPrice.toString());
      const tx = await contract.updatePrice(nftContractAddress, tokenId, priceInWei);
      await tx.wait();
      
      // 백엔드에 가격 변경 반영
      const response = await fetch(`${API_URL}/marketplace/update-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId,
          newPrice,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update price in database');
      }
      
      // NFT 목록 업데이트
      await fetchMyNFTs();
      
    } catch (err) {
      console.error('Update price error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update price');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer, account, fetchNFT, getContractAddress, fetchMyNFTs, API_URL]);

  // NFT 전송
  const transferNFT = useCallback(async (tokenId: string, to: string): Promise<void> => {
    if (!signer || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      setError(null);

      // NFT 정보 가져오기
      const nft = await fetchNFT(tokenId);
      const nftContractAddress = getContractAddress(nft.type);
      
      const abi = [
        'function transferFrom(address from, address to, uint256 tokenId) public',
      ];
      
      const contract = new ethers.Contract(nftContractAddress, abi, signer);
      
      const tx = await contract.transferFrom(account, to, tokenId);
      await tx.wait();
      
      // 백엔드에 소유권 변경 반영
      const response = await fetch(`${API_URL}/nft/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId,
          from: account,
          to,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update ownership in database');
      }
      
      // NFT 목록 업데이트
      await fetchMyNFTs();
      
    } catch (err) {
      console.error('Transfer NFT error:', err);
      setError(err instanceof Error ? err.message : 'Failed to transfer NFT');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signer, account, fetchNFT, getContractAddress, fetchMyNFTs, API_URL]);

  // NFT 조회
  const fetchNFT = useCallback(async (tokenId: string): Promise<NFT> => {
    try {
      const response = await fetch(`${API_URL}/nft/${tokenId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch NFT');
      }
      const nft = await response.json();
      return nft;
    } catch (err) {
      console.error('Fetch NFT error:', err);
      throw err;
    }
  }, [API_URL]);

  // 내 NFT 목록 조회
  const fetchMyNFTs = useCallback(async (): Promise<NFT[]> => {
    if (!account) {
      return [];
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/nft/my-nfts?owner=${account}`);
      if (!response.ok) {
        throw new Error('Failed to fetch my NFTs');
      }
      const nfts = await response.json();
      setMyNFTs(nfts);
      return nfts;
    } catch (err) {
      console.error('Fetch my NFTs error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch my NFTs');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [account, API_URL]);

  // 마켓플레이스 NFT 목록 조회
  const fetchMarketplaceNFTs = useCallback(async (filters?: {
    type?: NFTType;
    rarity?: NFTRarity;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  }): Promise<NFT[]> => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.rarity) params.append('rarity', filters.rarity);
      if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      
      const response = await fetch(`${API_URL}/marketplace/listings?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch marketplace NFTs');
      }
      const nfts = await response.json();
      setNfts(nfts);
      return nfts;
    } catch (err) {
      console.error('Fetch marketplace NFTs error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch marketplace NFTs');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  // 초기 데이터 로딩
  useEffect(() => {
    if (account && isConnected) {
      fetchMyNFTs();
      fetchMarketplaceNFTs();
    }
  }, [account, isConnected, fetchMyNFTs, fetchMarketplaceNFTs]);

  return {
    nfts,
    myNFTs,
    currentNFT,
    isLoading,
    error,
    createNFT,
    listNFT,
    buyNFT,
    cancelListing,
    updateNFTPrice,
    transferNFT,
    fetchNFT,
    fetchMyNFTs,
    fetchMarketplaceNFTs,
    uploadToIPFS,
    getContractAddress,
    calculateFees,
    clearError,
    setCurrentNFT,
  };
};

export default useNFT;
