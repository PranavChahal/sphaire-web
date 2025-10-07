// Test script for OpenCascade.js functionality
console.log('OpenCascade Test Script Loaded');

// Helper function to log detailed object information
function logObjectDetails(obj, name = 'Object') {
    console.log(`${name} type:`, typeof obj);
    if (obj === null) {
        console.log(`${name} is null`);
        return;
    }
    if (obj === undefined) {
        console.log(`${name} is undefined`);
        return;
    }
    
    if (typeof obj === 'object') {
        console.log(`${name} constructor:`, obj.constructor ? obj.constructor.name : 'unknown');
        console.log(`${name} properties:`, Object.getOwnPropertyNames(obj).slice(0, 20));
    }
}

// Function to test OpenCascade.js initialization and GLB export
async function testOpenCascade() {
    console.info('Starting OpenCascade.js test...');
    console.log('Testing OpenCascade.js initialization...');
    
    try {
        // Initialize OpenCascade.js with explicit options
        console.log('Initializing OpenCascade.js with explicit options...');
        const ocOptions = {
            // Ensure we have the correct path for the wasm file
            wasmPath: '/lib/opencascade.wasm',
            // Request all available modules
            requestedModules: ['ALL']
        };
        
        console.log('Calling initOpenCascade with options:', ocOptions);
        const oc = await window.initOpenCascade(ocOptions);
        console.log('OpenCascade.js initialized successfully');
        
        // Check if window.opencascade is set correctly
        if (window.opencascade) {
            console.log('window.opencascade is set correctly');
        } else {
            console.error('window.opencascade is not set');
        }
        
        // Check if the FS module is available
        if (oc.FS) {
            console.log('FS module is available');
            // Check FS methods
            console.log('FS methods:', Object.keys(oc.FS).filter(key => typeof oc.FS[key] === 'function').slice(0, 10));
        } else {
            console.error('FS module is not available');
        }
        
        // Log detailed information about the OpenCascade instance
        logObjectDetails(oc, 'OpenCascade instance');
        
        // Check for data exchange modules
        console.log('Checking for data exchange modules...');
        const dataExchangeClasses = Object.keys(oc).filter(key => 
            key.startsWith('RWGltf') || 
            key.startsWith('RWMesh') || 
            key.startsWith('TDocStd') ||
            key.startsWith('XCAFDoc')
        );
        console.log('Data exchange classes found:', dataExchangeClasses);
        
        // Check if the necessary classes for GLB export are available
        console.log('Checking for GLB export classes...');
        const classesToCheck = [
            'TDocStd_Document',
            'TCollection_ExtendedString_1',
            'XCAFDoc_DocumentTool',
            'BRepMesh_IncrementalMesh_2',
            'RWGltf_CafWriter',
            'TCollection_AsciiString_2',
            'Handle_TDocStd_Document_2',
            'TColStd_IndexedDataMapOfStringString_1',
            'Message_ProgressRange_1'
        ];
        
        for (const className of classesToCheck) {
            if (oc[className]) {
                console.log(`✓ ${className} is available`);
            } else {
                console.error(`✗ ${className} is not available`);
            }
        }
        
        // Try to create a simple shape
        console.log('Creating a simple box...');
        try {
            const box = new oc.BRepPrimAPI_MakeBox_2(1, 1, 1).Shape();
            console.log('Box created successfully');
            
            // Try to mesh the shape
            try {
                new oc.BRepMesh_IncrementalMesh_2(box, 0.1, false, 0.1, false);
                console.log('Box meshed successfully');
                
                // Try to export to GLB
                try {
                    // Create a document and add the shape to it
                    const doc = new oc.TDocStd_Document(new oc.TCollection_ExtendedString_1());
                    const shapeTool = oc.XCAFDoc_DocumentTool.ShapeTool(doc.Main()).get();
                    shapeTool.SetShape(shapeTool.NewShape(), box);
                    
                    // Export to GLB
                    console.log('Creating RWGltf_CafWriter...');
                    const tempGlbPath = "./temp.glb";
                    console.log('GLB path:', tempGlbPath);
                    
                    const asciiString = new oc.TCollection_AsciiString_2(tempGlbPath);
                    logObjectDetails(asciiString, 'AsciiString');
                    
                    const cafWriter = new oc.RWGltf_CafWriter(asciiString, true);
                    logObjectDetails(cafWriter, 'CafWriter');
                    
                    const docHandle = new oc.Handle_TDocStd_Document_2(doc);
                    logObjectDetails(docHandle, 'DocHandle');
                    
                    const stringMap = new oc.TColStd_IndexedDataMapOfStringString_1();
                    logObjectDetails(stringMap, 'StringMap');
                    
                    const progressRange = new oc.Message_ProgressRange_1();
                    logObjectDetails(progressRange, 'ProgressRange');
                    
                    console.log('Calling Perform_2...');
                    cafWriter.Perform_2(
                        docHandle, 
                        stringMap, 
                        progressRange
                    );
                    
                    console.log('GLB export successful');
                    
                    // Try to read the GLB file
                    try {
                        const glbFile = oc.FS.readFile("./temp.glb", { encoding: "binary" });
                        console.log('GLB file read successfully, size:', glbFile.length);
                    } catch (e) {
                        console.error('Error reading GLB file:', e);
                    }
                } catch (e) {
                    console.error('Error exporting to GLB:', e);
                }
            } catch (e) {
                console.error('Error meshing box:', e);
            }
        } catch (e) {
            console.error('Error creating box:', e);
        }
    } catch (e) {
        console.error('Error initializing OpenCascade.js:', e);
    }
}

// Run the test when the page is loaded
window.addEventListener('load', function() {
    console.log('Running OpenCascade.js test...');
    testOpenCascade();
});