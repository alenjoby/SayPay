// Serve the contract tester page: http://localhost:5174
// Needs `npx hardhat node` and `npm run deploy:local` first. Works offline:
// ethers is served from node_modules, not a CDN.
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 5174);
const routes = {
  "/": ["tester/index.html", "text/html; charset=utf-8"],
  "/ethers.js": ["node_modules/ethers/dist/ethers.umd.min.js", "text/javascript"],
  "/deployment.json": ["deployments/localhost.json", "application/json"],
};

http.createServer((req, res) => {
  if (req.url === "/favicon.ico") { res.writeHead(204); return res.end(); }
  const route = routes[req.url.split("?")[0]];
  if (!route) { res.writeHead(404); return res.end("not found"); }
  fs.readFile(path.join(root, route[0]), (err, body) => {
    if (err) {
      res.writeHead(404);
      return res.end(req.url === "/deployment.json"
        ? "no deployment: run `npm run deploy:local` first" : "not found");
    }
    res.writeHead(200, { "Content-Type": route[1], "Cache-Control": "no-store" });
    res.end(body);
  });
}).listen(PORT, "127.0.0.1", () => console.log(`SayPayVault tester: http://localhost:${PORT}`));
