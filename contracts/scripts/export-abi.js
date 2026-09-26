// Write abi/SayPayVault.json (ABI only) for the frontend, after `npx hardhat compile`.
const fs = require("fs");
const path = require("path");
const art = require("../artifacts/contracts/SayPayVault.sol/SayPayVault.json");
fs.mkdirSync(path.join(__dirname, "..", "abi"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "..", "abi", "SayPayVault.json"), JSON.stringify(art.abi, null, 2));
console.log("wrote abi/SayPayVault.json");
