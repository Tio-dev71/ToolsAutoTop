@echo off
echo ==========================================
echo    TOPMANAGER - WINDOWS INSTALL ^& START
echo ==========================================
echo.

echo [1/3] Kiem tra NodeJS...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [LOI] May cua ban chua cai NodeJS! Vui long vao https://nodejs.org de tai va cai dat.
    pause
    exit /b
)
echo [OK] NodeJS da duoc cai dat.

echo [2/3] Cai dat thu vien (co the mat vai phut neu la lan dau)...
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong the cai dat thu vien. Vui long kiem tra lai ket noi mang.
    pause
    exit /b
)

echo [3/3] Khoi dong phan mem...
call npm run dev

pause
