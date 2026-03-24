// Movement
export * from './movement/validation';
export * from './movement/pathfinding';
export * from './movement/pixel-validation';
export * from './movement/pixel-distance';

// Combat
export * from './combat/damage';
export * from './combat/turn-order';
export { FACTION_RESPAWN_COORDS, getFactionRespawnPosition } from './combat/respawn';

// Interaction
export * from './interaction/interaction';

// Visibility
export * from './visibility/range';

// Utility
export * from './utils/zone';

// Inventory
export * from './inventory/validation';
export * from './inventory/effects';
export * from './inventory/stats';

// Stats
export * from './stats/char-stats';
export * from './stats/stat-helpers';

// Loot
export * from './loot/loot-table';
export * from './loot/creature-loot';

// AI
export * from './ai/creature-ai';

// Abilities
export { AbilityRegistry } from './ability/ability-registry';

// Quest
export * from './quest';

// Gathering
export * from './gathering/timing-validation';
export * from './gathering/proficiency';

// Hazard
export * from './hazard/hazard';

// Crafting quality and XP decay (Phase 123)
export * from './crafting';

// Creature behavior strategies (Phase 150)
export { registerBehaviorStrategy, getBehaviorStrategy, initBehaviorStrategies } from './ai/behaviors/index';
export type { CreatureBehaviorStrategy } from './ai/behaviors/index';
export { HerbivoreBehavior, OmnivoreBehavior, PredatorBehavior, ManiacBehavior } from './ai/behaviors/index';

// Ability effect strategies (Phase 149)
export { registerEffectStrategy, getEffectStrategy, initEffectStrategies } from './ability-effects/index';
export type { EffectStrategy, EffectContext, EffectResult, EffectServices, PlayerRef } from './ability-effects/index';
export { AbstractEffectStrategy } from './ability-effects/index';
