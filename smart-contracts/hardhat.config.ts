import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";
import "hardhat-contract-sizer";
import "@openzeppelin/hardhat-upgrades";
import dotenv from "dotenv";

dotenv.config();

/**
 * Hardhat 설정
 * 
 * DIY 크래프팅 월드 스마트 컨트랙트 개발을 위한 Hardhat 설정
 */
const config: HardhatUserConfig = {
  // Solidity 버전 설정
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    ],
  },

  // 네트워크 설정
  networks: {
    // 로컬 개발 네트워크
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
      gas: 12000000,
      blockGasLimit: 12000000,
      gasPrice: 20000000000,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: "",
      },
    },

    // 로컬 네트워크
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      gas: "auto",
      gasPrice: "auto",
    },

    // 테스트넷
    testnet: {
      url: process.env.TESTNET_RPC_URL || "https://testnet.creatachain.org",
      chainId: parseInt(process.env.TESTNET_CHAIN_ID || "11111", 10),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1.2,
    },

    // 메인넷
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://mainnet.creatachain.org",
      chainId: parseInt(process.env.MAINNET_CHAIN_ID || "4337", 10),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1.1,
    },

    // Polygon
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      chainId: 137,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: "auto",
    },

    // BSC
    bsc: {
      url: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: "auto",
    },
  },

  // Etherscan 검증 설정
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      testnet: process.env.TESTNET_ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
    },
  },

  // Gas Reporter 설정
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 21,
    token: "ETH",
    showTimeSpent: true,
    showMethodSig: true,
    onlyCalledMethods: true,
    src: "./contracts",
    excludeContracts: ["Migrations", "test"],
  },

  // Contract Size 설정
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [":ERC", ":VoxelCraft"],
  },

  // TypeChain 설정
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v5",
    alwaysGenerateOverloads: false,
    externalArtifacts: ["externalArtifacts/*.json"],
  },

  // Docgen 설정
  docgen: {
    path: "./docs",
    clear: true,
    runOnCompile: true,
    except: ["test"],
  },

  // 경로 설정
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
    deployments: "./deployments",
  },

  // 모듈 이름 매핑
  namedAccounts: {
    deployer: {
      default: 0,
      testnet: 0,
      mainnet: 0,
    },
    tokenOwner: {
      default: 1,
      testnet: 1,
      mainnet: 1,
    },
    marketplaceFeeRecipient: {
      default: 2,
      testnet: 2,
      mainnet: 2,
    },
  },

  // 컴파일러 설정
  mocha: {
    timeout: 40000,
    retries: 2,
  },

  // 성능 최적화
  external: {
    contracts: [
      {
        artifacts: "node_modules/@chainlink/contracts/abi/v0.8",
        deploy: "node_modules/@chainlink/contracts/deploy",
      },
    ],
  },
};

export default config;
