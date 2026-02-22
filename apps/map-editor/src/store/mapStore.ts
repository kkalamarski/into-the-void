import { create } from 'zustand';
import { ChunkData, SpawnPoint, TileStructure } from '@into-the-void/shared-types';
import { TileId, tileIdToString } from '@into-the-void/world-gen';
import { TileRegistry } from '@into-the-void/tiles';
import { useEditorStore } from './editorStore';

// Empty tile marker (deleted/transparent)
export const EMPTY_TILE = -1;

interface MapState {
  // Map metadata
  zoneId: string;
  setZoneId: (id: string) => void;

  // Map dimensions
  width: number;
  height: number;

  // Tile data (2D array of TileId, -1 = empty/deleted)
  tiles: number[][];
  setTile: (x: number, y: number, tileId: number) => void;

  // Height data (2D array of elevation 0-5)
  heights: number[][];
  setHeight: (x: number, y: number, height: number) => void;

  // Collision map (can be manually edited)
  collisions: boolean[][];
  setCollision: (x: number, y: number, blocking: boolean) => void;
  updateCollisions: () => void;

  // Structures (for stacked/layered tiles)
  structures: TileStructure[];
  addStructure: (structure: TileStructure) => void;
  removeStructure: (index: number) => void;

  // Stacked tile operations (adds tiles above base layer at same x,y)
  addStackedTile: (x: number, y: number, tileId: string, height: number) => void;
  removeStackedTile: (x: number, y: number, height: number) => void;
  getStackedTilesAt: (x: number, y: number) => Array<{ tileId: string; height: number }>;

  // Spawn points
  spawnPoints: SpawnPoint[];
  addSpawnPoint: (spawn: SpawnPoint) => void;
  removeSpawnPoint: (index: number) => void;
  updateSpawnPoint: (index: number, spawn: Partial<SpawnPoint>) => void;

  // Map operations
  newMap: (width: number, height: number) => void;
  loadChunk: (chunk: ChunkData) => void;
  getChunkData: () => ChunkData;

  // Bulk operations (for undo/redo)
  setAllTiles: (tiles: number[][]) => void;
  setAllHeights: (heights: number[][]) => void;

  // Fill operation
  floodFill: (startX: number, startY: number, tileId: TileId) => void;

  // Get tile at position (safe bounds check, returns -1 for empty)
  getTile: (x: number, y: number) => number | null;
  getHeight: (x: number, y: number) => number | null;
}

function createEmptyTiles(width: number, height: number, defaultTile: number = EMPTY_TILE): number[][] {
  return Array(height)
    .fill(null)
    .map(() => Array(width).fill(defaultTile));
}

function createEmptyHeights(width: number, height: number): number[][] {
  return Array(height)
    .fill(null)
    .map(() => Array(width).fill(0));
}

function calculateCollisions(tiles: number[][]): boolean[][] {
  return tiles.map((row) =>
    row.map((tileId) => {
      // Empty tiles are not blocking
      if (tileId === EMPTY_TILE) return false;
      const stringId = tileIdToString(tileId as TileId);
      const tileDef = TileRegistry.get(stringId);
      return tileDef?.isBlocking ?? false;
    })
  );
}

function deepCopyTiles(tiles: number[][]): number[][] {
  return tiles.map((row) => [...row]);
}

export const useMapStore = create<MapState>((set, get) => ({
  // Map metadata
  zoneId: 'untitled',
  setZoneId: (id) => set({ zoneId: id }),

  // Map dimensions
  width: 64,
  height: 64,

  // Tile data
  tiles: createEmptyTiles(64, 64),
  setTile: (x, y, tileId) => {
    const state = get();
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;

    // Push current state to undo before modifying
    useEditorStore.getState().pushUndo({
      tiles: deepCopyTiles(state.tiles),
      heights: deepCopyTiles(state.heights),
    });

    const newTiles = state.tiles.map((row, rowY) =>
      rowY === y ? row.map((t, colX) => (colX === x ? tileId : t)) : row
    );

    set({ tiles: newTiles });
    get().updateCollisions();
  },

  // Height data
  heights: createEmptyHeights(64, 64),
  setHeight: (x, y, height) => {
    const state = get();
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;

    const clampedHeight = Math.max(0, Math.min(5, height));

    // Push current state to undo before modifying
    useEditorStore.getState().pushUndo({
      tiles: deepCopyTiles(state.tiles),
      heights: deepCopyTiles(state.heights),
    });

    const newHeights = state.heights.map((row, rowY) =>
      rowY === y ? row.map((h, colX) => (colX === x ? clampedHeight : h)) : row
    );

    set({ heights: newHeights });
  },

  // Collisions
  collisions: calculateCollisions(createEmptyTiles(64, 64)),
  setCollision: (x, y, blocking) => {
    const state = get();
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;

    const newCollisions = state.collisions.map((row, rowY) =>
      rowY === y ? row.map((c, colX) => (colX === x ? blocking : c)) : row
    );
    set({ collisions: newCollisions });
  },
  updateCollisions: () => {
    const tiles = get().tiles;
    set({ collisions: calculateCollisions(tiles) });
  },

  // Structures
  structures: [],
  addStructure: (structure) => set((state) => ({ structures: [...state.structures, structure] })),
  removeStructure: (index) =>
    set((state) => ({
      structures: state.structures.filter((_, i) => i !== index),
    })),

  // Stacked tile operations
  addStackedTile: (x, y, tileId, height) => {
    const state = get();
    // Check if there's already a stacked tile at this exact position and height
    const existingIndex = state.structures.findIndex(
      (s) => s.type === 'feature' && s.tiles.length === 1 &&
        s.tiles[0].x === x && s.tiles[0].y === y && s.tiles[0].height === height
    );

    if (existingIndex >= 0) {
      // Update existing stacked tile
      const newStructures = [...state.structures];
      newStructures[existingIndex] = {
        type: 'feature',
        tiles: [{ x, y, tileId, height }],
      };
      set({ structures: newStructures });
    } else {
      // Add new stacked tile as a single-tile structure
      set({
        structures: [...state.structures, {
          type: 'feature',
          tiles: [{ x, y, tileId, height }],
        }],
      });
    }
  },

  removeStackedTile: (x, y, height) => {
    set((state) => ({
      structures: state.structures.filter(
        (s) => !(s.type === 'feature' && s.tiles.length === 1 &&
          s.tiles[0].x === x && s.tiles[0].y === y && s.tiles[0].height === height)
      ),
    }));
  },

  getStackedTilesAt: (x, y) => {
    const state = get();
    const stacked: Array<{ tileId: string; height: number }> = [];
    for (const structure of state.structures) {
      for (const tile of structure.tiles) {
        if (tile.x === x && tile.y === y) {
          stacked.push({ tileId: tile.tileId, height: tile.height });
        }
      }
    }
    return stacked.sort((a, b) => a.height - b.height);
  },

  // Spawn points
  spawnPoints: [],
  addSpawnPoint: (spawn) => set((state) => ({ spawnPoints: [...state.spawnPoints, spawn] })),
  removeSpawnPoint: (index) =>
    set((state) => ({
      spawnPoints: state.spawnPoints.filter((_, i) => i !== index),
    })),
  updateSpawnPoint: (index, update) =>
    set((state) => ({
      spawnPoints: state.spawnPoints.map((sp, i) => (i === index ? { ...sp, ...update } : sp)),
    })),

  // Map operations
  newMap: (width, height) => {
    useEditorStore.getState().clearHistory();
    set({
      zoneId: 'untitled',
      width,
      height,
      tiles: createEmptyTiles(width, height),
      heights: createEmptyHeights(width, height),
      collisions: calculateCollisions(createEmptyTiles(width, height)),
      structures: [],
      spawnPoints: [],
    });
  },

  loadChunk: (chunk) => {
    useEditorStore.getState().clearHistory();
    const height = chunk.tiles.length;
    const width = chunk.tiles[0]?.length ?? 64;

    set({
      zoneId: chunk.zoneId,
      width,
      height,
      tiles: chunk.tiles,
      heights: chunk.heights || createEmptyHeights(width, height),
      collisions: chunk.collisions || calculateCollisions(chunk.tiles),
      structures: chunk.structures || [],
      spawnPoints: chunk.spawnPoints || [],
    });
  },

  getChunkData: (): ChunkData => {
    const state = get();
    return {
      zoneId: state.zoneId,
      tiles: state.tiles,
      heights: state.heights,
      collisions: state.collisions,
      structures: state.structures,
      spawnPoints: state.spawnPoints,
    };
  },

  // Bulk operations
  setAllTiles: (tiles) => {
    set({ tiles });
    get().updateCollisions();
  },

  setAllHeights: (heights) => set({ heights }),

  // Flood fill
  floodFill: (startX, startY, targetTileId) => {
    const state = get();
    if (startX < 0 || startX >= state.width || startY < 0 || startY >= state.height) return;

    const sourceTileId = state.tiles[startY][startX];
    if (sourceTileId === targetTileId) return;

    // Push current state to undo before modifying
    useEditorStore.getState().pushUndo({
      tiles: deepCopyTiles(state.tiles),
      heights: deepCopyTiles(state.heights),
    });

    const newTiles = deepCopyTiles(state.tiles);
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= state.width || y < 0 || y >= state.height) continue;
      if (newTiles[y][x] !== sourceTileId) continue;

      visited.add(key);
      newTiles[y][x] = targetTileId;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    set({ tiles: newTiles });
    get().updateCollisions();
  },

  // Safe getters
  getTile: (x, y) => {
    const state = get();
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return null;
    return state.tiles[y][x];
  },

  getHeight: (x, y) => {
    const state = get();
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return null;
    return state.heights[y][x];
  },
}));
