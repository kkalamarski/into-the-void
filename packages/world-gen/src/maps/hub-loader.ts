import { z } from 'zod';
import type { ChunkData } from '@into-the-void/shared-types';

// Import raw JSON files
import hubVerdantRaw from './hubs/hub_verdant.json';
import hubHelixRaw from './hubs/hub_helix.json';
import hubNexusRaw from './hubs/hub_nexus.json';
import hubNeutralRaw from './hubs/hub_neutral.json';

/** TilePosition schema for entry/exit points (local zone coordinates) */
const TilePositionSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
});

/** Exit point schema for portal destinations */
const ExitPointSchema = z.object({
  position: TilePositionSchema,
  targetZone: z.string(),
});

/** Spawn point schema */
const SpawnPointSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  entityType: z.enum(['creature', 'mineral']),
  spawnId: z.string(),
  respawnTime: z.number().positive(),
});

/** Tile structure schema */
const TileStructureSchema = z.object({
  type: z.enum(['feature', 'wall', 'building']),
  tiles: z.array(
    z.object({
      x: z.number().int(),
      y: z.number().int(),
      tileId: z.string(),
      height: z.number(),
    })
  ),
});

/**
 * Schema for hub map ChunkData validation.
 * Validates at module load time - fails fast if JSON is malformed.
 */
const HubChunkSchema = z.object({
  zoneId: z.string().startsWith('hub_'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  tiles: z.array(z.array(z.number().int())),
  heights: z.array(z.array(z.number().int())),
  collisions: z.array(z.array(z.boolean())),
  structures: z.array(TileStructureSchema),
  spawnPoints: z.array(SpawnPointSchema),
  entryPoint: TilePositionSchema.optional(),
  exitPoints: z.array(ExitPointSchema).optional(),
});

/**
 * Validate a hub chunk and return typed ChunkData.
 * Throws at module load if validation fails (fail-fast).
 */
function validateHubChunk(raw: unknown, hubId: string): ChunkData {
  const result = HubChunkSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid hub map JSON for ${hubId}: ${result.error.message}`
    );
  }
  return result.data as ChunkData;
}

/**
 * Pre-validated hub map data.
 * Validation runs at module load - server startup will fail if any JSON is invalid.
 */
export const HUB_MAPS: Record<string, ChunkData> = {
  hub_verdant: validateHubChunk(hubVerdantRaw, 'hub_verdant'),
  hub_helix: validateHubChunk(hubHelixRaw, 'hub_helix'),
  hub_nexus: validateHubChunk(hubNexusRaw, 'hub_nexus'),
  hub_neutral: validateHubChunk(hubNeutralRaw, 'hub_neutral'),
};

/**
 * Get a hub map by zone ID.
 * Returns undefined if not a known hub.
 */
export function getHubMap(hubZoneId: string): ChunkData | undefined {
  return HUB_MAPS[hubZoneId];
}

/**
 * Check if a hub map exists for the given zone ID.
 */
export function hasHubMap(hubZoneId: string): boolean {
  return hubZoneId in HUB_MAPS;
}
