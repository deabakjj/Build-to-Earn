import { ethers } from 'ethers';
import NFT, { INFT } from '../models/NFT';
import Transaction, { ITransaction } from '../models/Transaction';
import User, { IUser } from '../models/User';
import blockchainService from './blockchainService';
import mongoose from 'mongoose';

interface ListingParams {
  nftId: string;
  sellerId: string;
  price: string;
  isAuction?: boolean;
  auctionEndTime?: Date;
  minBidIncrement?: string;
  allowBuyNow?: boolean;
  buyNowPrice?: string;
}

interface PurchaseParams {
  listingId: string;
  buyerId: string;
  amount?: string; // For auctions
}

interface SearchParams {
  query?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  status?: 'active' | 'sold' | 'expired';
  sortBy?: 'price' | 'endTime' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface RentalParams {
  nftId: string;
  ownerId: string;
  tenantId: string;
  period: number; // in days
  pricePerDay: string;
  maxPeriod?: number;
  autoRenewal?: boolean;
}

interface BundleParams {
  nftIds: string[];
  sellerId: string;
  totalPrice: string;
  discount?: number; // percentage
  description?: string;
}

class MarketplaceService {
  /**
   * Create a new listing on the marketplace
   */
  async createListing(params: ListingParams): Promise<ITransaction> {
    const {
      nftId,
      sellerId,
      price,
      isAuction = false,
      auctionEndTime,
      minBidIncrement,
      allowBuyNow = false,
      buyNowPrice
    } = params;

    // Verify NFT ownership
    const nft = await NFT.findById(nftId);
    if (!nft) {
      throw new Error('NFT not found');
    }

    if (nft.ownerId.toString() !== sellerId) {
      throw new Error('Not the owner of the NFT');
    }

    // Check if NFT is not already listed
    const existingListing = await Transaction.findOne({
      nftId,
      status: { $in: ['pending', 'active'] }
    });

    if (existingListing) {
      throw new Error('NFT is already listed for sale');
    }

    // Create listing
    const listingData: any = {
      nftId,
      sellerId,
      type: isAuction ? 'auction' : 'sale',
      price,
      status: 'active',
      metadata: {}
    };

    if (isAuction) {
      if (!auctionEndTime) {
        throw new Error('Auction end time is required for auctions');
      }

      listingData.auctionEndTime = auctionEndTime;
      listingData.metadata.minBidIncrement = minBidIncrement || ethers.utils.parseEther('0.01').toString();
      listingData.metadata.allowBuyNow = allowBuyNow;
      listingData.metadata.buyNowPrice = buyNowPrice;
      listingData.metadata.bids = [];
    }

    const listing = await Transaction.create(listingData);

    // Update NFT status
    nft.status = 'listed';
    await nft.save();

    // Create smart contract listing
    await blockchainService.createMarketplaceListing({
      nftAddress: nft.contractAddress,
      tokenId: nft.tokenId,
      seller: sellerId,
      price: ethers.utils.parseEther(price),
      isAuction
    });

    return listing;
  }

  /**
   * Purchase an NFT directly
   */
  async purchaseNFT(params: PurchaseParams): Promise<ITransaction> {
    const { listingId, buyerId, amount } = params;

    const listing = await Transaction.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== 'active') {
      throw new Error('Listing is not active');
    }

    if (listing.sellerId.toString() === buyerId) {
      throw new Error('Cannot buy your own NFT');
    }

    const buyer = await User.findById(buyerId);
    if (!buyer) {
      throw new Error('Buyer not found');
    }

    // Check if it's an auction or direct sale
    if (listing.type === 'auction') {
      // For auctions, this should be a buy-now purchase
      if (!listing.metadata.allowBuyNow) {
        throw new Error('Buy now not allowed for this auction');
      }

      const buyNowPrice = listing.metadata.buyNowPrice;
      if (!buyNowPrice || amount !== buyNowPrice) {
        throw new Error('Invalid buy now price');
      }
    } else {
      // Direct sale
      if (amount && amount !== listing.price) {
        throw new Error('Invalid purchase price');
      }
    }

    // Check buyer balance
    const purchasePrice = amount || listing.price;
    if (buyer.inventory.VXC < parseFloat(purchasePrice)) {
      throw new Error('Insufficient balance');
    }

    // Execute purchase on blockchain
    const txHash = await blockchainService.purchaseNFT({
      listingId: listing._id.toString(),
      buyer: buyerId,
      price: ethers.utils.parseEther(purchasePrice)
    });

    // Update listing
    listing.buyerId = buyerId;
    listing.status = 'completed';
    listing.completedAt = new Date();
    listing.transactionHash = txHash;
    await listing.save();

    // Update NFT ownership
    const nft = await NFT.findById(listing.nftId);
    if (nft) {
      nft.ownerId = buyerId;
      nft.status = 'owned';
      await nft.save();
    }

    // Update user balances and stats
    const seller = await User.findById(listing.sellerId);
    if (seller) {
      seller.inventory.VXC += parseFloat(purchasePrice) * 0.975; // 2.5% marketplace fee
      seller.stats.totalEarnings += parseFloat(purchasePrice) * 0.975;
      await seller.save();
    }

    buyer.inventory.VXC -= parseFloat(purchasePrice);
    await buyer.save();

    return listing;
  }

  /**
   * Place a bid on an auction
   */
  async placeBid(params: { listingId: string; buyerId: string; bidAmount: string }): Promise<void> {
    const { listingId, buyerId, bidAmount } = params;

    const listing = await Transaction.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.type !== 'auction') {
      throw new Error('This is not an auction');
    }

    if (listing.status !== 'active') {
      throw new Error('Auction is not active');
    }

    if (new Date() > listing.auctionEndTime!) {
      throw new Error('Auction has ended');
    }

    const bidValue = parseFloat(bidAmount);
    const currentHighestBid = listing.metadata.bids.length > 0 
      ? Math.max(...listing.metadata.bids.map((bid: any) => parseFloat(bid.amount)))
      : parseFloat(listing.price);

    // Check minimum bid requirements
    const minBidIncrement = parseFloat(listing.metadata.minBidIncrement || '0.01');
    const minRequiredBid = currentHighestBid + minBidIncrement;

    if (bidValue < minRequiredBid) {
      throw new Error(`Bid must be at least ${minRequiredBid} VXC`);
    }

    // Check bidder balance
    const bidder = await User.findById(buyerId);
    if (!bidder) {
      throw new Error('Bidder not found');
    }

    if (bidder.inventory.VXC < bidValue) {
      throw new Error('Insufficient balance for bid');
    }

    // Place bid on blockchain (creates escrow)
    const txHash = await blockchainService.placeBid({
      listingId: listing._id.toString(),
      bidder: buyerId,
      bidAmount: ethers.utils.parseEther(bidAmount)
    });

    // Add bid to listing
    listing.metadata.bids.push({
      bidderId: buyerId,
      amount: bidAmount,
      timestamp: new Date(),
      transactionHash: txHash
    });

    await listing.save();

    // Update bidder's balance (escrow)
    bidder.inventory.VXC -= bidValue;
    await bidder.save();
  }

  /**
   * Finalize an auction
   */
  async finalizeAuction(listingId: string): Promise<ITransaction> {
    const listing = await Transaction.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.type !== 'auction') {
      throw new Error('This is not an auction');
    }

    if (listing.status !== 'active') {
      throw new Error('Auction is not active');
    }

    if (new Date() < listing.auctionEndTime!) {
      throw new Error('Auction has not ended yet');
    }

    // Find highest bid
    const bids = listing.metadata.bids || [];
    if (bids.length === 0) {
      // No bids, return NFT to seller
      listing.status = 'cancelled';
      listing.completedAt = new Date();
      await listing.save();

      const nft = await NFT.findById(listing.nftId);
      if (nft) {
        nft.status = 'owned';
        await nft.save();
      }

      return listing;
    }

    // Find winning bid
    const winningBid = bids.reduce((prev: any, current: any) => 
      parseFloat(current.amount) > parseFloat(prev.amount) ? current : prev
    );

    // Execute final transaction
    const txHash = await blockchainService.finalizeAuction({
      listingId: listing._id.toString(),
      winner: winningBid.bidderId,
      finalPrice: ethers.utils.parseEther(winningBid.amount)
    });

    // Update listing
    listing.buyerId = winningBid.bidderId;
    listing.price = winningBid.amount;
    listing.status = 'completed';
    listing.completedAt = new Date();
    listing.transactionHash = txHash;
    await listing.save();

    // Update NFT ownership
    const nft = await NFT.findById(listing.nftId);
    if (nft) {
      nft.ownerId = winningBid.bidderId;
      nft.status = 'owned';
      await nft.save();
    }

    // Process payments
    const seller = await User.findById(listing.sellerId);
    const buyer = await User.findById(winningBid.bidderId);

    if (seller) {
      const salePrice = parseFloat(winningBid.amount);
      seller.inventory.VXC += salePrice * 0.975; // 2.5% marketplace fee
      seller.stats.totalEarnings += salePrice * 0.975;
      await seller.save();
    }

    // Release non-winning bids
    for (const bid of bids) {
      if (bid.bidderId !== winningBid.bidderId) {
        const bidder = await User.findById(bid.bidderId);
        if (bidder) {
          bidder.inventory.VXC += parseFloat(bid.amount);
          await bidder.save();
        }
      }
    }

    return listing;
  }

  /**
   * Search marketplace listings
   */
  async searchListings(params: SearchParams): Promise<{
    listings: ITransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      query,
      category,
      minPrice,
      maxPrice,
      status = 'active',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = params;

    const searchQuery: any = { type: { $in: ['sale', 'auction'] } };

    // Status filter
    if (status === 'active') {
      searchQuery.status = 'active';
      searchQuery.$or = [
        { type: 'sale' },
        { type: 'auction', auctionEndTime: { $gt: new Date() } }
      ];
    } else if (status) {
      searchQuery.status = status;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      searchQuery.price = {};
      if (minPrice) searchQuery.price.$gte = minPrice;
      if (maxPrice) searchQuery.price.$lte = maxPrice;
    }

    // Text search (on NFT metadata)
    if (query) {
      const nfts = await NFT.find({
        $or: [
          { name: new RegExp(query, 'i') },
          { description: new RegExp(query, 'i') },
          { 'metadata.category': new RegExp(query, 'i') }
        ]
      }).select('_id');

      searchQuery.nftId = { $in: nfts.map(nft => nft._id) };
    }

    // Category filter
    if (category) {
      const categoryNfts = await NFT.find({
        'metadata.category': new RegExp(category, 'i')
      }).select('_id');

      if (searchQuery.nftId) {
        searchQuery.nftId.$in = searchQuery.nftId.$in.filter((id: string) => 
          categoryNfts.some((nft: any) => nft._id.toString() === id.toString())
        );
      } else {
        searchQuery.nftId = { $in: categoryNfts.map(nft => nft._id) };
      }
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Sort options
    const sort: any = {};
    if (sortBy === 'price') {
      sort.price = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'endTime') {
      sort.auctionEndTime = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    // Execute query
    const [listings, total] = await Promise.all([
      Transaction.find(searchQuery)
        .populate('nftId', 'name image metadata contractAddress tokenId')
        .populate('sellerId', 'username avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(searchQuery)
    ]);

    return {
      listings,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Create NFT rental agreement
   */
  async createRental(params: RentalParams): Promise<ITransaction> {
    const {
      nftId,
      ownerId,
      tenantId,
      period,
      pricePerDay,
      maxPeriod,
      autoRenewal = false
    } = params;

    // Verify NFT ownership
    const nft = await NFT.findById(nftId);
    if (!nft) {
      throw new Error('NFT not found');
    }

    if (nft.ownerId.toString() !== ownerId) {
      throw new Error('Not the owner of the NFT');
    }

    // Check if NFT supports rentals
    if (!nft.metadata.rentable) {
      throw new Error('This NFT is not available for rental');
    }

    // Check rental period limits
    if (maxPeriod && period > maxPeriod) {
      throw new Error(`Rental period exceeds maximum of ${maxPeriod} days`);
    }

    const totalPrice = parseFloat(pricePerDay) * period;

    // Check tenant balance
    const tenant = await User.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.inventory.VXC < totalPrice) {
      throw new Error('Insufficient balance for rental');
    }

    // Create rental agreement
    const rental = await Transaction.create({
      nftId,
      sellerId: ownerId, // Owner
      buyerId: tenantId, // Tenant
      type: 'rental',
      price: totalPrice.toString(),
      status: 'active',
      metadata: {
        pricePerDay,
        period,
        startDate: new Date(),
        endDate: new Date(Date.now() + period * 24 * 60 * 60 * 1000),
        autoRenewal,
        renewalPrice: pricePerDay
      }
    });

    // Create smart contract rental
    await blockchainService.createRental({
      nftAddress: nft.contractAddress,
      tokenId: nft.tokenId,
      owner: ownerId,
      tenant: tenantId,
      pricePerDay: ethers.utils.parseEther(pricePerDay),
      period
    });

    // Transfer payment
    tenant.inventory.VXC -= totalPrice;
    await tenant.save();

    // Update NFT status
    nft.metadata.rentalInfo = {
      tenant: tenantId,
      endDate: rental.metadata.endDate,
      pricePerDay
    };
    await nft.save();

    return rental;
  }

  /**
   * End rental agreement
   */
  async endRental(rentalId: string): Promise<void> {
    const rental = await Transaction.findById(rentalId);
    if (!rental) {
      throw new Error('Rental not found');
    }

    if (rental.type !== 'rental') {
      throw new Error('This is not a rental');
    }

    if (rental.status !== 'active') {
      throw new Error('Rental is not active');
    }

    const now = new Date();
    const endDate = rental.metadata.endDate;

    // Check if rental has ended
    if (now < endDate && !rental.metadata.autoRenewal) {
      throw new Error('Rental period has not ended');
    }

    // End rental on blockchain
    await blockchainService.endRental({
      rentalId: rental._id.toString()
    });

    // Process payment to owner
    const owner = await User.findById(rental.sellerId);
    if (owner) {
      const totalPrice = parseFloat(rental.price);
      owner.inventory.VXC += totalPrice * 0.95; // 5% platform fee for rentals
      owner.stats.totalEarnings += totalPrice * 0.95;
      await owner.save();
    }

    // Update rental status
    rental.status = 'completed';
    rental.completedAt = new Date();
    await rental.save();

    // Update NFT status
    const nft = await NFT.findById(rental.nftId);
    if (nft) {
      delete nft.metadata.rentalInfo;
      await nft.save();
    }
  }

  /**
   * Create bundle listing
   */
  async createBundle(params: BundleParams): Promise<ITransaction> {
    const {
      nftIds,
      sellerId,
      totalPrice,
      discount = 0,
      description
    } = params;

    // Verify all NFTs are owned by seller
    for (const nftId of nftIds) {
      const nft = await NFT.findById(nftId);
      if (!nft) {
        throw new Error(`NFT ${nftId} not found`);
      }

      if (nft.ownerId.toString() !== sellerId) {
        throw new Error(`Not the owner of NFT ${nftId}`);
      }

      // Check if NFT is already listed
      const existingListing = await Transaction.findOne({
        nftId,
        status: 'active'
      });

      if (existingListing) {
        throw new Error(`NFT ${nftId} is already listed`);
      }
    }

    // Create bundle listing
    const bundle = await Transaction.create({
      sellerId,
      type: 'bundle',
      price: totalPrice,
      status: 'active',
      metadata: {
        nftIds,
        discount,
        description,
        individualPrices: await this.calculateIndividualPrices(nftIds)
      }
    });

    // Create smart contract bundle
    await blockchainService.createBundle({
      nftIds,
      seller: sellerId,
      totalPrice: ethers.utils.parseEther(totalPrice),
      discount
    });

    // Update NFT statuses
    for (const nftId of nftIds) {
      const nft = await NFT.findById(nftId);
      if (nft) {
        nft.status = 'listed';
        await nft.save();
      }
    }

    return bundle;
  }

  /**
   * Purchase a bundle
   */
  async purchaseBundle(bundleId: string, buyerId: string): Promise<ITransaction> {
    const bundle = await Transaction.findById(bundleId);
    if (!bundle) {
      throw new Error('Bundle not found');
    }

    if (bundle.type !== 'bundle') {
      throw new Error('This is not a bundle listing');
    }

    if (bundle.status !== 'active') {
      throw new Error('Bundle is not active');
    }

    const buyer = await User.findById(buyerId);
    if (!buyer) {
      throw new Error('Buyer not found');
    }

    const bundlePrice = parseFloat(bundle.price);
    if (buyer.inventory.VXC < bundlePrice) {
      throw new Error('Insufficient balance');
    }

    // Purchase bundle on blockchain
    const txHash = await blockchainService.purchaseBundle({
      bundleId: bundle._id.toString(),
      buyer: buyerId,
      price: ethers.utils.parseEther(bundle.price)
    });

    // Update bundle
    bundle.buyerId = buyerId;
    bundle.status = 'completed';
    bundle.completedAt = new Date();
    bundle.transactionHash = txHash;
    await bundle.save();

    // Transfer NFT ownership
    for (const nftId of bundle.metadata.nftIds) {
      const nft = await NFT.findById(nftId);
      if (nft) {
        nft.ownerId = buyerId;
        nft.status = 'owned';
        await nft.save();
      }
    }

    // Process payments
    const seller = await User.findById(bundle.sellerId);
    if (seller) {
      seller.inventory.VXC += bundlePrice * 0.975; // 2.5% marketplace fee
      seller.stats.totalEarnings += bundlePrice * 0.975;
      await seller.save();
    }

    buyer.inventory.VXC -= bundlePrice;
    await buyer.save();

    return bundle;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: string, options: {
    type?: 'purchase' | 'sale' | 'auction' | 'rental' | 'bundle';
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    transactions: ITransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { type, status, page = 1, limit = 20 } = options;

    const query: any = {
      $or: [
        { sellerId: userId },
        { buyerId: userId }
      ]
    };

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('nftId', 'name image metadata')
        .populate('sellerId', 'username avatar')
        .populate('buyerId', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(query)
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats(): Promise<{
    totalVolume: string;
    totalSales: number;
    activeListings: number;
    uniqueSellers: number;
    averagePrice: string;
    trendingNFTs: any[];
  }> {
    // Calculate total volume
    const volumeData = await Transaction.aggregate([
      { $match: { status: 'completed', type: { $in: ['sale', 'auction', 'bundle'] } } },
      { $group: { _id: null, totalVolume: { $sum: { $toDouble: '$price' } } } }
    ]);

    // Count statistics
    const [totalSales, activeListings, sellerCount] = await Promise.all([
      Transaction.countDocuments({ status: 'completed' }),
      Transaction.countDocuments({ status: 'active' }),
      Transaction.distinct('sellerId', { status: 'completed' }).then(arr => arr.length)
    ]);

    // Calculate average price
    const avgPrice = await Transaction.aggregate([
      { $match: { status: 'completed', type: { $in: ['sale', 'auction'] } } },
      { $group: { _id: null, avgPrice: { $avg: { $toDouble: '$price' } } } }
    ]);

    // Get trending NFTs (most traded in last 7 days)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendingNFTs = await Transaction.aggregate([
      { 
        $match: { 
          status: 'completed', 
          completedAt: { $gte: oneWeekAgo },
          type: { $in: ['sale', 'auction'] }
        } 
      },
      { 
        $group: { 
          _id: '$nftId', 
          totalVolume: { $sum: { $toDouble: '$price' } },
          salesCount: { $sum: 1 }
        } 
      },
      { $sort: { totalVolume: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'nfts',
          localField: '_id',
          foreignField: '_id',
          as: 'nft'
        }
      },
      { $unwind: '$nft' }
    ]);

    return {
      totalVolume: volumeData[0]?.totalVolume?.toString() || '0',
      totalSales,
      activeListings,
      uniqueSellers: sellerCount,
      averagePrice: avgPrice[0]?.avgPrice?.toString() || '0',
      trendingNFTs: trendingNFTs.map(item => ({
        ...item.nft,
        volume: item.totalVolume,
        salesCount: item.salesCount
      }))
    };
  }

  /**
   * Calculate individual prices for bundle
   */
  private async calculateIndividualPrices(nftIds: string[]): Promise<{ [key: string]: string }> {
    const prices: { [key: string]: string } = {};

    for (const nftId of nftIds) {
      // Get recent sales to estimate price
      const recentSale = await Transaction.findOne({
        nftId,
        status: 'completed',
        type: { $in: ['sale', 'auction'] }
      }).sort({ completedAt: -1 });

      if (recentSale) {
        prices[nftId] = recentSale.price;
      } else {
        // Default price if no recent sales
        prices[nftId] = '1.0';
      }
    }

    return prices;
  }
}

export default new MarketplaceService();
