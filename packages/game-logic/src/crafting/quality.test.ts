import { describe, it, expect } from 'vitest';
import { rollQualityTier, getQualityThresholds, getQualityStatMultiplier } from './quality';

describe('getQualityThresholds', () => {
  it('returns zero masterwork/refined chance at level 1', () => {
    const result = getQualityThresholds(1, 1);
    expect(result.masterworkChance).toBeCloseTo(0, 2);
    expect(result.refinedChance).toBeCloseTo(0, 1);
    expect(result.standardChance).toBeCloseTo(1, 1);
  });

  it('returns ~15% masterwork / ~50% refined at level 50 tier 1', () => {
    const result = getQualityThresholds(50, 1);
    expect(result.masterworkChance).toBeCloseTo(0.15, 1);
    expect(result.refinedChance).toBeCloseTo(0.50, 1);
    expect(result.standardChance).toBeCloseTo(0.35, 1);
  });

  it('returns lower quality chances for higher recipe tiers', () => {
    const tier1 = getQualityThresholds(50, 1);
    const tier2 = getQualityThresholds(50, 2);
    const tier3 = getQualityThresholds(50, 3);

    expect(tier2.masterworkChance).toBeLessThan(tier1.masterworkChance);
    expect(tier3.masterworkChance).toBeLessThan(tier2.masterworkChance);
    expect(tier2.refinedChance).toBeLessThan(tier1.refinedChance);
    expect(tier3.refinedChance).toBeLessThan(tier2.refinedChance);
  });

  it('all probabilities sum to 1.0 for any level/tier combination', () => {
    for (const level of [1, 10, 25, 40, 50]) {
      for (const tier of [1, 2, 3, 4, 5]) {
        const result = getQualityThresholds(level, tier);
        expect(result.masterworkChance + result.refinedChance + result.standardChance).toBeCloseTo(1.0, 10);
        expect(result.masterworkChance).toBeGreaterThanOrEqual(0);
        expect(result.refinedChance).toBeGreaterThanOrEqual(0);
        expect(result.standardChance).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('clamps level to 1-50 range', () => {
    const negLevel = getQualityThresholds(-5, 1);
    const overLevel = getQualityThresholds(100, 1);
    expect(negLevel.masterworkChance).toBeCloseTo(0, 2);
    expect(overLevel.masterworkChance).toBeCloseTo(0.15, 1);
  });
});

describe('rollQualityTier', () => {
  it('returns standard when rng rolls high', () => {
    const result = rollQualityTier(50, 1, () => 0.99);
    expect(result.tier).toBe('standard');
  });

  it('returns masterwork when rng rolls very low at high level', () => {
    const result = rollQualityTier(50, 1, () => 0.01);
    expect(result.tier).toBe('masterwork');
  });

  it('returns refined when rng is in the middle range at high level', () => {
    const result = rollQualityTier(50, 1, () => 0.30);
    expect(result.tier).toBe('refined');
  });

  it('always returns standard at level 1 regardless of rng', () => {
    for (const roll of [0.0, 0.01, 0.5, 0.99]) {
      const result = rollQualityTier(1, 1, () => roll);
      expect(result.tier).toBe('standard');
    }
  });

  it('includes the roll value in result for debugging', () => {
    const result = rollQualityTier(25, 1, () => 0.42);
    expect(result.roll).toBe(0.42);
  });
});

describe('getQualityStatMultiplier', () => {
  it('returns 1.0 for standard', () => {
    expect(getQualityStatMultiplier('standard')).toBe(1.0);
  });

  it('returns 1.15 for refined', () => {
    expect(getQualityStatMultiplier('refined')).toBe(1.15);
  });

  it('returns 1.30 for masterwork', () => {
    expect(getQualityStatMultiplier('masterwork')).toBe(1.30);
  });
});
