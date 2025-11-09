#!/bin/bash

echo "Setting up Strudel VS Code Extension development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 16.0 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "Error: Node.js version 16.0 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"

# Install dependencies
echo "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "Error: Failed to install dependencies"
    exit 1
fi

# Install VS Code Extension CLI if not already installed
if ! command -v vsce &> /dev/null; then
    echo "Installing VS Code Extension CLI (vsce)..."
    npm install -g @vscode/vsce
    
    if [ $? -eq 0 ]; then
        echo "✓ VS Code Extension CLI installed"
    else
        echo "Warning: Failed to install vsce globally. You can still develop the extension."
    fi
else
    echo "✓ VS Code Extension CLI already installed"
fi

# Compile TypeScript
echo "Compiling TypeScript..."
npm run compile

if [ $? -eq 0 ]; then
    echo "✓ TypeScript compiled successfully"
else
    echo "Error: TypeScript compilation failed"
    exit 1
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To develop the extension:"
echo "  1. Open this folder in VS Code"
echo "  2. Press F5 to run the extension in a new Extension Development Host window"
echo "  3. Test the extension commands in the new window"
echo ""
echo "To package the extension:"
echo "  npm run package"
echo ""
echo "To publish the extension:"
echo "  npm run publish"