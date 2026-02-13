import {
  CombatParticipant,
  CombatState,
  PlayerStats,
} from '@into-the-void/shared-types';

/**
 * Calculate initiative for combat turn order
 */
export function calculateInitiative(
  level: number,
  stats?: Partial<PlayerStats>
): number {
  const baseInitiative = level * 2;
  const agilityBonus = (stats?.agility ?? 10) * 0.5;
  const randomBonus = Math.random() * 10;

  return baseInitiative + agilityBonus + randomBonus;
}

/**
 * Sort participants by initiative (highest first)
 */
export function sortByInitiative(
  participants: CombatParticipant[]
): CombatParticipant[] {
  return [...participants].sort((a, b) => b.initiative - a.initiative);
}

/**
 * Get next actor in turn order
 */
export function getNextActor(state: CombatState): CombatParticipant | null {
  const activeParticipants = state.participants.filter((p) => p.health > 0);

  if (activeParticipants.length === 0) {
    return null;
  }

  const currentIndex = activeParticipants.findIndex(
    (p) => p.id === state.currentActorId
  );

  const nextIndex = (currentIndex + 1) % activeParticipants.length;
  return activeParticipants[nextIndex];
}

/**
 * Create initial combat state
 */
export function createCombatState(
  participants: Array<{
    id: string;
    type: 'player' | 'creature';
    health: number;
    maxHealth: number;
    level: number;
    stats?: Partial<PlayerStats>;
  }>
): CombatState {
  const combatParticipants: CombatParticipant[] = participants.map((p) => ({
    id: p.id,
    type: p.type,
    health: p.health,
    maxHealth: p.maxHealth,
    initiative: calculateInitiative(p.level, p.stats),
    effects: [],
  }));

  const sorted = sortByInitiative(combatParticipants);

  return {
    active: true,
    turn: 1,
    participants: sorted,
    currentActorId: sorted[0].id,
    startedAt: Date.now(),
  };
}

/**
 * Advance to next turn
 */
export function advanceTurn(state: CombatState): CombatState {
  const nextActor = getNextActor(state);

  if (!nextActor) {
    return {
      ...state,
      active: false,
    };
  }

  // Check if we've completed a round
  const currentIndex = state.participants.findIndex(
    (p) => p.id === state.currentActorId
  );
  const activeParticipants = state.participants.filter((p) => p.health > 0);
  const nextIndex = activeParticipants.findIndex(
    (p) => p.id === nextActor.id
  );

  const newTurn = nextIndex <= currentIndex ? state.turn + 1 : state.turn;

  return {
    ...state,
    turn: newTurn,
    currentActorId: nextActor.id,
  };
}

/**
 * Update participant health
 */
export function updateParticipantHealth(
  state: CombatState,
  participantId: string,
  newHealth: number
): CombatState {
  const updatedParticipants = state.participants.map((p) =>
    p.id === participantId ? { ...p, health: Math.max(0, newHealth) } : p
  );

  // Check if combat should end
  const players = updatedParticipants.filter(
    (p) => p.type === 'player' && p.health > 0
  );
  const creatures = updatedParticipants.filter(
    (p) => p.type === 'creature' && p.health > 0
  );

  const combatEnded = players.length === 0 || creatures.length === 0;

  return {
    ...state,
    participants: updatedParticipants,
    active: !combatEnded,
  };
}

/**
 * Get combat winner (if combat ended)
 */
export function getCombatWinner(
  state: CombatState
): 'players' | 'creatures' | null {
  if (state.active) {
    return null;
  }

  const alivePlayers = state.participants.filter(
    (p) => p.type === 'player' && p.health > 0
  );
  const aliveCreatures = state.participants.filter(
    (p) => p.type === 'creature' && p.health > 0
  );

  if (alivePlayers.length > 0 && aliveCreatures.length === 0) {
    return 'players';
  }
  if (aliveCreatures.length > 0 && alivePlayers.length === 0) {
    return 'creatures';
  }

  return null; // Draw or still in progress
}

/**
 * Check if it's a specific participant's turn
 */
export function isParticipantTurn(
  state: CombatState,
  participantId: string
): boolean {
  return state.active && state.currentActorId === participantId;
}
