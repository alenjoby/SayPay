# SayPay: one command to install (first run only) and start everything (Windows).
#
#   Double-click start.bat   (or:  powershell -ExecutionPolicy Bypass -File start.ps1)
#
# Starts the voice model (:8000), a local blockchain with the SayPayVault
# contract (:8545), the app (:5173) and the contract tester (:5174), then opens
# the app. Press Enter (or close the window) to stop everything. Logs: .\logs\
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot
$Root = $PSScriptRoot
$Logs = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

function Step($m) { Write-Host "> $m" -ForegroundColor Yellow }
function Ok($m)   { Write-Host "  $m" -ForegroundColor Green }
function Die($m, $log = $null) {
  Write-Host "X $m" -ForegroundColor Red
  if ($log -and (Test-Path $log)) {
    Write-Host "  Last lines of $log :" -ForegroundColor DarkGray
    Get-Content $log -Tail 15 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
  }
  Read-Host 'Press Enter to close'
  exit 1
}

# ---- 1. Prerequisites --------------------------------------------------------
$py = $null
foreach ($c in @('python', 'py')) {
  if (Get-Command $c -ErrorAction SilentlyContinue) {
    # Via cmd: the Microsoft Store "python" stub writes to stderr, which PowerShell 5 treats as fatal.
    cmd /c "$c -c `"import sys; sys.exit(sys.version_info < (3, 11))`" >nul 2>&1"
    if ($LASTEXITCODE -eq 0) { $py = $c; break }
  }
}
if (-not $py) { Die 'Python 3.11 or newer is needed: https://www.python.org/downloads/ (tick "Add python.exe to PATH").' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Die 'Node.js 20 or newer is needed: https://nodejs.org' }
$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) { Die "Node.js 20 or newer is needed (found $(node --version))." }

# Checks IPv4 and IPv6: on Windows, Vite listens on "localhost", which Node may resolve to ::1 only.
function Test-Port($port) {
  foreach ($addr in [Net.IPAddress]::Loopback, [Net.IPAddress]::IPv6Loopback) {
    $c = New-Object Net.Sockets.TcpClient($addr.AddressFamily)
    try { if ($c.ConnectAsync($addr, $port).Wait(300)) { return $true } } catch { } finally { $c.Dispose() }
  }
  return $false
}
foreach ($p in 8000, 8545, 5173, 5174) {
  if (Test-Port $p) { Die "Port $p is already in use. SayPay may still be running: double-click stop.bat, then try again." }
}

# ---- 2. Install (first run, or when dependencies changed) ----------------------
$venvPy = Join-Path $Root 'ml\.venv\Scripts\python.exe'
$stamp  = Join-Path $Root 'ml\.venv\.saypay-installed'
$reqHash = (Get-FileHash (Join-Path $Root 'ml\requirements.txt') -Algorithm SHA256).Hash
if (-not (Test-Path $venvPy) -or -not (Test-Path $stamp) -or ((Get-Content $stamp -Raw).Trim() -ne $reqHash)) {
  Step 'Installing the voice model (first run: 1-3 minutes)...'
  if (-not (Test-Path $venvPy)) { & $py -m venv (Join-Path $Root 'ml\.venv') }
  # Via cmd, with outer quotes (cmd strips one pair when a line starts with a quoted path),
  # so pip's warnings on stderr don't count as errors in PowerShell 5.
  cmd /c "`"`"$venvPy`" -m pip install -q --upgrade pip > `"$Logs\install-ml.log`" 2>&1`""
  # Core packages first. onnxruntime/tokenizers only power the optional mmBERT model and
  # may have no build yet for the newest Python, so they are tried separately.
  $core = Join-Path $Logs 'requirements-core.txt'
  Get-Content (Join-Path $Root 'ml\requirements.txt') | Where-Object { $_ -notmatch '^(onnxruntime|tokenizers)' } | Set-Content $core
  cmd /c "`"`"$venvPy`" -m pip install -q -r `"$core`" >> `"$Logs\install-ml.log`" 2>&1`""
  if ($LASTEXITCODE -ne 0) { Die 'Installing the voice model failed.' (Join-Path $Logs 'install-ml.log') }
  cmd /c "`"`"$venvPy`" -m pip install -q onnxruntime tokenizers >> `"$Logs\install-ml.log`" 2>&1`""
  if ($LASTEXITCODE -ne 0) { Ok 'Optional mmBERT support skipped (not available for this Python); the main model works.' }
  Set-Content -Path $stamp -Value $reqHash
}

foreach ($dir in 'contracts', 'frontend') {
  $nm = Join-Path $Root "$dir\node_modules"
  $lockNewer = (Test-Path "$nm\.package-lock.json") -and
    ((Get-Item "$Root\$dir\package-lock.json").LastWriteTime -gt (Get-Item "$nm\.package-lock.json").LastWriteTime)
  if (-not (Test-Path $nm) -or $lockNewer) {
    Step "Installing $dir (first run: 1-2 minutes)..."
    Push-Location (Join-Path $Root $dir)
    # npm install (not ci): updates in place, so a file still locked by an old dev server doesn't break it.
    cmd /c "npm install --no-audit --no-fund > `"$Logs\install-$dir.log`" 2>&1"
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) { Die "Installing $dir failed. If it mentions EPERM or EBUSY, close VS Code and other terminals and try again." (Join-Path $Logs "install-$dir.log") }
  }
}

# ---- 3. Start everything -----------------------------------------------------
$procs = @()
function Start-SayPayService($name, $dir, $command) {
  $log = Join-Path $Logs "$name.log"
  # Outer quotes: cmd strips one pair when the command itself starts with a quoted path.
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList "/c `"$command > `"$log`" 2>&1`"" `
    -WorkingDirectory (Join-Path $Root $dir) -WindowStyle Hidden -PassThru
  $script:procs += $p
}
function Stop-All {
  Step 'Stopping SayPay...'
  foreach ($p in $script:procs) { cmd /c "taskkill /PID $($p.Id) /T /F >nul 2>&1" }
}
function Wait-Port($port, $name, $seconds) {
  for ($i = 0; $i -lt $seconds; $i++) { if (Test-Port $port) { return }; Start-Sleep -Seconds 1 }
  Stop-All
  Die "$name did not start." (Join-Path $Logs "$name.log")
}

try {
  Step 'Starting the local blockchain...'
  Start-SayPayService 'chain' 'contracts' 'npx hardhat node'
  Wait-Port 8545 'chain' 60
  Push-Location (Join-Path $Root 'contracts')
  cmd /c "npm run -s deploy:local > `"$Logs\deploy.log`" 2>&1"
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Stop-All; Die 'Deploying the contract failed.' (Join-Path $Logs 'deploy.log') }
  Ok 'SayPayVault deployed with 2.5 test ETH'

  Step 'Starting the voice model...'
  Start-SayPayService 'model' 'ml' "`"$venvPy`" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
  Wait-Port 8000 'model' 90
  try { Ok ('Model engine: ' + (Invoke-RestMethod 'http://127.0.0.1:8000/health').engine) } catch { Ok 'Model running' }

  Step 'Starting the app and the contract tester...'
  Start-SayPayService 'tester' 'contracts' 'node scripts/serve-tester.js'
  Start-SayPayService 'app' 'frontend' 'npx vite --port 5173 --strictPort'
  Wait-Port 5173 'app' 60
  Wait-Port 5174 'tester' 30

  Write-Host ''
  Write-Host 'SayPay is running.' -ForegroundColor Green
  Write-Host '  App:             http://localhost:5173   (Chrome or Edge; tap Space to talk)'
  Write-Host '  Contract tester: http://127.0.0.1:5174   (guardians / beneficiary)'
  Write-Host ''
  if (-not $env:SAYPAY_NO_BROWSER) { Start-Process 'http://localhost:5173' }
  Read-Host 'Press Enter here to stop everything'
}
finally {
  Stop-All
}
