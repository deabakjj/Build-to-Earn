// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../security/SecurityModule.sol";

/**
 * @title Voting
 * @dev Advanced voting mechanism for Build-to-Earn DAO
 * 
 * Advanced Features:
 * - 위임 투표 시스템
 * - 투표력 스냅샷
 * - 투표 타입별 가중치
 * - 투표 보상 시스템
 * - 투표 참여율 추적
 */
contract Voting is Ownable, SecurityModule {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    // Tokens
    IERC20 public vxcToken;
    IERC20 public ptxToken;

    // Voting ID counter
    Counters.Counter private _votingIds;

    // Voting types with different parameters
    enum VotingType {
        Standard,      // 일반 투표
        FastTrack,     // 신속 처리
        Emergency,     // 비상 투표
        Constitutional // 헌법 개정
    }

    // Voting methods
    enum VotingMethod {
        Simple,        // 단순 다수결
        Quadratic,     // 이차 투표
        Weighted,      // 가중 투표
        Ranked         // 순위 투표
    }

    // Vote options
    enum VoteChoice {
        For,           // 찬성
        Against,       // 반대
        Abstain        // 기권
    }

    // Voting configuration
    struct VotingConfig {
        VotingType votingType;
        VotingMethod votingMethod;
        uint256 minimumQuorum;      // 최소 투표율 (%)
        uint256 passingThreshold;   // 통과 임계값 (%)
        uint256 duration;           // 투표 기간 (초)
        uint256 snapshotDelay;      // 스냅샷 지연 (초)
        bool allowDelegation;       // 위임 허용 여부
        bool delegatedOnly;         // 위임자만 투표 가능
        uint256 rewardPool;         // 투표 보상 풀
    }

    // Vote record
    struct Vote {
        VoteChoice choice;
        uint256 weight;
        uint256 timestamp;
        bool isDelegated;
        address delegator;
        string reason;
    }

    // Voting session
    struct VotingSession {
        uint256 id;
        string title;
        string description;
        address creator;
        VotingConfig config;
        uint256 startTime;
        uint256 endTime;
        uint256 snapshotBlock;
        bool active;
        bool executed;
        mapping(address => Vote) votes;
        mapping(address => bool) hasVoted;
        address[] voters;
        uint256 totalForWeight;
        uint256 totalAgainstWeight;
        uint256 totalAbstainWeight;
        uint256 totalParticipation;
    }

    // Delegation
    struct Delegation {
        address delegate;
        bool active;
        uint256 startTime;
        uint256 endTime;
        VotingType[] allowedTypes;
    }

    // Storage
    mapping(uint256 => VotingSession) public votingSessions;
    mapping(address => Delegation) public delegations;
    mapping(address => uint256[]) public userVotingHistory;
    mapping(address => mapping(uint256 => uint256)) public userSnapshots;
    mapping(VotingType => VotingConfig) public defaultConfigs;

    // Stats
    struct VotingStats {
        uint256 totalVotings;
        uint256 totalVotes;
        uint256 totalRewardsDistributed;
        uint256 averageParticipation;
        uint256 lastVotingTime;
    }

    VotingStats public stats;

    // Events
    event VotingCreated(
        uint256 indexed votingId,
        string title,
        VotingType votingType,
        address creator
    );

    event VoteCasted(
        uint256 indexed votingId,
        address indexed voter,
        VoteChoice choice,
        uint256 weight,
        bool isDelegated
    );

    event VotingCompleted(
        uint256 indexed votingId,
        bool passed,
        uint256 totalParticipation,
        uint256 finalChoice
    );

    event DelegationSet(
        address indexed delegator,
        address indexed delegate,
        bool active
    );

    event VotingRewardDistributed(
        uint256 indexed votingId,
        address indexed voter,
        uint256 amount
    );

    event SnapshotTaken(uint256 indexed votingId, uint256 blockNumber);

    // Constructor
    constructor(address _vxcToken, address _ptxToken) {
        vxcToken = IERC20(_vxcToken);
        ptxToken = IERC20(_ptxToken);
        
        // Initialize default configurations
        setupDefaultConfigs();
    }

    /**
     * @dev 기본 설정 초기화
     */
    function setupDefaultConfigs() private {
        // Standard voting
        defaultConfigs[VotingType.Standard] = VotingConfig({
            votingType: VotingType.Standard,
            votingMethod: VotingMethod.Simple,
            minimumQuorum: 33,
            passingThreshold: 51,
            duration: 7 days,
            snapshotDelay: 1 days,
            allowDelegation: true,
            delegatedOnly: false,
            rewardPool: 100000 * 10**18  // 100,000 VXC
        });

        // Fast track voting
        defaultConfigs[VotingType.FastTrack] = VotingConfig({
            votingType: VotingType.FastTrack,
            votingMethod: VotingMethod.Simple,
            minimumQuorum: 25,
            passingThreshold: 60,
            duration: 3 days,
            snapshotDelay: 12 hours,
            allowDelegation: true,
            delegatedOnly: false,
            rewardPool: 50000 * 10**18
        });

        // Emergency voting
        defaultConfigs[VotingType.Emergency] = VotingConfig({
            votingType: VotingType.Emergency,
            votingMethod: VotingMethod.Simple,
            minimumQuorum: 20,
            passingThreshold: 75,
            duration: 1 days,
            snapshotDelay: 1 hours,
            allowDelegation: false,
            delegatedOnly: false,
            rewardPool: 200000 * 10**18
        });

        // Constitutional voting
        defaultConfigs[VotingType.Constitutional] = VotingConfig({
            votingType: VotingType.Constitutional,
            votingMethod: VotingMethod.Weighted,
            minimumQuorum: 50,
            passingThreshold: 66,
            duration: 14 days,
            snapshotDelay: 3 days,
            allowDelegation: true,
            delegatedOnly: false,
            rewardPool: 500000 * 10**18
        });
    }

    /**
     * @dev 새로운 투표 생성
     */
    function createVoting(
        string memory _title,
        string memory _description,
        VotingType _type
    ) external whenNotPaused returns (uint256) {
        require(bytes(_title).length > 0, "Empty title");
        require(bytes(_description).length > 0, "Empty description");

        // 투표 생성 권한 검증
        require(canCreateVoting(msg.sender, _type), "Insufficient rights");

        _votingIds.increment();
        uint256 votingId = _votingIds.current();

        VotingSession storage session = votingSessions[votingId];
        session.id = votingId;
        session.title = _title;
        session.description = _description;
        session.creator = msg.sender;
        session.config = defaultConfigs[_type];
        session.startTime = block.timestamp + session.config.snapshotDelay;
        session.endTime = session.startTime + session.config.duration;
        session.snapshotBlock = block.number + (session.config.snapshotDelay / 15); // Approx 15 sec/block
        session.active = true;

        stats.totalVotings++;
        stats.lastVotingTime = block.timestamp;

        emit VotingCreated(votingId, _title, _type, msg.sender);
        return votingId;
    }

    /**
     * @dev 투표하기
     */
    function vote(
        uint256 _votingId,
        VoteChoice _choice,
        string memory _reason
    ) external whenNotPaused {
        require(_votingId <= _votingIds.current(), "Invalid voting ID");
        
        VotingSession storage session = votingSessions[_votingId];
        require(session.active, "Voting not active");
        require(block.timestamp >= session.startTime, "Voting not started");
        require(block.timestamp < session.endTime, "Voting ended");
        require(!session.hasVoted[msg.sender], "Already voted");

        // 투표력 계산
        uint256 weight = calculateVotingWeight(
            _votingId,
            msg.sender,
            session.config.votingMethod
        );
        require(weight > 0, "No voting power");

        // 위임 체크
        bool isDelegated = false;
        address delegator = address(0);
        
        if (session.config.allowDelegation && hasDelegation(msg.sender)) {
            Delegation storage delegation = delegations[msg.sender];
            if (delegation.active && isDelegatedFor(_votingId, delegation.delegate)) {
                isDelegated = true;
                delegator = msg.sender;
                // 위임된 투표력 추가
                weight = weight.add(calculateVotingWeight(
                    _votingId,
                    delegator,
                    session.config.votingMethod
                ));
            }
        }

        // 위임자 전용 투표인 경우 체크
        if (session.config.delegatedOnly && !isDelegated) {
            revert("Delegated votes only");
        }

        // 투표 기록
        session.hasVoted[msg.sender] = true;
        session.votes[msg.sender] = Vote({
            choice: _choice,
            weight: weight,
            timestamp: block.timestamp,
            isDelegated: isDelegated,
            delegator: delegator,
            reason: _reason
        });

        session.voters.push(msg.sender);

        // 집계
        if (_choice == VoteChoice.For) {
            session.totalForWeight = session.totalForWeight.add(weight);
        } else if (_choice == VoteChoice.Against) {
            session.totalAgainstWeight = session.totalAgainstWeight.add(weight);
        } else {
            session.totalAbstainWeight = session.totalAbstainWeight.add(weight);
        }

        session.totalParticipation = session.totalParticipation.add(weight);
        stats.totalVotes++;

        userVotingHistory[msg.sender].push(_votingId);

        emit VoteCasted(_votingId, msg.sender, _choice, weight, isDelegated);
    }

    /**
     * @dev 위임 설정
     */
    function setDelegation(
        address _delegate,
        bool _active,
        uint256 _duration,
        VotingType[] memory _allowedTypes
    ) external whenNotPaused {
        require(_delegate != address(0), "Invalid delegate");
        require(_delegate != msg.sender, "Cannot delegate to self");

        Delegation storage delegation = delegations[msg.sender];
        delegation.delegate = _delegate;
        delegation.active = _active;
        delegation.startTime = block.timestamp;
        delegation.endTime = _active ? block.timestamp + _duration : 0;
        delegation.allowedTypes = _allowedTypes;

        emit DelegationSet(msg.sender, _delegate, _active);
    }

    /**
     * @dev 투표 완료 처리
     */
    function completeVoting(uint256 _votingId) external whenNotPaused returns (bool) {
        require(_votingId <= _votingIds.current(), "Invalid voting ID");
        
        VotingSession storage session = votingSessions[_votingId];
        require(session.active, "Voting not active");
        require(block.timestamp >= session.endTime, "Voting not ended");
        require(!session.executed, "Already executed");

        // 결과 계산
        bool passed = calculateResult(_votingId);
        uint256 finalChoice = 0;

        if (session.totalForWeight > session.totalAgainstWeight) {
            finalChoice = 1; // For
        } else if (session.totalAgainstWeight > session.totalForWeight) {
            finalChoice = 2; // Against
        } else {
            finalChoice = 3; // Tie
        }

        session.executed = true;
        session.active = false;

        // 보상 분배
        distributeRewards(_votingId);

        // 통계 업데이트
        uint256 totalWeight = getTotalVotingWeight(_votingId);
        if (totalWeight > 0) {
            uint256 participation = session.totalParticipation.mul(100).div(totalWeight);
            stats.averageParticipation = stats.averageParticipation == 0 
                ? participation 
                : stats.averageParticipation.add(participation).div(2);
        }

        emit VotingCompleted(_votingId, passed, session.totalParticipation, finalChoice);
        return passed;
    }

    /**
     * @dev 투표 결과 계산
     */
    function calculateResult(uint256 _votingId) public view returns (bool) {
        VotingSession storage session = votingSessions[_votingId];
        
        // 쿼럼 체크
        uint256 totalWeight = getTotalVotingWeight(_votingId);
        uint256 requiredQuorum = totalWeight.mul(session.config.minimumQuorum).div(100);
        
        if (session.totalParticipation < requiredQuorum) {
            return false;
        }

        // 통과 임계값 체크
        uint256 totalDecisive = session.totalForWeight.add(session.totalAgainstWeight);
        if (totalDecisive == 0) return false;

        uint256 forPercentage = session.totalForWeight.mul(100).div(totalDecisive);
        return forPercentage >= session.config.passingThreshold;
    }

    /**
     * @dev 투표력 계산
     */
    function calculateVotingWeight(
        uint256 _votingId,
        address _voter,
        VotingMethod _method
    ) public view returns (uint256) {
        VotingSession storage session = votingSessions[_votingId];
        
        // 스냅샷된 잔액 사용
        uint256 vxcBalance = userSnapshots[_voter][session.snapshotBlock];
        uint256 ptxBalance = userSnapshots[_voter][session.snapshotBlock];

        if (vxcBalance == 0 && ptxBalance == 0) {
            // 스냅샷이 없으면 현재 잔액 사용
            vxcBalance = vxcToken.balanceOf(_voter);
            ptxBalance = ptxToken.balanceOf(_voter);
        }

        uint256 baseWeight = vxcBalance.add(ptxBalance.mul(100));

        if (_method == VotingMethod.Simple) {
            return baseWeight;
        } else if (_method == VotingMethod.Quadratic) {
            // 이차 투표: sqrt(balance)
            return sqrt(baseWeight);
        } else if (_method == VotingMethod.Weighted) {
            // 가중 투표: PTX에 더 높은 가중치
            return vxcBalance.add(ptxBalance.mul(200));
        } else if (_method == VotingMethod.Ranked) {
            // 순위 투표는 별도 처리 필요
            return baseWeight;
        }

        return baseWeight;
    }

    /**
     * @dev 전체 투표력 계산
     */
    function getTotalVotingWeight(uint256 _votingId) public view returns (uint256) {
        VotingSession storage session = votingSessions[_votingId];
        VotingConfig memory config = session.config;
        
        uint256 totalVxc = vxcToken.totalSupply();
        uint256 totalPtx = ptxToken.totalSupply();
        
        if (config.votingMethod == VotingMethod.Simple) {
            return totalVxc.add(totalPtx.mul(100));
        } else if (config.votingMethod == VotingMethod.Weighted) {
            return totalVxc.add(totalPtx.mul(200));
        } else {
            // 다른 방식들은 추정치 사용
            return totalVxc.add(totalPtx.mul(100));
        }
    }

    /**
     * @dev 보상 분배
     */
    function distributeRewards(uint256 _votingId) private {
        VotingSession storage session = votingSessions[_votingId];
        
        if (session.config.rewardPool == 0 || session.voters.length == 0) {
            return;
        }

        uint256 totalWeight = session.totalParticipation;
        uint256 rewardPerWeight = session.config.rewardPool.div(totalWeight);

        for (uint256 i = 0; i < session.voters.length; i++) {
            address voter = session.voters[i];
            Vote storage vote = session.votes[voter];
            
            uint256 reward = vote.weight.mul(rewardPerWeight);
            
            // 조기 투표 보너스 (첫 24시간 내 투표)
            if (vote.timestamp <= session.startTime + 1 days) {
                reward = reward.mul(110).div(100); // 10% 보너스
            }

            // 위임 투표 보너스
            if (vote.isDelegated) {
                reward = reward.mul(105).div(100); // 5% 보너스
            }

            // 보상 전송 (실제 구현에서는 토큰 전송)
            // vxcToken.transfer(voter, reward);
            
            stats.totalRewardsDistributed = stats.totalRewardsDistributed.add(reward);
            
            emit VotingRewardDistributed(_votingId, voter, reward);
        }
    }

    /**
     * @dev 스냅샷 촬영
     */
    function takeSnapshot(uint256 _votingId) external {
        VotingSession storage session = votingSessions[_votingId];
        require(block.number >= session.snapshotBlock, "Not yet time for snapshot");
        
        // 모든 토큰 소유자의 스냅샷 저장
        // 실제 구현에서는 더 효율적인 방법 필요
        
        emit SnapshotTaken(_votingId, block.number);
    }

    /**
     * @dev 투표 생성 권한 확인
     */
    function canCreateVoting(address _creator, VotingType _type) public view returns (bool) {
        uint256 power = calculateVotingWeight(0, _creator, VotingMethod.Simple);
        
        if (_type == VotingType.Standard) {
            return power >= 10000 * 10**18; // 10,000 VXC
        } else if (_type == VotingType.FastTrack) {
            return power >= 50000 * 10**18; // 50,000 VXC
        } else if (_type == VotingType.Emergency) {
            return power >= 100000 * 10**18; // 100,000 VXC
        } else if (_type == VotingType.Constitutional) {
            return power >= 500000 * 10**18; // 500,000 VXC
        }
        
        return false;
    }

    /**
     * @dev 위임 여부 확인
     */
    function hasDelegation(address _delegator) public view returns (bool) {
        Delegation storage delegation = delegations[_delegator];
        return delegation.active && block.timestamp >= delegation.startTime 
            && block.timestamp < delegation.endTime;
    }

    /**
     * @dev 특정 투표에 대한 위임 확인
     */
    function isDelegatedFor(uint256 _votingId, address _delegate) public view returns (bool) {
        VotingSession storage session = votingSessions[_votingId];
        Delegation storage delegation = delegations[_delegate];
        
        if (!delegation.active) return false;
        
        // 특정 타입 제한 체크
        if (delegation.allowedTypes.length > 0) {
            bool allowed = false;
            for (uint256 i = 0; i < delegation.allowedTypes.length; i++) {
                if (delegation.allowedTypes[i] == session.config.votingType) {
                    allowed = true;
                    break;
                }
            }
            if (!allowed) return false;
        }
        
        return true;
    }

    /**
     * @dev 제곱근 계산 (이차 투표용)
     */
    function sqrt(uint256 x) private pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /**
     * @dev 투표 정보 조회
     */
    function getVotingInfo(uint256 _votingId)
        external
        view
        returns (
            string memory title,
            string memory description,
            VotingType votingType,
            uint256 startTime,
            uint256 endTime,
            bool active,
            bool executed,
            uint256 totalForWeight,
            uint256 totalAgainstWeight,
            uint256 totalAbstainWeight,
            uint256 totalParticipation
        )
    {
        require(_votingId <= _votingIds.current(), "Invalid voting ID");
        
        VotingSession storage session = votingSessions[_votingId];
        
        return (
            session.title,
            session.description,
            session.config.votingType,
            session.startTime,
            session.endTime,
            session.active,
            session.executed,
            session.totalForWeight,
            session.totalAgainstWeight,
            session.totalAbstainWeight,
            session.totalParticipation
        );
    }

    /**
     * @dev 현재 활성 투표 목록
     */
    function getActiveVotings() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // 활성 투표 개수 세기
        for (uint256 i = 1; i <= _votingIds.current(); i++) {
            if (votingSessions[i].active && 
                block.timestamp >= votingSessions[i].startTime &&
                block.timestamp < votingSessions[i].endTime) {
                activeCount++;
            }
        }
        
        uint256[] memory activeVotings = new uint256[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i <= _votingIds.current() && currentIndex < activeCount; i++) {
            if (votingSessions[i].active && 
                block.timestamp >= votingSessions[i].startTime &&
                block.timestamp < votingSessions[i].endTime) {
                activeVotings[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return activeVotings;
    }

    /**
     * @dev 버전 정보
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
