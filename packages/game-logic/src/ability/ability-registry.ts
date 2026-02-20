import type { AbilityDefinition } from '@into-the-void/shared-types';
import { ALL_ABILITIES } from './definitions';

/**
 * Singleton registry for ability definitions.
 * Mirrors ItemRegistry pattern for consistency.
 */
class AbilityRegistryImpl {
  private abilities: Map<string, AbilityDefinition> = new Map();

  constructor() {
    this.registerAll(ALL_ABILITIES);
  }

  /**
   * Register multiple ability definitions
   */
  registerAll(abilities: readonly AbilityDefinition[]): void {
    for (const ability of abilities) {
      this.abilities.set(ability.id, ability);
    }
  }

  /**
   * Get ability by ID
   */
  get(id: string): AbilityDefinition | undefined {
    return this.abilities.get(id);
  }

  /**
   * Check if ability exists
   */
  has(id: string): boolean {
    return this.abilities.has(id);
  }

  /**
   * Get all registered abilities
   */
  getAll(): AbilityDefinition[] {
    return Array.from(this.abilities.values());
  }
}

export const AbilityRegistry = new AbilityRegistryImpl();
