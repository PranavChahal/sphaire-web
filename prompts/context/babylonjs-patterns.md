# MAXIMALLY PRECISE BABYLON.JS CODE GENERATION FOR SPHAIRE

🚨 **CRITICAL PRECISION REQUIREMENTS** 🚨

## MANDATORY API USAGE PATTERNS

### ✅ **HIGH-QUALITY MESH CREATION (MAXIMUM VISUAL FIDELITY)**
```javascript
// 🏆 PREMIUM PRIMITIVE CREATION - HIGH TESSELLATION FOR SMOOTH SURFACES
const box = MeshBuilder.CreateBox("box_" + Date.now(), {
    width: 2, height: 2, depth: 2,
    subdivisions: 4  // Smooth beveled edges
}, scene);

const sphere = MeshBuilder.CreateSphere("sphere_" + Date.now(), {
    diameter: 2, 
    segments: 64,        // Ultra-smooth sphere
    sideOrientation: Mesh.FRONTSIDE
}, scene);

const cylinder = MeshBuilder.CreateCylinder("cylinder_" + Date.now(), {
    height: 3, 
    diameterTop: 2, 
    diameterBottom: 2, 
    tessellation: 48,    // Perfectly smooth cylinder
    subdivisions: 8      // Smooth height transitions
}, scene);

const ground = MeshBuilder.CreateGround("ground_" + Date.now(), {
    width: 10, height: 10, 
    subdivisions: 32     // High-detail ground for displacement/normals
}, scene);

// 🏆 PREMIUM COMPLEX SHAPES - ULTRA-HIGH QUALITY
const torus = MeshBuilder.CreateTorus("torus_" + Date.now(), {
    diameter: 4, 
    thickness: 1, 
    tessellation: 64,    // Perfectly smooth torus
    sideOrientation: Mesh.FRONTSIDE
}, scene);

const plane = MeshBuilder.CreatePlane("plane_" + Date.now(), {
    width: 5, height: 5, 
    sideOrientation: Mesh.DOUBLESIDE,
    subdivisions: 16     // High tessellation for curved surfaces
}, scene);

// 🏆 ADVANCED CURVED SURFACES - MAXIMUM SMOOTHNESS
const capsule = MeshBuilder.CreateCapsule("capsule_" + Date.now(), {
    radius: 1,
    height: 3,
    tessellation: 32,    // Smooth capsule caps
    subdivisions: 16,    // Smooth body
    capSubdivisions: 8   // Ultra-smooth end caps
}, scene);
```

### ✅ **PREMIUM MATERIAL CREATION - MAXIMUM VISUAL QUALITY**
```javascript
// 🏆 PREMIUM PBR MATERIAL - PHOTOREALISTIC QUALITY
const pbrMaterial = new PBRMaterial("pbr_" + Date.now(), scene);

// Base color with subtle variation
pbrMaterial.baseColor = new Color3(0.85, 0.4, 0.2);  // Rich copper tone
pbrMaterial.metallicFactor = 0.9;      // High metallic for realistic reflection
pbrMaterial.roughnessFactor = 0.15;    // Low roughness for sharp reflections

// Advanced PBR properties for realism
pbrMaterial.clearCoat.isEnabled = true;
pbrMaterial.clearCoat.intensity = 0.3;
pbrMaterial.clearCoat.roughness = 0.05;  // Glass-like clear coat

// Subsurface scattering for organic materials
pbrMaterial.subSurface.isScatteringEnabled = true;
pbrMaterial.subSurface.scatteringStrength = 0.2;

// Environment reflection enhancement
pbrMaterial.environmentIntensity = 1.2;
pbrMaterial.specularIntensity = 1.1;

mesh.material = pbrMaterial;

// 🏆 GLASS/CRYSTAL MATERIAL - ULTRA-PREMIUM
const glassMaterial = new PBRMaterial("glass_" + Date.now(), scene);
glassMaterial.baseColor = new Color3(0.95, 0.98, 1.0);
glassMaterial.metallicFactor = 0.0;
glassMaterial.roughnessFactor = 0.02;   // Mirror-smooth
glassMaterial.alpha = 0.15;             // High transparency
glassMaterial.indexOfRefraction = 1.52; // Realistic glass IOR

// Advanced glass properties
glassMaterial.clearCoat.isEnabled = true;
glassMaterial.clearCoat.intensity = 1.0;
glassMaterial.clearCoat.roughness = 0.0;

glassMaterial.subSurface.isRefractionEnabled = true;
glassMaterial.subSurface.refractionIntensity = 0.8;

mesh.material = glassMaterial;

// 🏆 METAL MATERIAL - PREMIUM FINISH
const metalMaterial = new PBRMaterial("metal_" + Date.now(), scene);
metalMaterial.baseColor = new Color3(0.95, 0.93, 0.88);  // Polished steel
metalMaterial.metallicFactor = 1.0;     // Pure metal
metalMaterial.roughnessFactor = 0.1;    // Polished finish

// Anisotropic reflection for brushed metal
metalMaterial.anisotropy.isEnabled = true;
metalMaterial.anisotropy.intensity = 0.3;
metalMaterial.anisotropy.direction = new Vector2(1, 0);

// Enhanced environment reflection
metalMaterial.environmentIntensity = 1.5;
metalMaterial.specularIntensity = 1.3;

mesh.material = metalMaterial;

// 🏆 FABRIC/ORGANIC MATERIAL - REALISTIC TEXTURE
const fabricMaterial = new PBRMaterial("fabric_" + Date.now(), scene);
fabricMaterial.baseColor = new Color3(0.6, 0.3, 0.1);  // Rich leather
fabricMaterial.metallicFactor = 0.0;    // Non-metallic
fabricMaterial.roughnessFactor = 0.9;   // Matte finish

// Subsurface scattering for organic feel
fabricMaterial.subSurface.isScatteringEnabled = true;
fabricMaterial.subSurface.scatteringStrength = 0.4;
fabricMaterial.subSurface.translucencyIntensity = 0.1;

mesh.material = fabricMaterial;
```

### ✅ **POSITIONING - PRECISE VECTOR USAGE**
```javascript
// 🎯 POSITION - ALWAYS USE VECTOR3
mesh.position = new Vector3(x, y, z);
mesh.position.x += 2;  // Incremental positioning
mesh.position.y = Math.sin(Date.now() * 0.001) * 3;  // Dynamic positioning

// 🎯 ROTATION - RADIANS ONLY, CLEAR QUATERNION
mesh.rotationQuaternion = null;  // CRITICAL: Clear quaternion first
mesh.rotation = new Vector3(0, Math.PI / 4, 0);  // 45° Y rotation
mesh.rotation.x = Math.PI / 6;  // 30° X rotation

// 🎯 SCALING - UNIFORM AND NON-UNIFORM
mesh.scaling = new Vector3(1.5, 1, 1.5);  // Non-uniform scale
mesh.scaling.setAll(2);  // Uniform scale
```

### ✅ **CSG BOOLEAN OPERATIONS - EXACT WORKFLOW**
```javascript
// 🎯 CSG OPERATIONS - PRECISE PATTERN
const box1 = MeshBuilder.CreateBox("box1", {width: 3, height: 3, depth: 3}, scene);
const box2 = MeshBuilder.CreateBox("box2", {width: 2, height: 4, depth: 2}, scene);
box2.position.x = 1;

// Convert to CSG
const csgA = CSG.FromMesh(box1);
const csgB = CSG.FromMesh(box2);

// Perform operation
const unionCSG = csgA.union(csgB);
const resultMesh = unionCSG.toMesh("union_" + Date.now(), box1.material, scene);

// CRITICAL: Dispose original meshes
box1.dispose();
box2.dispose();
```

### ✅ **ADVANCED MESH OPERATIONS**
```javascript
// 🎯 MESH MERGING - EFFICIENT COMBINATION
const meshes = [mesh1, mesh2, mesh3];
const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
merged.name = "merged_" + Date.now();

// 🎯 INSTANCING - PERFORMANCE OPTIMIZATION
const instances = [];
for (let i = 0; i < count; i++) {
    const instance = originalMesh.createInstance(`instance_${i}_${Date.now()}`);
    instance.position = new Vector3(
        (i % 10) * 2,
        0,
        Math.floor(i / 10) * 2
    );
    instances.push(instance);
}
```

## 🚨 **CRITICAL ERROR PREVENTION**

### ❌ **NEVER DO THESE (COMMON AI MISTAKES)**
```javascript
// ❌ WRONG: Missing scene parameter
const box = MeshBuilder.CreateBox("box", {size: 2});

// ❌ WRONG: Using deprecated Mesh.Create* methods
const sphere = Mesh.CreateSphere("sphere", 16, 2, scene);

// ❌ WRONG: Not clearing rotationQuaternion
mesh.rotation.y = Math.PI;

// ❌ WRONG: Non-unique IDs
const box1 = MeshBuilder.CreateBox("box", {}, scene);
const box2 = MeshBuilder.CreateBox("box", {}, scene);  // Conflict!

// ❌ WRONG: Not disposing CSG source meshes
const result = csgA.union(csgB).toMesh("result", material, scene);
// Missing: box1.dispose(); box2.dispose();
```

### ✅ **CORRECT PATTERNS (USE THESE)**
```javascript
// ✅ CORRECT: Complete mesh creation
const box = MeshBuilder.CreateBox("box_" + Date.now(), {
    width: 2, height: 2, depth: 2
}, scene);

// ✅ CORRECT: Proper rotation setup
mesh.rotationQuaternion = null;
mesh.rotation = new Vector3(0, Math.PI / 2, 0);

// ✅ CORRECT: Unique naming
const generateId = () => `mesh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const box1 = MeshBuilder.CreateBox(generateId(), {}, scene);
```

## 🎯 **SPHAIRE-SPECIFIC INTEGRATION**

### **Scene Context Variables (AVAILABLE GLOBALLY)**
```javascript
// These are already available in the execution context:
// - scene: BABYLON.Scene
// - engine: BABYLON.Engine  
// - camera: BABYLON.Camera
// - canvas: HTMLCanvasElement

// 🎯 USE THESE DIRECTLY - NO IMPORT NEEDED
const { MeshBuilder, StandardMaterial, Color3, Vector3, CSG, Mesh } = BABYLON;
```

### **Code Structure Requirements**
```javascript
// 🎯 REQUIRED STRUCTURE FOR ALL GENERATED CODE

// 1. Parameter definitions (with defaults)
const width = width || 2;
const height = height || 2;
const depth = depth || 2;

// 2. Mesh creation with unique IDs
const mainMesh = MeshBuilder.CreateBox(`box_${Date.now()}`, {
    width, height, depth
}, scene);

// 3. Material application
const material = new StandardMaterial(`mat_${Date.now()}`, scene);
material.diffuseColor = new Color3(0.7, 0.3, 0.9);
mainMesh.material = material;

// 4. Positioning (not at origin)
mainMesh.position = new Vector3(0, height / 2, 0);

// 5. Final mesh is automatically returned to scene
```

### **Performance Requirements**
```javascript
// 🎯 ALWAYS IMPLEMENT THESE OPTIMIZATIONS

// Dispose unused resources
if (temporaryMesh) {
    temporaryMesh.dispose();
}

// Use instances for repeated geometry
if (count > 5) {
    // Use instancing instead of creating separate meshes
    const instances = Array.from({length: count}, (_, i) => {
        const instance = baseMesh.createInstance(`instance_${i}`);
        instance.position = new Vector3(i * spacing, 0, 0);
        return instance;
    });
}

// Merge when appropriate
if (meshesToCombine.length > 3) {
    const merged = Mesh.MergeMeshes(meshesToCombine, true, true);
    merged.name = `merged_${Date.now()}`;
}
```

## 🏆 **PREMIUM QUALITY STANDARDS - MAXIMUM VISUAL FIDELITY**

### **Ultra-High Visual Quality Requirements**
- **Tessellation**: Ultra-high subdivision (≥64 for curves, ≥32 for surfaces)
- **Materials**: Always use premium PBR materials with advanced properties
- **Positioning**: Artistic spatial distribution with intentional composition
- **Scaling**: Photorealistic proportions with fine detail scaling
- **Lighting**: Assume HDR environment with advanced post-processing

### **🏆 ADVANCED LIGHTING ENHANCEMENTS**
```javascript
// Premium lighting setup for maximum visual impact

// Enhanced environment lighting
if (scene.environmentTexture) {
    scene.environmentIntensity = 1.5;  // Boost environment reflection
}

// Advanced shadow configuration
if (scene.lights) {
    scene.lights.forEach(light => {
        if (light.getShadowGenerator) {
            const shadowGen = light.getShadowGenerator();
            if (shadowGen) {
                shadowGen.mapSize = 2048;           // High-res shadows
                shadowGen.usePercentageCloserFiltering = true;
                shadowGen.filteringQuality = ShadowGenerator.QUALITY_HIGH;
                shadowGen.darkness = 0.3;           // Subtle, realistic shadows
            }
        }
    });
}

// Screen Space Reflections for premium reflections
if (scene.postProcessRenderPipeline) {
    const ssr = new SSRRenderingPipeline('ssr', scene, [camera]);
    ssr.strength = 0.8;
    ssr.reflectionSpecularFalloffExponent = 1.0;
    ssr.maxDistance = 100;
}
```

### **🏆 POST-PROCESSING FOR PREMIUM VISUALS**
```javascript
// Premium post-processing pipeline
const pipeline = new DefaultRenderingPipeline('premium', true, scene, [camera]);

// Anti-aliasing for smooth edges
pipeline.samples = 8;  // 8x MSAA
pipeline.fxaaEnabled = true;

// Enhanced tone mapping
pipeline.imageProcessingEnabled = true;
pipeline.imageProcessing.toneMappingEnabled = true;
pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
pipeline.imageProcessing.exposure = 1.2;

// Bloom for premium glow effects
pipeline.bloomEnabled = true;
pipeline.bloomThreshold = 0.8;
pipeline.bloomWeight = 0.3;
pipeline.bloomKernel = 128;

// Depth of field for cinematic quality
pipeline.depthOfFieldEnabled = true;
pipeline.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.High;

// Screen space ambient occlusion
pipeline.screenSpaceReflectionsEnabled = true;
```

### **🏆 ADVANCED GEOMETRY QUALITY**
```javascript
// Premium geometry with advanced features

// Smooth normals for organic surfaces
const normals = [];
VertexData.ComputeNormals(positions, indices, normals);
mesh.setVerticesData(VertexBuffer.NormalKind, normals);

// High-quality UV mapping
const uvs = [];
// Generate seamless UV coordinates for premium texturing
for (let i = 0; i < positions.length / 3; i++) {
    uvs.push(positions[i * 3] * 0.1, positions[i * 3 + 2] * 0.1);
}
mesh.setVerticesData(VertexBuffer.UVKind, uvs);

// Edge splitting for sharp features
mesh.forceSharedVertices();
mesh.createNormals(true);  // Force smooth normals

// Level of detail for performance
const lod1 = mesh.createInstance('lod1');
lod1.setEnabled(false);
mesh.addLODLevel(50, lod1);  // Switch to LOD at distance
```

### **Code Quality Requirements**
- **Unique IDs**: Every mesh must have a unique identifier
- **Error Handling**: Dispose resources, check for null references
- **Performance**: Use instances, merging, and efficient algorithms
- **Readability**: Clear variable names, logical organization

### **Integration Requirements**
- **No Global Pollution**: Don't create global variables
- **Scene Management**: All objects added to scene automatically
- **Type Safety**: Use proper BABYLON types and signatures
- **ES6+ Syntax**: Use modern JavaScript patterns

## 🚨 **FINAL CHECKLIST FOR ALL GENERATED CODE**

✅ **BEFORE SUBMITTING CODE, VERIFY:**
1. All MeshBuilder calls include scene parameter
2. All materials are created and applied
3. All meshes have unique IDs using timestamp or random
4. rotationQuaternion is cleared before setting rotation
5. Temporary/intermediate meshes are disposed
6. Objects are positioned away from origin
7. CSG operations dispose source meshes
8. No deprecated Mesh.Create* methods used
9. Proper Vector3/Color3 constructors used
10. Code is complete and executable without modification

**REMEMBER: Generate code that works immediately upon execution with zero modifications required.**
