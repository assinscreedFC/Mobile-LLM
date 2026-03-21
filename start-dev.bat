@echo off
title ADE Backend + Expo Dev
cd /d "%~dp0"

echo === ADE Backend + Expo - Setup ^& Launch ===
echo.

REM --- 1. Venv Python ---
if not exist "scripts\ade_backend\.venv" (
    echo [1/5] Creation du venv Python...
    python -m venv scripts\ade_backend\.venv
) else (
    echo [1/5] Venv existant OK
)

call scripts\ade_backend\.venv\Scripts\activate.bat

REM --- 2. Dependances Python ---
echo [2/5] Installation des dependances Python...
pip install -q -r scripts\ade_backend\requirements.txt

REM --- 3. .env backend ---
if not exist "scripts\ade_backend\.env" (
    echo [3/5] Generation du .env backend...
    for /f %%K in ('python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"') do set FERNET_KEY=%%K
    (
        echo ADE_ENCRYPTION_KEY=%FERNET_KEY%
        echo ADE_BASE_URL=https://adeconsult.app.u-pariscite.fr
        echo ADE_PORT=8741
    ) > scripts\ade_backend\.env
    echo   -^> Cle Fernet generee
) else (
    echo [3/5] .env backend existant OK
)

REM --- 4. IP locale + .env Expo ---
python -c "import socket; s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.connect(('8.8.8.8',80)); print(s.getsockname()[0]); s.close()" > "%TEMP%\localip.txt"
set /p LOCAL_IP=<"%TEMP%\localip.txt"
del "%TEMP%\localip.txt"

findstr /c:"EXPO_PUBLIC_ADE_API_URL" .env >nul 2>&1
if errorlevel 1 (
    echo EXPO_PUBLIC_ADE_API_URL=http://%LOCAL_IP%:8741>> .env
    echo [4/5] Ajoute EXPO_PUBLIC_ADE_API_URL=http://%LOCAL_IP%:8741 dans .env
) else (
    echo [4/5] EXPO_PUBLIC_ADE_API_URL deja present
)

if not exist "scripts\ade_backend\data" mkdir scripts\ade_backend\data

REM --- 5. Lancer backend + expo en parallele ---
echo [5/5] Lancement...
echo.
echo   Backend ADE : http://%LOCAL_IP%:8741
echo   Expo        : npm run start
echo.
echo   Ctrl+C pour tout arreter
echo.

start "ADE Backend" cmd /k "cd /d "%~dp0" && call scripts\ade_backend\.venv\Scripts\activate.bat && python -m uvicorn scripts.ade_backend.main:app --host 0.0.0.0 --port 8741 --reload"

timeout /t 2 /nobreak >nul

npm run start
