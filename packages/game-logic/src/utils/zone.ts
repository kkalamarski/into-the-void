import { Position, ZoneCoords, WorldPosition, ZONE_SIZE } from '@into-the-void/shared-types';

/**
 * Parse zone ID to coordinates
 */
export function parseZoneId(zoneId: string): ZoneCoords {
  const parts = zoneId.split('_');
  return {
    zoneX: parseInt(parts[1], 10),
    zoneY: parseInt(parts[2], 10),
  };
}

/**
 * Create zone ID from coordinates
 */
export function createZoneId(zoneX: number, zoneY: number): string {
  return `z_${zoneX}_${zoneY}`;
}

/**
 * Convert local position to world position
 */
export function toWorldPosition(position: Position): WorldPosition {
  const { zoneX, zoneY } = parseZoneId(position.zoneId);
  return {
    worldX: zoneX * ZONE_SIZE + position.x,
    worldY: zoneY * ZONE_SIZE + position.y,
  };
}

/**
 * Convert world position to local position
 */
export function toLocalPosition(worldPos: WorldPosition): Position {
  const zoneX = Math.floor(worldPos.worldX / ZONE_SIZE);
  const zoneY = Math.floor(worldPos.worldY / ZONE_SIZE);
  const localX = ((worldPos.worldX % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;
  const localY = ((worldPos.worldY % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;

  return {
    x: localX,
    y: localY,
    zoneId: createZoneId(zoneX, zoneY),
  };
}

/**
 * Get adjacent zone IDs (8 neighbors)
 */
export function getAdjacentZones(zoneId: string): string[] {
  const { zoneX, zoneY } = parseZoneId(zoneId);
  const adjacent: string[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      adjacent.push(createZoneId(zoneX + dx, zoneY + dy));
    }
  }

  return adjacent;
}

/**
 * Calculate distance between two positions (in tiles)
 */
export function calculateDistance(a: Position, b: Position): number {
  const worldA = toWorldPosition(a);
  const worldB = toWorldPosition(b);

  const dx = worldA.worldX - worldB.worldX;
  const dy = worldA.worldY - worldB.worldY;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if two positions are in the same or adjacent zones
 */
export function areZonesAdjacent(zoneA: string, zoneB: string): boolean {
  if (zoneA === zoneB) return true;

  const coordsA = parseZoneId(zoneA);
  const coordsB = parseZoneId(zoneB);

  const dx = Math.abs(coordsA.zoneX - coordsB.zoneX);
  const dy = Math.abs(coordsA.zoneY - coordsB.zoneY);

  return dx <= 1 && dy <= 1;
}

/**
 * Get spawn position zone ID based on world coordinates
 */
export function getSpawnZone(worldX: number, worldY: number): string {
  const zoneX = Math.floor(worldX / ZONE_SIZE);
  const zoneY = Math.floor(worldY / ZONE_SIZE);
  return createZoneId(zoneX, zoneY);
}

/**
 * Validate zone ID format
 */
export function isValidZoneId(zoneId: string): boolean {
  const pattern = /^z_-?\d+_-?\d+$/;
  return pattern.test(zoneId);
}

/**
 * Get zone center position (in local coordinates)
 */
export function getZoneCenter(zoneId: string): Position {
  return {
    x: Math.floor(ZONE_SIZE / 2),
    y: Math.floor(ZONE_SIZE / 2),
    zoneId,
  };
}

/**
 * Get zone boundaries in world coordinates
 */
export function getZoneBounds(zoneId: string): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const { zoneX, zoneY } = parseZoneId(zoneId);
  return {
    minX: zoneX * ZONE_SIZE,
    minY: zoneY * ZONE_SIZE,
    maxX: (zoneX + 1) * ZONE_SIZE - 1,
    maxY: (zoneY + 1) * ZONE_SIZE - 1,
  };
}
