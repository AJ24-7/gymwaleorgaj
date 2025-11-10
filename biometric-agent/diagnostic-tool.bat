@echo off
:: Quick Diagnostic Tool for Fitverse Biometric Agent
:: Run this if you're having installation issues

title Fitverse Biometric Agent - Diagnostic Tool

echo.
echo ================================================================
echo    Fitverse Biometric Agent - Diagnostic Tool
echo ================================================================
echo.

echo Running system checks...
echo.

:: Check 1: Node.js
echo [1/8] Checking Node.js...
node --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%a in ('node --version 2^>nul') do echo   ✅ Node.js: %%a
) else (
    echo   ❌ Node.js NOT FOUND
    echo      Download from: https://nodejs.org
)
echo.

:: Check 2: npm
echo [2/8] Checking npm...
npm --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%a in ('npm --version 2^>nul') do echo   ✅ npm: %%a
) else (
    echo   ❌ npm NOT FOUND
)
echo.

:: Check 3: Administrator
echo [3/8] Checking Administrator privileges...
net session >nul 2>&1
if %errorLevel% equ 0 (
    echo   ✅ Running as Administrator
) else (
    echo   ❌ NOT running as Administrator
    echo      Right-click and "Run as Administrator"
)
echo.

:: Check 4: Port 5001
echo [4/8] Checking port 5001...
netstat -ano | findstr ":5001" >nul 2>&1
if %errorLevel% equ 0 (
    echo   ⚠️  Port 5001 is IN USE
    echo      Something is already running on this port
    netstat -ano | findstr ":5001"
) else (
    echo   ✅ Port 5001 is available
)
echo.

:: Check 5: Service Status
echo [5/8] Checking service status...
sc query "FitverseBiometricAgent" >nul 2>&1
if %errorLevel% equ 0 (
    echo   ℹ️  Service EXISTS
    sc query "FitverseBiometricAgent" | findstr "RUNNING" >nul 2>&1
    if %errorLevel% equ 0 (
        echo   ✅ Service is RUNNING
    ) else (
        echo   ⚠️  Service is STOPPED
    )
) else (
    echo   ℹ️  Service NOT INSTALLED
)
echo.

:: Check 6: Required Files
echo [6/8] Checking required files...
set "INSTALL_DIR=%~dp0"
if exist "%INSTALL_DIR%enhanced-agent.js" (
    echo   ✅ enhanced-agent.js found
) else (
    echo   ❌ enhanced-agent.js NOT FOUND
)

if exist "%INSTALL_DIR%enhanced-service-manager.js" (
    echo   ✅ enhanced-service-manager.js found
) else (
    echo   ❌ enhanced-service-manager.js NOT FOUND
)

if exist "%INSTALL_DIR%package.json" (
    echo   ✅ package.json found
) else (
    if exist "%INSTALL_DIR%enhanced-package.json" (
        echo   ℹ️  enhanced-package.json found (will be copied during install)
    ) else (
        echo   ❌ No package.json or enhanced-package.json found
    )
)
echo.

:: Check 7: Dependencies
echo [7/8] Checking npm dependencies...
if exist "%INSTALL_DIR%node_modules" (
    if exist "%INSTALL_DIR%node_modules\express" (
        echo   ✅ express installed
    ) else (
        echo   ❌ express NOT installed
    )
    
    if exist "%INSTALL_DIR%node_modules\node-windows" (
        echo   ✅ node-windows installed
    ) else (
        echo   ❌ node-windows NOT installed
    )
) else (
    echo   ℹ️  node_modules folder not found (run installer first)
)
echo.

:: Check 8: Connectivity Test
echo [8/8] Testing agent connectivity...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5001/health' -TimeoutSec 5 -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host '   ✅ Agent is RESPONDING' -ForegroundColor Green; exit 0 } else { Write-Host '   ❌ Agent returned error' -ForegroundColor Red; exit 1 } } catch { Write-Host '   ❌ Agent NOT RESPONDING' -ForegroundColor Red; exit 1 }"

echo.
echo ================================================================
echo                      DIAGNOSTIC COMPLETE
echo ================================================================
echo.

:: Summary and Recommendations
echo 📋 Summary:
echo.

:: Determine overall status
set "ISSUES=0"

node --version >nul 2>&1
if %errorLevel% neq 0 set /A ISSUES+=1

npm --version >nul 2>&1
if %errorLevel% neq 0 set /A ISSUES+=1

net session >nul 2>&1
if %errorLevel% neq 0 set /A ISSUES+=1

if %ISSUES% gtr 0 (
    echo ⚠️  Found %ISSUES% critical issue(s)
    echo.
    echo 💡 Recommended actions:
    
    node --version >nul 2>&1
    if %errorLevel% neq 0 (
        echo    1. Install Node.js from https://nodejs.org
    )
    
    net session >nul 2>&1
    if %errorLevel% neq 0 (
        echo    2. Run this diagnostic as Administrator
    )
    
    echo    3. After fixing issues, run the installer
) else (
    sc query "FitverseBiometricAgent" >nul 2>&1
    if %errorLevel% equ 0 (
        sc query "FitverseBiometricAgent" | findstr "RUNNING" >nul 2>&1
        if %errorLevel% equ 0 (
            echo ✅ System looks good! Agent is running.
            echo.
            echo 🌐 Access at: http://localhost:5001
        ) else (
            echo ℹ️  Service installed but not running.
            echo.
            echo 💡 Try starting it:
            echo    node enhanced-service-manager.js start
        )
    ) else (
        echo ℹ️  System is ready for installation!
        echo.
        echo 💡 Run one of these installers:
        echo    • enhanced-installer.ps1 (Right-click → Run with PowerShell) - RECOMMENDED
        echo    • enhanced-installer.bat (Right-click → Run as Administrator)
    )
)

echo.
echo ================================================================
echo.

:: Offer quick actions
echo Quick Actions:
echo   1. Run PowerShell Installer
echo   2. Run BAT Installer  
echo   3. Start Service (if installed)
echo   4. View Logs
echo   5. Open Agent Web Interface
echo   6. Exit
echo.
set /p action=Select option (1-6): 

if "%action%"=="1" (
    echo.
    echo Starting PowerShell installer...
    powershell -ExecutionPolicy Bypass -File "%INSTALL_DIR%enhanced-installer.ps1"
)

if "%action%"=="2" (
    echo.
    echo Starting BAT installer...
    call "%INSTALL_DIR%enhanced-installer.bat"
)

if "%action%"=="3" (
    echo.
    echo Starting service...
    node enhanced-service-manager.js start
    pause
)

if "%action%"=="4" (
    echo.
    if exist "%INSTALL_DIR%installation.log" (
        type "%INSTALL_DIR%installation.log"
    ) else (
        echo No installation log found.
    )
    echo.
    if exist "%INSTALL_DIR%logs" (
        dir /B "%INSTALL_DIR%logs\*.log" >nul 2>&1
        if %errorLevel% equ 0 (
            echo.
            echo Recent service logs:
            type "%INSTALL_DIR%logs\*.log" 2>nul
        )
    )
    pause
)

if "%action%"=="5" (
    echo.
    echo Opening http://localhost:5001...
    start http://localhost:5001
)

if "%action%"=="6" exit

pause
