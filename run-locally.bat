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
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. For more information, see 
about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:1 char:1
+ npm run dev
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess

 *  The terminal process "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -Command npm run dev" terminated with exit code: 1. 
 *  Press any key to close the terminal. 
