@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est necessaire pour demarrer le site local.
  pause
  exit /b 1
)
node scripts\start-local.cjs
if errorlevel 1 pause
