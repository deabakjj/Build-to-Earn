import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  VoxelCraft,
  PlotX,
  ItemNFT,
  Marketplace,
  RewardVault,
  DAO,
} from '../typechain-types';

describe('Smart Contract Security Tests', () => {
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let attacker: SignerWithAddress;
  
  let voxelCraft: VoxelCraft;
  let plotX: PlotX;
  let itemNFT: ItemNFT;
  let marketplace: Marketplace;
  let rewardVault: RewardVault;
  let dao: DAO;

  beforeEach(async () => {
    [deployer, user1, user2, attacker] = await ethers.getSigners();

    // 컨트랙트 배포
    const VoxelCraftFactory = await ethers.getContractFactory('VoxelCraft');
    voxelCraft = await VoxelCraftFactory.deploy();
    await voxelCraft.deployed();

    const PlotXFactory = await ethers.getContractFactory('PlotX');
    plotX = await PlotXFactory.deploy();
    await plotX.deployed();

    const ItemNFTFactory = await ethers.getContractFactory('ItemNFT');
    itemNFT = await ItemNFTFactory.deploy();
    await itemNFT.deployed();

    const MarketplaceFactory = await ethers.getContractFactory('Marketplace');
    marketplace = await MarketplaceFactory.deploy(
      voxelCraft.address,
      plotX.address
    );
    await marketplace.deployed();

    const RewardVaultFactory = await ethers.getContractFactory('RewardVault');
    rewardVault = await RewardVaultFactory.deploy(voxelCraft.address);
    await rewardVault.deployed();

    const DAOFactory = await ethers.getContractFactory('DAO');
    dao = await DAOFactory.deploy(
      plotX.address,
      voxelCraft.address
    );
    await dao.deployed();

    // 권한 설정
    await voxelCraft.grantRole(await voxelCraft.MINTER_ROLE(), marketplace.address);
    await voxelCraft.grantRole(await voxelCraft.MINTER_ROLE(), rewardVault.address);
    await itemNFT.grantRole(await itemNFT.MINTER_ROLE(), deployer.address);
  });

  describe('Reentrancy Protection', () => {
    it('should prevent reentrancy attacks on marketplace', async () => {
      // 악성 컨트랙트 배포
      const MaliciousContractFactory = await ethers.getContractFactory('MaliciousReentrancyContract');
      const maliciousContract = await MaliciousContractFactory.deploy(marketplace.address);
      await maliciousContract.deployed();

      // NFT 민팅 및 리스팅
      await itemNFT.mint(user1.address, 'ipfs://test');
      await itemNFT.connect(user1).approve(marketplace.address, 1);
      await marketplace.connect(user1).listNFT(itemNFT.address, 1, ethers.utils.parseEther('1'));

      // 재진입 공격 시도
      await expect(
        maliciousContract.attack({ value: ethers.utils.parseEther('10') })
      ).to.be.revertedWith('ReentrancyGuard: reentrant call');
    });

    it('should prevent reentrancy attacks on reward vault', async () => {
      // 재진입 공격 시도 (보상 청구)
      const MaliciousRewardContractFactory = await ethers.getContractFactory('MaliciousRewardContract');
      const maliciousContract = await MaliciousRewardContractFactory.deploy(rewardVault.address);
      await maliciousContract.deployed();

      // 보상 설정
      await voxelCraft.mint(rewardVault.address, ethers.utils.parseEther('1000'));
      await rewardVault.setReward(1, ethers.utils.parseEther('10'), 'quest');

      // 재진입 공격 시도
      await expect(
        maliciousContract.attack()
      ).to.be.revertedWith('ReentrancyGuard: reentrant call');
    });
  });

  describe('Access Control', () => {
    it('should prevent unauthorized minting', async () => {
      await expect(
        voxelCraft.connect(attacker).mint(attacker.address, ethers.utils.parseEther('1000'))
      ).to.be.revertedWith('AccessControl: account');
    });

    it('should prevent unauthorized NFT minting', async () => {
      await expect(
        itemNFT.connect(attacker).mint(attacker.address, 'ipfs://test')
      ).to.be.revertedWith('AccessControl: account');
    });

    it('should prevent unauthorized contract pausing', async () => {
      await expect(
        marketplace.connect(attacker).pause()
      ).to.be.revertedWith('AccessControl: account');
    });

    it('should allow role-based access control', async () => {
      // MINTER_ROLE 부여
      await voxelCraft.grantRole(await voxelCraft.MINTER_ROLE(), user1.address);
      
      // 민팅 가능해야 함
      await expect(
        voxelCraft.connect(user1).mint(user1.address, ethers.utils.parseEther('100'))
      ).to.not.be.reverted;

      // 역할 제거
      await voxelCraft.revokeRole(await voxelCraft.MINTER_ROLE(), user1.address);
      
      // 민팅 불가능해야 함
      await expect(
        voxelCraft.connect(user1).mint(user1.address, ethers.utils.parseEther('100'))
      ).to.be.revertedWith('AccessControl: account');
    });
  });

  describe('Overflow Protection', () => {
    it('should prevent integer overflow in token operations', async () => {
      const maxSupply = ethers.constants.MaxUint256;
      
      // 최대 공급량 근처에서 민팅 시도
      await expect(
        voxelCraft.mint(user1.address, maxSupply)
      ).to.be.revertedWith('ERC20: cap exceeded');
    });

    it('should handle underflow in token transfers', async () => {
      await voxelCraft.mint(user1.address, ethers.utils.parseEther('100'));
      
      // 잔액보다 많은 토큰 전송 시도
      await expect(
        voxelCraft.connect(user1).transfer(user2.address, ethers.utils.parseEther('200'))
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });
  });

  describe('Front-running Protection', () => {
    it('should prevent sandwich attacks on marketplace', async () => {
      // NFT 리스팅
      await itemNFT.mint(user1.address, 'ipfs://test');
      await itemNFT.connect(user1).approve(marketplace.address, 1);
      await marketplace.connect(user1).listNFT(itemNFT.address, 1, ethers.utils.parseEther('1'));

      // 최대 가격 설정으로 슬리피지 보호
      const maxPrice = ethers.utils.parseEther('1.1');
      
      // 가격 조작 시도
      // ... (실제 테스트 구현)
    });

    it('should implement deadline for time-sensitive operations', async () => {
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1시간 후
      const expiredDeadline = Math.floor(Date.now() / 1000) - 3600; // 1시간 전

      // 기한 내 작업은 성공
      // ... (실제 테스트 구현)

      // 기한 초과 작업은 실패
      // ... (실제 테스트 구현)
    });
  });

  describe('Flash Loan Protection', () => {
    it('should prevent flash loan attacks on governance', async () => {
      // 플래시 론을 통한 토큰 대량 확보 시도
      const FlashLoanAttackFactory = await ethers.getContractFactory('FlashLoanAttackContract');
      const flashLoanAttack = await FlashLoanAttackFactory.deploy(dao.address, plotX.address);
      await flashLoanAttack.deployed();

      // 플래시 론 공격 실행
      await expect(
        flashLoanAttack.executeAttack()
      ).to.be.revertedWith('DAO: invalid voting power');
    });

    it('should implement flash loan protection with block delay', async () => {
      // 블록 지연을 통한 플래시 론 보호
      const currentBlock = await ethers.provider.getBlockNumber();
      
      // 최근 토큰 이동이 있었다면 투표 불가
      await plotX.mint(user1.address, ethers.utils.parseEther('1000'));
      
      await expect(
        dao.connect(user1).vote(1, true)
      ).to.be.revertedWith('DAO: must wait before voting');
    });
  });

  describe('Oracle Manipulation Protection', () => {
    it('should prevent price oracle manipulation', async () => {
      // 여러 가격 소스를 통한 중앙값 계산
      // ... (실제 테스트 구현)
    });

    it('should implement circuit breakers for extreme price movements', async () => {
      // 급격한 가격 변동시 자동 중단
      // ... (실제 테스트 구현)
    });
  });

  describe('Griefing Protection', () => {
    it('should prevent gas griefing in batch operations', async () => {
      // 가스 그리핑 공격 시도
      const gasGriefingArray = new Array(1000).fill(0).map((_, i) => ({
        nftContract: itemNFT.address,
        tokenId: i + 1,
        price: ethers.utils.parseEther('1'),
      }));

      await expect(
        marketplace.batchListNFTs(gasGriefingArray)
      ).to.be.revertedWith('Marketplace: batch too large');
    });

    it('should limit resource-intensive operations', async () => {
      // 리소스 집약적 작업 제한
      const maxBatchSize = 50;
      
      const validBatch = new Array(maxBatchSize - 1).fill(0);
      await expect(
        // 유효한 배치 크기는 성공
      ).to.not.be.reverted;

      const invalidBatch = new Array(maxBatchSize + 1).fill(0);
      await expect(
        // 초과 배치 크기는 실패
      ).to.be.revertedWith('Marketplace: batch too large');
    });
  });

  describe('Storage Collision Protection', () => {
    it('should prevent storage collision in proxy contracts', async () => {
      // 프록시 패턴에서 저장소 충돌 방지
      // ... (실제 테스트 구현)
    });

    it('should use proper storage gaps for upgradeable contracts', async () => {
      // 업그레이드 가능한 컨트랙트의 저장소 간격 확인
      // ... (실제 테스트 구현)
    });
  });

  describe('Emergency Mechanisms', () => {
    it('should implement emergency stop', async () => {
      // 비상 중지 기능
      await marketplace.pause();
      
      await expect(
        marketplace.connect(user1).listNFT(itemNFT.address, 1, ethers.utils.parseEther('1'))
      ).to.be.revertedWith('Pausable: paused');
    });

    it('should allow emergency withdrawal by admin', async () => {
      // 관리자의 비상 출금
      await voxelCraft.mint(marketplace.address, ethers.utils.parseEther('1000'));
      
      await expect(
        marketplace.emergencyWithdraw(voxelCraft.address)
      ).to.not.be.reverted;
    });

    it('should implement circuit breakers for abnormal activity', async () => {
      // 비정상 활동 감지시 자동 중단
      // ... (실제 테스트 구현)
    });
  });

  describe('Signature Verification', () => {
    it('should verify signatures correctly', async () => {
      const message = 'Test message';
      const messageHash = ethers.utils.hashMessage(message);
      const signature = await user1.signMessage(message);

      // 서명 검증
      const isValid = await marketplace.verifySignature(
        messageHash,
        signature,
        user1.address
      );
      
      expect(isValid).to.be.true;
    });

    it('should prevent signature replay attacks', async () => {
      const nonce = 1;
      const message = `Test message with nonce: ${nonce}`;
      const signature = await user1.signMessage(message);

      // 첫 번째 사용은 성공
      await marketplace.connect(user1).claimWithSignature(message, signature, nonce);
      
      // 재사용은 실패
      await expect(
        marketplace.connect(user1).claimWithSignature(message, signature, nonce)
      ).to.be.revertedWith('Marketplace: nonce already used');
    });
  });

  describe('Token Approval Security', () => {
    it('should use safeApprove for token approvals', async () => {
      // 안전한 승인 사용
      await voxelCraft.mint(user1.address, ethers.utils.parseEther('1000'));
      
      // 기존 승인이 있을 때는 0으로 먼저 리셋
      await voxelCraft.connect(user1).approve(marketplace.address, ethers.utils.parseEther('100'));
      
      await expect(
        voxelCraft.connect(user1).approve(marketplace.address, ethers.utils.parseEther('200'))
      ).to.be.revertedWith('SafeERC20: approve from non-zero to non-zero allowance');
    });

    it('should implement allowance checks', async () => {
      await voxelCraft.mint(user1.address, ethers.utils.parseEther('1000'));
      await voxelCraft.connect(user1).approve(marketplace.address, ethers.utils.parseEther('100'));

      // 승인된 금액 확인
      const allowance = await voxelCraft.allowance(user1.address, marketplace.address);
      expect(allowance).to.equal(ethers.utils.parseEther('100'));

      // 승인된 금액을 초과하는 전송 시도
      await expect(
        marketplace.connect(user1).transferFrom(user1.address, user2.address, ethers.utils.parseEther('200'))
      ).to.be.revertedWith('ERC20: insufficient allowance');
    });
  });

  describe('Gas Limit Protection', () => {
    it('should prevent out-of-gas attacks', async () => {
      // 무한 루프를 통한 가스 소진 공격 시도
      const OutOfGasAttackFactory = await ethers.getContractFactory('OutOfGasAttack');
      const outOfGasAttack = await OutOfGasAttackFactory.deploy(marketplace.address);
      await outOfGasAttack.deployed();

      // 가스 한도 내에서 작업 완료되어야 함
      await expect(
        outOfGasAttack.attack()
      ).to.be.revertedWith('Gas limit exceeded');
    });

    it('should implement proper gas estimation', async () => {
      // 가스 추정이 정확하게 작동하는지 확인
      const estimatedGas = await marketplace.estimateGas.listNFT(
        itemNFT.address, 
        1, 
        ethers.utils.parseEther('1')
      );

      expect(estimatedGas.gt(0)).to.be.true;
      expect(estimatedGas.lt(1000000)).to.be.true; // 너무 많은 가스를 사용하지 않도록
    });
  });

  describe('Randomness Security', () => {
    it('should use secure randomness for critical operations', async () => {
      // chainlink VRF 또는 commit-reveal 스킴 사용
      // 블록 해시 기반 무작위성은 조작 가능하므로 사용하지 않음
      
      // 예: 랜덤 아이템 드롭
      const RandomItemDropFactory = await ethers.getContractFactory('RandomItemDrop');
      const randomItemDrop = await RandomItemDropFactory.deploy();
      await randomItemDrop.deployed();

      // VRF 랜덤니스 요청
      await randomItemDrop.requestRandomItem(user1.address);
      
      // 블록 해시 기반 랜덤니스 사용 시 실패
      await expect(
        randomItemDrop.requestRandomItemUnsafe(user1.address)
      ).to.be.revertedWith('RandomItemDrop: use secure randomness only');
    });

    it('should prevent randomness manipulation', async () => {
      // 채굴자에 의한 랜덤니스 조작 방지
      // 미래 블록의 해시나 타임스탬프를 사용하지 않음
      
      const RandomGameFactory = await ethers.getContractFactory('RandomGame');
      const randomGame = await RandomGameFactory.deploy();
      await randomGame.deployed();

      // 미래 블록 해시 사용 시도
      await expect(
        randomGame.playGameWithFutureBlock()
      ).to.be.revertedWith('RandomGame: cannot use future block hash');
    });
  });

  describe('Token Economics Security', () => {
    it('should maintain proper token supply mechanics', async () => {
      // 토큰 공급량 관리
      const initialSupply = await voxelCraft.totalSupply();
      
      // 민팅 캡 확인
      const maxSupply = await voxelCraft.cap();
      expect(initialSupply.lt(maxSupply)).to.be.true;

      // 과도한 민팅 시도
      await expect(
        voxelCraft.mint(user1.address, maxSupply)
      ).to.be.revertedWith('ERC20: cap exceeded');
    });

    it('should prevent supply manipulation attacks', async () => {
      // 공급량 조작 공격 방지
      const SupplyManipulationAttackFactory = await ethers.getContractFactory('SupplyManipulationAttack');
      const attack = await SupplyManipulationAttackFactory.deploy(voxelCraft.address);
      await attack.deployed();

      // 순환 민팅/소각 공격 시도
      await expect(
        attack.executeManipulation()
      ).to.be.revertedWith('VoxelCraft: supply manipulation detected');
    });
  });

  describe('Upgrade Security', () => {
    it('should secure upgrade mechanisms', async () => {
      // 프록시 업그레이드 보안
      const ProxyAdminFactory = await ethers.getContractFactory('ProxyAdmin');
      const proxyAdmin = await ProxyAdminFactory.deploy();
      await proxyAdmin.deployed();

      // 무단 업그레이드 시도
      await expect(
        proxyAdmin.connect(attacker).upgradeAndCall(marketplace.address, marketplace.address, '0x')
      ).to.be.revertedWith('ProxyAdmin: caller is not the admin');
    });

    it('should implement proper upgrade delays', async () => {
      // 업그레이드 지연 메커니즘
      const TimelockFactory = await ethers.getContractFactory('Timelock');
      const timelock = await TimelockFactory.deploy(2 * 24 * 60 * 60); // 2일 지연
      await timelock.deployed();

      // 즉시 업그레이드 시도 (실패해야 함)
      await expect(
        timelock.queueTransaction(
          marketplace.address,
          0,
          'upgradeTo(address)',
          ethers.utils.defaultAbiCoder.encode(['address'], [marketplace.address]),
          0
        )
      ).to.not.be.reverted;

      // 지연 시간 전 실행 시도 (실패해야 함)
      await expect(
        timelock.executeTransaction(
          marketplace.address,
          0,
          'upgradeTo(address)',
          ethers.utils.defaultAbiCoder.encode(['address'], [marketplace.address]),
          0
        )
      ).to.be.revertedWith('Timelock: transaction is still locked');
    });
  });

  describe('Multi-sig Security', () => {
    it('should require multiple signatures for critical operations', async () => {
      // 다중서명 지갑 테스트
      const MultiSigFactory = await ethers.getContractFactory('MultiSigWallet');
      const multiSig = await MultiSigFactory.deploy(
        [deployer.address, user1.address, user2.address],
        2 // 2/3 서명 필요
      );
      await multiSig.deployed();

      // 단일 서명으로 거래 시도 (실패해야 함)
      await multiSig.proposeTransaction(voxelCraft.address, 0, '0x', 'Test transaction');
      await multiSig.connect(deployer).approveTransaction(0);
      
      await expect(
        multiSig.connect(deployer).executeTransaction(0)
      ).to.be.revertedWith('MultiSig: insufficient approvals');

      // 필요한 서명 수 충족 후 실행 (성공해야 함)
      await multiSig.connect(user1).approveTransaction(0);
      await expect(
        multiSig.connect(deployer).executeTransaction(0)
      ).to.not.be.reverted;
    });
  });

  describe('Social Engineering Protection', () => {
    it('should implement role recovery mechanism', async () => {
      // 역할 복구 메커니즘
      const RoleRecoveryFactory = await ethers.getContractFactory('RoleRecovery');
      const roleRecovery = await RoleRecoveryFactory.deploy();
      await roleRecovery.deployed();

      // 역할 상실 시나리오
      await roleRecovery.grantRole(await roleRecovery.ADMIN_ROLE(), user1.address);
      await roleRecovery.connect(user1).renounceRole(await roleRecovery.ADMIN_ROLE(), user1.address);

      // 복구 메커니즘 실행
      await roleRecovery.initiateRoleRecovery(user1.address, await roleRecovery.ADMIN_ROLE());
      
      // 지연 시간 후 복구
      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]); // 7일 지연
      await roleRecovery.completeRoleRecovery(0);
      
      expect(await roleRecovery.hasRole(await roleRecovery.ADMIN_ROLE(), user1.address)).to.be.true;
    });
  });

  describe('Privacy Protection', () => {
    it('should protect sensitive data on-chain', async () => {
      // 개인정보 보호
      const PrivacyProtectionFactory = await ethers.getContractFactory('PrivacyProtection');
      const privacyProtection = await PrivacyProtectionFactory.deploy();
      await privacyProtection.deployed();

      // 해시값으로 데이터 저장
      const sensitiveData = 'personal_information';
      const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(sensitiveData));
      
      await privacyProtection.storeDataHash(dataHash);
      
      // 실제 데이터는 체인에 저장되지 않음
      const retrievedHash = await privacyProtection.getDataHash(user1.address);
      expect(retrievedHash).to.equal(dataHash);
      
      // 원본 데이터 복구 불가
      expect(retrievedHash).to.not.equal(ethers.utils.toUtf8Bytes(sensitiveData));
    });
  });
});

// 보조 컨트랙트 정의들
const MaliciousReentrancyContract = `
contract MaliciousReentrancyContract {
    IMarketplace public marketplace;
    
    constructor(address _marketplace) {
        marketplace = IMarketplace(_marketplace);
    }
    
    function attack() external payable {
        marketplace.buyNFT{value: msg.value}(1);
    }
    
    receive() external payable {
        if (address(marketplace).balance > 0) {
            marketplace.buyNFT(1);
        }
    }
}
`;

const FlashLoanAttackContract = `
contract FlashLoanAttackContract {
    IDAO public dao;
    IERC20 public token;
    
    constructor(address _dao, address _token) {
        dao = IDAO(_dao);
        token = IERC20(_token);
    }
    
    function executeAttack() external {
        // 플래시 론 요청
        IFlashLoanProvider(flashLoanProvider).requestFlashLoan(
            address(token),
            1000000 * 10**18,
            this,
            ""
        );
    }
    
    function executeOperation(address _token, uint256 _amount, uint256 _fee, bytes calldata _data) external {
        // 플래시 론으로 받은 토큰으로 투표
        dao.vote(1, true);
        
        // 플래시 론 상환
        _token.transfer(msg.sender, _amount + _fee);
    }
}
`;

// 가스 그리핑 공격 계약
const OutOfGasAttack = `
contract OutOfGasAttack {
    IMarketplace public marketplace;
    
    constructor(address _marketplace) {
        marketplace = IMarketplace(_marketplace);
    }
    
    function attack() external {
        // 무한 루프로 가스 소진
        while (true) {
            // 무작위 연산
        }
    }
}
`;
