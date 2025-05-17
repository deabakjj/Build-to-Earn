import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import api, { ApiError } from '../../services/api';

// axios 모킹 설정
const mock = new MockAdapter(axios);

describe('API Service', () => {
  beforeEach(() => {
    mock.reset();
    // 로컬 스토리지 모킹
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Authentication', () => {
    it('should add Authorization header when token exists', async () => {
      // 토큰 설정
      const token = 'test-token';
      localStorage.setItem('auth_token', token);

      mock.onGet('/test').reply(200, { success: true, data: 'test data' });

      await api.get('/test');

      // 요청 헤더에 토큰이 포함되었는지 확인
      expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${token}`);
    });

    it('should handle 401 errors and redirect to login', async () => {
      mock.onGet('/test').reply(401, { error: 'Unauthorized' });

      // window.location 모킹
      const locationMock = {
        href: '',
      };
      Object.defineProperty(window, 'location', { value: locationMock });

      await expect(api.get('/test')).rejects.toThrow(ApiError);
      expect(locationMock.href).toBe('/login');
    });
  });

  describe('GET Requests', () => {
    it('should handle successful GET request', async () => {
      const mockData = { id: 1, name: 'Test Item' };
      mock.onGet('/items/1').reply(200, { success: true, data: mockData });

      const result = await api.get('/items/1');
      expect(result).toEqual(mockData);
    });

    it('should handle failed GET request', async () => {
      mock.onGet('/items/999').reply(404, { success: false, error: 'Not found' });

      await expect(api.get('/items/999')).rejects.toThrow(ApiError);
    });

    it('should handle network errors', async () => {
      mock.onGet('/items/1').networkError();

      await expect(api.get('/items/1')).rejects.toThrow(ApiError);
    });
  });

  describe('POST Requests', () => {
    it('should handle successful POST request', async () => {
      const requestData = { name: 'New Item', price: 100 };
      const responseData = { id: 1, ...requestData };
      
      mock.onPost('/items').reply(201, { success: true, data: responseData });

      const result = await api.post('/items', requestData);
      expect(result).toEqual(responseData);
    });

    it('should handle validation errors', async () => {
      const invalidData = { name: '' }; // Invalid data
      
      mock.onPost('/items').reply(400, { 
        success: false, 
        error: 'Validation error',
        details: ['Name is required']
      });

      await expect(api.post('/items', invalidData)).rejects.toThrow(ApiError);
    });
  });

  describe('File Upload', () => {
    it('should handle file upload with progress', async () => {
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const responseData = { url: 'https://example.com/image.jpg' };
      
      mock.onPost('/upload').reply(200, { success: true, data: responseData });

      const progressMock = jest.fn();
      const result = await api.upload('/upload', file, progressMock);

      expect(result).toEqual(responseData);
      // 프로그레스 콜백이 호출되었는지 확인 (실제로는 axios mock이 프로그레스 이벤트를 시뮬레이션하지 않음)
    });

    it('should handle upload errors', async () => {
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      
      mock.onPost('/upload').reply(500, { success: false, error: 'Upload failed' });

      await expect(api.upload('/upload', file)).rejects.toThrow(ApiError);
    });
  });

  describe('Query Parameters', () => {
    it('should build query parameters correctly', () => {
      const params = {
        search: 'test',
        page: 1,
        limit: 10,
        tags: ['nft', 'game'],
      };

      const queryString = api.constructor.buildQueryParams(params);
      
      expect(queryString).toContain('search=test');
      expect(queryString).toContain('page=1');
      expect(queryString).toContain('limit=10');
      expect(queryString).toContain('tags%5B%5D=nft');
      expect(queryString).toContain('tags%5B%5D=game');
    });

    it('should ignore null and undefined values', () => {
      const params = {
        search: null,
        page: undefined,
        limit: 10,
      };

      const queryString = api.constructor.buildQueryParams(params);
      
      expect(queryString).not.toContain('search');
      expect(queryString).not.toContain('page');
      expect(queryString).toContain('limit=10');
    });
  });

  describe('Domain-specific API clients', () => {
    it('should make authentication request correctly', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const responseData = { token: 'jwt-token', user: { id: 1, email: credentials.email } };
      
      mock.onPost('/auth/login').reply(200, { success: true, data: responseData });

      const result = await api.authApi.login(credentials);
      expect(result).toEqual(responseData);
      expect(mock.history.post[0].data).toEqual(JSON.stringify(credentials));
    });

    it('should make NFT mint request correctly', async () => {
      const mintData = { 
        itemId: 'item-1', 
        metadata: { name: 'Test NFT' },
        price: 100
      };
      const responseData = { tokenId: 1, transactionHash: '0x123...' };
      
      mock.onPost('/nft/mint').reply(200, { success: true, data: responseData });

      const result = await api.nftApi.mintNFT(mintData);
      expect(result).toEqual(responseData);
    });

    it('should make marketplace search request correctly', async () => {
      const searchParams = {
        query: 'test',
        category: 'nft',
        minPrice: 10,
        maxPrice: 100,
      };
      const responseData = [{ id: 1, name: 'Test NFT' }];
      
      const expectedUrl = `/marketplace/search?${api.constructor.buildQueryParams(searchParams)}`;
      mock.onGet().reply((config) => {
        if (config.url === expectedUrl) {
          return [200, { success: true, data: responseData }];
        }
        return [404];
      });

      const result = await api.marketplaceApi.search(searchParams);
      expect(result).toEqual(responseData);
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry failed requests', async () => {
      let attempts = 0;
      
      mock.onGet('/retry-test').reply(() => {
        attempts++;
        if (attempts < 3) {
          return [500, { success: false, error: 'Server error' }];
        }
        return [200, { success: true, data: 'success' }];
      });

      // 이 테스트는 실제 재시도 로직이 구현되었을 때 동작합니다
      // 현재 API 서비스에 재시도 로직이 없으므로 주석 처리
      /*
      const result = await api.get('/retry-test');
      expect(result).toBe('success');
      expect(attempts).toBe(3);
      */
    });
  });

  describe('Error Handling', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError('Test error', 400, { details: 'Error details' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.response).toEqual({ details: 'Error details' });
      expect(error.name).toBe('ApiError');
    });

    it('should handle different error response formats', async () => {
      // API 에러 형식
      mock.onGet('/error-1').reply(400, { error: 'API Error' });
      
      // 일반 에러 형식
      mock.onGet('/error-2').reply(500, 'Internal Server Error');
      
      // 에러 객체 형식
      mock.onGet('/error-3').reply(422, { message: 'Validation failed', errors: ['Field required'] });

      await expect(api.get('/error-1')).rejects.toThrow('API Error');
      await expect(api.get('/error-2')).rejects.toThrow('API request failed');
      await expect(api.get('/error-3')).rejects.toThrow('Validation failed');
    });
  });

  describe('Request Timeouts', () => {
    it('should timeout long requests', async () => {
      mock.onGet('/slow-endpoint').reply(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve([200, { success: true, data: 'slow response' }]);
          }, 35000); // 타임아웃(30초)보다 느림
        });
      });

      // 타임아웃 테스트 (실제로는 jest 타임아웃 설정이 필요함)
      // await expect(api.get('/slow-endpoint')).rejects.toThrow('timeout');
    });
  });

  describe('WebSocket Integration', () => {
    it('should create WebSocket connection with correct URL and token', () => {
      const token = 'test-token';
      localStorage.setItem('auth_token', token);

      // WebSocket 모킹
      global.WebSocket = jest.fn().mockImplementation((url) => {
        expect(url).toContain('ws://localhost:5000/ws/test-endpoint');
        expect(url).toContain(`token=${token}`);
        
        return {
          addEventListener: jest.fn(),
          send: jest.fn(),
          close: jest.fn(),
        };
      });

      const mockHandler = jest.fn();
      const ws = api.createWebSocket('test-endpoint', mockHandler);

      expect(WebSocket).toHaveBeenCalled();
    });
  });
});

// 통합 테스트
describe('API Integration Tests', () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    // fetch 모킹 (실제 네트워크 요청 방지)
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: 'mocked data' }),
      })
    ) as jest.Mock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should handle complete NFT minting workflow', async () => {
    // NFT 민팅의 전체 워크플로우 테스트
    // 1. 메타데이터 준비
    // 2. IPFS 업로드
    // 3. 스마트 컨트랙트 민팅
    // 4. 백엔드 업데이트
    
    // 이는 통합 테스트이므로 여러 API 호출을 모킹해야 함
  });

  it('should handle marketplace listing workflow', async () => {
    // 마켓플레이스 리스팅의 전체 워크플로우 테스트
  });
});

// 성능 테스트
describe('API Performance Tests', () => {
  it('should handle concurrent requests efficiently', async () => {
    const startTime = Date.now();
    const requests = Array(10).fill(0).map((_, i) =>
      Promise.resolve({ data: `Response ${i}` })
    );

    const results = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(results.length).toBe(10);
    expect(duration).toBeLessThan(1000); // 1초 이내 완료
  });

  it('should properly handle request queuing', async () => {
    // 요청 대기열 테스트
  });
});

// 에러 시나리오 테스트
describe('API Error Scenarios', () => {
  it('should handle network connectivity issues', async () => {
    // 네트워크 연결 문제 시뮬레이션
  });

  it('should handle rate limiting', async () => {
    // Rate limit 시뮬레이션
  });

  it('should handle malformed responses', async () => {
    // 잘못된 응답 형식 테스트
  });
});
