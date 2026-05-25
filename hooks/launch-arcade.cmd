@echo off
setlocal

set "LOCK_FILE=%USERPROFILE%\.claude\arcade.lock"

rem Check if arcade was launched recently (within last 30 seconds)
if exist "%LOCK_FILE%" (
    exit /b 0
)

rem Create lock file immediately to prevent duplicate launches
echo %DATE% %TIME% > "%LOCK_FILE%"

rem Find the plugin directory (where this script lives)
set "PLUGIN_DIR=%~dp0.."

rem Try Windows Terminal split pane first, fall back to new window
where wt >nul 2>nul
if not errorlevel 1 (
    start "" wt -w 0 sp -s 0.5 -d "%PLUGIN_DIR%" node "%PLUGIN_DIR%\index.js"
) else (
    start "Claude Arcade" cmd /c "cd /d "%PLUGIN_DIR%" && node index.js"
)

exit /b 0
