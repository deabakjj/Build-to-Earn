/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'localhost',
      'build-to-earn.com',
      'ipfs.io',
      'gateway.pinata.cloud',
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverComponentsExternalPackages: ['three', '@react-three/fiber'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        dns: false,
        tls: false,
        fs: false,
        request: false,
      };
    }

    // 웹 워커 지원
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: { loader: 'worker-loader' },
    });

    // GLSL 셰이더 로더
    config.module.rules.push({
      test: /\.(frag|vert|glsl)$/,
      use: 'raw-loader',
    });

    // 3D 모델 로더
    config.module.rules.push({
      test: /\.(gltf|glb|fbx|obj|mtl)$/,
      type: 'asset/resource',
    });

    return config;
  },
  // API 라우트 최적화
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  // 환경 변수 설정
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_GAME_SERVER_URL: process.env.NEXT_PUBLIC_GAME_SERVER_URL,
    NEXT_PUBLIC_BLOCKCHAIN_RPC_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_RPC_URL,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_IPFS_GATEWAY: process.env.NEXT_PUBLIC_IPFS_GATEWAY,
    NEXT_PUBLIC_CONTRACT_VXC: process.env.NEXT_PUBLIC_CONTRACT_VXC,
    NEXT_PUBLIC_CONTRACT_PTX: process.env.NEXT_PUBLIC_CONTRACT_PTX,
    NEXT_PUBLIC_CONTRACT_MARKETPLACE: process.env.NEXT_PUBLIC_CONTRACT_MARKETPLACE,
  },
  // PWA 설정
  pwa: {
    dest: 'public',
    skipWaiting: true,
    clientsClaim: true,
  },
  // 보안 헤더
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              img-src 'self' data: https: blob:;
              connect-src 'self' https:// wss:// https://ipfs.io https://gateway.pinata.cloud;
              font-src 'self' https://fonts.gstatic.com;
              object-src 'none';
              media-src 'self' https:;
              frame-src 'self' https:;
              base-uri 'self';
              form-action 'self';
              frame-ancestors 'none';
              upgrade-insecure-requests;
            `.replace(/\s+/g, ' ').trim(),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
    ];
  },
  // 리다이렉트 설정
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  // 리라이트 설정
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
  // 성능 최적화
  compress: true,
  generateEtags: true,
  poweredByHeader: false,
  trailingSlash: false,
};

module.exports = nextConfig;
