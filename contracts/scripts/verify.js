// Publish the contract's source code on Etherscan (and Sourcify) for the deployed vault.
//
//   npm run verify:sepolia
//
// Needs ETHERSCAN_API_KEY in .env for Etherscan (free: etherscan.io -> API Keys).
// Sourcify needs no key. Reads the address and constructor arguments from
// deployments/<network>.json, so run it after deploy.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const file = path.join(__dirname, "..", "deployments", `${hre.network.name}.json`);
  if (!fs.existsSync(file)) throw new Error(`No ${file}: deploy first.`);
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  const t = d.timers;
  const constructorArguments = [d.owner, d.guardians, d.threshold, d.beneficiary,
                                t.inactivityPeriod, t.recoveryDelay, t.gracePeriod];
  try {
    await hre.run("verify:verify", { address: d.address, constructorArguments });
  } catch (e) {
    if (!/already verified/i.test(String(e.message))) throw e;
    console.log("Already verified.");
  }
  if (d.explorer) console.log(`\nSource code: ${d.explorer}/address/${d.address}#code`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
