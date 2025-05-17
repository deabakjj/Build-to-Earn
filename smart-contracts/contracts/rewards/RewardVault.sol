// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../security/SecurityModule.sol";

/**
 * @title RewardVault
 * @dev 중앙화된 보상 분배 시스템
 * 
 * Features:
 * - 다양한 보상 타입 지원
 * - 동적 인플레이션 조절
 * - 일일/주간/월간 보상 한도
 * - 안티-봇 보호 시스템
 * - 자동 보상 계산 및 분배
 */
contract RewardVault is Ownable, SecurityModule, ReentrancyGuard {
    using SafeMath for uint256;

    // Tokens
    IERC20 public vxcToken;
    IERC20 public ptxToken;

    // Reward types
    enum RewardType {
        Quest,           // 퀘스트 완료
        Exploration,     // 탐험 보상
        Creation,        // 창작 보상
        Social,          // 소셜 활동
        Season,          // 시즌 보상
        Staking,         // 스테이킹 보상
        Referral,        // 추천 보상
        Participation,   // 참여 보상
        Achievement,     // 업적 보상
        Event            // 이벤트 보상
    }

    // Reward pool configuration
    struct RewardPool {
        uint256 totalRewards;        // 총 보상량
        uint256 dailyLimit;         // 일일 한도
        uint256 weeklyLimit;        // 주간 한도
        uint256 monthlyLimit;       // 월간 한도
        uint256 distributedDaily;   // 오늘 분배량
        uint256 distributedWeekly;  // 이번 주 분배량
        uint256 distributedMonthly; // 이번 달 분배량
        uint256 lastDistribution;   // 마지막 분배 시간
        uint256 lastDayReset;       // 일일 리셋 시간
        uint256 lastWeekReset;      // 주간 리셋 시간
        uint256 lastMonthReset;     // 월간 리셋 시간
        bool active;                // 활성화 상태
        uint256 multiplier;         // 보상 배수 (100 = 1x)
    }

    // User reward tracking
    struct UserRewards {
        uint256 totalEarned;        // 총 획득 보상
        uint256 dailyEarned;        // 오늘 획득량
        uint256 weeklyEarned;       // 이번 주 획득량
        uint256 monthlyEarned;      // 이번 달 획득량
        uint256 lastDaily;          // 마지막 일일 리셋
        uint256 lastWeekly;         // 마지막 주간 리셋
        uint256 lastMonthly;        // 마지막 월간 리셋
        uint256 pendingRewards;     // 대기 중 보상
        mapping(RewardType => uint256) typeEarned;
    }

    // Reward parameters for each type
    struct RewardParams {
        uint256 baseReward;         // 기본 보상량
        uint256 maxReward;          // 최대 보상량
        uint256 dailyUserLimit;     // 사용자별 일일 한도
        uint256 cooldown;           // 쿨다운 시간
        bool active;                // 활성화 상태
        uint256 difficultyMultiplier; // 난이도 배수
    }

    // Multiplier events
    enum MultiplierEvent {
        SeasonBonus,     // 시즌 보너스
        SpecialEvent,    // 특별 이벤트
        AchievementBonus, // 업적 보너스
        StreakBonus,     // 연속 보너스
        RarityBonus,     // 희귀도 보너스
        GroupBonus       // 그룹 활동 보너스
    }

    // Storage
    mapping(RewardType => RewardPool) public rewardPools;
    mapping(address => UserRewards) public userRewards;
    mapping(RewardType => RewardParams) public rewardParams;
    mapping(address => mapping(RewardType => uint256)) public userCooldowns;
    mapping(MultiplierEvent => uint256) public globalMultipliers;

    // Anti-bot protection
    mapping(address => uint256) public lastRewardTime;
    mapping(address => uint256) public suspiciousActivityCount;
    mapping(address => bool) public blacklistedUsers;

    // Calculation constants
    uint256 public constant MAX_MULTIPLIER = 500; // Max 5x multiplier
    uint256 public constant BASE_UNIT = 100;      // Base multiplier unit
    uint256 public constant DAY_SECONDS = 86400;  // Seconds in a day
    uint256 public constant WEEK_SECONDS = 604800; // Seconds in a week
    uint256 public constant MONTH_SECONDS = 2592000; // Seconds in a month

    // Events
    event RewardDistributed(
        address indexed user,
        RewardType rewardType,
        uint256 amount,
        uint256 multiplier,
        bytes32 indexed txHash
    );

    event RewardPoolUpdated(
        RewardType indexed rewardType,
        uint256 newTotalRewards,
        uint256 newDailyLimit
    );

    event MultiplierUpdated(
        MultiplierEvent indexed event_,
        uint256 newMultiplier
    );

    event SuspiciousActivityDetected(
        address indexed user,
        string reason,
        uint256 timestamp
    );

    event UserBlacklisted(address indexed user, bool status);

    event EmergencyWithdrawal(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // Modifiers
    modifier notBlacklisted() {
        require(!blacklistedUsers[msg.sender], "User blacklisted");
        _;
    }

    modifier validRewardType(RewardType _type) {
        require(_type <= RewardType.Event, "Invalid reward type");
        _;
    }

    modifier activePool(RewardType _type) {
        require(rewardPools[_type].active, "Reward pool not active");
        _;
    }

    // Constructor
    constructor(address _vxcToken, address _ptxToken) {
        vxcToken = IERC20(_vxcToken);
        ptxToken = IERC20(_ptxToken);
        
        // Initialize default parameters
        initializeRewardPools();
        initializeGlobalMultipliers();
    }

    /**
     * @dev 보상 풀 초기화
     */
    function initializeRewardPools() private {
        // Quest rewards
        rewardPools[RewardType.Quest] = RewardPool({
            totalRewards: 10000000 * 10**18,  // 10M VXC
            dailyLimit: 100000 * 10**18,      // 100K VXC per day
            weeklyLimit: 600000 * 10**18,     // 600K VXC per week
            monthlyLimit: 2000000 * 10**18,   // 2M VXC per month
            distributedDaily: 0,
            distributedWeekly: 0,
            distributedMonthly: 0,
            lastDistribution: block.timestamp,
            lastDayReset: block.timestamp,
            lastWeekReset: block.timestamp,
            lastMonthReset: block.timestamp,
            active: true,
            multiplier: 100
        });

        rewardParams[RewardType.Quest] = RewardParams({
            baseReward: 10 * 10**18,      // 10 VXC base
            maxReward: 1000 * 10**18,     // 1000 VXC max
            dailyUserLimit: 100 * 10**18, // 100 VXC per user per day
            cooldown: 300,                // 5 minutes cooldown
            active: true,
            difficultyMultiplier: 100
        });

        // Creation rewards
        rewardPools[RewardType.Creation] = RewardPool({
            totalRewards: 20000000 * 10**18,
            dailyLimit: 200000 * 10**18,
            weeklyLimit: 1200000 * 10**18,
            monthlyLimit: 4000000 * 10**18,
            distributedDaily: 0,
            distributedWeekly: 0,
            distributedMonthly: 0,
            lastDistribution: block.timestamp,
            lastDayReset: block.timestamp,
            lastWeekReset: block.timestamp,
            lastMonthReset: block.timestamp,
            active: true,
            multiplier: 100
        });

        rewardParams[RewardType.Creation] = RewardParams({
            baseReward: 50 * 10**18,
            maxReward: 5000 * 10**18,
            dailyUserLimit: 500 * 10**18,
            cooldown: 600,
            active: true,
            difficultyMultiplier: 100
        });

        // Social rewards
        rewardPools[RewardType.Social] = RewardPool({
            totalRewards: 5000000 * 10**18,
            dailyLimit: 50000 * 10**18,
            weeklyLimit: 300000 * 10**18,
            monthlyLimit: 1000000 * 10**18,
            distributedDaily: 0,
            distributedWeekly: 0,
            distributedMonthly: 0,
            lastDistribution: block.timestamp,
            lastDayReset: block.timestamp,
            lastWeekReset: block.timestamp,
            lastMonthReset: block.timestamp,
            active: true,
            multiplier: 100
        });

        rewardParams[RewardType.Social] = RewardParams({
            baseReward: 5 * 10**18,
            maxReward: 100 * 10**18,
            dailyUserLimit: 50 * 10**18,
            cooldown: 3600, // 1 hour
            active: true,
            difficultyMultiplier: 100
        });

        // Season rewards
        rewardPools[RewardType.Season] = RewardPool({
            totalRewards: 15000000 * 10**18,
            dailyLimit: 150000 * 10**18,
            weeklyLimit: 900000 * 10**18,
            monthlyLimit: 3000000 * 10**18,
            distributedDaily: 0,
            distributedWeekly: 0,
            distributedMonthly: 0,
            lastDistribution: block.timestamp,
            lastDayReset: block.timestamp,
            lastWeekReset: block.timestamp,
            lastMonthReset: block.timestamp,
            active: false, // Activated during seasons
            multiplier: 100
        });

        rewardParams[RewardType.Season] = RewardParams({
            baseReward: 100 * 10**18,
            maxReward: 10000 * 10**18,
            dailyUserLimit: 1000 * 10**18,
            cooldown: 86400, // 24 hours
            active: false,
            difficultyMultiplier: 100
        });
    }

    /**
     * @dev 글로벌 멀티플라이어 초기화
     */
    function initializeGlobalMultipliers() private {
        globalMultipliers[MultiplierEvent.SeasonBonus] = 120;      // 1.2x
        globalMultipliers[MultiplierEvent.SpecialEvent] = 150;     // 1.5x
        globalMultipliers[MultiplierEvent.AchievementBonus] = 110; // 1.1x
        globalMultipliers[MultiplierEvent.StreakBonus] = 130;      // 1.3x
        globalMultipliers[MultiplierEvent.RarityBonus] = 200;      // 2.0x
        globalMultipliers[MultiplierEvent.GroupBonus] = 115;       // 1.15x
    }

    /**
     * @dev 보상 분배 메인 함수
     */
    function distributeReward(
        address _user,
        RewardType _type,
        uint256 _baseAmount,
        uint256 _difficulty,
        MultiplierEvent[] memory _multipliers,
        bytes32 _txHash
    ) 
        external 
        onlyOwner 
        nonReentrant 
        notBlacklisted 
        whenNotPaused 
        validRewardType(_type) 
        activePool(_type) 
        returns (uint256) 
    {
        require(_user != address(0), "Invalid user address");
        require(_baseAmount > 0, "Amount must be positive");
        
        // Anti-bot protection
        if (!validateUserActivity(_user, _type)) {
            markSuspiciousActivity(_user, "Unusual reward pattern");
            return 0;
        }

        // Update pool timers
        updatePoolTimers(_type);
        updateUserTimers(_user);

        // Calculate final reward
        uint256 finalReward = calculateReward(_user, _type, _baseAmount, _difficulty, _multipliers);

        // Check limits
        if (!checkLimits(_user, _type, finalReward)) {
            return 0;
        }

        // Distribute reward
        bool success = executeRewardDistribution(_user, _type, finalReward);
        
        if (success) {
            updateStatistics(_user, _type, finalReward);
            emit RewardDistributed(_user, _type, finalReward, calculateTotalMultiplier(_type, _multipliers), _txHash);
            return finalReward;
        }

        return 0;
    }

    /**
     * @dev 보상 계산
     */
    function calculateReward(
        address _user,
        RewardType _type,
        uint256 _baseAmount,
        uint256 _difficulty,
        MultiplierEvent[] memory _multipliers
    ) public view returns (uint256) {
        RewardParams memory params = rewardParams[_type];
        
        // Base calculation
        uint256 reward = _baseAmount.mul(params.baseReward).div(10**18);
        
        // Apply difficulty multiplier
        if (_difficulty > 0) {
            reward = reward.mul(_difficulty.add(100)).div(100);
        }
        
        // Apply reward type multiplier
        reward = reward.mul(rewardPools[_type].multiplier).div(BASE_UNIT);
        
        // Apply global multipliers
        for (uint i = 0; i < _multipliers.length; i++) {
            uint256 multiplier = globalMultipliers[_multipliers[i]];
            if (multiplier > 0) {
                reward = reward.mul(multiplier).div(BASE_UNIT);
            }
        }
        
        // Cap at max reward
        if (reward > params.maxReward) {
            reward = params.maxReward;
        }
        
        return reward;
    }

    /**
     * @dev 한도 체크
     */
    function checkLimits(address _user, RewardType _type, uint256 _amount) 
        private 
        view 
        returns (bool) 
    {
        RewardPool storage pool = rewardPools[_type];
        UserRewards storage user = userRewards[_user];
        RewardParams memory params = rewardParams[_type];
        
        // Pool limits
        if (pool.distributedDaily.add(_amount) > pool.dailyLimit) return false;
        if (pool.distributedWeekly.add(_amount) > pool.weeklyLimit) return false;
        if (pool.distributedMonthly.add(_amount) > pool.monthlyLimit) return false;
        
        // User limits
        if (user.dailyEarned.add(_amount) > params.dailyUserLimit) return false;
        
        // Cooldown check
        if (block.timestamp < userCooldowns[_user][_type]) return false;
        
        return true;
    }

    /**
     * @dev 보상 실행
     */
    function executeRewardDistribution(address _user, RewardType _type, uint256 _amount) 
        private 
        returns (bool) 
    {
        // Check token balance
        if (vxcToken.balanceOf(address(this)) < _amount) {
            return false;
        }
        
        // Transfer tokens
        bool success = vxcToken.transfer(_user, _amount);
        
        if (success) {
            // Update cooldown
            userCooldowns[_user][_type] = block.timestamp.add(rewardParams[_type].cooldown);
        }
        
        return success;
    }

    /**
     * @dev 통계 업데이트
     */
    function updateStatistics(address _user, RewardType _type, uint256 _amount) 
        private 
    {
        RewardPool storage pool = rewardPools[_type];
        UserRewards storage user = userRewards[_user];
        
        // Update pool statistics
        pool.distributedDaily = pool.distributedDaily.add(_amount);
        pool.distributedWeekly = pool.distributedWeekly.add(_amount);
        pool.distributedMonthly = pool.distributedMonthly.add(_amount);
        pool.lastDistribution = block.timestamp;
        
        // Update user statistics
        user.totalEarned = user.totalEarned.add(_amount);
        user.dailyEarned = user.dailyEarned.add(_amount);
        user.weeklyEarned = user.weeklyEarned.add(_amount);
        user.monthlyEarned = user.monthlyEarned.add(_amount);
        user.typeEarned[_type] = user.typeEarned[_type].add(_amount);
    }

    /**
     * @dev 풀 타이머 업데이트
     */
    function updatePoolTimers(RewardType _type) private {
        RewardPool storage pool = rewardPools[_type];
        
        // Daily reset
        if (block.timestamp >= pool.lastDayReset.add(DAY_SECONDS)) {
            pool.distributedDaily = 0;
            pool.lastDayReset = block.timestamp;
        }
        
        // Weekly reset
        if (block.timestamp >= pool.lastWeekReset.add(WEEK_SECONDS)) {
            pool.distributedWeekly = 0;
            pool.lastWeekReset = block.timestamp;
        }
        
        // Monthly reset
        if (block.timestamp >= pool.lastMonthReset.add(MONTH_SECONDS)) {
            pool.distributedMonthly = 0;
            pool.lastMonthReset = block.timestamp;
        }
    }

    /**
     * @dev 사용자 타이머 업데이트
     */
    function updateUserTimers(address _user) private {
        UserRewards storage user = userRewards[_user];
        
        // Daily reset
        if (block.timestamp >= user.lastDaily.add(DAY_SECONDS)) {
            user.dailyEarned = 0;
            user.lastDaily = block.timestamp;
        }
        
        // Weekly reset
        if (block.timestamp >= user.lastWeekly.add(WEEK_SECONDS)) {
            user.weeklyEarned = 0;
            user.lastWeekly = block.timestamp;
        }
        
        // Monthly reset
        if (block.timestamp >= user.lastMonthly.add(MONTH_SECONDS)) {
            user.monthlyEarned = 0;
            user.lastMonthly = block.timestamp;
        }
    }

    /**
     * @dev 사용자 활동 검증
     */
    function validateUserActivity(address _user, RewardType _type) 
        private 
        view 
        returns (bool) 
    {
        // Check for suspicious patterns
        uint256 lastTime = lastRewardTime[_user];
        
        // Too frequent requests
        if (block.timestamp.sub(lastTime) < 10) {
            return false;
        }
        
        // Check for excessive requests
        if (suspiciousActivityCount[_user] > 10) {
            return false;
        }
        
        // Check blacklist
        if (blacklistedUsers[_user]) {
            return false;
        }
        
        return true;
    }

    /**
     * @dev 의심스러운 활동 마킹
     */
    function markSuspiciousActivity(address _user, string memory _reason) 
        private 
    {
        suspiciousActivityCount[_user] = suspiciousActivityCount[_user].add(1);
        
        if (suspiciousActivityCount[_user] > 50) {
            blacklistedUsers[_user] = true;
            emit UserBlacklisted(_user, true);
        }
        
        emit SuspiciousActivityDetected(_user, _reason, block.timestamp);
    }

    /**
     * @dev 총 멀티플라이어 계산
     */
    function calculateTotalMultiplier(RewardType _type, MultiplierEvent[] memory _multipliers) 
        public 
        view 
        returns (uint256) 
    {
        uint256 totalMultiplier = rewardPools[_type].multiplier;
        
        for (uint i = 0; i < _multipliers.length; i++) {
            uint256 multiplier = globalMultipliers[_multipliers[i]];
            if (multiplier > 0) {
                totalMultiplier = totalMultiplier.mul(multiplier).div(BASE_UNIT);
            }
        }
        
        if (totalMultiplier > MAX_MULTIPLIER) {
            totalMultiplier = MAX_MULTIPLIER;
        }
        
        return totalMultiplier;
    }

    /**
     * @dev 보상 풀 설정 업데이트
     */
    function updateRewardPool(
        RewardType _type,
        uint256 _totalRewards,
        uint256 _dailyLimit,
        uint256 _weeklyLimit,
        uint256 _monthlyLimit,
        uint256 _multiplier,
        bool _active
    ) external onlyOwner validRewardType(_type) {
        RewardPool storage pool = rewardPools[_type];
        
        pool.totalRewards = _totalRewards;
        pool.dailyLimit = _dailyLimit;
        pool.weeklyLimit = _weeklyLimit;
        pool.monthlyLimit = _monthlyLimit;
        pool.multiplier = _multiplier;
        pool.active = _active;
        
        emit RewardPoolUpdated(_type, _totalRewards, _dailyLimit);
    }

    /**
     * @dev 보상 파라미터 업데이트
     */
    function updateRewardParams(
        RewardType _type,
        uint256 _baseReward,
        uint256 _maxReward,
        uint256 _dailyUserLimit,
        uint256 _cooldown,
        bool _active
    ) external onlyOwner validRewardType(_type) {
        RewardParams storage params = rewardParams[_type];
        
        params.baseReward = _baseReward;
        params.maxReward = _maxReward;
        params.dailyUserLimit = _dailyUserLimit;
        params.cooldown = _cooldown;
        params.active = _active;
    }

    /**
     * @dev 글로벌 멀티플라이어 업데이트
     */
    function updateGlobalMultiplier(MultiplierEvent _event, uint256 _multiplier) 
        external 
        onlyOwner 
    {
        require(_multiplier <= MAX_MULTIPLIER, "Multiplier exceeds maximum");
        globalMultipliers[_event] = _multiplier;
        emit MultiplierUpdated(_event, _multiplier);
    }

    /**
     * @dev 사용자 블랙리스트 관리
     */
    function setBlacklist(address _user, bool _status) external onlyOwner {
        blacklistedUsers[_user] = _status;
        emit UserBlacklisted(_user, _status);
    }

    /**
     * @dev 보상 풀 입금
     */
    function depositRewards(uint256 _amount) external {
        require(_amount > 0, "Amount must be positive");
        require(vxcToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
    }

    /**
     * @dev 비상 출금
     */
    function emergencyWithdraw(address _token, address _to, uint256 _amount) 
        external 
        onlyOwner 
        whenPaused 
    {
        require(_to != address(0), "Invalid recipient");
        
        if (_token == address(0)) {
            // Withdraw ETH
            payable(_to).transfer(_amount);
        } else {
            // Withdraw tokens
            IERC20(_token).transfer(_to, _amount);
        }
        
        emit EmergencyWithdrawal(_token, _to, _amount);
    }

    /**
     * @dev 사용자 보상 정보 조회
     */
    function getUserRewardInfo(address _user) 
        external 
        view 
        returns (
            uint256 totalEarned,
            uint256 dailyEarned,
            uint256 weeklyEarned,
            uint256 monthlyEarned,
            uint256 pendingRewards
        ) 
    {
        UserRewards storage user = userRewards[_user];
        
        // Update timers (view function)
        uint256 currentTotal = user.totalEarned;
        uint256 currentDaily = user.dailyEarned;
        uint256 currentWeekly = user.weeklyEarned;
        uint256 currentMonthly = user.monthlyEarned;
        
        if (block.timestamp >= user.lastDaily.add(DAY_SECONDS)) {
            currentDaily = 0;
        }
        if (block.timestamp >= user.lastWeekly.add(WEEK_SECONDS)) {
            currentWeekly = 0;
        }
        if (block.timestamp >= user.lastMonthly.add(MONTH_SECONDS)) {
            currentMonthly = 0;
        }
        
        return (
            currentTotal,
            currentDaily,
            currentWeekly,
            currentMonthly,
            user.pendingRewards
        );
    }

    /**
     * @dev 보상 풀 상태 조회
     */
    function getPoolStatus(RewardType _type) 
        external 
        view 
        validRewardType(_type) 
        returns (
            uint256 totalRewards,
            uint256 remainingRewards,
            uint256 dailyLimit,
            uint256 distributedDaily,
            uint256 weeklyLimit,
            uint256 distributedWeekly,
            uint256 monthlyLimit,
            uint256 distributedMonthly,
            bool active,
            uint256 multiplier
        ) 
    {
        RewardPool storage pool = rewardPools[_type];
        
        uint256 currentDaily = pool.distributedDaily;
        uint256 currentWeekly = pool.distributedWeekly;
        uint256 currentMonthly = pool.distributedMonthly;
        
        // Update for current time (view function)
        if (block.timestamp >= pool.lastDayReset.add(DAY_SECONDS)) {
            currentDaily = 0;
        }
        if (block.timestamp >= pool.lastWeekReset.add(WEEK_SECONDS)) {
            currentWeekly = 0;
        }
        if (block.timestamp >= pool.lastMonthReset.add(MONTH_SECONDS)) {
            currentMonthly = 0;
        }
        
        uint256 totalDistributed = currentMonthly;
        uint256 remaining = pool.totalRewards > totalDistributed 
            ? pool.totalRewards.sub(totalDistributed) 
            : 0;
        
        return (
            pool.totalRewards,
            remaining,
            pool.dailyLimit,
            currentDaily,
            pool.weeklyLimit,
            currentWeekly,
            pool.monthlyLimit,
            currentMonthly,
            pool.active,
            pool.multiplier
        );
    }

    /**
     * @dev 버전 정보
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    /**
     * @dev 이더 수신 허용
     */
    receive() external payable {}
}
