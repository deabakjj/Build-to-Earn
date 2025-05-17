// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title PlotX Token (PTX)
 * @dev DIY 크래프팅 월드의 랜드/거버넌스 토큰
 * 
 * 주요 기능:
 * - 랜드 확장 및 구매
 * - 스테이킹을 통한 VXC 수익 획득
 * - DAO 거버넌스 참여
 * - 프리미엄 기능 해금
 * - 고정 발행량 (인플레이션 없음)
 */
contract PlotX is ERC20, ERC20Burnable, ERC20Permit, AccessControl, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

    // 역할 정의
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant STAKING_MANAGER_ROLE = keccak256("STAKING_MANAGER_ROLE");

    // 토큰 정보
    uint256 public constant FIXED_SUPPLY = 1_000_000 * 10**18; // 100만 PTX (고정 공급량)
    
    // 스테이킹 정보
    mapping(address => StakeInfo) public stakes;
    mapping(uint8 => StakingTier) public stakingTiers;
    
    uint256 public totalStaked;
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    uint256 public rewardRate = 2 ether; // 일일 전체 VXC 보상 (2 VXC/일)
    
    address public rewardToken; // VXC 컨트랙트 주소
    
    // 구조체 정의
    struct StakeInfo {
        uint256 amount;
        uint8 tier; // 1: 1개월, 2: 3개월, 3: 6개월, 4: 12개월
        uint256 stakingTime;
        uint256 lockEndTime;
        uint256 rewardDebt;
        uint256 pendingRewards;
    }
    
    struct StakingTier {
        uint256 duration; // 락업 기간 (초)
        uint256 multiplier; // APY 배수 (100 = 100%)
        bool isActive;
    }
    
    // 이벤트
    event Staked(address indexed user, uint256 amount, uint8 tier);
    event Unstaked(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event TierUpdated(uint8 tier, uint256 duration, uint256 multiplier);
    event RewardRateUpdated(uint256 newRate);
    event RewardTokenUpdated(address newRewardToken);

    /**
     * @dev 컨트랙트 초기화
     */
    constructor() 
        ERC20("PlotX", "PTX") 
        ERC20Permit("PlotX") 
    {
        // 역할 설정
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(STAKING_MANAGER_ROLE, msg.sender);

        // 고정 공급량 민팅
        _mint(msg.sender, FIXED_SUPPLY);
        
        // 스테이킹 티어 초기 설정
        _setupStakingTiers();
    }

    /**
     * @dev 스테이킹 티어 초기 설정
     */
    function _setupStakingTiers() private {
        stakingTiers[1] = StakingTier({
            duration: 30 days,
            multiplier: 105, // 5% APY
            isActive: true
        });
        
        stakingTiers[2] = StakingTier({
            duration: 90 days,
            multiplier: 107, // 7% APY
            isActive: true
        });
        
        stakingTiers[3] = StakingTier({
            duration: 180 days,
            multiplier: 110, // 10% APY
            isActive: true
        });
        
        stakingTiers[4] = StakingTier({
            duration: 365 days,
            multiplier: 115, // 15% APY
            isActive: true
        });
    }

    /**
     * @dev PTX 스테이킹
     * @param amount 스테이킹할 PTX 양
     * @param tier 스테이킹 티어 (1-4)
     */
    function stake(uint256 amount, uint8 tier) external nonReentrant whenNotPaused {
        require(amount > 0, "Cannot stake 0 tokens");
        require(tier >= 1 && tier <= 4, "Invalid staking tier");
        require(stakingTiers[tier].isActive, "Staking tier is not active");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // 기존 스테이킹이 있으면 보상 정산
        if (stakes[msg.sender].amount > 0) {
            _claimRewards();
        }
        
        StakeInfo storage userStake = stakes[msg.sender];
        
        // 스테이킹 정보 업데이트
        userStake.amount = userStake.amount.add(amount);
        userStake.tier = tier;
        userStake.stakingTime = block.timestamp;
        userStake.lockEndTime = block.timestamp.add(stakingTiers[tier].duration);
        
        // 토큰 전송
        _transfer(msg.sender, address(this), amount);
        
        // 전체 스테이킹량 업데이트
        totalStaked = totalStaked.add(amount);
        
        emit Staked(msg.sender, amount, tier);
    }

    /**
     * @dev PTX 언스테이킹
     * @param amount 언스테이킹할 PTX 양
     */
    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient staked amount");
        require(block.timestamp >= userStake.lockEndTime, "Tokens are still locked");
        
        // 보상 정산
        _claimRewards();
        
        // 스테이킹 정보 업데이트
        userStake.amount = userStake.amount.sub(amount);
        totalStaked = totalStaked.sub(amount);
        
        // 토큰 전송
        _transfer(address(this), msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev 스테이킹 보상 청구
     */
    function claimRewards() external nonReentrant {
        _claimRewards();
    }

    /**
     * @dev 내부 보상 청구 함수
     */
    function _claimRewards() private {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "No staked tokens");
        
        uint256 reward = calculatePendingRewards(msg.sender);
        
        if (reward > 0) {
            userStake.pendingRewards = 0;
            userStake.rewardDebt = rewardPerTokenStored;
            
            // VXC 보상 전송 (실제 구현 시 VXC 컨트랙트 연동 필요)
            // IVoxelCraft(rewardToken).mint(msg.sender, reward);
            
            emit RewardPaid(msg.sender, reward);
        }
    }

    /**
     * @dev 보상 계산
     * @param user 사용자 주소
     * @return 클레임 가능한 보상량
     */
    function calculatePendingRewards(address user) public view returns (uint256) {
        StakeInfo memory userStake = stakes[user];
        
        if (userStake.amount == 0) {
            return 0;
        }
        
        StakingTier memory tier = stakingTiers[userStake.tier];
        
        // 스테이킹 기간 계산
        uint256 stakingDuration = block.timestamp.sub(userStake.stakingTime);
        
        // 연간 보상률 계산
        uint256 annualReward = userStake.amount.mul(tier.multiplier).div(100);
        
        // 실제 보상 계산 (시간 비례)
        uint256 timeReward = annualReward.mul(stakingDuration).div(365 days);
        
        return timeReward.add(userStake.pendingRewards).sub(userStake.rewardDebt);
    }

    /**
     * @dev 투표권 계산 (거버넌스용)
     * @param account 계정 주소
     * @return 투표권 (스테이킹량 + 보너스)
     */
    function getVotingPower(address account) external view returns (uint256) {
        StakeInfo memory userStake = stakes[account];
        
        if (userStake.amount == 0) {
            return balanceOf(account);
        }
        
        // 스테이킹 티어에 따른 보너스 투표권
        uint256 bonus = userStake.amount.mul(stakingTiers[userStake.tier].multiplier).div(100).sub(userStake.amount);
        
        return balanceOf(account).add(userStake.amount).add(bonus);
    }

    /**
     * @dev 스테이킹 정보 조회
     * @param user 사용자 주소
     */
    function getStakeInfo(address user) external view returns (
        uint256 stakedAmount,
        uint8 stakingTier,
        uint256 lockEndTime,
        uint256 pendingReward,
        uint256 votingPower
    ) {
        StakeInfo memory userStake = stakes[user];
        
        return (
            userStake.amount,
            userStake.tier,
            userStake.lockEndTime,
            calculatePendingRewards(user),
            this.getVotingPower(user)
        );
    }

    /**
     * @dev 스테이킹 티어 업데이트
     * @param tier 티어 번호
     * @param duration 락업 기간
     * @param multiplier APY 배수
     */
    function updateStakingTier(uint8 tier, uint256 duration, uint256 multiplier) 
        external 
        onlyRole(STAKING_MANAGER_ROLE) 
    {
        require(tier >= 1 && tier <= 4, "Invalid tier");
        require(multiplier >= 100, "Multiplier must be at least 100%");
        
        stakingTiers[tier] = StakingTier({
            duration: duration,
            multiplier: multiplier,
            isActive: true
        });
        
        emit TierUpdated(tier, duration, multiplier);
    }

    /**
     * @dev 보상 토큰 주소 설정
     * @param _rewardToken VXC 토큰 컨트랙트 주소
     */
    function setRewardToken(address _rewardToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_rewardToken != address(0), "Invalid reward token address");
        rewardToken = _rewardToken;
        emit RewardTokenUpdated(_rewardToken);
    }

    /**
     * @dev 보상률 업데이트
     * @param newRate 새로운 일일 보상률
     */
    function updateRewardRate(uint256 newRate) external onlyRole(STAKING_MANAGER_ROLE) {
        rewardRate = newRate;
        emit RewardRateUpdated(newRate);
    }

    /**
     * @dev 컨트랙트 일시 중지
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev 컨트랙트 일시 중지 해제
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev 토큰 전송 오버라이드 (일시 중지 시 차단)
     */
    function _transfer(address from, address to, uint256 amount) internal override whenNotPaused {
        super._transfer(from, to, amount);
    }

    /**
     * @dev 모든 스테이킹 티어 정보 조회
     */
    function getAllStakingTiers() external view returns (
        StakingTier memory tier1,
        StakingTier memory tier2,
        StakingTier memory tier3,
        StakingTier memory tier4
    ) {
        return (
            stakingTiers[1],
            stakingTiers[2],
            stakingTiers[3],
            stakingTiers[4]
        );
    }
}
