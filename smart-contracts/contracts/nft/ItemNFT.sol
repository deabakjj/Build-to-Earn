// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseNFT.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title ItemNFT
 * @dev DIY 크래프팅 월드의 아이템 NFT 컨트랙트
 * 
 * 주요 기능:
 * - 유저가 제작한 아이템 NFT 발행
 * - 아이템별 기능성 정의
 * - 소모성 아이템 관리
 * - 장착 시스템
 * - 아이템 합성 기능
 */
contract ItemNFT is BaseNFT {
    using SafeMath for uint256;

    // 아이템 타입 정의
    enum ItemType {
        TOOL,           // 도구
        DECORATION,     // 장식품
        FURNITURE,      // 가구
        CONSUMABLE,     // 소모품
        MATERIAL,       // 재료
        BLUEPRINT,      // 설계도
        COMPONENT,      // 부품
        ARTIFACT        // 유물
    }

    // 아이템 특성
    struct ItemProperties {
        ItemType itemType;
        uint256 durability;      // 내구도
        uint256 maxDurability;   // 최대 내구도
        uint8 functionality;     // 기능성 레벨 (0-10)
        bool isConsumable;       // 소모성 여부
        uint256 uses;            // 사용 횟수 (소모품용)
        uint256 maxUses;         // 최대 사용 횟수
        string[] features;       // 특수 기능 목록
        uint256[] components;    // 제작 재료 정보
        bool isEquippable;       // 장착 가능 여부
        uint8 slotType;          // 장착 슬롯 타입
    }

    // 저장소
    mapping(uint256 => ItemProperties) public itemProperties;
    mapping(address => uint256[]) public equippedItems; // 유저별 장착된 아이템
    mapping(uint256 => uint256) public itemToEquipment; // 아이템-장착 매핑
    mapping(ItemType => uint256) public itemTypeCount;

    // 합성 레시피
    struct CraftingRecipe {
        uint256[] ingredients;  // 재료 아이템 ID
        uint256[] amounts;      // 재료별 필요 수량
        uint256 outputId;       // 결과물 아이템 ID
        uint256 craftingCost;   // 제작 비용 (VXC)
        bool isActive;
    }

    mapping(bytes32 => CraftingRecipe) public craftingRecipes;
    mapping(uint256 => bool) public isRecipeResult; // 제작 가능한 아이템 표시

    // 이벤트
    event ItemCrafted(uint256 indexed tokenId, address indexed crafter, ItemType itemType);
    event ItemEquipped(address indexed user, uint256 indexed tokenId, uint8 slotType);
    event ItemUnequipped(address indexed user, uint256 indexed tokenId);
    event ItemUsed(uint256 indexed tokenId, address indexed user, uint256 remainingUses);
    event DurabilityUpdated(uint256 indexed tokenId, uint256 newDurability);
    event RecipeAdded(bytes32 indexed recipeId, uint256 outputId);

    constructor(address paymentToken) 
        BaseNFT("DIY Crafting Items", "DIII", paymentToken) 
    {}

    /**
     * @dev 아이템 NFT 발행 (BaseNFT mint 오버라이드)
     */
    function mintItem(
        address to,
        string memory uri,
        NFTMetadata memory metadata,
        ItemProperties memory properties,
        uint256 royaltyRate
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        // 기본 NFT 발행
        uint256 tokenId = mint(to, uri, metadata, royaltyRate);

        // 아이템 속성 설정
        itemProperties[tokenId] = properties;
        itemTypeCount[properties.itemType] = itemTypeCount[properties.itemType].add(1);

        emit ItemCrafted(tokenId, to, properties.itemType);
        
        return tokenId;
    }

    /**
     * @dev 아이템 장착
     * @param tokenId 장착할 아이템 ID
     */
    function equipItem(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(itemProperties[tokenId].isEquippable, "Item is not equippable");
        require(itemToEquipment[tokenId] == 0, "Item already equipped");

        // 장착 처리
        equippedItems[msg.sender].push(tokenId);
        itemToEquipment[tokenId] = block.timestamp;

        emit ItemEquipped(msg.sender, tokenId, itemProperties[tokenId].slotType);
    }

    /**
     * @dev 아이템 장착 해제
     * @param tokenId 해제할 아이템 ID
     */
    function unequipItem(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(itemToEquipment[tokenId] > 0, "Item not equipped");

        // 장착 해제 처리
        _removeFromEquipped(msg.sender, tokenId);
        itemToEquipment[tokenId] = 0;

        emit ItemUnequipped(msg.sender, tokenId);
    }

    /**
     * @dev 소모품 사용
     * @param tokenId 사용할 소모품 ID
     */
    function useConsumable(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        
        ItemProperties storage item = itemProperties[tokenId];
        require(item.isConsumable, "Item is not consumable");
        require(item.uses > 0, "No uses remaining");

        // 사용 횟수 감소
        item.uses = item.uses.sub(1);

        emit ItemUsed(tokenId, msg.sender, item.uses);

        // 소모품이 모두 사용된 경우 소각
        if (item.uses == 0) {
            _burn(tokenId);
        }
    }

    /**
     * @dev 아이템 내구도 복구
     * @param tokenId 복구할 아이템 ID
     * @param repairCost 복구 비용 (VXC)
     */
    function repairItem(uint256 tokenId, uint256 repairCost) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        
        ItemProperties storage item = itemProperties[tokenId];
        require(item.durability < item.maxDurability, "Item at full durability");

        // VXC 결제 처리 (실제 구현 시 VXC 컨트랙트 연동 필요)
        // IVoxelCraft(paymentToken).transferFrom(msg.sender, address(this), repairCost);

        // 내구도 복구
        uint256 repairAmount = repairCost.div(10**18).mul(10); // 1 VXC = 10 내구도
        item.durability = item.durability.add(repairAmount);
        
        if (item.durability > item.maxDurability) {
            item.durability = item.maxDurability;
        }

        emit DurabilityUpdated(tokenId, item.durability);
    }

    /**
     * @dev 아이템 합성
     * @param recipeId 레시피 ID
     */
    function craftItem(bytes32 recipeId) external nonReentrant {
        CraftingRecipe storage recipe = craftingRecipes[recipeId];
        require(recipe.isActive, "Recipe not active");

        // 재료 확인 및 소각
        for (uint i = 0; i < recipe.ingredients.length; i++) {
            uint256 ingredientId = recipe.ingredients[i];
            uint256 needed = recipe.amounts[i];
            
            require(ownerOf(ingredientId) == msg.sender, "Missing ingredient");
            
            // 소모품이나 재료 타입 아이템 확인
            require(
                itemProperties[ingredientId].isConsumable || 
                itemProperties[ingredientId].itemType == ItemType.MATERIAL,
                "Ingredient not consumable"
            );
            
            // 재료 소각
            _burn(ingredientId);
        }

        // 제작 비용 지불
        if (recipe.craftingCost > 0) {
            // IVoxelCraft(paymentToken).transferFrom(msg.sender, address(this), recipe.craftingCost);
        }

        // 결과물 아이템 생성 (실제 구현 시 적절한 메타데이터 생성 필요)
        // mintItem(msg.sender, uri, metadata, properties, royaltyRate);
    }

    /**
     * @dev 제작 레시피 추가
     * @param recipeId 레시피 ID
     * @param recipe 레시피 정보
     */
    function addCraftingRecipe(bytes32 recipeId, CraftingRecipe memory recipe) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(recipe.ingredients.length == recipe.amounts.length, "Invalid recipe");
        require(recipe.outputId > 0, "Invalid output ID");

        craftingRecipes[recipeId] = recipe;
        isRecipeResult[recipe.outputId] = true;

        emit RecipeAdded(recipeId, recipe.outputId);
    }

    /**
     * @dev 플레이어의 장착 아이템 조회
     * @param player 플레이어 주소
     */
    function getEquippedItems(address player) external view returns (uint256[] memory) {
        return equippedItems[player];
    }

    /**
     * @dev 아이템 세부 정보 조회
     * @param tokenId 아이템 ID
     */
    function getItemDetails(uint256 tokenId) external view returns (
        NFTMetadata memory metadata,
        ItemProperties memory properties
    ) {
        require(_exists(tokenId), "Token does not exist");
        
        return (nftMetadata[tokenId], itemProperties[tokenId]);
    }

    /**
     * @dev 내부 함수: 장착 목록에서 아이템 제거
     */
    function _removeFromEquipped(address user, uint256 tokenId) private {
        uint256[] storage items = equippedItems[user];
        
        for (uint i = 0; i < items.length; i++) {
            if (items[i] == tokenId) {
                items[i] = items[items.length - 1];
                items.pop();
                break;
            }
        }
    }

    /**
     * @dev 업그레이드 재료 소각 처리 (BaseNFT 오버라이드)
     */
    function _burnUpgradeMaterials(uint256[] memory materials) internal override {
        for (uint i = 0; i < materials.length; i++) {
            require(_exists(materials[i]), "Material does not exist");
            require(
                itemProperties[materials[i]].itemType == ItemType.MATERIAL,
                "Invalid upgrade material"
            );
            _burn(materials[i]);
        }
    }

    /**
     * @dev 아이템 타입별 통계 조회
     */
    function getItemTypeStats() external view returns (
        uint256[8] memory typeCounts
    ) {
        for (uint i = 0; i < 8; i++) {
            typeCounts[i] = itemTypeCount[ItemType(i)];
        }
        
        return typeCounts;
    }
}
