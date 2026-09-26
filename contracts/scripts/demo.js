// Demo helper: acts as the *other people* (guardians, family, time) on the local chain,
// so the demo can stay in the SayPay app. Run from contracts/ while the app is open:
//
//   npm run demo deposit       Amma sends 0.1 ETH to the vault          -> app: "Received..."
//   npm run demo recovery      Guardian Ahmed starts moving the wallet   -> app interrupts
//   npm run demo approve       Guardian Priya approves the recovery
//   npm run demo skip          jump 2 minutes ahead (the timers are 2 minutes)
//   npm run demo inheritance   skip 2 minutes + start the inheritance    -> app interrupts
//   npm run demo status        print the vault's state
//
// Local chain only (uses the node's unlocked test accounts).
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "localhost.json"), "utf8"));
const provider = new ethers.JsonRpcProvider(dep.rpcUrl || "http://127.0.0.1:8545");
const person = (name) => dep.people.find((p) => p.name === name).address;
const as = async (name) => new ethers.Contract(dep.address, dep.abi, await provider.getSigner(person(name)));

async function skip(seconds = 125) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
  console.log(`Skipped ${Math.round(seconds / 60)} minutes.`);
}

async function run(label, txPromise) {
  const tx = await txPromise;
  await tx.wait();
  console.log(`${label}  (tx ${tx.hash.slice(0, 10)}...)`);
}

const actions = {
  async deposit() {
    const amma = await provider.getSigner(person("Amma"));
    await run("Amma sent 0.1 ETH to the vault.", amma.sendTransaction({ to: dep.address, value: ethers.parseEther("0.1") }));
  },
  async recovery() {
    const v = await as("Guardian Ahmed");
    await run("Guardian Ahmed proposed moving the wallet to the new phone.", v.proposeRecovery(person("New phone")));
  },
  async approve() {
    const v = await as("Guardian Priya");
    await run("Guardian Priya approved the recovery (2 of 2).", v.approveRecovery(person("New phone")));
  },
  skip: () => skip(),
  async inheritance() {
    await skip();
    const v = await as("Beneficiary Sara");
    await run("Sara started the inheritance (owner inactive).", v.startInheritance());
  },
  async status() {
    const v = new ethers.Contract(dep.address, dep.abi, provider);
    const s = await v.status();
    console.log(`Balance: ${ethers.formatEther(await provider.getBalance(dep.address))} ETH`);
    console.log(s.toObject ? s.toObject() : s);
  },
};

const cmd = process.argv[2];
if (!actions[cmd]) {
  console.log(`Usage: npm run demo <${Object.keys(actions).join("|")}>`);
  process.exit(1);
}
actions[cmd]().catch((e) => {
  let reason = e.shortMessage || e.message;
  try { reason = new ethers.Interface(dep.abi).parseError(e.data ?? e.info?.error?.data?.data).name; } catch {}
  const hint = {
    RecoveryActive: "A recovery is already running. Say \"cancel recovery\" in the app first.",
    NoRecovery: "No recovery is running. Run `npm run demo recovery` first.",
    AlreadyApproved: "That guardian already approved.",
    OwnerStillActive: "The owner was active recently. Run `npm run demo skip` and try again.",
    InheritanceActive: "The inheritance is already running.",
  }[reason];
  console.error(`Failed: ${hint || reason}`);
  if (/ECONNREFUSED/.test(String(e.message))) console.error("Is the local chain running (start.bat or `npx hardhat node`)?");
  process.exit(1);
});
