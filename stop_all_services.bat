@echo off
title Stop All School Management Services
echo =====================================================================
echo  STOPPING ALL SERVICES (Freeing Ports 8761, 8080-8086, 5173)
echo =====================================================================
echo.

for %%P in (8761 8080 8081 8082 8083 8084 8085 8086 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%P ^| findstr LISTENING') do (
        echo Stopping PID %%a on port %%P...
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo All services stopped successfully.
pause
