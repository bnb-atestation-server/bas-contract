import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-chai-matchers";
import "@openzeppelin/hardhat-upgrades";

import * as dotenv from "dotenv";
dotenv.config();


const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
const BNB_RPC = process.env.BNB_RPC as string;
const BNB_TEST_RPC = process.env.BNB_TEST_RPC as string;
const API_KEY = process.env.API_KEY as string;
const OPBNB_RPC = process.env.OPBNB_RPC as string;
const OPBNB_TEST_RPC = process.env.OPBNB_TEST_RPC as string

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
      viaIR: true,
      metadata: {
        bytecodeHash: 'none'
      }
    }
  },
  networks:{
    ["bnb-test"]: {
      chainId: 97,
      url: BNB_TEST_RPC,
      accounts: [PRIVATE_KEY]
    },
    ["bnb"]:{
      chainId:56,
      url: BNB_RPC,
      accounts:[PRIVATE_KEY]
    },
    ["opBNB"]:{
      chainId: 204,
      url: OPBNB_RPC,
      accounts: [PRIVATE_KEY],
      gasPrice: 15
    },
    ["opBNB-test"]:{
      chainId: 5611,
      url: OPBNB_TEST_RPC,
      accounts: [PRIVATE_KEY],
      gasPrice: 10008
    },
    localhost:{
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  etherscan:{
    apiKey: {
        bsc:API_KEY,
        opBNB:API_KEY,
        "bnb-test":API_KEY
    },
    customChains: [
      {
        network: "opBNB",
        chainId: 204,
        urls: {
          apiURL: "https://api-opbnb.bscscan.com/api",
          browserURL: "https://opbnb.bscscan.com/"
        }
      },
      {
        network: "opBNB-test",
        chainId: 5611,
        urls: {
          apiURL: "https://api-opbnb-testnet.bscscan.com/api",
          browserURL: "https://opbnb-testnet.bscscan.com/"
        }
      },
      {
        network: "bnb-test",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com/"
        }
      }
    ]
  },
  sourcify: {
    enabled: true
  }
};

export default config;
