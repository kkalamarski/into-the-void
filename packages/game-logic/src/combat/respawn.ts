import { FactionId, Position } from '@into-the-void/shared-types';

/** Faction hub respawn coordinates. Players respawn in their faction's orbital station.
 *  Coordinates match entryPoint from 128x128 hub JSON maps (a few tiles north of portal).
 */
export const FACTION_RESPAWN_COORDS: Record<FactionId, Position> = {
  verdant: { x: 64, y: 102, zoneId: 'hub_verdant' },  // Canopy Station - Verdant hub
  helix: { x: 64, y: 103, zoneId: 'hub_helix' },      // Ironhold Station - Helix hub
  nexus: { x: 64, y: 104, zoneId: 'hub_nexus' },      // Meridian Station - Nexus hub
  neutral: { x: 56, y: 103, zoneId: 'hub_neutral' },   // Salvage Station - Unaffiliated hub
};

/**
 * Get the respawn position for a player based on their faction.
 */
export function getFactionRespawnPosition(faction: FactionId): Position {
  return { ...FACTION_RESPAWN_COORDS[faction] };
}
