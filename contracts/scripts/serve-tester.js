// Serve the contract tester page: http://localhost:5174
//
//   npm run tester             local chain (needs `npx hardhat node` + `npm run deploy:local`)
//   npm run tester -- sepolia  Sepolia (needs `npm run deploy:sepolia`)
//
// Works offline: ethers is served from node_modules, not a CDN. On Sepolia the page
// signs with the demo wallets from .env; the server only listens on 127.0.0.1, so
// those test keys never leave this computer.
const http = require("http");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const root = path.join(__dirname, "..");
const NETWORK = process.argv[2] || process.env.TESTER_NETWORK || "localhost";
const PORT = Number(process.env.PORT || 5174);
const KEY_NAMES = ["DEMO_OWNER_KEY", "DEMO_GUARDIAN1_KEY", "DEMO_GUARDIAN2_KEY", "DEMO_GUARDIAN3_KEY",
                   "DEMO_BENEFICIARY_KEY", "DEMO_NEWPHONE_KEY", "DEMO_AMMA_KEY", "DEMO_RAHUL_KEY"];
const routes = {
  "/": ["tester/index.html", "text/html; charset=utf-8"],
  "/ethers.js": ["node_modules/ethers/dist/ethers.umd.min.js", "text/javascript"],
  "/deployment.json": [`deployments/${NETWORK}.json`, "application/json"],
};

function send(res, code, type, body) {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/favicon.ico") { res.writeHead(204); return res.end(); }
  if (url === "/demo-keys.json") {
    // Local Hardhat accounts are unlocked; only a real network needs the demo keys.
    const keys = KEY_NAMES.map((k) => process.env[k]);
    if (NETWORK === "localhost" || keys.some((k) => !k)) {
      return send(res, 200, "application/json", JSON.stringify({ keys: null }));
    }
    return send(res, 200, "application/json", JSON.stringify({ keys }));
  }
  const route = routes[url];
  if (!route) return send(res, 404, "text/plain", "not found");
  fs.readFile(path.join(root, route[0]), (err, body) => {
    if (err) {
      return send(res, 404, "text/plain", url === "/deployment.json"
        ? `No deployments/${NETWORK}.json: deploy to ${NETWORK} first.` : "not found");
    }
    send(res, 200, route[1], body);
  });
}).listen(PORT, "127.0.0.1", () => console.log(`SayPayVault tester (${NETWORK}): http://localhost:${PORT}`));
