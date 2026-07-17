/**
 * UI state for the Sphaire Studio shell.
 * Deliberately tiny: which tool drawer is open, whether the settings
 * sheet / command palette are up, and the last build report so the
 * inspector and status tray can surface verification results.
 */

import { create } from 'zustand';
import type { EnhancedBuildResult } from '../../services/pipeline/enhancedBuilder';

export type StudioTool =
  | 'create'
  | 'objects'
  | 'edit'
  | 'material'
  | 'light'
  | 'camera'
  | 'code'
  | 'library'
  | 'voice';

interface StudioState {
  activeTool: StudioTool | null;
  settingsOpen: boolean;
  paletteOpen: boolean;
  lastBuild: EnhancedBuildResult | null;
  projectName: string;
  toggleTool: (tool: StudioTool) => void;
  closeTool: () => void;
  setSettingsOpen: (v: boolean) => void;
  setPaletteOpen: (v: boolean) => void;
  setLastBuild: (r: EnhancedBuildResult | null) => void;
  setProjectName: (name: string) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  activeTool: null,
  settingsOpen: false,
  paletteOpen: false,
  lastBuild: null,
  projectName: 'Untitled',
  toggleTool: (tool) =>
    set((s) => ({ activeTool: s.activeTool === tool ? null : tool })),
  closeTool: () => set({ activeTool: null }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setPaletteOpen: (v) => set({ paletteOpen: v }),
  setLastBuild: (r) => set({ lastBuild: r }),
  setProjectName: (name) => set({ projectName: name }),
}));
