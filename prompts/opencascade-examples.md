# OpenCascade Code Generation Examples

## Example 1: Simple Car

### User Request
"Create a simple car model"

### AI Analysis
```
Car Components Breakdown:
1. Main Body (chassis)
2. Cabin (passenger compartment)  
3. Wheels (4 cylinders)
4. Assembly and positioning
```

### Generated Code
```javascript
// Car Design Parameters
const carLength = 4.0;
const carWidth = 1.8;
const bodyHeight = 1.2;
const cabinLength = 2.0;
const cabinHeight = 0.8;
const cabinOffset = 1.0; // from front
const wheelRadius = 0.35;
const wheelThickness = 0.3;
const wheelbase = 2.5;
const trackWidth = 1.6;

// 1. Create main body (chassis)
const body = occ.createBox(carLength, carWidth, bodyHeight);

// 2. Create cabin (passenger area)
const cabin = occ.createBox(cabinLength, carWidth, cabinHeight);
const cabinPositioned = occ.translate(cabin, cabinOffset, 0, bodyHeight);

// 3. Create wheel template
const wheelBase = occ.createCylinder(wheelRadius, wheelThickness);
const wheel = occ.rotate(wheelBase, {x: 0, y: 1, z: 0}, 90);

// 4. Position all 4 wheels
const wheelFL = occ.translate(wheel, wheelbase * 0.7, -trackWidth/2, wheelRadius);
const wheelFR = occ.translate(wheel, wheelbase * 0.7, trackWidth/2, wheelRadius);
const wheelRL = occ.translate(wheel, -wheelbase * 0.3, -trackWidth/2, wheelRadius);
const wheelRR = occ.translate(wheel, -wheelbase * 0.3, trackWidth/2, wheelRadius);

// 5. Assemble complete car
const bodyWithCabin = occ.union(body, cabinPositioned);
const car = occ.union(bodyWithCabin, [wheelFL, wheelFR, wheelRL, wheelRR]);

return car;
```

---

## Example 2: House with Pitched Roof

### User Request
"Create a house with a triangular pitched roof"

### AI Analysis
```
House Components:
1. Rectangular base (main structure)
2. Triangular roof profile
3. Extrude roof along house depth
4. Union components
```

### Generated Code
```javascript
// House Parameters
const houseWidth = 10.0;
const houseDepth = 8.0;
const houseHeight = 6.0;
const roofHeight = 3.0;
const roofOverhang = 0.5;

// 1. Main house body
const body = occ.createBox(houseWidth, houseDepth, houseHeight);

// 2. Create triangular roof profile
const roofWidth = houseWidth + (2 * roofOverhang);
const p1 = occ.createPoint(-roofOverhang, 0, houseHeight);
const p2 = occ.createPoint(roofWidth - roofOverhang, 0, houseHeight);
const p3 = occ.createPoint(houseWidth / 2, 0, houseHeight + roofHeight);

// 3. Create roof wire and face
const roofWire = occ.createPolygonWire([p1, p2, p3]);
const roofFace = occ.createFace(roofWire);

// 4. Extrude roof along house depth
const roofDepth = houseDepth + (2 * roofOverhang);
const roof = occ.extrude(roofFace, {x: 0, y: 1, z: 0}, roofDepth);
const roofPositioned = occ.translate(roof, 0, -roofOverhang, 0);

// 5. Combine house and roof
const house = occ.union(body, roofPositioned);

return house;
```

---

## Example 3: Mechanical Gear

### User Request
"Design a mechanical gear with 20 teeth"

### AI Analysis
```
Gear Components:
1. Outer cylinder (gear blank)
2. Inner hole (shaft bore)
3. Teeth (simplified as outer profile)
4. Boolean subtraction
```

### Generated Code
```javascript
// Gear Parameters
const teeth = 20;
const module = 0.2;
const thickness = 0.5;
const shaftDiameter = 0.8;
const hubDiameter = 1.2;
const hubThickness = 0.7;

// Calculate gear dimensions
const pitchDiameter = module * teeth;
const outerDiameter = pitchDiameter + (2 * module);
const rootDiameter = pitchDiameter - (2.5 * module);

// 1. Create outer cylinder (gear body)
const outerCylinder = occ.createCylinder(outerDiameter / 2, thickness);

// 2. Create hub (thicker center section)
const hub = occ.createCylinder(hubDiameter / 2, hubThickness);

// 3. Create shaft hole
const shaftHole = occ.createCylinder(shaftDiameter / 2, hubThickness * 1.1);

// 4. Assemble gear
const gearWithHub = occ.union(outerCylinder, hub);
const gear = occ.difference(gearWithHub, shaftHole);

return gear;
```

---

## Example 4: Bottle with Neck

### User Request
"Create a bottle with a narrow neck and cap"

### AI Analysis
```
Bottle Components:
1. Main body (cylinder)
2. Neck (smaller cylinder)
3. Cap (cylinder with top)
4. Threaded section (simplified)
```

### Generated Code
```javascript
// Bottle Parameters
const bodyRadius = 2.0;
const bodyHeight = 5.0;
const neckRadius = 0.5;
const neckHeight = 2.0;
const capRadius = 0.7;
const capHeight = 0.8;
const capThickness = 0.15;

// 1. Create bottle body
const body = occ.createCylinder(bodyRadius, bodyHeight);

// 2. Create neck
const neck = occ.createCylinder(neckRadius, neckHeight);
const neckPositioned = occ.translate(neck, 0, 0, bodyHeight);

// 3. Create cap
const capOuter = occ.createCylinder(capRadius, capHeight);
const capInner = occ.createCylinder(neckRadius - 0.05, capHeight - capThickness);
const capInnerPositioned = occ.translate(capInner, 0, 0, capThickness);
const cap = occ.difference(capOuter, capInnerPositioned);
const capPositioned = occ.translate(cap, 0, 0, bodyHeight + neckHeight);

// 4. Assemble bottle with cap
const bodyWithNeck = occ.union(body, neckPositioned);
const bottle = occ.union(bodyWithNeck, capPositioned);

return bottle;
```

---

## Example 5: Table

### User Request
"Design a simple table with 4 legs"

### AI Analysis
```
Table Components:
1. Tabletop (thin box)
2. Legs (4 cylinders or boxes)
3. Position legs at corners
4. Assembly
```

### Generated Code
```javascript
// Table Parameters
const tableLength = 3.0;
const tableWidth = 1.5;
const tableThickness = 0.1;
const legRadius = 0.1;
const legHeight = 1.5;
const legInset = 0.2; // distance from edge

// 1. Create tabletop
const tabletop = occ.createBox(tableLength, tableWidth, tableThickness);
const tabletopLifted = occ.translate(tabletop, 0, 0, legHeight);

// 2. Create leg template
const leg = occ.createCylinder(legRadius, legHeight);

// 3. Position 4 legs
const leg1 = occ.translate(leg, legInset, legInset, 0);
const leg2 = occ.translate(leg, tableLength - legInset, legInset, 0);
const leg3 = occ.translate(leg, legInset, tableWidth - legInset, 0);
const leg4 = occ.translate(leg, tableLength - legInset, tableWidth - legInset, 0);

// 4. Assemble table
const table = occ.union(tabletopLifted, [leg1, leg2, leg3, leg4]);

return table;
```

---

## Example 6: Washer/Spacer

### User Request
"Create a metal washer"

### AI Analysis
```
Washer Components:
1. Outer cylinder
2. Inner hole
3. Boolean subtraction
```

### Generated Code
```javascript
// Washer Parameters
const outerDiameter = 2.0;
const innerDiameter = 1.0;
const thickness = 0.3;

// 1. Create outer cylinder
const outer = occ.createCylinder(outerDiameter / 2, thickness);

// 2. Create inner hole
const inner = occ.createCylinder(innerDiameter / 2, thickness * 1.1);

// 3. Cut hole from outer
const washer = occ.difference(outer, inner);

return washer;
```

---

## Example 7: Bracket

### User Request
"Design an L-shaped bracket"

### AI Analysis
```
Bracket Components:
1. Vertical plate
2. Horizontal plate
3. Mounting holes
4. Assembly
```

### Generated Code
```javascript
// Bracket Parameters
const verticalHeight = 3.0;
const horizontalLength = 2.5;
const plateWidth = 1.5;
const thickness = 0.3;
const holeRadius = 0.2;
const holeOffset = 0.5;

// 1. Create vertical plate
const verticalPlate = occ.createBox(thickness, plateWidth, verticalHeight);

// 2. Create horizontal plate
const horizontalPlate = occ.createBox(horizontalLength, plateWidth, thickness);

// 3. Create mounting holes
const hole1 = occ.createCylinder(holeRadius, thickness * 1.1);
const hole1Rotated = occ.rotate(hole1, {x: 1, y: 0, z: 0}, 90);
const hole1Positioned = occ.translate(hole1Rotated, holeOffset, plateWidth/2, holeOffset);

const hole2Positioned = occ.translate(hole1Positioned, 0, 0, verticalHeight - holeOffset * 2);

// 4. Assemble bracket
const bracket = occ.union(verticalPlate, horizontalPlate);
const bracketWithHoles = occ.difference(bracket, [hole1Positioned, hole2Positioned]);

return bracketWithHoles;
```

---

## Example 8: Bolt Pattern

### User Request
"Create a flange with 8 bolt holes in a circular pattern"

### AI Analysis
```
Flange Components:
1. Main disk (cylinder)
2. Center hole
3. 8 bolt holes in circular pattern
4. Boolean operations
```

### Generated Code
```javascript
// Flange Parameters
const outerDiameter = 6.0;
const centerHoleDiameter = 2.0;
const thickness = 0.5;
const boltHoleDiameter = 0.4;
const boltCircleDiameter = 4.5;
const numberOfBolts = 8;

// 1. Create main flange disk
const flange = occ.createCylinder(outerDiameter / 2, thickness);

// 2. Create center hole
const centerHole = occ.createCylinder(centerHoleDiameter / 2, thickness * 1.1);

// 3. Create single bolt hole
const boltHole = occ.createCylinder(boltHoleDiameter / 2, thickness * 1.1);
const boltHolePositioned = occ.translate(boltHole, boltCircleDiameter / 2, 0, 0);

// 4. Create circular pattern of bolt holes
const boltHoles = occ.circularPattern(boltHolePositioned, numberOfBolts, 360 / numberOfBolts);

// 5. Subtract all holes from flange
const flangeWithCenter = occ.difference(flange, centerHole);
const finalFlange = occ.difference(flangeWithCenter, boltHoles);

return finalFlange;
```

---

## Example 9: Custom Profile Extrusion

### User Request
"Create an I-beam profile"

### AI Analysis
```
I-Beam Components:
1. Define I-beam cross-section as polygon
2. Create face from profile
3. Extrude along length
```

### Generated Code
```javascript
// I-Beam Parameters
const flangeWidth = 2.0;
const beamHeight = 3.0;
const flangeThickness = 0.3;
const webThickness = 0.2;
const beamLength = 10.0;

// 1. Define I-beam profile points (clockwise from bottom-left)
const halfWeb = webThickness / 2;
const halfFlange = flangeWidth / 2;

const points = [
    occ.createPoint(-halfFlange, 0, 0),
    occ.createPoint(halfFlange, 0, 0),
    occ.createPoint(halfFlange, 0, flangeThickness),
    occ.createPoint(halfWeb, 0, flangeThickness),
    occ.createPoint(halfWeb, 0, beamHeight - flangeThickness),
    occ.createPoint(halfFlange, 0, beamHeight - flangeThickness),
    occ.createPoint(halfFlange, 0, beamHeight),
    occ.createPoint(-halfFlange, 0, beamHeight),
    occ.createPoint(-halfFlange, 0, beamHeight - flangeThickness),
    occ.createPoint(-halfWeb, 0, beamHeight - flangeThickness),
    occ.createPoint(-halfWeb, 0, flangeThickness),
    occ.createPoint(-halfFlange, 0, flangeThickness)
];

// 2. Create profile wire and face
const profileWire = occ.createPolygonWire(points);
const profileFace = occ.createFace(profileWire);

// 3. Extrude along length
const iBeam = occ.extrude(profileFace, {x: 0, y: 1, z: 0}, beamLength);

return iBeam;
```

---

## Example 10: Toolbox

### User Request
"Design a simple toolbox with handle"

### AI Analysis
```
Toolbox Components:
1. Main box body
2. Inner cavity (hollowed out)
3. Handle (cylinder)
4. Assembly
```

### Generated Code
```javascript
// Toolbox Parameters
const boxLength = 4.0;
const boxWidth = 2.0;
const boxHeight = 1.5;
const wallThickness = 0.15;
const handleRadius = 0.15;
const handleWidth = 1.0;
const handleHeight = 0.8;

// 1. Create outer box
const outerBox = occ.createBox(boxLength, boxWidth, boxHeight);

// 2. Create inner cavity
const innerBox = occ.createBox(
    boxLength - (2 * wallThickness),
    boxWidth - (2 * wallThickness),
    boxHeight - wallThickness
);
const innerBoxPositioned = occ.translate(
    innerBox, 
    wallThickness, 
    wallThickness, 
    wallThickness
);

// 3. Create handle
const handle = occ.createCylinder(handleRadius, handleWidth);
const handleRotated = occ.rotate(handle, {x: 1, y: 0, z: 0}, 90);
const handlePositioned = occ.translate(
    handleRotated,
    boxLength / 2,
    boxWidth / 2,
    boxHeight + handleHeight
);

// 4. Create handle supports (vertical posts)
const post = occ.createCylinder(handleRadius * 1.5, handleHeight);
const post1 = occ.translate(post, boxLength / 2 - handleWidth / 2, boxWidth / 2, boxHeight);
const post2 = occ.translate(post, boxLength / 2 + handleWidth / 2, boxWidth / 2, boxHeight);

// 5. Assemble toolbox
const hollowBox = occ.difference(outerBox, innerBoxPositioned);
const boxWithHandle = occ.union(hollowBox, handlePositioned);
const toolbox = occ.union(boxWithHandle, [post1, post2]);

return toolbox;
```

---

## Key Patterns Demonstrated

### 1. **Decomposition**
Every complex object is broken into logical components

### 2. **Parameters First**
All dimensions are defined as variables at the start

### 3. **Step-by-Step Assembly**
Components are created individually, then combined

### 4. **Helper Function Usage**
All examples use the `occ` helper API for clarity

### 5. **Geometric Logic**
Positioning and offsets are calculated based on parameters

### 6. **Boolean Operations**
Union, difference, and intersection used appropriately

### 7. **Patterns**
Circular and linear patterns for repeated features

### 8. **Comments**
Each step is clearly documented

---

## Template for New Designs

```javascript
// [OBJECT NAME] Parameters
const param1 = value1;
const param2 = value2;
// ... more parameters

// 1. Create [component 1]
const component1 = occ.create...(...);

// 2. Create [component 2]
const component2 = occ.create...(...);
const component2Positioned = occ.translate(component2, x, y, z);

// 3. [Additional operations]
// ...

// 4. Assemble [final object]
const finalObject = occ.union(component1, component2);

return finalObject;
```

Use these examples as templates for generating new OpenCascade code!
