import { ethers } from 'ethers';
import config from '../config';

// Import ABI (these would be imported from compiled contract files)
import VoxelCraftABI from '../../../smart-contracts/artifacts/contracts/tokens/VoxelCraft.sol/VoxelCraft.json';
import PlotXABI from '../../../smart-contracts/artifacts/contracts/tokens/PlotX.sol/PlotX.json';
import ItemNFTABI from '../../../smart-contracts/artifacts/contracts/nft/ItemNFT.sol/ItemNFT.json';
import BuildingNFTABI from '../../../smart-contracts/artifacts/contracts/nft/BuildingNFT.sol/BuildingNFT.json';
import VehicleNFTABI from '../../../smart-contracts/artifacts/contracts/nft/VehicleNFT.sol/VehicleNFT.json';
import LandNFTABI from '../../../smart-contracts/artifacts/contracts/nft/LandNFT.sol/LandNFT.json';
import MarketplaceABI from '../../../smart-contracts/artifacts/contracts/marketplace/Marketplace.sol/Marketplace.json';
import RewardVaultABI from '../../../smart-contracts/artifacts/contracts/rewards/RewardVault.sol/RewardVault.json';
import StakingPoolABI from '../../../smart-contracts/artifacts/contracts/rewards/StakingPool.sol/StakingPool.json';
import DAOABI from '../../../smart-contracts/artifacts/contracts/governance/DAO.sol/DAO.json';

interface ContractAddresses {
  VoxelCraft: string;
  PlotX: string;
  ItemNFT: string;
  BuildingNFT: string;
  VehicleNFT: string;
  LandNFT: string;
  Marketplace: string;
  RewardVault: string;
  StakingPool: string;
  DAO: string;
}

interface MintNFTParams {
  type: 'item' | 'building' | 'vehicle' | 'land';
  recipient: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: any[];
    properties: any;
  };
}

interface TransferParams {
  tokenAddress: string;
  from: string;
  to: string;
  amount: ethers.BigNumber;
}

interface MarketplaceListingParams {
  nftAddress: string;
  tokenId: string;
  seller: string;
  price: ethers.BigNumber;
  isAuction?: boolean;
}

interface StakingParams {
  user: string;
  amount: ethers.BigNumber;
  duration: number; // in seconds
}

interface DAOProposalParams {
  proposer: string;
  title: string;
  description: string;
  targets: string[];
  values: ethers.BigNumber[];
  calldatas: string[];
  descriptionHash: string;
}

class BlockchainService {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private contracts: {
    [key: string]: ethers.Contract;
  } = {};

  constructor() {
    // Initialize provider based on environment
    if (config.blockchain.network === 'local') {
      this.provider = new ethers.providers.JsonRpcProvider(config.blockchain.rpcUrl);
    } else {
      this.provider = new ethers.providers.JsonRpcProvider(config.blockchain.rpcUrl);
    }

    // Initialize signer (this would be configured based on your setup)
    const privateKey = config.blockchain.privateKey;
    this.signer = new ethers.Wallet(privateKey, this.provider);

    // Initialize contracts
    this.initializeContracts();
  }

  private initializeContracts(): void {
    const addresses: ContractAddresses = config.blockchain.contractAddresses;

    this.contracts.VoxelCraft = new ethers.Contract(addresses.VoxelCraft, VoxelCraftABI.abi, this.signer);
    this.contracts.PlotX = new ethers.Contract(addresses.PlotX, PlotXABI.abi, this.signer);
    this.contracts.ItemNFT = new ethers.Contract(addresses.ItemNFT, ItemNFTABI.abi, this.signer);
    this.contracts.BuildingNFT = new ethers.Contract(addresses.BuildingNFT, BuildingNFTABI.abi, this.signer);
    this.contracts.VehicleNFT = new ethers.Contract(addresses.VehicleNFT, VehicleNFTABI.abi, this.signer);
    this.contracts.LandNFT = new ethers.Contract(addresses.LandNFT, LandNFTABI.abi, this.signer);
    this.contracts.Marketplace = new ethers.Contract(addresses.Marketplace, MarketplaceABI.abi, this.signer);
    this.contracts.RewardVault = new ethers.Contract(addresses.RewardVault, RewardVaultABI.abi, this.signer);
    this.contracts.StakingPool = new ethers.Contract(addresses.StakingPool, StakingPoolABI.abi, this.signer);
    this.contracts.DAO = new ethers.Contract(addresses.DAO, DAOABI.abi, this.signer);
  }

  /**
   * Mint NFT
   */
  async mintNFT(params: MintNFTParams): Promise<string> {
    const { type, recipient, metadata } = params;

    // Upload metadata to IPFS
    const metadataUri = await this.uploadToIPFS(metadata);

    // Select appropriate contract
    let contract: ethers.Contract;
    switch (type) {
      case 'item':
        contract = this.contracts.ItemNFT;
        break;
      case 'building':
        contract = this.contracts.BuildingNFT;
        break;
      case 'vehicle':
        contract = this.contracts.VehicleNFT;
        break;
      case 'land':
        contract = this.contracts.LandNFT;
        break;
      default:
        throw new Error('Invalid NFT type');
    }

    // Mint NFT
    const tx = await contract.mint(recipient, metadataUri);
    const receipt = await tx.wait();

    // Extract token ID from events
    const tokenId = this.extractTokenId(receipt, contract);

    return tokenId;
  }

  /**
   * Transfer tokens
   */
  async transferToken(params: TransferParams): Promise<string> {
    const { tokenAddress, from, to, amount } = params;

    const contract = new ethers.Contract(tokenAddress, ['function transferFrom(address,address,uint256) returns (bool)'], this.signer);
    
    const tx = await contract.transferFrom(from, to, amount);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Create marketplace listing
   */
  async createMarketplaceListing(params: MarketplaceListingParams): Promise<string> {
    const { nftAddress, tokenId, seller, price, isAuction } = params;

    // First, approve marketplace to transfer NFT
    const nftContract = new ethers.Contract(nftAddress, ['function approve(address,uint256)'], this.signer);
    await nftContract.approve(this.contracts.Marketplace.address, tokenId);

    // Create listing
    const tx = isAuction 
      ? await this.contracts.Marketplace.createAuction(nftAddress, tokenId, price, 86400) // 24 hours default
      : await this.contracts.Marketplace.createListing(nftAddress, tokenId, price);

    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  /**
   * Purchase NFT from marketplace
   */
  async purchaseNFT(params: {
    listingId: string;
    buyer: string;
    price: ethers.BigNumber;
  }): Promise<string> {
    const { listingId, buyer, price } = params;

    // First, approve marketplace to transfer tokens
    await this.contracts.VoxelCraft.connect(this.signer).approve(this.contracts.Marketplace.address, price);

    // Purchase NFT
    const tx = await this.contracts.Marketplace.purchaseListing(listingId, { value: price });
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Stake tokens
   */
  async stakeTokens(params: StakingParams): Promise<string> {
    const { user, amount, duration } = params;

    // Approve staking pool to transfer tokens
    await this.contracts.PlotX.connect(this.signer).approve(this.contracts.StakingPool.address, amount);

    // Stake tokens
    const tx = await this.contracts.StakingPool.stake(amount, duration);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Claim staking rewards
   */
  async claimStakingRewards(user: string): Promise<string> {
    const tx = await this.contracts.StakingPool.claimRewards(user);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Create DAO proposal
   */
  async createDAOProposal(params: DAOProposalParams): Promise<string> {
    const { proposer, title, description, targets, values, calldatas, descriptionHash } = params;

    const tx = await this.contracts.DAO.propose(targets, values, calldatas, description);
    const receipt = await tx.wait();

    // Extract proposal ID from events
    const proposalId = this.extractProposalId(receipt);

    return proposalId;
  }

  /**
   * Vote on DAO proposal
   */
  async voteOnProposal(params: {
    proposalId: string;
    voter: string;
    support: boolean;
    reason?: string;
  }): Promise<string> {
    const { proposalId, voter, support, reason } = params;

    const tx = await this.contracts.DAO.castVoteWithReason(proposalId, support ? 1 : 0, reason || '');
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Distribute season rewards
   */
  async deploySeasonRewards(params: {
    seasonId: string;
    vxcPool: ethers.BigNumber;
    ptxPool: ethers.BigNumber;
  }): Promise<string> {
    const { seasonId, vxcPool, ptxPool } = params;

    // Transfer tokens to reward vault
    await this.contracts.VoxelCraft.transfer(this.contracts.RewardVault.address, vxcPool);
    await this.contracts.PlotX.transfer(this.contracts.RewardVault.address, ptxPool);

    // Create season in reward vault
    const tx = await this.contracts.RewardVault.createSeason(seasonId, vxcPool, ptxPool);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Grant quest rewards
   */
  async grantQuestRewards(params: {
    userId: string;
    questId: string;
    rewards: {
      vxc?: ethers.BigNumber;
      ptx?: ethers.BigNumber;
      nfts?: string[];
    };
  }): Promise<string> {
    const { userId, questId, rewards } = params;

    const tx = await this.contracts.RewardVault.grantQuestRewards(
      userId,
      questId,
      rewards.vxc || 0,
      rewards.ptx || 0,
      rewards.nfts || []
    );
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Create guild treasury
   */
  async createGuildTreasury(params: {
    guildId: string;
    leader: string;
  }): Promise<string> {
    const { guildId, leader } = params;

    // Deploy guild treasury contract
    const GuildTreasury = await ethers.getContractFactory('GuildTreasury', this.signer);
    const treasury = await GuildTreasury.deploy(guildId, leader);
    await treasury.deployed();

    return treasury.address;
  }

  /**
   * Add guild member
   */
  async addGuildMember(params: {
    guildId: string;
    memberId: string;
  }): Promise<string> {
    const { guildId, memberId } = params;

    // Get guild treasury contract
    const treasuryAddress = await this.getGuildTreasuryAddress(guildId);
    const treasuryContract = new ethers.Contract(treasuryAddress, ['function addMember(address)'], this.signer);

    const tx = await treasuryContract.addMember(memberId);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Handle NFT metadata on-chain verification
   */
  async verifyNFTMetadata(params: {
    nftAddress: string;
    tokenId: string;
    metadataHash: string;
  }): Promise<boolean> {
    const { nftAddress, tokenId, metadataHash } = params;

    const nftContract = new ethers.Contract(nftAddress, ['function tokenURI(uint256) view returns (string)'], this.provider);
    const tokenURI = await nftContract.tokenURI(tokenId);

    // Fetch metadata from IPFS
    const metadata = await this.fetchFromIPFS(tokenURI);
    const currentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(metadata)));

    return currentHash === metadataHash;
  }

  /**
   * Get contract balances
   */
  async getContractBalances(contractAddress: string): Promise<{
    vxc: string;
    ptx: string;
    nfts: { [address: string]: string[] };
  }> {
    const vxcBalance = await this.contracts.VoxelCraft.balanceOf(contractAddress);
    const ptxBalance = await this.contracts.PlotX.balanceOf(contractAddress);

    // Get NFT balances for each NFT contract
    const nftContracts = [
      this.contracts.ItemNFT,
      this.contracts.BuildingNFT,
      this.contracts.VehicleNFT,
      this.contracts.LandNFT
    ];

    const nfts: { [address: string]: string[] } = {};

    for (const contract of nftContracts) {
      const balance = await contract.balanceOf(contractAddress);
      const tokenIds: string[] = [];

      // Get all token IDs for this contract
      for (let i = 0; i < balance.toNumber(); i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(contractAddress, i);
        tokenIds.push(tokenId.toString());
      }

      nfts[contract.address] = tokenIds;
    }

    return {
      vxc: ethers.utils.formatEther(vxcBalance),
      ptx: ethers.utils.formatEther(ptxBalance),
      nfts
    };
  }

  /**
   * Get gas price estimation
   */
  async estimateGasPrice(): Promise<string> {
    const gasPrice = await this.provider.getGasPrice();
    return ethers.utils.formatUnits(gasPrice, 'gwei');
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<{
    network: string;
    chainId: number;
    blockNumber: number;
    gasPrice: string;
  }> {
    const [network, blockNumber, gasPrice] = await Promise.all([
      this.provider.getNetwork(),
      this.provider.getBlockNumber(),
      this.provider.getGasPrice()
    ]);

    return {
      network: network.name,
      chainId: network.chainId,
      blockNumber,
      gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei')
    };
  }

  /**
   * Handle auction-specific operations
   */
  async placeBid(params: {
    listingId: string;
    bidder: string;
    bidAmount: ethers.BigNumber;
  }): Promise<string> {
    const { listingId, bidder, bidAmount } = params;

    // Approve marketplace to transfer tokens
    await this.contracts.VoxelCraft.connect(this.signer).approve(this.contracts.Marketplace.address, bidAmount);

    // Place bid
    const tx = await this.contracts.Marketplace.placeBid(listingId, bidAmount);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  async finalizeAuction(params: {
    listingId: string;
    winner: string;
    finalPrice: ethers.BigNumber;
  }): Promise<string> {
    const { listingId, winner, finalPrice } = params;

    const tx = await this.contracts.Marketplace.finalizeAuction(listingId);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Handle rental-specific operations
   */
  async createRental(params: {
    nftAddress: string;
    tokenId: string;
    owner: string;
    tenant: string;
    pricePerDay: ethers.BigNumber;
    period: number;
  }): Promise<string> {
    const { nftAddress, tokenId, owner, tenant, pricePerDay, period } = params;

    // Approve marketplace to manage NFT
    const nftContract = new ethers.Contract(nftAddress, ['function approve(address,uint256)'], this.signer);
    await nftContract.approve(this.contracts.Marketplace.address, tokenId);

    // Create rental agreement
    const tx = await this.contracts.Marketplace.createRental(
      nftAddress,
      tokenId,
      tenant,
      pricePerDay,
      period
    );
    
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  async endRental(params: {
    rentalId: string;
  }): Promise<string> {
    const { rentalId } = params;

    const tx = await this.contracts.Marketplace.endRental(rentalId);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Handle bundle operations
   */
  async createBundle(params: {
    nftIds: string[];
    seller: string;
    totalPrice: ethers.BigNumber;
    discount: number;
  }): Promise<string> {
    const { nftIds, seller, totalPrice, discount } = params;

    // Approve all NFTs in bundle
    for (const nftId of nftIds) {
      // Need to know which contract each NFT belongs to
      // This is simplified - you'd need to track NFT contract addresses
      const nftContract = await this.getNFTContract(nftId);
      await nftContract.approve(this.contracts.Marketplace.address, nftId);
    }

    // Create bundle
    const tx = await this.contracts.Marketplace.createBundle(nftIds, totalPrice, discount);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  async purchaseBundle(params: {
    bundleId: string;
    buyer: string;
    price: ethers.BigNumber;
  }): Promise<string> {
    const { bundleId, buyer, price } = params;

    // Approve marketplace to transfer tokens
    await this.contracts.VoxelCraft.connect(this.signer).approve(this.contracts.Marketplace.address, price);

    // Purchase bundle
    const tx = await this.contracts.Marketplace.purchaseBundle(bundleId);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Special NFT operations
   */
  async mintSeasonalNFT(params: {
    recipient: string;
    metadata: any;
  }): Promise<string> {
    const { recipient, metadata } = params;

    // Upload metadata to IPFS
    const metadataUri = await this.uploadToIPFS(metadata);

    // Mint through season rewards contract
    const tx = await this.contracts.RewardVault.mintSeasonalNFT(recipient, metadataUri);
    const receipt = await tx.wait();

    return this.extractTokenId(receipt, this.contracts.RewardVault);
  }

  async mintProjectNFT(params: {
    recipient: string;
    projectId: string;
    metadata: any;
  }): Promise<string> {
    const { recipient, projectId, metadata } = params;

    // Upload metadata to IPFS
    const metadataUri = await this.uploadToIPFS(metadata);

    // Add project ID to metadata
    const fullMetadata = {
      ...metadata,
      projectId,
      type: 'guild_project'
    };

    // Mint through building NFT contract
    const tx = await this.contracts.BuildingNFT.mintProjectNFT(recipient, metadataUri);
    const receipt = await tx.wait();

    return this.extractTokenId(receipt, this.contracts.BuildingNFT);
  }

  /**
   * Remove guild member
   */
  async removeGuildMember(params: {
    guildId: string;
    memberId: string;
  }): Promise<string> {
    const { guildId, memberId } = params;

    // Get guild treasury contract
    const treasuryAddress = await this.getGuildTreasuryAddress(guildId);
    const treasuryContract = new ethers.Contract(treasuryAddress, ['function removeMember(address)'], this.signer);

    const tx = await treasuryContract.removeMember(memberId);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  /**
   * Transfer guild leadership
   */
  async transferGuildLeadership(params: {
    guildId: string;
    newLeader: string;
  }): Promise<string> {
    const { guildId, newLeader } = params;

    // Get guild treasury contract
    const treasuryAddress = await this.getGuildTreasuryAddress(guildId);
    const treasuryContract = new ethers.Contract(treasuryAddress, ['function transferLeadership(address)'], this.signer);

    const tx = await treasuryContract.transferLeadership(newLeader);
    const receipt = await tx.wait();

    return receipt.transactionHash;
  }

  // Private helper methods
  private async uploadToIPFS(metadata: any): Promise<string> {
    // Implement IPFS upload
    // This is a placeholder - implement with your IPFS client
    const response = await fetch(`${config.ipfs.gateway}/api/v0/add`, {
      method: 'POST',
      body: JSON.stringify(metadata)
    });

    const data = await response.json();
    return `ipfs://${data.Hash}`;
  }

  private async fetchFromIPFS(uri: string): Promise<any> {
    // Implement IPFS fetch
    const hash = uri.replace('ipfs://', '');
    const response = await fetch(`${config.ipfs.gateway}/ipfs/${hash}`);
    return response.json();
  }

  private extractTokenId(receipt: ethers.ContractReceipt, contract: ethers.Contract): string {
    // Find Transfer event
    const event = receipt.events?.find(e => e.event === 'Transfer');
    if (!event) {
      throw new Error('Transfer event not found');
    }

    return event.args?.tokenId.toString();
  }

  private extractProposalId(receipt: ethers.ContractReceipt): string {
    // Find ProposalCreated event
    const event = receipt.events?.find(e => e.event === 'ProposalCreated');
    if (!event) {
      throw new Error('ProposalCreated event not found');
    }

    return event.args?.proposalId.toString();
  }

  private async getGuildTreasuryAddress(guildId: string): Promise<string> {
    // This would typically be stored in a registry contract
    // For now, we'll implement a simple lookup
    // In production, you'd have a GuildRegistry contract
    
    // Placeholder implementation
    return `0x${guildId}treasury`;
  }

  private async getNFTContract(tokenId: string): Promise<ethers.Contract> {
    // This should determine which contract owns a particular token ID
    // For now, we'll check each contract sequentially
    
    const contracts = [
      this.contracts.ItemNFT,
      this.contracts.BuildingNFT,
      this.contracts.VehicleNFT,
      this.contracts.LandNFT
    ];

    for (const contract of contracts) {
      try {
        await contract.ownerOf(tokenId);
        return contract;
      } catch (error) {
        continue;
      }
    }

    throw new Error('NFT not found in any contract');
  }

  /**
   * Event listeners for real-time updates
   */
  setupEventListeners(): void {
    // Listen for NFT transfers
    this.contracts.ItemNFT.on('Transfer', (from, to, tokenId) => {
      console.log(`ItemNFT Transfer: ${tokenId} from ${from} to ${to}`);
      // Handle NFT transfer event
    });

    // Listen for marketplace events
    this.contracts.Marketplace.on('ListingCreated', (listingId, seller, nftAddress, tokenId, price) => {
      console.log(`New listing: ${listingId}`);
      // Handle new listing event
    });

    // Listen for season events
    this.contracts.RewardVault.on('SeasonCreated', (seasonId, vxcPool, ptxPool) => {
      console.log(`New season: ${seasonId}`);
      // Handle new season event
    });

    // Listen for DAO events
    this.contracts.DAO.on('ProposalCreated', (proposalId, proposer, targets, values, signatures, calldatas, startBlock, endBlock, description) => {
      console.log(`New proposal: ${proposalId}`);
      // Handle new proposal event
    });
  }

  /**
   * Stop event listeners
   */
  stopEventListeners(): void {
    // Remove all listeners
    this.contracts.ItemNFT.removeAllListeners();
    this.contracts.BuildingNFT.removeAllListeners();
    this.contracts.VehicleNFT.removeAllListeners();
    this.contracts.LandNFT.removeAllListeners();
    this.contracts.Marketplace.removeAllListeners();
    this.contracts.RewardVault.removeAllListeners();
    this.contracts.DAO.removeAllListeners();
  }
}

export default new BlockchainService();
