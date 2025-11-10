# Simple & Reliable Biometric Agent Installer
# This installer NEVER closes unexpectedly - it always shows errors and waits

param(
    [switch]$SkipAdminCheck
)

# CRITICAL: Prevent window from closing on ANY error
$ErrorActionPreference = "SilentlyContinue"
$ProgressPreference = "SilentlyContinue"

# Trap ALL errors to prevent window closure
trap {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  UNEXPECTED ERROR OCCURRED" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Error Line: $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press ENTER to exit"
    exit 1
}

# Function to pause and wait for user - GUARANTEED to work
function Pause-WithMessage {
    param(
        [string]$Message = "Press ENTER to continue..."
    )
    Write-Host ""
    Write-Host $Message -ForegroundColor Yellow
    Read-Host
}

# Function to show error and wait
function Show-Error {
    param([string]$ErrorMessage)
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  ERROR" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ $ErrorMessage" -ForegroundColor Red
    Write-Host ""
}

# Clear screen and show banner
Clear-Host
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Fitverse Biometric Agent Installer" -ForegroundColor White
Write-Host "  Simple & Reliable Edition" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$InstallDir = $PSScriptRoot
$ServiceName = "FitverseBiometricAgent"
$AgentPort = 5001

Write-Host "📁 Installation Directory: $InstallDir" -ForegroundColor Cyan
Write-Host ""

# Check 1: Administrator Privileges
Write-Host "[1/6] Checking Administrator privileges..." -ForegroundColor Yellow
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-NOT $IsAdmin -and -NOT $SkipAdminCheck) {
    Show-Error "Administrator privileges required!"
    Write-Host "How to fix:" -ForegroundColor Yellow
    Write-Host "  1. Close this window" -ForegroundColor White
    Write-Host "  2. Right-click: simple-installer.ps1" -ForegroundColor White
    Write-Host "  3. Select: 'Run with PowerShell' (as Administrator)" -ForegroundColor White
    Write-Host ""
    Write-Host "Or open PowerShell as Admin and run:" -ForegroundColor Yellow
    Write-Host "  cd '$InstallDir'" -ForegroundColor Cyan
    Write-Host "  .\simple-installer.ps1" -ForegroundColor Cyan
    Pause-WithMessage
    exit 1
}
Write-Host "  ✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Check 2: Node.js
Write-Host "[2/6] Checking Node.js installation..." -ForegroundColor Yellow
$NodeCheckOutput = & node --version 2>&1
if ($LASTEXITCODE -eq 0 -and $NodeCheckOutput) {
    Write-Host "  ✅ Node.js: $NodeCheckOutput" -ForegroundColor Green
} else {
    Show-Error "Node.js is not installed or not in PATH!"
    Write-Host "Download Node.js from: https://nodejs.org" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installing Node.js:" -ForegroundColor Cyan
    Write-Host "  1. Restart your computer" -ForegroundColor White
    Write-Host "  2. Run this installer again" -ForegroundColor White
    Write-Host ""
    try {
        $OpenBrowser = Read-Host "Open Node.js download page? (y/N)"
        if ($OpenBrowser -eq "y" -or $OpenBrowser -eq "Y") {
            Start-Process "https://nodejs.org/en/download/" -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "Opening https://nodejs.org/en/download/" -ForegroundColor Yellow
        Start-Process "https://nodejs.org/en/download/" -ErrorAction SilentlyContinue
    }
    Pause-WithMessage
    exit 1
}
Write-Host ""

# Check 3: npm
Write-Host "[3/6] Checking npm..." -ForegroundColor Yellow
$NpmCheckOutput = & npm --version 2>&1
if ($LASTEXITCODE -eq 0 -and $NpmCheckOutput) {
    Write-Host "  ✅ npm: $NpmCheckOutput" -ForegroundColor Green
} else {
    Show-Error "npm is not available!"
    Write-Host "npm comes with Node.js. Please reinstall from: https://nodejs.org" -ForegroundColor Yellow
    Pause-WithMessage
    exit 1
}
Write-Host ""

# Check 4: Stop existing service
Write-Host "[4/6] Checking for existing service..." -ForegroundColor Yellow
$ExistingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($ExistingService) {
    Write-Host "  ⚠️  Found existing service, removing..." -ForegroundColor Yellow
    if ($ExistingService.Status -eq "Running") {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
    Write-Host "  ✅ Old service removed" -ForegroundColor Green
} else {
    Write-Host "  ✅ No existing service found" -ForegroundColor Green
}
Write-Host ""

# Check 5: Setup package.json
Write-Host "[5/6] Setting up package.json..." -ForegroundColor Yellow
$PackageJson = Join-Path $InstallDir "package.json"
$EnhancedPackageJson = Join-Path $InstallDir "enhanced-package.json"

if (-not (Test-Path $PackageJson)) {
    if (Test-Path $EnhancedPackageJson) {
        Copy-Item $EnhancedPackageJson $PackageJson -Force
        Write-Host "  ✅ package.json created from enhanced-package.json" -ForegroundColor Green
    } else {
        Show-Error "No package.json found!"
        Write-Host "Make sure enhanced-package.json or package.json exists in:" -ForegroundColor Yellow
        Write-Host "  $InstallDir" -ForegroundColor White
        Pause-WithMessage
        exit 1
    }
} else {
    Write-Host "  ✅ package.json exists" -ForegroundColor Green
}
Write-Host ""

# Check 6: Install dependencies
Write-Host "[6/6] Installing npm dependencies..." -ForegroundColor Yellow
Write-Host "  This will take 2-3 minutes, please wait..." -ForegroundColor Gray
Write-Host ""

$OriginalLocation = Get-Location
Set-Location $InstallDir

# Clean old node_modules
if (Test-Path "node_modules") {
    Write-Host "  🧹 Cleaning old installation..." -ForegroundColor Cyan
    try {
        Remove-Item "node_modules" -Recurse -Force -ErrorAction Stop
    } catch {
        Write-Host "  ⚠️  Could not fully clean old installation (this is OK)" -ForegroundColor Yellow
    }
}

# Run npm install with verbose output
Write-Host "  📦 Downloading packages..." -ForegroundColor Cyan
Write-Host "  (This may show some warnings - ignore them)" -ForegroundColor Gray
Write-Host ""

$NpmInstallFailed = $false
try {
    & npm install --production --loglevel=error 2>&1 | Tee-Object -Variable NpmOutput | Out-Host
    if ($LASTEXITCODE -ne 0) {
        $NpmInstallFailed = $true
    }
} catch {
    $NpmInstallFailed = $true
    $NpmOutput = $_.Exception.Message
}

Set-Location $OriginalLocation

if ($NpmInstallFailed) {
    Show-Error "npm install failed!"
    Write-Host "Common solutions:" -ForegroundColor Yellow
    Write-Host "  1. Check internet connection" -ForegroundColor White
    Write-Host "  2. Run in cmd: npm cache clean --force" -ForegroundColor Cyan
    Write-Host "  3. Delete node_modules folder manually and try again" -ForegroundColor White
    Write-Host "  4. Disable antivirus temporarily" -ForegroundColor White
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Yellow
    Write-Host $NpmOutput -ForegroundColor Gray
    Write-Host ""
    Pause-WithMessage
    exit 1
}

Write-Host ""
Write-Host "  ✅ Dependencies installed successfully!" -ForegroundColor Green
Write-Host ""

# Install Windows Service
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Installing Windows Service..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$OriginalLocation = Get-Location
Set-Location $InstallDir

try {
    $ServiceOutput = & node enhanced-service-manager.js install 2>&1 | Out-String
    Write-Host $ServiceOutput
} catch {
    Write-Host "Service installation output:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Gray
}

Set-Location $OriginalLocation
Write-Host ""

# Wait for service to start
Write-Host "⏳ Waiting for service to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check service status
$NewService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($NewService) {
    if ($NewService.Status -eq "Running") {
        Write-Host "✅ Service is RUNNING!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Service installed but not running yet" -ForegroundColor Yellow
        Write-Host "   Attempting to start..." -ForegroundColor Gray
        Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        
        $NewService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($NewService.Status -eq "Running") {
            Write-Host "✅ Service started successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Service may need manual start" -ForegroundColor Yellow
            Write-Host "   Run: services.msc" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "⚠️  Service installation may have issues" -ForegroundColor Yellow
}

Write-Host ""

# Test connectivity
Write-Host "🌐 Testing agent connectivity..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$AgentWorking = $false
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:$AgentPort/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($Response -and $Response.StatusCode -eq 200) {
        Write-Host "✅ Agent is responding at http://localhost:$AgentPort" -ForegroundColor Green
        $AgentWorking = $true
    }
} catch {
    # Silently fail - not critical
}

if (-not $AgentWorking) {
    Write-Host "⚠️  Agent not responding yet (may need a moment to start)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  INSTALLATION COMPLETE!" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

if ($AgentWorking) {
    Write-Host "🎉 The biometric agent is running and ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access at: http://localhost:$AgentPort" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Opening in browser in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    try {
        Start-Process "http://localhost:$AgentPort" -ErrorAction SilentlyContinue
    } catch {
        Write-Host "Please open manually: http://localhost:$AgentPort" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  The agent may need a few moments to fully start" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Check status:" -ForegroundColor Yellow
    Write-Host "  • Open services.msc" -ForegroundColor White
    Write-Host "  • Find: $ServiceName" -ForegroundColor White
    Write-Host "  • Status should be: Running" -ForegroundColor White
    Write-Host ""
    Write-Host "Access at: http://localhost:$AgentPort" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Management:" -ForegroundColor Yellow
Write-Host "  • Service Manager: manage-service.bat" -ForegroundColor White
Write-Host "  • Control: node enhanced-service-manager.js [command]" -ForegroundColor White
Write-Host ""

Write-Host "Installation complete! Window will stay open for you to review." -ForegroundColor Green
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press ENTER to close this window"
exit 0
