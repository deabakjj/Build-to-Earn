// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../security/SecurityModule.sol";

/**
 * @title StakingPool
 * @dev 토큰 스테이킹 풀 컨트랙트
 * 
 * Features:
 * - 다중 토큰 스테이킹 지원 (VXC, PTX)
 * - 유연한 스테이킹 기간 및 보상율
 * - 자동 복리 계산
 * - 조기 출금 패널티
 * - 스테이킹 티어 시스템
 * - 긴급 출금 기능
 */
contract StakingPool is Ownable, SecurityModule, ReentrancyGuard {
    using SafeMath for uint256;

    // Tokens
    IERC20 public vxcToken;
    IERC20 public ptxToken;

    // Staking tiers
    enum StakingTier {
        Bronze,    // 기본
        Silver,    // 중급
        Gold,      // 고급
        Platinum,  // 최고급
        Diamond    // 특별
    }

    // Stake information
    struct Stake {
        uint256 amount;           // 스테이킹 양
        uint256 timestamp;        // 스테이킹 시작 시간
        uint256 unlockTime;       // 언락 시간
        uint256 rewardPaid;       // 지급된 보상
        uint256 pendingReward;    // 대기 중 보상
        StakingTier tier;         // 스테이킹 티어
        bool autoCompound;        // 자동 복리 여부
        address token;            // 스테이킹 토큰
        bool active;              // 활성 상태
    }

    // Staking pool configuration
    struct PoolConfig {
        uint256 minStakeAmount;   // 최소 스테이킹량
        uint256 maxStakeAmount;   // 최대 스테이킹량
        uint256 baseAPY;          // 기본 APY (100 = 1%)
        uint256 maxAPY;           // 최대 APY
        uint256 lockPeriod;       // 락업 기간 (초)
        uint256 penaltyRate;      // 조기 출금 패널티 (100 = 1%)
        uint256 tierMultiplier;   // 티어별 보너스
        bool active;              // 풀 활성화 상태
        uint256 totalStaked;      // 총 스테이킹량
        uint256 totalRewards;     // 총 보상 풀
    }

    // User information
    struct UserInfo {
        uint256 totalStaked;      // 총 스테이킹량
        uint256 totalRewards;     // 총 보상
        uint256 stakeCount;       // 스테이킹 횟수
        StakingTier currentTier;  // 현재 티어
        bool vipMember;           // VIP 회원 여부
        uint256 lastStakeTime;    // 마지막 스테이킹 시간
        uint256 totalPenalties;   // 누적 패널티
    }

    // Storage
    mapping(address => mapping(uint256 => Stake)) public userStakes;
    mapping(address => uint256[]) public userStakeIds;
    mapping(address => UserInfo) public userInfo;
    mapping(address => PoolConfig) public poolConfigs;
    mapping(StakingTier => uint256) public tierRequirements;
    mapping(StakingTier => uint256) public tierMultipliers;

    // Pool statistics
    struct PoolStats {
        uint256 totalUsers;
        uint256 totalValueLocked;
        uint256 totalRewardsPaid;
        uint256 averageAPY;
        uint256 highestStake;
        address topStaker;
    }

    PoolStats public poolStats;

    // Counter for stake IDs
    uint256 private stakeIdCounter;

    // Events
    event Staked(
        address indexed user,
        uint256 indexed stakeId,
        address token,
        uint256 amount,
        uint256 lockPeriod,
        StakingTier tier
    );

    event Unstaked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 reward,
        uint256 penalty
    );

    event RewardClaimed(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        bool autoCompounded
    );

    event TierUpgraded(
        address indexed user,
        StakingTier fromTier,
        StakingTier toTier
    );

    event EmergencyUnstake(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 penalty
    );

    event PoolConfigUpdated(
        address indexed token,
        uint256 baseAPY,
        uint256 maxAPY,
        uint256 lockPeriod
    );

    // Modifiers
    modifier validStake(address _user, uint256 _stakeId) {
        require(_stakeId < userStakeIds[_user].length, "Invalid stake ID");
        require(userStakes[_user][_stakeId].active, "Stake not active");
        _;
    }

    modifier validToken(address _token) {
        require(_token == address(vxcToken) || _token == address(ptxToken), "Invalid token");
        _;
    }

    // Constructor
    constructor(address _vxcToken, address _ptxToken) {
        vxcToken = IERC20(_vxcToken);
        ptxToken = IERC20(_ptxToken);
        
        // Initialize pools
        initializePools();
        initializeTiers();
    }

    /**
     * @dev 풀 초기화
     */
    function initializePools() private {
        // VXC Pool
        poolConfigs[address(vxcToken)] = PoolConfig({
            minStakeAmount: 100 * 10**18,      // 100 VXC
            maxStakeAmount: 1000000 * 10**18,  // 1M VXC
            baseAPY: 500,                      // 5% APY
            maxAPY: 1500,                      // 15% APY
            lockPeriod: 30 days,
            penaltyRate: 500,                  // 5% penalty
            tierMultiplier: 100,
            active: true,
            totalStaked: 0,
            totalRewards: 10000000 * 10**18    // 10M VXC
        });

        // PTX Pool
        poolConfigs[address(ptxToken)] = PoolConfig({
            minStakeAmount: 10 * 10**18,       // 10 PTX
            maxStakeAmount: 100000 * 10**18,   // 100K PTX
            baseAPY: 700,                      // 7% APY
            maxAPY: 2000,                      // 20% APY
            lockPeriod: 90 days,
            penaltyRate: 700,                  // 7% penalty
            tierMultiplier: 100,
            active: true,
            totalStaked: 0,
            totalRewards: 1000000 * 10**18     // 1M PTX
        });
    }

    /**
     * @dev 티어 시스템 초기화
     */
    function initializeTiers() private {
        // Tier requirements (minimum staked amount)
        tierRequirements[StakingTier.Bronze] = 0;
        tierRequirements[StakingTier.Silver] = 10000 * 10**18;    // 10,000 VXC
        tierRequirements[StakingTier.Gold] = 50000 * 10**18;      // 50,000 VXC
        tierRequirements[StakingTier.Platinum] = 200000 * 10**18; // 200,000 VXC
        tierRequirements[StakingTier.Diamond] = 1000000 * 10**18; // 1,000,000 VXC

        // Tier multipliers (additional APY bonus)
        tierMultipliers[StakingTier.Bronze] = 100;    // No bonus
        tierMultipliers[StakingTier.Silver] = 110;    // 10% bonus
        tierMultipliers[StakingTier.Gold] = 125;      // 25% bonus
        tierMultipliers[StakingTier.Platinum] = 150;  // 50% bonus
        tierMultipliers[StakingTier.Diamond] = 200;   // 100% bonus
    }

    /**
     * @dev 토큰 스테이킹
     */
    function stake(
        address _token,
        uint256 _amount,
        uint256 _lockPeriod,
        bool _autoCompound
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        validToken(_token) 
        returns (uint256) 
    {
        require(_amount > 0, "Amount must be positive");
        
        PoolConfig storage config = poolConfigs[_token];
        require(config.active, "Pool not active");
        require(_amount >= config.minStakeAmount, "Below minimum stake");
        require(_amount <= config.maxStakeAmount, "Exceeds maximum stake");
        require(_lockPeriod >= config.lockPeriod, "Lock period too short");

        // Transfer tokens
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        // Create stake
        uint256 stakeId = createStake(msg.sender, _token, _amount, _lockPeriod, _autoCompound);

        // Update statistics
        updateUserInfo(msg.sender, _amount, 0);
        updatePoolStats(_token, _amount, 0);

        // Check for tier upgrade
        checkTierUpgrade(msg.sender);

        emit Staked(msg.sender, stakeId, _token, _amount, _lockPeriod, userInfo[msg.sender].currentTier);

        return stakeId;
    }

    /**
     * @dev 스테이킹 생성
     */
    function createStake(
        address _user,
        address _token,
        uint256 _amount,
        uint256 _lockPeriod,
        bool _autoCompound
    ) private returns (uint256) {
        stakeIdCounter++;
        uint256 stakeId = stakeIdCounter;

        Stake storage newStake = userStakes[_user][stakeId];
        newStake.amount = _amount;
        newStake.timestamp = block.timestamp;
        newStake.unlockTime = block.timestamp.add(_lockPeriod);
        newStake.tier = calculateTier(_user);
        newStake.autoCompound = _autoCompound;
        newStake.token = _token;
        newStake.active = true;

        userStakeIds[_user].push(stakeId);

        return stakeId;
    }

    /**
     * @dev 보상 계산
     */
    function calculateReward(address _user, uint256 _stakeId) 
        public 
        view 
        validStake(_user, _stakeId)
        returns (uint256) 
    {
        Stake storage userStake = userStakes[_user][_stakeId];
        PoolConfig storage config = poolConfigs[userStake.token];

        uint256 timePassed = block.timestamp.sub(userStake.timestamp);
        uint256 annualReward = userStake.amount.mul(config.baseAPY).div(10000);
        uint256 tierBonus = annualReward.mul(tierMultipliers[userStake.tier].sub(100)).div(100);
        uint256 totalAnnualReward = annualReward.add(tierBonus);

        uint256 reward = totalAnnualReward.mul(timePassed).div(365 days);

        // Apply compound interest if enabled
        if (userStake.autoCompound && reward > 0) {
            reward = calculateCompoundReward(userStake.amount, totalAnnualReward, timePassed);
        }

        return reward.sub(userStake.rewardPaid);
    }

    /**
     * @dev 복리 보상 계산
     */
    function calculateCompoundReward(
        uint256 _principal,
        uint256 _annualRate,
        uint256 _timePassed
    ) private pure returns (uint256) {
        uint256 n = 12; // Monthly compounding
        uint256 years = _timePassed.mul(1000).div(365 days);
        uint256 rate = _annualRate.mul(1000).div(_principal);
        
        // Calculate (1 + r/n)^(n*t) using approximation
        uint256 base = (1000 + rate.div(n));
        uint256 exponent = n.mul(years).div(1000);
        
        // Simplified power calculation for gas optimization
        uint256 result = _principal;
        for (uint i = 0; i < exponent && i < 36; i++) {
            result = result.mul(base).div(1000);
        }
        
        return result.sub(_principal);
    }

    /**
     * @dev 보상 청구
     */
    function claimReward(uint256 _stakeId) 
        external 
        nonReentrant 
        whenNotPaused
        validStake(msg.sender, _stakeId) 
    {
        Stake storage userStake = userStakes[msg.sender][_stakeId];
        
        uint256 reward = calculateReward(msg.sender, _stakeId);
        require(reward > 0, "No reward available");

        // Update stake
        userStake.rewardPaid = userStake.rewardPaid.add(reward);
        
        if (userStake.autoCompound) {
            // Add reward to stake
            userStake.amount = userStake.amount.add(reward);
            emit RewardClaimed(msg.sender, _stakeId, reward, true);
        } else {
            // Transfer reward
            IERC20(userStake.token).transfer(msg.sender, reward);
            emit RewardClaimed(msg.sender, _stakeId, reward, false);
        }

        // Update statistics
        updateUserInfo(msg.sender, 0, reward);
        updatePoolStats(userStake.token, 0, reward);
    }

    /**
     * @dev 언스테이킹
     */
    function unstake(uint256 _stakeId) 
        external 
        nonReentrant 
        whenNotPaused
        validStake(msg.sender, _stakeId) 
    {
        Stake storage userStake = userStakes[msg.sender][_stakeId];
        require(block.timestamp >= userStake.unlockTime, "Still locked");

        uint256 amount = userStake.amount;
        uint256 reward = calculateReward(msg.sender, _stakeId);
        
        // Deactivate stake
        userStake.active = false;

        // Transfer principal and reward
        IERC20(userStake.token).transfer(msg.sender, amount.add(reward));

        // Update statistics
        updateUserInfo(msg.sender, amount.mul(uint256(-1)), reward);
        updatePoolStats(userStake.token, amount.mul(uint256(-1)), reward);

        emit Unstaked(msg.sender, _stakeId, amount, reward, 0);
    }

    /**
     * @dev 조기 언스테이킹 (패널티 적용)
     */
    function emergencyUnstake(uint256 _stakeId) 
        external 
        nonReentrant 
        whenNotPaused
        validStake(msg.sender, _stakeId) 
    {
        Stake storage userStake = userStakes[msg.sender][_stakeId];
        require(block.timestamp < userStake.unlockTime, "Already unlocked");

        PoolConfig storage config = poolConfigs[userStake.token];
        
        uint256 amount = userStake.amount;
        uint256 penalty = amount.mul(config.penaltyRate).div(10000);
        uint256 netAmount = amount.sub(penalty);
        
        // Calculate partial reward (if any)
        uint256 reward = calculateReward(msg.sender, _stakeId);
        uint256 rewardPenalty = reward.mul(config.penaltyRate).div(10000);
        uint256 netReward = reward.sub(rewardPenalty);

        // Deactivate stake
        userStake.active = false;

        // Transfer net amount
        IERC20(userStake.token).transfer(msg.sender, netAmount.add(netReward));

        // Track penalty
        userInfo[msg.sender].totalPenalties = userInfo[msg.sender].totalPenalties.add(penalty.add(rewardPenalty));

        // Update statistics
        updateUserInfo(msg.sender, amount.mul(uint256(-1)), netReward);
        updatePoolStats(userStake.token, amount.mul(uint256(-1)), netReward);

        emit EmergencyUnstake(msg.sender, _stakeId, netAmount, penalty.add(rewardPenalty));
    }

    /**
     * @dev 사용자 정보 업데이트
     */
    function updateUserInfo(address _user, uint256 _stakeChange, uint256 _reward) private {
        UserInfo storage info = userInfo[_user];
        
        if (_stakeChange > 0) {
            info.totalStaked = info.totalStaked.add(_stakeChange);
            info.stakeCount = info.stakeCount.add(1);
            info.lastStakeTime = block.timestamp;
        } else if (_stakeChange < 0) {
            info.totalStaked = info.totalStaked.sub(uint256(int256(-1) * _stakeChange));
        }
        
        if (_reward > 0) {
            info.totalRewards = info.totalRewards.add(_reward);
        }
    }

    /**
     * @dev 풀 통계 업데이트
     */
    function updatePoolStats(address _token, uint256 _stakeChange, uint256 _reward) private {
        PoolConfig storage config = poolConfigs[_token];
        
        if (_stakeChange > 0) {
            config.totalStaked = config.totalStaked.add(_stakeChange);
            poolStats.totalValueLocked = poolStats.totalValueLocked.add(_stakeChange);
        } else if (_stakeChange < 0) {
            config.totalStaked = config.totalStaked.sub(uint256(int256(-1) * _stakeChange));
            poolStats.totalValueLocked = poolStats.totalValueLocked.sub(uint256(int256(-1) * _stakeChange));
        }
        
        if (_reward > 0) {
            poolStats.totalRewardsPaid = poolStats.totalRewardsPaid.add(_reward);
        }
    }

    /**
     * @dev 티어 계산
     */
    function calculateTier(address _user) public view returns (StakingTier) {
        uint256 totalStaked = userInfo[_user].totalStaked;
        
        if (totalStaked >= tierRequirements[StakingTier.Diamond]) {
            return StakingTier.Diamond;
        } else if (totalStaked >= tierRequirements[StakingTier.Platinum]) {
            return StakingTier.Platinum;
        } else if (totalStaked >= tierRequirements[StakingTier.Gold]) {
            return StakingTier.Gold;
        } else if (totalStaked >= tierRequirements[StakingTier.Silver]) {
            return StakingTier.Silver;
        } else {
            return StakingTier.Bronze;
        }
    }

    /**
     * @dev 티어 업그레이드 확인
     */
    function checkTierUpgrade(address _user) private {
        StakingTier currentTier = userInfo[_user].currentTier;
        StakingTier newTier = calculateTier(_user);
        
        if (newTier > currentTier) {
            userInfo[_user].currentTier = newTier;
            
            // Update all user stakes with new tier
            uint256[] memory stakeIds = userStakeIds[_user];
            for (uint i = 0; i < stakeIds.length; i++) {
                if (userStakes[_user][stakeIds[i]].active) {
                    userStakes[_user][stakeIds[i]].tier = newTier;
                }
            }
            
            emit TierUpgraded(_user, currentTier, newTier);
        }
    }

    /**
     * @dev 풀 설정 업데이트
     */
    function updatePoolConfig(
        address _token,
        uint256 _minStake,
        uint256 _maxStake,
        uint256 _baseAPY,
        uint256 _maxAPY,
        uint256 _lockPeriod,
        uint256 _penaltyRate,
        bool _active
    ) external onlyOwner validToken(_token) {
        PoolConfig storage config = poolConfigs[_token];
        
        config.minStakeAmount = _minStake;
        config.maxStakeAmount = _maxStake;
        config.baseAPY = _baseAPY;
        config.maxAPY = _maxAPY;
        config.lockPeriod = _lockPeriod;
        config.penaltyRate = _penaltyRate;
        config.active = _active;
        
        emit PoolConfigUpdated(_token, _baseAPY, _maxAPY, _lockPeriod);
    }

    /**
     * @dev 사용자 스테이킹 정보 조회
     */
    function getUserStakes(address _user) 
        external 
        view 
        returns (
            uint256[] memory stakeIds,
            uint256[] memory amounts,
            uint256[] memory rewards,
            uint256[] memory unlockTimes,
            bool[] memory activeStatus
        ) 
    {
        uint256[] memory ids = userStakeIds[_user];
        uint256 length = ids.length;
        
        stakeIds = new uint256[](length);
        amounts = new uint256[](length);
        rewards = new uint256[](length);
        unlockTimes = new uint256[](length);
        activeStatus = new bool[](length);
        
        for (uint i = 0; i < length; i++) {
            uint256 stakeId = ids[i];
            Stake storage stake = userStakes[_user][stakeId];
            
            stakeIds[i] = stakeId;
            amounts[i] = stake.amount;
            rewards[i] = calculateReward(_user, stakeId);
            unlockTimes[i] = stake.unlockTime;
            activeStatus[i] = stake.active;
        }
        
        return (stakeIds, amounts, rewards, unlockTimes, activeStatus);
    }

    /**
     * @dev 풀 통계 조회
     */
    function getPoolStatistics() 
        external 
        view 
        returns (
            uint256 totalUsers,
            uint256 totalValueLocked,
            uint256 totalRewardsPaid,
            uint256 averageAPY,
            uint256 vxcStaked,
            uint256 ptxStaked
        ) 
    {
        return (
            poolStats.totalUsers,
            poolStats.totalValueLocked,
            poolStats.totalRewardsPaid,
            poolStats.averageAPY,
            poolConfigs[address(vxcToken)].totalStaked,
            poolConfigs[address(ptxToken)].totalStaked
        );
    }

    /**
     * @dev 비상 출금 (관리자 전용)
     */
    function emergencyWithdraw(address _token, uint256 _amount) 
        external 
        onlyOwner 
        whenPaused 
    {
        IERC20(_token).transfer(owner(), _amount);
    }

    /**
     * @dev 버전 정보
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
