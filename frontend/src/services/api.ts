import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API 기본 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_TIMEOUT = 30000;

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API 에러 타입
export class ApiError extends Error {
  statusCode: number;
  response?: any;

  constructor(message: string, statusCode: number, response?: any) {
    super(message);
    this.statusCode = statusCode;
    this.response = response;
    this.name = 'ApiError';
  }
}

// Axios 인스턴스 생성
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 요청 인터셉터
  instance.interceptors.request.use(
    (config) => {
      // 토큰 자동 추가
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // API 키 추가 (필요한 경우)
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;
      if (apiKey) {
        config.headers['X-API-Key'] = apiKey;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // 토큰 만료 처리
      if (error.response?.status === 401) {
        // 토큰 제거 및 로그인 페이지로 리디렉션
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
        
        // 리디렉션 처리
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }

      // 에러 포맷팅
      const apiError = new ApiError(
        error.response?.data?.message || error.message || 'API request failed',
        error.response?.status || 500,
        error.response?.data
      );

      return Promise.reject(apiError);
    }
  );

  return instance;
};

// API 클라이언트 클래스
class ApiClient {
  private api: AxiosInstance;

  constructor() {
    this.api = createAxiosInstance();
  }

  // GET 요청
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.get(url, config);
      
      if (!response.data.success) {
        throw new ApiError(
          response.data.error || 'Request failed',
          response.status,
          response.data
        );
      }

      return response.data.data as T;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // POST 요청
  async post<T, D = any>(
    url: string, 
    data?: D, 
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.post(url, data, config);
      
      if (!response.data.success) {
        throw new ApiError(
          response.data.error || 'Request failed',
          response.status,
          response.data
        );
      }

      return response.data.data as T;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // PUT 요청
  async put<T, D = any>(
    url: string, 
    data?: D, 
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.put(url, data, config);
      
      if (!response.data.success) {
        throw new ApiError(
          response.data.error || 'Request failed',
          response.status,
          response.data
        );
      }

      return response.data.data as T;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // PATCH 요청
  async patch<T, D = any>(
    url: string, 
    data?: D, 
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.patch(url, data, config);
      
      if (!response.data.success) {
        throw new ApiError(
          response.data.error || 'Request failed',
          response.status,
          response.data
        );
      }

      return response.data.data as T;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // DELETE 요청
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.delete(url, config);
      
      if (!response.data.success) {
        throw new ApiError(
          response.data.error || 'Request failed',
          response.status,
          response.data
        );
      }

      return response.data.data as T;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 파일 업로드
  async upload<T>(
    url: string, 
    file: File | Blob, 
    onProgress?: (percentage: number) => void
  ): Promise<T> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response: AxiosResponse<ApiResponse<T>> = await this.api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentage);
          }
        },
      });

      if (!response.data.success) {
        throw new ApiError(
          response.data.error || 'Upload failed',
          response.status,
          response.data
        );
      }

      return response.data.data as T;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // 에러 처리 헬퍼
  private handleError(error: any): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      return new ApiError(
        error.response?.data?.message || error.message,
        error.response?.status || 500,
        error.response?.data
      );
    }

    return new ApiError(
      error.message || 'Unknown error occurred',
      500
    );
  }

  // 쿼리 파라미터 생성
  static buildQueryParams(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(item => {
            searchParams.append(`${key}[]`, String(item));
          });
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    return searchParams.toString();
  }
}

// API 클라이언트 인스턴스
export const api = new ApiClient();

// 도메인별 API 클라이언트
export const authApi = {
  login: (credentials: { email: string; password: string }) => 
    api.post('/auth/login', credentials),
  
  walletLogin: (data: { walletAddress: string; signature: string }) => 
    api.post('/auth/wallet-login', data),
  
  register: (data: { email: string; password: string; nickname: string }) => 
    api.post('/auth/register', data),
  
  logout: () => 
    api.post('/auth/logout'),
  
  refreshToken: () => 
    api.post('/auth/refresh'),
  
  requestPasswordReset: (email: string) => 
    api.post('/auth/password-reset-request', { email }),
  
  resetPassword: (token: string, newPassword: string) => 
    api.post('/auth/password-reset', { token, newPassword }),
  
  verifyEmail: (token: string) => 
    api.post('/auth/verify-email', { token }),
};

export const userApi = {
  getProfile: () => 
    api.get('/users/profile'),
  
  updateProfile: (data: any) => 
    api.patch('/users/profile', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.post('/users/change-password', data),
  
  deleteAccount: () => 
    api.delete('/users/account'),
  
  getStats: () => 
    api.get('/users/stats'),
  
  enable2FA: () => 
    api.post('/users/2fa/enable'),
  
  verify2FA: (code: string) => 
    api.post('/users/2fa/verify', { code }),
  
  disable2FA: (code: string) => 
    api.post('/users/2fa/disable', { code }),
};

export const gameApi = {
  getWorld: (worldId?: string) => 
    api.get(`/game/world${worldId ? `/${worldId}` : ''}`),
  
  saveWorld: (worldData: any) => 
    api.post('/game/world', worldData),
  
  placeItem: (data: { worldId: string; itemId: string; position: any }) => 
    api.post('/game/place-item', data),
  
  removeItem: (data: { worldId: string; itemId: string }) => 
    api.delete('/game/remove-item', { data }),
  
  collectResource: (data: { worldId: string; resourceId: string }) => 
    api.post('/game/collect-resource', data),
  
  craftItem: (data: { recipe: string; materials: Record<string, number> }) => 
    api.post('/game/craft', data),
  
  startQuest: (questId: string) => 
    api.post(`/game/quests/${questId}/start`),
  
  completeQuest: (questId: string) => 
    api.post(`/game/quests/${questId}/complete`),
  
  getQuests: () => 
    api.get('/game/quests'),
};

export const nftApi = {
  mintNFT: (data: { 
    itemId: string; 
    metadata: any; 
    price?: number 
  }) => 
    api.post('/nft/mint', data),
  
  getNFTs: (params?: { 
    owner?: string; 
    category?: string; 
    page?: number; 
    limit?: number 
  }) => 
    api.get(`/nft?${params ? ApiClient.buildQueryParams(params) : ''}`),
  
  getNFT: (tokenId: string) => 
    api.get(`/nft/${tokenId}`),
  
  updateNFTPrice: (tokenId: string, price: number) => 
    api.patch(`/nft/${tokenId}/price`, { price }),
  
  listNFT: (tokenId: string, price: number) => 
    api.post(`/nft/${tokenId}/list`, { price }),
  
  delistNFT: (tokenId: string) => 
    api.post(`/nft/${tokenId}/delist`),
  
  transferNFT: (tokenId: string, to: string) => 
    api.post(`/nft/${tokenId}/transfer`, { to }),
};

export const marketplaceApi = {
  search: (params: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    rarity?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) => 
    api.get(`/marketplace/search?${ApiClient.buildQueryParams(params)}`),
  
  buy: (tokenId: string) => 
    api.post(`/marketplace/${tokenId}/buy`),
  
  placeBid: (tokenId: string, amount: number) => 
    api.post(`/marketplace/${tokenId}/bid`, { amount }),
  
  acceptBid: (tokenId: string, bidId: string) => 
    api.post(`/marketplace/${tokenId}/accept-bid/${bidId}`),
  
  createAuction: (data: {
    tokenId: string;
    startPrice: number;
    reservePrice?: number;
    duration: number;
  }) => 
    api.post('/marketplace/auction', data),
  
  getFeatured: () => 
    api.get('/marketplace/featured'),
  
  getHistory: (tokenId: string) => 
    api.get(`/marketplace/${tokenId}/history`),
};

export const seasonApi = {
  getCurrent: () => 
    api.get('/seasons/current'),
  
  getAll: () => 
    api.get('/seasons'),
  
  join: (seasonId: string) => 
    api.post(`/seasons/${seasonId}/join`),
  
  getProgress: (seasonId: string) => 
    api.get(`/seasons/${seasonId}/progress`),
  
  claimReward: (seasonId: string, rewardId: string) => 
    api.post(`/seasons/${seasonId}/rewards/${rewardId}/claim`),
  
  getLeaderboard: (seasonId: string) => 
    api.get(`/seasons/${seasonId}/leaderboard`),
};

export const guildApi = {
  getAll: (params?: { 
    page?: number; 
    limit?: number; 
    search?: string 
  }) => 
    api.get(`/guilds?${params ? ApiClient.buildQueryParams(params) : ''}`),
  
  getGuild: (guildId: string) => 
    api.get(`/guilds/${guildId}`),
  
  create: (data: { 
    name: string; 
    description: string; 
    image?: string; 
    isPublic: boolean 
  }) => 
    api.post('/guilds', data),
  
  join: (guildId: string) => 
    api.post(`/guilds/${guildId}/join`),
  
  leave: (guildId: string) => 
    api.post(`/guilds/${guildId}/leave`),
  
  invite: (guildId: string, userId: string) => 
    api.post(`/guilds/${guildId}/invite`, { userId }),
  
  acceptInvite: (inviteId: string) => 
    api.post(`/guilds/invites/${inviteId}/accept`),
  
  declineInvite: (inviteId: string) => 
    api.post(`/guilds/invites/${inviteId}/decline`),
  
  getProjects: (guildId: string) => 
    api.get(`/guilds/${guildId}/projects`),
  
  createProject: (guildId: string, data: {
    name: string;
    description: string;
    requirements: any;
  }) => 
    api.post(`/guilds/${guildId}/projects`, data),
  
  contributeToProject: (projectId: string, contribution: any) => 
    api.post(`/guilds/projects/${projectId}/contribute`, contribution),
};

export const socialApi = {
  getFriends: () => 
    api.get('/social/friends'),
  
  searchUsers: (query: string) => 
    api.get(`/social/search?q=${encodeURIComponent(query)}`),
  
  sendFriendRequest: (userId: string) => 
    api.post(`/social/friend-request/${userId}`),
  
  acceptFriendRequest: (requestId: string) => 
    api.post(`/social/friend-request/${requestId}/accept`),
  
  declineFriendRequest: (requestId: string) => 
    api.post(`/social/friend-request/${requestId}/decline`),
  
  removeFriend: (userId: string) => 
    api.delete(`/social/friends/${userId}`),
  
  getChatHistory: (userId: string, page?: number) => 
    api.get(`/social/chat/${userId}?page=${page || 1}`),
  
  sendMessage: (userId: string, message: string) => 
    api.post(`/social/chat/${userId}`, { message }),
  
  blockUser: (userId: string) => 
    api.post(`/social/block/${userId}`),
  
  unblockUser: (userId: string) => 
    api.delete(`/social/block/${userId}`),
};

// WebSocket 연결 유틸리티
export const createWebSocket = (
  endpoint: string, 
  onMessage: (data: any) => void,
  onError?: (error: Event) => void,
  onClose?: (event: CloseEvent) => void
): WebSocket => {
  const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000'}/ws/${endpoint}`;
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  
  const ws = new WebSocket(`${wsUrl}?token=${token}`);
  
  ws.onopen = () => {
    console.log(`WebSocket connected: ${endpoint}`);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };
  
  ws.onerror = (event) => {
    console.error(`WebSocket error: ${endpoint}`, event);
    onError?.(event);
  };
  
  ws.onclose = (event) => {
    console.log(`WebSocket closed: ${endpoint}`, event.code, event.reason);
    onClose?.(event);
  };
  
  return ws;
};

export default api;
