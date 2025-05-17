// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title Marketplace
 * @dev DIY 크래프팅 월드의 NFT 마켓플레이스 컨트랙트
 * 
 * 주요 기능:
 * - NFT 고정가 판매
 * - 경매 시스템
 * - 번들 판매
 * - 임대 시스템
 * - 에스크로 기능
 * - 로열티 자동 분배
 */
contract Marketplace is AccessControl, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using EnumerableSet for EnumerableSet.UintSet;

    // 역할 정의
    bytes32 public constant MARKETPLACE_ADMIN_ROLE = keccak256("MARKETPLACE_ADMIN_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    // 리스팅 타입
    enum ListingType {
        FIXED_PRICE,
        AUCTION,
        BUNDLE,
        RENTAL
    }

    // 리스팅 정보
    struct Listing {
        uint256 listingId;
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        uint256 startTime;
        uint256 endTime;
        ListingType listingType;
        bool isActive;
        string metadata;
    }

    // 경매 정보
    struct Auction {
        uint256 highestBid;
        address highestBidder;
        uint256 minBidIncrement;
        uint256 buyNowPrice;
        mapping(address => uint256) bidders;
        address[] biddersList;
    }

    // 번들 정보
    struct Bundle {
        address[] nftContracts;
        uint256[] tokenIds;
        uint256 totalPrice;
        uint256 discount; // 할인율 (percentage)
    }

    // 임대 정보
    struct Rental {
        uint256 dailyRate;
        uint256 maxDuration;
        uint256 securityDeposit;
        address currentRenter;
        uint256 rentalEndTime;
    }

    // 저장소
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => Bundle) public bundles;
    mapping(uint256 => Rental) public rentals;
    mapping(address => EnumerableSet.UintSet) private userListings;
    mapping(address => EnumerableSet.UintSet) private userActiveBids;

    uint256 public listingCounter;
    uint256 public platformFeeRate = 250; // 2.5%
    uint256 public constant MAX_FEE_RATE = 1000; // 10%
    address public feeRecipient;
    address public paymentToken; // VXC 토큰

    // 이벤트
    event ItemListed(uint256 indexed listingId, address indexed seller, address nftContract, uint256 tokenId, uint256 price);
    event ItemSold(uint256 indexed listingId, address indexed buyer, uint256 finalPrice);
    event AuctionCreated(uint256 indexed listingId, uint256 startPrice, uint256 buyNowPrice);
    event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 bidAmount);
    event AuctionEnded(uint256 indexed listingId, address winner, uint256 finalPrice);
    event ListingCancelled(uint256 indexed listingId);
    event RentalStarted(uint256 indexed listingId, address indexed renter, uint256 duration);
    event RentalEnded(uint256 indexed listingId);
    event BundleCreated(uint256 indexed listingId, uint256 itemCount, uint256 discount);

    constructor(address _paymentToken, address _feeRecipient) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_feeRecipient != address(0), "Invalid fee recipient");

        // 역할 설정
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MARKETPLACE_ADMIN_ROLE, msg.sender);
        _grantRole(FEE_MANAGER_ROLE, msg.sender);

        paymentToken = _paymentToken;
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev NFT 고정가 리스팅
     */
    function createFixedPriceListing(
        address _nftContract,
        uint256 _tokenId,
        uint256 _price,
        uint256 _duration,
        string memory _metadata
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(_price > 0, "Price must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");

        // NFT 소유권 및 승인 확인
        IERC721 nft = IERC721(_nftContract);
        require(nft.ownerOf(_tokenId) == msg.sender, "Not the owner");
        require(nft.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        uint256 listingId = listingCounter++;
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            nftContract: _nftContract,
            tokenId: _tokenId,
            price: _price,
            startTime: block.timestamp,
            endTime: block.timestamp.add(_duration),
            listingType: ListingType.FIXED_PRICE,
            isActive: true,
            metadata: _metadata
        });

        userListings[msg.sender].add(listingId);

        emit ItemListed(listingId, msg.sender, _nftContract, _tokenId, _price);
        return listingId;
    }

    /**
     * @dev 고정가 NFT 구매
     */
    function buyFixedPrice(uint256 _listingId) external nonReentrant whenNotPaused {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Listing not active");
        require(listing.listingType == ListingType.FIXED_PRICE, "Not a fixed price listing");
        require(block.timestamp <= listing.endTime, "Listing expired");
        require(msg.sender != listing.seller, "Cannot buy own listing");

        // 대금 결제 처리
        _processPayment(listing.seller, listing.nftContract, listing.tokenId, listing.price);

        // NFT 전송
        IERC721(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        // 리스팅 종료
        listing.isActive = false;
        userListings[listing.seller].remove(_listingId);

        emit ItemSold(_listingId, msg.sender, listing.price);
    }

    /**
     * @dev 경매 생성
     */
    function createAuction(
        address _nftContract,
        uint256 _tokenId,
        uint256 _startPrice,
        uint256 _buyNowPrice,
        uint256 _minBidIncrement,
        uint256 _duration,
        string memory _metadata
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(_startPrice > 0, "Start price must be greater than 0");
        require(_buyNowPrice > _startPrice, "Buy now price must be higher than start price");
        require(_minBidIncrement > 0, "Min bid increment must be greater than 0");

        // NFT 소유권 및 승인 확인
        IERC721 nft = IERC721(_nftContract);
        require(nft.ownerOf(_tokenId) == msg.sender, "Not the owner");
        require(nft.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        uint256 listingId = listingCounter++;
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            nftContract: _nftContract,
            tokenId: _tokenId,
            price: _startPrice,
            startTime: block.timestamp,
            endTime: block.timestamp.add(_duration),
            listingType: ListingType.AUCTION,
            isActive: true,
            metadata: _metadata
        });

        Auction storage auction = auctions[listingId];
        auction.minBidIncrement = _minBidIncrement;
        auction.buyNowPrice = _buyNowPrice;
        auction.highestBid = _startPrice;

        userListings[msg.sender].add(listingId);

        emit AuctionCreated(listingId, _startPrice, _buyNowPrice);
        return listingId;
    }

    /**
     * @dev 경매 입찰
     */
    function placeBid(uint256 _listingId, uint256 _bidAmount) external nonReentrant whenNotPaused {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Listing not active");
        require(listing.listingType == ListingType.AUCTION, "Not an auction");
        require(block.timestamp <= listing.endTime, "Auction expired");
        require(msg.sender != listing.seller, "Cannot bid on own auction");

        Auction storage auction = auctions[_listingId];
        require(_bidAmount >= auction.highestBid.add(auction.minBidIncrement), "Bid too low");

        // 이전 최고 입찰자에게 환불
        if (auction.highestBidder != address(0)) {
            IERC20(paymentToken).transfer(auction.highestBidder, auction.highestBid);
        }

        // 새로운 입찰 처리
        IERC20(paymentToken).transferFrom(msg.sender, address(this), _bidAmount);
        
        auction.highestBid = _bidAmount;
        auction.highestBidder = msg.sender;
        auction.bidders[msg.sender] = _bidAmount;
        
        if (auction.bidders[msg.sender] == 0) {
            auction.biddersList.push(msg.sender);
        }
        
        userActiveBids[msg.sender].add(_listingId);

        emit BidPlaced(_listingId, msg.sender, _bidAmount);

        // 즉시 구매 가격 도달 시 자동 종료
        if (_bidAmount >= auction.buyNowPrice) {
            _endAuction(_listingId);
        }
    }

    /**
     * @dev 경매 종료
     */
    function endAuction(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Listing not active");
        require(listing.listingType == ListingType.AUCTION, "Not an auction");
        require(block.timestamp > listing.endTime, "Auction not ended");

        _endAuction(_listingId);
    }

    /**
     * @dev 내부 경매 종료 함수
     */
    function _endAuction(uint256 _listingId) private {
        Listing storage listing = listings[_listingId];
        Auction storage auction = auctions[_listingId];

        if (auction.highestBidder != address(0)) {
            // 결제 처리
            _processPayment(listing.seller, listing.nftContract, listing.tokenId, auction.highestBid);

            // NFT 전송
            IERC721(listing.nftContract).safeTransferFrom(listing.seller, auction.highestBidder, listing.tokenId);

            emit ItemSold(_listingId, auction.highestBidder, auction.highestBid);
        }

        // 리스팅 종료
        listing.isActive = false;
        userListings[listing.seller].remove(_listingId);

        // 입찰자 정리
        for (uint i = 0; i < auction.biddersList.length; i++) {
            userActiveBids[auction.biddersList[i]].remove(_listingId);
        }

        emit AuctionEnded(_listingId, auction.highestBidder, auction.highestBid);
    }

    /**
     * @dev 번들 생성
     */
    function createBundle(
        address[] memory _nftContracts,
        uint256[] memory _tokenIds,
        uint256 _totalPrice,
        uint256 _discount,
        uint256 _duration,
        string memory _metadata
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(_nftContracts.length == _tokenIds.length, "Invalid input arrays");
        require(_nftContracts.length > 1, "Bundle must contain multiple items");
        require(_discount <= 50, "Discount cannot exceed 50%");

        // 모든 NFT 소유권 및 승인 확인
        for (uint i = 0; i < _nftContracts.length; i++) {
            IERC721 nft = IERC721(_nftContracts[i]);
            require(nft.ownerOf(_tokenIds[i]) == msg.sender, "Not the owner");
            require(nft.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");
        }

        uint256 listingId = listingCounter++;
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            nftContract: address(0), // 번들은 여러 컨트랙트
            tokenId: 0,
            price: _totalPrice,
            startTime: block.timestamp,
            endTime: block.timestamp.add(_duration),
            listingType: ListingType.BUNDLE,
            isActive: true,
            metadata: _metadata
        });

        Bundle storage bundle = bundles[listingId];
        bundle.nftContracts = _nftContracts;
        bundle.tokenIds = _tokenIds;
        bundle.totalPrice = _totalPrice;
        bundle.discount = _discount;

        userListings[msg.sender].add(listingId);

        emit BundleCreated(listingId, _nftContracts.length, _discount);
        return listingId;
    }

    /**
     * @dev 번들 구매
     */
    function buyBundle(uint256 _listingId) external nonReentrant whenNotPaused {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Listing not active");
        require(listing.listingType == ListingType.BUNDLE, "Not a bundle listing");
        require(block.timestamp <= listing.endTime, "Listing expired");
        require(msg.sender != listing.seller, "Cannot buy own listing");

        Bundle storage bundle = bundles[_listingId];

        // 대금 결제 처리 (각 NFT별로 로열티 계산)
        uint256 remainingPrice = listing.price;
        for (uint i = 0; i < bundle.nftContracts.length; i++) {
            uint256 itemPrice = remainingPrice.div(bundle.nftContracts.length - i);
            _processPayment(listing.seller, bundle.nftContracts[i], bundle.tokenIds[i], itemPrice);
            remainingPrice = remainingPrice.sub(itemPrice);
        }

        // 모든 NFT 전송
        for (uint i = 0; i < bundle.nftContracts.length; i++) {
            IERC721(bundle.nftContracts[i]).safeTransferFrom(
                listing.seller, 
                msg.sender, 
                bundle.tokenIds[i]
            );
        }

        // 리스팅 종료
        listing.isActive = false;
        userListings[listing.seller].remove(_listingId);

        emit ItemSold(_listingId, msg.sender, listing.price);
    }

    /**
     * @dev 임대 리스팅 생성
     */
    function createRentalListing(
        address _nftContract,
        uint256 _tokenId,
        uint256 _dailyRate,
        uint256 _maxDuration,
        uint256 _securityDeposit,
        uint256 _duration,
        string memory _metadata
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(_dailyRate > 0, "Daily rate must be greater than 0");
        require(_maxDuration > 0, "Max duration must be greater than 0");

        // NFT 소유권 및 승인 확인
        IERC721 nft = IERC721(_nftContract);
        require(nft.ownerOf(_tokenId) == msg.sender, "Not the owner");
        require(nft.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        uint256 listingId = listingCounter++;
        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            nftContract: _nftContract,
            tokenId: _tokenId,
            price: _dailyRate,
            startTime: block.timestamp,
            endTime: block.timestamp.add(_duration),
            listingType: ListingType.RENTAL,
            isActive: true,
            metadata: _metadata
        });

        Rental storage rental = rentals[listingId];
        rental.dailyRate = _dailyRate;
        rental.maxDuration = _maxDuration;
        rental.securityDeposit = _securityDeposit;

        userListings[msg.sender].add(listingId);

        emit ItemListed(listingId, msg.sender, _nftContract, _tokenId, _dailyRate);
        return listingId;
    }

    /**
     * @dev NFT 임대
     */
    function rentNFT(uint256 _listingId, uint256 _rentalDuration) external nonReentrant whenNotPaused {
        Listing storage listing = listings[_listingId];
        require(listing.isActive, "Listing not active");
        require(listing.listingType == ListingType.RENTAL, "Not a rental listing");
        require(block.timestamp <= listing.endTime, "Listing expired");
        require(msg.sender != listing.seller, "Cannot rent own NFT");

        Rental storage rental = rentals[_listingId];
        require(_rentalDuration <= rental.maxDuration, "Exceeds max rental duration");
        require(rental.currentRenter == address(0), "Already rented");

        // 임대료 및 보증금 계산
        uint256 totalRent = rental.dailyRate.mul(_rentalDuration);
        uint256 totalPayment = totalRent.add(rental.securityDeposit);

        // 결제 처리
        IERC20(paymentToken).transferFrom(msg.sender, address(this), totalPayment);

        // 임대 정보 업데이트
        rental.currentRenter = msg.sender;
        rental.rentalEndTime = block.timestamp.add(_rentalDuration.mul(1 days));

        // NFT 전송
        IERC721(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        emit RentalStarted(_listingId, msg.sender, _rentalDuration);
    }

    /**
     * @dev 임대 종료
     */
    function endRental(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        Rental storage rental = rentals[_listingId];
        
        require(listing.listingType == ListingType.RENTAL, "Not a rental listing");
        require(rental.currentRenter != address(0), "Not currently rented");
        require(
            msg.sender == rental.currentRenter || 
            msg.sender == listing.seller || 
            block.timestamp > rental.rentalEndTime,
            "Not authorized to end rental"
        );

        // NFT 반환
        IERC721(listing.nftContract).safeTransferFrom(rental.currentRenter, listing.seller, listing.tokenId);

        // 임대료 분배
        uint256 rentalFee = rental.dailyRate.mul((rental.rentalEndTime.sub(block.timestamp)).div(1 days));
        uint256 platformFee = rentalFee.mul(platformFeeRate).div(10000);
        uint256 sellerAmount = rentalFee.sub(platformFee);

        IERC20(paymentToken).transfer(listing.seller, sellerAmount);
        IERC20(paymentToken).transfer(feeRecipient, platformFee);

        // 보증금 반환
        IERC20(paymentToken).transfer(rental.currentRenter, rental.securityDeposit);

        // 임대 정보 초기화
        rental.currentRenter = address(0);
        rental.rentalEndTime = 0;

        emit RentalEnded(_listingId);
    }

    /**
     * @dev 리스팅 취소
     */
    function cancelListing(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.isActive, "Listing not active");

        if (listing.listingType == ListingType.AUCTION) {
            Auction storage auction = auctions[_listingId];
            // 입찰이 있는 경우 최고 입찰자에게 환불
            if (auction.highestBidder != address(0)) {
                IERC20(paymentToken).transfer(auction.highestBidder, auction.highestBid);
            }
        }

        listing.isActive = false;
        userListings[msg.sender].remove(_listingId);

        emit ListingCancelled(_listingId);
    }

    /**
     * @dev 결제 처리 (플랫폼 수수료 + 로열티 자동 분배)
     */
    function _processPayment(
        address _seller,
        address _nftContract,
        uint256 _tokenId,
        uint256 _price
    ) private {
        // 플랫폼 수수료 계산
        uint256 platformFee = _price.mul(platformFeeRate).div(10000);
        
        // 로열티 계산 (EIP-2981 지원 가정)
        (address royaltyRecipient, uint256 royaltyAmount) = _getRoyaltyInfo(_nftContract, _tokenId, _price);
        
        // 판매자가 받을 금액 계산
        uint256 sellerAmount = _price.sub(platformFee).sub(royaltyAmount);

        // 결제 처리
        IERC20 token = IERC20(paymentToken);
        
        // 구매자로부터 토큰 수취
        token.transferFrom(msg.sender, address(this), _price);
        
        // 분배
        token.transfer(_seller, sellerAmount);
        token.transfer(feeRecipient, platformFee);
        
        if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
            token.transfer(royaltyRecipient, royaltyAmount);
        }
    }

    /**
     * @dev 로열티 정보 조회
     */
    function _getRoyaltyInfo(address _nftContract, uint256 _tokenId, uint256 _salePrice) 
        private 
        view 
        returns (address, uint256) 
    {
        // EIP-2981 인터페이스 지원 확인
        try IERC165(_nftContract).supportsInterface(0x2a55205a) returns (bool supported) {
            if (supported) {
                try IERC2981(_nftContract).royaltyInfo(_tokenId, _salePrice) returns (
                    address receiver,
                    uint256 royaltyAmount
                ) {
                    return (receiver, royaltyAmount);
                } catch {
                    return (address(0), 0);
                }
            }
        } catch {
            return (address(0), 0);
        }
        
        return (address(0), 0);
    }

    /**
     * @dev 플랫폼 수수료율 업데이트
     */
    function updatePlatformFeeRate(uint256 _newRate) external onlyRole(FEE_MANAGER_ROLE) {
        require(_newRate <= MAX_FEE_RATE, "Fee rate too high");
        platformFeeRate = _newRate;
    }

    /**
     * @dev 수수료 수령 주소 업데이트
     */
    function updateFeeRecipient(address _newRecipient) external onlyRole(FEE_MANAGER_ROLE) {
        require(_newRecipient != address(0), "Invalid recipient");
        feeRecipient = _newRecipient;
    }

    /**
     * @dev 사용자의 리스팅 조회
     */
    function getUserListings(address _user) external view returns (uint256[] memory) {
        return userListings[_user].values();
    }

    /**
     * @dev 사용자의 활성 입찰 조회
     */
    function getUserActiveBids(address _user) external view returns (uint256[] memory) {
        return userActiveBids[_user].values();
    }

    /**
     * @dev 리스팅 상세 정보 조회
     */
    function getListingDetails(uint256 _listingId) external view returns (
        Listing memory listing,
        bool hasAuction,
        bool hasBundle,
        bool hasRental
    ) {
        listing = listings[_listingId];
        hasAuction = listing.listingType == ListingType.AUCTION;
        hasBundle = listing.listingType == ListingType.BUNDLE;
        hasRental = listing.listingType == ListingType.RENTAL;
        
        return (listing, hasAuction, hasBundle, hasRental);
    }

    /**
     * @dev 경매 상세 정보 조회
     */
    function getAuctionDetails(uint256 _listingId) external view returns (
        uint256 highestBid,
        address highestBidder,
        uint256 minBidIncrement,
        uint256 buyNowPrice,
        uint256 bidderCount
    ) {
        Auction storage auction = auctions[_listingId];
        return (
            auction.highestBid,
            auction.highestBidder,
            auction.minBidIncrement,
            auction.buyNowPrice,
            auction.biddersList.length
        );
    }

    /**
     * @dev 컨트랙트 일시 중지
     */
    function pause() external onlyRole(MARKETPLACE_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev 컨트랙트 일시 중지 해제
     */
    function unpause() external onlyRole(MARKETPLACE_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev 긴급 상황 시 토큰 회수
     */
    function emergencyWithdraw(address _token, uint256 _amount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(_amount > 0, "Amount must be greater than 0");
        IERC20(_token).transfer(msg.sender, _amount);
    }
}

/**
 * @dev EIP-2981 로열티 표준 인터페이스
 */
interface IERC2981 {
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount);
}

/**
 * @dev ERC165 인터페이스
 */
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
