import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const BSC_TESTNET_RPC_URL =
  process.env.BSC_TESTNET_RPC_URL ?? "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
const BSC_MAINNET_RPC_URL =
  process.env.BSC_MAINNET_RPC_URL ?? "https://bsc-dataseed.binance.org";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    hardhat: {},
    bscTestnet: {
      url: BSC_TESTNET_RPC_URL,
      chainId: 97,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    },
    bscMainnet: {
      url: BSC_MAINNET_RPC_URL,
      chainId: 56,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "bscTestnet",
        chainId: 97,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=97",
          browserURL: "https://testnet.bscscan.com"
        }
      },
      {
        network: "bscMainnet",
        chainId: 56,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=56",
          browserURL: "https://bscscan.com"
        }
      }
    ]
  },
  sourcify: {
    enabled: false
  }
};

export default config;
