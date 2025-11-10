# Enhanced Fitverse Biometric Agent Installer (PowerShell)
# Version 3.0 - Fully Automated Production Setup
# Requires: Windows 10/11, PowerShell 5.1+, Administrator privileges

# Set console encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Configuration
$ErrorActionPreference = "Continue"  # Changed from "Stop" to prevent immediate closure
$ServiceName = "FitverseBiometricAgent"
$InstallDir = $PSScriptRoot
$LogFile = Join-Path $InstallDir "installation.log"
$AgentPort = 5001

# Colors for output
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Step { Write-Host "📋 $args" -ForegroundColor Blue }

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $LogMessage
    
    switch ($Level) {
        "SUCCESS" { Write-Success $Message }
        "ERROR" { Write-Error $Message }
        "WARNING" { Write-Warning $Message }
        default { Write-Info $Message }
    }
}

# Set up global error handler to prevent window closing
trap {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "           UNEXPECTED ERROR - INSTALLER STOPPED" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ An unexpected error occurred:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor White
    Write-Host ""
    Write-Host "📍 Error Location:" -ForegroundColor Yellow
    Write-Host "   Line: $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor White
    Write-Host "   Command: $($_.InvocationInfo.Line.Trim())" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Please report this error if it persists." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Banner
Clear-Host
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "     Enhanced Fitverse Biometric Agent Installer v3.0" -ForegroundColor White
Write-Host "                  FULLY AUTOMATED SETUP" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Initialize log (with error handling)
try {
    "" | Out-File -FilePath $LogFile -Force -ErrorAction Stop
    Write-Log "Starting Enhanced Biometric Agent Installation" "INFO"
    Write-Log "Installation Directory: $InstallDir" "INFO"
} catch {
    Write-Host "⚠️  Warning: Could not create log file. Continuing anyway..." -ForegroundColor Yellow
}

try {
    # Step 1: Check Administrator privileges (with pause on error)
    Write-Step "Checking administrator privileges..."
    $IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
    
    if (-NOT $IsAdmin) {
        Write-Log "ERROR: Administrator privileges required!" "ERROR"
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
        Write-Host "                   ADMINISTRATOR REQUIRED" -ForegroundColor Red
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
        Write-Host ""
        Write-Host "❌ This installer must be run as Administrator." -ForegroundColor Red
        Write-Host ""
        Write-Host "📋 How to run as Administrator:" -ForegroundColor Yellow
        Write-Host "   1. Close this window" -ForegroundColor White
        Write-Host "   2. Right-click on: enhanced-installer.ps1" -ForegroundColor White
        Write-Host "   3. Select: 'Run with PowerShell' (as Administrator)" -ForegroundColor White
        Write-Host ""
        Write-Host "   OR:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   1. Open PowerShell as Administrator" -ForegroundColor White
        Write-Host "   2. Run: cd '$PSScriptRoot'" -ForegroundColor Cyan
        Write-Host "   3. Run: .\enhanced-installer.ps1" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
        Write-Host ""
        Write-Host "Press any key to exit..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Write-Log "Administrator privileges confirmed" "SUCCESS"

    # Step 2: Check Node.js
    Write-Step "Checking Node.js installation..."
    try {
        $NodeVersion = node --version 2>$null
        if ($NodeVersion) {
            Write-Log "Node.js version: $NodeVersion" "SUCCESS"
        } else {
            throw "Node.js not found"
        }
    } catch {
        Write-Log "Node.js is not installed or not in PATH" "ERROR"
        Write-Host ""
        Write-Error "Node.js is not installed!"
        Write-Host ""
        Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
        Write-Host "Recommended version: 18.x or higher" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "After installing Node.js, run this installer again." -ForegroundColor Cyan
        Write-Host ""
        Read-Host "Press Enter to open Node.js download page"
        Start-Process "https://nodejs.org/en/download/"
        exit 1
    }

    # Step 3: Check npm
    Write-Step "Checking npm..."
    try {
        $NpmVersion = npm --version 2>$null
        Write-Log "npm version: $NpmVersion" "SUCCESS"
    } catch {
        Write-Log "npm not found" "ERROR"
        Write-Error "npm is not available. Please reinstall Node.js."
        Read-Host "Press Enter to exit"
        exit 1
    }

    # Step 4: Check port availability
    Write-Step "Checking port $AgentPort availability..."
    $PortInUse = Get-NetTCPConnection -LocalPort $AgentPort -ErrorAction SilentlyContinue
    if ($PortInUse) {
        Write-Log "Port $AgentPort is in use" "WARNING"
        Write-Warning "Port $AgentPort is currently in use."
        Write-Host "This may indicate another biometric agent is running." -ForegroundColor Yellow
        Write-Host ""
        $Continue = Read-Host "Continue anyway? (y/N)"
        if ($Continue -ne "y" -and $Continue -ne "Y") {
            Write-Log "Installation cancelled by user" "INFO"
            exit 0
        }
    } else {
        Write-Log "Port $AgentPort is available" "SUCCESS"
    }

    # Step 5: Stop and remove existing service
    Write-Step "Checking for existing service..."
    $ExistingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($ExistingService) {
        Write-Log "Found existing service, removing..." "WARNING"
        Write-Host "🛑 Stopping existing biometric agent service..." -ForegroundColor Yellow
        
        if ($ExistingService.Status -eq "Running") {
            Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
        }
        
        Write-Host "🗑️  Uninstalling existing service..." -ForegroundColor Yellow
        sc.exe delete $ServiceName | Out-Null
        Start-Sleep -Seconds 2
        Write-Log "Existing service removed" "SUCCESS"
    }

    # Step 6: Create necessary directories
    Write-Step "Creating directories..."
    $LogsDir = Join-Path $InstallDir "logs"
    $ConfigDir = Join-Path $InstallDir "config"
    
    if (-not (Test-Path $LogsDir)) {
        New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
        Write-Log "Created logs directory" "SUCCESS"
    }
    
    if (-not (Test-Path $ConfigDir)) {
        New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
        Write-Log "Created config directory" "SUCCESS"
    }

    # Step 7: Verify required files
    Write-Step "Verifying required files..."
    $RequiredFiles = @("enhanced-agent.js", "enhanced-service-manager.js")
    foreach ($File in $RequiredFiles) {
        $FilePath = Join-Path $InstallDir $File
        if (-not (Test-Path $FilePath)) {
            Write-Log "Required file missing: $File" "ERROR"
            Write-Error "Required file not found: $File"
            Write-Host "Please ensure all files are in the installation directory." -ForegroundColor Yellow
            Read-Host "Press Enter to exit"
            exit 1
        }
        Write-Log "Found: $File" "SUCCESS"
    }

    # Step 8: Setup package.json
    Write-Step "Checking package configuration..."
    $PackageJson = Join-Path $InstallDir "package.json"
    $EnhancedPackageJson = Join-Path $InstallDir "enhanced-package.json"
    
    if (-not (Test-Path $PackageJson)) {
        if (Test-Path $EnhancedPackageJson) {
            Write-Log "Copying enhanced-package.json to package.json..." "INFO"
            Write-Host "📋 Setting up package configuration..." -ForegroundColor Cyan
            Copy-Item $EnhancedPackageJson $PackageJson -Force
            Write-Log "package.json created successfully" "SUCCESS"
        } else {
            Write-Log "No package.json or enhanced-package.json found" "ERROR"
            Write-Error "package.json not found"
            Read-Host "Press Enter to exit"
            exit 1
        }
    } else {
        Write-Log "package.json exists" "SUCCESS"
    }

    # Step 9: Install npm dependencies
    Write-Step "Installing npm dependencies (this may take 2-3 minutes)..."
    Write-Host "   Please wait, downloading packages..." -ForegroundColor Yellow
    Write-Host ""
    
    # Clean old node_modules
    $NodeModules = Join-Path $InstallDir "node_modules"
    if (Test-Path $NodeModules) {
        Write-Log "Cleaning old node_modules..." "INFO"
        Write-Host "🧹 Cleaning previous installation..." -ForegroundColor Cyan
        Remove-Item $NodeModules -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Run npm install
    Push-Location $InstallDir
    Write-Log "Running npm install..." "INFO"
    
    $NpmOutput = npm install --production --loglevel=error 2>&1 | Out-String
    Write-Log "npm install output: $NpmOutput" "INFO"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "npm install failed with exit code: $LASTEXITCODE" "ERROR"
        Write-Error "Failed to install npm dependencies."
        Write-Host ""
        Write-Host "💡 Common solutions:" -ForegroundColor Yellow
        Write-Host "   1. Ensure you have a stable internet connection" -ForegroundColor White
        Write-Host "   2. Try running 'npm cache clean --force'" -ForegroundColor White
        Write-Host "   3. Check if npm registry is accessible" -ForegroundColor White
        Write-Host ""
        Write-Host "📄 Full error log: $LogFile" -ForegroundColor Cyan
        Write-Host ""
        Read-Host "Press Enter to exit"
        Pop-Location
        exit 1
    }
    
    Pop-Location
    
    # Verify critical dependencies
    Write-Log "Verifying installed dependencies..." "INFO"
    $ExpressPath = Join-Path $NodeModules "express"
    $NodeWindowsPath = Join-Path $NodeModules "node-windows"
    
    if (-not (Test-Path $ExpressPath)) {
        Write-Log "express module not installed properly" "ERROR"
        Write-Error "Critical dependency 'express' not found"
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    if (-not (Test-Path $NodeWindowsPath)) {
        Write-Log "node-windows module not installed properly" "ERROR"
        Write-Error "Critical dependency 'node-windows' not found"
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    Write-Log "npm dependencies installed and verified successfully" "SUCCESS"

    # Step 10: Install Windows service
    Write-Step "Installing Windows service..."
    Write-Host "🔧 Registering biometric agent as Windows service..." -ForegroundColor Cyan
    Write-Host ""
    
    Push-Location $InstallDir
    $ServiceOutput = node enhanced-service-manager.js install 2>&1 | Out-String
    Write-Log "Service installation output: $ServiceOutput" "INFO"
    Pop-Location
    
    # Wait for service to initialize
    Write-Host "⏳ Waiting for service to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Verify service installation
    $NewService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($NewService) {
        Write-Log "Service installation completed" "SUCCESS"
        
        # Check if service is running
        if ($NewService.Status -eq "Running") {
            Write-Success "Service is running successfully!"
        } else {
            Write-Warning "Service installed but not running. Attempting to start..."
            Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            
            $NewService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
            if ($NewService.Status -eq "Running") {
                Write-Success "Service started successfully!"
            } else {
                Write-Warning "Service failed to start automatically."
                Write-Host "You can start it manually from Windows Services." -ForegroundColor Yellow
            }
        }
    } else {
        Write-Log "Service installation may have failed" "WARNING"
        Write-Warning "Service installation completed but service not found."
    }

    # Step 11: Test agent connectivity
    Write-Step "Testing agent connectivity..."
    Start-Sleep -Seconds 2
    
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:$AgentPort/health" -TimeoutSec 10 -UseBasicParsing
        if ($Response.StatusCode -eq 200) {
            Write-Log "Agent connectivity test passed" "SUCCESS"
            Write-Success "Agent is responding on http://localhost:$AgentPort"
            $AgentRunning = $true
        }
    } catch {
        Write-Log "Agent connectivity test failed" "WARNING"
        Write-Warning "Agent may not be responding yet (this is sometimes normal)"
        $AgentRunning = $false
    }

    # Step 12: Configure Windows Firewall
    Write-Step "Configuring Windows Firewall..."
    $FirewallRule = Get-NetFirewallRule -DisplayName "Fitverse Biometric Agent" -ErrorAction SilentlyContinue
    if (-not $FirewallRule) {
        try {
            New-NetFirewallRule -DisplayName "Fitverse Biometric Agent" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $AgentPort | Out-Null
            Write-Log "Firewall rule added for port $AgentPort" "SUCCESS"
        } catch {
            Write-Log "Could not configure firewall automatically" "WARNING"
            Write-Warning "Could not configure firewall automatically. You may need to manually allow port $AgentPort"
        }
    } else {
        Write-Log "Firewall rule already exists" "SUCCESS"
    }

    # Step 13: Create management shortcut
    Write-Step "Creating management shortcuts..."
    $ManagementScript = Join-Path $InstallDir "manage-service.bat"
    
    @"
@echo off
title Fitverse Biometric Agent Service Manager
:menu
cls
echo ==========================================
echo Fitverse Biometric Agent Service Manager
echo ==========================================
echo.
echo 1. Check Status
echo 2. Start Service
echo 3. Stop Service
echo 4. Restart Service
echo 5. View Logs
echo 6. Open Agent Web Interface
echo 7. Exit
echo.
set /p choice=Select option (1-7): 
if "%choice%"=="1" node enhanced-service-manager.js status && pause && goto menu
if "%choice%"=="2" node enhanced-service-manager.js start && pause && goto menu
if "%choice%"=="3" node enhanced-service-manager.js stop && pause && goto menu
if "%choice%"=="4" node enhanced-service-manager.js restart && pause && goto menu
if "%choice%"=="5" type logs\*.log 2>nul || echo No logs found && pause && goto menu
if "%choice%"=="6" start http://localhost:$AgentPort && goto menu
if "%choice%"=="7" exit
goto menu
"@ | Out-File -FilePath $ManagementScript -Encoding ASCII -Force
    
    Write-Log "Management shortcut created" "SUCCESS"

    # Final Summary
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "         INSTALLATION COMPLETED SUCCESSFULLY!" -ForegroundColor White
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📋 Service Information:" -ForegroundColor Cyan
    Write-Host "   Name: $ServiceName" -ForegroundColor White
    Write-Host "   Installation: $InstallDir" -ForegroundColor White
    Write-Host "   Port: $AgentPort" -ForegroundColor White
    Write-Host "   Log File: $LogFile" -ForegroundColor White
    Write-Host ""
    
    Write-Host "🌐 Agent URLs:" -ForegroundColor Cyan
    Write-Host "   Main Interface: http://localhost:$AgentPort" -ForegroundColor White
    Write-Host "   Health Check: http://localhost:$AgentPort/health" -ForegroundColor White
    Write-Host "   Device Status: http://localhost:$AgentPort/api/devices" -ForegroundColor White
    Write-Host ""
    
    Write-Host "🛠️  Management:" -ForegroundColor Cyan
    Write-Host "   Service Manager: manage-service.bat" -ForegroundColor White
    Write-Host "   Direct Control: node enhanced-service-manager.js [command]" -ForegroundColor White
    Write-Host "   Windows Services: services.msc" -ForegroundColor White
    Write-Host ""
    
    if ($AgentRunning) {
        Write-Success "The biometric agent is now running and ready to use!"
    } else {
        Write-Warning "The agent may need a few more moments to fully start."
        Write-Host "   Check the status in a minute using: manage-service.bat" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "📚 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Opening agent web interface..." -ForegroundColor White
    Write-Host "   2. Configure your gym admin system to use: http://localhost:$AgentPort" -ForegroundColor White
    Write-Host "   3. Use manage-service.bat for ongoing management" -ForegroundColor White
    Write-Host "   4. Check logs if you encounter any issues" -ForegroundColor White
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Log "Installation process completed successfully" "SUCCESS"
    
    # Auto-open agent interface
    Write-Host ""
    Write-Host "🌐 Opening agent web interface in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:$AgentPort"
    
    Write-Host ""
    Write-Host "✨ Setup completed! This window will close in 10 seconds..." -ForegroundColor Green
    Write-Host "   (Press any key to close now)" -ForegroundColor Gray
    Write-Host ""
    
    $timeout = 10
    $null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") -Timeout $timeout
    
    exit 0

} catch {
    # Error handling - NEVER close immediately, always show error
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "                    INSTALLATION FAILED" -ForegroundColor White
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    
    Write-Host "❌ The installation encountered critical errors and cannot continue." -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Error Details:" -ForegroundColor Yellow
    Write-Host "   $($_.Exception.Message)" -ForegroundColor White
    Write-Host ""
    
    if (Test-Path $LogFile) {
        Write-Host "📄 Log File: $LogFile" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "💡 Troubleshooting Steps:" -ForegroundColor Yellow
    Write-Host "   1. Ensure Node.js is installed (download from nodejs.org)" -ForegroundColor White
    Write-Host "   2. Run this installer as Administrator" -ForegroundColor White
    Write-Host "   3. Check your internet connection for npm downloads" -ForegroundColor White
    Write-Host "   4. Disable antivirus temporarily during installation" -ForegroundColor White
    Write-Host "   5. Ensure port $AgentPort is not blocked by firewall" -ForegroundColor White
    Write-Host ""
    Write-Host "🔍 Common Issues & Solutions:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   ❌ 'Node.js not found'" -ForegroundColor Red
    Write-Host "      → Install from https://nodejs.org (LTS version)" -ForegroundColor Green
    Write-Host ""
    Write-Host "   ❌ 'Administrator privileges required'" -ForegroundColor Red
    Write-Host "      → Right-click script → Run as Administrator" -ForegroundColor Green
    Write-Host ""
    Write-Host "   ❌ 'Port 5001 in use'" -ForegroundColor Red
    Write-Host "      → Close any apps using port 5001" -ForegroundColor Green
    Write-Host "      → Run: netstat -ano | findstr :5001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   ❌ 'npm install failed'" -ForegroundColor Red
    Write-Host "      → Check internet connection" -ForegroundColor Green
    Write-Host "      → Run: npm cache clean --force" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Red
    
    Write-Log "Installation failed with error: $($_.Exception.Message)" "ERROR"
    
    Write-Host ""
    
    # Show log if it exists
    if (Test-Path $LogFile) {
        $ShowLog = Read-Host "View full installation log? (y/N)"
        if ($ShowLog -eq "y" -or $ShowLog -eq "Y") {
            Write-Host ""
            Write-Host "═══════════════ Installation Log ═══════════════" -ForegroundColor Cyan
            Get-Content $LogFile | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
            Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
        }
    }
    
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
