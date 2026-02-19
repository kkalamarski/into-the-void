import type { NpcDefinition, NpcType } from './types';

/**
 * Fallback NPC for unknown IDs - prevents crashes
 */
const UNKNOWN_NPC: NpcDefinition = {
  id: 'unknown',
  displayName: 'Unknown NPC',
  description: 'Unknown NPC. This should not appear in normal gameplay.',
  npcType: 'ambient',
  faction: 'neutral',
  textureKey: 'npc_unknown',
  color: 0xff00ff, // Magenta - obvious error color
  dialogue: [{ text: '...' }],
  role: 'Unknown',
};

/**
 * NPC registry - singleton for NPC definition lookups.
 * Mirrors EntityRegistryImpl pattern from packages/entities.
 */
class NpcRegistryImpl {
  private readonly npcs: Map<string, NpcDefinition> = new Map();

  /**
   * Register an NPC definition.
   * @internal Used during static initialization
   */
  register(npc: NpcDefinition): void {
    if (this.npcs.has(npc.id)) {
      console.warn(`NPC ID "${npc.id}" already registered, overwriting`);
    }
    this.npcs.set(npc.id, npc);
  }

  /**
   * Register multiple NPC definitions.
   * @internal Used during static initialization
   */
  registerAll(npcs: readonly NpcDefinition[]): void {
    for (const npc of npcs) {
      this.register(npc);
    }
  }

  /**
   * Get NPC definition by ID.
   * Returns fallback 'unknown' NPC with console warning if not found.
   */
  get(id: string): NpcDefinition {
    const npc = this.npcs.get(id);
    if (!npc) {
      console.warn(`Unknown NPC ID: "${id}", using fallback`);
      return UNKNOWN_NPC;
    }
    return npc;
  }

  /**
   * Check if NPC ID exists without triggering fallback.
   */
  has(id: string): boolean {
    return this.npcs.has(id);
  }

  /**
   * Get all registered NPC IDs.
   */
  getAllIds(): string[] {
    return Array.from(this.npcs.keys());
  }

  /**
   * Get all NPCs of a specific type.
   */
  getByType(npcType: NpcType): NpcDefinition[] {
    return Array.from(this.npcs.values()).filter((n) =>
      n.npcType === npcType
    );
  }

  /**
   * Get all NPCs for a specific hub/faction.
   */
  getByFaction(faction: NpcDefinition['faction']): NpcDefinition[] {
    return Array.from(this.npcs.values()).filter((n) =>
      n.faction === faction
    );
  }

  /**
   * Get count of registered NPCs.
   */
  get size(): number {
    return this.npcs.size;
  }
}

/** Singleton registry instance */
export const NpcRegistry = new NpcRegistryImpl();
