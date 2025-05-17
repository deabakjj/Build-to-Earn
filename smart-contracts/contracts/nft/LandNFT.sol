// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseNFT.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title LandNFT
 * @dev NFT 컨트랙트 for DIY 크래프팅 월드의 랜드(토지)
 * 랜드 특유의 기능: 확장, 자원 생성, 건물 배치, 접근 권한 관리
 */
contract LandNFT is BaseNFT {
    using SafeMath for uint256;

    // 랜드 타입 열거형
    enum LandType {
        PLAINS,         // 평원
        FOREST,         // 숲
        MOUNTAIN,       // 산
        DESERT,         // 사막
        OCEAN,          // 해양
        SPECIAL         // 특수 지형
    }

    // 랜드 정보 구조체
    struct LandInfo {
        LandType landType;
        uint256 width;              // 가로 크기
        uint256 height;             // 세로 크기
        uint256 totalSize;          // 총 크기 (width * height)
        uint256[] resources;        // 생성되는 자원 ID들
        uint256[] resourceRates;    // 자원 생성률 (per block)
        uint256[] buildings;        // 배치된 건물 NFT ID들
        uint256 maxBuildings;       // 최대 건물 수
        uint256 level;              // 랜드 레벨
        uint256 lastResourceCollect;// 마지막 자원 수집 블록
        bool isExpansionPossible;   // 확장 가능 여부
        uint256 expansionCost;      // 다음 확장 비용
    }

    // 접근 권한 구조체
    struct AccessControl {
        bool isPublic;              // 공개 여부
        mapping(address => bool) allowedUsers;  // 허용된 유저들
        mapping(address => bool) builders;      // 건설 권한이 있는 유저들
        mapping(address => bool) harvesters;    // 자원 수집 권한이 있는 유저들
        uint256 entryFee;           // 입장료
        uint256 builderFee;         // 건설 수수료
        uint256 harvesterFee;       // 자원 수집 수수료
    }

    // 랜드 확장 기록 구조체
    struct ExpansionRecord {
        uint256 prevWidth;
        uint256 prevHeight;
        uint256 newWidth;
        uint256 newHeight;
        uint256 expansionCost;
        uint256 timestamp;
    }

    // 자원 타입 정보 구조체
    struct ResourceType {
        string name;
        string symbol;
        uint256 baseRate;           // 기본 생성률
        bool isActive;
    }

    // 매핑들
    mapping(uint256 => LandInfo) public lands;
    mapping(uint256 => AccessControl) public accessControls;
    mapping(uint256 => ExpansionRecord[]) public expansionHistory;
    mapping(uint256 => mapping(uint256 => uint256)) public resourceInventory; // landId => resourceId => amount
    mapping(uint256 => mapping(uint256 => uint256)) public buildingPositions; // landId => buildingId => position
    mapping(uint256 => ResourceType) public resourceTypes;
    mapping(address => uint256[]) public userLands;
    mapping(uint256 => uint256) public landToBiome; // 랜드 ID와 바이옴 연결

    // 상태 변수들
    uint256 public nextResourceTypeId;
    uint256 public baseExpansionCost = 100 ether;
    uint256 public expansionCostMultiplier = 150; // 확장할 때마다 비용 1.5배
    uint256 public maxLandSize = 100;            // 최대 랜드 크기 (100x100)
    uint256 public resourceCollectionInterval = 2880; // 자원 수집 간격 (약 12시간)
    
    // 이벤트들
    event LandMinted(uint256 indexed tokenId, address indexed owner, LandType landType, uint256 width, uint256 height);
    event LandExpanded(uint256 indexed tokenId, uint256 newWidth, uint256 newHeight, uint256 cost);
    event ResourcesCollected(uint256 indexed tokenId, address indexed collector, uint256[] resources, uint256[] amounts);
    event BuildingPlaced(uint256 indexed landId, uint256 indexed buildingId, uint256 position);
    event BuildingRemoved(uint256 indexed landId, uint256 indexed buildingId);
    event AccessPermissionGranted(uint256 indexed landId, address indexed user, string permission);
    event AccessPermissionRevoked(uint256 indexed landId, address indexed user, string permission);
    event LandVisited(uint256 indexed landId, address indexed visitor, uint256 fee);

    constructor(address _marketplaceAddress) BaseNFT("DIY Land NFT", "DIYL", _marketplaceAddress) {
        // 기본 자원 타입 추가
        addResourceType("나무", "WOOD", 10);
        addResourceType("돌", "STONE", 8);
        addResourceType("철", "IRON", 5);
        addResourceType("금", "GOLD", 2);
        addResourceType("크리스탈", "CRYSTAL", 1);
    }

    /**
     * @dev 랜드 민팅 함수
     */
    function mintLand(
        address to,
        string memory uri,
        LandType _landType,
        uint256 _width,
        uint256 _height
    ) external onlyOwner returns (uint256) {
        require(_width > 0 && _height > 0, "Invalid dimensions");
        require(_width <= maxLandSize && _height <= maxLandSize, "Exceeds max size");

        uint256 tokenId = _mintNFT(to, uri);
        uint256 totalSize = _width.mul(_height);
        
        // 랜드 타입에 따른 자원 설정
        (uint256[] memory resources, uint256[] memory rates) = getDefaultResourcesForLandType(_landType);
        
        lands[tokenId] = LandInfo({
            landType: _landType,
            width: _width,
            height: _height,
            totalSize: totalSize,
            resources: resources,
            resourceRates: rates,
            buildings: new uint256[](0),
            maxBuildings: calculateMaxBuildings(totalSize),
            level: 1,
            lastResourceCollect: block.number,
            isExpansionPossible: true,
            expansionCost: baseExpansionCost
        });

        // 접근 권한 초기화
        accessControls[tokenId].isPublic = false;
        accessControls[tokenId].entryFee = 0;
        accessControls[tokenId].builderFee = 0;
        accessControls[tokenId].harvesterFee = 0;

        userLands[to].push(tokenId);
        emit LandMinted(tokenId, to, _landType, _width, _height);
        
        return tokenId;
    }

    /**
     * @dev 랜드 확장
     */
    function expandLand(uint256 tokenId, uint256 newWidth, uint256 newHeight) 
        external 
        payable 
        onlyTokenOwner(tokenId) 
    {
        LandInfo storage land = lands[tokenId];
        require(land.isExpansionPossible, "Expansion not possible");
        require(newWidth > land.width || newHeight > land.height, "Must expand");
        require(newWidth <= maxLandSize && newHeight <= maxLandSize, "Exceeds max size");
        require(msg.value >= land.expansionCost, "Insufficient payment");

        // 확장 기록 저장
        expansionHistory[tokenId].push(ExpansionRecord({
            prevWidth: land.width,
            prevHeight: land.height,
            newWidth: newWidth,
            newHeight: newHeight,
            expansionCost: land.expansionCost,
            timestamp: block.timestamp
        }));

        // 랜드 업데이트
        land.width = newWidth;
        land.height = newHeight;
        land.totalSize = newWidth.mul(newHeight);
        land.maxBuildings = calculateMaxBuildings(land.totalSize);
        land.level++;

        // 다음 확장 비용 계산
        land.expansionCost = land.expansionCost.mul(expansionCostMultiplier).div(100);

        // 최대 크기 확인
        if (newWidth == maxLandSize && newHeight == maxLandSize) {
            land.isExpansionPossible = false;
        }

        emit LandExpanded(tokenId, newWidth, newHeight, msg.value);
    }

    /**
     * @dev 자원 수집
     */
    function collectResources(uint256 tokenId) external {
        LandInfo storage land = lands[tokenId];
        require(
            msg.sender == ownerOf(tokenId) || 
            accessControls[tokenId].harvesters[msg.sender] || 
            (accessControls[tokenId].isPublic && land.lastResourceCollect.add(resourceCollectionInterval) <= block.number),
            "Not authorized to harvest"
        );

        require(block.number >= land.lastResourceCollect.add(resourceCollectionInterval), "Too early to collect");

        uint256[] memory collectedAmounts = new uint256[](land.resources.length);
        uint256 blocks = block.number.sub(land.lastResourceCollect).div(resourceCollectionInterval);

        // 자원 수집 계산
        for (uint i = 0; i < land.resources.length; i++) {
            uint256 resourceId = land.resources[i];
            uint256 rate = land.resourceRates[i];
            uint256 amount = rate.mul(blocks);
            
            resourceInventory[tokenId][resourceId] = resourceInventory[tokenId][resourceId].add(amount);
            collectedAmounts[i] = amount;
        }

        land.lastResourceCollect = block.number;

        // 수수료 처리 (권한이 위임된 경우)
        if (msg.sender != ownerOf(tokenId) && accessControls[tokenId].harvesterFee > 0) {
            require(msg.value >= accessControls[tokenId].harvesterFee, "Insufficient fee");
            payable(ownerOf(tokenId)).transfer(accessControls[tokenId].harvesterFee);
        }

        emit ResourcesCollected(tokenId, msg.sender, land.resources, collectedAmounts);
    }

    /**
     * @dev 건물 배치
     */
    function placeBuilding(uint256 landId, uint256 buildingId, uint256 position) external {
        LandInfo storage land = lands[landId];
        require(
            msg.sender == ownerOf(landId) || 
            accessControls[landId].builders[msg.sender],
            "Not authorized to build"
        );
        require(land.buildings.length < land.maxBuildings, "Max buildings reached");
        require(position < land.totalSize, "Invalid position");
        require(buildingPositions[landId][buildingId] == 0, "Building already placed");

        land.buildings.push(buildingId);
        buildingPositions[landId][buildingId] = position;

        // 수수료 처리 (권한이 위임된 경우)
        if (msg.sender != ownerOf(landId) && accessControls[landId].builderFee > 0) {
            require(msg.value >= accessControls[landId].builderFee, "Insufficient fee");
            payable(ownerOf(landId)).transfer(accessControls[landId].builderFee);
        }

        emit BuildingPlaced(landId, buildingId, position);
    }

    /**
     * @dev 건물 제거
     */
    function removeBuilding(uint256 landId, uint256 buildingId) external onlyTokenOwner(landId) {
        LandInfo storage land = lands[landId];
        require(buildingPositions[landId][buildingId] > 0, "Building not found");

        // 건물 목록에서 제거
        for (uint i = 0; i < land.buildings.length; i++) {
            if (land.buildings[i] == buildingId) {
                land.buildings[i] = land.buildings[land.buildings.length - 1];
                land.buildings.pop();
                break;
            }
        }

        buildingPositions[landId][buildingId] = 0;
        emit BuildingRemoved(landId, buildingId);
    }

    /**
     * @dev 접근 권한 부여
     */
    function grantAccess(uint256 tokenId, address user, string memory permission) 
        external 
        onlyTokenOwner(tokenId) 
    {
        if (keccak256(bytes(permission)) == keccak256(bytes("visit"))) {
            accessControls[tokenId].allowedUsers[user] = true;
        } else if (keccak256(bytes(permission)) == keccak256(bytes("build"))) {
            accessControls[tokenId].builders[user] = true;
        } else if (keccak256(bytes(permission)) == keccak256(bytes("harvest"))) {
            accessControls[tokenId].harvesters[user] = true;
        }

        emit AccessPermissionGranted(tokenId, user, permission);
    }

    /**
     * @dev 접근 권한 취소
     */
    function revokeAccess(uint256 tokenId, address user, string memory permission) 
        external 
        onlyTokenOwner(tokenId) 
    {
        if (keccak256(bytes(permission)) == keccak256(bytes("visit"))) {
            accessControls[tokenId].allowedUsers[user] = false;
        } else if (keccak256(bytes(permission)) == keccak256(bytes("build"))) {
            accessControls[tokenId].builders[user] = false;
        } else if (keccak256(bytes(permission)) == keccak256(bytes("harvest"))) {
            accessControls[tokenId].harvesters[user] = false;
        }

        emit AccessPermissionRevoked(tokenId, user, permission);
    }

    /**
     * @dev 랜드 방문
     */
    function visitLand(uint256 tokenId) external payable {
        AccessControl storage access = accessControls[tokenId];
        require(
            access.isPublic || 
            access.allowedUsers[msg.sender] || 
            msg.sender == ownerOf(tokenId),
            "Access denied"
        );

        if (msg.sender != ownerOf(tokenId) && access.entryFee > 0) {
            require(msg.value >= access.entryFee, "Insufficient entry fee");
            payable(ownerOf(tokenId)).transfer(access.entryFee);
            emit LandVisited(tokenId, msg.sender, access.entryFee);
        }
    }

    /**
     * @dev 접근 권한 및 수수료 설정
     */
    function updateAccessSettings(
        uint256 tokenId,
        bool _isPublic,
        uint256 _entryFee,
        uint256 _builderFee,
        uint256 _harvesterFee
    ) external onlyTokenOwner(tokenId) {
        AccessControl storage access = accessControls[tokenId];
        access.isPublic = _isPublic;
        access.entryFee = _entryFee;
        access.builderFee = _builderFee;
        access.harvesterFee = _harvesterFee;
    }

    /**
     * @dev 자원 타입 추가 (관리자 전용)
     */
    function addResourceType(string memory name, string memory symbol, uint256 baseRate) 
        public 
        onlyOwner 
    {
        resourceTypes[nextResourceTypeId] = ResourceType({
            name: name,
            symbol: symbol,
            baseRate: baseRate,
            isActive: true
        });
        nextResourceTypeId++;
    }

    /**
     * @dev 랜드 타입별 기본 자원 설정
     */
    function getDefaultResourcesForLandType(LandType _landType) 
        internal 
        view 
        returns (uint256[] memory, uint256[] memory) 
    {
        uint256[] memory resources = new uint256[](5);
        uint256[] memory rates = new uint256[](5);

        if (_landType == LandType.PLAINS) {
            resources[0] = 0; rates[0] = 15; // 나무
            resources[1] = 1; rates[1] = 12; // 돌
            resources[2] = 2; rates[2] = 8;  // 철
            resources[3] = 3; rates[3] = 3;  // 금
            resources[4] = 4; rates[4] = 1;  // 크리스탈
        } else if (_landType == LandType.FOREST) {
            resources[0] = 0; rates[0] = 25; // 나무
            resources[1] = 1; rates[1] = 8;  // 돌
            resources[2] = 2; rates[2] = 5;  // 철
            resources[3] = 3; rates[3] = 2;  // 금
            resources[4] = 4; rates[4] = 2;  // 크리스탈
        } else if (_landType == LandType.MOUNTAIN) {
            resources[0] = 0; rates[0] = 5;  // 나무
            resources[1] = 1; rates[1] = 20; // 돌
            resources[2] = 2; rates[2] = 12; // 철
            resources[3] = 3; rates[3] = 6;  // 금
            resources[4] = 4; rates[4] = 3;  // 크리스탈
        } else if (_landType == LandType.DESERT) {
            resources[0] = 1; rates[0] = 10; // 돌
            resources[1] = 3; rates[1] = 8;  // 금
            resources[2] = 4; rates[2] = 5;  // 크리스탈
            resources[3] = 0; rates[3] = 2;  // 나무
            resources[4] = 2; rates[4] = 3;  // 철
        } else if (_landType == LandType.OCEAN) {
            resources[0] = 4; rates[0] = 8;  // 크리스탈
            resources[1] = 0; rates[1] = 3;  // 나무
            resources[2] = 2; rates[2] = 5;  // 철
            resources[3] = 3; rates[3] = 4;  // 금
            resources[4] = 1; rates[4] = 6;  // 돌
        } else { // SPECIAL
            resources[0] = 0; rates[0] = 20; // 나무
            resources[1] = 1; rates[1] = 20; // 돌
            resources[2] = 2; rates[2] = 15; // 철
            resources[3] = 3; rates[3] = 10; // 금
            resources[4] = 4; rates[4] = 8;  // 크리스탈
        }

        return (resources, rates);
    }

    /**
     * @dev 최대 건물 수 계산
     */
    function calculateMaxBuildings(uint256 totalSize) internal pure returns (uint256) {
        return totalSize.div(25); // 25블록당 1건물
    }

    /**
     * @dev 랜드 정보 조회
     */
    function getLandInfo(uint256 tokenId) external view returns (
        LandType,
        uint256,
        uint256,
        uint256,
        uint256[] memory,
        uint256[] memory,
        uint256[] memory,
        uint256,
        uint256,
        bool
    ) {
        LandInfo storage land = lands[tokenId];
        return (
            land.landType,
            land.width,
            land.height,
            land.totalSize,
            land.resources,
            land.resourceRates,
            land.buildings,
            land.maxBuildings,
            land.level,
            land.isExpansionPossible
        );
    }

    /**
     * @dev 접근 권한 정보 조회
     */
    function getAccessInfo(uint256 tokenId) external view returns (
        bool,
        uint256,
        uint256,
        uint256
    ) {
        AccessControl storage access = accessControls[tokenId];
        return (
            access.isPublic,
            access.entryFee,
            access.builderFee,
            access.harvesterFee
        );
    }

    /**
     * @dev 자원 인벤토리 조회
     */
    function getResourceInventory(uint256 tokenId, uint256 resourceId) external view returns (uint256) {
        return resourceInventory[tokenId][resourceId];
    }

    /**
     * @dev 사용자의 모든 랜드 조회
     */
    function getUserLands(address user) external view returns (uint256[] memory) {
        return userLands[user];
    }

    /**
     * @dev 확장 기록 조회
     */
    function getExpansionHistory(uint256 tokenId) external view returns (ExpansionRecord[] memory) {
        return expansionHistory[tokenId];
    }

    /**
     * @dev 토큰 전송 후 처리
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override {
        super._afterTokenTransfer(from, to, firstTokenId, batchSize);
        
        if (from != address(0) && to != address(0)) {
            // 기존 소유자의 목록에서 제거
            uint256[] storage fromLands = userLands[from];
            for (uint i = 0; i < fromLands.length; i++) {
                if (fromLands[i] == firstTokenId) {
                    fromLands[i] = fromLands[fromLands.length - 1];
                    fromLands.pop();
                    break;
                }
            }
            
            // 새 소유자의 목록에 추가
            userLands[to].push(firstTokenId);
        }
    }

    /**
     * @dev 계정별 자원 보유량 조회
     */
    function getUserResources(address user, uint256 resourceId) external view returns (uint256) {
        uint256 totalAmount = 0;
        uint256[] memory userLandIds = userLands[user];
        
        for (uint i = 0; i < userLandIds.length; i++) {
            totalAmount = totalAmount.add(resourceInventory[userLandIds[i]][resourceId]);
        }
        
        return totalAmount;
    }

    /**
     * @dev 자원 전송 (랜드 간)
     */
    function transferResource(
        uint256 fromLandId,
        uint256 toLandId,
        uint256 resourceId,
        uint256 amount
    ) external {
        require(msg.sender == ownerOf(fromLandId), "Not owner of source land");
        require(ownerOf(toLandId) != address(0), "Target land doesn't exist");
        require(resourceInventory[fromLandId][resourceId] >= amount, "Insufficient resources");

        resourceInventory[fromLandId][resourceId] = resourceInventory[fromLandId][resourceId].sub(amount);
        resourceInventory[toLandId][resourceId] = resourceInventory[toLandId][resourceId].add(amount);
    }
}
