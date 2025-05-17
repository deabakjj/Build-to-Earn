// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseNFT.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title VehicleNFT
 * @dev NFT 컨트랙트 for DIY 크래프팅 월드의 탈것
 * 탈것 특유의 기능: 속도, 내구성, 연료, 업그레이드, 렌탈 지원
 */
contract VehicleNFT is BaseNFT {
    using SafeMath for uint256;

    // 탈것 타입 열거형
    enum VehicleType {
        LAND,           // 육상 교통수단
        WATER,          // 수상 교통수단
        AIR,            // 공중 교통수단
        SPECIAL         // 특수 교통수단
    }

    // 탈것 정보 구조체
    struct VehicleInfo {
        VehicleType vehicleType;
        uint256 speed;              // 기본 속도
        uint256 maxSpeed;           // 최대 속도
        uint256 durability;         // 내구도
        uint256 maxDurability;      // 최대 내구도
        uint256 fuelCapacity;       // 연료 용량
        uint256 currentFuel;        // 현재 연료
        uint256 weight;             // 무게
        uint256 cargoCapacity;      // 화물 용량
        uint256[] upgrades;         // 적용된 업그레이드 ID들
        uint256 lastMaintenance;    // 마지막 정비 블록
        uint256 totalDistance;      // 총 이동 거리
        bool isOperational;         // 운행 가능 상태
    }

    // 탈것 렌탈 정보 구조체
    struct VehicleRental {
        address renter;             // 임차인
        uint256 hourlyRate;         // 시간당 요금
        uint256 deposit;            // 보증금
        uint256 startBlock;         // 렌탈 시작 블록
        uint256 plannedEndBlock;    // 계획된 반납 블록
        uint256 actualEndBlock;     // 실제 반납 블록
        uint256 totalCost;          // 총 비용
        bool isActive;              // 렌탈 활성 상태
        uint256 startFuel;          // 렌탈 시작 시 연료량
        uint256 endFuel;            // 렌탈 종료 시 연료량
    }

    // 업그레이드 정보 구조체
    struct VehicleUpgrade {
        string name;
        string description;
        VehicleType compatibleType; // 호환되는 탈것 타입
        uint256 cost;               // 업그레이드 비용
        uint256 speedBonus;         // 속도 보너스
        uint256 durabilityBonus;    // 내구도 보너스
        uint256 fuelEfficiencyBonus;// 연비 보너스
        uint256 cargoBonus;         // 화물 용량 보너스
        bool isActive;
    }

    // 주행 기록 구조체
    struct TripRecord {
        uint256 startBlock;
        uint256 endBlock;
        uint256 distance;
        uint256 fuelConsumed;
        address driver;
        uint256 earnings;           // 운송으로 얻은 수익
    }

    // 매핑들
    mapping(uint256 => VehicleInfo) public vehicles;
    mapping(uint256 => VehicleRental) public rentals;
    mapping(uint256 => VehicleUpgrade) public upgrades;
    mapping(uint256 => TripRecord[]) public tripHistory;
    mapping(uint256 => mapping(uint256 => uint256)) public cargoInventory; // tokenId => itemId => amount
    mapping(address => uint256[]) public userVehicles;

    // 상태 변수들
    uint256 public nextUpgradeId;
    uint256 public fuelPrice = 1 ether / 1000;    // 연료 가격 (0.001 ether per unit)
    uint256 public maintenanceFee = 5;            // 정비 수수료 5%
    uint256 public platformRentalFee = 8;         // 플랫폼 렌탈 수수료 8%
    uint256 public maxUpgrades = 5;               // 탈것당 최대 업그레이드 수

    // 이벤트들
    event VehicleMinted(uint256 indexed tokenId, address indexed creator, VehicleType vehicleType);
    event VehicleRented(uint256 indexed tokenId, address indexed renter, uint256 duration);
    event VehicleReturned(uint256 indexed tokenId, address indexed renter, uint256 totalCost);
    event VehicleUpgraded(uint256 indexed tokenId, uint256 upgradeId, uint256 cost);
    event FuelPurchased(uint256 indexed tokenId, address indexed buyer, uint256 amount);
    event MaintenancePerformed(uint256 indexed tokenId, uint256 cost);
    event TripCompleted(uint256 indexed tokenId, uint256 distance, uint256 fuelConsumed);
    event CargoLoaded(uint256 indexed tokenId, uint256 itemId, uint256 amount);
    event CargoUnloaded(uint256 indexed tokenId, uint256 itemId, uint256 amount);

    constructor(address _marketplaceAddress) BaseNFT("DIY Vehicle NFT", "DIYV", _marketplaceAddress) {
        // 기본 업그레이드 추가
        addUpgrade("엔진 튜닝", "속도 +20%", VehicleType.LAND, 50 ether, 20, 0, 0, 0);
        addUpgrade("강화 차체", "내구도 +30%", VehicleType.LAND, 75 ether, 0, 30, 0, 0);
        addUpgrade("연비 개선", "연비 +25%", VehicleType.LAND, 60 ether, 0, 0, 25, 0);
        addUpgrade("화물 확장", "화물 용량 +40%", VehicleType.LAND, 80 ether, 0, 0, 0, 40);
    }

    /**
     * @dev 탈것 민팅 함수
     */
    function mintVehicle(
        address to,
        string memory uri,
        VehicleType _vehicleType,
        uint256 _speed,
        uint256 _durability,
        uint256 _fuelCapacity,
        uint256 _weight,
        uint256 _cargoCapacity
    ) external onlyOwner returns (uint256) {
        require(_speed > 0 && _durability > 0 && _fuelCapacity > 0, "Invalid vehicle parameters");

        uint256 tokenId = _mintNFT(to, uri);
        
        vehicles[tokenId] = VehicleInfo({
            vehicleType: _vehicleType,
            speed: _speed,
            maxSpeed: _speed.mul(150).div(100), // 최대 속도는 기본 속도의 150%
            durability: _durability,
            maxDurability: _durability,
            fuelCapacity: _fuelCapacity,
            currentFuel: _fuelCapacity.div(2), // 절반 연료로 시작
            weight: _weight,
            cargoCapacity: _cargoCapacity,
            upgrades: new uint256[](0),
            lastMaintenance: block.number,
            totalDistance: 0,
            isOperational: true
        });

        userVehicles[to].push(tokenId);
        emit VehicleMinted(tokenId, to, _vehicleType);
        
        return tokenId;
    }

    /**
     * @dev 연료 구매
     */
    function purchaseFuel(uint256 tokenId, uint256 amount) external payable {
        require(vehicles[tokenId].vehicleType != VehicleType.SPECIAL, "Vehicle exists");
        VehicleInfo storage vehicle = vehicles[tokenId];
        require(amount > 0, "Invalid amount");
        require(vehicle.currentFuel.add(amount) <= vehicle.fuelCapacity, "Exceeds fuel capacity");
        
        uint256 cost = amount.mul(fuelPrice);
        require(msg.value >= cost, "Insufficient payment");

        vehicle.currentFuel = vehicle.currentFuel.add(amount);

        // 초과 지불금 반환
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value.sub(cost));
        }

        emit FuelPurchased(tokenId, msg.sender, amount);
    }

    /**
     * @dev 탈것 렌탈 시작
     */
    function startRental(
        uint256 tokenId,
        uint256 _hourlyRate,
        uint256 _deposit
    ) external onlyTokenOwner(tokenId) {
        require(vehicles[tokenId].isOperational, "Vehicle not operational");
        require(!rentals[tokenId].isActive, "Already rented");
        require(_hourlyRate > 0 && _deposit > 0, "Invalid rental terms");

        rentals[tokenId] = VehicleRental({
            renter: address(0),
            hourlyRate: _hourlyRate,
            deposit: _deposit,
            startBlock: 0,
            plannedEndBlock: 0,
            actualEndBlock: 0,
            totalCost: 0,
            isActive: false,
            startFuel: 0,
            endFuel: 0
        });
    }

    /**
     * @dev 탈것 렌탈 (임차인이 호출)
     */
    function rentVehicle(uint256 tokenId, uint256 durationBlocks) external payable {
        VehicleRental storage rental = rentals[tokenId];
        require(!rental.isActive, "Already rented");
        require(rental.hourlyRate > 0, "Not available for rent");
        
        uint256 estimatedCost = rental.hourlyRate.mul(durationBlocks).div(240); // 블록을 시간으로 변환 (240 blocks ≈ 1 hour)
        uint256 totalRequired = rental.deposit.add(estimatedCost);
        require(msg.value >= totalRequired, "Insufficient payment");

        rental.renter = msg.sender;
        rental.startBlock = block.number;
        rental.plannedEndBlock = block.number.add(durationBlocks);
        rental.isActive = true;
        rental.startFuel = vehicles[tokenId].currentFuel;

        // 플랫폼 수수료 계산
        uint256 platformFee = estimatedCost.mul(platformRentalFee).div(100);
        uint256 ownerPayment = estimatedCost.sub(platformFee);

        // 지불 처리
        payable(ownerOf(tokenId)).transfer(ownerPayment);
        payable(owner()).transfer(platformFee);

        emit VehicleRented(tokenId, msg.sender, durationBlocks);
    }

    /**
     * @dev 탈것 반납
     */
    function returnVehicle(uint256 tokenId) external {
        VehicleRental storage rental = rentals[tokenId];
        require(rental.isActive, "No active rental");
        require(msg.sender == rental.renter, "Not the renter");

        rental.actualEndBlock = block.number;
        rental.endFuel = vehicles[tokenId].currentFuel;

        // 실제 사용 시간 계산
        uint256 actualBlocks = rental.actualEndBlock.sub(rental.startBlock);
        uint256 actualCost = rental.hourlyRate.mul(actualBlocks).div(240);

        // 연료 보상/페널티 계산
        int256 fuelDifference = int256(rental.endFuel) - int256(rental.startFuel);
        uint256 fuelAdjustment = 0;
        if (fuelDifference < 0) {
            fuelAdjustment = uint256(-fuelDifference).mul(fuelPrice);
        }

        // 총 비용 계산
        rental.totalCost = actualCost.add(fuelAdjustment);

        // 보증금에서 차감하고 반환
        if (rental.deposit > rental.totalCost) {
            payable(rental.renter).transfer(rental.deposit.sub(rental.totalCost));
        } else if (rental.deposit < rental.totalCost) {
            // 보증금이 부족한 경우 소유자에게 나머지 지불
            payable(ownerOf(tokenId)).transfer(rental.totalCost.sub(rental.deposit));
        }

        rental.isActive = false;
        rental.renter = address(0);

        emit VehicleReturned(tokenId, rental.renter, rental.totalCost);
    }

    /**
     * @dev 탈것 업그레이드
     */
    function upgradeVehicle(uint256 tokenId, uint256 upgradeId) 
        external 
        payable 
        onlyTokenOwner(tokenId) 
    {
        require(upgrades[upgradeId].isActive, "Upgrade not available");
        require(vehicles[tokenId].upgrades.length < maxUpgrades, "Max upgrades reached");
        require(msg.value >= upgrades[upgradeId].cost, "Insufficient payment");

        VehicleUpgrade storage upgrade = upgrades[upgradeId];
        require(
            upgrade.compatibleType == vehicles[tokenId].vehicleType || 
            upgrade.compatibleType == VehicleType.SPECIAL, 
            "Incompatible upgrade"
        );

        // 업그레이드 적용
        VehicleInfo storage vehicle = vehicles[tokenId];
        vehicle.upgrades.push(upgradeId);
        
        // 속도 업그레이드
        if (upgrade.speedBonus > 0) {
            vehicle.speed = vehicle.speed.add(vehicle.speed.mul(upgrade.speedBonus).div(100));
            vehicle.maxSpeed = vehicle.maxSpeed.add(vehicle.maxSpeed.mul(upgrade.speedBonus).div(100));
        }
        
        // 내구도 업그레이드
        if (upgrade.durabilityBonus > 0) {
            vehicle.maxDurability = vehicle.maxDurability.add(vehicle.maxDurability.mul(upgrade.durabilityBonus).div(100));
            vehicle.durability = vehicle.maxDurability; // 업그레이드와 함께 내구도 회복
        }
        
        // 화물 용량 업그레이드
        if (upgrade.cargoBonus > 0) {
            vehicle.cargoCapacity = vehicle.cargoCapacity.add(vehicle.cargoCapacity.mul(upgrade.cargoBonus).div(100));
        }

        // 정비비 지불
        uint256 maintenanceCost = msg.value.mul(maintenanceFee).div(100);
        payable(ownerOf(tokenId)).transfer(msg.value.sub(maintenanceCost));
        payable(owner()).transfer(maintenanceCost);

        emit VehicleUpgraded(tokenId, upgradeId, msg.value);
    }

    /**
     * @dev 정비 수행
     */
    function performMaintenance(uint256 tokenId) external payable onlyTokenOwner(tokenId) {
        VehicleInfo storage vehicle = vehicles[tokenId];
        require(vehicle.durability < vehicle.maxDurability, "No maintenance needed");
        
        uint256 repairCost = calculateMaintenanceCost(tokenId);
        require(msg.value >= repairCost, "Insufficient payment");

        vehicle.durability = vehicle.maxDurability;
        vehicle.lastMaintenance = block.number;
        vehicle.isOperational = true;

        // 정비 완료
        uint256 platformFee = msg.value.mul(maintenanceFee).div(100);
        payable(owner()).transfer(platformFee);

        emit MaintenancePerformed(tokenId, msg.value);
    }

    /**
     * @dev 화물 적재
     */
    function loadCargo(uint256 tokenId, uint256 itemId, uint256 amount) external {
        require(vehicles[tokenId].vehicleType != VehicleType.SPECIAL, "Vehicle exists");
        VehicleInfo storage vehicle = vehicles[tokenId];
        require(vehicle.isOperational, "Vehicle not operational");
        
        // 현재 화물량 계산
        uint256 currentCargo = 0;
        for (uint i = 0; i < 1000; i++) { // 가정: 최대 1000개의 아이템 타입
            currentCargo = currentCargo.add(cargoInventory[tokenId][i]);
        }
        
        require(currentCargo.add(amount) <= vehicle.cargoCapacity, "Exceeds cargo capacity");
        
        cargoInventory[tokenId][itemId] = cargoInventory[tokenId][itemId].add(amount);
        emit CargoLoaded(tokenId, itemId, amount);
    }

    /**
     * @dev 화물 하역
     */
    function unloadCargo(uint256 tokenId, uint256 itemId, uint256 amount) external {
        require(cargoInventory[tokenId][itemId] >= amount, "Insufficient cargo");
        
        cargoInventory[tokenId][itemId] = cargoInventory[tokenId][itemId].sub(amount);
        emit CargoUnloaded(tokenId, itemId, amount);
    }

    /**
     * @dev 여행 기록
     */
    function recordTrip(
        uint256 tokenId,
        uint256 distance,
        uint256 fuelConsumed,
        uint256 earnings
    ) external onlyTokenOwner(tokenId) {
        VehicleInfo storage vehicle = vehicles[tokenId];
        require(distance > 0, "Invalid distance");
        require(vehicle.currentFuel >= fuelConsumed, "Insufficient fuel");

        vehicle.currentFuel = vehicle.currentFuel.sub(fuelConsumed);
        vehicle.totalDistance = vehicle.totalDistance.add(distance);
        
        // 내구도 감소
        uint256 durabilityLoss = calculateDurabilityLoss(distance, vehicle.weight);
        if (vehicle.durability > durabilityLoss) {
            vehicle.durability = vehicle.durability.sub(durabilityLoss);
        } else {
            vehicle.durability = 0;
            vehicle.isOperational = false;
        }

        // 여행 기록 저장
        tripHistory[tokenId].push(TripRecord({
            startBlock: block.number,
            endBlock: block.number,
            distance: distance,
            fuelConsumed: fuelConsumed,
            driver: msg.sender,
            earnings: earnings
        }));

        emit TripCompleted(tokenId, distance, fuelConsumed);
    }

    /**
     * @dev 업그레이드 추가 (관리자 전용)
     */
    function addUpgrade(
        string memory name,
        string memory description,
        VehicleType compatibleType,
        uint256 cost,
        uint256 speedBonus,
        uint256 durabilityBonus,
        uint256 fuelEfficiencyBonus,
        uint256 cargoBonus
    ) public onlyOwner {
        upgrades[nextUpgradeId] = VehicleUpgrade({
            name: name,
            description: description,
            compatibleType: compatibleType,
            cost: cost,
            speedBonus: speedBonus,
            durabilityBonus: durabilityBonus,
            fuelEfficiencyBonus: fuelEfficiencyBonus,
            cargoBonus: cargoBonus,
            isActive: true
        });
        nextUpgradeId++;
    }

    /**
     * @dev 정비 비용 계산
     */
    function calculateMaintenanceCost(uint256 tokenId) public view returns (uint256) {
        VehicleInfo storage vehicle = vehicles[tokenId];
        uint256 damagePercent = vehicle.maxDurability.sub(vehicle.durability).mul(100).div(vehicle.maxDurability);
        return damagePercent.mul(1 ether).div(100);
    }

    /**
     * @dev 내구도 손실 계산
     */
    function calculateDurabilityLoss(uint256 distance, uint256 weight) internal pure returns (uint256) {
        // 거리와 무게에 따른 내구도 손실 계산
        return distance.mul(weight).div(1000);
    }

    /**
     * @dev 탈것 정보 조회
     */
    function getVehicleInfo(uint256 tokenId) external view returns (
        VehicleType,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        bool
    ) {
        VehicleInfo storage vehicle = vehicles[tokenId];
        return (
            vehicle.vehicleType,
            vehicle.speed,
            vehicle.maxSpeed,
            vehicle.durability,
            vehicle.maxDurability,
            vehicle.fuelCapacity,
            vehicle.currentFuel,
            vehicle.cargoCapacity,
            vehicle.totalDistance,
            vehicle.isOperational
        );
    }

    /**
     * @dev 렌탈 정보 조회
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
        VehicleRental storage rental = rentals[tokenId];
        return (
            rental.renter,
            rental.hourlyRate,
            rental.deposit,
            rental.startBlock,
            rental.plannedEndBlock,
            rental.isActive,
            rental.totalCost
        );
    }

    /**
     * @dev 여행 기록 조회
     */
    function getTripHistory(uint256 tokenId) external view returns (TripRecord[] memory) {
        return tripHistory[tokenId];
    }

    /**
     * @dev 화물 인벤토리 조회
     */
    function getCargoInventory(uint256 tokenId, uint256 itemId) external view returns (uint256) {
        return cargoInventory[tokenId][itemId];
    }

    /**
     * @dev 사용자의 모든 탈것 조회
     */
    function getUserVehicles(address user) external view returns (uint256[] memory) {
        return userVehicles[user];
    }

    /**
     * @dev 토큰 전송 시 오버라이드 (렌탈 중일 때 제한)
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        if (from != address(0) && to != address(0)) {
            require(!rentals[tokenId].isActive, "Cannot transfer rented vehicle");
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
            uint256[] storage fromVehicles = userVehicles[from];
            for (uint i = 0; i < fromVehicles.length; i++) {
                if (fromVehicles[i] == firstTokenId) {
                    fromVehicles[i] = fromVehicles[fromVehicles.length - 1];
                    fromVehicles.pop();
                    break;
                }
            }
            
            // 새 소유자의 목록에 추가
            userVehicles[to].push(firstTokenId);
        }
    }

    /**
     * @dev 연료 가격 업데이트 (관리자 전용)
     */
    function updateFuelPrice(uint256 newPrice) external onlyOwner {
        fuelPrice = newPrice;
    }

    /**
     * @dev 수수료 업데이트 (관리자 전용)
     */
    function updateFees(uint256 _maintenanceFee, uint256 _platformRentalFee) external onlyOwner {
        maintenanceFee = _maintenanceFee;
        platformRentalFee = _platformRentalFee;
    }
}
