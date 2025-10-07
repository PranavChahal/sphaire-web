// OpenCascade Code Prompt Interface
window.addEventListener("DOMContentLoaded", function () {
  // Create the code prompt functionality
  window.createOpenCascadeCodePrompt = function (scene) {
    console.log("createOpenCascadeCodePrompt called");

    // Check if OpenCascade.js is loaded
    const isOpenCascadeLoaded =
      typeof initOpenCascade === "function" ||
      typeof window.opencascade !== "undefined";
    console.log("OpenCascade loaded for code prompt:", isOpenCascadeLoaded);

    if (!isOpenCascadeLoaded) {
      console.warn(
        "OpenCascade.js is not loaded. Code prompt will not be available."
      );
      return;
    }

    let ocInstance = null;
    let currentMeshes = [];

    // Create a StackPanel for code prompt controls
    const advancedTexture =
      BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
        "OpenCascadeCodePromptUI"
      );

    const panel = new BABYLON.GUI.StackPanel();
    panel.name = "OpenCascadeCodePromptPanel";
    panel.width = "400px";
    panel.height = "500px";
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    panel.top = "20px";
    panel.left = "-20px";
    panel.background = "rgba(0, 0, 0, 0.8)";
    panel.color = "white";
    panel.paddingTop = "10px";
    panel.paddingBottom = "10px";
    panel.paddingLeft = "10px";
    panel.paddingRight = "10px";
    panel.cornerRadius = 10;
    panel.isVisible = true;
    advancedTexture.addControl(panel);

    // Header
    const header = new BABYLON.GUI.TextBlock();
    header.text = "OpenCascade Code Prompt";
    header.height = "30px";
    header.color = "white";
    header.fontSize = 16;
    header.fontWeight = "bold";
    header.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.addControl(header);

    // Status text
    const statusText = new BABYLON.GUI.TextBlock();
    statusText.text = "Initializing OpenCascade.js...";
    statusText.height = "20px";
    statusText.color = "#FFC107";
    statusText.fontSize = 12;
    statusText.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.addControl(statusText);

    // Code input area
    const codeInput = new BABYLON.GUI.InputText();
    codeInput.width = "100%";
    codeInput.height = "200px";
    codeInput.color = "white";
    codeInput.background = "rgba(50, 50, 50, 0.8)";
    codeInput.text = "return occ.createBox(2, 2, 2);";
    codeInput.fontSize = 12;
    codeInput.fontFamily = "monospace";
    codeInput.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    codeInput.textVerticalAlignment =
      BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    panel.addControl(codeInput);

    // Execute button
    const executeButton = BABYLON.GUI.Button.CreateSimpleButton(
      "executeButton",
      "Execute Code"
    );
    executeButton.width = "100px";
    executeButton.height = "30px";
    executeButton.color = "white";
    executeButton.cornerRadius = 5;
    executeButton.background = "#4CAF50";
    executeButton.fontSize = 12;
    panel.addControl(executeButton);

    // Clear button
    const clearButton = BABYLON.GUI.Button.CreateSimpleButton(
      "clearButton",
      "Clear Scene"
    );
    clearButton.width = "100px";
    clearButton.height = "30px";
    clearButton.color = "white";
    clearButton.cornerRadius = 5;
    clearButton.background = "#f44336";
    clearButton.fontSize = 12;
    panel.addControl(clearButton);

    // Message text
    const messageText = new BABYLON.GUI.TextBlock();
    messageText.text = "";
    messageText.height = "80px";
    messageText.color = "white";
    messageText.fontSize = 11;
    messageText.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    messageText.textVerticalAlignment =
      BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    messageText.textWrapping = true;
    panel.addControl(messageText);

    // Initialize OpenCascade
    function initOC() {
      if (typeof initOpenCascade === "function") {
        initOpenCascade().then((oc) => {
          ocInstance = oc;
          statusText.text = "OpenCascade.js ready! Enter your code:";
          statusText.color = "#4CAF50";
        });
      } else if (window.opencascade) {
        ocInstance = window.opencascade;
        statusText.text = "OpenCascade.js ready! Enter your code:";
        statusText.color = "#4CAF50";
      }
    }

    // Convert OpenCascade shape to Babylon.js mesh
    function convertOCShapeToBabylonMesh(shape, name = "OCShape") {
      if (!ocInstance || !shape) {
        console.error("OpenCascade instance or shape is null");
        return null;
      }

      try {
        console.log("Starting mesh conversion for shape:", name);

        // Create a mesh from the OpenCascade shape
        const mesh = new ocInstance.BRepMesh_IncrementalMesh_2(
          shape,
          0.1,
          false,
          0.5,
          false
        );
        mesh.Perform(new ocInstance.Message_ProgressRange_1());

        if (!mesh.IsDone()) {
          console.error(
            "Meshing failed - BRepMesh_IncrementalMesh did not complete successfully"
          );
          return null;
        }

        console.log(
          "Mesh creation successful, extracting triangulation data..."
        );

        // Extract triangulation data
        const vertices = [];
        const indices = [];
        const normals = [];

        // Iterate through faces
        const faceExplorer = new ocInstance.TopExp_Explorer_2(
          shape,
          ocInstance.TopAbs_ShapeEnum.TopAbs_FACE,
          ocInstance.TopAbs_ShapeEnum.TopAbs_SHAPE
        );
        let vertexOffset = 0;

        while (faceExplorer.More()) {
          const face = ocInstance.TopoDS.Face_1(faceExplorer.Current());
          const location = new ocInstance.TopLoc_Location_1();
          // Use 3-parameter signature with Poly_MeshPurpose_NONE
          const triangulation = ocInstance.Poly_MeshPurpose_NONE !== undefined
            ? ocInstance.BRep_Tool.Triangulation(face, location, ocInstance.Poly_MeshPurpose_NONE)
            : ocInstance.BRep_Tool.Triangulation(face, location, 0); // 0 = Poly_MeshPurpose_NONE

          if (!triangulation.IsNull()) {
            console.log("Processing face with triangulation...");
            const transform = location.Transformation();
            const tri = triangulation.get(); // Get the actual triangulation object
            const nodeCount = tri.NbNodes();
            const triangleCount = tri.NbTriangles();

            console.log(
              `Face has ${nodeCount} nodes and ${triangleCount} triangles`
            );

            // Extract vertices
            for (let i = 1; i <= nodeCount; i++) {
              const node = tri.Node(i);
              const transformedNode = node.Transformed(transform);
              vertices.push(
                transformedNode.X(),
                transformedNode.Y(),
                transformedNode.Z()
              );
            }

            // Extract triangles
            for (let i = 1; i <= triangleCount; i++) {
              const triangle = tri.Triangle(i);
              const n1 = triangle.Value(1) - 1 + vertexOffset;
              const n2 = triangle.Value(2) - 1 + vertexOffset;
              const n3 = triangle.Value(3) - 1 + vertexOffset;

              // Check face orientation
              if (
                face.Orientation_1() ===
                ocInstance.TopAbs_Orientation.TopAbs_REVERSED
              ) {
                indices.push(n1, n3, n2);
              } else {
                indices.push(n1, n2, n3);
              }
            }

            vertexOffset += nodeCount;
          } else {
            console.warn("Face has no triangulation data");
          }

          faceExplorer.Next();
        }

        console.log(
          `Total vertices: ${vertices.length / 3}, Total triangles: ${
            indices.length / 3
          }`
        );

        if (vertices.length === 0 || indices.length === 0) {
          console.error(
            "No mesh data extracted - vertices or indices are empty"
          );
          return null;
        }

        // Create Babylon.js mesh
        const babylonMesh = new BABYLON.Mesh(name, scene);
        const vertexData = new BABYLON.VertexData();

        vertexData.positions = vertices;
        vertexData.indices = indices;

        // Calculate normals
        BABYLON.VertexData.ComputeNormals(vertices, indices, normals);
        vertexData.normals = normals;

        vertexData.applyToMesh(babylonMesh);

        // Create material
        const material = new BABYLON.StandardMaterial(
          name + "_material",
          scene
        );
        material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.9);
        material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        babylonMesh.material = material;

        console.log("Babylon.js mesh created successfully:", name);
        return babylonMesh;
      } catch (error) {
        console.error(
          "Error converting OpenCascade shape to Babylon mesh:",
          error
        );
        console.error("Error stack:", error.stack);
        return null;
      }
    }

    // Convert user-friendly OpenCascade code to proper OpenCascade.js syntax
        function convertSimplifiedCode(code) {
            let convertedCode = code;
            
            // Helper function definitions that will be injected
            const helperFunctions = `
                // Helper functions for simplified OpenCascade syntax
                const occ = {
                    createBox: function(width, height, depth) {
                        const origin = new oc.gp_Pnt_3(0, 0, 0);
                        const box = new oc.BRepPrimAPI_MakeBox_3(origin, width, height, depth);
                        return box.Shape();
                    },
                    
                    createCylinder: function(radius, height) {
                        const cylinder = new oc.BRepPrimAPI_MakeCylinder_1(radius, height);
                        return cylinder.Shape();
                    },
                    
                    createSphere: function(radius) {
                        const sphere = new oc.BRepPrimAPI_MakeSphere_1(radius);
                        return sphere.Shape();
                    },
                    
                    createCone: function(radius1, radius2, height) {
                        const cone = new oc.BRepPrimAPI_MakeCone_1(radius1, radius2, height);
                        return cone.Shape();
                    },
                    
                    createTorus: function(majorRadius, minorRadius) {
                        const torus = new oc.BRepPrimAPI_MakeTorus_1(majorRadius, minorRadius);
                        return torus.Shape();
                    },
                    
                    translate: function(shape, x, y, z) {
                        const translation = new oc.gp_Trsf_1();
                        translation.SetTranslation_1(new oc.gp_Vec_4(x, y, z));
                        const transform = new oc.BRepBuilderAPI_Transform_2(shape, translation, false);
                        return transform.Shape();
                    },
                    
                    rotate: function(shape, axis, angle) {
                        const rotation = new oc.gp_Trsf_1();
                        const axisObj = new oc.gp_Ax1_2(new oc.gp_Pnt_3(0, 0, 0), new oc.gp_Dir_4(axis.x || 0, axis.y || 0, axis.z || 1));
                        rotation.SetRotation_1(axisObj, angle * Math.PI / 180);
                        const transform = new oc.BRepBuilderAPI_Transform_2(shape, rotation, false);
                        return transform.Shape();
                    },
                    
                    union: function(shape1, shape2) {
                        if (Array.isArray(shape2)) {
                            // Multiple shapes to union
                            let result = shape1;
                            for (let shape of shape2) {
                                const fuse = new oc.BRepAlgoAPI_Fuse_3(result, shape, new oc.Message_ProgressRange_1());
                                result = fuse.Shape();
                            }
                            return result;
                        } else {
                            // Single shape union
                            const fuse = new oc.BRepAlgoAPI_Fuse_3(shape1, shape2, new oc.Message_ProgressRange_1());
                            return fuse.Shape();
                        }
                    },
                    
                    difference: function(shape1, shape2) {
                        const cut = new oc.BRepAlgoAPI_Cut_3(shape1, shape2, new oc.Message_ProgressRange_1());
                        return cut.Shape();
                    },
                    
                    intersection: function(shape1, shape2) {
                        const common = new oc.BRepAlgoAPI_Common_3(shape1, shape2, new oc.Message_ProgressRange_1());
                        return common.Shape();
                    },
                    
                    circularPattern: function(shape, count, angleStep) {
                        const shapes = [];
                        for (let i = 0; i < count; i++) {
                            const angle = i * angleStep * Math.PI / 180;
                            const rotated = occ.rotate(shape, {x: 0, y: 0, z: 1}, angle * 180 / Math.PI);
                            shapes.push(rotated);
                        }
                        return shapes;
                    },
                    
                    linearPattern: function(shape, count, direction, spacing) {
                        const shapes = [];
                        for (let i = 0; i < count; i++) {
                            const offset = i * spacing;
                            const translated = occ.translate(shape, 
                                direction.x * offset, 
                                direction.y * offset, 
                                direction.z * offset
                            );
                            shapes.push(translated);
                        }
                        return shapes;
                    },
                    
                    tessellate: function(shape) {
                        // This function returns the shape as-is since tessellation 
                        // is handled by the convertOCShapeToBabylonMesh function
                        return shape;
                    },
                    
                    compound: function(shapes) {
                        const builder = new oc.BRep_Builder();
                        const compound = new oc.TopoDS_Compound_1();
                        builder.MakeCompound(compound);
                        
                        for (let shape of shapes) {
                            builder.Add_1(compound, shape);
                        }
                        
                        return compound;
                    },
                    
                    // Additional helper function for creating a gp_Pnt
                    createPoint: function(x, y, z) {
                        return new oc.gp_Pnt_3(x, y, z);
                    },
                    
                    // Helper to create a direction
                    createDirection: function(x, y, z) {
                        return new oc.gp_Dir_4(x, y, z);
                    },
                    
                    // Helper to create edges
                    createEdge: function(point1, point2) {
                        return new oc.BRepBuilderAPI_MakeEdge_3(point1, point2).Edge();
                    },
                    
                    // Helper to create a wire from edges
                    createWire: function(edges) {
                        if (edges.length < 1) {
                            throw new Error('Need at least one edge to create a wire');
                        }
                        
                        if (edges.length === 1) {
                            // Use single-edge constructor
                            return new oc.BRepBuilderAPI_MakeWire_2(edges[0]).Wire();
                        } else {
                            // Use BRepBuilderAPI_MakeWire_1() then Add_2 for each edge
                            const wireBuilder = new oc.BRepBuilderAPI_MakeWire_1();
                            for (let edge of edges) {
                                wireBuilder.Add_2(edge);
                            }
                            return wireBuilder.Wire(); // Already returns TopoDS_Wire
                        }
                    },
                    
                    // Helper to create a polygon wire from points
                    createPolygonWire: function(points) {
                        if (points.length < 2) {
                            throw new Error('Need at least 2 points to create a polygon');
                        }
                        
                        if (points.length === 3) {
                            // Use optimized constructor for 3 points
                            const poly = new oc.BRepBuilderAPI_MakePolygon_3(
                                points[0], points[1], points[2], true // true = close the polygon
                            );
                            return poly.Wire();
                        } else if (points.length === 2) {
                            // Use constructor for 2 points
                            const poly = new oc.BRepBuilderAPI_MakePolygon_2(
                                points[0], points[1]
                            );
                            return poly.Wire();
                        } else if (points.length === 4) {
                            // Use constructor for 4 points
                            const poly = new oc.BRepBuilderAPI_MakePolygon_4(
                                points[0], points[1], points[2], points[3], true
                            );
                            return poly.Wire();
                        } else {
                            // For arbitrary number of points, use Add method
                            const poly = new oc.BRepBuilderAPI_MakePolygon_1();
                            for (let point of points) {
                                poly.Add(point);
                            }
                            poly.Close();
                            return poly.Wire();
                        }
                    },
                    
                    // Helper to create a face from a wire
                    createFace: function(wire) {
                        return new oc.BRepBuilderAPI_MakeFace_15(wire, true).Face();
                    },
                    
                    // Helper to extrude a face
                    extrude: function(face, direction, distance) {
                        let vec;
                        if (typeof direction === 'object' && direction.X) {
                            // direction is already a gp_Dir or gp_Vec
                            vec = new oc.gp_Vec_4(direction.X(), direction.Y(), direction.Z());
                        } else {
                            // direction is a plain object with x, y, z properties
                            vec = new oc.gp_Vec_4(direction.x || 0, direction.y || 0, direction.z || 0);
                        }
                        vec.Multiply(distance);
                        const prism = new oc.BRepPrimAPI_MakePrism_1(face, vec, false, true);
                        return prism.Shape();
                    }
                };
            `;

      // Prepend helper functions to the user code
      convertedCode = helperFunctions + "\n\n" + convertedCode;

      return convertedCode;
    }

    // Execute user code
    function executeCode() {
      if (!ocInstance) {
        messageText.text = "Error: OpenCascade.js not initialized";
        messageText.color = "#f44336";
        return;
      }

      const code = codeInput.text;
      if (!code.trim()) {
        messageText.text = "Error: Please enter some code";
        messageText.color = "#f44336";
        return;
      }

      try {
        messageText.text = "Executing code...";
        messageText.color = "#FFC107";

        // Convert simplified code to proper OpenCascade.js syntax
        const convertedCode = convertSimplifiedCode(code);

        // Create a function with OpenCascade instance available as 'oc'
        const userFunction = new Function("oc", convertedCode);
        const result = userFunction(ocInstance);

        if (result && typeof result.ShapeType === "function") {
          // Result is an OpenCascade shape
          const mesh = convertOCShapeToBabylonMesh(
            result,
            "UserShape_" + Date.now()
          );
          if (mesh) {
            currentMeshes.push(mesh);
            messageText.text = "Success: Shape created and meshed!";
            messageText.color = "#4CAF50";
          } else {
            messageText.text = "Error: Failed to convert shape to mesh";
            messageText.color = "#f44336";
          }
        } else if (Array.isArray(result)) {
          // Result is an array of shapes (from patterns)
          let successCount = 0;
          for (let i = 0; i < result.length; i++) {
            if (result[i] && typeof result[i].ShapeType === "function") {
              const mesh = convertOCShapeToBabylonMesh(
                result[i],
                "UserShape_" + Date.now() + "_" + i
              );
              if (mesh) {
                currentMeshes.push(mesh);
                successCount++;
              }
            }
          }
          if (successCount > 0) {
            messageText.text = `Success: ${successCount} shapes created and meshed!`;
            messageText.color = "#4CAF50";
          } else {
            messageText.text = "Error: Failed to convert shapes to meshes";
            messageText.color = "#f44336";
          }
        } else {
          messageText.text =
            "Warning: Code executed but did not return a valid OpenCascade shape";
          messageText.color = "#FFC107";
        }
      } catch (error) {
        messageText.text = "Error: " + error.message;
        messageText.color = "#f44336";
        console.error("Code execution error:", error);
      }
    }

    // Clear all generated meshes
    function clearScene() {
      currentMeshes.forEach((mesh) => {
        if (mesh.material) {
          mesh.material.dispose();
        }
        mesh.dispose();
      });
      currentMeshes = [];
      messageText.text = "Scene cleared";
      messageText.color = "#4CAF50";
    }

    // Event handlers
    executeButton.onPointerUpObservable.add(() => {
      executeCode();
    });

    clearButton.onPointerUpObservable.add(() => {
      clearScene();
    });

    // Initialize OpenCascade
    initOC();

    return {
      panel: panel,
      executeCode: executeCode,
      clearScene: clearScene,
    };
  };
});
