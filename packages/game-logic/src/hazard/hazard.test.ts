import {
  getHazardForBiome,
  isHazardousBiome,
  shouldApplyHazardTick,
  calculateHazardDamage,
  calculateHazardDebuff,
  calculateEffectiveHazard,
  shouldIncreaseStack,
} from './hazard';
import type { HazardConfig, HazardState } from '@into-the-void/shared-types';

// ── Helper factories ────────────────────────────────────────────────────────

function makeHazardConfig(overrides: Partial<HazardConfig> = {}): HazardConfig {
  return {
    hazardType: 'chemical',
    tier: 3,
    hpDrainPercent: 0.08,
    tickIntervalMs: 3000,
    gracePeriodMs: 3000,
    stacksOverTime: false,
    ...overrides,
  };
}

function makeHazardState(overrides: Partial<HazardState> = {}): HazardState {
  return {
    playerId: 'player-1',
    hazardType: 'chemical',
    config: makeHazardConfig(),
    enteredAt: 1000,
    lastTickAt: 0,
    protectionPercent: 0,
    stackCount: 0,
    lastStackAt: 1000,
    ...overrides,
  };
}

// ── getHazardForBiome ───────────────────────────────────────────────────────

describe('getHazardForBiome', () => {
  it('returns null for Tier I biomes (no hazard)', () => {
    expect(getHazardForBiome('void_plains')).toBeNull();
    expect(getHazardForBiome('fungal_forest')).toBeNull();
    expect(getHazardForBiome('tidal_pools')).toBeNull();
    expect(getHazardForBiome('ancient_ruins')).toBeNull();
  });

  it('returns chemical hazard config for toxic_wastes (Tier II)', () => {
    const config = getHazardForBiome('toxic_wastes');
    expect(config).not.toBeNull();
    expect(config!.hazardType).toBe('chemical');
    expect(config!.tier).toBe(2);
    expect(config!.hpDrainPercent).toBe(0);
    expect(config!.stacksOverTime).toBe(false);
  });

  it('returns thermal hazard config for volcanic_ridge (Tier III)', () => {
    const config = getHazardForBiome('volcanic_ridge');
    expect(config).not.toBeNull();
    expect(config!.hazardType).toBe('thermal');
    expect(config!.tier).toBe(3);
    expect(config!.hpDrainPercent).toBe(0.08);
  });

  it('returns anomalous hazard config for void_rift (Tier IV)', () => {
    const config = getHazardForBiome('void_rift');
    expect(config).not.toBeNull();
    expect(config!.hazardType).toBe('anomalous');
    expect(config!.tier).toBe(4);
    expect(config!.stacksOverTime).toBe(true);
    expect(config!.stackIntervalMs).toBe(30000);
    expect(config!.stackDebuffIncrease).toBe(0.05);
  });

  it('returns physical hazard for crystal_caves (Tier III)', () => {
    const config = getHazardForBiome('crystal_caves');
    expect(config).not.toBeNull();
    expect(config!.hazardType).toBe('physical');
    expect(config!.tier).toBe(3);
  });

  it('returns biological hazard for bioluminescent_depths (Tier II)', () => {
    const config = getHazardForBiome('bioluminescent_depths');
    expect(config).not.toBeNull();
    expect(config!.hazardType).toBe('biological');
    expect(config!.tier).toBe(2);
    expect(config!.hpDrainPercent).toBe(0);
  });
});

// ── isHazardousBiome ────────────────────────────────────────────────────────

describe('isHazardousBiome', () => {
  it('returns false for Tier I biomes', () => {
    expect(isHazardousBiome('void_plains')).toBe(false);
    expect(isHazardousBiome('fungal_forest')).toBe(false);
  });

  it('returns true for Tier II+ biomes', () => {
    expect(isHazardousBiome('toxic_wastes')).toBe(true);
    expect(isHazardousBiome('volcanic_ridge')).toBe(true);
    expect(isHazardousBiome('void_rift')).toBe(true);
  });
});

// ── shouldApplyHazardTick ───────────────────────────────────────────────────

describe('shouldApplyHazardTick', () => {
  it('returns false during grace period (HAZD-10)', () => {
    const state = makeHazardState({ enteredAt: 1000 });
    // 2 seconds in, still within 3-second grace period
    expect(shouldApplyHazardTick(state, 3000)).toBe(false);
  });

  it('returns false at exactly grace period boundary', () => {
    const state = makeHazardState({ enteredAt: 1000 });
    // Exactly at 3-second boundary (1000 + 3000 = 4000), diff = 3000, NOT less than 3000
    expect(shouldApplyHazardTick(state, 4000)).toBe(true);
  });

  it('returns true after grace period expires', () => {
    const state = makeHazardState({ enteredAt: 1000 });
    // 4 seconds in, past 3-second grace period
    expect(shouldApplyHazardTick(state, 5000)).toBe(true);
  });

  it('returns false between tick intervals', () => {
    const state = makeHazardState({
      enteredAt: 1000,
      lastTickAt: 5000,
    });
    // 6 seconds total, 1 second since last tick, within 3-second interval
    expect(shouldApplyHazardTick(state, 6000)).toBe(false);
  });

  it('returns true when tick interval has elapsed', () => {
    const state = makeHazardState({
      enteredAt: 1000,
      lastTickAt: 5000,
    });
    // 8 seconds total, 3 seconds since last tick = exactly at interval
    expect(shouldApplyHazardTick(state, 8000)).toBe(true);
  });

  it('returns true for first tick after grace period (lastTickAt = 0)', () => {
    const state = makeHazardState({
      enteredAt: 1000,
      lastTickAt: 0,
    });
    // Past grace period, no previous tick
    expect(shouldApplyHazardTick(state, 5000)).toBe(true);
  });
});

// ── calculateHazardDamage ───────────────────────────────────────────────────

describe('calculateHazardDamage', () => {
  it('returns 0 for Tier II (debuff only, no HP drain) (HAZD-01)', () => {
    const config = makeHazardConfig({ hpDrainPercent: 0, tier: 2 });
    expect(calculateHazardDamage(config, 100, 0)).toBe(0);
  });

  it('returns 8% of maxHealth for Tier III with no protection (HAZD-02)', () => {
    const config = makeHazardConfig({ hpDrainPercent: 0.08, tier: 3 });
    expect(calculateHazardDamage(config, 100, 0)).toBe(8);
  });

  it('rounds up damage (ceil)', () => {
    const config = makeHazardConfig({ hpDrainPercent: 0.08, tier: 3 });
    // 0.08 * 75 = 6.0 raw, then effectiveDamage = ceil(6 * 1) = 6
    expect(calculateHazardDamage(config, 75, 0)).toBe(6);
    // 0.08 * 53 = 4.24, ceil = 5, then 5 * 1 = 5, ceil = 5
    expect(calculateHazardDamage(config, 53, 0)).toBe(5);
  });

  it('reduces damage proportionally with protection (HAZD-05)', () => {
    const config = makeHazardConfig({ hpDrainPercent: 0.08, tier: 3 });
    // 50% protection: raw = ceil(100 * 0.08) = 8, effective = ceil(8 * 0.5) = 4
    expect(calculateHazardDamage(config, 100, 50)).toBe(4);
  });

  it('returns 0 at 100% protection (full immunity)', () => {
    const config = makeHazardConfig({ hpDrainPercent: 0.08, tier: 3 });
    expect(calculateHazardDamage(config, 100, 100)).toBe(0);
  });

  it('returns 0 at protection > 100%', () => {
    const config = makeHazardConfig({ hpDrainPercent: 0.08, tier: 3 });
    expect(calculateHazardDamage(config, 100, 150)).toBe(0);
  });

  it('applies damage correctly for large health pools', () => {
    const config = makeHazardConfig({ hpDrainPercent: 0.08, tier: 3 });
    // 0.08 * 500 = 40
    expect(calculateHazardDamage(config, 500, 0)).toBe(40);
  });

  it('returns at least 0 damage (never negative)', () => {
    const config = makeHazardConfig({ hpDrainPercent: 0.08, tier: 3 });
    expect(calculateHazardDamage(config, 100, 99)).toBeGreaterThanOrEqual(0);
  });
});

// ── calculateHazardDebuff ───────────────────────────────────────────────────

describe('calculateHazardDebuff', () => {
  it('returns chemical debuff targeting perception (HAZD-03)', () => {
    const config = makeHazardConfig({ hazardType: 'chemical' });
    const result = calculateHazardDebuff(config, 0, 0);
    expect(result.stat).toBe('perception');
    expect(result.percent).toBe(0.20);
  });

  it('returns thermal debuff targeting haste', () => {
    const config = makeHazardConfig({ hazardType: 'thermal' });
    const result = calculateHazardDebuff(config, 0, 0);
    expect(result.stat).toBe('haste');
    expect(result.percent).toBe(0.20);
  });

  it('returns physical debuff targeting toughness', () => {
    const config = makeHazardConfig({ hazardType: 'physical' });
    const result = calculateHazardDebuff(config, 0, 0);
    expect(result.stat).toBe('toughness');
    expect(result.percent).toBe(0.20);
  });

  it('returns biological debuff targeting recovery', () => {
    const config = makeHazardConfig({ hazardType: 'biological' });
    const result = calculateHazardDebuff(config, 0, 0);
    expect(result.stat).toBe('recovery');
    expect(result.percent).toBe(0.20);
  });

  it('returns anomalous debuff targeting all stats', () => {
    const config = makeHazardConfig({ hazardType: 'anomalous' });
    const result = calculateHazardDebuff(config, 0, 0);
    expect(result.stat).toBe('all');
    expect(result.percent).toBe(0.15);
  });

  it('reduces debuff with protection', () => {
    const config = makeHazardConfig({ hazardType: 'chemical' });
    const result = calculateHazardDebuff(config, 50, 0);
    // 0.20 * (1 - 50/100) = 0.10
    expect(result.percent).toBeCloseTo(0.10);
  });

  it('returns no debuff at 100% protection', () => {
    const config = makeHazardConfig({ hazardType: 'chemical' });
    const result = calculateHazardDebuff(config, 100, 0);
    expect(result.stat).toBe('none');
    expect(result.percent).toBe(0);
  });

  it('escalates debuff with Tier IV stacking (HAZD-04)', () => {
    const config = makeHazardConfig({
      hazardType: 'anomalous',
      tier: 4,
      stacksOverTime: true,
      stackDebuffIncrease: 0.05,
    });
    // Stack 0: 0.15
    const s0 = calculateHazardDebuff(config, 0, 0);
    expect(s0.percent).toBe(0.15);

    // Stack 3: 0.15 + 3 * 0.05 = 0.30
    const s3 = calculateHazardDebuff(config, 0, 3);
    expect(s3.percent).toBeCloseTo(0.30);

    // Stack 5: 0.15 + 5 * 0.05 = 0.40
    const s5 = calculateHazardDebuff(config, 0, 5);
    expect(s5.percent).toBeCloseTo(0.40);
  });

  it('combines stacking and protection reduction', () => {
    const config = makeHazardConfig({
      hazardType: 'anomalous',
      tier: 4,
      stacksOverTime: true,
      stackDebuffIncrease: 0.05,
    });
    // Stack 3 with 50% protection: (0.15 + 3*0.05) * 0.5 = 0.30 * 0.5 = 0.15
    const result = calculateHazardDebuff(config, 50, 3);
    expect(result.percent).toBeCloseTo(0.15);
  });
});

// ── calculateEffectiveHazard ────────────────────────────────────────────────

describe('calculateEffectiveHazard', () => {
  it('returns both damage and debuff in one call', () => {
    const config = makeHazardConfig({ hpDrainPercent: 0.08, hazardType: 'thermal' });
    const result = calculateEffectiveHazard(config, 100, 0, 0);

    expect(result.damage).toBe(8);
    expect(result.debuff.stat).toBe('haste');
    expect(result.debuff.percent).toBe(0.20);
  });

  it('applies protection to both damage and debuff', () => {
    const config = makeHazardConfig({ hpDrainPercent: 0.08, hazardType: 'thermal' });
    const result = calculateEffectiveHazard(config, 100, 50, 0);

    expect(result.damage).toBe(4);
    expect(result.debuff.percent).toBeCloseTo(0.10);
  });

  it('returns zero for everything at 100% protection', () => {
    const config = makeHazardConfig({ hpDrainPercent: 0.08, hazardType: 'thermal' });
    const result = calculateEffectiveHazard(config, 100, 100, 0);

    expect(result.damage).toBe(0);
    expect(result.debuff.stat).toBe('none');
    expect(result.debuff.percent).toBe(0);
  });
});

// ── shouldIncreaseStack ─────────────────────────────────────────────────────

describe('shouldIncreaseStack', () => {
  it('returns false for non-stacking hazards', () => {
    const state = makeHazardState({
      config: makeHazardConfig({ stacksOverTime: false }),
    });
    expect(shouldIncreaseStack(state, 100000)).toBe(false);
  });

  it('returns false when stack interval has not elapsed', () => {
    const state = makeHazardState({
      config: makeHazardConfig({
        hazardType: 'anomalous',
        tier: 4,
        stacksOverTime: true,
        stackIntervalMs: 30000,
      }),
      lastStackAt: 1000,
    });
    // 20 seconds later, still within 30-second interval
    expect(shouldIncreaseStack(state, 21000)).toBe(false);
  });

  it('returns true when stack interval has elapsed', () => {
    const state = makeHazardState({
      config: makeHazardConfig({
        hazardType: 'anomalous',
        tier: 4,
        stacksOverTime: true,
        stackIntervalMs: 30000,
      }),
      lastStackAt: 1000,
    });
    // 30 seconds later = exactly at interval
    expect(shouldIncreaseStack(state, 31000)).toBe(true);
  });

  it('returns true well past stack interval', () => {
    const state = makeHazardState({
      config: makeHazardConfig({
        hazardType: 'anomalous',
        tier: 4,
        stacksOverTime: true,
        stackIntervalMs: 30000,
      }),
      lastStackAt: 1000,
    });
    // 60 seconds later
    expect(shouldIncreaseStack(state, 61000)).toBe(true);
  });

  it('returns false when stacksOverTime is true but stackIntervalMs is undefined', () => {
    const state = makeHazardState({
      config: makeHazardConfig({
        stacksOverTime: true,
        stackIntervalMs: undefined,
      }),
    });
    expect(shouldIncreaseStack(state, 100000)).toBe(false);
  });
});
