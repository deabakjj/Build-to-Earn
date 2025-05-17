// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title BaseNFT
 * @dev DIY 크래프팅 월드의 기본 NFT 컨트랙트
 * 
 * 주요 기능:
 * - ERC721 기반 NFT 발행 및 관리
 * - 메타데이터 저장 (IPFS/Arweave)
 * - 로열티 기능
 * - 업그레이드 시스템
 * - 등급 시스템 (희귀도)
 */
abstract contract BaseNFT is 
    ERC721, 
    ERC721URIStorage, 
    ERC721Enumerable, 
    AccessControl, 
    Pausable, 
    ReentrancyGuard 
{
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    // 역할 정의
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // 카운터
    Counters.Counter private _tokenIdCounter;

    // NFT 정보
    struct NFTMetadata {
        string name;
        string description;
        address creator;
        uint256 createdAt;
        uint8 rarity; // 0: Common, 1: Uncommon, 2: Rare, 3: Epic, 4: Legendary
        uint8 level;
        string[] attributes;
        bool isUpgradeable;
        uint256 lastUpgrade;
    }

    // 저장소
    mapping(uint256 => NFTMetadata) public nftMetadata;
    mapping(uint256 => address) public royaltyRecipients;
    mapping(uint256 => uint256) public royaltyRates; // 100 = 1%
    mapping(uint8 => uint256) public rarityMintCosts;
    mapping(uint8 => uint256) public rarityMaxSupply;
    mapping(uint8 => uint256) public rarityCurrentSupply;

    // 설정
    uint256 public constant MAX_ROYALTY_RATE = 1000; // 10%
    uint256 public constant UPGRADE_COOLDOWN = 7 days;
    address public paymentToken; // VXC 토큰 주소

    // 이벤트
    event NFTMinted(uint256 indexed tokenId, address indexed creator, uint8 rarity);
    event NFTUpgraded(uint256 indexed tokenId, uint8 newLevel);
    event RoyaltySet(uint256 indexed tokenId, address recipient, uint256 rate);
    event PaymentTokenUpdated(address newToken);
    event RarityConfigUpdated(uint8 rarity, uint256 cost, uint256 maxSupply);

    /**
     * @dev 컨트랙트 초기화
     * @param name NFT 컬렉션 이름
     * @param symbol NFT 심볼
     * @param _paymentToken VXC 토큰 주소
     */
    constructor(string memory name, string memory symbol, address _paymentToken) 
        ERC721(name, symbol) 
    {
        // 역할 설정
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        // 결제 토큰 설정
        paymentToken = _paymentToken;

        // 희귀도별 초기 설정
        _setupRarityConfig();
    }

    /**
     * @dev 희귀도별 초기 설정
     */
    function _setupRarityConfig() private {
        // Common (75%)
        rarityMintCosts[0] = 100 * 10**18; // 100 VXC
        rarityMaxSupply[0] = type(uint256).max;

        // Uncommon (15%)
        rarityMintCosts[1] = 500 * 10**18; // 500 VXC
        rarityMaxSupply[1] = 10000;

        // Rare (7%)
        rarityMintCosts[2] = 2000 * 10**18; // 2000 VXC
        rarityMaxSupply[2] = 3500;

        // Epic (2%)
        rarityMintCosts[3] = 8000 * 10**18; // 8000 VXC
        rarityMaxSupply[3] = 1000;

        // Legendary (1%)
        rarityMintCosts[4] = 30000 * 10**18; // 30000 VXC
        rarityMaxSupply[4] = 200;
    }

    /**
     * @dev NFT 발행
     * @param to NFT를 받을 주소
     * @param uri 메타데이터 URI
     * @param metadata NFT 메타데이터
     * @param royaltyRate 로열티 비율 (100 = 1%)
     */
    function mint(
        address to,
        string memory uri,
        NFTMetadata memory metadata,
        uint256 royaltyRate
    ) public virtual onlyRole(MINTER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(metadata.rarity <= 4, "Invalid rarity level");
        require(royaltyRate <= MAX_ROYALTY_RATE, "Royalty rate too high");
        require(rarityCurrentSupply[metadata.rarity] < rarityMaxSupply[metadata.rarity], "Rarity supply limit reached");

        // VXC 결제 처리 (실제 구현 시 VXC 컨트랙트 연동 필요)
        uint256 mintCost = rarityMintCosts[metadata.rarity];
        if (mintCost > 0) {
            // IVoxelCraft(paymentToken).transferFrom(msg.sender, address(this), mintCost);
        }

        // 토큰 ID 생성
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // NFT 발행
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        // 메타데이터 저장
        metadata.creator = msg.sender;
        metadata.createdAt = block.timestamp;
        metadata.level = 1;
        nftMetadata[tokenId] = metadata;

        // 로열티 설정
        royaltyRecipients[tokenId] = metadata.creator;
        royaltyRates[tokenId] = royaltyRate;

        // 희귀도별 공급량 업데이트
        rarityCurrentSupply[metadata.rarity] = rarityCurrentSupply[metadata.rarity].add(1);

        emit NFTMinted(tokenId, msg.sender, metadata.rarity);
        emit RoyaltySet(tokenId, metadata.creator, royaltyRate);

        return tokenId;
    }

    /**
     * @dev NFT 업그레이드
     * @param tokenId 업그레이드할 NFT ID
     * @param materials 업그레이드 재료
     */
    function upgradeNFT(uint256 tokenId, uint256[] memory materials) 
        external 
        onlyRole(UPGRADER_ROLE) 
        nonReentrant 
        whenNotPaused 
    {
        require(_exists(tokenId), "Token does not exist");
        
        NFTMetadata storage metadata = nftMetadata[tokenId];
        require(metadata.isUpgradeable, "NFT is not upgradeable");
        require(block.timestamp >= metadata.lastUpgrade.add(UPGRADE_COOLDOWN), "Upgrade cooldown not met");
        require(metadata.level < 10, "Maximum level reached");

        // 업그레이드 재료 소각 처리
        _burnUpgradeMaterials(materials);

        // 레벨업
        metadata.level += 1;
        metadata.lastUpgrade = block.timestamp;

        emit NFTUpgraded(tokenId, metadata.level);
    }

    /**
     * @dev 업그레이드 재료 소각 처리 (하위 클래스에서 구현)
     */
    function _burnUpgradeMaterials(uint256[] memory materials) internal virtual;

    /**
     * @dev 로열티 정보 조회 (EIP-2981)
     * @param tokenId 토큰 ID
     * @param salePrice 판매 가격
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice) 
        external 
        view 
        returns (address receiver, uint256 royaltyAmount) 
    {
        require(_exists(tokenId), "Token does not exist");
        
        address recipient = royaltyRecipients[tokenId];
        uint256 rate = royaltyRates[tokenId];
        uint256 royalty = salePrice.mul(rate).div(10000);
        
        return (recipient, royalty);
    }

    /**
     * @dev 토큰 URI 업데이트
     * @param tokenId 토큰 ID
     * @param uri 새로운 URI
     */
    function updateTokenURI(uint256 tokenId, string memory uri) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(_exists(tokenId), "Token does not exist");
        _setTokenURI(tokenId, uri);
    }

    /**
     * @dev 희귀도 설정 업데이트
     * @param rarity 희귀도 레벨
     * @param cost 민팅 비용
     * @param maxSupply 최대 공급량
     */
    function updateRarityConfig(uint8 rarity, uint256 cost, uint256 maxSupply) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(rarity <= 4, "Invalid rarity level");
        
        rarityMintCosts[rarity] = cost;
        rarityMaxSupply[rarity] = maxSupply;
        
        emit RarityConfigUpdated(rarity, cost, maxSupply);
    }

    /**
     * @dev 컨트랙트 일시 중지
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev 컨트랙트 일시 중지 해제
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev NFT 메타데이터 조회
     * @param tokenId 토큰 ID
     */
    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory) {
        require(_exists(tokenId), "Token does not exist");
        return nftMetadata[tokenId];
    }

    /**
     * @dev 희귀도별 공급량 정보 조회
     */
    function getRaritySupplyInfo() external view returns (
        uint256[5] memory currentSupplies,
        uint256[5] memory maxSupplies,
        uint256[5] memory mintCosts
    ) {
        for (uint8 i = 0; i < 5; i++) {
            currentSupplies[i] = rarityCurrentSupply[i];
            maxSupplies[i] = rarityMaxSupply[i];
            mintCosts[i] = rarityMintCosts[i];
        }
        
        return (currentSupplies, maxSupplies, mintCosts);
    }

    /**
     * @dev 필수 오버라이드 함수들
     */
    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        whenNotPaused
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
