@echo off
setlocal

set "LOCK_FILE=%USERPROFILE%\.claude\arcade.lock"

rem Check if arcade is already running
if exist "%LOCK_FILE%" (
    rem Verify the process is still alive
    for /f "tokens=*" %%p in ('type "%LOCK_FILE%"') do (
        tasklist /FI "PID eq %%p" 2>nul | find "%%p" >nul
        if not errorlevel 1 (
            exit /b 0
        )
    )
    del "%LOCK_FILE%" 2>nul
)

rem Find the plugin directory (where this script lives)
set "PLUGIN_DIR=%~dp0.."

rem Try Windows Terminal split pane first, fall back to new window
where wt >nul 2>nul
if not errorlevel 1 (
    start "" wt -w 0 sp -s 0.35 -d "%PLUGIN_DIR%" node "%PLUGIN_DIR%\index.js"
) else (
    start "Claude Arcade" cmd /c "cd /d "%PLUGIN_DIR%" && node index.js"
)

exit /b 0
