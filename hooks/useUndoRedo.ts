/**
 * ============================================================================
 * COMPREHENSIVE UNDO/REDO SYSTEM
 * ============================================================================
 * 
 * Provides robust undo/redo functionality with keyboard shortcuts:
 * - Windows: Ctrl+Z (undo), Ctrl+Shift+Z (redo)
 * - Mac: Cmd+Z (undo), Cmd+Shift+Z (redo)
 * 
 * Features:
 * - Action history management with configurable max history
 * - Keyboard shortcut handling for both platforms
 * - Type-safe action definitions
 * - Automatic state synchronization
 * - Batch operations support
 * ============================================================================
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// Action types for undo/redo system
export interface UndoRedoAction {
  id: string;
  type: string;
  timestamp: number;
  description: string;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
  data?: any; // Optional data for the action
}

export interface UndoRedoState {
  // History management
  history: UndoRedoAction[];
  currentIndex: number;
  maxHistorySize: number;
  
  // State flags
  canUndo: boolean;
  canRedo: boolean;
  isExecuting: boolean;
  
  // Actions
  executeAction: (action: Omit<UndoRedoAction, 'id' | 'timestamp'>) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clearHistory: () => void;
  getHistoryInfo: () => {
    totalActions: number;
    currentPosition: number;
    undoableActions: number;
    redoableActions: number;
  };
}

export const useUndoRedo = (maxHistorySize: number = 50): UndoRedoState => {
  const [history, setHistory] = useState<UndoRedoAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Refs for keyboard event handling
  const historyRef = useRef(history);
  const currentIndexRef = useRef(currentIndex);
  const isExecutingRef = useRef(isExecuting);
  
  // Update refs when state changes
  useEffect(() => {
    historyRef.current = history;
    currentIndexRef.current = currentIndex;
    isExecutingRef.current = isExecuting;
  }, [history, currentIndex, isExecuting]);
  
  // Computed values
  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;
  
  /**
   * Execute a new action and add it to history
   */
  const executeAction = useCallback(async (actionData: Omit<UndoRedoAction, 'id' | 'timestamp'>) => {
    if (isExecuting) {
      console.log('⚠️ UNDO/REDO: Action already executing, skipping');
      return;
    }
    
    setIsExecuting(true);
    
    try {
      // Create action with unique ID and timestamp
      const action: UndoRedoAction = {
        ...actionData,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };
      
      console.log(`🎯 UNDO/REDO: Executing action "${action.description}"`);
      
      // Execute the action (redo function)
      await action.redo();
      
      setHistory(prevHistory => {
        // Remove any actions after current index (we're creating a new branch)
        const newHistory = prevHistory.slice(0, currentIndex + 1);
        
        // Add the new action
        newHistory.push(action);
        
        // Trim history if it exceeds max size
        if (newHistory.length > maxHistorySize) {
          return newHistory.slice(-maxHistorySize);
        }
        
        return newHistory;
      });
      
      // Update current index
      setCurrentIndex(prevIndex => {
        const newIndex = Math.min(prevIndex + 1, maxHistorySize - 1);
        return newIndex;
      });
      
      console.log(`✅ UNDO/REDO: Action "${action.description}" executed successfully`);
      
    } catch (error) {
      console.error('🚨 UNDO/REDO: Error executing action:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [currentIndex, isExecuting, maxHistorySize]);
  
  /**
   * Undo the current action
   */
  const undo = useCallback(async () => {
    if (!canUndo || isExecuting) {
      console.log('⚠️ UNDO/REDO: Cannot undo (canUndo:', canUndo, ', isExecuting:', isExecuting, ')');
      return;
    }
    
    setIsExecuting(true);
    
    try {
      const action = history[currentIndex];
      console.log(`↩️ UNDO/REDO: Undoing action "${action.description}"`);
      
      await action.undo();
      setCurrentIndex(prevIndex => prevIndex - 1);
      
      console.log(`✅ UNDO/REDO: Action "${action.description}" undone successfully`);
      
    } catch (error) {
      console.error('🚨 UNDO/REDO: Error during undo:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [canUndo, isExecuting, history, currentIndex]);
  
  /**
   * Redo the next action
   */
  const redo = useCallback(async () => {
    if (!canRedo || isExecuting) {
      console.log('⚠️ UNDO/REDO: Cannot redo (canRedo:', canRedo, ', isExecuting:', isExecuting, ')');
      return;
    }
    
    setIsExecuting(true);
    
    try {
      const action = history[currentIndex + 1];
      console.log(`↪️ UNDO/REDO: Redoing action "${action.description}"`);
      
      await action.redo();
      setCurrentIndex(prevIndex => prevIndex + 1);
      
      console.log(`✅ UNDO/REDO: Action "${action.description}" redone successfully`);
      
    } catch (error) {
      console.error('🚨 UNDO/REDO: Error during redo:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [canRedo, isExecuting, history, currentIndex]);
  
  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    console.log('🧹 UNDO/REDO: Clearing history');
    setHistory([]);
    setCurrentIndex(-1);
  }, []);
  
  /**
   * Get history information
   */
  const getHistoryInfo = useCallback(() => {
    return {
      totalActions: history.length,
      currentPosition: currentIndex + 1,
      undoableActions: currentIndex + 1,
      redoableActions: history.length - currentIndex - 1
    };
  }, [history.length, currentIndex]);
  
  /**
   * Keyboard shortcut handler
   */
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Skip if we're in an input field or textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }
      
      // Check for undo/redo shortcuts
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;
      const isZ = event.key.toLowerCase() === 'z';
      
      if (isCtrlOrCmd && isZ) {
        event.preventDefault();
        
        if (isShift) {
          // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
          if (currentIndexRef.current < historyRef.current.length - 1 && !isExecutingRef.current) {
            console.log('⌨️ UNDO/REDO: Redo triggered by keyboard shortcut');
            await redo();
          }
        } else {
          // Undo: Ctrl+Z or Cmd+Z
          if (currentIndexRef.current >= 0 && !isExecutingRef.current) {
            console.log('⌨️ UNDO/REDO: Undo triggered by keyboard shortcut');
            await undo();
          }
        }
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);
  
  // Debug logging
  useEffect(() => {
    console.log('🔄 UNDO/REDO: State updated', {
      historyLength: history.length,
      currentIndex,
      canUndo,
      canRedo,
      isExecuting
    });
  }, [history.length, currentIndex, canUndo, canRedo, isExecuting]);
  
  return {
    history,
    currentIndex,
    maxHistorySize,
    canUndo,
    canRedo,
    isExecuting,
    executeAction,
    undo,
    redo,
    clearHistory,
    getHistoryInfo
  };
};

/**
 * ============================================================================
 * PREDEFINED ACTION CREATORS
 * ============================================================================
 */

// Action creators for common operations
export const createShapeAction = (
  shapeData: any,
  addShapeToStore: (shape: any) => void,
  removeShapeFromStore: (id: string) => void
): Omit<UndoRedoAction, 'id' | 'timestamp'> => ({
  type: 'CREATE_SHAPE',
  description: `Create ${shapeData.type}`,
  data: shapeData,
  redo: async () => {
    addShapeToStore(shapeData);
  },
  undo: async () => {
    removeShapeFromStore(shapeData.id);
  }
});

export const deleteShapeAction = (
  shapeData: any,
  addShapeToStore: (shape: any) => void,
  removeShapeFromStore: (id: string) => void
): Omit<UndoRedoAction, 'id' | 'timestamp'> => ({
  type: 'DELETE_SHAPE',
  description: `Delete ${shapeData.type}`,
  data: shapeData,
  redo: async () => {
    removeShapeFromStore(shapeData.id);
  },
  undo: async () => {
    addShapeToStore(shapeData);
  }
});

export const transformShapeAction = (
  shapeId: string,
  oldTransform: any,
  newTransform: any,
  updateShapeInStore: (id: string, updates: any) => void
): Omit<UndoRedoAction, 'id' | 'timestamp'> => ({
  type: 'TRANSFORM_SHAPE',
  description: `Transform shape`,
  data: { shapeId, oldTransform, newTransform },
  redo: async () => {
    updateShapeInStore(shapeId, newTransform);
  },
  undo: async () => {
    updateShapeInStore(shapeId, oldTransform);
  }
});

export default useUndoRedo;
