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
echo Waiting 2 seconds for the API to start...
timeout /t 2 /nobreak >nul
echo.
echo Starting Vite at http://localhost:5176 — this window is only the website; the other window is the API.
start "" "http://localhost:5176"
set VITE_MARKETING_ONLY=1
npm run dev -- --mode marketing --port 5176

