require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

const SOLC = "0.8.28";

// Compile with the solc npm package (installed by `npm install`) instead of
// downloading a compiler: works offline and behind strict firewalls (venue wifi).
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async ({ solcVersion }, hre, runSuper) => {
  if (solcVersion !== SOLC) return runSuper();
  const solc = require("solc");
  return {
    compilerPath: require.resolve("solc/soljson.js"),
    isSolcJs: true,
    version: solcVersion,
    longVersion: solc.version(),
  };
});

const { ETHERSCAN_API_KEY } = process.env;
// MetaMask exports keys without "0x"; accept both, and ignore placeholders like "0x...".
const rawKey = (process.env.DEPLOYER_PRIVATE_KEY || "").trim();
const DEPLOYER_PRIVATE_KEY = /^(0x)?[0-9a-fA-F]{64}$/.test(rawKey)
  ? (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`)
  : null;
// Free public endpoint, no signup; set SEPOLIA_RPC_URL to use Alchemy/Infura instead.
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

module.exports = {
  solidity: {
    version: SOLC,
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" },
    sepolia: { url: SEPOLIA_RPC_URL, accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [] },
  },
  etherscan: { apiKey: ETHERSCAN_API_KEY || "" }, // one key works for Sepolia (Etherscan API v2)
  sourcify: { enabled: true }, // also publish on Sourcify (no key needed)
};
