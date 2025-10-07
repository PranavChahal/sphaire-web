# OpenCascade.js Architectural Elements Examples

## Example 1: Wall with Door and Window Openings

```javascript
// === DESIGN ANALYSIS ===
// Recall: Standard building dimensions
// - Door height: 2.0-2.1m (residential), width: 0.8-0.9m
// - Window height: 1.2-1.5m, sill height: 0.8-1.0m from floor
// - Wall thickness: 200mm (exterior), 100-150mm (interior)

// === PARAMETERS ===
const wallLength = 5000.0; // mm
const wallHeight = 3000.0;
const wallThickness = 200.0;
const doorWidth = 900.0;
const doorHeight = 2000.0;
const doorOffset = 500.0; // From left edge
const windowWidth = 1200.0;
const windowHeight = 1500.0;
const windowSillHeight = 800.0;
const windowOffset = 3000.0; // From left edge

// === CONSTRUCTION ===
// 1. Create solid wall base
const wall = occ.createBox(wallLength, wallThickness, wallHeight);

// 2. Door opening (slightly oversized for frame clearance)
const door = occ.createBox(doorWidth + 20, wallThickness * 1.2, doorHeight + 10);
const doorPos = occ.translate(door,
  doorOffset,
  -wallThickness * 0.1,
  -5 // Slightly below floor
);

// 3. Window opening
const window = occ.createBox(windowWidth + 20, wallThickness * 1.2, windowHeight + 10);
const windowPos = occ.translate(window,
  windowOffset,
  -wallThickness * 0.1,
  windowSillHeight - 5
);

// 4. Cut openings from wall
let wallComplete = occ.difference(wall, doorPos);
wallComplete = occ.difference(wallComplete, windowPos);

// === VALIDATION ===
if (wallComplete && typeof wallComplete.ShapeType === 'function') {
  return wallComplete;
} else {
  console.error('Wall creation failed');
  return occ.createBox(wallLength, wallThickness, wallHeight);
}
```

## Example 2: Staircase with Steps

```javascript
// === DESIGN ANALYSIS ===
// Recall: Stair building codes (IBC, IRC)
// - Riser height: 175-200mm (7-8 inches)
// - Tread depth: 250-300mm (10-12 inches)
// - Riser/Tread relationship: 2×riser + tread = 600-650mm
// - Minimum width: 900mm (36 inches)

// === PARAMETERS ===
const stepCount = 12;
const stepWidth = 1000.0; // mm
const stepDepth = 280.0; // Tread depth
const stepHeight = 180.0; // Riser height
const stepThickness = 50.0;
const stringerWidth = 200.0;
const stringerThickness = 50.0;

// === CALCULATED ===
const totalRise = stepCount * stepHeight;
const totalRun = stepCount * stepDepth;

// === CONSTRUCTION ===
let staircase = null;

// 1. Create individual steps
for (let i = 0; i < stepCount; i++) {
  const step = occ.createBox(stepWidth, stepDepth, stepThickness);
  const stepPos = occ.translate(step, 0, i * stepDepth, i * stepHeight);
  
  if (staircase === null) {
    staircase = stepPos;
  } else {
    staircase = occ.union(staircase, stepPos);
  }
}

// 2. Left stringer (side support)
const stringerLeft = occ.createBox(stringerThickness, totalRun, stringerWidth);
// Rotate to follow stair slope
const slopeAngle = Math.atan(totalRise / totalRun) * 180 / Math.PI;
const stringerLeftRotated = occ.rotate(stringerLeft, {x:1, y:0, z:0}, -slopeAngle);
const stringerLeftPos = occ.translate(stringerLeftRotated, -stringerThickness - 10, 0, 0);

// 3. Right stringer
const stringerRightPos = occ.translate(stringerLeftRotated, stepWidth + 10, 0, 0);

// 4. Combine steps + stringers
staircase = occ.union(staircase, occ.union(stringerLeftPos, stringerRightPos));

// === VALIDATION ===
if (staircase && typeof staircase.ShapeType === 'function') {
  return staircase;
} else {
  console.error('Staircase creation failed');
  // Fallback: simple ramp
  return occ.createBox(stepWidth, totalRun, totalRise / 10);
}
```

## Example 3: Roof Truss (Triangular)

```javascript
// === DESIGN ANALYSIS ===
// Recall: Roof truss design
// - Common pitch: 4:12 to 12:12 (18° to 45°)
// - Span: 6-12 meters typical residential
// - Chord size: 2×4 to 2×12 lumber (38-305mm)
// Components: top chords, bottom chord, web members

// === PARAMETERS ===
const span = 8000.0; // mm (8 meters)
const pitch = 30; // degrees (7:12 pitch ≈ 30°)
const chordWidth = 150.0;
const chordHeight = 50.0;
const webWidth = 100.0;
const webHeight = 50.0;

// === CALCULATED ===
const rise = (span / 2) * Math.tan(pitch * Math.PI / 180);
const rafterLength = (span / 2) / Math.cos(pitch * Math.PI / 180);

// === CONSTRUCTION ===
// 1. Bottom chord (horizontal tie beam)
const bottomChord = occ.createBox(span, chordWidth, chordHeight);

// 2. Left rafter (top chord)
const leftRafter = occ.createBox(rafterLength + 100, chordWidth, chordHeight);
const leftRafterRotated = occ.rotate(leftRafter, {x:0, y:1, z:0}, pitch);
const leftRafterPos = occ.translate(leftRafterRotated, 0, 0, chordHeight);

// 3. Right rafter (top chord)
const rightRafterRotated = occ.rotate(leftRafter, {x:0, y:1, z:0}, -pitch);
const rightRafterPos = occ.translate(rightRafterRotated, span - 50, 0, chordHeight);

// 4. King post (vertical center support)
const kingPost = occ.createBox(webWidth, webWidth, rise);
const kingPostPos = occ.translate(kingPost, 
  span / 2 - webWidth / 2, 
  chordWidth / 2 - webWidth / 2, 
  chordHeight
);

// 5. Web members (diagonal supports)
const webLength = Math.sqrt(Math.pow(span / 4, 2) + Math.pow(rise / 2, 2));
const webAngle = Math.atan((rise / 2) / (span / 4)) * 180 / Math.PI;

const leftWeb = occ.createBox(webLength, webWidth, webHeight);
const leftWebRotated = occ.rotate(leftWeb, {x:0, y:1, z:0}, webAngle);
const leftWebPos = occ.translate(leftWebRotated, 0, chordWidth / 2 - webWidth / 2, chordHeight);

const rightWeb = occ.createBox(webLength, webWidth, webHeight);
const rightWebRotated = occ.rotate(rightWeb, {x:0, y:1, z:0}, -webAngle);
const rightWebPos = occ.translate(rightWebRotated, span - webLength + 50, chordWidth / 2 - webWidth / 2, chordHeight);

// 6. Combine all members
let truss = occ.union(bottomChord, leftRafterPos);
truss = occ.union(truss, rightRafterPos);
truss = occ.union(truss, kingPostPos);
truss = occ.union(truss, leftWebPos);
truss = occ.union(truss, rightWebPos);

// === VALIDATION ===
if (truss && typeof truss.ShapeType === 'function') {
  return truss;
} else {
  console.error('Truss creation failed');
  return occ.createBox(span, chordWidth, rise);
}
```

## Example 4: Column with Capital and Base

```javascript
// === DESIGN ANALYSIS ===
// Recall: Classical column orders (Doric, Ionic, Corinthian)
// - Typical proportions: height 8-12× diameter
// - Capital height: ~diameter
// - Base height: ~0.5× diameter
// - Shaft taper: slight (entasis)

// === PARAMETERS ===
const shaftDiameter = 500.0;
const shaftHeight = 3000.0; // 6× diameter (simplified)
const capitalHeight = 500.0;
const capitalDiameter = 700.0;
const baseHeight = 250.0;
const baseDiameter = 700.0;

// === CONSTRUCTION ===
// 1. Column shaft (slightly tapered)
const shaftBottom = occ.createCylinder(shaftDiameter / 2, shaftHeight);
// Note: True entasis requires sweep/loft (not available)

// 2. Capital (decorative top)
const capitalBase = occ.createCylinder(capitalDiameter / 2, capitalHeight);
const capitalPos = occ.translate(capitalBase, 0, 0, shaftHeight);

// 3. Capital decoration (simplified abacus)
const abacus = occ.createBox(capitalDiameter * 0.9, capitalDiameter * 0.9, capitalHeight * 0.3);
const abacusPos = occ.translate(abacus, 
  -capitalDiameter * 0.45, 
  -capitalDiameter * 0.45, 
  shaftHeight + capitalHeight * 0.7
);

// 4. Base (plinth)
const base = occ.createCylinder(baseDiameter / 2, baseHeight);
const basePos = occ.translate(base, 0, 0, -baseHeight);

// 5. Combine all parts
let column = occ.union(shaftBottom, capitalPos);
column = occ.union(column, abacusPos);
column = occ.union(column, basePos);

// === VALIDATION ===
if (column && typeof column.ShapeType === 'function') {
  return column;
} else {
  console.error('Column creation failed');
  return occ.createCylinder(shaftDiameter / 2, shaftHeight);
}
```

## Example 5: Window Frame with Mullions

```javascript
// === DESIGN ANALYSIS ===
// Recall: Standard window construction
// - Frame width: 50-100mm
// - Mullions (dividers): 30-50mm
// - Glass thickness: 4-6mm (not modeled, just opening)
// - Typical sizes: 1200×1200mm (single), 1800×1200mm (double)

// === PARAMETERS ===
const windowWidth = 1200.0;
const windowHeight = 1200.0;
const frameWidth = 80.0;
const frameDepth = 100.0;
const mullionWidth = 40.0;
const glassInset = 20.0;

// === CALCULATED ===
const outerWidth = windowWidth + 2 * frameWidth;
const outerHeight = windowHeight + 2 * frameWidth;

// === CONSTRUCTION ===
// 1. Outer frame
const outerFrame = occ.createBox(outerWidth, frameDepth, outerHeight);

// 2. Glass opening
const glassOpening = occ.createBox(
  windowWidth - 2 * glassInset,
  frameDepth * 1.2,
  windowHeight - 2 * glassInset
);
const glassOpeningPos = occ.translate(glassOpening,
  frameWidth + glassInset,
  -frameDepth * 0.1,
  frameWidth + glassInset
);

// 3. Cut glass opening from frame
let frame = occ.difference(outerFrame, glassOpeningPos);

// 4. Vertical mullion (center divider)
const verticalMullion = occ.createBox(mullionWidth, frameDepth, windowHeight);
const verticalMullionPos = occ.translate(verticalMullion,
  outerWidth / 2 - mullionWidth / 2,
  0,
  frameWidth
);

// 5. Horizontal mullion (center divider)
const horizontalMullion = occ.createBox(windowWidth, frameDepth, mullionWidth);
const horizontalMullionPos = occ.translate(horizontalMullion,
  frameWidth,
  0,
  outerHeight / 2 - mullionWidth / 2
);

// 6. Combine frame + mullions
frame = occ.union(frame, verticalMullionPos);
frame = occ.union(frame, horizontalMullionPos);

// === VALIDATION ===
if (frame && typeof frame.ShapeType === 'function') {
  return frame;
} else {
  console.error('Window frame creation failed');
  return occ.createBox(outerWidth, frameDepth, outerHeight);
}
```

## Example 6: Simple Building (House)

```javascript
// === DESIGN ANALYSIS ===
// Recall: Small residential building proportions
// - Floor area: 80-150 m² typical
// - Wall height: 2.4-3.0m (floor to ceiling)
// - Roof pitch: 30-45° (moderate climate)
// - Foundation: 0.3-0.6m above ground

// === PARAMETERS ===
const buildingLength = 10000.0; // 10m
const buildingWidth = 8000.0; // 8m
const wallHeight = 3000.0; // 3m
const wallThickness = 200.0;
const roofPitch = 35; // degrees
const roofOverhang = 500.0;

// === CALCULATED ===
const roofRise = (buildingWidth / 2) * Math.tan(roofPitch * Math.PI / 180);
const roofLength = (buildingWidth / 2) / Math.cos(roofPitch * Math.PI / 180);

// === CONSTRUCTION ===
// 1. Foundation slab
const foundation = occ.createBox(
  buildingLength + 2 * roofOverhang,
  buildingWidth + 2 * roofOverhang,
  300 // 30cm thick
);
const foundationPos = occ.translate(foundation, -roofOverhang, -roofOverhang, -300);

// 2. Walls (hollow box)
const outerWalls = occ.createBox(buildingLength, buildingWidth, wallHeight);
const innerSpace = occ.createBox(
  buildingLength - 2 * wallThickness,
  buildingWidth - 2 * wallThickness,
  wallHeight + 100
);
const innerSpacePos = occ.translate(innerSpace, wallThickness, wallThickness, -50);
let walls = occ.difference(outerWalls, innerSpacePos);

// 3. Door opening (front wall)
const door = occ.createBox(900, wallThickness * 1.2, 2100);
const doorPos = occ.translate(door, buildingLength / 2 - 450, -wallThickness * 0.1, 0);
walls = occ.difference(walls, doorPos);

// 4. Window openings (simplified - one per wall)
const window = occ.createBox(1200, wallThickness * 1.2, 1500);

// Front window
const frontWindowPos = occ.translate(window, buildingLength / 4 - 600, -wallThickness * 0.1, 800);
walls = occ.difference(walls, frontWindowPos);

// Back window
const backWindowPos = occ.translate(window, 
  buildingLength / 4 - 600, 
  buildingWidth - wallThickness * 0.1, 
  800
);
walls = occ.difference(walls, backWindowPos);

// 5. Roof (two slopes)
// Left slope
const roofLeft = occ.createBox(roofLength + roofOverhang, buildingLength + 2 * roofOverhang, 100);
const roofLeftRotated = occ.rotate(roofLeft, {x:1, y:0, z:0}, roofPitch);
const roofLeftPos = occ.translate(roofLeftRotated, -roofOverhang, buildingWidth / 2, wallHeight);

// Right slope
const roofRightRotated = occ.rotate(roofLeft, {x:1, y:0, z:0}, -roofPitch);
const roofRightPos = occ.translate(roofRightRotated, -roofOverhang, buildingWidth / 2, wallHeight);

// 6. Combine all components
let building = occ.union(foundationPos, walls);
building = occ.union(building, roofLeftPos);
building = occ.union(building, roofRightPos);

// === VALIDATION ===
if (building && typeof building.ShapeType === 'function') {
  return building;
} else {
  console.error('Building creation failed');
  return occ.createBox(buildingLength, buildingWidth, wallHeight);
}
```

## Example 7: Archway

```javascript
// === DESIGN ANALYSIS ===
// Recall: Arch design principles
// - Span-to-rise ratio: 2:1 to 3:1 typical
// - Thickness: proportional to span
// - Types: semicircular, segmental, pointed

// === PARAMETERS ===
const archWidth = 2000.0; // Span
const archHeight = 1200.0; // Rise (semicircular would be 1000)
const archDepth = 300.0;
const archThickness = 200.0;
const pierWidth = 400.0;
const pierHeight = 2000.0;

// === CONSTRUCTION ===
// Note: True arch requires sweep/revolve (not available)
// Simplified as box with cylinder cutout

// 1. Solid block
const block = occ.createBox(archWidth + 2 * pierWidth, archDepth, pierHeight + archHeight);

// 2. Arch opening (cylinder approximation)
const archRadius = archWidth / 2;
const archCutout = occ.createCylinder(archRadius, archDepth * 1.2);
const archCutoutRotated = occ.rotate(archCutout, {x:0, y:1, z:0}, 90);
const archCutoutPos = occ.translate(archCutoutRotated,
  pierWidth + archWidth / 2,
  -archDepth * 0.1,
  pierHeight
);

// 3. Cut arch opening
let archway = occ.difference(block, archCutoutPos);

// 4. Cut rectangular passage below arch
const passage = occ.createBox(archWidth, archDepth * 1.2, pierHeight);
const passagePos = occ.translate(passage, pierWidth, -archDepth * 0.1, 0);
archway = occ.difference(archway, passagePos);

// === VALIDATION ===
if (archway && typeof archway.ShapeType === 'function') {
  return archway;
} else {
  console.error('Archway creation failed');
  return occ.createBox(archWidth + 2 * pierWidth, archDepth, pierHeight);
}
```

---

These examples demonstrate:
- ✅ Standard building codes and dimensions
- ✅ Parametric relationships (rise/run ratios, proportions)
- ✅ Realistic construction sequences
- ✅ Defensive validation
- ✅ Fallback strategies
- ✅ Clear documentation of design intent
