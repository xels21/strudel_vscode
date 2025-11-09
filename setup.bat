@echo off

echo Setting up Strudel VS Code Extension development environment...

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js 16.0 or higher.
    exit /b 1
)

:: Get Node.js version
for /f "tokens=1 delims=v" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js version: %NODE_VERSION%

:: Install dependencies
echo Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    exit /b 1
)
echo ✓ Dependencies installed successfully

:: Install VS Code Extension CLI if not already installed
where vsce >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing VS Code Extension CLI (vsce)...
    npm install -g @vscode/vsce
    
    if %errorlevel% equ 0 (
        echo ✓ VS Code Extension CLI installed
    ) else (
        echo Warning: Failed to install vsce globally. You can still develop the extension.
    )
) else (
    echo ✓ VS Code Extension CLI already installed
)

:: Compile TypeScript
echo Compiling TypeScript...
npm run compile

if %errorlevel% neq 0 (
    echo Error: TypeScript compilation failed
    exit /b 1
)
echo ✓ TypeScript compiled successfully

echo.
echo 🎉 Setup complete!
echo.
echo To develop the extension:
echo   1. Open this folder in VS Code
echo   2. Press F5 to run the extension in a new Extension Development Host window
echo   3. Test the extension commands in the new window
echo.
echo To package the extension:
echo   npm run package
echo.
echo To publish the extension:
echo   npm run publish

pause