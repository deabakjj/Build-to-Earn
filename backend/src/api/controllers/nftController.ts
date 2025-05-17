import { Request, Response, NextFunction } from 'express';
import { NFTService } from '../../services/nftService';
import { ErrorCode } from '../../common/errors';
import { validateRequest } from '../middlewares/validation';
import { nftValidationSchemas } from '../validators/nftValidator';

class NFTController {
  private nftService: NFTService;

  constructor() {
    this.nftService = new NFTService();
  }

  /**
   * NFT 민팅
   */
  public async mintNFT(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(nftValidationSchemas.mintNFT)(req, res, async () => {
        const userId = req.user?.id;
        const { type, metadata, attributes, itemData } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const nft = await this.nftService.mintNFT(userId, {
          type,
          metadata,
          attributes,
          itemData
        });
        
        res.status(200).json({
          success: true,
          data: nft,
          message: 'NFT가 성공적으로 발행되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 정보 조회
   */
  public async getNFTInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tokenId } = req.params;
      
      const nftInfo = await this.nftService.getNFTInfo(tokenId);
      
      res.status(200).json({
        success: true,
        data: nftInfo
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 사용자의 NFT 목록 조회
   */
  public async getUserNFTs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: '인증이 필요합니다.'
          }
        });
        return;
      }

      const { type, page = 1, limit = 20, sortBy } = req.query;
      
      const nfts = await this.nftService.getUserNFTs(userId, {
        type: type as string,
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string
      });
      
      res.status(200).json({
        success: true,
        data: nfts
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 업그레이드
   */
  public async upgradeNFT(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(nftValidationSchemas.upgradeNFT)(req, res, async () => {
        const userId = req.user?.id;
        const { tokenId, materials, upgradeLevel } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const upgradedNFT = await this.nftService.upgradeNFT(userId, {
          tokenId,
          materials,
          upgradeLevel
        });
        
        res.status(200).json({
          success: true,
          data: upgradedNFT,
          message: 'NFT가 성공적으로 업그레이드되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 조합
   */
  public async combineNFTs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(nftValidationSchemas.combineNFTs)(req, res, async () => {
        const userId = req.user?.id;
        const { sourceTokenIds, recipe } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const newNFT = await this.nftService.combineNFTs(userId, {
          sourceTokenIds,
          recipe
        });
        
        res.status(200).json({
          success: true,
          data: newNFT,
          message: 'NFT가 성공적으로 조합되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 메타데이터 업데이트
   */
  public async updateNFTMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(nftValidationSchemas.updateMetadata)(req, res, async () => {
        const userId = req.user?.id;
        const { tokenId, metadata } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const updatedNFT = await this.nftService.updateNFTMetadata(userId, tokenId, metadata);
        
        res.status(200).json({
          success: true,
          data: updatedNFT,
          message: 'NFT 메타데이터가 업데이트되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 거래 목록
   */
  public async listNFTForSale(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(nftValidationSchemas.listForSale)(req, res, async () => {
        const userId = req.user?.id;
        const { tokenId, price, currency, saleType, auctionDuration } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const listing = await this.nftService.listNFTForSale(userId, {
          tokenId,
          price,
          currency,
          saleType,
          auctionDuration
        });
        
        res.status(200).json({
          success: true,
          data: listing,
          message: 'NFT가 판매 목록에 등록되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 구매
   */
  public async buyNFT(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(nftValidationSchemas.buyNFT)(req, res, async () => {
        const userId = req.user?.id;
        const { listingId, price } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const purchase = await this.nftService.buyNFT(userId, listingId, price);
        
        res.status(200).json({
          success: true,
          data: purchase,
          message: 'NFT 구매가 완료되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 경매 입찰
   */
  public async placeBid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(nftValidationSchemas.placeBid)(req, res, async () => {
        const userId = req.user?.id;
        const { auctionId, bidAmount } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const bid = await this.nftService.placeBid(userId, auctionId, bidAmount);
        
        res.status(200).json({
          success: true,
          data: bid,
          message: '입찰이 성공적으로 완료되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 임대
   */
  public async rentNFT(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(nftValidationSchemas.rentNFT)(req, res, async () => {
        const userId = req.user?.id;
        const { tokenId, rentalPrice, duration, terms } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const rental = await this.nftService.createRental(userId, {
          tokenId,
          rentalPrice,
          duration,
          terms
        });
        
        res.status(200).json({
          success: true,
          data: rental,
          message: 'NFT가 임대로 등록되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 임대 계약
   */
  public async acceptRental(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(nftValidationSchemas.acceptRental)(req, res, async () => {
        const userId = req.user?.id;
        const { rentalId } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const rental = await this.nftService.acceptRental(userId, rentalId);
        
        res.status(200).json({
          success: true,
          data: rental,
          message: '임대 계약이 체결되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 거래 기록 조회
   */
  public async getTransactionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tokenId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const history = await this.nftService.getTransactionHistory(tokenId, {
        page: Number(page),
        limit: Number(limit)
      });
      
      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 소각
   */
  public async burnNFT(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(nftValidationSchemas.burnNFT)(req, res, async () => {
        const userId = req.user?.id;
        const { tokenId, reason } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const result = await this.nftService.burnNFT(userId, tokenId, reason);
        
        res.status(200).json({
          success: true,
          data: result,
          message: 'NFT가 성공적으로 소각되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 가격 히스토리
   */
  public async getPriceHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tokenId } = req.params;
      const { period = '7d' } = req.query;
      
      const priceHistory = await this.nftService.getPriceHistory(tokenId, period as string);
      
      res.status(200).json({
        success: true,
        data: priceHistory
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 컬렉션 통계
   */
  public async getCollectionStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { collectionId } = req.params;
      
      const stats = await this.nftService.getCollectionStats(collectionId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 인기도 순위
   */
  public async getTrendingNFTs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, period = '24h', page = 1, limit = 20 } = req.query;
      
      const trendingNFTs = await this.nftService.getTrendingNFTs({
        category: category as string,
        period: period as string,
        page: Number(page),
        limit: Number(limit)
      });
      
      res.status(200).json({
        success: true,
        data: trendingNFTs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 검증
   */
  public async verifyNFT(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tokenId } = req.params;
      
      const verification = await this.nftService.verifyNFT(tokenId);
      
      res.status(200).json({
        success: true,
        data: verification
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 보관함 이동
   */
  public async moveToVault(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await validateRequest(nftValidationSchemas.moveToVault)(req, res, async () => {
        const userId = req.user?.id;
        const { tokenId, vaultType } = req.body;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: {
              code: ErrorCode.UNAUTHORIZED,
              message: '인증이 필요합니다.'
            }
          });
          return;
        }

        const result = await this.nftService.moveToVault(userId, tokenId, vaultType);
        
        res.status(200).json({
          success: true,
          data: result,
          message: 'NFT가 보관함으로 이동되었습니다.'
        });
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * NFT 검색
   */
  public async searchNFTs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        query,
        category,
        minPrice,
        maxPrice,
        rarity,
        sortBy,
        page = 1,
        limit = 20
      } = req.query;
      
      const results = await this.nftService.searchNFTs({
        query: query as string,
        category: category as string,
        minPrice: Number(minPrice),
        maxPrice: Number(maxPrice),
        rarity: rarity as string,
        sortBy: sortBy as string,
        page: Number(page),
        limit: Number(limit)
      });
      
      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NFTController();
