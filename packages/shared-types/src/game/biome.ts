/**
 * Biome types in the game world
 */
export type BiomeType =
  | 'void_plains'
  | 'crystal_caves'
  | 'toxic_wastes'
  | 'ancient_ruins'
  | 'frozen_expanse'
  | 'volcanic_ridge'
  | 'fungal_forest'
  | 'starfall_crater';

/**
 * Biome data
 */
export interface Biome {
  /** Biome type identifier */
  type: BiomeType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Primary tile set */
  tileSet: string;
  /** Base danger level (1-10) */
  dangerLevel: number;
  /** Resource multipliers */
  resources: BiomeResources;
  /** Environmental hazards */
  hazards: BiomeHazard[];
}

/**
 * Resource availability in a biome
 */
export interface BiomeResources {
  /** Mineral spawn rate modifier */
  minerals: number;
  /** Creature spawn rate modifier */
  creatures: number;
  /** Rare resource chance modifier */
  rareChance: number;
}

/**
 * Environmental hazard
 */
export interface BiomeHazard {
  /** Hazard type */
  type: 'radiation' | 'toxic' | 'cold' | 'heat' | 'void_storm';
  /** Damage per tick */
  damage: number;
  /** Hazard frequency (0-1) */
  frequency: number;
}

/**
 * Tile type for terrain
 */
export interface TileType {
  /** Tile ID */
  id: number;
  /** Tile name */
  name: string;
  /** Whether tile blocks movement */
  blocking: boolean;
  /** Movement speed modifier */
  speedModifier: number;
  /** Whether tile is harvestable */
  harvestable: boolean;
}

/**
 * Human-readable biome names for HUD display
 */
export const BIOME_DISPLAY_NAMES: Record<BiomeType, string> = {
  void_plains: 'Void Plains',
  crystal_caves: 'Crystal Caves',
  toxic_wastes: 'Toxic Wastes',
  ancient_ruins: 'Ancient Ruins',
  frozen_expanse: 'Frozen Expanse',
  volcanic_ridge: 'Volcanic Ridge',
  fungal_forest: 'Fungal Forest',
  starfall_crater: 'Starfall Crater',
};

/**
 * Biome colors for UI elements (minimap, indicators)
 */
export const BIOME_COLORS: Record<BiomeType, string> = {
  void_plains: '#4a4a5a',
  crystal_caves: '#7b68ee',
  toxic_wastes: '#9acd32',
  ancient_ruins: '#8b7355',
  frozen_expanse: '#b0e0e6',
  volcanic_ridge: '#ff4500',
  fungal_forest: '#9370db',
  starfall_crater: '#191970',
};
