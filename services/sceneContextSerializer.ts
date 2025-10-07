/**
 * Scene Context Serializer
 * Converts scene state into natural language description for AI context
 */

import { Shape, BoxShape, SphereShape, CylinderShape, ParametricShape } from '../store/store';

export interface SceneContext {
  objectCount: number;
  selectedObject: ShapeDescription | null;
  allObjects: ShapeDescription[];
  hasSelection: boolean;
  sceneDescription: string;
}

export interface ShapeDescription {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  dimensions: string;
  parameters?: Record<string, number>;
  isSelected: boolean;
  boundingBox?: {
    width: number;
    height: number;
    depth: number;
    center: { x: number; y: number; z: number };
  };
}

/**
 * Main function to serialize entire scene context
 */
export function serializeSceneContext(
  shapes: Shape[],
  selectedShapeId: string | null
): SceneContext {
  const allObjects = shapes.map(shape => serializeShape(shape, selectedShapeId));
  const selectedObject = allObjects.find(obj => obj.isSelected) || null;
  
  const sceneDescription = buildSceneDescription(allObjects, selectedObject);
  
  return {
    objectCount: shapes.length,
    selectedObject,
    allObjects,
    hasSelection: selectedShapeId !== null,
    sceneDescription
  };
}

/**
 * Serialize individual shape into description
 */
export function serializeShape(
  shape: Shape,
  selectedShapeId: string | null
): ShapeDescription {
  const isSelected = shape.id === selectedShapeId;
  const name = shape.name || shape.id;
  
  // Get dimensions based on shape type
  const dimensions = getShapeDimensions(shape);
  const boundingBox = calculateBoundingBox(shape);
  
  const description: ShapeDescription = {
    id: shape.id,
    type: shape.type,
    name,
    position: shape.position,
    rotation: shape.rotation,
    dimensions,
    isSelected,
    boundingBox
  };
  
  // Add parametric info if available
  if (shape.type === 'parametric') {
    description.parameters = (shape as ParametricShape).parameters;
  }
  
  return description;
}

/**
 * Get human-readable dimensions for a shape
 */
function getShapeDimensions(shape: Shape): string {
  switch (shape.type) {
    case 'box': {
      const box = shape as BoxShape;
      return `${box.dimensions.width}×${box.dimensions.height}×${box.dimensions.depth}`;
    }
    case 'sphere': {
      const sphere = shape as SphereShape;
      return `radius ${sphere.radius}`;
    }
    case 'cylinder': {
      const cyl = shape as CylinderShape;
      return `diameter ${cyl.diameter}, height ${cyl.height}`;
    }
    case 'parametric': {
      const param = shape as ParametricShape;
      const params = Object.entries(param.parameters)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      return `${param.shapeType} (${params})`;
    }
    case 'custom':
      return 'custom mesh';
    case 'model':
      return `imported ${shape.format}`;
    default:
      return 'unknown';
  }
}

/**
 * Calculate bounding box for a shape
 */
function calculateBoundingBox(shape: Shape): {
  width: number;
  height: number;
  depth: number;
  center: { x: number; y: number; z: number };
} {
  let width = 0, height = 0, depth = 0;
  
  switch (shape.type) {
    case 'box': {
      const box = shape as BoxShape;
      width = box.dimensions.width;
      height = box.dimensions.height;
      depth = box.dimensions.depth;
      break;
    }
    case 'sphere': {
      const sphere = shape as SphereShape;
      width = height = depth = sphere.radius * 2;
      break;
    }
    case 'cylinder': {
      const cyl = shape as CylinderShape;
      width = depth = cyl.diameter;
      height = cyl.height;
      break;
    }
    default:
      // Estimate for custom/model shapes
      width = height = depth = 10;
  }
  
  // Calculate center considering position
  const center = {
    x: shape.position.x + width / 2,
    y: shape.position.y + height / 2,
    z: shape.position.z + depth / 2
  };
  
  return { width, height, depth, center };
}

/**
 * Build natural language scene description
 */
function buildSceneDescription(
  allObjects: ShapeDescription[],
  selectedObject: ShapeDescription | null
): string {
  if (allObjects.length === 0) {
    return 'Scene is empty. No objects present.';
  }
  
  let description = `Scene contains ${allObjects.length} object${allObjects.length > 1 ? 's' : ''}:\n\n`;
  
  // List all objects
  allObjects.forEach((obj, index) => {
    const selectionMarker = obj.isSelected ? '[SELECTED] ' : '';
    const pos = `(${obj.position.x.toFixed(1)}, ${obj.position.y.toFixed(1)}, ${obj.position.z.toFixed(1)})`;
    const rot = obj.rotation.x !== 0 || obj.rotation.y !== 0 || obj.rotation.z !== 0
      ? ` rotated (${obj.rotation.x.toFixed(0)}°, ${obj.rotation.y.toFixed(0)}°, ${obj.rotation.z.toFixed(0)}°)`
      : '';
    
    description += `${index + 1}. ${selectionMarker}${obj.type.toUpperCase()} "${obj.name}"\n`;
    description += `   Position: ${pos}${rot}\n`;
    description += `   Dimensions: ${obj.dimensions}\n`;
    
    if (obj.boundingBox) {
      const center = obj.boundingBox.center;
      description += `   Center: (${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)})\n`;
    }
    
    if (obj.parameters) {
      const params = Object.entries(obj.parameters)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      description += `   Parameters: ${params}\n`;
    }
    
    description += '\n';
  });
  
  // Add selected object details
  if (selectedObject) {
    description += `\nSELECTED OBJECT DETAILS:\n`;
    description += `   ID: ${selectedObject.id}\n`;
    description += `   Type: ${selectedObject.type}\n`;
    description += `   Dimensions: ${selectedObject.dimensions}\n`;
    if (selectedObject.boundingBox) {
      description += `   Bounding Box: ${selectedObject.boundingBox.width.toFixed(1)} × ${selectedObject.boundingBox.height.toFixed(1)} × ${selectedObject.boundingBox.depth.toFixed(1)}\n`;
      description += `   Center Point: (${selectedObject.boundingBox.center.x.toFixed(1)}, ${selectedObject.boundingBox.center.y.toFixed(1)}, ${selectedObject.boundingBox.center.z.toFixed(1)})\n`;
    }
  }
  
  return description;
}

/**
 * Get spatial relationship between two objects
 */
export function getSpatialRelationship(
  object1: ShapeDescription,
  object2: ShapeDescription
): string {
  const dx = object2.position.x - object1.position.x;
  const dy = object2.position.y - object1.position.y;
  const dz = object2.position.z - object1.position.z;
  
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  let relationship = `${distance.toFixed(1)} units away`;
  
  // Determine primary direction
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const absDz = Math.abs(dz);
  
  if (absDx > absDy && absDx > absDz) {
    relationship += dx > 0 ? ' to the right' : ' to the left';
  } else if (absDy > absDx && absDy > absDz) {
    relationship += dy > 0 ? ' forward' : ' backward';
  } else if (absDz > 0.1) {
    relationship += dz > 0 ? ' above' : ' below';
  }
  
  return relationship;
}

/**
 * Get concise context for token-limited prompts
 */
export function getCompactSceneContext(
  shapes: Shape[],
  selectedShapeId: string | null
): string {
  const selected = shapes.find(s => s.id === selectedShapeId);
  
  if (!selected) {
    return `Scene: ${shapes.length} objects, none selected`;
  }
  
  const dims = getShapeDimensions(selected);
  const pos = `(${selected.position.x.toFixed(1)}, ${selected.position.y.toFixed(1)}, ${selected.position.z.toFixed(1)})`;
  
  return `Selected: ${selected.type.toUpperCase()} "${selected.name || selected.id}" at ${pos}, dims: ${dims}`;
}

/**
 * Extract key measurements for AI reasoning
 */
export function extractKeyMeasurements(shape: Shape): Record<string, number> {
  const measurements: Record<string, number> = {};
  
  switch (shape.type) {
    case 'box': {
      const box = shape as BoxShape;
      measurements.width = box.dimensions.width;
      measurements.height = box.dimensions.height;
      measurements.depth = box.dimensions.depth;
      measurements.centerX = shape.position.x + box.dimensions.width / 2;
      measurements.centerY = shape.position.y + box.dimensions.height / 2;
      measurements.centerZ = shape.position.z + box.dimensions.depth / 2;
      break;
    }
    case 'sphere': {
      const sphere = shape as SphereShape;
      measurements.radius = sphere.radius;
      measurements.diameter = sphere.radius * 2;
      measurements.centerX = shape.position.x;
      measurements.centerY = shape.position.y;
      measurements.centerZ = shape.position.z;
      break;
    }
    case 'cylinder': {
      const cyl = shape as CylinderShape;
      measurements.diameter = cyl.diameter;
      measurements.radius = cyl.diameter / 2;
      measurements.height = cyl.height;
      measurements.centerX = shape.position.x;
      measurements.centerY = shape.position.y;
      measurements.centerZ = shape.position.z + cyl.height / 2;
      break;
    }
    case 'parametric': {
      const param = shape as ParametricShape;
      Object.assign(measurements, param.parameters);
      break;
    }
  }
  
  return measurements;
}
