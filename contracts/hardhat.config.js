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

const { SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

module.exports = {
  solidity: {
    version: SOLC,
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" },
    ...(SEPOLIA_RPC_URL && DEPLOYER_PRIVATE_KEY
      ? { sepolia: { url: SEPOLIA_RPC_URL, accounts: [DEPLOYER_PRIVATE_KEY] } }
      : {}),
  },
  etherscan: { apiKey: ETHERSCAN_API_KEY || "" },
};
