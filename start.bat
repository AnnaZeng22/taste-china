@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo =========================================
echo   🥢 Taste China — Preview Server
echo =========================================
echo.

if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    echo.
)

echo 🚀 Starting server...
echo.
echo   📱 iPhone Preview: http://localhost:8787/iphone-preview.html
echo   🖥️  Full Screen:    http://localhost:8787/
echo.
echo Press Ctrl+C to stop
echo =========================================
echo.

node server/index.mjs
pause
