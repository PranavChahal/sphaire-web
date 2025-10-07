#!/bin/bash

# Script to download and install OpenCascade.js locally
echo "Installing OpenCascade.js locally..."

# Create a temporary directory
TEMP_DIR="temp-ocjs"
mkdir -p $TEMP_DIR
cd $TEMP_DIR

# Install the package
echo "Downloading OpenCascade.js from npm..."
npm install opencascade.js@beta

# Check if the installation was successful
if [ ! -f "node_modules/opencascade.js/dist/opencascade.full.js" ]; then
    echo "Error: Could not find opencascade.full.js file in the downloaded package."
    cd ..
    rm -rf $TEMP_DIR
    exit 1
fi

# Copy the required files
echo "Copying opencascade.full.js to lib directory..."
cp node_modules/opencascade.js/dist/opencascade.full.js ../lib/opencascade.js
cp node_modules/opencascade.js/dist/opencascade.full.wasm ../lib/opencascade.wasm

# Clean up
cd ..
rm -rf $TEMP_DIR

# The index.html file is already updated with the correct script tag
echo "Installation complete! The index.html file is already configured to use the module loader."
echo "The module loader (js/opencascade-module-loader.js) handles:"
echo "  - Loading opencascade.js as an ES module"
echo "  - Setting the correct path for the WebAssembly file"
echo "  - Exposing the module globally for the application"

echo "Installation complete! Please refresh your browser to use OpenCascade.js."