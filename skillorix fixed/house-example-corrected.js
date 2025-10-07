// Corrected House Example for OpenCascade Code Prompt
// This code uses the helper functions to create a house with a triangular roof

const houseWidth = 10.0;
const houseDepth = 8.0;
const houseHeight = 6.0;
const roofHeight = 3.0;

// Create the main body of the house
const houseBody = occ.createBox(houseWidth, houseDepth, houseHeight);

// Create the roof as a triangular prism
// Define roof base points for a triangular profile
const roofBasePoints = [
    occ.createPoint(0, 0, houseHeight),
    occ.createPoint(houseWidth, 0, houseHeight),
    occ.createPoint(houseWidth / 2, 0, houseHeight + roofHeight)
];

// Create a triangular wire from the points
const roofWire = occ.createPolygonWire(roofBasePoints);

// Create a face from the wire
const roofFace = occ.createFace(roofWire);

// Extrude the roof face to create the roof
const roof = occ.extrude(roofFace, {x: 0, y: 1, z: 0}, houseDepth);

// Combine the house body and roof
const house = occ.union(houseBody, roof);

// Return the final house shape
return house;
