import { useState, useEffect, useCallback } from 'react';
import { User } from '../types/User';

// 인증 상태 인터페이스
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
}

// 로그인 자격증명 인터페이스
export interface LoginCredentials {
  email?: string;
  password?: string;
  walletAddress?: string;
  signature?: string;
}

// 회원가입 정보 인터페이스
export interface RegisterData {
  email: string;
  password: string;
  nickname: string;
  walletAddress?: string;
}

// 초기 인증 상태
const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  token: null
};

// 인증 관련 커스텀 훅
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  // 인증 상태 업데이트 헬퍼 함수
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  }, []);

  // 토큰 저장 함수
  const saveToken = useCallback((token: string) => {
    localStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_token', token);
  }, []);

  // 토큰 제거 함수
  const removeToken = useCallback(() => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
  }, []);

  // 토큰 조회 함수
  const getToken = useCallback(() => {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }, []);

  // 이메일/비밀번호 로그인
  const loginWithPassword = useCallback(async (
    credentials: Required<Pick<LoginCredentials, 'email' | 'password'>>
  ) => {
    try {
      updateAuthState({ isLoading: true, error: null });

      // TODO: 실제 API 호출
      // const response = await authService.login(credentials);
      
      // 시뮬레이션용 응답
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '1',
            email: credentials.email,
            nickname: 'TestUser',
            profileImage: null,
            walletAddress: null,
            role: 'player',
            preferences: {},
            stats: {
              level: 1,
              experience: 0,
              itemsCreated: 0,
              totalEarnings: 0,
              totalSpending: 0
            }
          } as User,
          token: 'mock_jwt_token'
        }
      };

      if (mockResponse.success) {
        saveToken(mockResponse.data.token);
        updateAuthState({
          user: mockResponse.data.user,
          isAuthenticated: true,
          token: mockResponse.data.token,
          isLoading: false,
          error: null
        });
        return true;
      }
      
      throw new Error('Login failed');
    } catch (err) {
      updateAuthState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed'
      });
      return false;
    }
  }, [updateAuthState, saveToken]);

  // 지갑 연결 로그인
  const loginWithWallet = useCallback(async (
    credentials: Required<Pick<LoginCredentials, 'walletAddress' | 'signature'>>
  ) => {
    try {
      updateAuthState({ isLoading: true, error: null });

      // TODO: 실제 API 호출 및 서명 검증
      // const response = await authService.walletLogin(credentials);
      
      // 시뮬레이션용 응답
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '2',
            email: null,
            nickname: 'WalletUser',
            profileImage: null,
            walletAddress: credentials.walletAddress,
            role: 'player',
            preferences: {},
            stats: {
              level: 5,
              experience: 1200,
              itemsCreated: 15,
              totalEarnings: 543.21,
              totalSpending: 234.56
            }
          } as User,
          token: 'mock_jwt_token_wallet'
        }
      };

      if (mockResponse.success) {
        saveToken(mockResponse.data.token);
        updateAuthState({
          user: mockResponse.data.user,
          isAuthenticated: true,
          token: mockResponse.data.token,
          isLoading: false,
          error: null
        });
        return true;
      }
      
      throw new Error('Wallet login failed');
    } catch (err) {
      updateAuthState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Wallet login failed'
      });
      return false;
    }
  }, [updateAuthState, saveToken]);

  // 회원가입
  const register = useCallback(async (data: RegisterData) => {
    try {
      updateAuthState({ isLoading: true, error: null });

      // TODO: 실제 API 호출
      // const response = await authService.register(data);
      
      // 시뮬레이션용 응답
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '3',
            email: data.email,
            nickname: data.nickname,
            profileImage: null,
            walletAddress: data.walletAddress || null,
            role: 'player',
            preferences: {},
            stats: {
              level: 1,
              experience: 0,
              itemsCreated: 0,
              totalEarnings: 0,
              totalSpending: 0
            }
          } as User,
          token: 'mock_jwt_token_register'
        }
      };

      if (mockResponse.success) {
        saveToken(mockResponse.data.token);
        updateAuthState({
          user: mockResponse.data.user,
          isAuthenticated: true,
          token: mockResponse.data.token,
          isLoading: false,
          error: null
        });
        return true;
      }
      
      throw new Error('Registration failed');
    } catch (err) {
      updateAuthState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Registration failed'
      });
      return false;
    }
  }, [updateAuthState, saveToken]);

  // 로그아웃
  const logout = useCallback(() => {
    removeToken();
    updateAuthState(initialAuthState);
  }, [removeToken, updateAuthState]);

  // 사용자 정보 업데이트
  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!authState.user) return false;

    try {
      updateAuthState({ isLoading: true, error: null });

      // TODO: 실제 API 호출
      // const response = await authService.updateUser(authState.user.id, updates);
      
      // 시뮬레이션
      const updatedUser = { ...authState.user, ...updates };
      
      updateAuthState({
        user: updatedUser,
        isLoading: false,
        error: null
      });
      
      return true;
    } catch (err) {
      updateAuthState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Update failed'
      });
      return false;
    }
  }, [authState.user, updateAuthState]);

  // 비밀번호 변경
  const changePassword = useCallback(async (
    currentPassword: string, 
    newPassword: string
  ) => {
    try {
      updateAuthState({ isLoading: true, error: null });

      // TODO: 실제 API 호출
      // const response = await authService.changePassword({
      //   currentPassword,
      //   newPassword
      // });
      
      // 시뮬레이션
      const success = currentPassword !== newPassword;
      
      if (success) {
        updateAuthState({
          isLoading: false,
          error: null
        });
      } else {
        throw new Error('Password change failed');
      }
      
      return success;
    } catch (err) {
      updateAuthState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Password change failed'
      });
      return false;
    }
  }, [updateAuthState]);

  // 비밀번호 재설정 요청
  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      updateAuthState({ isLoading: true, error: null });

      // TODO: 실제 API 호출
      // const response = await authService.requestPasswordReset(email);
      
      // 시뮬레이션
      const success = true;
      
      updateAuthState({
        isLoading: false,
        error: null
      });
      
      return success;
    } catch (err) {
      updateAuthState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Request failed'
      });
      return false;
    }
  }, [updateAuthState]);

  // 토큰 갱신
  const refreshToken = useCallback(async () => {
    const token = getToken();
    if (!token) return false;

    try {
      // TODO: 실제 API 호출
      // const response = await authService.refreshToken(token);
      
      // 시뮬레이션
      const newToken = 'refreshed_token';
      saveToken(newToken);
      
      updateAuthState({
        token: newToken
      });
      
      return true;
    } catch (err) {
      logout();
      return false;
    }
  }, [getToken, saveToken, updateAuthState, logout]);

  // 인증 상태 확인
  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      updateAuthState({ isLoading: false });
      return;
    }

    try {
      updateAuthState({ isLoading: true });

      // TODO: 실제 API 호출
      // const response = await authService.validateToken(token);
      
      // 시뮬레이션
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        nickname: 'TestUser',
        profileImage: null,
        walletAddress: null,
        role: 'player',
        preferences: {},
        stats: {
          level: 5,
          experience: 1500,
          itemsCreated: 20,
          totalEarnings: 150.75,
          totalSpending: 85.25
        }
      };

      updateAuthState({
        user: mockUser,
        isAuthenticated: true,
        token,
        isLoading: false,
        error: null
      });
    } catch (err) {
      removeToken();
      updateAuthState({
        isLoading: false,
        error: null
      });
    }
  }, [getToken, updateAuthState, removeToken]);

  // 계정 삭제
  const deleteAccount = useCallback(async (password?: string) => {
    if (!authState.user) return false;

    try {
      updateAuthState({ isLoading: true, error: null });

      // TODO: 실제 API 호출
      // const response = await authService.deleteAccount(authState.user.id, password);
      
      // 시뮬레이션
      const success = true;
      
      if (success) {
        logout();
      }
      
      return success;
    } catch (err) {
      updateAuthState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Account deletion failed'
      });
      return false;
    }
  }, [authState.user, updateAuthState, logout]);

  // 2FA 활성화
  const enable2FA = useCallback(async () => {
    try {
      updateAuthState({ isLoading: true, error: null });

      // TODO: 실제 API 호출
      // const response = await authService.enable2FA();
      
      // 시뮬레이션
      const qrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const secret = 'JBSWY3DPEHPK3PXP';
      
      updateAuthState({
        isLoading: false,
        error: null
      });
      
      return { qrCode, secret };
    } catch (err) {
      updateAuthState({
        isLoading: false,
        error: err instanceof Error ? err.message : '2FA setup failed'
      });
      return null;
    }
  }, [updateAuthState]);

  // 2FA 검증
  const verify2FA = useCallback(async (code: string) => {
    try {
      updateAuthState({ isLoading: true, error: null });

      // TODO: 실제 API 호출
      // const response = await authService.verify2FA(code);
      
      // 시뮬레이션
      const success = code.length === 6 && /^\d+$/.test(code);
      
      if (success && authState.user) {
        const updatedUser = {
          ...authState.user,
          preferences: {
            ...authState.user.preferences,
            twoFactorEnabled: true
          }
        };
        
        updateAuthState({
          user: updatedUser,
          isLoading: false,
          error: null
        });
      }
      
      return success;
    } catch (err) {
      updateAuthState({
        isLoading: false,
        error: err instanceof Error ? err.message : '2FA verification failed'
      });
      return false;
    }
  }, [authState.user, updateAuthState]);

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 토큰 자동 갱신 설정
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const tokenRefreshInterval = setInterval(() => {
      refreshToken();
    }, 15 * 60 * 1000); // 15분마다 토큰 갱신

    return () => clearInterval(tokenRefreshInterval);
  }, [authState.isAuthenticated, refreshToken]);

  // API 요청 인터셉터 설정
  useEffect(() => {
    const requestInterceptor = (config: any) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    };

    const responseInterceptor = (error: any) => {
      if (error.response?.status === 401) {
        logout();
      }
      return Promise.reject(error);
    };

    // TODO: axios 인터셉터 설정
    // axios.interceptors.request.use(requestInterceptor);
    // axios.interceptors.response.use(null, responseInterceptor);

    // return () => {
    //   axios.interceptors.request.eject(requestInterceptor);
    //   axios.interceptors.response.eject(responseInterceptor);
    // };
  }, [getToken, logout]);

  return {
    // 인증 상태
    ...authState,
    
    // 인증 액션
    loginWithPassword,
    loginWithWallet,
    register,
    logout,
    updateUser,
    changePassword,
    requestPasswordReset,
    refreshToken,
    checkAuth,
    deleteAccount,
    
    // 2FA 관련
    enable2FA,
    verify2FA,
    
    // 편의성 getter
    get isAuthenticated() {
      return authState.isAuthenticated;
    },
    
    get currentUser() {
      return authState.user;
    },
    
    get hasWallet() {
      return !!authState.user?.walletAddress;
    },
    
    get has2FA() {
      return !!authState.user?.preferences?.twoFactorEnabled;
    },
    
    get userRole() {
      return authState.user?.role || 'guest';
    },
    
    get userAvatar() {
      return authState.user?.profileImage || '/images/default-avatar.png';
    }
  };
};

// 권한 체크 유틸리티
export const usePermission = (requiredRole: string) => {
  const { userRole } = useAuth();
  
  const roleHierarchy: Record<string, number> = {
    guest: 0,
    player: 1,
    creator: 2,
    moderator: 3,
    admin: 4
  };
  
  const hasPermission = roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  
  return hasPermission;
};

// 보호된 라우트 HOC
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: string = 'player'
) => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();
    const hasPermission = usePermission(requiredRole);
    
    if (isLoading) {
      return <div>Loading...</div>;
    }
    
    if (!isAuthenticated || !hasPermission) {
      return <div>Unauthorized</div>;
    }
    
    return <Component {...props} />;
  };
};

export default useAuth;
