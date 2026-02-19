import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import { useGameStore } from './gameStore';

interface CombatState {
  inCombat: boolean;
  targetEntityId: string | null;
  setInCombat: (inCombat: boolean, targetEntityId?: string | null) => void;
}

export const useCombatStore = create<CombatState>((set) => ({
  inCombat: false,
  targetEntityId: null,
  setInCombat: (inCombat, targetEntityId = null) => set({ inCombat, targetEntityId }),
}));

// Listen for combat:start - player entered combat
// Payload shape: CombatState { active, turn, participants[], currentActorId, startedAt }
// Player-initiated: currentActorId === playerId
// Creature aggro: participants includes player as defender
gameSocket.on('combat:start', (data) => {
  const currentPlayer = useGameStore.getState().player;
  if (!currentPlayer) return;

  // Check if this combat involves the local player
  const isPlayerInvolved =
    data.currentActorId === currentPlayer.id || // Player initiated attack
    data.participants.some((p) => p.id === currentPlayer.id); // Player is a participant

  if (isPlayerInvolved) {
    // Find the opponent entity (non-player participant or non-self participant)
    const opponent = data.participants.find((p) => p.id !== currentPlayer.id);
    useCombatStore.getState().setInCombat(true, opponent?.id ?? null);
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
  const { targetEntityId, inCombat } = useCombatStore.getState();

  // If the entity we're fighting becomes inactive, combat ends
  if (inCombat && targetEntityId === data.entityId && data.changes.active === false) {
    useCombatStore.getState().setInCombat(false);
  }
});

// Also handle combat:damage with killed: true for immediate feedback
gameSocket.on('combat:damage', (data) => {
  const currentPlayer = useGameStore.getState().player;
  const { targetEntityId, inCombat } = useCombatStore.getState();

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
