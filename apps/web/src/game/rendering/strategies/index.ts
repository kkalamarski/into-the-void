import type { RenderStrategy } from './types';

export type { RenderStrategy, ScaleConfig, ShadowDimensions, HitAreaConfig, TextureInfo, VisibleBounds } from './types';
export { AbstractRenderStrategy } from './AbstractRenderStrategy';

const strategyInstances = new Map<string, RenderStrategy>();

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
  // Will be populated in Plan 02 when strategy classes are created
}
