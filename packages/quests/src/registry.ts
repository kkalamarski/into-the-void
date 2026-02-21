import type { QuestDefinition, QuestFaction } from './types';

/**
 * Fallback quest for unknown IDs - prevents crashes
 */
const UNKNOWN_QUEST: QuestDefinition = {
  id: 'unknown',
  displayName: 'Unknown Quest',
  description: 'Unknown quest. This should not appear in normal gameplay.',
  objectives: [],
  rewards: {},
  minLevel: 1,
};

/**
 * Quest registry - singleton for quest definition lookups.
 * Mirrors NpcRegistryImpl pattern from packages/npcs.
 */
class QuestRegistryImpl {
  private readonly quests: Map<string, QuestDefinition> = new Map();

  /**
   * Register a quest definition.
   * @internal Used during static initialization
   */
  register(quest: QuestDefinition): void {
    if (this.quests.has(quest.id)) {
      console.warn(`Quest ID "${quest.id}" already registered, overwriting`);
    }
    this.quests.set(quest.id, quest);
  }

  /**
   * Register multiple quest definitions.
   * @internal Used during static initialization
   */
  registerAll(quests: readonly QuestDefinition[]): void {
    for (const quest of quests) {
      this.register(quest);
    }
  }

  /**
   * Get quest definition by ID.
   * Returns fallback 'unknown' quest with console warning if not found.
   */
  get(id: string): QuestDefinition {
    const quest = this.quests.get(id);
    if (!quest) {
      console.warn(`Unknown Quest ID: "${id}", using fallback`);
      return UNKNOWN_QUEST;
    }
    return quest;
  }

  /**
   * Check if quest ID exists without triggering fallback.
   */
  has(id: string): boolean {
    return this.quests.has(id);
  }

  /**
   * Get all registered quest IDs.
   */
  getAllIds(): string[] {
    return Array.from(this.quests.keys());
  }

  /**
   * Get all quests available to a specific faction.
   * Includes quests with no faction restriction (tutorial quests).
   */
  getByFaction(faction: QuestFaction): QuestDefinition[] {
    return Array.from(this.quests.values()).filter((q) =>
      q.faction === undefined || q.faction === faction
    );
  }

  /**
   * Get count of registered quests.
   */
  get size(): number {
    return this.quests.size;
  }
}

/** Singleton registry instance */
export const QuestRegistry = new QuestRegistryImpl();
