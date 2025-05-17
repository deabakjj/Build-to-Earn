import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-toastify';
import Router from 'next/router';

// 인증 토큰 관리
const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

// 리프레시 토큰 관리
const getRefreshToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }
  return null;
};

// 토큰 저장
const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
  }
};

// 리프레시 토큰 저장
const setRefreshToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('refreshToken', token);
  }
};

// 토큰 삭제
const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
  }
};

// 리프레시 토큰 삭제
const removeRefreshToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('refreshToken');
  }
};

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30초
});

// 토큰 갱신 중인지 확인하는 플래그
let isRefreshing = false;
// 토큰 갱신 중 대기 중인 요청 큐
let failedQueue: any[] = [];

// 대기 중인 요청 처리
const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

/**
 * API 인터셉터 설정
 * 
 * 요청 및 응답 인터셉터 설정하고 토큰 갱신 로직 구현
 */
export const setupInterceptors = () => {
  // 요청 인터셉터
  api.interceptors.request.use(
    (config: AxiosRequestConfig) => {
      const token = getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );
  
  // 응답 인터셉터
  api.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config;
      
      // 액세스 토큰 만료 (401)
      if (
        error.response?.status === 401 &&
        originalRequest && 
        !(originalRequest as any)._retry &&
        !originalRequest.url?.includes('/auth/refresh-token')
      ) {
        if (isRefreshing) {
          // 이미 토큰 갱신 중이면 대기열에 추가
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              if (originalRequest && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return api(originalRequest);
            })
            .catch(err => {
              return Promise.reject(err);
            });
        }
        
        // 토큰 갱신 시작
        (originalRequest as any)._retry = true;
        isRefreshing = true;
        
        try {
          const refreshToken = getRefreshToken();
          
          if (!refreshToken) {
            // 리프레시 토큰 없음 (로그아웃 필요)
            throw new Error('No refresh token available');
          }
          
          // 토큰 갱신 요청
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          if (response.data && response.data.data.accessToken) {
            // 새 토큰 저장
            setToken(response.data.data.accessToken);
            
            // 대기 중인 요청 처리
            processQueue(null, response.data.data.accessToken);
            
            // 원래 요청 재시도
            if (originalRequest && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
            }
            
            return api(originalRequest);
          } else {
            // 토큰 갱신 실패
            processQueue(new Error('Failed to refresh token'));
            handleAuthError();
            return Promise.reject(error);
          }
        } catch (refreshError) {
          // 토큰 갱신 오류
          processQueue(refreshError as AxiosError);
          handleAuthError();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
      
      // Forbidden (403)
      if (error.response?.status === 403) {
        toast.error('접근 권한이 없습니다.');
      }
      
      // Not Found (404)
      if (error.response?.status === 404) {
        // API 엔드포인트가 아닌 페이지 404인 경우
        if (!originalRequest.url?.startsWith('/api/')) {
          Router.push('/404');
        }
      }
      
      // Rate Limit (429)
      if (error.response?.status === 429) {
        toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
      }
      
      // Server Error (500)
      if (error.response?.status && error.response.status >= 500) {
        toast.error('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
      
      return Promise.reject(error);
    }
  );
};

/**
 * 인증 오류 처리
 * 
 * 토큰 갱신 실패 시 로그아웃 처리
 */
const handleAuthError = () => {
  // 토큰 제거
  removeToken();
  removeRefreshToken();
  
  // 사용자 에게 알림
  toast.error('인증이 만료되었습니다. 다시 로그인해 주세요.', {
    onClose: () => {
      // 현재 URL 저장 (로그인 후 리디렉션용)
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          localStorage.setItem('redirectAfterLogin', currentPath);
        }
      }
      
      // 로그인 페이지로 이동
      Router.push('/login');
    },
  });
};

export default api;
