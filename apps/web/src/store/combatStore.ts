import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import { useGameStore } from './gameStore';

interface CombatState {
  inCombat: boolean;
  targetEntityId: string | null;
  /** Selected target for ability use (does NOT auto-attack) */
  selectedTarget: string | null;
  setInCombat: (inCombat: boolean, targetEntityId?: string | null) => void;
  /** Select a target for ability use without starting combat */
  selectTarget: (entityId: string | null) => void;
}

export const useCombatStore = create<CombatState>((set) => ({
  inCombat: false,
  targetEntityId: null,
  selectedTarget: null,

  setInCombat: (inCombat, targetEntityId = null) =>
    set({ inCombat, targetEntityId }),

  selectTarget: (entityId) =>
    set({ selectedTarget: entityId, targetEntityId: entityId }),
}));

// Listen for combat:start - player entered combat
// Two payload shapes:
// 1. Player-initiated (from gateway): { active, turn, participants[], currentActorId, startedAt }
// 2. Creature aggro (from combat.service): { attackerId, defenderId, timestamp }
gameSocket.on('combat:start', (data) => {
  const currentPlayer = useGameStore.getState().player;
  if (!currentPlayer) return;

  // Handle creature aggro payload (attackerId/defenderId)
  if ('attackerId' in data && 'defenderId' in data) {
    const attackerId = data.attackerId as string;
    const defenderId = data.defenderId as string;
    if (defenderId === currentPlayer.id) {
      // Creature attacked us - we're in combat with the creature
      useCombatStore.getState().setInCombat(true, attackerId);
      // Also set as selected target for ability counter-attacks
      useCombatStore.setState({ selectedTarget: attackerId });
    }
    return;
  }

  // Handle player-initiated payload (participants array)
  if (data.participants) {
    const isPlayerInvolved =
      data.currentActorId === currentPlayer.id ||
      data.participants.some((p: { id: string }) => p.id === currentPlayer.id);

    if (isPlayerInvolved) {
      const opponent = data.participants.find((p: { id: string }) => p.id !== currentPlayer.id);
      const opponentId = opponent?.id ?? null;
      useCombatStore.getState().setInCombat(true, opponentId);
      if (opponentId) {
        useCombatStore.setState({ selectedTarget: opponentId });
      }
    }
  }
});

// Listen for player:death - combat ends when player dies
gameSocket.on('player:death', (data) => {
  const currentPlayer = useGameStore.getState().player;
  if (currentPlayer && data.playerId === currentPlayer.id) {
    useCombatStore.getState().setInCombat(false);
  }
});

// Listen for entity:update with killed creature (active: false on combat target)
// This handles: creature killed, creature leashed (returns to spawn and disengages)
gameSocket.on('entity:update', (data) => {
  const { targetEntityId, inCombat, selectedTarget } = useCombatStore.getState();

  // If the entity we're fighting becomes inactive, combat ends
  if (inCombat && targetEntityId === data.entityId && data.changes.active === false) {
    useCombatStore.getState().setInCombat(false);
  }

  // Clear selected target if it becomes inactive
  if (selectedTarget === data.entityId && data.changes.active === false) {
    useCombatStore.setState({ selectedTarget: null });
  }
});

// Also handle combat:damage with killed: true for immediate feedback
gameSocket.on('combat:damage', (data) => {
  const currentPlayer = useGameStore.getState().player;
  const { targetEntityId, inCombat, selectedTarget } = useCombatStore.getState();

  // If we're in combat but don't have targetEntityId set (player-initiated case),
  // set it from the first damage event where we're the attacker
  if (inCombat && !targetEntityId && currentPlayer && data.attackerId === currentPlayer.id) {
    useCombatStore.getState().setInCombat(true, data.defenderId);
  }

  // If we killed our target, combat ends
  const currentTarget = useCombatStore.getState().targetEntityId;
  if (inCombat && currentTarget === data.defenderId && data.killed) {
    useCombatStore.getState().setInCombat(false);
  }
});
