import { ChunkData } from '@into-the-void/shared-types';

/**
 * Export ChunkData to JSON string.
 * Ensures width/height are always included for explicit dimensions.
 */
export function exportChunk(chunk: ChunkData): string {
  // Ensure width/height are explicit in export
  const enrichedChunk: ChunkData = {
    ...chunk,
    width: chunk.width ?? chunk.tiles[0]?.length ?? 0,
    height: chunk.height ?? chunk.tiles.length,
  };
  return JSON.stringify(enrichedChunk, null, 2);
}

/**
 * Export ChunkData to a downloadable blob
 */
export function exportChunkAsBlob(chunk: ChunkData): Blob {
  const json = exportChunk(chunk);
  return new Blob([json], { type: 'application/json' });
}
