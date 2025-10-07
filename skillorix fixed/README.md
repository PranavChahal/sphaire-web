# Babylon.js 3D Viewer with OpenCascade.js Integration

A simple 3D viewer built with Babylon.js featuring a grid system similar to Blender, model loading capabilities, and OpenCascade.js integration for CAD model creation and visualization.

## Features

- Interactive 3D scene with orbital camera controls
- Grid system on all three planes (XZ, XY, YZ) similar to Blender
- Axis indicators (X, Y, Z) with color coding
- Model loading functionality supporting GLB, GLTF, OBJ, STL, and Babylon formats
- Sample 3D primitives (cube, sphere, cylinder) for testing
- OpenCascade.js integration for CAD model creation and visualization
- Sample OpenCascade primitives (box, cylinder, bottle) for testing
- Grid visibility controls
- Responsive design that works on various screen sizes

## How to Run

There are several ways to run this application:

### Option 1: Open directly in a browser

If you're using a modern browser, you might be able to open the `index.html` file directly. However, some browsers restrict loading local files due to security policies.

### Option 2: Use a local server (recommended)

1. If you have Python installed:
   - For Python 3.x: `python -m http.server`
   - For Python 2.x: `python -m SimpleHTTPServer`

2. If you have Node.js installed:
   - Install a simple server: `npm install -g http-server`
   - Run the server: `http-server`

3. Then open your browser and navigate to `http://localhost:8000` (or the port indicated in your terminal)

## Controls

### Camera Controls
- **Left-click + drag**: Rotate the camera around the target
- **Right-click + drag**: Pan the camera
- **Scroll wheel**: Zoom in/out

### UI Controls

#### Grid Controls (Right Panel)
- Toggle visibility of XZ Grid (floor grid)
- Toggle visibility of XY Grid (back grid)
- Toggle visibility of YZ Grid (side grid)
- Reset Camera button to return to the default view

#### Model Loader (Left Panel)
- Load 3D Model button to import your own 3D models (supports GLB, GLTF, OBJ, STL, and Babylon formats)
- Sample model buttons to quickly load basic 3D primitives (cube, sphere, cylinder)

#### OpenCascade Loader (Right Panel)
- Create OC Box button to create a sample OpenCascade box
- Create OC Cylinder button to create a sample OpenCascade cylinder
- Create OC Bottle button to create a sample OpenCascade bottle with fillets

## Customization

You can customize the grid and other aspects of the viewer by modifying the `js/app.js` file:

- Change `gridSize` to adjust the size of the grid
- Modify `gridMaterial` properties to change the appearance of the grid
- Adjust camera settings to change the default view

## Dependencies

- [Babylon.js](https://www.babylonjs.com/) - A powerful, beautiful, simple, and open 3D engine for the web
- [OpenCascade.js](https://ocjs.org/) - A JavaScript port of the Open CASCADE Technology (OCCT) CAD kernel

## OpenCascade.js Integration

This viewer includes integration with OpenCascade.js, allowing you to:

1. Create and visualize CAD models directly in the browser
2. Convert OpenCascade geometry to Babylon.js meshes
3. Export OpenCascade models to GLB format for visualization

### Important Note on Browser Restrictions

**Due to browser security restrictions, loading OpenCascade.js from a CDN may be blocked.** The viewer is designed to handle this gracefully and will still provide the API structure even when OpenCascade.js cannot be loaded.

### How to Use OpenCascade.js with This Viewer

There are several approaches to use OpenCascade.js with this viewer:

#### Option 1: Download and Host OpenCascade.js Locally

1. Download OpenCascade.js from [GitHub](https://github.com/donalffons/opencascade.js)
2. Host the files locally alongside your application
3. Update the script tag in `index.html` to point to your local copy

#### Option 2: Use npm Package in a Bundled Application

```bash
npm install opencascade.js@beta
```

Then in your JavaScript:

```javascript
import { initOpenCascade } from 'opencascade.js';

// Initialize OpenCascade.js
const oc = await initOpenCascade();
```

### How the Integration Works

The integration uses two main approaches to convert OpenCascade geometry to Babylon.js meshes:

1. **GLB Export Method**: Converts OpenCascade shapes to GLB format using the built-in OpenCascade exporters, then loads the GLB into Babylon.js
2. **Direct Triangulation Method**: Directly extracts triangulated mesh data from OpenCascade shapes and creates Babylon.js meshes

### Using Your Own OpenCascade Code

To use your own OpenCascade.js code with this viewer:

1. Make sure OpenCascade.js is properly initialized using the `initOpenCascade()` function
2. Create your OpenCascade shapes using the OpenCascade.js API
3. Use the `ocShapeToBabylonMesh(shape, name, scene)` function to convert your shapes to Babylon.js meshes

Example:
```javascript
// Assuming OpenCascade.js is loaded and initialized
const oc = window.opencascade; // or from your import if using npm

// Create an OpenCascade shape
const box = new oc.BRepPrimAPI_MakeBox_2(1, 1, 1).Shape();

// Convert to Babylon.js mesh
const ocLoader = window.openCascadeLoader; // Reference to the loader instance
ocLoader.ocShapeToBabylonMesh(box, 'myBox', scene).then(mesh => {
    // Apply materials, transformations, etc.
    mesh.material = new BABYLON.StandardMaterial('boxMat', scene);
    mesh.material.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.9);
});
```

### Converting Your Existing OpenCascade.js Code

If you have existing OpenCascade.js code that doesn't work with Babylon.js:

1. Identify the OpenCascade shapes in your code (instances of `TopoDS_Shape` or similar)
2. Use the provided conversion functions to create Babylon.js meshes:

```javascript
// Method 1: Direct triangulation (faster, but may have limitations)
ocLoader.ocShapeToBabylonMesh(yourShape, 'shapeName', scene)
  .then(mesh => {
    // Work with the Babylon.js mesh
  });

// Method 2: GLB export (more reliable, but slower)
ocLoader.ocShapeToGLBToBabylonMesh(yourShape, 'shapeName', scene)
  .then(mesh => {
    // Work with the Babylon.js mesh
  });
```

3. If you need to handle multiple shapes, you can process them sequentially or in parallel:

```javascript
// Process multiple shapes
Promise.all([
  ocLoader.ocShapeToBabylonMesh(shape1, 'shape1', scene),
  ocLoader.ocShapeToBabylonMesh(shape2, 'shape2', scene),
  ocLoader.ocShapeToBabylonMesh(shape3, 'shape3', scene)
]).then(meshes => {
  // All meshes are now loaded into the scene
  // You can work with them here
});
```