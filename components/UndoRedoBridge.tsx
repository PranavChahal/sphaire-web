import React, { useEffect, useRef } from 'react';
import useStore from '../store/store';
import { useUndoRedo, UndoRedoState } from '../hooks/useUndoRedo';

/**
 * Global bridge that initializes a single Undo/Redo system and registers
 * a stable proxy into the Zustand store so any component (e.g. Header, store actions)
 * can use it reliably. Keyboard shortcuts are disabled here; buttons/menus can trigger it.
 */
const UndoRedoBridge: React.FC = () => {
  const { setUndoRedoSystem } = useStore();

  // Initialize undo/redo once for the whole app (shortcuts disabled to avoid conflicts)
  const undoRedo = useUndoRedo(50, false);

  // Keep a ref to the latest undo/redo object (identity can change when state updates)
  const latestRef = useRef<UndoRedoState | null>(null);
  useEffect(() => {
    latestRef.current = undoRedo;
  }, [undoRedo]);

  // Create a stable proxy that forwards to the latest object
  const proxyRef = useRef<UndoRedoState | null>(null);
  useEffect(() => {
    const proxy: UndoRedoState = {
      get history() { return latestRef.current?.history ?? []; },
      get currentIndex() { return latestRef.current?.currentIndex ?? -1; },
      get maxHistorySize() { return latestRef.current?.maxHistorySize ?? 50; },
      get canUndo() { return !!latestRef.current?.canUndo; },
      get canRedo() { return !!latestRef.current?.canRedo; },
      get isExecuting() { return !!latestRef.current?.isExecuting; },
      executeAction: async (action) => { if (latestRef.current) await latestRef.current.executeAction(action); },
      undo: async () => { if (latestRef.current) await latestRef.current.undo(); },
      redo: async () => { if (latestRef.current) await latestRef.current.redo(); },
      clearHistory: () => { latestRef.current?.clearHistory(); },
      getHistoryInfo: () => latestRef.current?.getHistoryInfo() ?? { totalActions: 0, currentPosition: 0, undoableActions: 0, redoableActions: 0 },
    };
    proxyRef.current = proxy;
    setUndoRedoSystem(proxy);

    return () => {
      setUndoRedoSystem(null);
    };
    // We intentionally run once on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default UndoRedoBridge;
