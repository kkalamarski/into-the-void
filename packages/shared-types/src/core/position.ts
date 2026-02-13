/**
 * Position in the game world
 */
export interface Position {
  /** X coordinate within the zone */
  x: number;
  /** Y coordinate within the zone */
  y: number;
  /** Zone identifier (e.g., "z_1_2") */
  zoneId: string;
}

/**
 * Direction for grid-based movement
 */
export type Direction = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/**
 * Cardinal directions only (no diagonals)
 */
export type CardinalDirection = 'n' | 's' | 'e' | 'w';

/**
 * World coordinates (absolute position across all zones)
 */
export interface WorldPosition {
  /** Absolute X coordinate */
  worldX: number;
  /** Absolute Y coordinate */
  worldY: number;
}

/**
 * Zone coordinates
 */
export interface ZoneCoords {
  /** Zone X index */
  zoneX: number;
  /** Zone Y index */
  zoneY: number;
}
