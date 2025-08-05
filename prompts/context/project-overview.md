# Sphaire 3D CAD Application - Project Context

## Project Overview
Sphaire is a modern 3D CAD application built with Next.js, TypeScript, and Babylon.js. It provides professional-grade 3D modeling capabilities with AI-powered model generation.

## Core Architecture
- **Frontend**: Next.js 14 with TypeScript
- **3D Engine**: Babylon.js 8.x with Metal acceleration (Apple M2)
- **State Management**: Zustand store pattern
- **Styling**: Tailwind CSS
- **AI Integration**: OpenAI GPT-4o for code generation

## Key Technologies & Libraries
- **Babylon.js**: Primary 3D rendering engine
- **OpenCascade.js**: Precision CAD operations (when needed)
- **EditControl**: Transform controls and undo/redo functionality
- **React**: Component architecture with hooks
- **TypeScript**: Strict typing throughout

## Project Structure
```
/components/          # React components
  Header.tsx         # Main navigation with Import/Export
  Viewport.tsx       # 3D scene rendering (Babylon.js)
/pages/api/          # API endpoints
  ai-code.ts         # AI code generation endpoint
  generateModel.ts   # 3D model generation endpoint
/store/              # Zustand state management
/services/           # API and service integrations
/utils/              # Utility functions
/prompts/context/    # AI prompt context (this folder)
```

## Current Development Status
- ✅ Zero TypeScript compilation errors
- ✅ Stable 3D rendering with Babylon.js
- ✅ Import/Export functionality for 3D models
- ✅ Grid system and multi-selection
- ✅ Transform controls integration
- 🔄 AI model generation (current focus)

## Comprehensive 3D Modeling Environment Context
When generating code for Sphaire, consider the following comprehensive 3D modeling environment context:

### Scene Context
- The `scene` variable is available (BABYLON.Scene)
- The `BABYLON` namespace is imported
- `Vector3`, `Color3`, `MeshBuilder`, `StandardMaterial` are available
- The scene is set up with a camera, lights, and a grid system

### Object Creation
- Use MeshBuilder for primitive creation (e.g., boxes, spheres, cylinders)
- Apply proper materials and positioning for created objects
- Set unique IDs for generated objects
- Add objects to the scene and store

### User Interaction
- Support user input for object manipulation (e.g., translation, rotation, scaling)
- Integrate with transform controls for precise object manipulation
- Implement undo/redo functionality for object creation and manipulation

### Performance and Optimization
- Ensure code is TypeScript strict mode compatible
- Implement proper error handling for robustness
- Optimize performance by disposing of unused objects and minimizing memory usage
- Follow React best practices for component architecture and state management

### Integration Requirements
- Generated meshes should integrate with the existing store
- Support undo/redo operations for generated meshes
- Ensure compatibility with transform controls for generated meshes
- Implement proper cleanup and disposal for generated meshes
