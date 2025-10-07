# OpenCascade.js Complex Assembly Examples

## Example 1: Car (Simplified Sedan)

```javascript
// === DESIGN ANALYSIS ===
// Recall: Typical sedan dimensions
// - Length: 4.5-5.0m
// - Width: 1.7-1.9m
// - Height: 1.4-1.5m
// - Wheelbase: 2.6-2.8m (55-60% of length)
// - Wheel diameter: 0.6-0.7m (16-17 inch wheels)
// Components: body, cabin, wheels (4), windows

// === PARAMETERS ===
const carLength = 4500.0;
const carWidth = 1800.0;
const bodyHeight = 1200.0;
const cabinHeight = 800.0;
const cabinLength = 2200.0;
const cabinOffset = 1000.0; // From front
const wheelRadius = 320.0; // 16 inch
const wheelWidth = 200.0;
const wheelbase = 2600.0;
const trackWidth = 1500.0;
const groundClearance = 150.0;

// === CONSTRUCTION ===
// 1. Main body (lower section)
const body = occ.createBox(carLength, carWidth, bodyHeight);

// 2. Cabin (upper passenger compartment)
const cabin = occ.createBox(cabinLength, carWidth, cabinHeight);
const cabinPos = occ.translate(cabin, cabinOffset, 0, bodyHeight);

// 3. Front hood slope (simplified)
const hoodSlope = occ.createBox(800, carWidth, 400);
const hoodSlopePos = occ.translate(hoodSlope, 0, 0, bodyHeight - 400);

// 4. Wheels (cylinders rotated 90°)
const wheelBase = occ.createCylinder(wheelRadius, wheelWidth);
const wheel = occ.rotate(wheelBase, {x:0, y:1, z:0}, 90);

// Front-left wheel
const wheelFL = occ.translate(wheel,
  carLength * 0.3,
  -wheelWidth / 2,
  wheelRadius + groundClearance
);

// Front-right wheel
const wheelFR = occ.translate(wheel,
  carLength * 0.3,
  carWidth - wheelWidth / 2,
  wheelRadius + groundClearance
);

// Rear-left wheel
const wheelRL = occ.translate(wheel,
  carLength * 0.7,
  -wheelWidth / 2,
  wheelRadius + groundClearance
);

// Rear-right wheel
const wheelRR = occ.translate(wheel,
  carLength * 0.7,
  carWidth - wheelWidth / 2,
  wheelRadius + groundClearance
);

// 5. Window cutouts (simplified)
const windowHeight = 600;
const windowLength = cabinLength - 400;
const sideWindow = occ.createBox(windowLength, 50, windowHeight);

// Left side windows
const leftWindowPos = occ.translate(sideWindow,
  cabinOffset + 200,
  -30,
  bodyHeight + 100
);

// Right side windows
const rightWindowPos = occ.translate(sideWindow,
  cabinOffset + 200,
  carWidth - 20,
  bodyHeight + 100
);

// 6. Combine body components
let carBody = occ.union(body, cabinPos);
carBody = occ.union(carBody, hoodSlopePos);

// Cut windows
carBody = occ.difference(carBody, leftWindowPos);
carBody = occ.difference(carBody, rightWindowPos);

// 7. Combine body with wheels
const allWheels = occ.union(wheelFL, occ.union(wheelFR, occ.union(wheelRL, wheelRR)));
const car = occ.union(carBody, allWheels);

// === VALIDATION ===
if (car && typeof car.ShapeType === 'function') {
  return car;
} else {
  console.error('Car creation failed, returning simplified version');
  return occ.createBox(carLength, carWidth, bodyHeight);
}
```

## Example 2: Engine Block (Simplified 4-Cylinder)

```javascript
// === DESIGN ANALYSIS ===
// Recall: Engine block components
// - Cylinder bores (4 for inline-4)
// - Crankcase
// - Oil pan mounting surface
// - Coolant passages (simplified)
// Typical inline-4: bore 80-90mm, stroke 80-100mm

// === PARAMETERS ===
const cylinderCount = 4;
const boreDiameter = 85.0;
const boreSpacing = 100.0; // Center-to-center
const blockLength = cylinderCount * boreSpacing + 100;
const blockWidth = 200.0;
const blockHeight = 150.0;
const cylinderDepth = 100.0;
const crankcaseHeight = 80.0;

// === CALCULATED ===
const totalLength = (cylinderCount - 1) * boreSpacing;

// === CONSTRUCTION ===
// 1. Main block body
const blockBody = occ.createBox(blockLength, blockWidth, blockHeight);

// 2. Crankcase (lower section)
const crankcase = occ.createBox(blockLength, blockWidth * 1.2, crankcaseHeight);
const crankcasePos = occ.translate(crankcase, 0, -blockWidth * 0.1, -crankcaseHeight);

// 3. Cylinder bores (drill from top)
let engineBlock = occ.union(blockBody, crankcasePos);

for (let i = 0; i < cylinderCount; i++) {
  const bore = occ.createCylinder(boreDiameter / 2, cylinderDepth);
  const borePos = occ.translate(bore,
    50 + i * boreSpacing,
    blockWidth / 2,
    blockHeight - cylinderDepth + 1
  );
  engineBlock = occ.difference(engineBlock, borePos);
}

// 4. Coolant jacket (simplified as through-hole)
const coolantPassage = occ.createBox(blockLength - 100, 30, blockHeight - 20);
const coolantPos = occ.translate(coolantPassage, 50, 20, 10);
engineBlock = occ.difference(engineBlock, coolantPos);

// 5. Oil pan mounting holes (circular pattern on bottom)
const mountingHole = occ.createCylinder(5, 20);
const hole1 = occ.translate(mountingHole, 50, blockWidth / 4, -crankcaseHeight - 1);
const hole2 = occ.translate(mountingHole, blockLength - 50, blockWidth / 4, -crankcaseHeight - 1);
const hole3 = occ.translate(mountingHole, 50, 3 * blockWidth / 4, -crankcaseHeight - 1);
const hole4 = occ.translate(mountingHole, blockLength - 50, 3 * blockWidth / 4, -crankcaseHeight - 1);

engineBlock = occ.difference(engineBlock, occ.union(hole1, occ.union(hole2, occ.union(hole3, hole4))));

// === VALIDATION ===
if (engineBlock && typeof engineBlock.ShapeType === 'function') {
  return engineBlock;
} else {
  console.error('Engine block creation failed');
  return occ.createBox(blockLength, blockWidth, blockHeight);
}
```

## Example 3: Gearbox Housing

```javascript
// === DESIGN ANALYSIS ===
// Recall: Gearbox housing requirements
// - Contains gears, shafts, bearings
// - Input/output shaft bores
// - Mounting flanges
// - Inspection/fill ports

// === PARAMETERS ===
const housingLength = 300.0;
const housingWidth = 200.0;
const housingHeight = 250.0;
const wallThickness = 10.0;
const inputShaftDiameter = 40.0;
const outputShaftDiameter = 50.0;
const bearingBossDiameter = 80.0;
const bearingBossHeight = 30.0;
const flangeDiameter = 150.0;
const flangeThickness = 20.0;

// === CONSTRUCTION ===
// 1. Outer shell
const outerShell = occ.createBox(housingLength, housingWidth, housingHeight);

// 2. Inner cavity (hollow out)
const innerCavity = occ.createBox(
  housingLength - 2 * wallThickness,
  housingWidth - 2 * wallThickness,
  housingHeight - wallThickness
);
const cavityPos = occ.translate(innerCavity, wallThickness, wallThickness, wallThickness);

let housing = occ.difference(outerShell, cavityPos);

// 3. Input shaft bore with bearing boss
const inputBore = occ.createCylinder(inputShaftDiameter / 2, wallThickness * 2);
const inputBoreRotated = occ.rotate(inputBore, {x:0, y:1, z:0}, 90);
const inputBorePos = occ.translate(inputBoreRotated,
  housingLength / 3,
  -wallThickness,
  housingHeight / 2
);

const inputBoss = occ.createCylinder(bearingBossDiameter / 2, bearingBossHeight);
const inputBossRotated = occ.rotate(inputBoss, {x:0, y:1, z:0}, 90);
const inputBossPos = occ.translate(inputBossRotated,
  housingLength / 3,
  -bearingBossHeight,
  housingHeight / 2
);

housing = occ.difference(housing, inputBorePos);
housing = occ.union(housing, inputBossPos);

// 4. Output shaft bore with flange
const outputBore = occ.createCylinder(outputShaftDiameter / 2, wallThickness * 2);
const outputBoreRotated = occ.rotate(outputBore, {x:0, y:1, z:0}, 90);
const outputBorePos = occ.translate(outputBoreRotated,
  2 * housingLength / 3,
  housingWidth - wallThickness,
  housingHeight / 2
);

const outputFlange = occ.createCylinder(flangeDiameter / 2, flangeThickness);
const outputFlangeRotated = occ.rotate(outputFlange, {x:0, y:1, z:0}, 90);
const outputFlangePos = occ.translate(outputFlangeRotated,
  2 * housingLength / 3,
  housingWidth,
  housingHeight / 2
);

housing = occ.difference(housing, outputBorePos);
housing = occ.union(housing, outputFlangePos);

// 5. Inspection port (top cover opening)
const inspectionPort = occ.createBox(
  housingLength * 0.6,
  housingWidth * 0.6,
  wallThickness * 2
);
const portPos = occ.translate(inspectionPort,
  housingLength * 0.2,
  housingWidth * 0.2,
  housingHeight - wallThickness
);
housing = occ.difference(housing, portPos);

// 6. Mounting holes (4 corners on bottom)
const mountHole = occ.createCylinder(8, wallThickness * 2);

const mount1 = occ.translate(mountHole, 30, 30, -wallThickness);
const mount2 = occ.translate(mountHole, housingLength - 30, 30, -wallThickness);
const mount3 = occ.translate(mountHole, 30, housingWidth - 30, -wallThickness);
const mount4 = occ.translate(mountHole, housingLength - 30, housingWidth - 30, -wallThickness);

housing = occ.difference(housing, occ.union(mount1, occ.union(mount2, occ.union(mount3, mount4))));

// === VALIDATION ===
if (housing && typeof housing.ShapeType === 'function') {
  return housing;
} else {
  console.error('Gearbox housing creation failed');
  return occ.createBox(housingLength, housingWidth, housingHeight);
}
```

## Example 4: Robot Arm Joint

```javascript
// === DESIGN ANALYSIS ===
// Recall: Robot joint components
// - Base mount
// - Rotating joint (bearing interface)
// - Arm segment
// - Motor mount
// - Cable routing channels

// === PARAMETERS ===
const baseDiameter = 100.0;
const baseHeight = 40.0;
const jointDiameter = 60.0;
const jointHeight = 80.0;
const armLength = 200.0;
const armWidth = 50.0;
const armHeight = 60.0;
const bearingDiameter = 40.0;
const motorMountDiameter = 80.0;
const motorMountHeight = 30.0;

// === CONSTRUCTION ===
// 1. Base plate (mounting to previous segment)
const base = occ.createCylinder(baseDiameter / 2, baseHeight);

// 2. Mounting holes in base (4 holes)
const mountHole = occ.createCylinder(5, baseHeight * 1.2);
const mountHolePos1 = occ.translate(mountHole, baseDiameter * 0.3, 0, -baseHeight * 0.1);
const mountHoles = occ.circularPattern(mountHolePos1, 4, 90);

let joint = occ.difference(base, mountHoles);

// 3. Joint housing (rotating section)
const jointBody = occ.createCylinder(jointDiameter / 2, jointHeight);
const jointPos = occ.translate(jointBody, 0, 0, baseHeight);

// 4. Bearing bore (through center of joint)
const bearingBore = occ.createCylinder(bearingDiameter / 2, jointHeight * 1.2);
const bearingBorePos = occ.translate(bearingBore, 0, 0, baseHeight - jointHeight * 0.1);

joint = occ.union(joint, jointPos);
joint = occ.difference(joint, bearingBorePos);

// 5. Arm segment (extends from joint)
const arm = occ.createBox(armLength, armWidth, armHeight);
const armPos = occ.translate(arm, 0, -armWidth / 2, baseHeight + jointHeight);

joint = occ.union(joint, armPos);

// 6. Motor mount (on side of joint)
const motorMount = occ.createCylinder(motorMountDiameter / 2, motorMountHeight);
const motorMountRotated = occ.rotate(motorMount, {x:0, y:1, z:0}, 90);
const motorMountPos = occ.translate(motorMountRotated,
  0,
  jointDiameter / 2,
  baseHeight + jointHeight / 2
);

joint = occ.union(joint, motorMountPos);

// 7. Cable routing channel (groove along arm)
const cableChannel = occ.createBox(15, 15, armHeight * 1.2);
const cableChannelPos = occ.translate(cableChannel,
  armLength * 0.2,
  -armWidth / 2 - 1,
  baseHeight + jointHeight - armHeight * 0.1
);

joint = occ.difference(joint, cableChannelPos);

// === VALIDATION ===
if (joint && typeof joint.ShapeType === 'function') {
  return joint;
} else {
  console.error('Robot joint creation failed');
  return occ.createCylinder(baseDiameter / 2, baseHeight + jointHeight);
}
```

## Example 5: Pipe Fitting (T-Junction)

```javascript
// === DESIGN ANALYSIS ===
// Recall: Pipe fitting standards
// - Nominal pipe sizes (NPS): 1/2", 3/4", 1", 1.5", 2", etc.
// - Wall thickness: Schedule 40, 80, etc.
// - Fillet radii at junctions for flow

// === PARAMETERS ===
const pipeDiameter = 50.0; // ~2 inch NPS
const wallThickness = 5.0; // Schedule 40
const branchLength = 100.0;
const runLength = 200.0; // Total length of through pipe

// === CALCULATED ===
const innerDiameter = pipeDiameter - 2 * wallThickness;
const outerRadius = pipeDiameter / 2;
const innerRadius = innerDiameter / 2;

// === CONSTRUCTION ===
// 1. Main run pipe (horizontal through)
const runOuter = occ.createCylinder(outerRadius, runLength);
const runOuterRotated = occ.rotate(runOuter, {x:0, y:1, z:0}, 90);

const runInner = occ.createCylinder(innerRadius, runLength * 1.1);
const runInnerRotated = occ.rotate(runInner, {x:0, y:1, z:0}, 90);
const runInnerPos = occ.translate(runInnerRotated, 0, -runLength * 0.05, 0);

let tFitting = occ.difference(runOuterRotated, runInnerPos);

// 2. Branch pipe (vertical)
const branchOuter = occ.createCylinder(outerRadius, branchLength);
const branchOuterPos = occ.translate(branchOuter, 0, 0, 0);

const branchInner = occ.createCylinder(innerRadius, branchLength * 1.1);
const branchInnerPos = occ.translate(branchInner, 0, 0, -branchLength * 0.05);

const branchPipe = occ.difference(branchOuterPos, branchInnerPos);

// 3. Combine run + branch
tFitting = occ.union(tFitting, branchPipe);

// 4. Reinforcement collar at junction
const collar = occ.createTorus(outerRadius, wallThickness);
const collarPos = occ.translate(collar, 0, 0, outerRadius);
tFitting = occ.union(tFitting, collarPos);

// === VALIDATION ===
if (tFitting && typeof tFitting.ShapeType === 'function') {
  return tFitting;
} else {
  console.error('T-fitting creation failed');
  return occ.createCylinder(outerRadius, runLength);
}
```

## Example 6: Toolbox with Drawers

```javascript
// === DESIGN ANALYSIS ===
// Recall: Toolbox design
// - Main body with compartments
// - Drawers with handles
// - Top lid (optional)
// - Dividers for organization

// === PARAMETERS ===
const boxWidth = 400.0;
const boxDepth = 250.0;
const boxHeight = 300.0;
const wallThickness = 5.0;
const drawerCount = 3;
const drawerHeight = (boxHeight - (drawerCount + 1) * wallThickness) / drawerCount;
const handleLength = 80.0;
const handleDiameter = 10.0;

// === CONSTRUCTION ===
// 1. Outer box body
const outerBox = occ.createBox(boxWidth, boxDepth, boxHeight);

// 2. Inner cavity
const innerCavity = occ.createBox(
  boxWidth - 2 * wallThickness,
  boxDepth - wallThickness, // Leave back wall
  boxHeight - wallThickness
);
const cavityPos = occ.translate(innerCavity, wallThickness, 0, wallThickness);

let toolbox = occ.difference(outerBox, cavityPos);

// 3. Horizontal dividers between drawers
for (let i = 1; i < drawerCount; i++) {
  const divider = occ.createBox(
    boxWidth - 2 * wallThickness,
    boxDepth - wallThickness,
    wallThickness
  );
  const dividerPos = occ.translate(divider,
    wallThickness,
    0,
    wallThickness + i * (drawerHeight + wallThickness)
  );
  toolbox = occ.union(toolbox, dividerPos);
}

// 4. Create drawers
for (let i = 0; i < drawerCount; i++) {
  // Drawer body
  const drawerOuter = occ.createBox(
    boxWidth - 2 * wallThickness - 2, // Clearance
    boxDepth - wallThickness - 2,
    drawerHeight - 2
  );
  
  const drawerInner = occ.createBox(
    boxWidth - 2 * wallThickness - 2 - 2 * wallThickness,
    boxDepth - wallThickness - 2 - wallThickness,
    drawerHeight - 2 - wallThickness
  );
  const drawerInnerPos = occ.translate(drawerInner,
    wallThickness,
    0,
    wallThickness
  );
  
  let drawer = occ.difference(drawerOuter, drawerInnerPos);
  
  // Drawer handle
  const handle = occ.createCylinder(handleDiameter / 2, handleLength);
  const handleRotated = occ.rotate(handle, {x:0, y:1, z:0}, 90);
  const handlePos = occ.translate(handleRotated,
    (boxWidth - 2 * wallThickness - 2) / 2 - handleLength / 2,
    -handleDiameter / 2 - 2,
    drawerHeight / 2
  );
  
  drawer = occ.union(drawer, handlePos);
  
  // Position drawer in toolbox
  const drawerPositioned = occ.translate(drawer,
    wallThickness + 1,
    -boxDepth * 0.3, // Pulled out slightly
    wallThickness + i * (drawerHeight + wallThickness) + 1
  );
  
  toolbox = occ.union(toolbox, drawerPositioned);
}

// === VALIDATION ===
if (toolbox && typeof toolbox.ShapeType === 'function') {
  return toolbox;
} else {
  console.error('Toolbox creation failed');
  return occ.createBox(boxWidth, boxDepth, boxHeight);
}
```

---

These complex assembly examples demonstrate:
- ✅ Multi-component integration
- ✅ Realistic engineering constraints
- ✅ Proper parametric relationships across components
- ✅ Assembly sequencing (build parts, then combine)
- ✅ Clearances and fits (bearings, sliding drawers)
- ✅ Standard industrial dimensions
- ✅ Defensive coding with validation
