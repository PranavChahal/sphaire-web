# 📋 Complete OpenCascade Function List

## ⚠️ CRITICAL: USE ONLY THESE FUNCTIONS
**The AI MUST NOT invent or use any functions not in this list!**

---

## 🔷 PRIMITIVES (Basic Shapes)

### 1. `occ.createBox(width, height, depth)`
Create a rectangular box
- **Parameters**: width, height, depth (all numbers)
- **Returns**: Box shape
- **Example**: `occ.createBox(10, 5, 3)`

### 2. `occ.createCylinder(radius, height)`
Create a cylinder
- **Parameters**: radius, height
- **Returns**: Cylinder shape
- **Example**: `occ.createCylinder(5, 10)`

### 3. `occ.createSphere(radius)`
Create a sphere
- **Parameters**: radius
- **Returns**: Sphere shape
- **Example**: `occ.createSphere(5)`

### 4. `occ.createCone(radius1, radius2, height)`
Create a cone (or frustum if radii differ)
- **Parameters**: radius1 (bottom), radius2 (top), height
- **Returns**: Cone shape
- **Example**: `occ.createCone(5, 2, 10)`

### 5. `occ.createTorus(majorRadius, minorRadius)`
Create a torus (donut shape)
- **Parameters**: majorRadius (ring radius), minorRadius (tube radius)
- **Returns**: Torus shape
- **Example**: `occ.createTorus(8, 2)`

### 6. `occ.createWedge(dx, dy, dz, ltx)`
Create a wedge (box with angled face)
- **Parameters**: dx, dy, dz, ltx (optional, default 0)
- **Returns**: Wedge shape
- **Example**: `occ.createWedge(10, 5, 3, 2)`

---

## 🔶 2D SHAPES & CURVES

### 7. `occ.createRegularPolygon(sides, radius, center?)`
Create regular polygon (hexagon, pentagon, etc.)
- **Parameters**: sides (number), radius, center {x, y, z} (optional)
- **Returns**: Face
- **Example**: `occ.createRegularPolygon(6, 5)` // hexagon

### 8. `occ.createCircle(radius, center?)`
Create a circle wire
- **Parameters**: radius, center {x, y, z} (optional)
- **Returns**: Wire
- **Example**: `occ.createCircle(5, {x: 0, y: 0, z: 0})`

### 9. `occ.createEllipse(majorRadius, minorRadius, center?)`
Create an ellipse wire
- **Parameters**: majorRadius, minorRadius, center {x, y, z} (optional)
- **Returns**: Wire
- **Example**: `occ.createEllipse(8, 4)`

### 10. `occ.createArc(radius, startAngle, endAngle, center?)`
Create an arc edge
- **Parameters**: radius, startAngle (degrees), endAngle (degrees), center (optional)
- **Returns**: Edge
- **Example**: `occ.createArc(5, 0, 90)` // quarter circle

### 11. `occ.createLine(start, end)`
Create a line wire
- **Parameters**: start {x, y, z}, end {x, y, z}
- **Returns**: Wire
- **Example**: `occ.createLine({x: 0, y: 0, z: 0}, {x: 10, y: 0, z: 0})`

### 12. `occ.createHelix(radius, height, pitch, turns?)`
Create a helix/spiral wire
- **Parameters**: radius, height, pitch, turns (optional)
- **Returns**: Wire
- **Example**: `occ.createHelix(3, 10, 2)` // spring shape

### 13. `occ.createRoundedRectangle(width, height, radius)`
Create rectangle with rounded corners
- **Parameters**: width, height, cornerRadius
- **Returns**: Face
- **Example**: `occ.createRoundedRectangle(10, 6, 1)`

---

## 🔷 WIRE & FACE OPERATIONS

### 14. `occ.createPoint(x, y, z)`
Create a point
- **Parameters**: x, y, z coordinates
- **Returns**: Point
- **Example**: `occ.createPoint(5, 3, 0)`

### 15. `occ.createDirection(x, y, z)`
Create a direction vector
- **Parameters**: x, y, z components
- **Returns**: Direction
- **Example**: `occ.createDirection(0, 0, 1)` // Z-axis

### 16. `occ.createEdge(point1, point2)`
Create an edge between two points
- **Parameters**: point1, point2
- **Returns**: Edge
- **Example**: `occ.createEdge(p1, p2)`

### 17. `occ.createWire(edges[])`
Create a wire from edges
- **Parameters**: array of edges
- **Returns**: Wire
- **Example**: `occ.createWire([edge1, edge2, edge3])`

### 18. `occ.createPolygonWire(points[])`
Create a polygon wire from points
- **Parameters**: array of points
- **Returns**: Wire
- **Example**: `occ.createPolygonWire([p1, p2, p3, p4])`

### 19. `occ.createFace(wire)`
Create a face from a wire
- **Parameters**: wire
- **Returns**: Face
- **Example**: `occ.createFace(myWire)`

---

## 🔶 TRANSFORMATIONS

### 20. `occ.translate(shape, x, y, z)`
Move a shape
- **Parameters**: shape, x offset, y offset, z offset
- **Returns**: Transformed shape
- **Example**: `occ.translate(box, 10, 0, 5)`

### 21. `occ.rotate(shape, axis, angle)`
Rotate a shape
- **Parameters**: shape, axis {x, y, z}, angle (degrees)
- **Returns**: Rotated shape
- **Example**: `occ.rotate(cylinder, {x: 0, y: 0, z: 1}, 45)`

### 22. `occ.scale(shape, factor)`
Scale a shape uniformly
- **Parameters**: shape, scale factor
- **Returns**: Scaled shape
- **Example**: `occ.scale(sphere, 1.5)`

### 23. `occ.mirror(shape, plane)`
Mirror a shape across a plane
- **Parameters**: shape, plane {point, normal}
- **Returns**: Mirrored shape
- **Example**: `occ.mirror(shape, {point: p1, normal: dir})`

---

## 🔷 BOOLEAN OPERATIONS

### 24. `occ.union(shape1, shape2)`
Combine two shapes (OR operation)
- **Parameters**: shape1, shape2 (or array of shapes)
- **Returns**: Combined shape
- **Example**: `occ.union(box, cylinder)`
- **Alias**: `occ.fuse(shape1, shape2)` (same function)

### 25. `occ.difference(shape1, shape2)`
Subtract shape2 from shape1 (NOT operation)
- **Parameters**: shape1, shape2
- **Returns**: Resulting shape
- **Example**: `occ.difference(box, cylinder)` // hole in box
- **Alias**: `occ.cut(shape1, shape2)` (same function)

### 26. `occ.intersection(shape1, shape2)`
Get intersection of two shapes (AND operation)
- **Parameters**: shape1, shape2
- **Returns**: Intersection shape
- **Example**: `occ.intersection(sphere1, sphere2)`

---

## 🔶 EDGE OPERATIONS

### 27. `occ.chamfer(shape, distance, edgeIndices?)`
Add chamfer (beveled edge)
- **Parameters**: shape, distance, edgeIndices (optional array)
- **Returns**: Chamfered shape
- **Example**: `occ.chamfer(box, 0.5)` // all edges
- **Example**: `occ.chamfer(box, 0.5, [0, 2, 4])` // specific edges

### 28. `occ.fillet(shape, radius, edgeIndices?)`
Add fillet (rounded edge)
- **Parameters**: shape, radius, edgeIndices (optional array)
- **Returns**: Filleted shape
- **Example**: `occ.fillet(box, 1)` // all edges
- **Example**: `occ.fillet(box, 1, [0, 2])` // specific edges

---

## 🔷 ADVANCED OPERATIONS

### 29. `occ.extrude(face, direction, distance)`
Extrude a face in a direction
- **Parameters**: face, direction {x, y, z}, distance
- **Returns**: Solid shape
- **Example**: `occ.extrude(circleFace, {x: 0, y: 0, z: 1}, 10)`

### 30. `occ.revolve(face, angle, axis?)`
Rotate a profile around an axis
- **Parameters**: face, angle (degrees, default 360), axis {point, direction} (optional)
- **Returns**: Revolved shape
- **Example**: `occ.revolve(profileFace, 360)` // full revolution

### 31. `occ.loft(wires[], solid?)`
Create shape between multiple profiles
- **Parameters**: array of wires, solid (boolean, default true)
- **Returns**: Lofted shape
- **Example**: `occ.loft([wire1, wire2, wire3], true)`

### 32. `occ.pipe(profile, path)`
Sweep profile along a path
- **Parameters**: profile (face/wire), path (wire)
- **Returns**: Pipe shape
- **Example**: `occ.pipe(circleFace, helixWire)` // spring

### 33. `occ.shell(shape, thickness, facesToRemove?)`
Hollow out a solid
- **Parameters**: shape, thickness (negative=outward), facesToRemove (optional array)
- **Returns**: Hollowed shape
- **Example**: `occ.shell(box, -0.5)` // hollow box

### 34. `occ.offset(shape, distance)`
Expand or contract a shape
- **Parameters**: shape, distance (positive=expand, negative=contract)
- **Returns**: Offset shape
- **Example**: `occ.offset(box, 2)` // expand by 2

### 35. `occ.thicken(face, thickness)`
Add thickness to a surface
- **Parameters**: face, thickness
- **Returns**: Solid shape
- **Example**: `occ.thicken(circleFace, 5)`

### 36. `occ.createPrism(base, vec)`
Extrude with specific vector
- **Parameters**: base (face/wire), vec {x, y, z}
- **Returns**: Prism shape
- **Example**: `occ.createPrism(triangleFace, {x: 0, y: 0, z: 10})`

### 37. `occ.draft(shape, angle, neutralPlane)`
Add draft angle for molding
- **Parameters**: shape, angle (degrees), neutralPlane
- **Returns**: Drafted shape
- **Example**: `occ.draft(box, 5, plane)`

### 38. `occ.sew(shapes[], tolerance?)`
Sew faces together into solid
- **Parameters**: array of shapes, tolerance (optional, default 0.001)
- **Returns**: Sewn shape
- **Example**: `occ.sew([face1, face2, face3])`

### 39. `occ.fixShape(shape)`
Attempt to fix invalid geometry
- **Parameters**: shape
- **Returns**: Fixed shape (or original if fix fails)
- **Example**: `occ.fixShape(brokenShape)`

---

## 🔶 PATTERNS & ARRAYS

### 40. `occ.circularPattern(shape, count, angleStep)`
Create circular pattern
- **Parameters**: shape, count, angleStep (degrees)
- **Returns**: Array of shapes
- **Example**: `occ.circularPattern(tooth, 20, 18)` // gear teeth

### 41. `occ.linearPattern(shape, count, direction, spacing)`
Create linear pattern
- **Parameters**: shape, count, direction {x, y, z}, spacing
- **Returns**: Array of shapes
- **Example**: `occ.linearPattern(hole, 5, {x: 1, y: 0, z: 0}, 10)`

### 42. `occ.rectangularPattern(shape, xCount, yCount, xSpacing, ySpacing)`
Create rectangular grid pattern
- **Parameters**: shape, xCount, yCount, xSpacing, ySpacing
- **Returns**: Array of shapes
- **Example**: `occ.rectangularPattern(cylinder, 3, 4, 10, 10)`

---

## 🔷 UTILITY FUNCTIONS

### 43. `occ.compound(shapes[])`
Combine multiple shapes into compound
- **Parameters**: array of shapes
- **Returns**: Compound shape
- **Example**: `occ.compound([box, sphere, cylinder])`

### 44. `occ.createCylinderBetweenPoints(radius, start, end)`
Create cylinder between two points
- **Parameters**: radius, start {x, y, z}, end {x, y, z}
- **Returns**: Cylinder shape
- **Example**: `occ.createCylinderBetweenPoints(1, {x: 0, y: 0, z: 0}, {x: 10, y: 10, z: 0})`

### 45. `occ.getBoundingBox(shape)`
Get bounding box of a shape
- **Parameters**: shape
- **Returns**: {xMin, yMin, zMin, xMax, yMax, zMax, width, height, depth, center}
- **Example**: `const bbox = occ.getBoundingBox(myShape)`

### 46. `occ.getProperties(shape)`
Get shape properties
- **Parameters**: shape
- **Returns**: {volume, surfaceArea, centerOfMass: {x, y, z}}
- **Example**: `const props = occ.getProperties(box)`

### 47. `occ.getFaces(shape)`
Get all faces from a shape
- **Parameters**: shape
- **Returns**: Array of faces
- **Example**: `const faces = occ.getFaces(box)`

### 48. `occ.getEdges(shape)`
Get all edges from a shape
- **Parameters**: shape
- **Returns**: Array of edges
- **Example**: `const edges = occ.getEdges(cylinder)`

---

## 🔷 SPECIALIZED FUNCTIONS (Advanced)

### 49. `occ.createBezierCurve(points[])`
Create a Bezier curve through points
- **Parameters**: array of points
- **Returns**: Wire
- **Example**: `occ.createBezierCurve([p1, p2, p3, p4])`

### 50. `occ.createSpline(points[])`
Create a smooth spline through points
- **Parameters**: array of points
- **Returns**: Wire
- **Example**: `occ.createSpline([p1, p2, p3])`

### 51. `occ.createKnurledCylinder(radius, height, knurlCount?, knurlDepth?)`
Create cylinder with knurled (textured) surface
- **Parameters**: radius, height, knurlCount (default 20), knurlDepth (default 0.1)
- **Returns**: Knurled cylinder shape
- **Example**: `occ.createKnurledCylinder(2, 10, 24, 0.15)` // grip handle

### 52. `occ.createThreadedCylinder(radius, height, pitch, threadDepth?)`
Create cylinder with ISO thread grooves
- **Parameters**: radius, height, pitch, threadDepth (default 0.15)
- **Returns**: Threaded cylinder shape
- **Example**: `occ.createThreadedCylinder(1.5, 10, 1, 0.2)` // bolt shaft

### 53. `occ.createHexPrism(radius, height)`
Create hexagonal prism (for bolt heads)
- **Parameters**: radius (circumradius), height
- **Returns**: Hexagonal prism shape
- **Example**: `occ.createHexPrism(3, 2)` // bolt head

### 54. `occ.createStar(outerRadius, innerRadius, points?)`
Create a star shape
- **Parameters**: outerRadius, innerRadius, points (default 5)
- **Returns**: Star face
- **Example**: `occ.createStar(5, 2, 6)` // 6-pointed star

### 55. `occ.createTextBlock(text, letterWidth?, letterHeight?, depth?, spacing?)`
Create simple text as extruded blocks
- **Parameters**: text (string), letterWidth (default 2), letterHeight (default 5), depth (default 1), spacing (default 0.5)
- **Returns**: Compound of letter blocks
- **Example**: `occ.createTextBlock("CAD", 2, 5, 1, 0.5)`

### 56. `occ.createCountersunkHole(cylinderRadius, cylinderHeight, coneRadius, coneHeight)`
Create countersunk hole (cylinder + cone)
- **Parameters**: cylinderRadius, cylinderHeight, coneRadius, coneHeight
- **Returns**: Countersunk hole shape
- **Example**: `occ.createCountersunkHole(0.5, 5, 1.5, 1)` // screw hole

### 57. `occ.createSpring(radius, height, pitch, wireRadius?)`
Create coil spring
- **Parameters**: radius, height, pitch, wireRadius (default 0.2)
- **Returns**: Spring shape
- **Example**: `occ.createSpring(3, 15, 2, 0.3)`

### 58. `occ.createTaperedCylinder(bottomRadius, topRadius, height)`
Create tapered cylinder (alias for cone)
- **Parameters**: bottomRadius, topRadius, height
- **Returns**: Tapered cylinder
- **Example**: `occ.createTaperedCylinder(5, 2, 10)` // funnel

### 59. `occ.createSlot(length, width, depth)`
Create rectangular slot/groove
- **Parameters**: length, width, depth
- **Returns**: Slot shape (box)
- **Example**: `occ.createSlot(10, 2, 3)` // keyway slot

---

## 📊 FUNCTION SUMMARY

**Total Functions**: 59

### By Category:
- **Primitives**: 6 functions
- **2D Shapes & Curves**: 7 functions
- **Wire & Face**: 6 functions
- **Transformations**: 4 functions
- **Boolean Operations**: 3 functions
- **Edge Operations**: 2 functions
- **Advanced Operations**: 11 functions
- **Patterns**: 3 functions
- **Utilities**: 6 functions
- **Specialized** (NEW): 11 functions

---

## ⚠️ CRITICAL RULES FOR AI

1. **ONLY USE FUNCTIONS FROM THIS LIST** - Do NOT invent new functions!
2. **Check function signatures** - Use correct parameter types and order
3. **Handle errors** - Wrap risky operations in try-catch
4. **Validate parameters** - Check for valid values before calling
5. **Use fallbacks** - Return simple shapes if complex operations fail
6. **Combine functions** - Use these functions creatively to build complex models

---

## 🎯 COMMON PATTERNS

### Bolt with Threads (CORRECT WAY)
```javascript
// 1. Hexagonal head using createHexPrism
const head = occ.createHexPrism(3, 2);

// 2. Threaded shaft using createThreadedCylinder
const shaft = occ.createThreadedCylinder(1.5, 10, 1, 0.15);
const shaftPos = occ.translate(shaft, 0, 0, 2);

// 3. Combine
const bolt = occ.union(head, shaftPos);
return bolt;
```

### Bolt Alternative (Manual Way)
```javascript
// 1. Hexagonal head (regular polygon + thicken)
const hexFace = occ.createRegularPolygon(6, 3);
const head = occ.thicken(hexFace, 2);

// 2. Cylindrical shaft
const shaft = occ.createCylinder(1.5, 10);
const shaftPos = occ.translate(shaft, 0, 0, 2);

// 3. Thread grooves using torus pattern
let threadedShaft = shaftPos;
for (let i = 0; i < 10; i++) {
  const groove = occ.createTorus(1.5, 0.15);
  const groovePos = occ.translate(groove, 0, 0, 2 + i * 1);
  threadedShaft = occ.difference(threadedShaft, groovePos);
}

// 4. Combine
const bolt = occ.union(head, threadedShaft);
return bolt;
```

### Gear with Teeth
```javascript
// 1. Base cylinder
const gear = occ.createCylinder(10, 2);

// 2. Create one tooth
const tooth = occ.createBox(1, 3, 2);
const toothPos = occ.translate(tooth, 11, 0, 0);

// 3. Pattern teeth around
const teeth = occ.circularPattern(toothPos, 20, 18);

// 4. Union all
let gearWithTeeth = gear;
for (let t of teeth) {
  gearWithTeeth = occ.union(gearWithTeeth, t);
}

return gearWithTeeth;
```

### Screwdriver with Details
```javascript
// Handle with grip ridges
const handle = occ.createCylinder(2.5 / 2, 6);
for (let i = 0; i < 8; i++) {
  const ridge = occ.createTorus(2.5 / 2, 0.15);
  const ridgePos = occ.translate(ridge, 0, 0, i * 0.75);
  handle = occ.difference(handle, ridgePos);
}

// Chamfer for polish
handle = occ.chamfer(handle, 0.1);
```

---

## 🚫 FORBIDDEN ACTIONS

**DO NOT**:
- ❌ Create functions like `occ.createThread()` - doesn't exist! Use `occ.createThreadedCylinder()` instead
- ❌ Use `occ.makeCompound()` - use `occ.compound()` instead
- ❌ Invent `occ.createHelixThread()` - use `occ.createHelix()` + `occ.pipe()` or `occ.createSpring()`
- ❌ Use `occ.createRegularPolygon(6, r, height)` to create 3D hexagon - that creates 2D face! Use `occ.createHexPrism(radius, height)` instead
- ❌ Use undefined aliases - stick to documented function names

**ALWAYS**:
- ✅ Check this list before using any function
- ✅ Use correct function names exactly as shown
- ✅ Provide all required parameters
- ✅ Add validation and error handling
