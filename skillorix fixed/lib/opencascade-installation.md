# Installing OpenCascade.js Locally

This guide will help you set up OpenCascade.js locally for this project.

## Option 1: Use the Installation Script (Recommended)

We've provided a script that will automatically download and install OpenCascade.js for you:

```bash
# Make the script executable
chmod +x lib/install-opencascade.sh

# Run the script
./lib/install-opencascade.sh
```

## Option 2: Manual Installation from npm

If you prefer to install manually and have npm installed, you can get the files by:

```bash
# Create a temporary directory
mkdir temp-ocjs
cd temp-ocjs

# Install the package
npm install opencascade.js@beta

# Copy the required files (note: the file is now opencascade.full.js)
cp node_modules/opencascade.js/dist/opencascade.full.js ../lib/opencascade.js
cp node_modules/opencascade.js/dist/opencascade.full.wasm ../lib/opencascade.wasm

# Clean up
cd ..
rm -rf temp-ocjs
```

## How It Works

This project uses a custom module loader approach to handle OpenCascade.js:

1. The `opencascade.js` file is loaded as an ES module via `js/opencascade-module-loader.js`
2. The module loader configures the correct path for the WebAssembly file and exposes the OpenCascade.js module globally
3. The `opencascade-loader.js` file then uses this global module to initialize OpenCascade.js

This approach solves two common issues:
- ES module compatibility: OpenCascade.js uses ES module syntax (`export default`)
- WebAssembly file location: The module loader ensures the `.wasm` file is loaded from the correct path

## Verifying Installation

After installing the files, refresh your browser. You should see the OpenCascade.js functionality become available in the UI panel.

## Troubleshooting

- Make sure both files are present in the `lib` directory:
  - `opencascade.js` (renamed from opencascade.full.js)
  - `opencascade.wasm` (copied from opencascade.full.wasm)
- Check browser console for any loading errors
- If you see a 404 error for `opencascade.wasm`, make sure this file is also copied to the `lib` directory
- If you see a SyntaxError about 'export', this is normal as the application uses a module loader script to handle the ES module format
- The 404 error for `/@vite/client` can be safely ignored - it's not related to OpenCascade.js
- If you're still having issues, try uncommenting the CDN version in `index.html` temporarily to verify the application works with OpenCascade.js