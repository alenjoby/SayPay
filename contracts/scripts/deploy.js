// Deploy SayPayVault and write deployments/<network>.json (address + ABI) for the web app.
//
// Local:   npx hardhat node            (terminal 1)
//          npm run deploy:local        (terminal 2) -> uses the node's test accounts
// Sepolia: fill .env (see .env.example), then npm run deploy:sepolia
const fs = require("fs");
const path = require("path");
const { ethers, network, artifacts } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const local = ["hardhat", "localhost"].includes(network.name);
  const env = process.env;
  const list = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

  // Local runs use test accounts: 0 deployer/owner, 1-3 guardians, 4 beneficiary.
  const owner = env.VAULT_OWNER || (local ? signers[0].address : signers[0].address);
  const guardians = list(env.VAULT_GUARDIANS).length
    ? list(env.VAULT_GUARDIANS)
    : local ? signers.slice(1, 4).map((s) => s.address) : [];
  const beneficiary = env.VAULT_BENEFICIARY || (local ? signers[4].address : "");
  const threshold = Number(env.VAULT_THRESHOLD || 2);
  const timer = Number(env.VAULT_TIMER_SECONDS || 120); // demo: 2 minutes for all three
  const funding = ethers.parseEther(env.VAULT_FUNDING_ETH || (local ? "2.5" : "0"));

  if (guardians.length < 2 || !beneficiary) {
    throw new Error("Set VAULT_GUARDIANS (2-3 addresses, comma separated) and VAULT_BENEFICIARY");
  }

  const Vault = await ethers.getContractFactory("SayPayVault");
  const vault = await Vault.deploy(owner, guardians, threshold, beneficiary, timer, timer, timer,
                                   { value: funding });
  await vault.waitForDeployment();
  const address = await vault.getAddress();
  const receipt = await vault.deploymentTransaction().wait();

  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    address,
    deployBlock: receipt.blockNumber,
    owner, guardians, threshold, beneficiary,
    timers: { inactivityPeriod: timer, recoveryDelay: timer, gracePeriod: timer },
    abi: (await artifacts.readArtifact("SayPayVault")).abi,
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2));

  console.log(`SayPayVault deployed to ${address} on ${network.name} (block ${receipt.blockNumber})`);
  console.log(`owner ${owner}\nguardians ${guardians.join(", ")} (need ${threshold})`);
  console.log(`beneficiary ${beneficiary}\ntimers ${timer}s, funded ${ethers.formatEther(funding)} ETH`);
  console.log(`wrote deployments/${network.name}.json`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
