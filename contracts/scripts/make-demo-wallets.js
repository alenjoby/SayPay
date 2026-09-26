// Create the demo people's test wallets and save their keys in .env (git-ignored).
//
//   node scripts/make-demo-wallets.js
//
// Owner phone, 3 guardians, the beneficiary, a "new phone" for the recovery demo,
// and two contacts (Amma, Rahul). Run it once: it never overwrites existing keys.
// These are throwaway TEST wallets. Never put real money in them.
const fs = require("fs");
const path = require("path");
const { Wallet } = require("ethers");

const PEOPLE = [
  ["DEMO_OWNER_KEY", "Owner phone"],
  ["DEMO_GUARDIAN1_KEY", "Guardian Ahmed"],
  ["DEMO_GUARDIAN2_KEY", "Guardian Priya"],
  ["DEMO_GUARDIAN3_KEY", "Guardian Khalid"],
  ["DEMO_BENEFICIARY_KEY", "Beneficiary Sara"],
  ["DEMO_NEWPHONE_KEY", "New phone"],
  ["DEMO_AMMA_KEY", "Amma"],
  ["DEMO_RAHUL_KEY", "Rahul"],
];

const envPath = path.join(__dirname, "..", ".env");
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const has = (k) => new RegExp(`^${k}=0x[0-9a-fA-F]{64}\\b`, "m").test(env);

const added = [];
for (const [key, name] of PEOPLE) {
  if (has(key)) continue;
  const w = Wallet.createRandom();
  env += `${env && !env.endsWith("\n") ? "\n" : ""}# ${name} ${w.address}\n${key}=${w.privateKey}\n`;
  added.push(name);
}
fs.writeFileSync(envPath, env);

console.log(added.length ? `Created: ${added.join(", ")}` : "All demo wallets already exist.");
for (const [key, name] of PEOPLE) {
  const m = env.match(new RegExp(`^${key}=(0x[0-9a-fA-F]{64})`, "m"));
  console.log(`${name.padEnd(18)} ${new Wallet(m[1]).address}`);
}
console.log(`\nKeys saved in ${envPath} (git-ignored). Next: npm run deploy:sepolia`);
