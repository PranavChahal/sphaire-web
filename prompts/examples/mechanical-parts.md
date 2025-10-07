# OpenCascade.js Mechanical Engineering Examples

## Example 1: ISO Metric Bolt (M12)

```javascript
// === DESIGN ANALYSIS ===
// Recall: ISO M12 bolt standard dimensions
// - Nominal diameter: 12mm
// - Hex head across flats: 18mm (1.5 × diameter)
// - Head height: ~7.5mm (0.625 × diameter)
// - Thread pitch: 1.75mm (coarse) or 1.25mm (fine)
// Components: hex head + cylindrical shank + threaded section + tip

// === PARAMETERS ===
const nominalDiameter = 12.0;
const headDiameter = nominalDiameter * 1.5; // ISO standard
const headHeight = nominalDiameter * 0.625;
const shankLength = 40.0;
const threadLength = 30.0;
const tipLength = 5.0;

// === CONSTRUCTION ===
// 1. Hexagonal head (simplified as cylinder)
const head = occ.createCylinder(headDiameter / 2, headHeight);

// 2. Cylindrical shank
const shank = occ.createCylinder(nominalDiameter / 2, shankLength);
const shankPositioned = occ.translate(shank, 0, 0, -shankLength);

// 3. Chamfered tip (cone)
const tip = occ.createCone(nominalDiameter / 2, nominalDiameter / 4, tipLength);
const tipPositioned = occ.translate(tip, 0, 0, -(shankLength + tipLength));

// 4. Thread grooves (simplified as torus cutouts)
const grooveRadius = 0.8;
const grooveCount = Math.floor(threadLength / 1.75); // Thread pitch
const grooveSpacing = threadLength / grooveCount;

// Combine head + shank + tip
let bolt = occ.union(head, shankPositioned);
bolt = occ.union(bolt, tipPositioned);

// Add thread grooves
for (let i = 0; i < grooveCount; i++) {
  const groove = occ.createTorus(nominalDiameter / 2, grooveRadius);
  const groovePos = occ.translate(groove, 0, 0, -shankLength + threadLength - i * grooveSpacing);
  bolt = occ.difference(bolt, groovePos);
}

// === VALIDATION ===
if (bolt && typeof bolt.ShapeType === 'function') {
  return bolt;
} else {
  console.error('Bolt creation failed');
  return occ.createCylinder(headDiameter / 2, headHeight + shankLength);
}
```

## Example 2: Involute Gear (Simplified)

```javascript
// === DESIGN ANALYSIS ===
// Recall: Standard gear formulas
// - Module (m): size standard (1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0)
// - Pitch diameter: d = m × z (z = teeth count)
// - Outer diameter: da = m × (z + 2)
// - Root diameter: df = m × (z - 2.5)

// === PARAMETERS ===
const teeth = 20;
const module = 2.0; // Standard gear module (mm)
const thickness = 10.0;
const boreRadius = 8.0; // Center hole
const hubRadius = 12.0;
const hubHeight = 15.0;

// === CALCULATED DIMENSIONS (parametric relationships) ===
const pitchDiameter = module * teeth;
const outerRadius = (module * (teeth + 2)) / 2;
const rootRadius = (module * (teeth - 2.5)) / 2;

// === CONSTRUCTION ===
// 1. Outer cylinder (simplified tooth profile)
const outer = occ.createCylinder(outerRadius, thickness);

// 2. Hub (extended center for strength)
const hub = occ.createCylinder(hubRadius, hubHeight);
const hubPositioned = occ.translate(hub, 0, 0, thickness);

// 3. Center bore (mounting hole)
const bore = occ.createCylinder(boreRadius, hubHeight + thickness + 1);
const borePositioned = occ.translate(bore, 0, 0, -0.5);

// 4. Tooth spaces (simplified as radial cutouts)
const toothAngle = 360 / teeth;
const cutoutWidth = module * 1.2; // Tooth space width

let gearBody = outer;

// Create radial cutouts to simulate teeth
for (let i = 0; i < teeth; i++) {
  const cutout = occ.createBox(cutoutWidth, outerRadius + 2, thickness * 1.1);
  const cutoutMoved = occ.translate(cutout, -cutoutWidth / 2, 0, -thickness * 0.05);
  const cutoutRotated = occ.rotate(cutoutMoved, {x:0, y:0, z:1}, i * toothAngle);
  gearBody = occ.difference(gearBody, cutoutRotated);
}

// 5. Combine with hub and remove bore
const gearWithHub = occ.union(gearBody, hubPositioned);
const gear = occ.difference(gearWithHub, borePositioned);

// === VALIDATION ===
if (gear && typeof gear.ShapeType === 'function') {
  return gear;
} else {
  console.error('Gear creation failed, using simple cylinder');
  return occ.createCylinder(outerRadius, thickness);
}
```

## Example 3: Ball Bearing Assembly

```javascript
// === DESIGN ANALYSIS ===
// Recall: Ball bearing components
// - Inner race: cylinder with ball groove
// - Outer race: cylinder with ball groove
// - Balls: spheres in circular pattern
// - Pitch diameter: average of inner and outer diameters

// === PARAMETERS ===
const innerDiameter = 20.0;
const outerDiameter = 52.0;
const thickness = 15.0;
const ballDiameter = 8.0;
const ballCount = 9;
const raceGrooveDepth = 1.0;

// === CALCULATED ===
const innerRadius = innerDiameter / 2;
const outerRadius = outerDiameter / 2;
const raceWidth = (outerDiameter - innerDiameter) / 2;
const pitchDiameter = (innerDiameter + outerDiameter) / 2;
const pitchRadius = pitchDiameter / 2;

// === CONSTRUCTION ===
// 1. Inner race
const innerRaceOuter = occ.createCylinder(innerRadius + raceWidth / 3, thickness);
const innerHole = occ.createCylinder(innerRadius, thickness * 1.1);
let innerRace = occ.difference(innerRaceOuter, innerHole);

// 2. Inner race groove (torus subtraction)
const innerGroove = occ.createTorus(pitchRadius - raceWidth / 3, ballDiameter / 2 + raceGrooveDepth);
const innerGroovePos = occ.translate(innerGroove, 0, 0, thickness / 2);
innerRace = occ.difference(innerRace, innerGroovePos);

// 3. Outer race
const outerRaceOuter = occ.createCylinder(outerRadius, thickness);
const outerHole = occ.createCylinder(outerRadius - raceWidth / 3, thickness * 1.1);
let outerRace = occ.difference(outerRaceOuter, outerHole);

// 4. Outer race groove
const outerGroove = occ.createTorus(pitchRadius + raceWidth / 3, ballDiameter / 2 + raceGrooveDepth);
const outerGroovePos = occ.translate(outerGroove, 0, 0, thickness / 2);
outerRace = occ.difference(outerRace, outerGroovePos);

// 5. Balls in circular pattern
const ball = occ.createSphere(ballDiameter / 2);
const ballPositioned = occ.translate(ball, pitchRadius, 0, thickness / 2);
const balls = occ.circularPattern(ballPositioned, ballCount, 360 / ballCount);

// 6. Combine all components
const bearing = occ.union(occ.union(innerRace, outerRace), balls);

// === VALIDATION ===
if (bearing && typeof bearing.ShapeType === 'function') {
  return bearing;
} else {
  console.error('Bearing creation failed');
  return occ.createCylinder(outerRadius, thickness);
}
```

## Example 4: Shaft with Keyway

```javascript
// === DESIGN ANALYSIS ===
// Recall: Standard shaft features
// - Main shaft: cylindrical body
// - Keyway: rectangular slot for key (ISO 6885)
// - Shoulder: diameter step for bearing seating
// - Chamfers: ease assembly and prevent stress concentration

// === PARAMETERS ===
const mainDiameter = 30.0;
const mainLength = 100.0;
const shoulderDiameter = 25.0;
const shoulderLength = 20.0;
// ISO 6885 keyway: width ≈ 0.25 × diameter
const keywayWidth = 8.0;
const keywayDepth = 4.0;
const keywayLength = 60.0;
const chamferSize = 2.0;

// === CONSTRUCTION ===
// 1. Main shaft body
const mainShaft = occ.createCylinder(mainDiameter / 2, mainLength);

// 2. Shoulder (reduced diameter)
const shoulder = occ.createCylinder(shoulderDiameter / 2, shoulderLength);
const shoulderPos = occ.translate(shoulder, 0, 0, mainLength);

// 3. Keyway slot (rectangular cutout)
const keyway = occ.createBox(keywayWidth, mainDiameter + 2, keywayDepth);
// Position: centered on top of shaft
const keywayPos = occ.translate(keyway,
  -keywayWidth / 2,
  -mainDiameter / 2 - 1,
  (mainLength - keywayLength) / 2
);

// 4. Combine shaft + shoulder
let shaft = occ.union(mainShaft, shoulderPos);

// 5. Cut keyway
shaft = occ.difference(shaft, keywayPos);

// 6. Add chamfers (simplified as cone cutouts)
const chamfer1 = occ.createCone(mainDiameter / 2 + 1, mainDiameter / 2 - chamferSize, chamferSize);
const chamfer1Pos = occ.translate(chamfer1, 0, 0, -chamferSize);

const chamfer2 = occ.createCone(shoulderDiameter / 2 - chamferSize, shoulderDiameter / 2 + 1, chamferSize);
const chamfer2Pos = occ.translate(chamfer2, 0, 0, mainLength + shoulderLength);

shaft = occ.difference(shaft, occ.union(chamfer1Pos, chamfer2Pos));

// === VALIDATION ===
if (shaft && typeof shaft.ShapeType === 'function') {
  return shaft;
} else {
  console.error('Shaft creation failed');
  return occ.createCylinder(mainDiameter / 2, mainLength);
}
```

## Example 5: V-Belt Pulley

```javascript
// === DESIGN ANALYSIS ===
// Recall: V-belt pulley specifications
// - V-groove angle: typically 40° (included angle)
// - Groove depth: ~1/6 of belt width
// - Outside diameter: specified for speed ratio
// - Bore: mounting hole for shaft

// === PARAMETERS ===
const outerDiameter = 100.0;
const thickness = 30.0;
const boreDiameter = 25.0;
const grooveWidth = 15.0;
const grooveDepth = 8.0;
const grooveAngle = 40; // V-angle (degrees)

// === CALCULATED ===
const outerRadius = outerDiameter / 2;
const boreRadius = boreDiameter / 2;
const grooveBottomRadius = outerRadius - grooveDepth;

// === CONSTRUCTION ===
// 1. Main pulley body
const body = occ.createCylinder(outerRadius, thickness);

// 2. V-groove (approximated with cone)
const groove = occ.createCone(outerRadius + 1, grooveBottomRadius, grooveWidth);
// Center groove vertically
const groovePos = occ.translate(groove, 0, 0, (thickness - grooveWidth) / 2);

// 3. Bore (center mounting hole)
const bore = occ.createCylinder(boreRadius, thickness * 1.1);
const borePos = occ.translate(bore, 0, 0, -thickness * 0.05);

// 4. Combine: body - groove - bore
let pulley = occ.difference(body, groovePos);
pulley = occ.difference(pulley, borePos);

// === VALIDATION ===
if (pulley && typeof pulley.ShapeType === 'function') {
  return pulley;
} else {
  console.error('Pulley creation failed');
  return occ.createCylinder(outerRadius, thickness);
}
```

## Example 6: Flanged Coupling

```javascript
// === DESIGN ANALYSIS ===
// Recall: Flanged coupling connects two shafts
// Components: two flanges with bolt holes

// === PARAMETERS ===
const shaftDiameter = 30.0;
const flangeOuterDiameter = 100.0;
const flangeThickness = 15.0;
const boltHoleDiameter = 10.0;
const boltHoleCount = 6;
const boltCircleDiameter = 75.0;

// === CONSTRUCTION ===
// 1. Main flange body
const flange = occ.createCylinder(flangeOuterDiameter / 2, flangeThickness);

// 2. Center bore for shaft
const bore = occ.createCylinder(shaftDiameter / 2, flangeThickness * 1.1);

// 3. Bolt holes in circular pattern
const boltHole = occ.createCylinder(boltHoleDiameter / 2, flangeThickness * 1.1);
const boltHolePos = occ.translate(boltHole, boltCircleDiameter / 2, 0, -flangeThickness * 0.05);
const boltHoles = occ.circularPattern(boltHolePos, boltHoleCount, 360 / boltHoleCount);

// 4. Combine: flange - bore - bolt holes
let coupling = occ.difference(flange, bore);
coupling = occ.difference(coupling, boltHoles);

// === VALIDATION ===
if (coupling && typeof coupling.ShapeType === 'function') {
  return coupling;
} else {
  console.error('Coupling creation failed');
  return occ.createCylinder(flangeOuterDiameter / 2, flangeThickness);
}
```

## Example 7: Engine Piston (Simplified)

```javascript
// === DESIGN ANALYSIS ===
// Recall: Piston components
// - Crown: top sealing surface
// - Ring grooves: for piston rings
// - Skirt: cylinder contact surface
// - Pin boss: for wrist pin

// === PARAMETERS ===
const pistonDiameter = 80.0;
const pistonHeight = 60.0;
const crownThickness = 10.0;
const ringGrooveWidth = 2.0;
const ringGrooveDepth = 1.5;
const ringGrooveCount = 3;
const ringGrooveSpacing = 3.0;
const pinBoreDiameter = 20.0;

// === CONSTRUCTION ===
// 1. Main piston body
const pistonBody = occ.createCylinder(pistonDiameter / 2, pistonHeight);

// 2. Crown (top surface - slight dome)
const crownDome = occ.createSphere(pistonDiameter * 0.8);
const crownDomePos = occ.translate(crownDome, 0, 0, pistonHeight - crownThickness);
const crownCutout = occ.createCylinder(pistonDiameter / 2 + 1, pistonHeight);
const crownCutoutPos = occ.translate(crownCutout, 0, 0, pistonHeight);
const crownDomeClipped = occ.difference(crownDomePos, crownCutoutPos);

// 3. Ring grooves
let piston = occ.union(pistonBody, crownDomeClipped);

for (let i = 0; i < ringGrooveCount; i++) {
  const groove = occ.createTorus(pistonDiameter / 2, ringGrooveDepth);
  const groovePos = occ.translate(groove, 0, 0, 
    pistonHeight - crownThickness - i * ringGrooveSpacing - ringGrooveWidth / 2);
  piston = occ.difference(piston, groovePos);
}

// 4. Wrist pin bore (through hole)
const pinBore = occ.createCylinder(pinBoreDiameter / 2, pistonDiameter + 2);
const pinBoreRotated = occ.rotate(pinBore, {x:0, y:1, z:0}, 90);
const pinBorePos = occ.translate(pinBoreRotated, 0, -pistonDiameter / 2 - 1, pistonHeight / 3);
piston = occ.difference(piston, pinBorePos);

// === VALIDATION ===
if (piston && typeof piston.ShapeType === 'function') {
  return piston;
} else {
  console.error('Piston creation failed');
  return occ.createCylinder(pistonDiameter / 2, pistonHeight);
}
```

---

These examples demonstrate:
- ✅ Parametric design with derived dimensions
- ✅ Standard engineering formulas (ISO, gear modules)
- ✅ Realistic proportions and constraints
- ✅ Defensive coding with validation
- ✅ Fallback strategies for errors
- ✅ Clear documentation and reasoning
