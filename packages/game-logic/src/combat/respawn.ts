import { FactionId, Position } from '@into-the-void/shared-types';

/** Faction hub respawn coordinates. Zone IDs follow pattern 'zone_X_Y'. */
export const FACTION_RESPAWN_COORDS: Record<FactionId, Position> = {
  verdant: { x: 8, y: 8, zoneId: 'zone_-2_0' },  // Canopy - western forest
  helix: { x: 8, y: 8, zoneId: 'zone_2_0' },     // Ironhold - eastern volcanic
  nexus: { x: 8, y: 8, zoneId: 'zone_0_2' },     // Meridian - southern coast
  neutral: { x: 8, y: 8, zoneId: 'zone_0_2' },   // Also Meridian (neutral welcome)
};

/**
 * Get the respawn position for a player based on their faction.
 */
export function getFactionRespawnPosition(faction: FactionId): Position {
  return { ...FACTION_RESPAWN_COORDS[faction] };
}
