// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title VoxelCraft Token (VXC)
 * @dev DIY 크래프팅 월드의 유틸리티 토큰
 * 
 * 주요 기능:
 * - NFT 민팅 비용 지불
 * - 게임 내 아이템 구매
 * - 퀘스트 보상
 * - 거래 수수료
 * - 인플레이션 제어를 위한 소각 메커니즘
 */
contract VoxelCraft is ERC20, ERC20Burnable, ERC20Permit, AccessControl, Pausable {
    using SafeMath for uint256;

    // 역할 정의
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // 토큰 정보
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 10억 토큰
    uint256 public constant MAX_SUPPLY = 10_000_000_000 * 10**18; // 최대 100억 토큰
    uint256 public constant MINT_COOLDOWN = 30 days; // 민팅 쿨다운

    // 인플레이션 제어 변수
    uint256 public lastMintTime;
    uint256 public quarterlyMintCap;
    uint256 public currentQuarterMinted;
    uint256 public totalBurned;

    // 수수료 설정
    uint256 public transferFeeRate = 100; // 1% (10000 기준)
    uint256 public constant MAX_FEE_RATE = 500; // 최대 5%
    address public feeRecipient;

    // 이벤트
    event MintCapUpdated(uint256 newCap);
    event FeeRateUpdated(uint256 newRate);
    event FeeRecipientUpdated(address newRecipient);
    event TokensBurned(address indexed burner, uint256 amount);
    event TokensMinted(address indexed minter, address indexed to, uint256 amount);

    /**
     * @dev 컨트랙트 초기화
     * @param _feeRecipient 수수료 수신 주소
     */
    constructor(address _feeRecipient) 
        ERC20("VoxelCraft", "VXC") 
        ERC20Permit("VoxelCraft") 
    {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        // 역할 설정
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);

        // 초기 공급량 민팅
        _mint(msg.sender, INITIAL_SUPPLY);
        
        // 설정 초기화
        feeRecipient = _feeRecipient;
        lastMintTime = block.timestamp;
        quarterlyMintCap = INITIAL_SUPPLY.mul(5).div(100); // 초기 공급량의 5%
        
        emit FeeRecipientUpdated(_feeRecipient);
        emit MintCapUpdated(quarterlyMintCap);
    }

    /**
     * @dev 토큰 민팅 (제어된 인플레이션)
     * @param to 토큰을 받을 주소
     * @param amount 민팅할 토큰 양
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(totalSupply().add(amount) <= MAX_SUPPLY, "Exceeds max supply");
        
        // 분기별 민팅 제한 확인
        if (block.timestamp >= lastMintTime.add(90 days)) {
            // 새로운 분기 시작
            currentQuarterMinted = 0;
            lastMintTime = block.timestamp;
            
            // 동적 민팅 캡 조정
            _adjustMintingCap();
        }
        
        require(currentQuarterMinted.add(amount) <= quarterlyMintCap, "Exceeds quarterly mint cap");
        
        _mint(to, amount);
        currentQuarterMinted = currentQuarterMinted.add(amount);
        
        emit TokensMinted(msg.sender, to, amount);
    }

    /**
     * @dev 민팅 캡 동적 조정
     */
    function _adjustMintingCap() private {
        // 토큰 사용량과 소각량에 따라 민팅 캡 조정
        uint256 burnRatio = totalBurned.mul(10000).div(totalSupply());
        
        if (burnRatio > 1000) { // 10% 이상 소각된 경우
            quarterlyMintCap = quarterlyMintCap.mul(12).div(10); // 20% 증가
        } else if (burnRatio < 500) { // 5% 미만 소각된 경우
            quarterlyMintCap = quarterlyMintCap.mul(9).div(10); // 10% 감소
        }
        
        // 최대/최소 제한 설정
        uint256 maxCap = totalSupply().mul(8).div(100); // 현재 공급량의 8%
        uint256 minCap = totalSupply().mul(2).div(100); // 현재 공급량의 2%
        
        if (quarterlyMintCap > maxCap) {
            quarterlyMintCap = maxCap;
        } else if (quarterlyMintCap < minCap) {
            quarterlyMintCap = minCap;
        }
        
        emit MintCapUpdated(quarterlyMintCap);
    }

    /**
     * @dev 토큰 전송 (수수료 포함)
     */
    function _transfer(address from, address to, uint256 amount) internal override {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
        
        uint256 feeAmount = 0;
        
        // 특정 주소들은 수수료 면제
        if (!hasRole(DEFAULT_ADMIN_ROLE, from) && !hasRole(DEFAULT_ADMIN_ROLE, to)) {
            feeAmount = amount.mul(transferFeeRate).div(10000);
            if (feeAmount > 0) {
                super._transfer(from, feeRecipient, feeAmount);
            }
        }
        
        uint256 actualAmount = amount.sub(feeAmount);
        super._transfer(from, to, actualAmount);
    }

    /**
     * @dev 토큰 소각 (확장된 기능)
     * @param amount 소각할 토큰 양
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        totalBurned = totalBurned.add(amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev 다른 사용자의 토큰 소각 (권한 필요)
     * @param account 소각할 토큰의 소유자
     * @param amount 소각할 토큰 양
     */
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        totalBurned = totalBurned.add(amount);
        emit TokensBurned(account, amount);
    }

    /**
     * @dev 수수료율 설정
     * @param newRate 새로운 수수료율 (10000 기준)
     */
    function setFeeRate(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRate <= MAX_FEE_RATE, "Fee rate too high");
        transferFeeRate = newRate;
        emit FeeRateUpdated(newRate);
    }

    /**
     * @dev 수수료 수신 주소 변경
     * @param newRecipient 새로운 수수료 수신 주소
     */
    function setFeeRecipient(address newRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    /**
     * @dev 컨트랙트 일시 중지
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev 컨트랙트 일시 중지 해제
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev 현재 인플레이션 정보 조회
     */
    function getInflationInfo() external view returns (
        uint256 maxSupply,
        uint256 currentSupply,
        uint256 quarterMintCap,
        uint256 quarterMinted,
        uint256 totalBurnedAmount,
        uint256 nextQuarterStart
    ) {
        return (
            MAX_SUPPLY,
            totalSupply(),
            quarterlyMintCap,
            currentQuarterMinted,
            totalBurned,
            lastMintTime.add(90 days)
        );
    }

    /**
     * @dev 수수료 정보 조회
     */
    function getFeeInfo() external view returns (
        uint256 currentFeeRate,
        address feeRecipientAddress,
        uint256 maxFeeRate
    ) {
        return (
            transferFeeRate,
            feeRecipient,
            MAX_FEE_RATE
        );
    }
}
