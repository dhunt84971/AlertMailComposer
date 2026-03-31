@echo off
REM ============================================================
REM  AlertMailComposer - Build Script
REM
REM  Prerequisites:
REM    - Node.js 18+ (with npm)
REM    - Inno Setup 6 (iscc.exe on PATH or in default location)
REM
REM  This script:
REM    1. Installs npm dependencies
REM    2. Runs the test suite
REM    3. Bundles the CodeMirror editor
REM    4. Packages the Electron app via electron-builder
REM    5. Compiles the Inno Setup installer
REM ============================================================
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo  AlertMailComposer Build
echo ============================================================
echo.

REM --- Step 1: Install dependencies ---
echo [1/5] Installing npm dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm install failed.
    exit /b 1
)
echo       Done.
echo.

REM --- Step 2: Run tests ---
echo [2/5] Running tests...
call npx vitest run
if %ERRORLEVEL% neq 0 (
    echo ERROR: Tests failed. Fix test failures before building.
    exit /b 1
)
echo       Done.
echo.

REM --- Step 3: Bundle CodeMirror ---
echo [3/5] Bundling CodeMirror editor...
call npx esbuild src/renderer/codemirror-setup.js --bundle --outfile=src/renderer/codemirror-bundle.js --format=iife --platform=browser
if %ERRORLEVEL% neq 0 (
    echo ERROR: esbuild failed.
    exit /b 1
)
echo       Done.
echo.

REM --- Step 4: Package with electron-builder ---
echo [4/5] Packaging Electron application...
call npx electron-builder --win --dir
if %ERRORLEVEL% neq 0 (
    echo ERROR: electron-builder failed.
    exit /b 1
)
echo       Done.
echo.

REM --- Verify electron-builder output ---
if not exist "dist\win-unpacked\AlertMailComposer.exe" (
    echo ERROR: electron-builder output not found at dist\win-unpacked\
    echo        Expected dist\win-unpacked\AlertMailComposer.exe
    exit /b 1
)

REM --- Step 5: Compile Inno Setup installer ---
echo [5/5] Compiling Inno Setup installer...

REM Try iscc on PATH first
where iscc >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "ISCC=iscc"
    goto :run_iscc
)

REM Check common Inno Setup install locations
set "ISCC="
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
) else if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" (
    set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
)

if "!ISCC!" == "" (
    echo ERROR: Inno Setup compiler (ISCC.exe) not found.
    echo        Install Inno Setup 6 from https://jrsoftware.org/isdl.php
    echo        or add its directory to your PATH.
    echo.
    echo        The Electron app was built successfully at:
    echo          dist\win-unpacked\
    echo        You can run it directly or compile the installer manually:
    echo          iscc installer\setup.iss
    exit /b 1
)

:run_iscc
echo       Using: !ISCC!
"!ISCC!" installer\setup.iss
if %ERRORLEVEL% neq 0 (
    echo ERROR: Inno Setup compilation failed.
    exit /b 1
)
echo       Done.
echo.

REM --- Complete ---
echo ============================================================
echo  Build Complete!
echo ============================================================
echo.
echo  Installer:  dist\installer\AlertMailComposerSetup.exe
echo  Unpacked:   dist\win-unpacked\
echo.
