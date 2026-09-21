@echo off
title ELearnAI - Starting Frontend & Backend
cd /d "%~dp0"

echo ============================================================
echo               ELearnAI Full-Stack Launcher
echo ============================================================
echo.
echo Starting Backend and Frontend servers...
echo Press Ctrl+C in this window to stop both servers.
echo.

REM Check if root node_modules exists, install if missing
if not exist "node_modules\" (
    echo [INFO] Root node_modules not found. Installing dependencies...
    call npm install
)

REM Run both Frontend and Backend concurrently using root package.json script
npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] 'npm run dev' failed. Attempting to start in separate windows...
    start "ELearnAI Backend" cmd /k "cd /d %~dp0Backend && npm run dev"
    start "ELearnAI Frontend" cmd /k "cd /d %~dp0Frontend && npm run dev"
)

pause
