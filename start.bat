@echo off
title MineCraft WebShop Docker Runner
echo ==================================================
echo       MineCraft WebShop - Docker Launcher
echo ==================================================
echo.

:: Check if .env file exists
if not exist .env (
    echo [!] .env file not found.
    echo [i] Copying .env.example to .env ...
    copy .env.example .env
    echo.
    echo [SUCCESS] Created .env file.
    echo [!] Please configure your DOMAIN in the .env file.
    echo [i] Opening '.env' in Notepad...
    notepad .env
    echo.
    echo After configuring '.env', run this script again to start the website.
    echo.
    pause
    exit /b
)

echo [i] Starting Docker containers...
docker compose up -d

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start Docker containers.
    echo [i] Please make sure Docker Desktop or Docker service is running on this server.
    echo.
    pause
    exit /b
)

echo.
echo [SUCCESS] MineCraft WebShop is starting up!
echo ==================================================
echo.
echo You can access your website at:
echo  - Main Website:     http://localhost (or your configured domain)
echo  - Launcher Preview: http://localhost:1420 (or your domain:1420)
echo.
echo Note: If using a domain, it will automatically redirect to https:// (SSL).
echo.
echo ==================================================
pause
