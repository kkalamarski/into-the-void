import { FactionId, Position } from '@into-the-void/shared-types';

/** Faction hub respawn coordinates. Players respawn in their faction's orbital station. */
export const FACTION_RESPAWN_COORDS: Record<FactionId, Position> = {
  verdant: { x: 32, y: 32, zoneId: 'hub_verdant' },  // Canopy Station - Verdant hub
  helix: { x: 32, y: 32, zoneId: 'hub_helix' },      // Ironhold Station - Helix hub
  nexus: { x: 32, y: 32, zoneId: 'hub_nexus' },      // Meridian Station - Nexus hub
  neutral: { x: 32, y: 32, zoneId: 'hub_nexus' },    // Unaffiliated go to Nexus (neutral welcome)
};

/**
 * Get the respawn position for a player based on their faction.
 */
export function getFactionRespawnPosition(faction: FactionId): Position {
  return { ...FACTION_RESPAWN_COORDS[faction] };
}
