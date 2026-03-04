import { describe, it, expect } from 'vitest';
import { tickCreatureAI, AiTickResult } from './creature-ai';
import type { Creature, PlayerPublic } from '@into-the-void/shared-types';

// ─── Test Fixtures ──────────────────────────────────────────

function makeCreature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: 'creature-1',
    type: 'creature',
    name: 'Test Creature',
    speciesId: 'test_species',
    position: { x: 25, y: 25, zoneId: 'z_0_0' },
    health: 100,
    maxHealth: 100,
    level: 5,
    behavior: 'herbivore',
    active: true,
    ...overrides,
  };
}

function makePlayer(overrides: Partial<PlayerPublic> = {}): PlayerPublic {
  return {
    id: 'player-1',
    name: 'Test Player',
    faction: 'nexus',
    position: { x: 27, y: 25, zoneId: 'z_0_0' },
    level: 5,
    inCombat: false,
    credits: 0,
    ...overrides,
  };
}

/** 64x64 collision map with all passable tiles */
function makeCollisionMap(): boolean[][] {
  return Array.from({ length: 64 }, () => Array(64).fill(false));
}

// ─── Herbivore Tests ────────────────────────────────────────

describe('tickCreatureAI - herbivore', () => {
  it('flees from nearby player', () => {
    const creature = makeCreature({ behavior: 'herbivore' });
    const player = makePlayer({ position: { x: 27, y: 25, zoneId: 'z_0_0' } });
    const result = tickCreatureAI(creature, [player], makeCollisionMap());

    // Should move away from player (player is east, creature flees west)
    expect(result.newPosition).not.toBeNull();
    if (result.newPosition) {
      expect(result.newPosition.x).toBeLessThan(creature.position.x);
    }
  });

  it('flees from attacker when combatTarget set', () => {
    const creature = makeCreature({
      behavior: 'herbivore',
      combatTarget: 'player-1',
    });
    const player = makePlayer({ position: { x: 26, y: 25, zoneId: 'z_0_0' } });
    const result = tickCreatureAI(creature, [player], makeCollisionMap());

    expect(result.newPosition).not.toBeNull();
    if (result.newPosition) {
      // Should flee away from player (player is east at x:26)
      expect(result.newPosition.x).toBeLessThan(creature.position.x);
    }
  });

  it('wanders or stays when no players nearby', () => {
    const creature = makeCreature({ behavior: 'herbivore' });
    const farPlayer = makePlayer({ position: { x: 50, y: 50, zoneId: 'z_0_0' } });
    const result = tickCreatureAI(creature, [farPlayer], makeCollisionMap());

    // Either moved (wander) or stayed put — no aggro or frenzy
    expect(result.aggroTarget).toBeUndefined();
    expect(result.frenzied).toBeUndefined();
  });

  it('returns null position when inactive', () => {
    const creature = makeCreature({ behavior: 'herbivore', active: false });
    const result = tickCreatureAI(creature, [], makeCollisionMap());

    expect(result.newPosition).toBeNull();
  });

  it('returns null position when dead', () => {
    const creature = makeCreature({ behavior: 'herbivore', health: 0 });
    const result = tickCreatureAI(creature, [], makeCollisionMap());

    expect(result.newPosition).toBeNull();
  });
});

// ─── Omnivore Tests ─────────────────────────────────────────

describe('tickCreatureAI - omnivore', () => {
  it('wanders when not provoked (no aggro)', () => {
    const creature = makeCreature({ behavior: 'omnivore' });
    const player = makePlayer({ position: { x: 27, y: 25, zoneId: 'z_0_0' } });
    const result = tickCreatureAI(creature, [player], makeCollisionMap());

    // Not provoked — should not aggro
    expect(result.aggroTarget).toBeUndefined();
    expect(result.shouldAttack).toBeUndefined();
  });

  it('chases player when provoked (like predator)', () => {
    const creature = makeCreature({
      behavior: 'omnivore',
      provoked: true,
      position: { x: 25, y: 25, zoneId: 'z_0_0' },
    });
    const player = makePlayer({ position: { x: 27, y: 25, zoneId: 'z_0_0' } });
    const result = tickCreatureAI(creature, [player], makeCollisionMap());

    // Provoked omnivore acts as predator — should aggro on nearby player
    expect(result.aggroTarget).toBe('player-1');
  });
});

// ─── Predator Tests ─────────────────────────────────────────

describe('tickCreatureAI - predator', () => {
  it('aggros on nearby player when near spawn', () => {
    // Creature without spawnPosition (no leash check) — scans for nearby players
    const creature = makeCreature({
      behavior: 'predator',
    });
    const player = makePlayer({ position: { x: 28, y: 25, zoneId: 'z_0_0' } });
    const result = tickCreatureAI(creature, [player], makeCollisionMap());

    expect(result.aggroTarget).toBe('player-1');
  });

  it('chases combatTarget', () => {
    const creature = makeCreature({
      behavior: 'predator',
      combatTarget: 'player-1',
      spawnPosition: { x: 25, y: 25 },
    });
    const player = makePlayer({ position: { x: 30, y: 25, zoneId: 'z_0_0' } });
    const result = tickCreatureAI(creature, [player], makeCollisionMap());

    // Should move toward player
    expect(result.newPosition).not.toBeNull();
    if (result.newPosition) {
      expect(result.newPosition.x).toBeGreaterThan(creature.position.x);
    }
  });

  it('attacks adjacent target (shouldAttack: true)', () => {
    const creature = makeCreature({
      behavior: 'predator',
      combatTarget: 'player-1',
      spawnPosition: { x: 25, y: 25 },
    });
    const player = makePlayer({ position: { x: 26, y: 25, zoneId: 'z_0_0' } });
    const result = tickCreatureAI(creature, [player], makeCollisionMap());

    expect(result.shouldAttack).toBe(true);
    expect(result.newPosition).toBeNull();
  });

  it('returns to spawn when leash exceeded', () => {
    const creature = makeCreature({
      behavior: 'predator',
      combatTarget: 'player-1',
      position: { x: 40, y: 25, zoneId: 'z_0_0' },
      spawnPosition: { x: 25, y: 25 },
    });
    const player = makePlayer({ position: { x: 42, y: 25, zoneId: 'z_0_0' } });
    const result = tickCreatureAI(creature, [player], makeCollisionMap());

    // Distance from spawn (15) >= LEASH_DISTANCE (10), should return
    expect(result.shouldReturn).toBe(true);
    if (result.newPosition) {
      // Moving back toward spawn
      expect(result.newPosition.x).toBeLessThan(creature.position.x);
    }
  });

  it('does not set frenzied for predator at low HP', () => {
    const creature = makeCreature({
      behavior: 'predator',
      health: 10,
      maxHealth: 100,
      spawnPosition: { x: 25, y: 25 },
    });
    const result = tickCreatureAI(creature, [], makeCollisionMap());

    // Predators do NOT frenzy — only maniacs
    expect(result.frenzied).toBeUndefined();
  });
});

// ─── Maniac Frenzy Tests (CRAI-04) ─────────────────────────

describe('tickCreatureAI - maniac frenzy (CRAI-04)', () => {
  it('returns frenzied: true when maniac at 29% HP', () => {
    const creature = makeCreature({
      behavior: 'maniac',
      health: 29,
      maxHealth: 100,
      spawnPosition: { x: 25, y: 25 },
    });
    const result = tickCreatureAI(creature, [], makeCollisionMap());

    expect(result.frenzied).toBe(true);
  });

  it('does NOT frenzy at exactly 30% HP (threshold is strictly less than)', () => {
    const creature = makeCreature({
      behavior: 'maniac',
      health: 30,
      maxHealth: 100,
      spawnPosition: { x: 25, y: 25 },
    });
    const result = tickCreatureAI(creature, [], makeCollisionMap());

    expect(result.frenzied).toBeUndefined();
  });

  it('does NOT frenzy at 100% HP', () => {
    const creature = makeCreature({
      behavior: 'maniac',
      health: 100,
      maxHealth: 100,
      spawnPosition: { x: 25, y: 25 },
    });
    const result = tickCreatureAI(creature, [], makeCollisionMap());

    expect(result.frenzied).toBeUndefined();
  });

  it('returns frenzied: true at 1 HP', () => {
    const creature = makeCreature({
      behavior: 'maniac',
      health: 1,
      maxHealth: 100,
      spawnPosition: { x: 25, y: 25 },
    });
    const result = tickCreatureAI(creature, [], makeCollisionMap());

    expect(result.frenzied).toBe(true);
  });

  it('non-maniac predator at low HP does NOT return frenzied', () => {
    const creature = makeCreature({
      behavior: 'predator',
      health: 10,
      maxHealth: 100,
      spawnPosition: { x: 25, y: 25 },
    });
    const result = tickCreatureAI(creature, [], makeCollisionMap());

    expect(result.frenzied).toBeUndefined();
  });

  it('frenzied maniac still attacks adjacent target', () => {
    const creature = makeCreature({
      behavior: 'maniac',
      health: 20,
      maxHealth: 100,
      combatTarget: 'player-1',
      spawnPosition: { x: 25, y: 25 },
    });
    const player = makePlayer({ position: { x: 26, y: 25, zoneId: 'z_0_0' } });
    const result = tickCreatureAI(creature, [player], makeCollisionMap());

    expect(result.shouldAttack).toBe(true);
    expect(result.frenzied).toBe(true);
  });

  it('frenzied maniac still chases distant target', () => {
    const creature = makeCreature({
      behavior: 'maniac',
      health: 15,
      maxHealth: 100,
      combatTarget: 'player-1',
      spawnPosition: { x: 25, y: 25 },
    });
    const player = makePlayer({ position: { x: 30, y: 25, zoneId: 'z_0_0' } });
    const result = tickCreatureAI(creature, [player], makeCollisionMap());

    expect(result.newPosition).not.toBeNull();
    expect(result.frenzied).toBe(true);
  });

  it('frenzy threshold works with non-round maxHealth values', () => {
    const creature = makeCreature({
      behavior: 'maniac',
      health: 44, // 44/150 = 29.3% < 30%
      maxHealth: 150,
      spawnPosition: { x: 25, y: 25 },
    });
    const result = tickCreatureAI(creature, [], makeCollisionMap());

    expect(result.frenzied).toBe(true);

    // 45/150 = 30% — NOT frenzied (strictly less than)
    const creature2 = makeCreature({
      behavior: 'maniac',
      health: 45,
      maxHealth: 150,
      spawnPosition: { x: 25, y: 25 },
    });
    const result2 = tickCreatureAI(creature2, [], makeCollisionMap());

    expect(result2.frenzied).toBeUndefined();
  });
});
