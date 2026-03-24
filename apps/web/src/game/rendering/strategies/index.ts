import type { RenderStrategy } from './types';
import { CreatureRenderStrategy } from './CreatureRenderStrategy';
import { PlantRenderStrategy } from './PlantRenderStrategy';
import { MineralRenderStrategy } from './MineralRenderStrategy';
import { NpcRenderStrategy } from './NpcRenderStrategy';
import { ArtifactRenderStrategy } from './ArtifactRenderStrategy';
import { ItemRenderStrategy } from './ItemRenderStrategy';

export type { RenderStrategy, ScaleConfig, ShadowDimensions, HitAreaConfig, TextureInfo, VisibleBounds } from './types';
export { AbstractRenderStrategy } from './AbstractRenderStrategy';

const strategyInstances = new Map<string, RenderStrategy>();
let initialized = false;

/** Get the render strategy for an entity type. Lazily creates singletons. */
export function getStrategyForType(entityType: string): RenderStrategy | undefined {
  return strategyInstances.get(entityType);
}

/** Register a strategy for an entity type. Called during initialization. */
export function registerStrategy(entityType: string, strategy: RenderStrategy): void {
  strategyInstances.set(entityType, strategy);
}

/** Initialize all strategies. Call once at scene startup. Idempotent. */
export function initStrategies(): void {
  if (initialized) return;
  registerStrategy('creature', new CreatureRenderStrategy());
  registerStrategy('plant', new PlantRenderStrategy());
  registerStrategy('mineral', new MineralRenderStrategy());
  registerStrategy('npc', new NpcRenderStrategy());
  registerStrategy('artifact', new ArtifactRenderStrategy());
  registerStrategy('item', new ItemRenderStrategy());
  initialized = true;
}
