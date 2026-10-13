@echo off
title NeerNetra Backend API Engine
echo ========================================================
echo       NEERNETRA FASTAPI BACKEND SERVER (LOCAL)
echo ========================================================
echo.
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
    echo Python virtual environment not found in .venv!
    pause
    exit /b 1
)
echo Starting NeerNetra Backend on http://localhost:8000 ...
echo API Docs: http://localhost:8000/docs
echo.
call .venv\Scripts\python.exe main.py
pause
