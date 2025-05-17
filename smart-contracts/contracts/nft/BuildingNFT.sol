// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseNFT.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title BuildingNFT
 * @dev NFT 컨트랙트 for DIY 크래프팅 월드의 건물
 * 건물 특유의 기능: 임대, 용량, 업그레이드 지원
 */
contract BuildingNFT is BaseNFT {
    using SafeMath for uint256;

    // 건물 타입 열거형
    enum BuildingType {
        HOUSE,          // 주거용 건물
        SHOP,           // 상점
        FORTRESS,       // 요새
        ENTERTAINMENT,  // 엔터테인먼트 시설
        INDUSTRIAL,     // 공업 시설
        SPECIAL         // 특수 건물
    }

    // 건물 정보 구조체
    struct BuildingInfo {
        BuildingType buildingType;
        uint256 capacity;           // 수용 인원 또는 저장 용량
        uint256 level;              // 건물 레벨
        uint256[] upgrades;         // 적용된 업그레이드 ID들
        uint256 maintenanceCost;    // 유지보수 비용 (per block)
        uint256 lastMaintenance;    // 마지막 유지보수 블록
        bool isOperational;         // 운영 상태
        uint256 dailyRevenue;       // 일일 수익 (임대나 운영 수익)
    }

    // 임대 정보 구조체
    struct RentalInfo {
        address tenant;             // 임차인
        uint256 rentalPrice;        // 임대료
        uint256 deposit;            // 보증금
        uint256 startBlock;         // 임대 시작 블록
        uint256 endBlock;           // 임대 종료 블록
        bool isActive;              // 임대 활성 상태
        uint256 totalRevenue;       // 총 임대 수익
    }

    // 업그레이드 정보 구조체
    struct UpgradeInfo {
        string name;
        string description;
        uint256 cost;               // 업그레이드 비용
        uint256[] requirements;     // 필요한 기존 업그레이드들
        uint256 capacityBonus;      // 용량 보너스
        uint256 revenueBonus;       // 수익 보너스
        bool isActive;
    }

    // 매핑들
    mapping(uint256 => BuildingInfo) public buildings;
    mapping(uint256 => RentalInfo) public rentals;
    mapping(uint256 => UpgradeInfo) public upgrades;
    mapping(uint256 => uint256[]) public buildingMaterials; // tokenId => 필요 재료들
    mapping(address => uint256[]) public userBuildings;     // 유저별 소유 건물 목록

    // 상태 변수들
    uint256 public nextUpgradeId;
    uint256 public platformRentalFee = 10;  // 플랫폼 수수료 10%
    uint256 public maxUpgrades = 10;        // 건물당 최대 업그레이드 수

    // 이벤트들
    event BuildingMinted(uint256 indexed tokenId, address indexed creator, BuildingType buildingType);
    event BuildingRented(uint256 indexed tokenId, address indexed tenant, uint256 price, uint256 duration);
    event BuildingUpgraded(uint256 indexed tokenId, uint256 upgradeId, uint256 cost);
    event RentalEnded(uint256 indexed tokenId, address indexed tenant, uint256 totalRevenue);
    event MaintenancePerformed(uint256 indexed tokenId, uint256 cost);
    event RevenueDistributed(uint256 indexed tokenId, address indexed owner, uint256 amount);

    constructor(address _marketplaceAddress) BaseNFT("DIY Building NFT", "DIYB", _marketplaceAddress) {
        // 기본 업그레이드 추가
        addUpgrade("기본 확장", "건물 용량 +20%", 100 ether, new uint256[](0), 20, 5);
        addUpgrade("고급 설비", "일일 수익 +30%", 200 ether, new uint256[](1), 0, 30);
        addUpgrade("자동화 시스템", "유지보수 비용 -50%", 300 ether, new uint256[](2), 10, 15);
    }

    /**
     * @dev 건물 민팅 함수
     */
    function mintBuilding(
        address to,
        string memory uri,
        BuildingType _buildingType,
        uint256 _capacity,
        uint256[] memory _materials,
        uint256[] memory _materialAmounts
    ) external onlyOwner returns (uint256) {
        require(_capacity > 0, "Capacity must be greater than 0");
        require(_materials.length == _materialAmounts.length, "Materials and amounts length mismatch");

        uint256 tokenId = _mintNFT(to, uri);
        
        buildings[tokenId] = BuildingInfo({
            buildingType: _buildingType,
            capacity: _capacity,
            level: 1,
            upgrades: new uint256[](0),
            maintenanceCost: calculateMaintenanceCost(_capacity),
            lastMaintenance: block.number,
            isOperational: true,
            dailyRevenue: calculateBaseRevenue(_buildingType, _capacity)
        });

        // 필요 재료 저장
        for (uint i = 0; i < _materials.length; i++) {
            buildingMaterials[tokenId].push(_materials[i]);
            buildingMaterials[tokenId].push(_materialAmounts[i]);
        }

        userBuildings[to].push(tokenId);
        emit BuildingMinted(tokenId, to, _buildingType);
        
        return tokenId;
    }

    /**
     * @dev 건물 임대 시작
     */
    function startRental(
        uint256 tokenId,
        uint256 _rentalPrice,
        uint256 _deposit,
        uint256 _durationBlocks
    ) external onlyTokenOwner(tokenId) {
        require(buildings[tokenId].isOperational, "Building is not operational");
        require(!rentals[tokenId].isActive, "Already rented");
        require(_rentalPrice > 0 && _deposit > 0, "Invalid rental terms");

        rentals[tokenId] = RentalInfo({
            tenant: address(0),
            rentalPrice: _rentalPrice,
            deposit: _deposit,
            startBlock: 0,
            endBlock: 0,
            isActive: false,
            totalRevenue: 0
        });
    }

    /**
     * @dev 건물 임대 (임차인이 호출)
     */
    function rentBuilding(uint256 tokenId) external payable {
        RentalInfo storage rental = rentals[tokenId];
        require(!rental.isActive, "Already rented");
        require(rental.rentalPrice > 0, "Not available for rent");
        require(msg.value >= rental.deposit.add(rental.rentalPrice), "Insufficient payment");

        rental.tenant = msg.sender;
        rental.startBlock = block.number;
        rental.endBlock = block.number.add(rental.rentalPrice.div(rental.rentalPrice.div(100))); // 예시 기간 계산
        rental.isActive = true;

        // 플랫폼 수수료 계산
        uint256 platformFee = rental.rentalPrice.mul(platformRentalFee).div(100);
        uint256 ownerPayment = rental.rentalPrice.sub(platformFee);

        // 지불 처리
        payable(ownerOf(tokenId)).transfer(ownerPayment);
        payable(owner()).transfer(platformFee);

        emit BuildingRented(tokenId, msg.sender, rental.rentalPrice, rental.endBlock.sub(rental.startBlock));
    }

    /**
     * @dev 임대 종료
     */
    function endRental(uint256 tokenId) external {
        RentalInfo storage rental = rentals[tokenId];
        require(rental.isActive, "No active rental");
        require(msg.sender == rental.tenant || msg.sender == ownerOf(tokenId), "Not authorized");
        require(block.number >= rental.endBlock, "Rental period not ended");

        address tenant = rental.tenant;
        uint256 totalRevenue = rental.totalRevenue;

        // 보증금 반환
        if (rental.deposit > 0) {
            payable(tenant).transfer(rental.deposit);
        }

        // 임대 정보 초기화
        rental.isActive = false;
        rental.tenant = address(0);

        emit RentalEnded(tokenId, tenant, totalRevenue);
    }

    /**
     * @dev 건물 업그레이드
     */
    function upgradeBuilding(uint256 tokenId, uint256 upgradeId) 
        external 
        payable 
        onlyTokenOwner(tokenId) 
    {
        require(upgrades[upgradeId].isActive, "Upgrade not available");
        require(buildings[tokenId].upgrades.length < maxUpgrades, "Max upgrades reached");
        require(msg.value >= upgrades[upgradeId].cost, "Insufficient payment");

        // 필요 조건 확인
        UpgradeInfo storage upgrade = upgrades[upgradeId];
        for (uint i = 0; i < upgrade.requirements.length; i++) {
            require(hasUpgrade(tokenId, upgrade.requirements[i]), "Missing required upgrade");
        }

        // 업그레이드 적용
        BuildingInfo storage building = buildings[tokenId];
        building.upgrades.push(upgradeId);
        building.capacity = building.capacity.add(building.capacity.mul(upgrade.capacityBonus).div(100));
        building.dailyRevenue = building.dailyRevenue.add(building.dailyRevenue.mul(upgrade.revenueBonus).div(100));
        building.level++;

        // 플랫폼 수수료 계산
        uint256 platformFee = msg.value.mul(5).div(100); // 5% 플랫폼 수수료
        payable(owner()).transfer(platformFee);

        emit BuildingUpgraded(tokenId, upgradeId, msg.value);
    }

    /**
     * @dev 건물 유지보수
     */
    function performMaintenance(uint256 tokenId) external payable onlyTokenOwner(tokenId) {
        BuildingInfo storage building = buildings[tokenId];
        require(!building.isOperational || block.number > building.lastMaintenance.add(28800), "Maintenance not needed"); // 대략 7일
        
        uint256 cost = calculateMaintenanceCost(building.capacity);
        require(msg.value >= cost, "Insufficient payment");

        building.lastMaintenance = block.number;
        building.isOperational = true;

        emit MaintenancePerformed(tokenId, cost);
    }

    /**
     * @dev 업그레이드 추가 (관리자 전용)
     */
    function addUpgrade(
        string memory name,
        string memory description,
        uint256 cost,
        uint256[] memory requirements,
        uint256 capacityBonus,
        uint256 revenueBonus
    ) public onlyOwner {
        upgrades[nextUpgradeId] = UpgradeInfo({
            name: name,
            description: description,
            cost: cost,
            requirements: requirements,
            capacityBonus: capacityBonus,
            revenueBonus: revenueBonus,
            isActive: true
        });
        nextUpgradeId++;
    }

    /**
     * @dev 건물이 특정 업그레이드를 보유하는지 확인
     */
    function hasUpgrade(uint256 tokenId, uint256 upgradeId) public view returns (bool) {
        uint256[] memory buildingUpgrades = buildings[tokenId].upgrades;
        for (uint i = 0; i < buildingUpgrades.length; i++) {
            if (buildingUpgrades[i] == upgradeId) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev 기본 수익 계산
     */
    function calculateBaseRevenue(BuildingType _type, uint256 _capacity) internal pure returns (uint256) {
        uint256 baseRate;
        
        if (_type == BuildingType.HOUSE) {
            baseRate = 1 ether;
        } else if (_type == BuildingType.SHOP) {
            baseRate = 2 ether;
        } else if (_type == BuildingType.FORTRESS) {
            baseRate = 3 ether;
        } else if (_type == BuildingType.ENTERTAINMENT) {
            baseRate = 5 ether;
        } else if (_type == BuildingType.INDUSTRIAL) {
            baseRate = 4 ether;
        } else { // SPECIAL
            baseRate = 10 ether;
        }
        
        return baseRate.mul(_capacity).div(100);
    }

    /**
     * @dev 유지보수 비용 계산
     */
    function calculateMaintenanceCost(uint256 _capacity) internal pure returns (uint256) {
        return _capacity.mul(1 ether).div(1000); // 용량 당 0.001 ether
    }

    /**
     * @dev 일일 수익 수집
     */
    function collectDailyRevenue(uint256 tokenId) external onlyTokenOwner(tokenId) {
        BuildingInfo storage building = buildings[tokenId];
        require(building.isOperational, "Building not operational");
        require(block.number > building.lastMaintenance.add(5760), "Wait for next cycle"); // 대략 24시간

        uint256 revenue = building.dailyRevenue;
        if (rentals[tokenId].isActive) {
            revenue = revenue.add(rentals[tokenId].rentalPrice);
            rentals[tokenId].totalRevenue = rentals[tokenId].totalRevenue.add(revenue);
        }

        payable(ownerOf(tokenId)).transfer(revenue);
        building.lastMaintenance = block.number;

        emit RevenueDistributed(tokenId, ownerOf(tokenId), revenue);
    }

    /**
     * @dev 건물 정보 조회
     */
    function getBuildingInfo(uint256 tokenId) external view returns (
        BuildingType,
        uint256,
        uint256,
        uint256[] memory,
        uint256,
        bool,
        uint256
    ) {
        BuildingInfo storage building = buildings[tokenId];
        return (
            building.buildingType,
            building.capacity,
            building.level,
            building.upgrades,
            building.maintenanceCost,
            building.isOperational,
            building.dailyRevenue
        );
    }

    /**
     * @dev 임대 정보 조회
     */
    function getRentalInfo(uint256 tokenId) external view returns (
        address,
        uint256,
        uint256,
        uint256,
        uint256,
        bool,
        uint256
    ) {
        RentalInfo storage rental = rentals[tokenId];
        return (
            rental.tenant,
            rental.rentalPrice,
            rental.deposit,
            rental.startBlock,
            rental.endBlock,
            rental.isActive,
            rental.totalRevenue
        );
    }

    /**
     * @dev 사용자의 모든 건물 조회
     */
    function getUserBuildings(address user) external view returns (uint256[] memory) {
        return userBuildings[user];
    }

    /**
     * @dev 토큰 전송 시 오버라이드 (임대 중일 때 제한)
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        if (from != address(0) && to != address(0)) {
            require(!rentals[tokenId].isActive, "Cannot transfer rented building");
        }
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
            uint256[] storage fromBuildings = userBuildings[from];
            for (uint i = 0; i < fromBuildings.length; i++) {
                if (fromBuildings[i] == firstTokenId) {
                    fromBuildings[i] = fromBuildings[fromBuildings.length - 1];
                    fromBuildings.pop();
                    break;
                }
            }
            
            // 새 소유자의 목록에 추가
            userBuildings[to].push(firstTokenId);
        }
    }
}
