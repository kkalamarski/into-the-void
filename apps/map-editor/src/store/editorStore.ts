import { create } from 'zustand';
import { TileId } from '@into-the-void/world-gen';

export type EditorTool = 'paint' | 'fill' | 'eyedropper' | 'eraser' | 'select' | 'elevation' | 'collision' | 'stack';

export interface Selection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface UndoEntry {
  tiles: number[][];
  heights: number[][];
}

interface EditorState {
  // Current tool
  tool: EditorTool;
  setTool: (tool: EditorTool) => void;

  // Selected tile for painting
  selectedTileId: TileId;
  setSelectedTileId: (id: TileId) => void;

  // Current elevation for painting
  paintElevation: number;
  setPaintElevation: (elevation: number) => void;

  // Selection rectangle (for copy/paste)
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;

  // Grid visibility
  showGrid: boolean;
  toggleGrid: () => void;

  // Spawn points visibility
  showSpawnPoints: boolean;
  toggleSpawnPoints: () => void;

  // Collision overlay visibility
  showCollisions: boolean;
  toggleCollisions: () => void;

  // Flat rendering mode (top diamond only, no 3D cube sides)
  flatMode: boolean;
  toggleFlatMode: () => void;

  // Undo/redo stack
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pushUndo: (entry: UndoEntry) => void;
  undo: () => UndoEntry | null;
  redo: () => UndoEntry | null;
  clearHistory: () => void;

  // Can undo/redo
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_UNDO_STACK = 50;

export const useEditorStore = create<EditorState>((set, get) => ({
  // Current tool
  tool: 'paint',
  setTool: (tool) => set({ tool }),

  // Selected tile
  selectedTileId: TileId.VOID_FLOOR,
  setSelectedTileId: (id) => set({ selectedTileId: id }),

  // Paint elevation
  paintElevation: 0,
  setPaintElevation: (elevation) => set({ paintElevation: Math.max(0, Math.min(5, elevation)) }),

  // Selection
  selection: null,
  setSelection: (selection) => set({ selection }),

  // Grid visibility
  showGrid: true,
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  // Spawn points visibility
  showSpawnPoints: true,
  toggleSpawnPoints: () => set((state) => ({ showSpawnPoints: !state.showSpawnPoints })),

  // Collision overlay visibility
  showCollisions: true,
  toggleCollisions: () => set((state) => ({ showCollisions: !state.showCollisions })),

  // Flat rendering mode
  flatMode: true, // Default to flat for easier editing
  toggleFlatMode: () => set((state) => ({ flatMode: !state.flatMode })),

  // Undo/redo
  undoStack: [],
  redoStack: [],

  pushUndo: (entry) =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-MAX_UNDO_STACK + 1), entry],
      redoStack: [], // Clear redo when new action taken
    })),

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;

    const entry = state.undoStack[state.undoStack.length - 1];
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, entry],
    });
    return entry;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;

    const entry = state.redoStack[state.redoStack.length - 1];
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, entry],
    });
    return entry;
  },

  clearHistory: () => set({ undoStack: [], redoStack: [] }),

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
}));
