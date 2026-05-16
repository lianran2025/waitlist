@echo off
setlocal enabledelayedexpansion

set "APP_DIR=%~dp0"
set "LOCK_DIR=%TEMP%\waitlist-auto-deploy.lock"

mkdir "%LOCK_DIR%" 2>nul
if errorlevel 1 (
  echo Another deployment is already running.
  exit /b 0
)

cd /d "%APP_DIR%"
if errorlevel 1 goto fail

echo ===== Fetch latest Codeup main =====
git fetch origin main
if errorlevel 1 goto fail

for /f "delims=" %%i in ('git rev-parse HEAD') do set "LOCAL=%%i"
for /f "delims=" %%i in ('git rev-parse origin/main') do set "REMOTE=%%i"

if "%LOCAL%"=="%REMOTE%" (
  echo No new commit.
  goto success
)

echo New commit found.
echo Local:  %LOCAL%
echo Remote: %REMOTE%

for /f "delims=" %%i in ('git status --porcelain') do (
  echo Working tree has local changes. Please review before auto deploy.
  git status --short
  goto fail
)

if exist "src\data\companies.json" (
  if not exist "backups" mkdir "backups"
  for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%i"
  copy /y "src\data\companies.json" "backups\companies-!TS!.json" >nul
  if errorlevel 1 goto fail
  echo Backed up src\data\companies.json to backups\companies-!TS!.json
)

echo ===== Pull latest code =====
git pull --ff-only origin main
if errorlevel 1 goto fail

echo ===== Install dependencies =====
npm install
if errorlevel 1 goto fail

echo ===== Build project =====
npm run build
if errorlevel 1 goto fail

echo ===== Restart Next.js =====
pm2 restart waitlist-next
if errorlevel 1 goto fail

git diff --name-only %LOCAL% %REMOTE% > "%TEMP%\waitlist-changed-files.txt"
findstr /r /c:"^main.py$" /c:"^requirements.txt$" "%TEMP%\waitlist-changed-files.txt" >nul
if not errorlevel 1 (
  echo ===== Restart Flask backend =====
  pm2 restart waitlist-flask
  if errorlevel 1 goto fail
) else (
  echo Flask backend unchanged. Skip Flask restart.
)

echo Deploy success.
goto success

:fail
echo Deploy failed.
rmdir "%LOCK_DIR%" 2>nul
exit /b 1

:success
rmdir "%LOCK_DIR%" 2>nul
exit /b 0
