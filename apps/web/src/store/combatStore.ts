import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import { useGameStore } from './gameStore';
import { useAbilityStore, getEquippedAbilities } from './abilityStore';
import { useEntityStore } from './entityStore';

interface CombatState {
  inCombat: boolean;
  targetEntityId: string | null;
  /** Selected target for ability use (does NOT auto-attack) */
  selectedTarget: string | null;
  /** Auto-attack interval timer handle */
  autoAttackTimer: ReturnType<typeof setInterval> | null;
  setInCombat: (inCombat: boolean, targetEntityId?: string | null) => void;
  /** Select a target for ability use without starting combat */
  selectTarget: (entityId: string | null) => void;
  /** Start auto-attack loop on a creature target */
  startAutoAttack: (targetEntityId: string) => void;
  /** Stop the auto-attack loop */
  stopAutoAttack: () => void;
}

export const useCombatStore = create<CombatState>((set, get) => ({
  inCombat: false,
  targetEntityId: null,
  selectedTarget: null,
  autoAttackTimer: null,

  setInCombat: (inCombat, targetEntityId = null) =>
    set({ inCombat, targetEntityId }),

  selectTarget: (entityId) => {
    const prev = get().selectedTarget;
    // Stop auto-attack when target changes or is cleared
    if (prev !== entityId) {
      get().stopAutoAttack();
    }
    set({ selectedTarget: entityId, targetEntityId: entityId });
  },

  startAutoAttack: (targetEntityId: string) => {
    const state = get();

    // Clear any existing auto-attack timer
    if (state.autoAttackTimer) {
      clearInterval(state.autoAttackTimer);
    }

    // Fire ONE immediate attack (so first click attacks instantly)
    const fireAttack = () => {
      const player = useGameStore.getState().player;
      if (!player) return false;

      const abilities = getEquippedAbilities();
      const basicStrike = abilities.find(a => a.id === 'basic_strike');
      if (!basicStrike) return false;

      const { isCasting, isOnCooldown } = useAbilityStore.getState();
      if (isCasting()) return true; // Skip tick but keep loop alive
      if (isOnCooldown('basic_strike')) return true; // Skip tick but keep loop alive
      if (player.energy < basicStrike.energyCost) return true; // Skip tick, energy might regenerate

      // Check target is still selected and active
      const entity = useEntityStore.getState().entities.get(targetEntityId);
      if (!entity || !entity.active) {
        return false; // Target dead/gone, stop loop
      }

      const currentSelected = get().selectedTarget;
      if (currentSelected !== targetEntityId) {
        return false; // Target deselected, stop loop
      }

      gameSocket.emit('ability:use', { abilityId: 'basic_strike', targetEntityId });
      return true;
    };

    // Immediate first attack
    fireAttack();

    // Set up repeating interval (basic_strike cooldown = 1500ms)
    const timer = setInterval(() => {
      const shouldContinue = fireAttack();
      if (!shouldContinue) {
        get().stopAutoAttack();
      }
    }, 1500);

    set({ autoAttackTimer: timer });
  },

  stopAutoAttack: () => {
    const timer = get().autoAttackTimer;
    if (timer) {
      clearInterval(timer);
    }
    set({ autoAttackTimer: null });
  },
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
    useCombatStore.getState().stopAutoAttack();
    useCombatStore.getState().setInCombat(false);
  }
});

// Listen for entity:update with killed creature (active: false on combat target)
// This handles: creature killed, creature leashed (returns to spawn and disengages)
gameSocket.on('entity:update', (data) => {
  const { targetEntityId, inCombat, selectedTarget } = useCombatStore.getState();

  // If the entity we're fighting becomes inactive, combat ends
  if (inCombat && targetEntityId === data.entityId && data.changes.active === false) {
    useCombatStore.getState().stopAutoAttack();
    useCombatStore.getState().setInCombat(false);
  }

  // Clear selected target if it becomes inactive
  if (selectedTarget === data.entityId && data.changes.active === false) {
    useCombatStore.getState().stopAutoAttack();
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
    useCombatStore.getState().stopAutoAttack();
    useCombatStore.getState().setInCombat(false);
  }
});
