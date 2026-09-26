#!/usr/bin/env bash
# SayPay: one command to install (first run only) and start everything.
#
#   ./start.sh
#
# Starts the voice model (:8000), a local blockchain with the SayPayVault
# contract (:8545), the app (:5173) and the contract tester (:5174), then opens
# the app. Ctrl+C stops everything. Logs: ./logs/
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$PWD
LOGS=$ROOT/logs
mkdir -p "$LOGS"

step() { printf '\033[1;33m> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  %s\033[0m\n' "$*"; }
die()  { # message [log]
  printf '\033[1;31mX %s\033[0m\n' "$1"
  if [ -n "${2:-}" ] && [ -f "$2" ]; then printf '  Last lines of %s:\n' "$2"; tail -n 15 "$2" | sed 's/^/    /'; fi
  exit 1
}

# ---- 1. Prerequisites --------------------------------------------------------
PY=$(command -v python3 || command -v python || true)
[ -n "$PY" ] || die "Python 3.11+ is needed: https://www.python.org/downloads/"
"$PY" -c 'import sys; sys.exit(sys.version_info < (3, 11))' \
  || die "Python 3.11+ is needed (found $("$PY" --version 2>&1))."
command -v node >/dev/null || die "Node.js 20+ is needed: https://nodejs.org"
node -e 'process.exit(+process.versions.node.split(".")[0] < 20 ? 1 : 0)' \
  || die "Node.js 20+ is needed (found $(node --version))."

# IPv4 or IPv6: Vite listens on "localhost", which may resolve to ::1 only.
port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null || (exec 3<>"/dev/tcp/::1/$1") 2>/dev/null; }
for p in 8000 8545 5173 5174; do
  port_open "$p" && die "Port $p is already in use. Is SayPay already running? Close it and try again."
done

# ---- 2. Install (first run, or when dependencies changed) ----------------------
hash_of() { "$PY" -c 'import hashlib,sys; print(hashlib.sha256(open(sys.argv[1],"rb").read()).hexdigest())' "$1"; }

VENV=ml/.venv
VPY=$VENV/bin/python
STAMP=$VENV/.saypay-installed
if [ ! -x "$VPY" ] || [ "$(cat "$STAMP" 2>/dev/null)" != "$(hash_of ml/requirements.txt)" ]; then
  step "Installing the voice model (first run: 1-3 minutes)..."
  [ -x "$VPY" ] || "$PY" -m venv "$VENV"
  "$VPY" -m pip install -q --upgrade pip >"$LOGS/install-ml.log" 2>&1
  # Core packages first; onnxruntime/tokenizers only power the optional mmBERT model.
  grep -vE '^(onnxruntime|tokenizers)' ml/requirements.txt >"$LOGS/requirements-core.txt"
  "$VPY" -m pip install -q -r "$LOGS/requirements-core.txt" >>"$LOGS/install-ml.log" 2>&1 \
    || die "Installing the voice model failed." "$LOGS/install-ml.log"
  "$VPY" -m pip install -q onnxruntime tokenizers >>"$LOGS/install-ml.log" 2>&1 \
    || ok "Optional mmBERT support skipped (not available for this Python); the main model works."
  hash_of ml/requirements.txt >"$STAMP"
fi

for dir in contracts frontend; do
  if [ ! -d "$dir/node_modules" ] || [ "$dir/package-lock.json" -nt "$dir/node_modules/.package-lock.json" ]; then
    step "Installing $dir (first run: 1-2 minutes)..."
    (cd "$dir" && npm install --no-audit --no-fund >"$LOGS/install-$dir.log" 2>&1) \
      || die "Installing $dir failed." "$LOGS/install-$dir.log"
  fi
done

# ---- 3. Start everything -----------------------------------------------------
PIDS=()
set -m # each background service in its own process group, so Ctrl+C stops all of it
cleanup() {
  trap - INT TERM EXIT
  echo
  step "Stopping SayPay..."
  for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill -- "-$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

start() { # name dir command...
  local name=$1 dir=$2; shift 2
  (cd "$dir" && exec "$@") >"$LOGS/$name.log" 2>&1 &
  PIDS+=("$!")
}
wait_port() { # port name seconds
  for _ in $(seq 1 "$3"); do port_open "$1" && return 0; sleep 1; done
  die "$2 did not start." "$LOGS/$2.log"
}

step "Starting the local blockchain..."
start chain contracts npx hardhat node
wait_port 8545 chain 60
(cd contracts && npm run -s deploy:local) >"$LOGS/deploy.log" 2>&1 || die "Deploying the contract failed." "$LOGS/deploy.log"
ok "SayPayVault deployed with 2.5 test ETH"

step "Starting the voice model..."
start model ml "$ROOT/$VPY" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
wait_port 8000 model 90
ok "$(curl -s localhost:8000/health 2>/dev/null | "$PY" -c 'import json,sys; print("Model engine: " + json.load(sys.stdin)["engine"])' 2>/dev/null || echo 'Model running')"

step "Starting the app and the contract tester..."
start tester contracts node scripts/serve-tester.js
start app frontend npx vite --port 5173 --strictPort
wait_port 5173 app 60
wait_port 5174 tester 30

URL=http://localhost:5173
printf '\n\033[1;32mSayPay is running.\033[0m\n'
printf '  App:             %s   (Chrome or Edge; hold Space to talk)\n' "$URL"
printf '  Contract tester: http://localhost:5174   (guardians / beneficiary)\n'
printf '  Press Ctrl+C here to stop everything.\n\n'
if [ -z "${SAYPAY_NO_BROWSER:-}" ]; then
  (command -v xdg-open >/dev/null && xdg-open "$URL" || command -v open >/dev/null && open "$URL") >/dev/null 2>&1 || true
fi

wait
