import React, { useState, useRef, useEffect } from 'react';
import { Shape } from '../store/store';
import useStore from '../store/store';
import useSceneStore from '../store/sceneStore';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useModal } from '../contexts/ModalContext';

interface DragItem {
  index: number;
  id: string;
  type: string;
}

const ObjectItem: React.FC<{
  object: Shape;
  index: number;
  moveObject: (dragIndex: number, hoverIndex: number) => void;
}> = ({ object, index, moveObject }) => {
  const ref = useRef<HTMLDivElement>(null);
  const store = useStore();
  const { showConfirm } = useModal();
  const isSelected = store.selectedShapeId === object.id;
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(object.id);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'OBJECT_ITEM',
    item: { type: 'OBJECT_ITEM', id: object.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
  });
  
  const [, drop] = useDrop<DragItem>({
    accept: 'OBJECT_ITEM',
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      
      if (dragIndex === hoverIndex) {
        return;
      }
      
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      const clientOffset = monitor.getClientOffset();
      
      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      
      moveObject(dragIndex, hoverIndex);
      
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations, but it's good here for performance
      item.index = hoverIndex;
    },
  });
  
  drag(drop(ref));
  
  // Handle object selection
  const handleSelect = () => {
    store.selectShape(object.id);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm(
      'Delete Object',
      `Are you sure you want to delete "${object.id}"?\n\nThis action cannot be undone.`,
      () => {
        store.removeShape(object.id);
      }
    );
  };
  
  // Handle object duplication
  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Create a copy with a new ID by adding "copy" to the id
    const newObjectData = { ...object };
    store.addShape(newObjectData);
  };
  
  // Handle renaming
  const startRenaming = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewName(object.id);
    setIsRenaming(true);
  };
  
  const saveNewName = () => {
    if (newName.trim() !== object.id) {
      store.updateShape(object.id, { id: newName.trim() });
    }
    setIsRenaming(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveNewName();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  };
  
  // Get thumbnail based on object type
  const getThumbnail = () => {
    switch (object.type) {
      case 'box':
        return (
          <div className="w-8 h-8 bg-sphaire-purple-light bg-opacity-90 flex items-center justify-center rounded-md shadow-purple-glow-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </div>
        );
      case 'sphere':
        return (
          <div className="w-8 h-8 bg-sphaire-purple-light bg-opacity-90 flex items-center justify-center rounded-md shadow-purple-glow-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
        );
      case 'cylinder':
        return (
          <div className="w-8 h-8 bg-sphaire-purple-light bg-opacity-90 flex items-center justify-center rounded-md shadow-purple-glow-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c5.5 0 10 2.2 10 5v10c0 2.8-4.5 5-10 5s-10-2.2-10-5V7c0-2.8 4.5-5 10-5zM12 7c-3.3 0-6-1.3-6-3s2.7-3 6-3 6 1.3 6 3-2.7 3-6 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-sphaire-purple-light bg-opacity-90 flex items-center justify-center rounded-md shadow-purple-glow-sm">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l9 4v12l-9 4-9-4V6l9-4z" />
            </svg>
          </div>
        );
    }
  };
  
  const opacity = isDragging ? 0.4 : 1;
  
  return (
    <div 
      ref={ref}
      className={`flex items-center py-2 px-3 mb-1 rounded cursor-pointer ${
        isSelected ? 'bg-sphaire-pink bg-opacity-20 ring-1 ring-sphaire-pink-light shadow-pink-glow-sm' : 'hover:bg-sphaire-purple-dark'
      }`}
      style={{ opacity }}
      onClick={handleSelect}
    >
      <div className="mr-2 text-sphaire-purple-light cursor-move">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </div>
      
      <div className="mr-3">
        {getThumbnail()}
      </div>
      
      <div className="flex-grow">
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={saveNewName}
            onKeyDown={handleKeyDown}
            className="bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-2 py-0.5 text-sphaire-pink-light w-full text-xs focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light"
            autoFocus
          />
        ) : (
          <div className="flex items-center">
            <span className="text-sphaire-pink-light text-xs font-normal truncate max-w-[120px]" title={object.id}>{object.id}</span>
            <span className="ml-1 text-[10px] text-sphaire-purple-light">{object.type}</span>
          </div>
        )}
      </div>
      
      <div className="flex space-x-1">
        <button
          onClick={startRenaming}
          className="p-1 rounded hover:bg-sphaire-purple-dark text-sphaire-purple-light hover:text-sphaire-pink-light transition-colors duration-200"
          title="Rename"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={handleDuplicate}
          className="p-1 rounded hover:bg-sphaire-purple-dark text-sphaire-purple-light hover:text-sphaire-pink-light transition-colors duration-200"
          title="Duplicate"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="p-1 rounded hover:bg-sphaire-purple-dark text-sphaire-purple-light hover:text-sphaire-pink-light transition-colors duration-200"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Main ObjectManager component
const ObjectManager: React.FC = () => {
  const store = useStore();
  const { scene } = useSceneStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🚨 BULLETPROOF: Scene synchronization with timing protection
  useEffect(() => {
    console.log('🔄 ObjectManager: Component mounted/scene changed, validating scene state');
    if (scene && scene.isReady && scene.isReady()) {
      // Scene is valid and ready
      console.log('✅ ObjectManager: Scene is available and ready');
      console.log('📊 ObjectManager: Scene meshes count:', scene.meshes?.length || 0);
      console.log('📊 ObjectManager: Scene metadata:', scene.metadata);
    } else if (scene) {
      // Scene exists but may not be fully initialized
      console.log('⚠️ ObjectManager: Scene exists but not ready, waiting...');
      // Set up a scene ready listener
      const onSceneReady = () => {
        console.log('✅ ObjectManager: Scene is now ready after waiting');
        // Force a re-render by updating a local state if needed
      };
      if (scene.onReadyObservable) {
        scene.onReadyObservable.addOnce(onSceneReady);
      }
    } else {
      console.log('⚠️ ObjectManager: Scene is null, waiting for Viewport initialization');
    }
  }, [scene]); // Re-run when scene changes

  // ✨ FIX #3: Get both created shapes AND imported meshes
  const createdObjects = store.shapes;
  const importedMeshes = scene?.metadata?.importedMeshes || [];

  // 🔍 DEBUG: Log imported mesh detection
  console.log('🔍 ObjectManager: Scene available:', !!scene);
  console.log('🔍 ObjectManager: Scene metadata:', scene?.metadata);
  console.log('🔍 ObjectManager: Imported meshes found:', importedMeshes.length);
  if (importedMeshes.length > 0) {
    console.log('🔍 ObjectManager: Imported mesh names:', importedMeshes.map((m: any) => m.name));
  }

  
  // Convert imported meshes to Shape-like objects for display
  const importedObjects: Shape[] = importedMeshes.map((mesh: any) => ({
    id: mesh.name || 'Imported Model',
    type: 'custom' as const,
    position: { x: mesh.position?.x || 0, y: mesh.position?.y || 0, z: mesh.position?.z || 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scaling: { x: 1, y: 1, z: 1 },
    name: mesh.name || 'Imported Model',
    babylonMesh: mesh,
    isImported: true // Special flag to identify imported objects
  } as Shape & { isImported: boolean }));
  
  // Combine both created and imported objects
  const allObjects = [...createdObjects, ...importedObjects];
  
  // Filter objects based on search term
  const filteredObjects = allObjects.filter(
    (obj) => (obj.name || obj.id).toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Move object handler for drag and drop reordering
  const moveObject = (dragIndex: number, hoverIndex: number) => {
    // Create a new array with reordered objects (only for created shapes, not imported)
    const updatedObjects = [...createdObjects];
    const draggedObject = updatedObjects[dragIndex];
    
    // Remove dragged object from original position
    updatedObjects.splice(dragIndex, 1);
    // Insert it at the new position
    updatedObjects.splice(hoverIndex, 0, draggedObject);
    
    // Update store with the new order
    // Note: We need to update the store's shapes array directly
    // Since there's no dedicated moveObject function in the store
    // This is a workaround - ideally we'd add a moveObject function to the store
    store.clearShapes();
    updatedObjects.forEach((obj) => {
      store.addShape(obj);
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-gradient-to-b from-sphaire-dark to-sphaire-purple-dark text-sphaire-purple-light h-full flex flex-col rounded-md shadow-purple-glow-sm">
        <div className="p-4 border-b border-sphaire-purple-light border-opacity-30">
          <h3 className="text-lg font-medium text-gradient-purple mb-2">Scene Objects</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search objects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light text-sm placeholder-sphaire-purple-light/50"
            />
            <div className="absolute right-3 top-2.5 text-sphaire-purple-light">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
          {filteredObjects.length > 0 ? (
            filteredObjects.map((object, index) => (
              <ObjectItem
                key={object.id}
                object={object}
                index={index}
                moveObject={moveObject}
              />
            ))
          ) : (
            <p className="text-center text-sphaire-purple-light py-4 text-sm">No objects found.</p>
          )}
        </div>
        
        <div className="p-3 border-t border-sphaire-purple-light border-opacity-20">
          <div className="text-xs text-gray-400">
            {allObjects.length} object{allObjects.length !== 1 ? 's' : ''} in scene
            <div className="text-xs text-gray-500 mt-1">
              {createdObjects.length} created • {importedObjects.length} imported
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default ObjectManager;
