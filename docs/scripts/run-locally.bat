@echo off
title NeerNetra Web Platform - Local Server
echo ========================================================
echo       NEERNETRA TACTICAL COMMAND PLATFORM (LOCAL)
echo ========================================================
echo.
cd /d "%~dp0web"
echo [1/2] Checking node_modules...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)
echo.
echo [2/2] Starting NeerNetra Next.js Local Server...
echo Platform URL: http://localhost:3000
echo.
call npm run dev
pause
