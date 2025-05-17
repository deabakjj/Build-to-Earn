// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../security/SecurityModule.sol";

/**
 * @title DAO
 * @dev Decentralized Autonomous Organization contract for Build-to-Earn governance
 * 
 * Core Features:
 * - 제안 생성 및 투표
 * - 토큰 기반 가중 투표권
 * - 시간 지연 실행 시스템
 * - 비상 중지 기능
 * - 복수 제안 타입 지원
 */
contract DAO is Ownable, SecurityModule {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    // Tokens
    IERC20 public vxcToken;  // VoxelCraft token
    IERC20 public ptxToken;  // PlotX token

    // Proposal tracking
    Counters.Counter private _proposalIds;
    
    // Proposal states
    enum ProposalState {
        Pending,    // 투표 기간 전
        Active,     // 투표 중
        Executed,   // 실행됨
        Rejected,   // 거부됨
        Canceled,   // 취소됨
        Expired     // 만료됨
    }

    // Proposal types
    enum ProposalType {
        ParameterChange,     // 프로토콜 파라미터 변경
        FeatureAddition,     // 신규 기능 추가
        TokenMint,          // 토큰 발행
        EcosystemFund,      // 생태계 펀드 사용
        EmergencyAction,    // 비상 조치
        SystemUpgrade,      // 시스템 업그레이드
        SeasonChange,       // 시즌 관련 변경
        ContractUpgrade     // 컨트랙트 업그레이드
    }

    // Proposal structure
    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        string title;
        string description;
        bytes data;                 // 실행될 데이터
        address target;            // 실행 대상 주소
        uint256 value;             // 전송할 ETH 양
        uint256 startTime;
        uint256 endTime;
        uint256 executionTime;     // 실행 예정 시간
        bool executed;
        bool canceled;
        uint256 forVotes;          // 찬성표
        uint256 againstVotes;      // 반대표
        uint256 abstainVotes;      // 기권표
        uint256 totalVotes;        // 총 투표수
        mapping(address => bool) hasVoted;  // 투표 여부 추적
        mapping(address => Vote) votes;     // 투표 내용
    }

    struct Vote {
        bool support;      // true=찬성, false=반대
        uint256 power;     // 투표력
        bool abstain;      // 기권 여부
    }

    // Proposals
    mapping(uint256 => Proposal) public proposals;
    uint256[] public proposalIds;

    // Configuration parameters
    struct GovernanceParams {
        uint256 proposalThreshold;     // 제안 생성에 필요한 토큰
        uint256 quorumThreshold;       // 쿼럼 임계값 (%)
        uint256 votingDelay;           // 투표 시작까지 지연 (초)
        uint256 votingPeriod;          // 투표 기간 (초)
        uint256 executionDelay;        // 실행까지 지연 (초)
        uint256 gracePeriod;           // 실행 유예 기간 (초)
        uint256 emergencyThreshold;    // 비상 제안 임계값 (%)
        uint256 maxProposalTime;       // 최대 제안 유효 기간
    }

    GovernanceParams public params;

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalType proposalType,
        address indexed proposer,
        string title,
        uint256 startTime,
        uint256 endTime
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 power,
        bool abstain,
        string reason
    );

    event ProposalExecuted(
        uint256 indexed proposalId,
        bool success,
        bytes returnData
    );

    event ProposalCanceled(uint256 indexed proposalId);
    
    event ParametersUpdated(
        string parameterName,
        uint256 oldValue,
        uint256 newValue
    );

    event EmergencyProposalCreated(
        uint256 indexed proposalId,
        address proposer,
        string reason
    );

    // Modifiers
    modifier onlyProposer(uint256 proposalId) {
        require(proposals[proposalId].proposer == msg.sender, "Not proposer");
        _;
    }

    modifier proposalExists(uint256 proposalId) {
        require(proposalId <= _proposalIds.current(), "Proposal does not exist");
        _;
    }

    modifier activeProposal(uint256 proposalId) {
        require(getProposalState(proposalId) == ProposalState.Active, "Proposal not active");
        _;
    }

    // Constructor
    constructor(
        address _vxcToken,
        address _ptxToken,
        GovernanceParams memory _params
    ) {
        vxcToken = IERC20(_vxcToken);
        ptxToken = IERC20(_ptxToken);
        params = _params;

        // Default parameters if not provided
        if (params.proposalThreshold == 0) params.proposalThreshold = 10000 * 10**18; // 10,000 VXC
        if (params.quorumThreshold == 0) params.quorumThreshold = 66; // 66%
        if (params.votingDelay == 0) params.votingDelay = 3 days;
        if (params.votingPeriod == 0) params.votingPeriod = 7 days;
        if (params.executionDelay == 0) params.executionDelay = 2 days;
        if (params.gracePeriod == 0) params.gracePeriod = 5 days;
        if (params.emergencyThreshold == 0) params.emergencyThreshold = 80; // 80%
        if (params.maxProposalTime == 0) params.maxProposalTime = 30 days;
    }

    /**
     * @dev 제안 생성
     */
    function createProposal(
        ProposalType _type,
        string memory _title,
        string memory _description,
        address _target,
        uint256 _value,
        bytes memory _data
    ) external whenNotPaused returns (uint256) {
        // 제안 자격 검증
        uint256 voterPower = getVotingPower(msg.sender);
        require(voterPower >= params.proposalThreshold, "Insufficient voting power");

        _proposalIds.increment();
        uint256 proposalId = _proposalIds.current();

        Proposal storage proposal = proposals[proposalId];
        
        // 제안 생성
        proposal.id = proposalId;
        proposal.proposalType = _type;
        proposal.proposer = msg.sender;
        proposal.title = _title;
        proposal.description = _description;
        proposal.target = _target;
        proposal.value = _value;
        proposal.data = _data;
        proposal.startTime = block.timestamp + params.votingDelay;
        proposal.endTime = proposal.startTime + params.votingPeriod;
        proposal.executionTime = proposal.endTime + params.executionDelay;

        proposalIds.push(proposalId);

        emit ProposalCreated(
            proposalId,
            _type,
            msg.sender,
            _title,
            proposal.startTime,
            proposal.endTime
        );

        // 비상 제안인 경우 특별 이벤트
        if (_type == ProposalType.EmergencyAction) {
            emit EmergencyProposalCreated(proposalId, msg.sender, _description);
        }

        return proposalId;
    }

    /**
     * @dev 비상 제안 생성 (단축된 기간)
     */
    function createEmergencyProposal(
        string memory _title,
        string memory _description,
        address _target,
        uint256 _value,
        bytes memory _data
    ) external whenNotPaused returns (uint256) {
        // 비상 제안 자격 검증 (더 높은 임계값)
        uint256 voterPower = getVotingPower(msg.sender);
        uint256 totalSupply = getTotalVotingPower();
        uint256 emergencyMinPower = totalSupply.mul(params.emergencyThreshold).div(100);
        
        require(voterPower >= emergencyMinPower, "Insufficient power for emergency");

        _proposalIds.increment();
        uint256 proposalId = _proposalIds.current();

        Proposal storage proposal = proposals[proposalId];
        
        // 단축된 일정으로 비상 제안 생성
        proposal.id = proposalId;
        proposal.proposalType = ProposalType.EmergencyAction;
        proposal.proposer = msg.sender;
        proposal.title = _title;
        proposal.description = _description;
        proposal.target = _target;
        proposal.value = _value;
        proposal.data = _data;
        proposal.startTime = block.timestamp + 1 hours;  // 1시간 후 시작
        proposal.endTime = proposal.startTime + 3 days;  // 3일 투표
        proposal.executionTime = proposal.endTime + 1 days; // 1일 후 실행

        proposalIds.push(proposalId);

        emit ProposalCreated(
            proposalId,
            ProposalType.EmergencyAction,
            msg.sender,
            _title,
            proposal.startTime,
            proposal.endTime
        );

        emit EmergencyProposalCreated(proposalId, msg.sender, _description);

        return proposalId;
    }

    /**
     * @dev 투표하기
     */
    function vote(
        uint256 _proposalId,
        bool _support,
        bool _abstain,
        string memory _reason
    ) external proposalExists(_proposalId) activeProposal(_proposalId) whenNotPaused {
        require(
            getProposalState(_proposalId) == ProposalState.Active,
            "Voting not active"
        );
        
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.hasVoted[msg.sender], "Already voted");

        uint256 power = getVotingPower(msg.sender);
        require(power > 0, "No voting power");

        // 투표 기록
        proposal.hasVoted[msg.sender] = true;
        proposal.votes[msg.sender] = Vote({
            support: _support,
            power: power,
            abstain: _abstain
        });

        // 투표 집계
        if (_abstain) {
            proposal.abstainVotes = proposal.abstainVotes.add(power);
        } else if (_support) {
            proposal.forVotes = proposal.forVotes.add(power);
        } else {
            proposal.againstVotes = proposal.againstVotes.add(power);
        }

        proposal.totalVotes = proposal.totalVotes.add(power);

        emit VoteCast(_proposalId, msg.sender, _support, power, _abstain, _reason);
    }

    /**
     * @dev 제안 실행
     */
    function executeProposal(uint256 _proposalId) 
        external 
        proposalExists(_proposalId) 
        whenNotPaused 
        returns (bool) 
    {
        require(
            getProposalState(_proposalId) == ProposalState.Executed || 
            isProposalReady(_proposalId),
            "Cannot execute proposal"
        );
        
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Proposal canceled");
        
        // 실행 시간 체크
        require(
            block.timestamp >= proposal.executionTime,
            "Execution delay not met"
        );
        
        // 실행
        proposal.executed = true;
        
        bool success;
        bytes memory returnData;
        
        if (proposal.data.length > 0) {
            (success, returnData) = proposal.target.call{value: proposal.value}(proposal.data);
        } else if (proposal.value > 0) {
            (success, ) = proposal.target.call{value: proposal.value}("");
        } else {
            success = true;
        }
        
        emit ProposalExecuted(_proposalId, success, returnData);
        
        return success;
    }

    /**
     * @dev 제안 취소
     */
    function cancelProposal(uint256 _proposalId)
        external
        proposalExists(_proposalId)
        onlyProposer(_proposalId)
        whenNotPaused
    {
        require(!proposals[_proposalId].executed, "Cannot cancel executed proposal");
        proposals[_proposalId].canceled = true;
        
        emit ProposalCanceled(_proposalId);
    }

    /**
     * @dev 거버넌스 파라미터 업데이트
     */
    function updateParameters(
        string memory _paramName,
        uint256 _newValue
    ) external onlyOwner {
        uint256 oldValue;
        
        if (keccak256(bytes(_paramName)) == keccak256(bytes("proposalThreshold"))) {
            oldValue = params.proposalThreshold;
            params.proposalThreshold = _newValue;
        } else if (keccak256(bytes(_paramName)) == keccak256(bytes("quorumThreshold"))) {
            require(_newValue <= 100, "Invalid quorum threshold");
            oldValue = params.quorumThreshold;
            params.quorumThreshold = _newValue;
        } else if (keccak256(bytes(_paramName)) == keccak256(bytes("votingDelay"))) {
            oldValue = params.votingDelay;
            params.votingDelay = _newValue;
        } else if (keccak256(bytes(_paramName)) == keccak256(bytes("votingPeriod"))) {
            oldValue = params.votingPeriod;
            params.votingPeriod = _newValue;
        } else if (keccak256(bytes(_paramName)) == keccak256(bytes("executionDelay"))) {
            oldValue = params.executionDelay;
            params.executionDelay = _newValue;
        } else if (keccak256(bytes(_paramName)) == keccak256(bytes("gracePeriod"))) {
            oldValue = params.gracePeriod;
            params.gracePeriod = _newValue;
        } else if (keccak256(bytes(_paramName)) == keccak256(bytes("emergencyThreshold"))) {
            require(_newValue <= 100, "Invalid emergency threshold");
            oldValue = params.emergencyThreshold;
            params.emergencyThreshold = _newValue;
        } else if (keccak256(bytes(_paramName)) == keccak256(bytes("maxProposalTime"))) {
            oldValue = params.maxProposalTime;
            params.maxProposalTime = _newValue;
        } else {
            revert("Invalid parameter name");
        }
        
        emit ParametersUpdated(_paramName, oldValue, _newValue);
    }

    /**
     * @dev 제안 상태 조회
     */
    function getProposalState(uint256 _proposalId) 
        public 
        view 
        proposalExists(_proposalId) 
        returns (ProposalState) 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        if (proposal.canceled) return ProposalState.Canceled;
        if (proposal.executed) return ProposalState.Executed;
        
        if (block.timestamp < proposal.startTime) return ProposalState.Pending;
        if (block.timestamp <= proposal.endTime) return ProposalState.Active;
        
        // 투표 종료 후
        if (block.timestamp > proposal.endTime + proposal.executionTime + params.gracePeriod) {
            return ProposalState.Expired;
        }
        
        // 결과 검증
        if (isProposalReady(_proposalId)) {
            return ProposalState.Executed;
        } else {
            return ProposalState.Rejected;
        }
    }

    /**
     * @dev 제안 실행 가능 여부 확인
     */
    function isProposalReady(uint256 _proposalId) 
        public 
        view 
        proposalExists(_proposalId) 
        returns (bool) 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        // 투표 종료 후 실행 시간 도달 확인
        if (block.timestamp < proposal.executionTime) return false;
        
        // 쿼럼 충족 확인
        uint256 totalPower = getTotalVotingPower();
        uint256 requiredQuorum = totalPower.mul(params.quorumThreshold).div(100);
        
        if (proposal.totalVotes < requiredQuorum) return false;
        
        // 찬성표가 과반수 이상인지 확인
        uint256 totalDecisiveVotes = proposal.forVotes.add(proposal.againstVotes);
        if (totalDecisiveVotes == 0) return false;
        
        uint256 supportPercentage = proposal.forVotes.mul(100).div(totalDecisiveVotes);
        return supportPercentage > 50;
    }

    /**
     * @dev 투표력 계산
     */
    function getVotingPower(address voter) public view returns (uint256) {
        // VXC와 PTX 토큰 파워 조합
        uint256 vxcBalance = vxcToken.balanceOf(voter);
        uint256 ptxBalance = ptxToken.balanceOf(voter);
        
        // PTX는 더 높은 가중치 적용 (1 PTX = 100 VXC 투표력)
        return vxcBalance.add(ptxBalance.mul(100));
    }

    /**
     * @dev 전체 투표력 계산
     */
    function getTotalVotingPower() public view returns (uint256) {
        uint256 totalVxc = vxcToken.totalSupply();
        uint256 totalPtx = ptxToken.totalSupply();
        
        return totalVxc.add(totalPtx.mul(100));
    }

    /**
     * @dev 제안 목록 조회
     */
    function getProposalIds() external view returns (uint256[] memory) {
        return proposalIds;
    }

    /**
     * @dev 제안 상세 정보 조회
     */
    function getProposalDetails(uint256 _proposalId)
        external
        view
        proposalExists(_proposalId)
        returns (
            ProposalType proposalType,
            address proposer,
            string memory title,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            uint256 executionTime,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 abstainVotes,
            bool executed,
            bool canceled,
            ProposalState state
        )
    {
        Proposal storage proposal = proposals[_proposalId];
        
        return (
            proposal.proposalType,
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.executionTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.executed,
            proposal.canceled,
            getProposalState(_proposalId)
        );
    }

    /**
     * @dev 특정 유저의 투표 현황 조회
     */
    function getUserVote(uint256 _proposalId, address _voter)
        external
        view
        proposalExists(_proposalId)
        returns (
            bool hasVoted,
            bool support,
            uint256 power,
            bool abstain
        )
    {
        Proposal storage proposal = proposals[_proposalId];
        
        if (!proposal.hasVoted[_voter]) {
            return (false, false, 0, false);
        }
        
        Vote storage vote = proposal.votes[_voter];
        return (true, vote.support, vote.power, vote.abstain);
    }

    /**
     * @dev 활성 제안들 조회
     */
    function getActiveProposals() 
        external 
        view 
        returns (uint256[] memory activeIds) 
    {
        uint256 activeCount = 0;
        
        // 활성 제안 개수 세기
        for (uint256 i = 0; i < proposalIds.length; i++) {
            if (getProposalState(proposalIds[i]) == ProposalState.Active) {
                activeCount++;
            }
        }
        
        // 활성 제안 ID 배열 생성
        activeIds = new uint256[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < proposalIds.length && currentIndex < activeCount; i++) {
            if (getProposalState(proposalIds[i]) == ProposalState.Active) {
                activeIds[currentIndex] = proposalIds[i];
                currentIndex++;
            }
        }
        
        return activeIds;
    }

    /**
     * @dev 비상 중지 실행
     */
    function emergencyPause() external onlyOwner whenNotPaused {
        _pause();
    }

    /**
     * @dev 비상 중지 해제
     */
    function emergencyUnpause() external onlyOwner whenPaused {
        _unpause();
    }

    /**
     * @dev 이더 회수 (비상용)
     */
    function withdrawETH(address payable _to, uint256 _amount) 
        external 
        onlyOwner 
        whenPaused 
    {
        require(_amount <= address(this).balance, "Insufficient balance");
        _to.transfer(_amount);
    }

    /**
     * @dev 컨트랙트 버전 정보
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }

    /**
     * @dev 이더 수신 허용
     */
    receive() external payable {}
}
