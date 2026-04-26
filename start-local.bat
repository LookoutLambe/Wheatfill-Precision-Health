@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install it from https://nodejs.org/ and re-run this file.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found.
  echo Reinstall Node.js and re-run this file.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

if not exist "backend\node_modules" (
  echo Installing backend API dependencies...
  pushd backend
  call npm install
  if errorlevel 1 (
    echo backend npm install failed.
    popd
    pause
    exit /b 1
  )
  popd
)

echo.
echo Starting the API in a new window (http://localhost:8080^) — leave it open.
start "WPH API (port 8080)" cmd /k "cd /d %~dp0backend && npm run dev"
echo.
echo Starting Vite in a new window (http://localhost:5176^) — leave it open.
start "WPH Web (port 5176)" cmd /k "cd /d %~dp0 && set VITE_MARKETING_ONLY=1 && npm run dev -- --mode marketing --port 5176"
echo Waiting a moment for Vite to start...
timeout /t 2 /nobreak >nul
echo Opening the site in your default browser...
start "" "http://localhost:5176"
echo.
echo Note: Do NOT open dist\index.html directly (file://). Use the URL above.
echo.
exit /b 0

