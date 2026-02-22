import { ChunkData } from '@into-the-void/shared-types';

export interface ImportResult {
  success: boolean;
  data?: ChunkData;
  error?: string;
}

/**
 * Import and validate ChunkData from JSON string
 */
export function importChunk(jsonString: string): ImportResult {
  try {
    const data = JSON.parse(jsonString);

    // Validate required fields
    if (!data.zoneId || typeof data.zoneId !== 'string') {
      return { success: false, error: 'Missing or invalid zoneId' };
    }

    if (!Array.isArray(data.tiles)) {
      return { success: false, error: 'Missing or invalid tiles array' };
    }

    // Validate tiles is 2D array
    if (data.tiles.length === 0 || !Array.isArray(data.tiles[0])) {
      return { success: false, error: 'Tiles must be a non-empty 2D array' };
    }

    const height = data.tiles.length;
    const width = data.tiles[0].length;

    // Validate all rows have same width
    for (let y = 0; y < height; y++) {
      if (!Array.isArray(data.tiles[y]) || data.tiles[y].length !== width) {
        return { success: false, error: `Invalid row width at y=${y}` };
      }
    }

    // Validate heights if present
    if (data.heights) {
      if (!Array.isArray(data.heights) || data.heights.length !== height) {
        return { success: false, error: 'Heights array has wrong dimensions' };
      }
      for (let y = 0; y < height; y++) {
        if (!Array.isArray(data.heights[y]) || data.heights[y].length !== width) {
          return { success: false, error: `Invalid heights row width at y=${y}` };
        }
      }
    }

    // Validate collisions if present
    if (data.collisions) {
      if (!Array.isArray(data.collisions) || data.collisions.length !== height) {
        return { success: false, error: 'Collisions array has wrong dimensions' };
      }
    }

    // Validate structures if present
    if (data.structures && !Array.isArray(data.structures)) {
      return { success: false, error: 'Structures must be an array' };
    }

    // Validate spawnPoints if present
    if (data.spawnPoints && !Array.isArray(data.spawnPoints)) {
      return { success: false, error: 'SpawnPoints must be an array' };
    }

    // Validate entryPoint if present
    if (data.entryPoint) {
      if (typeof data.entryPoint.x !== 'number' || typeof data.entryPoint.y !== 'number') {
        return { success: false, error: 'EntryPoint must have numeric x and y' };
      }
    }

    // Validate exitPoints if present
    if (data.exitPoints) {
      if (!Array.isArray(data.exitPoints)) {
        return { success: false, error: 'ExitPoints must be an array' };
      }
      for (let i = 0; i < data.exitPoints.length; i++) {
        const ep = data.exitPoints[i];
        if (!ep.position || typeof ep.position.x !== 'number' || typeof ep.position.y !== 'number') {
          return { success: false, error: `ExitPoint[${i}] must have position with numeric x and y` };
        }
        if (typeof ep.targetZone !== 'string') {
          return { success: false, error: `ExitPoint[${i}] must have targetZone string` };
        }
      }
    }

    // Construct validated ChunkData
    const chunk: ChunkData = {
      zoneId: data.zoneId,
      width: typeof data.width === 'number' ? data.width : width,
      height: typeof data.height === 'number' ? data.height : height,
      tiles: data.tiles,
      heights: data.heights || Array(height).fill(null).map(() => Array(width).fill(0)),
      structures: data.structures || [],
      collisions: data.collisions || Array(height).fill(null).map(() => Array(width).fill(false)),
      spawnPoints: data.spawnPoints || [],
      entryPoint: data.entryPoint,
      exitPoints: data.exitPoints,
    };

    return { success: true, data: chunk };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown parse error',
    };
  }
}

/**
 * Import ChunkData from a File object
 */
export async function importChunkFromFile(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    return importChunk(text);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to read file',
    };
  }
}
