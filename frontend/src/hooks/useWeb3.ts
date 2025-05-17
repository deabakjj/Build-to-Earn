import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAuthContext } from '../contexts/AuthContext';

export interface Web3Error {
  code: string;
  message: string;
  reason?: string;
}

export interface NetworkConfig {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
}

export interface UseWeb3Return {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  account: string | null;
  network: string | null;
  chainId: string | null;
  balance: string | null;
  
  // Provider & Signer
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: string) => Promise<void>;
  addNetwork: (networkConfig: NetworkConfig) => Promise<void>;
  
  // Transaction methods
  sendTransaction: (transaction: ethers.providers.TransactionRequest) => Promise<ethers.providers.TransactionResponse>;
  signMessage: (message: string) => Promise<string>;
  
  // Error handling
  error: Web3Error | null;
  clearError: () => void;
}

// CreataChain - Catena 메인넷 설정
export const CREATACHAIN_MAINNET: NetworkConfig = {
  chainId: '0x138D4', // 80084
  chainName: 'CreataChain Mainnet',
  nativeCurrency: {
    name: 'CreataChain',
    symbol: 'CRATE',
    decimals: 18,
  },
  rpcUrls: ['https://mainnet.catenachain.com'],
  blockExplorerUrls: ['https://explorer.catenachain.com'],
};

// 지원되는 네트워크 목록
export const SUPPORTED_NETWORKS: { [key: string]: NetworkConfig } = {
  '0x138D4': CREATACHAIN_MAINNET,
  // 개발용 네트워크 추가 가능
  // '0x4': RINKEBY_TESTNET,
};

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const useWeb3 = (): UseWeb3Return => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [error, setError] = useState<Web3Error | null>(null);

  const { setUser, clearUser } = useAuthContext();

  // 에러 상태 초기화
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 에러 처리 유틸리티
  const handleError = useCallback((err: any): Web3Error => {
    if (err.code === 'UNSUPPORTED_OPERATION') {
      return {
        code: 'UNSUPPORTED_OPERATION',
        message: '지원되지 않는 작업입니다.',
        reason: err.reason,
      };
    }
    if (err.code === 'NETWORK_ERROR') {
      return {
        code: 'NETWORK_ERROR',
        message: '네트워크 오류가 발생했습니다.',
        reason: err.reason,
      };
    }
    if (err.code === 4001) {
      return {
        code: 'USER_REJECTED',
        message: '사용자가 요청을 거부했습니다.',
      };
    }
    if (err.code === -32002) {
      return {
        code: 'ALREADY_PENDING',
        message: '이미 요청이 진행 중입니다.',
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: err.message || '알 수 없는 오류가 발생했습니다.',
      reason: err.reason,
    };
  }, []);

  // 계정 정보 업데이트
  const updateAccountInfo = useCallback(async (provider: ethers.providers.Web3Provider) => {
    try {
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        const address = accounts[0];
        setAccount(address);
        
        // 잔액 조회
        const balance = await provider.getBalance(address);
        setBalance(ethers.utils.formatEther(balance));
        
        // 네트워크 정보 조회
        const network = await provider.getNetwork();
        setChainId(`0x${network.chainId.toString(16)}`);
        setNetwork(network.name);
        
        // Signer 설정
        const signer = provider.getSigner();
        setSigner(signer);
        
        // 인증 상태 업데이트
        setUser({
          walletAddress: address,
          isConnected: true,
        });
        
        setIsConnected(true);
      } else {
        disconnect();
      }
    } catch (err) {
      const error = handleError(err);
      setError(error);
    }
  }, [handleError, setUser]);

  // 연결 함수
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError({
        code: 'NO_WALLET',
        message: '메타마스크 또는 Web3 지갑을 설치해주세요.',
      });
      return;
    }

    try {
      setIsConnecting(true);
      
      // 지갑 연결 요청
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);
      
      await updateAccountInfo(provider);
      
      // 네트워크 확인 및 자동 스위치
      const network = await provider.getNetwork();
      const currentChainId = `0x${network.chainId.toString(16)}`;
      
      if (!SUPPORTED_NETWORKS[currentChainId]) {
        await switchNetwork(CREATACHAIN_MAINNET.chainId);
      }
    } catch (err) {
      const error = handleError(err);
      setError(error);
      disconnect();
    } finally {
      setIsConnecting(false);
    }
  }, [updateAccountInfo, handleError]);

  // 연결 해제 함수
  const disconnect = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setNetwork(null);
    setChainId(null);
    setBalance(null);
    setProvider(null);
    setSigner(null);
    clearUser();
  }, [clearUser]);

  // 네트워크 전환
  const switchNetwork = useCallback(async (targetChainId: string) => {
    if (!window.ethereum) {
      setError({
        code: 'NO_WALLET',
        message: '메타마스크 또는 Web3 지갑을 설치해주세요.',
      });
      return;
    }

    try {
      // 네트워크 전환 시도
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
    } catch (switchError: any) {
      // 네트워크가 추가되지 않은 경우 추가 시도
      if (switchError.code === 4902) {
        const networkConfig = SUPPORTED_NETWORKS[targetChainId];
        if (networkConfig) {
          await addNetwork(networkConfig);
        } else {
          setError({
            code: 'UNSUPPORTED_NETWORK',
            message: '지원되지 않는 네트워크입니다.',
          });
        }
      } else {
        const error = handleError(switchError);
        setError(error);
      }
    }
  }, [handleError]);

  // 네트워크 추가
  const addNetwork = useCallback(async (networkConfig: NetworkConfig) => {
    if (!window.ethereum) {
      setError({
        code: 'NO_WALLET',
        message: '메타마스크 또는 Web3 지갑을 설치해주세요.',
      });
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig],
      });
    } catch (err) {
      const error = handleError(err);
      setError(error);
    }
  }, [handleError]);

  // 트랜잭션 전송
  const sendTransaction = useCallback(async (transaction: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionResponse> => {
    if (!signer) {
      throw new Error('Signer not available');
    }

    try {
      return await signer.sendTransaction(transaction);
    } catch (err) {
      const error = handleError(err);
      setError(error);
      throw error;
    }
  }, [signer, handleError]);

  // 메시지 서명
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!signer) {
      throw new Error('Signer not available');
    }

    try {
      return await signer.signMessage(message);
    } catch (err) {
      const error = handleError(err);
      setError(error);
      throw error;
    }
  }, [signer, handleError]);

  // 이벤트 리스너 설정
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (provider) {
        await updateAccountInfo(provider);
      }
    };

    const handleChainChanged = async (chainId: string) => {
      setChainId(chainId);
      if (provider) {
        const network = await provider.getNetwork();
        setNetwork(network.name);
      }
    };

    const handleDisconnect = () => {
      disconnect();
    };

    // 이벤트 리스너 등록
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    // 초기 연결 상태 확인
    const checkConnection = async () => {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          setProvider(provider);
          await updateAccountInfo(provider);
        }
      } catch (err) {
        console.error('Failed to check initial connection:', err);
      }
    };

    checkConnection();

    // 클린업
    return () => {
      window.ethereum.off('accountsChanged', handleAccountsChanged);
      window.ethereum.off('chainChanged', handleChainChanged);
      window.ethereum.off('disconnect', handleDisconnect);
    };
  }, [provider, updateAccountInfo, disconnect]);

  return {
    isConnected,
    isConnecting,
    account,
    network,
    chainId,
    balance,
    provider,
    signer,
    connect,
    disconnect,
    switchNetwork,
    addNetwork,
    sendTransaction,
    signMessage,
    error,
    clearError,
  };
};

export default useWeb3;
