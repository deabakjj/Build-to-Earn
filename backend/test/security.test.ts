import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/index';
import User from '../src/models/User';
import { connectDB, clearDB, closeDB } from './setup';

describe('API Security Tests', () => {
  let authToken: string;
  let testUser: any;
  let adminToken: string;
  let adminUser: any;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();

    // 테스트 유저 생성
    testUser = await User.create({
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
      nickname: 'TestUser',
      role: 'player',
      walletAddress: '0x1234567890123456789012345678901234567890',
    });

    // 관리자 유저 생성
    adminUser = await User.create({
      email: 'admin@example.com',
      password: await bcrypt.hash('adminpassword', 10),
      nickname: 'AdminUser',
      role: 'admin',
      walletAddress: '0x0987654321098765432109876543210987654321',
    });

    // JWT 토큰 생성
    authToken = jwt.sign(
      { id: testUser._id, role: testUser.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id, role: testUser.role },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // 이미 만료된 토큰
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBe('Token expired');
    });

    it('should prevent JWT algorithm confusion attack', async () => {
      // 알고리즘 변경을 통한 공격 시도
      const maliciousToken = jwt.sign(
        { id: testUser._id, role: 'admin' },
        'some_weak_secret',
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Authorization Security', () => {
    it('should enforce role-based access control', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`) // 일반 사용자 토큰
        .expect(403);

      expect(response.body.error).toBe('Access denied: Insufficient permissions');
    });

    it('should allow admin access to restricted endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should prevent privilege escalation', async () => {
      // 사용자가 자신의 역할을 admin으로 변경 시도
      const response = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'admin' })
        .expect(400);

      expect(response.body.error).toBe('Cannot modify user role');
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection', async () => {
      const maliciousInput = {
        email: "'; DROP TABLE users; --",
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousInput)
        .expect(400);

      expect(response.body.error).toBe('Invalid email format');
    });

    it('should prevent NoSQL injection', async () => {
      const maliciousInput = {
        email: { $gt: '' },
        password: { $gt: '' },
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousInput)
        .expect(400);

      expect(response.body.error).toBe('Email must be a string');
    });

    it('should sanitize HTML input', async () => {
      const maliciousInput = {
        nickname: '<script>alert("XSS")</script>',
      };

      const response = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousInput)
        .expect(200);

      expect(response.body.nickname).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('should enforce maximum string lengths', async () => {
      const longString = 'a'.repeat(1001); // 최대 길이 1000자 초과

      const response = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: longString })
        .expect(400);

      expect(response.body.error).toBe('Description must be less than 1000 characters');
    });

    it('should validate numeric inputs', async () => {
      const invalidInput = {
        price: -100, // 음수는 허용되지 않음
      };

      const response = await request(app)
        .post('/api/nft/mint')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidInput)
        .expect(400);

      expect(response.body.error).toBe('Price must be a positive number');
    });

    it('should validate wallet addresses', async () => {
      const invalidWallet = {
        walletAddress: 'invalid_wallet_address',
      };

      const response = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidWallet)
        .expect(400);

      expect(response.body.error).toBe('Invalid wallet address format');
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits on login attempts', async () => {
      const loginAttempts = Array.from({ length: 6 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
      );

      const responses = await Promise.all(loginAttempts);
      
      // 마지막 시도는 차단되어야 함
      expect(responses[5].status).toBe(429);
      expect(responses[5].body.error).toBe('Too many login attempts');
    });

    it('should enforce API rate limits per user', async () => {
      const requests = Array.from({ length: 101 }, () =>
        request(app)
          .get('/api/nft')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      
      // 101번째 요청은 차단되어야 함
      expect(responses[100].status).toBe(429);
      expect(responses[100].body.error).toBe('Rate limit exceeded');
    });

    it('should implement IP-based rate limiting', async () => {
      const fakeIp = '192.168.1.1';
      const requests = Array.from({ length: 201 }, () =>
        request(app)
          .get('/api/marketplace/search')
          .set('X-Forwarded-For', fakeIp)
      );

      const responses = await Promise.all(requests);
      
      // 201번째 요청은 차단되어야 함
      expect(responses[200].status).toBe(429);
      expect(responses[200].body.error).toBe('IP rate limit exceeded');
    });
  });

  describe('Password Security', () => {
    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'abc',
        'PASSWORD',
        '12345678',
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: weakPassword,
            nickname: 'TestUser',
          })
          .expect(400);

        expect(response.body.error).toContain('Password must');
      }
    });

    it('should hash passwords before storing', async () => {
      const password = 'ValidPassword123!';
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password,
          nickname: 'NewUser',
        })
        .expect(201);

      // 데이터베이스에서 사용자 조회
      const user = await User.findOne({ email: 'newuser@example.com' });
      
      // 비밀번호가 해시되어 저장되었는지 확인
      expect(user!.password).not.toBe(password);
      expect(user!.password.length).toBe(60); // bcrypt 해시 길이
    });

    it('should prevent password hints in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      // 세부 정보를 노출하지 않는 일반적인 오류 메시지
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions after password change', async () => {
      // 비밀번호 변경
      await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      // 기존 토큰으로 접근 시도 (실패해야 함)
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body.error).toBe('Token invalidated due to password change');
    });

    it('should implement session timeout', async () => {
      // 오래된 토큰 시뮬레이션
      const oldTokenIssuedAt = Math.floor(Date.now() / 1000) - 86400; // 24시간 전
      const oldToken = jwt.sign(
        { id: testUser._id, role: testUser.role, iat: oldTokenIssuedAt },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' } // 아직 유효하지만 세션 타임아웃 정책에 걸림
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${oldToken}`)
        .expect(401);

      expect(response.body.error).toBe('Session timeout');
    });
  });

  describe('XSS Protection', () => {
    it('should escape user content in responses', async () => {
      const maliciousContent = '<script>alert("XSS")</script>';
      
      // 사용자가 악성 콘텐츠를 제출
      await request(app)
        .post('/api/nft/mint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: maliciousContent,
          description: 'Test description',
          image: 'ipfs://test',
        })
        .expect(201);

      // 콘텐츠 조회
      const response = await request(app)
        .get('/api/nft')
        .expect(200);

      // 응답에서 스크립트가 이스케이프 되었는지 확인
      const nft = response.body.find((item: any) => item.name === '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
      expect(nft).toBeTruthy();
    });

    it('should set proper security headers', async () => {
      const response = await request(app).get('/api/users/profile');

      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['content-security-policy']).toBeTruthy();
    });
  });

  describe('CSRF Protection', () => {
    it('should implement CSRF tokens', async () => {
      // CSRF 토큰 없이 POST 요청 시도
      const response = await request(app)
        .post('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nickname: 'NewNickname' })
        .expect(403);

      expect(response.body.error).toBe('CSRF token missing');
    });

    it('should validate CSRF tokens', async () => {
      // 잘못된 CSRF 토큰으로 POST 요청
      const response = await request(app)
        .post('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'invalid_token')
        .send({ nickname: 'NewNickname' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', async () => {
      const maliciousFile = Buffer.from('<?php echo "Hacked!"; ?>');
      
      const response = await request(app)
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', maliciousFile, 'malicious.php')
        .expect(400);

      expect(response.body.error).toBe('Invalid file type');
    });

    it('should enforce file size limits', async () => {
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB
      
      const response = await request(app)
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFile, 'large.jpg')
        .expect(400);

      expect(response.body.error).toBe('File too large');
    });

    it('should sanitize file names', async () => {
      const maliciousFileName = '../../../etc/passwd.jpg';
      const testFile = Buffer.from('test image content');
      
      const response = await request(app)
        .post('/api/upload/image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFile, maliciousFileName)
        .expect(200);

      // 파일명이 안전하게 변경되었는지 확인
      expect(response.body.filename).not.toContain('..');
      expect(response.body.filename).not.toContain('/');
    });
  });

  describe('API versioning Security', () => {
    it('should deprecate old API versions', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(410);

      expect(response.body.error).toBe('API version deprecated');
    });

    it('should enforce API version in headers', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Accept', 'application/vnd.api+json; version=2')
        .expect(404);

      expect(response.body.error).toBe('Unsupported API version');
    });
  });

  describe('Logging Security', () => {
    it('should not log sensitive information', async () => {
      // 로그 수집 시작
      const logSpy = jest.spyOn(console, 'log');
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        })
        .expect(200);

      // 로그에 비밀번호가 포함되지 않았는지 확인
      const logCalls = logSpy.mock.calls.flat();
      const hasPassword = logCalls.some(log => 
        typeof log === 'string' && log.includes('password123')
      );
      
      expect(hasPassword).toBe(false);
      
      logSpy.mockRestore();
    });

    it('should log security events', async () => {
      // 보안 이벤트 로그 스파이
      const securityLogSpy = jest.spyOn(console, 'warn');
      
      // 실패한 로그인 시도
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      // 보안 이벤트가 로그되었는지 확인
      expect(securityLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed login attempt')
      );
      
      securityLogSpy.mockRestore();
    });
  });

  describe('Database Security', () => {
    it('should prevent mass assignment vulnerabilities', async () => {
      const maliciousUpdate = {
        nickname: 'NewNickname',
        role: 'admin', // 이 필드는 무시되어야 함
        _id: 'new_id', // 이 필드도 무시되어야 함
      };

      const response = await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousUpdate)
        .expect(200);

      // 업데이트된 사용자 조회
      const updatedUser = await User.findById(testUser._id);
      
      // 오직 허용된 필드만 업데이트되었는지 확인
      expect(updatedUser!.nickname).toBe('NewNickname');
      expect(updatedUser!.role).toBe('player'); // 변경되지 않았음
      expect(updatedUser!._id.toString()).toBe(testUser._id.toString()); // 변경되지 않았음
    });

    it('should implement query parameter validation', async () => {
      // 악의적인 쿼리 파라미터
      const response = await request(app)
        .get('/api/nft?limit=all&skip=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('Blockchain Security Integration', () => {
    it('should validate blockchain signatures', async () => {
      const invalidSignature = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        signature: 'invalid_signature',
        message: 'Login message',
      };

      const response = await request(app)
        .post('/api/auth/wallet-login')
        .send(invalidSignature)
        .expect(400);

      expect(response.body.error).toBe('Invalid signature');
    });

    it('should prevent nonce reuse in wallet authentication', async () => {
      const validRequest = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        signature: 'valid_signature',
        message: 'Login message',
        nonce: 'test_nonce_123',
      };

      // 첫 번째 요청은 성공
      await request(app)
        .post('/api/auth/wallet-login')
        .send(validRequest)
        .expect(200);

      // 동일한 nonce로 재시도 (실패해야 함)
      const response = await request(app)
        .post('/api/auth/wallet-login')
        .send(validRequest)
        .expect(400);

      expect(response.body.error).toBe('Nonce already used');
    });
  });

  describe('Environment Security', () => {
    it('should not expose environment variables in responses', async () => {
      // 잘못된 환경 정보 조회 시도
      const response = await request(app)
        .get('/api/debug/env')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // 환경 변수가 노출되지 않았는지 확인
      expect(response.text).not.toContain('JWT_SECRET');
      expect(response.text).not.toContain('DATABASE_URL');
    });

    it('should implement secure error handling', async () => {
      // 의도적으로 서버 오류 발생
      const response = await request(app)
        .get('/api/test/error')
        .expect(500);

      // 스택 트레이스가 노출되지 않았는지 확인
      expect(response.body.message).toBe('Internal server error');
      expect(response.body.stack).toBeUndefined();
      expect(response.body.code).toBeUndefined();
    });
  });
});

// 보안 테스트 유틸리티
const SecurityTestUtils = {
  generateMaliciousPayloads: () => [
    // XSS 페이로드
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    
    // SQL/NoSQL 인젝션 페이로드
    "'; DROP TABLE users; --",
    '{ $gt: "" }',
    '{ $or: [{}, {"password": {"$regex": "^.*"}}] }',
    
    // 경로 탐색 페이로드
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    
    // 커맨드 인젝션 페이로드
    '; ls -la',
    '| cat /etc/passwd',
    '`whoami`',
  ],
  
  validateSecurityHeaders: (headers: any) => {
    const requiredHeaders = [
      'x-xss-protection',
      'x-content-type-options',
      'x-frame-options',
      'strict-transport-security',
      'content-security-policy',
    ];
    
    return requiredHeaders.every(header => headers[header] !== undefined);
  },
  
  checkForSensitiveData: (data: any) => {
    const sensitiveFields = [
      'password',
      'privateKey',
      'secret',
      'token',
      'jwt',
      'apiKey',
    ];
    
    const dataString = JSON.stringify(data).toLowerCase();
    return sensitiveFields.some(field => dataString.includes(field));
  },
};

export default SecurityTestUtils;

// 성능 보안 테스트
describe('Performance Security Tests', () => {
  it('should handle concurrent requests without vulnerability', async () => {
    const concurrentRequests = 100;
    const requests = Array.from({ length: concurrentRequests }, () =>
      request(app)
        .get('/api/nft')
        .set('Authorization', `Bearer ${authToken}`)
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();

    // 모든 요청이 성공했는지 확인
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // 합리적인 시간 내에 처리되었는지 확인
    expect(endTime - startTime).toBeLessThan(5000);
  });

  it('should prevent resource exhaustion attacks', async () => {
    // 대용량 페이로드로 DoS 시도
    const largePayload = {
      data: 'x'.repeat(1024 * 1024), // 1MB의 데이터
    };

    const response = await request(app)
      .post('/api/test/large-payload')
      .set('Authorization', `Bearer ${authToken}`)
      .send(largePayload)
      .expect(413);

    expect(response.body.error).toBe('Payload too large');
  });
});
