# Modeling Environment

## 3D Scene Configuration
- **Engine**: Babylon.js WebGL2 rendering engine
- **Coordinates**: Right-handed coordinate system (Y-up)
- **Units**: Metric (meters)
- **Camera**: ArcRotateCamera with orbital controls
- **Lighting**: Multi-light setup with HDR environment

## Available Tools
- **Primitives**: Box, Sphere, Cylinder, Cone, Torus, Plane
- **CAD Operations**: Extrude, Revolve, Sweep, Loft, Boolean operations
- **Transformations**: Translate, Rotate, Scale, Mirror
- **Modifications**: Fillet, Chamfer, Shell, Offset
- **Patterns**: Circular, Linear, Array patterns

## Material System
- PBR (Physically Based Rendering) materials
- Standard materials with diffuse, specular, ambient
- Custom shaders support
- Texture mapping (diffuse, normal, roughness, metallic)

## Rendering Features
- Real-time shadows
- Post-processing effects
- Anti-aliasing (FXAA, MSAA)
- Ambient occlusion
- Glow/bloom effects
- Grid system with measurement

## Performance Targets
- Target: 60 FPS for scenes up to 100k polygons
- Optimized mesh merging for complex assemblies
- LOD (Level of Detail) support for large models
- Instancing for repeated geometry

## Export Formats
- GLB/GLTF (primary)
- STL for 3D printing
- OBJ with materials
- STEP/IGES (via OpenCascade)
