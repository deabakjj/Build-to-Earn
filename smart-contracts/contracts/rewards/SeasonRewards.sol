// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../security/SecurityModule.sol";

/**
 * @title SeasonRewards
 * @dev 시즌별 보상 관리 시스템
 * 
 * Features:
 * - 시즌별 고유 보상 구조
 * - 활동 기반 포인트 시스템
 * - 리더보드 및 랭킹 시스템
 * - 시즌 종료 시 자동 정산
 * - NFT 보상 연동
 * - 특별 이벤트 보상
 */
contract SeasonRewards is Ownable, SecurityModule, ReentrancyGuard {
    using SafeMath for uint256;

    // Tokens and NFTs
    IERC20 public vxcToken;
    IERC20 public ptxToken;

    // Season information
    struct Season {
        uint256 id;
        string name;
        string theme;
        uint256 startTime;
        uint256 endTime;
        uint256 totalRewardPool;
        uint256 passPrice;            // 시즌 패스 가격
        uint256 maxParticipants;      // 최대 참가자 수
        bool active;
        bool finalized;               // 정산 완료 여부
        mapping(address => UserSeason) participants;
        address[] participantAddresses;
        mapping(string => uint256) milestoneRewards;  // 마일스톤 보상
        mapping(uint256 => RankReward) rankRewards;    // 순위 보상
    }

    // User season data
    struct UserSeason {
        uint256 totalPoints;          // 총 포인트
        uint256 passLevel;            // 패스 레벨
        uint256 premiumPassLevel;     // 프리미엄 패스 레벨
        uint256 rewardsClaimed;       // 청구한 보상
        uint256 lastActivity;         // 마지막 활동 시간
        bool hasPremiumPass;          // 프리미엄 패스 보유
        bool hasSeasonPass;           // 시즌 패스 보유
        mapping(string => bool) milestonesCompleted;
        mapping(string => uint256) activityPoints;
        uint256 finalRank;            // 최종 순위
    }

    // Activity types
    enum ActivityType {
        Creation,          // 창작 활동
        Trading,          // 거래 활동
        Social,           // 소셜 활동
        Exploration,      // 탐험 활동
        Event,            // 이벤트 참여
        Challenge,        // 챌린지 완료
        Guild,            // 길드 활동
        Achievement       // 업적 달성
    }

    // Activity configuration
    struct ActivityConfig {
        uint256 basePoints;
        uint256 maxPoints;
        uint256 multiplier;
        uint256 cooldown;
        bool active;
        uint256 dailyLimit;
        uint256 weeklyLimit;
    }

    // Rank rewards
    struct RankReward {
        uint256 tokenReward;
        uint256 nftReward;            // NFT ID or count
        string specialReward;         // 특별 보상 설명
        uint256 tierBonus;            // 티어 보너스
    }

    // Season pass rewards
    struct PassReward {
        uint256 level;
        uint256 freeReward;
        uint256 premiumReward;
        address nftAddress;
        uint256 nftId;
        string description;
    }

    // Current season
    uint256 public currentSeasonId;
    mapping(uint256 => Season) public seasons;

    // Activity configurations
    mapping(ActivityType => ActivityConfig) public activityConfigs;

    // Pass rewards
    mapping(uint256 => mapping(uint256 => PassReward)) public passRewards; // season => level => reward

    // Points calculation parameters
    uint256 public constant POINTS_DECIMALS = 1e18;
    uint256 public constant MAX_LEVEL = 100;
    uint256 public constant POINTS_PER_LEVEL = 1000 * POINTS_DECIMALS;

    // Milestones
    mapping(uint256 => mapping(string => uint256)) public seasonMilestones; // season => milestone => required points

    // Events
    event SeasonCreated(
        uint256 indexed seasonId,
        string name,
        uint256 startTime,
        uint256 endTime,
        uint256 rewardPool
    );

    event PointsEarned(
        address indexed user,
        uint256 indexed seasonId,
        ActivityType activity,
        uint256 points,
        uint256 totalPoints
    );

    event PassPurchased(
        address indexed user,
        uint256 indexed seasonId,
        bool premium,
        uint256 price
    );

    event RewardClaimed(
        address indexed user,
        uint256 indexed seasonId,
        uint256 level,
        uint256 amount,
        bool premium
    );

    event SeasonFinalized(
        uint256 indexed seasonId,
        address topPlayer,
        uint256 totalParticipants,
        uint256 totalRewards
    );

    event MilestoneCompleted(
        address indexed user,
        uint256 indexed seasonId,
        string milestone,
        uint256 reward
    );

    // Constructor
    constructor(address _vxcToken, address _ptxToken) {
        vxcToken = IERC20(_vxcToken);
        ptxToken = IERC20(_ptxToken);
        
        // Initialize activity configurations
        initializeActivityConfigs();
    }

    /**
     * @dev 활동 설정 초기화
     */
    function initializeActivityConfigs() private {
        activityConfigs[ActivityType.Creation] = ActivityConfig({
            basePoints: 50 * POINTS_DECIMALS,
            maxPoints: 1000 * POINTS_DECIMALS,
            multiplier: 100,
            cooldown: 300,
            active: true,
            dailyLimit: 5000 * POINTS_DECIMALS,
            weeklyLimit: 25000 * POINTS_DECIMALS
        });

        activityConfigs[ActivityType.Trading] = ActivityConfig({
            basePoints: 10 * POINTS_DECIMALS,
            maxPoints: 500 * POINTS_DECIMALS,
            multiplier: 100,
            cooldown: 60,
            active: true,
            dailyLimit: 2000 * POINTS_DECIMALS,
            weeklyLimit: 10000 * POINTS_DECIMALS
        });

        activityConfigs[ActivityType.Social] = ActivityConfig({
            basePoints: 5 * POINTS_DECIMALS,
            maxPoints: 100 * POINTS_DECIMALS,
            multiplier: 100,
            cooldown: 600,
            active: true,
            dailyLimit: 500 * POINTS_DECIMALS,
            weeklyLimit: 2500 * POINTS_DECIMALS
        });

        activityConfigs[ActivityType.Exploration] = ActivityConfig({
            basePoints: 20 * POINTS_DECIMALS,
            maxPoints: 500 * POINTS_DECIMALS,
            multiplier: 100,
            cooldown: 1800,
            active: true,
            dailyLimit: 2000 * POINTS_DECIMALS,
            weeklyLimit: 10000 * POINTS_DECIMALS
        });

        activityConfigs[ActivityType.Event] = ActivityConfig({
            basePoints: 100 * POINTS_DECIMALS,
            maxPoints: 2000 * POINTS_DECIMALS,
            multiplier: 100,
            cooldown: 3600,
            active: true,
            dailyLimit: 10000 * POINTS_DECIMALS,
            weeklyLimit: 50000 * POINTS_DECIMALS
        });

        activityConfigs[ActivityType.Challenge] = ActivityConfig({
            basePoints: 150 * POINTS_DECIMALS,
            maxPoints: 3000 * POINTS_DECIMALS,
            multiplier: 100,
            cooldown: 86400, // 24 hours
            active: true,
            dailyLimit: 15000 * POINTS_DECIMALS,
            weeklyLimit: 75000 * POINTS_DECIMALS
        });

        activityConfigs[ActivityType.Guild] = ActivityConfig({
            basePoints: 80 * POINTS_DECIMALS,
            maxPoints: 1500 * POINTS_DECIMALS,
            multiplier: 100,
            cooldown: 3600,
            active: true,
            dailyLimit: 8000 * POINTS_DECIMALS,
            weeklyLimit: 40000 * POINTS_DECIMALS
        });

        activityConfigs[ActivityType.Achievement] = ActivityConfig({
            basePoints: 200 * POINTS_DECIMALS,
            maxPoints: 5000 * POINTS_DECIMALS,
            multiplier: 100,
            cooldown: 0, // No cooldown for achievements
            active: true,
            dailyLimit: 50000 * POINTS_DECIMALS,
            weeklyLimit: 250000 * POINTS_DECIMALS
        });
    }

    /**
     * @dev 새로운 시즌 생성
     */
    function createSeason(
        string memory _name,
        string memory _theme,
        uint256 _duration,
        uint256 _rewardPool,
        uint256 _passPrice,
        uint256 _maxParticipants
    ) external onlyOwner returns (uint256) {
        currentSeasonId++;
        uint256 seasonId = currentSeasonId;
        
        Season storage season = seasons[seasonId];
        season.id = seasonId;
        season.name = _name;
        season.theme = _theme;
        season.startTime = block.timestamp;
        season.endTime = block.timestamp.add(_duration);
        season.totalRewardPool = _rewardPool;
        season.passPrice = _passPrice;
        season.maxParticipants = _maxParticipants;
        season.active = true;
        season.finalized = false;

        // Initialize milestones
        initializeSeasonMilestones(seasonId);
        
        // Initialize rank rewards
        initializeRankRewards(seasonId);
        
        // Initialize pass rewards
        initializePassRewards(seasonId);

        emit SeasonCreated(seasonId, _name, block.timestamp, season.endTime, _rewardPool);
        return seasonId;
    }

    /**
     * @dev 시즌 마일스톤 초기화
     */
    function initializeSeasonMilestones(uint256 _seasonId) private {
        seasonMilestones[_seasonId]["FirstSteps"] = 1000 * POINTS_DECIMALS;
        seasonMilestones[_seasonId]["Explorer"] = 5000 * POINTS_DECIMALS;
        seasonMilestones[_seasonId]["Creator"] = 10000 * POINTS_DECIMALS;
        seasonMilestones[_seasonId]["Trader"] = 20000 * POINTS_DECIMALS;
        seasonMilestones[_seasonId]["Master"] = 50000 * POINTS_DECIMALS;
        seasonMilestones[_seasonId]["Legend"] = 100000 * POINTS_DECIMALS;
        
        // Set milestone rewards
        seasons[_seasonId].milestoneRewards["FirstSteps"] = 100 * 10**18;    // 100 VXC
        seasons[_seasonId].milestoneRewards["Explorer"] = 500 * 10**18;       // 500 VXC
        seasons[_seasonId].milestoneRewards["Creator"] = 1000 * 10**18;       // 1000 VXC
        seasons[_seasonId].milestoneRewards["Trader"] = 2000 * 10**18;        // 2000 VXC
        seasons[_seasonId].milestoneRewards["Master"] = 5000 * 10**18;        // 5000 VXC
        seasons[_seasonId].milestoneRewards["Legend"] = 10000 * 10**18;       // 10000 VXC
    }

    /**
     * @dev 순위 보상 초기화
     */
    function initializeRankRewards(uint256 _seasonId) private {
        // Top 1
        seasons[_seasonId].rankRewards[1] = RankReward({
            tokenReward: 50000 * 10**18,      // 50,000 VXC
            nftReward: 1,                     // 1 Special NFT
            specialReward: "Champion Crown",   // Special item
            tierBonus: 200                    // 2x bonus
        });

        // Top 2-3
        seasons[_seasonId].rankRewards[2] = RankReward({
            tokenReward: 30000 * 10**18,
            nftReward: 1,
            specialReward: "Silver Crown",
            tierBonus: 150
        });

        // Top 4-10
        seasons[_seasonId].rankRewards[10] = RankReward({
            tokenReward: 10000 * 10**18,
            nftReward: 0,
            specialReward: "Bronze Medal",
            tierBonus: 120
        });

        // Top 11-50
        seasons[_seasonId].rankRewards[50] = RankReward({
            tokenReward: 5000 * 10**18,
            nftReward: 0,
            specialReward: "Participant Badge",
            tierBonus: 110
        });

        // Top 51-100
        seasons[_seasonId].rankRewards[100] = RankReward({
            tokenReward: 1000 * 10**18,
            nftReward: 0,
            specialReward: "Season Participation",
            tierBonus: 105
        });
    }

    /**
     * @dev 시즌 패스 보상 초기화
     */
    function initializePassRewards(uint256 _seasonId) private {
        for (uint256 level = 1; level <= MAX_LEVEL; level++) {
            PassReward memory reward = PassReward({
                level: level,
                freeReward: level * 10 * 10**18,           // 10*level VXC
                premiumReward: level * 20 * 10**18,        // 20*level VXC
                nftAddress: address(0),                    // NFT for special levels
                nftId: level % 10 == 0 ? level / 10 : 0,  // NFT every 10 levels
                description: level % 10 == 0 ? "Special NFT Reward" : "Token Reward"
            });
            
            passRewards[_seasonId][level] = reward;
        }
    }

    /**
     * @dev 시즌 패스 구매
     */
    function purchaseSeasonPass(bool _premium) external nonReentrant whenNotPaused {
        require(currentSeasonId > 0, "No active season");
        require(seasons[currentSeasonId].active, "Season not active");
        require(block.timestamp < seasons[currentSeasonId].endTime, "Season ended");
        
        Season storage season = seasons[currentSeasonId];
        UserSeason storage user = season.participants[msg.sender];
        
        if (_premium) {
            require(!user.hasPremiumPass, "Already have premium pass");
            uint256 premiumPrice = season.passPrice.mul(3); // 3x for premium
            vxcToken.transferFrom(msg.sender, address(this), premiumPrice);
            user.hasPremiumPass = true;
            emit PassPurchased(msg.sender, currentSeasonId, true, premiumPrice);
        } else {
            require(!user.hasSeasonPass, "Already have season pass");
            vxcToken.transferFrom(msg.sender, address(this), season.passPrice);
            user.hasSeasonPass = true;
            emit PassPurchased(msg.sender, currentSeasonId, false, season.passPrice);
        }

        // If first time joining the season
        if (user.lastActivity == 0) {
            season.participantAddresses.push(msg.sender);
        }
    }

    /**
     * @dev 활동 포인트 기록
     */
    function recordActivity(
        address _user,
        ActivityType _activity,
        uint256 _baseAmount,
        uint256 _multiplier
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(currentSeasonId > 0, "No active season");
        require(seasons[currentSeasonId].active, "Season not active");
        require(block.timestamp < seasons[currentSeasonId].endTime, "Season ended");
        
        Season storage season = seasons[currentSeasonId];
        UserSeason storage user = season.participants[_user];
        ActivityConfig storage config = activityConfigs[_activity];
        
        require(config.active, "Activity not active");
        
        // Calculate points
        uint256 points = calculateActivityPoints(_user, _activity, _baseAmount, _multiplier);
        
        // Check limits
        require(checkActivityLimits(_user, _activity, points), "Activity limit exceeded");
        
        // Add points
        user.totalPoints = user.totalPoints.add(points);
        user.activityPoints[_activity] = user.activityPoints[_activity].add(points);
        user.lastActivity = block.timestamp;
        
        // Update levels
        updatePassLevels(_user);
        
        // Check milestones
        checkMilestones(_user);
        
        emit PointsEarned(_user, currentSeasonId, _activity, points, user.totalPoints);
        
        return points;
    }

    /**
     * @dev 활동 포인트 계산
     */
    function calculateActivityPoints(
        address _user,
        ActivityType _activity,
        uint256 _baseAmount,
        uint256 _multiplier
    ) public view returns (uint256) {
        ActivityConfig storage config = activityConfigs[_activity];
        
        uint256 basePoints = config.basePoints.mul(_baseAmount).div(10**18);
        uint256 multipled = basePoints.mul(_multiplier).div(100);
        
        // Cap at max points
        if (multipled > config.maxPoints) {
            multipled = config.maxPoints;
        }
        
        // Apply premium pass bonus if applicable
        UserSeason storage user = seasons[currentSeasonId].participants[_user];
        if (user.hasPremiumPass) {
            multipled = multipled.mul(120).div(100); // 20% bonus
        }
        
        return multipled;
    }

    /**
     * @dev 활동 한계 체크
     */
    function checkActivityLimits(
        address _user,
        ActivityType _activity,
        uint256 _points
    ) public view returns (bool) {
        ActivityConfig storage config = activityConfigs[_activity];
        UserSeason storage user = seasons[currentSeasonId].participants[_user];
        
        // Check daily limit
        uint256 todayStart = block.timestamp.sub(block.timestamp % 86400);
        uint256 dailyPoints = 0;
        
        // Calculate daily points (simplified - in production would use mapping)
        if (user.lastActivity >= todayStart) {
            dailyPoints = user.activityPoints[_activity].div(7); // Approximate
        }
        
        if (dailyPoints.add(_points) > config.dailyLimit) {
            return false;
        }
        
        // Check cooldown
        // Implementation would require additional tracking
        
        return true;
    }

    /**
     * @dev 패스 레벨 업데이트
     */
    function updatePassLevels(address _user) private {
        UserSeason storage user = seasons[currentSeasonId].participants[_user];
        
        uint256 newLevel = user.totalPoints.div(POINTS_PER_LEVEL);
        if (newLevel > MAX_LEVEL) {
            newLevel = MAX_LEVEL;
        }
        
        if (user.hasSeasonPass && newLevel > user.passLevel) {
            user.passLevel = newLevel;
        }
        
        if (user.hasPremiumPass && newLevel > user.premiumPassLevel) {
            user.premiumPassLevel = newLevel;
        }
    }

    /**
     * @dev 마일스톤 체크
     */
    function checkMilestones(address _user) private {
        Season storage season = seasons[currentSeasonId];
        UserSeason storage user = season.participants[_user];
        
        string[6] memory milestoneNames = ["FirstSteps", "Explorer", "Creator", "Trader", "Master", "Legend"];
        
        for (uint i = 0; i < milestoneNames.length; i++) {
            string memory milestone = milestoneNames[i];
            if (!user.milestonesCompleted[milestone] && 
                user.totalPoints >= seasonMilestones[currentSeasonId][milestone]) {
                
                user.milestonesCompleted[milestone] = true;
                uint256 reward = season.milestoneRewards[milestone];
                
                if (reward > 0) {
                    vxcToken.transfer(_user, reward);
                    emit MilestoneCompleted(_user, currentSeasonId, milestone, reward);
                }
            }
        }
    }

    /**
     * @dev 보상 청구
     */
    function claimRewards(uint256 _level) external nonReentrant whenNotPaused {
        require(currentSeasonId > 0, "No active season");
        Season storage season = seasons[currentSeasonId];
        UserSeason storage user = season.participants[msg.sender];
        
        require(user.hasSeasonPass || user.hasPremiumPass, "No season pass");
        require(_level > 0 && _level <= MAX_LEVEL, "Invalid level");
        
        PassReward storage reward = passRewards[currentSeasonId][_level];
        uint256 claimed = 0;
        
        // Check free rewards
        if (user.hasSeasonPass && _level <= user.passLevel) {
            // Check if already claimed (simplified)
            if ((user.rewardsClaimed & (1 << _level)) == 0) {
                user.rewardsClaimed |= (1 << _level);
                vxcToken.transfer(msg.sender, reward.freeReward);
                claimed = reward.freeReward;
            }
        }
        
        // Check premium rewards
        if (user.hasPremiumPass && _level <= user.premiumPassLevel) {
            // Additional premium claim check
            vxcToken.transfer(msg.sender, reward.premiumReward);
            claimed = claimed.add(reward.premiumReward);
        }
        
        require(claimed > 0, "Nothing to claim");
        emit RewardClaimed(msg.sender, currentSeasonId, _level, claimed, user.hasPremiumPass);
    }

    /**
     * @dev 시즌 종료 처리
     */
    function finalizeSeason() external onlyOwner {
        require(currentSeasonId > 0, "No active season");
        Season storage season = seasons[currentSeasonId];
        require(season.active, "Season not active");
        require(block.timestamp >= season.endTime, "Season not ended");
        require(!season.finalized, "Already finalized");
        
        // Calculate final rankings
        calculateFinalRankings();
        
        // Distribute rank rewards
        distributeRankRewards();
        
        // Mark as finalized
        season.active = false;
        season.finalized = true;
        season.totalRewardPool = 0;
        
        // Find top player
        address topPlayer = address(0);
        uint256 maxPoints = 0;
        
        for (uint i = 0; i < season.participantAddresses.length; i++) {
            address participant = season.participantAddresses[i];
            if (season.participants[participant].totalPoints > maxPoints) {
                maxPoints = season.participants[participant].totalPoints;
                topPlayer = participant;
            }
        }
        
        emit SeasonFinalized(
            currentSeasonId,
            topPlayer,
            season.participantAddresses.length,
            season.totalRewardPool
        );
    }

    /**
     * @dev 최종 순위 계산
     */
    function calculateFinalRankings() private {
        Season storage season = seasons[currentSeasonId];
        
        // Sort participants by points (simplified - real implementation needs off-chain computation)
        // In production, this would be handled off-chain or with a more gas-efficient method
        
        address[] memory participants = season.participantAddresses;
        uint256 length = participants.length;
        
        // Bubble sort (simplified - not gas efficient for large arrays)
        for (uint i = 0; i < length - 1; i++) {
            for (uint j = 0; j < length - i - 1; j++) {
                if (season.participants[participants[j]].totalPoints < 
                    season.participants[participants[j + 1]].totalPoints) {
                    // Swap
                    address temp = participants[j];
                    participants[j] = participants[j + 1];
                    participants[j + 1] = temp;
                }
            }
        }
        
        // Assign final ranks
        for (uint i = 0; i < length; i++) {
            season.participants[participants[i]].finalRank = i + 1;
        }
    }

    /**
     * @dev 순위 보상 분배
     */
    function distributeRankRewards() private {
        Season storage season = seasons[currentSeasonId];
        
        for (uint i = 0; i < season.participantAddresses.length; i++) {
            address participant = season.participantAddresses[i];
            uint256 rank = season.participants[participant].finalRank;
            
            RankReward memory reward;
            
            if (rank == 1) {
                reward = season.rankRewards[1];
            } else if (rank <= 3) {
                reward = season.rankRewards[2];
            } else if (rank <= 10) {
                reward = season.rankRewards[10];
            } else if (rank <= 50) {
                reward = season.rankRewards[50];
            } else if (rank <= 100) {
                reward = season.rankRewards[100];
            } else {
                continue; // No reward for lower ranks
            }
            
            if (reward.tokenReward > 0) {
                vxcToken.transfer(participant, reward.tokenReward);
            }
            
            // NFT rewards would be handled here
            // Special rewards would be marked for later distribution
        }
    }

    /**
     * @dev 사용자 시즌 정보 조회
     */
    function getUserSeasonInfo(address _user, uint256 _seasonId) 
        external 
        view 
        returns (
            uint256 totalPoints,
            uint256 passLevel,
            uint256 premiumPassLevel,
            bool hasSeasonPass,
            bool hasPremiumPass,
            uint256 finalRank,
            uint256 claimableRewards
        ) 
    {
        require(_seasonId <= currentSeasonId, "Invalid season");
        
        Season storage season = seasons[_seasonId];
        UserSeason storage user = season.participants[_user];
        
        // Calculate claimable rewards
        uint256 claimable = 0;
        for (uint level = 1; level <= user.passLevel; level++) {
            if ((user.rewardsClaimed & (1 << level)) == 0) {
                claimable = claimable.add(passRewards[_seasonId][level].freeReward);
            }
        }
        
        if (user.hasPremiumPass) {
            for (uint level = 1; level <= user.premiumPassLevel; level++) {
                claimable = claimable.add(passRewards[_seasonId][level].premiumReward);
            }
        }
        
        return (
            user.totalPoints,
            user.passLevel,
            user.premiumPassLevel,
            user.hasSeasonPass,
            user.hasPremiumPass,
            user.finalRank,
            claimable
        );
    }

    /**
     * @dev 현재 시즌 정보 조회
     */
    function getCurrentSeasonInfo() 
        external 
        view 
        returns (
            uint256 seasonId,
            string memory name,
            string memory theme,
            uint256 startTime,
            uint256 endTime,
            uint256 participantCount,
            bool active
        ) 
    {
        if (currentSeasonId == 0) {
            return (0, "", "", 0, 0, 0, false);
        }
        
        Season storage season = seasons[currentSeasonId];
        
        return (
            season.id,
            season.name,
            season.theme,
            season.startTime,
            season.endTime,
            season.participantAddresses.length,
            season.active
        );
    }

    /**
     * @dev 리더보드 조회
     */
    function getLeaderboard(uint256 _count) 
        external 
        view 
        returns (
            address[] memory players,
            uint256[] memory points,
            uint256[] memory ranks
        ) 
    {
        require(currentSeasonId > 0, "No active season");
        require(_count > 0, "Invalid count");
        
        Season storage season = seasons[currentSeasonId];
        uint256 length = season.participantAddresses.length;
        if (_count > length) _count = length;
        
        // Simplified leaderboard - would need sorting in production
        players = new address[](_count);
        points = new uint256[](_count);
        ranks = new uint256[](_count);
        
        for (uint i = 0; i < _count; i++) {
            players[i] = season.participantAddresses[i];
            points[i] = season.participants[players[i]].totalPoints;
            ranks[i] = i + 1;
        }
        
        return (players, points, ranks);
    }

    /**
     * @dev 버전 정보
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
