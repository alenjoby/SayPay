// Deploy SayPayVault and write deployments/<network>.json (address + ABI + people) for the apps.
//
// Local:   npx hardhat node            (terminal 1)
//          npm run deploy:local        (terminal 2) -> uses the node's test accounts
// Sepolia: node scripts/make-demo-wallets.js   (once: creates the demo people's wallets)
//          npm run deploy:sepolia               (deploys from DEPLOYER_PRIVATE_KEY, funds everyone)
//
// Demo-wallet mode (DEMO_*_KEY set in .env): the generated wallets play owner phone,
// guardians, beneficiary and new phone; the deployer only pays: it funds the vault and
// tops up each person's gas. Private keys are never written to the deployment file.
const fs = require("fs");
const path = require("path");
const { ethers, network, artifacts } = require("hardhat");

// Same order as the tester page's people list.
const PEOPLE = [
  ["DEMO_OWNER_KEY", "Owner phone", "owner"],
  ["DEMO_GUARDIAN1_KEY", "Guardian Ahmed", "guardian"],
  ["DEMO_GUARDIAN2_KEY", "Guardian Priya", "guardian"],
  ["DEMO_GUARDIAN3_KEY", "Guardian Khalid", "guardian"],
  ["DEMO_BENEFICIARY_KEY", "Beneficiary Sara", "beneficiary"],
  ["DEMO_NEWPHONE_KEY", "New phone", ""],
  ["DEMO_AMMA_KEY", "Amma", ""],
  ["DEMO_RAHUL_KEY", "Rahul", ""],
];
const EXPLORERS = { sepolia: "https://sepolia.etherscan.io" };

async function main() {
  const env = process.env;
  const [deployer, ...signers] = await ethers.getSigners();
  const local = ["hardhat", "localhost"].includes(network.name);
  // Demo wallets are for real networks; the local node's unlocked test accounts are simpler.
  const demo = !local && PEOPLE.every(([k]) => env[k]);

  let people; // [{name, role, address}]
  if (demo) {
    people = PEOPLE.map(([k, name, role]) => ({ name, role, address: new ethers.Wallet(env[k]).address }));
  } else if (local) {
    // Test accounts: 0 owner, 1-3 guardians, 4 beneficiary, 5 new phone, 6 Amma, 7 Rahul.
    const all = [deployer, ...signers];
    people = PEOPLE.map(([, name, role], i) => ({ name, role, address: all[i].address }));
  } else {
    throw new Error("Run `node scripts/make-demo-wallets.js` first (creates the demo people's wallets in .env).");
  }

  const pick = (role) => people.filter((p) => p.role === role).map((p) => p.address);
  const owner = pick("owner")[0];
  const guardians = pick("guardian");
  const beneficiary = pick("beneficiary")[0];
  const threshold = Number(env.VAULT_THRESHOLD || 2);
  const timer = Number(env.VAULT_TIMER_SECONDS || 120); // demo: 2 minutes for all three
  const funding = ethers.parseEther(env.VAULT_FUNDING_ETH || (local ? "2.5" : "0.1"));
  const gasTopUp = ethers.parseEther(env.GAS_TOPUP_ETH || (local ? "0" : "0.02"));

  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer ${deployer.address} on ${network.name}: ${ethers.formatEther(bal)} ETH`);

  const Vault = await ethers.getContractFactory("SayPayVault", deployer);
  const vault = await Vault.deploy(owner, guardians, threshold, beneficiary, timer, timer, timer,
                                   { value: funding });
  console.log(`Deploying… tx ${vault.deploymentTransaction().hash}`);
  await vault.waitForDeployment();
  const address = await vault.getAddress();
  const receipt = await vault.deploymentTransaction().wait();
  console.log(`SayPayVault deployed to ${address} (block ${receipt.blockNumber}), funded ${ethers.formatEther(funding)} ETH`);

  // Gas money for everyone who will sign transactions in the demo (skipped if they have enough).
  if (gasTopUp > 0n) {
    for (const p of people) {
      const have = await ethers.provider.getBalance(p.address);
      if (have >= gasTopUp) continue;
      const tx = await deployer.sendTransaction({ to: p.address, value: gasTopUp - have });
      await tx.wait();
      console.log(`  gas for ${p.name.padEnd(17)} ${ethers.formatEther(gasTopUp - have)} ETH`);
    }
  }

  const explorer = EXPLORERS[network.name] || null;
  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    rpcUrl: local ? "http://127.0.0.1:8545" : network.config.url,
    explorer,
    address,
    deployBlock: receipt.blockNumber,
    owner, guardians, threshold, beneficiary,
    timers: { inactivityPeriod: timer, recoveryDelay: timer, gracePeriod: timer },
    people,
    abi: (await artifacts.readArtifact("SayPayVault")).abi,
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2));

  console.log(`guardians ${guardians.length} (need ${threshold}), timers ${timer}s`);
  console.log(`wrote deployments/${network.name}.json`);
  if (explorer) {
    console.log(`\nContract: ${explorer}/address/${address}`);
    console.log(`Next: npm run verify:sepolia   (publishes the source code on Etherscan)`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
