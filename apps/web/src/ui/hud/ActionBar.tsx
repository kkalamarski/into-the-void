import React, { useEffect, useState } from 'react';
import { useAbilityStore, getEquippedAbilities } from '../../store/abilityStore';
import { useCombatStore } from '../../store/combatStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useGameStore } from '../../store/gameStore';
import { gameSocket } from '../../network/socket';
import type { AbilityDefinition } from '@into-the-void/shared-types';
import './ActionBar.css';

const SLOT_COUNT = 8;

interface AbilitySlotProps {
  index: number;
  ability: AbilityDefinition | null;
}

function AbilitySlot({ index, ability }: AbilitySlotProps) {
  const { isOnCooldown, getRemainingCooldown } = useAbilityStore();
  const targetEntityId = useCombatStore((state) => state.targetEntityId);
  const player = useGameStore((state) => state.player);

  const [cooldownProgress, setCooldownProgress] = useState(0);

  // Update cooldown progress for radial display
  useEffect(() => {
    if (!ability) return;

    const updateProgress = () => {
      const remaining = getRemainingCooldown(ability.id);
      if (remaining > 0) {
        const progress = remaining / ability.cooldownMs;
        setCooldownProgress(Math.min(1, progress));
      } else {
        setCooldownProgress(0);
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 50);
    return () => clearInterval(interval);
  }, [ability, getRemainingCooldown]);

  const handleClick = () => {
    if (!ability) return;
    if (isOnCooldown(ability.id)) return;
    if (!player || player.energy < ability.energyCost) return;

    gameSocket.emit('ability:use', {
      abilityId: ability.id,
      targetEntityId: ability.requiresTarget ? targetEntityId ?? undefined : undefined,
    });
  };

  const isEmpty = !ability;
  const onCooldown = ability ? isOnCooldown(ability.id) : false;
  const insufficientEnergy = ability && player ? player.energy < ability.energyCost : false;
  const disabled = onCooldown || insufficientEnergy;

  return (
    <div
      className={`ability-slot ${isEmpty ? 'ability-slot--empty' : ''} ${disabled ? 'ability-slot--disabled' : ''}`}
      onClick={handleClick}
      title={ability ? `${ability.displayName}\n${ability.description}\nEnergy: ${ability.energyCost}\nCooldown: ${ability.cooldownMs / 1000}s` : undefined}
    >
      <span className="ability-key">{index + 1}</span>
      {ability && (
        <>
          <div
            className="ability-icon"
            style={{ backgroundColor: `#${ability.iconColor.toString(16).padStart(6, '0')}` }}
          />
          {cooldownProgress > 0 && (
            <div
              className="ability-cooldown-overlay"
              style={{
                background: `conic-gradient(rgba(0,0,0,0.7) ${cooldownProgress * 360}deg, transparent 0deg)`,
              }}
            />
          )}
          {insufficientEnergy && !onCooldown && (
            <div className="ability-no-energy" />
          )}
        </>
      )}
    </div>
  );
}

export const ActionBar: React.FC = () => {
  const inventory = useInventoryStore((state) => state.inventory);
  const targetEntityId = useCombatStore((state) => state.targetEntityId);
  const player = useGameStore((state) => state.player);
  const { isOnCooldown } = useAbilityStore();

  // Derive abilities from equipment (re-renders when inventory changes)
  const abilities = inventory ? getEquippedAbilities() : [];

  // Pad abilities to 8 slots
  const slots: (AbilityDefinition | null)[] = Array(SLOT_COUNT).fill(null);
  abilities.forEach((ability, i) => {
    if (i < SLOT_COUNT) slots[i] = ability;
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Chat-focus guard
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.repeat) return;

      const slotIndex = parseInt(e.key, 10) - 1;
      if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= SLOT_COUNT) return;

      const ability = slots[slotIndex];
      if (!ability) return;
      if (isOnCooldown(ability.id)) return;
      if (!player || player.energy < ability.energyCost) return;

      gameSocket.emit('ability:use', {
        abilityId: ability.id,
        targetEntityId: ability.requiresTarget ? targetEntityId ?? undefined : undefined,
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [slots, targetEntityId, player, isOnCooldown]);

  return (
    <div className="action-bar">
      {slots.map((ability, i) => (
        <AbilitySlot key={i} index={i} ability={ability} />
      ))}
    </div>
  );
};
