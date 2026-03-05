import { describe, it, expect } from 'vitest';
import { calculateXPDecay, calculateEffectiveXP } from './xp-decay';

describe('calculateXPDecay', () => {
  it('returns 1.0 when proficiency level equals recipe tier equivalent', () => {
    expect(calculateXPDecay(1, 1)).toBe(1.0);
    expect(calculateXPDecay(10, 2)).toBe(1.0);
    expect(calculateXPDecay(20, 3)).toBe(1.0);
  });

  it('returns 1.0 within 2 levels of recipe tier equivalent', () => {
    expect(calculateXPDecay(3, 1)).toBe(1.0);  // level 3, tier 1 (equiv 1), diff = 2
    expect(calculateXPDecay(12, 2)).toBe(1.0); // level 12, tier 2 (equiv 10), diff = 2
  });

  it('returns approximately 0.5 at 5 levels above recipe tier equivalent', () => {
    // Tier 1 equiv = 1, level 6 = diff 5, after grace 2 = effective diff 3
    // decay = 2^(-3/3) = 0.5
    const result = calculateXPDecay(6, 1);
    expect(result).toBeCloseTo(0.5, 1);
  });

  it('returns less than 0.5 at 10 levels above recipe tier equivalent', () => {
    // Tier 1 equiv = 1, level 11 = diff 10, after grace 2 = effective diff 8
    // decay = 2^(-8/3) ~ 0.16
    const result = calculateXPDecay(11, 1);
    expect(result).toBeLessThan(0.5);
    expect(result).toBeGreaterThanOrEqual(0.1);
  });

  it('never returns below 0.1 (10% floor)', () => {
    expect(calculateXPDecay(50, 1)).toBeGreaterThanOrEqual(0.1);
    expect(calculateXPDecay(50, 2)).toBeGreaterThanOrEqual(0.1);
    expect(calculateXPDecay(50, 3)).toBeGreaterThanOrEqual(0.1);
  });

  it('returns 1.0 when proficiency is below recipe tier equivalent', () => {
    // Level 5 crafting a tier 2 recipe (equiv level 10) — no decay for "hard" recipes
    expect(calculateXPDecay(5, 2)).toBe(1.0);
  });

  it('handles edge cases gracefully', () => {
    expect(calculateXPDecay(0, 1)).toBe(1.0);  // below-min level
    expect(calculateXPDecay(1, 5)).toBe(1.0);  // low level, high tier
    // level 50, tier 5 (equiv 40), diff = 10 — decay applies
    expect(calculateXPDecay(50, 5)).toBeGreaterThanOrEqual(0.1);
    expect(calculateXPDecay(50, 5)).toBeLessThanOrEqual(1.0);
    // level 42, tier 5 (equiv 40), diff = 2 — within grace zone
    expect(calculateXPDecay(42, 5)).toBe(1.0);
  });
});

describe('calculateEffectiveXP', () => {
  it('returns full XP when no decay applies', () => {
    expect(calculateEffectiveXP(10, 1, 1)).toBe(10);
    expect(calculateEffectiveXP(25, 10, 2)).toBe(25);
  });

  it('reduces XP when decay applies', () => {
    const effective = calculateEffectiveXP(10, 15, 1);
    expect(effective).toBeLessThan(10);
    expect(effective).toBeGreaterThan(0);
  });

  it('always returns at least 1 XP (minimum 1, never 0)', () => {
    expect(calculateEffectiveXP(10, 50, 1)).toBeGreaterThanOrEqual(1);
  });

  it('rounds down to integer', () => {
    const result = calculateEffectiveXP(10, 6, 1);
    expect(Number.isInteger(result)).toBe(true);
  });
});
