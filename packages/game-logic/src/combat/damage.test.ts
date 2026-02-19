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
    const lowToughness = calculateDamage({
      baseDamage: 10,
      attackerLevel: 10,
      defenderLevel: 10,
      attackerStats: { power: 50 },
      defenderStats: { toughness: 20 },
    });

    const highToughness = calculateDamage({
      baseDamage: 10,
      attackerLevel: 10,
      defenderLevel: 10,
      attackerStats: { power: 50 },
      defenderStats: { toughness: 100 },
    });

    // Higher toughness should result in less damage
    expect(highToughness.damage).toBeLessThan(lowToughness.damage);
  });
});
