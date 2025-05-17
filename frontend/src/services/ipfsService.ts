import { create, IPFSHTTPClient } from 'ipfs-http-client';
import axios from 'axios';

// IPFS 클라이언트 설정
const IPFS_CONFIG = {
  host: process.env.NEXT_PUBLIC_IPFS_HOST || 'ipfs.infura.io',
  port: parseInt(process.env.NEXT_PUBLIC_IPFS_PORT || '5001'),
  protocol: process.env.NEXT_PUBLIC_IPFS_PROTOCOL || 'https',
  headers: process.env.NEXT_PUBLIC_IPFS_PROJECT_ID && process.env.NEXT_PUBLIC_IPFS_PROJECT_SECRET
    ? {
        authorization: `Basic ${Buffer.from(
          `${process.env.NEXT_PUBLIC_IPFS_PROJECT_ID}:${process.env.NEXT_PUBLIC_IPFS_PROJECT_SECRET}`
        ).toString('base64')}`,
      }
    : undefined,
};

// 업로드 진행률 타입
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// IPFS 업로드 결과 타입
export interface IpfsUploadResult {
  hash: string;
  url: string;
  size: number;
}

// NFT 메타데이터 타입
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string; // 3D 모델, 비디오 등
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
    max_value?: number;
  }>;
  properties: Record<string, any>;
  background_color?: string;
  created_by?: string;
  created_at?: string;
}

// IPFS 서비스 클래스
class IpfsService {
  private client: IPFSHTTPClient | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  // IPFS 클라이언트 초기화
  private async initialize() {
    try {
      this.client = create(IPFS_CONFIG);
      this.isInitialized = true;
      
      // 연결 테스트
      // await this.client.id();
      console.log('IPFS client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IPFS client:', error);
      this.isInitialized = false;
    }
  }

  // 클라이언트 연결 확인
  private ensureInitialized() {
    if (!this.isInitialized || !this.client) {
      throw new Error('IPFS client not initialized');
    }
  }

  // 파일 업로드
  async uploadFile(
    file: File | Blob,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<IpfsUploadResult> {
    this.ensureInitialized();

    try {
      // 파일을 버퍼로 변환
      const buffer = await this.fileToBuffer(file);
      
      // Pinata를 사용하는 경우 (권장)
      if (process.env.NEXT_PUBLIC_USE_PINATA === 'true') {
        return await this.uploadToPinata(buffer, file.name, onProgress);
      }
      
      // 직접 IPFS에 업로드
      const result = await this.client!.add(buffer, {
        progress: (bytes, path) => {
          if (onProgress && file.size > 0) {
            onProgress({
              loaded: bytes,
              total: file.size,
              percentage: Math.round((bytes / file.size) * 100),
            });
          }
        },
      });

      return {
        hash: result.cid.toString(),
        url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
        size: result.size,
      };
    } catch (error) {
      console.error('Failed to upload file to IPFS:', error);
      throw new Error('File upload failed');
    }
  }

  // Pinata를 통한 업로드 (더 안정적)
  private async uploadToPinata(
    buffer: Buffer,
    filename: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<IpfsUploadResult> {
    try {
      const pinataEndpoint = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
      const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY!;
      const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY!;

      const formData = new FormData();
      formData.append('file', new Blob([buffer]), filename);

      const metadata = JSON.stringify({
        name: filename,
        keyvalues: {
          description: 'DIY Crafting World asset',
          project: 'build-to-earn',
        },
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({
        cidVersion: 1,
      });
      formData.append('pinataOptions', options);

      const response = await axios.post(pinataEndpoint, formData, {
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey,
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded / progressEvent.total) * 100),
            });
          }
        },
      });

      return {
        hash: response.data.IpfsHash,
        url: `https://ipfs.io/ipfs/${response.data.IpfsHash}`,
        size: response.data.PinSize,
      };
    } catch (error) {
      console.error('Failed to upload to Pinata:', error);
      throw error;
    }
  }

  // JSON 데이터 업로드 (메타데이터용)
  async uploadJSON(
    data: any,
    filename?: string
  ): Promise<IpfsUploadResult> {
    this.ensureInitialized();

    try {
      const jsonString = JSON.stringify(data, null, 2);
      const buffer = Buffer.from(jsonString);

      if (process.env.NEXT_PUBLIC_USE_PINATA === 'true') {
        return await this.uploadJSONToPinata(data, filename);
      }

      const result = await this.client!.add(buffer);

      return {
        hash: result.cid.toString(),
        url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
        size: result.size,
      };
    } catch (error) {
      console.error('Failed to upload JSON to IPFS:', error);
      throw new Error('JSON upload failed');
    }
  }

  // Pinata를 통한 JSON 업로드
  private async uploadJSONToPinata(
    data: any,
    filename?: string
  ): Promise<IpfsUploadResult> {
    try {
      const pinataEndpoint = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
      const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY!;
      const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY!;

      const body = {
        pinataContent: data,
        pinataMetadata: {
          name: filename || 'metadata.json',
          keyvalues: {
            type: 'metadata',
            project: 'build-to-earn',
          },
        },
        pinataOptions: {
          cidVersion: 1,
        },
      };

      const response = await axios.post(pinataEndpoint, body, {
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey,
          'Content-Type': 'application/json',
        },
      });

      return {
        hash: response.data.IpfsHash,
        url: `https://ipfs.io/ipfs/${response.data.IpfsHash}`,
        size: response.data.PinSize,
      };
    } catch (error) {
      console.error('Failed to upload JSON to Pinata:', error);
      throw error;
    }
  }

  // 폴더 업로드
  async uploadFolder(
    files: File[],
    folderName: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<IpfsUploadResult[]> {
    this.ensureInitialized();

    try {
      const results: IpfsUploadResult[] = [];
      let totalSize = 0;
      let loadedSize = 0;

      // 총 크기 계산
      files.forEach(file => {
        totalSize += file.size;
      });

      for (const file of files) {
        const result = await this.uploadFile(file, (fileProgress) => {
          loadedSize += fileProgress.loaded;
          if (onProgress) {
            onProgress({
              loaded: loadedSize,
              total: totalSize,
              percentage: Math.round((loadedSize / totalSize) * 100),
            });
          }
        });
        
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Failed to upload folder to IPFS:', error);
      throw new Error('Folder upload failed');
    }
  }

  // NFT 전체 업로드 (이미지 + 메타데이터)
  async uploadNFT(
    imageFile: File,
    metadata: Omit<NFTMetadata, 'image'>,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ imageHash: string; metadataHash: string; metadataUrl: string }> {
    try {
      // 1. 이미지 업로드
      const imageResult = await this.uploadFile(imageFile, (progress) => {
        if (onProgress) {
          onProgress({
            loaded: progress.loaded,
            total: progress.total * 2, // 이미지 + 메타데이터
            percentage: Math.round(progress.percentage / 2),
          });
        }
      });

      // 2. 이미지 URL과 함께 메타데이터 생성
      const fullMetadata: NFTMetadata = {
        ...metadata,
        image: imageResult.url,
        created_at: new Date().toISOString(),
      };

      // 3. 메타데이터 업로드
      const metadataResult = await this.uploadJSON(fullMetadata, 'metadata.json');

      if (onProgress) {
        onProgress({
          loaded: metadataResult.size + imageResult.size,
          total: metadataResult.size + imageResult.size,
          percentage: 100,
        });
      }

      return {
        imageHash: imageResult.hash,
        metadataHash: metadataResult.hash,
        metadataUrl: metadataResult.url,
      };
    } catch (error) {
      console.error('Failed to upload NFT to IPFS:', error);
      throw error;
    }
  }

  // IPFS에서 데이터 조회
  async fetchData<T = any>(hash: string): Promise<T> {
    try {
      // IPFS 게이트웨이를 통해 데이터 조회
      const url = `https://ipfs.io/ipfs/${hash}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch data from IPFS:', error);
      throw new Error('Data fetch failed');
    }
  }

  // 캐시된 데이터 조회 (로컬 IPFS 노드)
  async fetchCached<T = any>(hash: string): Promise<T> {
    this.ensureInitialized();

    try {
      const stream = this.client!.cat(hash);
      const decoder = new TextDecoder();
      let data = '';

      for await (const chunk of stream) {
        data += decoder.decode(chunk, { stream: true });
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to fetch cached data:', error);
      // 캐시에 없으면 게이트웨이에서 조회
      return this.fetchData<T>(hash);
    }
  }

  // 파일을 Buffer로 변환
  private async fileToBuffer(file: File | Blob): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(Buffer.from(reader.result));
        } else {
          reject(new Error('Failed to convert file to buffer'));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // IPFS 핀 (영구 저장) 관리
  async pinHash(hash: string): Promise<boolean> {
    try {
      if (process.env.NEXT_PUBLIC_USE_PINATA === 'true') {
        return await this.pinToPinata(hash);
      }

      this.ensureInitialized();
      await this.client!.pin.add(hash);
      return true;
    } catch (error) {
      console.error('Failed to pin hash:', error);
      return false;
    }
  }

  // Pinata를 통한 핀 설정
  private async pinToPinata(hash: string): Promise<boolean> {
    try {
      const pinataEndpoint = `https://api.pinata.cloud/pinning/pinByHash`;
      const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY!;
      const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY!;

      const body = {
        hashToPin: hash,
        pinataMetadata: {
          name: `pinned-${hash}`,
          keyvalues: {
            project: 'build-to-earn',
          },
        },
      };

      await axios.post(pinataEndpoint, body, {
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey,
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to pin to Pinata:', error);
      return false;
    }
  }

  // 핀 제거
  async unpinHash(hash: string): Promise<boolean> {
    try {
      if (process.env.NEXT_PUBLIC_USE_PINATA === 'true') {
        return await this.unpinFromPinata(hash);
      }

      this.ensureInitialized();
      await this.client!.pin.rm(hash);
      return true;
    } catch (error) {
      console.error('Failed to unpin hash:', error);
      return false;
    }
  }

  // Pinata에서 핀 제거
  private async unpinFromPinata(hash: string): Promise<boolean> {
    try {
      const pinataEndpoint = `https://api.pinata.cloud/pinning/unpin/${hash}`;
      const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY!;
      const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY!;

      await axios.delete(pinataEndpoint, {
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey,
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to unpin from Pinata:', error);
      return false;
    }
  }

  // 게이트웨이 URL 생성
  getGatewayUrl(hash: string, useCdn = true): string {
    if (useCdn) {
      return `https://cf-ipfs.com/ipfs/${hash}`;
    }
    return `https://ipfs.io/ipfs/${hash}`;
  }

  // 이미지 최적화 업로드
  async uploadOptimizedImage(
    file: File,
    maxWidth: number = 800,
    maxHeight: number = 800,
    quality: number = 0.8,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<IpfsUploadResult> {
    try {
      // 클라이언트 사이드에서 이미지 최적화
      const optimizedBlob = await this.optimizeImage(file, maxWidth, maxHeight, quality);
      
      // 최적화된 이미지 업로드
      return await this.uploadFile(optimizedBlob, onProgress);
    } catch (error) {
      console.error('Failed to upload optimized image:', error);
      throw error;
    }
  }

  // 이미지 최적화 헬퍼
  private async optimizeImage(
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // 크기 계산
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        // 캔버스 크기 설정
        canvas.width = width;
        canvas.height = height;

        // 이미지 그리기
        ctx?.drawImage(img, 0, 0, width, height);

        // Blob으로 변환
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // 메타데이터 검증
  validateNFTMetadata(metadata: NFTMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.name || metadata.name.trim() === '') {
      errors.push('Name is required');
    }

    if (!metadata.description || metadata.description.trim() === '') {
      errors.push('Description is required');
    }

    if (!metadata.image || metadata.image.trim() === '') {
      errors.push('Image is required');
    }

    if (!Array.isArray(metadata.attributes)) {
      errors.push('Attributes must be an array');
    } else {
      metadata.attributes.forEach((attr, index) => {
        if (!attr.trait_type || typeof attr.trait_type !== 'string') {
          errors.push(`Attribute ${index + 1}: trait_type is required and must be a string`);
        }
        if (attr.value === undefined || attr.value === null) {
          errors.push(`Attribute ${index + 1}: value is required`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 싱글톤 인스턴스 생성
const ipfsService = new IpfsService();

export default ipfsService;
export { IpfsService };

// 유틸리티 함수들
export const ipfsUtils = {
  // IPFS URL 파싱
  parseIpfsUrl(url: string): { protocol: string; hash: string } | null {
    const ipfsRegex = /^ipfs:\/\/(.+)$/;
    const httpRegex = /^https?:\/\/(?:[^/]+\/)?ipfs\/(.+)$/;

    let match = url.match(ipfsRegex);
    if (match) {
      return { protocol: 'ipfs', hash: match[1] };
    }

    match = url.match(httpRegex);
    if (match) {
      return { protocol: 'http', hash: match[1] };
    }

    return null;
  },

  // 파일 크기 포맷팅
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // IPFS 해시 검증
  isValidIpfsHash(hash: string): boolean {
    // CIDv0 (Qm...)
    if (hash.startsWith('Qm') && hash.length === 46) {
      return true;
    }

    // CIDv1 (f...)
    if (hash.startsWith('f') && (hash.length === 59 || hash.length === 63)) {
      return true;
    }

    return false;
  },

  // 메타데이터 템플릿 생성
  createMetadataTemplate(
    name: string,
    description: string,
    attributes: NFTMetadata['attributes'] = []
  ): Omit<NFTMetadata, 'image'> {
    return {
      name,
      description,
      attributes,
      properties: {},
      created_by: 'DIY Crafting World',
      created_at: new Date().toISOString(),
    };
  },
};
