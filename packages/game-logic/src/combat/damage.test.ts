import { calculateAttackInterval, calculateDamage } from './damage';

describe('calculateAttackInterval', () => {
  it('returns 1000ms at base haste (50)', () => {
    expect(calculateAttackInterval(50)).toBe(1000);
  });

  it('returns faster interval with higher haste', () => {
    // At Haste 100, interval should be ~500ms
    expect(calculateAttackInterval(100)).toBe(500);
  });

  it('returns slower interval with lower haste', () => {
    // At Haste 25, interval should be ~2000ms
    expect(calculateAttackInterval(25)).toBe(2000);
  });

  it('clamps to minimum 200ms', () => {
    // Even at very high haste, never faster than 200ms
    expect(calculateAttackInterval(500)).toBe(200);
  });

  it('clamps to maximum 3000ms', () => {
    // At very low haste, caps at 3000ms
    expect(calculateAttackInterval(10)).toBeLessThanOrEqual(3000);
  });

  it('handles edge case of zero haste', () => {
    // Should not crash, uses minimum effective haste
    expect(calculateAttackInterval(0)).toBe(3000);
  });
});

describe('calculateDamage', () => {
  it('calculates damage with Power affecting output', () => {
    const result = calculateDamage({
      baseDamage: 10,
      attackerLevel: 10,
      defenderLevel: 10,
      attackerStats: { power: 100 },
      defenderStats: { toughness: 50 },
    });
    // With power 100, should deal more than base
    expect(result.damage).toBeGreaterThan(10);
  });

  it('Toughness reduces damage taken', () => {
    // Use armorReduction equal to toughness (mirrors combat.service.ts attackTick behaviour)
    // and critChance=0 to remove crit randomness. Average over 20 runs to smooth ±10% variance.
    const results = { low: [] as number[], high: [] as number[] };

    for (let i = 0; i < 20; i++) {
      results.low.push(calculateDamage({
        baseDamage: 10,
        attackerLevel: 10,
        defenderLevel: 10,
        attackerStats: { power: 50 },
        defenderStats: { toughness: 20 },
        armorReduction: 20,
        critChance: 0,
      }).damage);

      results.high.push(calculateDamage({
        baseDamage: 10,
        attackerLevel: 10,
        defenderLevel: 10,
        attackerStats: { power: 50 },
        defenderStats: { toughness: 100 },
        armorReduction: 100,
        critChance: 0,
      }).damage);
    }

    const avgLow = results.low.reduce((a, b) => a + b, 0) / results.low.length;
    const avgHigh = results.high.reduce((a, b) => a + b, 0) / results.high.length;

    // High toughness should deal significantly less damage (not just ±10% variance).
    // Low toughness (20): effectiveArmor = 20 * (1 + 20*0.02) = 28 — moderate reduction.
    // High toughness (100): effectiveArmor = 100 * (1 + 100*0.02) = 300 — floors at 1.
    expect(avgHigh).toBeLessThan(avgLow * 0.8);
  });
});
